// BOUNDS v1.15: restore an unfinished local round after a page reload.
// This module intentionally works through the public UI controls so the core
// app state remains owned by app.js. The saved draft is copied before starting
// the round because startRound clears the old draft as a safety measure.

const LOCAL_KEY='bounds_v1_draft';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function visible(el){return el && !el.classList.contains('hidden');}

async function waitForReady(timeout=15000){
  const started=Date.now();
  while(Date.now()-started<timeout){
    const app=document.querySelector('#appShell');
    const course=document.querySelector('#courseSelect');
    if(visible(app) && course && course.options.length>1) return true;
    await sleep(150);
  }
  return false;
}

function fireChange(el){
  el.dispatchEvent(new Event('change',{bubbles:true}));
}

function fireInput(el){
  el.dispatchEvent(new Event('input',{bubbles:true}));
}

async function waitForOptions(select, predicate=()=>true, timeout=5000){
  const started=Date.now();
  while(Date.now()-started<timeout){
    if(select && select.options.length && predicate(select)) return true;
    await sleep(100);
  }
  return false;
}

function findOption(select,value){
  return [...select.options].find(o=>o.value===String(value));
}

function setSelect(select,value){
  if(!select || !findOption(select,value)) return false;
  select.value=String(value);
  fireChange(select);
  return true;
}

function rowForHole(hole){
  return [...document.querySelectorAll('#scoreRows .hole')].find(row=>{
    const number=row.querySelector('.hole-no b')?.textContent?.trim();
    return Number(number)===Number(hole);
  });
}

async function setScore(hole,target){
  target=Number(target)||0;
  if(target<=0) return;

  let row=rowForHole(hole);
  if(!row) return;
  const par=Number(row.querySelector('.hole-no small')?.textContent?.match(/Par\s+(\d+)/)?.[1]||0);
  const deltaFromBlank=target-par;

  if(deltaFromBlank>=0){
    for(let i=0;i<=deltaFromBlank;i++){
      row=rowForHole(hole);
      row?.querySelector('[data-act="plus"]')?.click();
      await sleep(12);
    }
  }else{
    row.querySelector('[data-act="minus"]')?.click();
    await sleep(12);
    for(let i=0;i<(-deltaFromBlank-1);i++){
      row=rowForHole(hole);
      row?.querySelector('[data-act="minus"]')?.click();
      await sleep(12);
    }
  }
}

async function setExtra(hole,field,target){
  target=Number(target)||0;
  if(target<=0) return;
  for(let i=0;i<target;i++){
    const row=rowForHole(hole);
    row?.querySelector(`[data-extra="${field}:+"]`)?.click();
    await sleep(12);
  }
}

function setField(hole,field,value){
  const row=rowForHole(hole);
  const select=row?.querySelector(`[data-field="${field}"]`);
  if(!select || value==='' || value==null) return;
  if(!findOption(select,value)) return;
  select.value=String(value);
  select.dispatchEvent(new Event('change',{bubbles:true}));
}

async function setNote(hole,note){
  if(!note) return;
  const row=rowForHole(hole);
  const button=row?.querySelector('[data-note]');
  if(!button) return;
  const originalPrompt=window.prompt;
  try{
    window.prompt=()=>String(note);
    button.click();
    await sleep(20);
  }finally{
    window.prompt=originalPrompt;
  }
}

function showRestoredToast(){
  const toast=document.querySelector('#toast');
  if(!toast) return;
  toast.textContent='Onafgeronde ronde hersteld.';
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'),2400);
}

async function restoreDraftThroughUI(){
  const raw=localStorage.getItem(LOCAL_KEY);
  if(!raw) return;

  let draft;
  try{draft=JSON.parse(raw)}catch{localStorage.removeItem(LOCAL_KEY);return;}
  if(!draft?.clientRoundId||!draft.courseId||!draft.teeId||!Number(draft.holesPlayed)) return;

  // If the app already has an active scorecard, never overwrite it.
  if(visible(document.querySelector('#scoreArea'))) return;

  const course=document.querySelector('#courseSelect');
  const holes=document.querySelector('#holesSelect');
  const variant=document.querySelector('#variantSelect');
  const loop=document.querySelector('#loopSelect');
  const tee=document.querySelector('#teeSelect');
  const hcp=document.querySelector('#hcpInput');
  const start=document.querySelector('#startRound');

  holes.value=String(draft.holesPlayed);
  setSelect(course,draft.courseId);
  await sleep(350);
  await waitForOptions(tee,s=>s.options.length>0);

  if(draft.variant && findOption(variant,draft.variant)){
    variant.value=String(draft.variant);
    fireChange(variant);
    await sleep(300);
    await waitForOptions(tee,s=>s.options.length>0);
  }

  if(draft.loop && findOption(loop,draft.loop)){
    loop.value=String(draft.loop);
    fireChange(loop);
    await sleep(300);
    await waitForOptions(tee,s=>s.options.length>0);
  }

  if(!findOption(tee,draft.teeId)){
    localStorage.removeItem(LOCAL_KEY);
    return;
  }
  tee.value=String(draft.teeId);
  fireChange(tee);

  if(Number.isFinite(Number(draft.handicap))){
    hcp.value=String(draft.handicap);
    fireInput(hcp);
  }
  await sleep(350);

  // startRound clears localStorage, so all draft data is already in memory here.
  start?.click();
  await sleep(250);

  const scores=draft.scores||{};
  const extra=draft.extra||{};
  for(const [hole,score] of Object.entries(scores)){
    await setScore(hole,score);
    const e=extra[hole]||{};
    await setExtra(hole,'putts',e.putts);
    await setExtra(hole,'penalty',e.penalty);
    setField(hole,'fairway',e.fairway);
    setField(hole,'gir',e.gir);
    await setNote(hole,e.note);
  }

  const status=document.querySelector('#roundStatus');
  if(status){status.textContent='🟢 Ronde hervat';status.classList.remove('hidden');}
  const title=document.querySelector('#playTitle');
  if(title) title.textContent='Ronde hervat';
  showRestoredToast();
}

(async()=>{
  if(!localStorage.getItem(LOCAL_KEY)) return;
  if(!await waitForReady()) return;
  try{await restoreDraftThroughUI();}
  catch(error){console.error('BOUNDS draft UI restore error',error);}
})();
