import {courseHandicapFromRanges,strokesForSI,stableford,roundTotals,basicRoundAnalysis} from './domain.js';
import * as data from './data.js';

const SUPABASE_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SUPABASE_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
import {createBoundsSupabase} from './supabase-rest.js?v=1.15.17';

let sb=null;
async function initSupabase(){
  if(sb) return sb;
  sb=createBoundsSupabase(SUPABASE_URL,SUPABASE_KEY);
  return sb;
}
async function waitForSupabase(){
  const client=await initSupabase();
  if(!client?.auth) throw new Error('Supabase Auth kon niet worden geladen.');
  return client;
}
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let user=null,profile=null,courses=[],tees=[],ranges=[],holes=[],variants=[]; let activeRound=null; let authRegister=false;
const openStatsHoles=new Set();
const localKey='bounds_v1_draft';
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function setMessage(msg=''){ $('#authMessage').textContent=msg; }
function fmt(n){return Number.isFinite(Number(n))?String(Number(n)).replace('.',','):'—'}
function dateLabel(v){return new Date(v).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function showTab(tab){
  $$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
  $$('.page').forEach(x=>x.classList.toggle('active',x.id==='page-'+tab));
  if(tab==='home') renderHome();
  if(tab==='game') renderGame();
  if(tab==='courses') renderCourses();
}

async function boot(){
  $('#authView').classList.remove('hidden');
  wireAuthForm();
  setMessage('Loginservice laden…');
  try{
    await waitForSupabase();
    setMessage('');
    const {data:{session},error}=await sb.auth.getSession();
    if(error) throw error;
    if(session) await enterApp(session.user);
    sb.auth.onAuthStateChange((_e,s)=>{
      if(s?.user && !user) enterApp(s.user);
      if(!s && user){
        user=null; profile=null;
        $('#appShell').classList.add('hidden');
        $('#authView').classList.remove('hidden');
        $('#sessionArea').innerHTML='';
        setMessage('');
      }
    });
  }catch(e){
    console.error('BOUNDS auth boot error',e);
    setMessage('Verbinding met de loginservice lukt niet. Controleer je internetverbinding en probeer opnieuw.');
  }
}

async function enterApp(u){
  user=u; $('#authView').classList.add('hidden'); $('#appShell').classList.remove('hidden');
  $('#sessionArea').innerHTML=`<div class="session-controls"><span class="account-email">${esc(u.email||'Account')}</span><button class="ghost logout-button" id="logoutButton" type="button">Uitloggen</button></div>`;
  const logoutButton=$('#logoutButton');
  if(logoutButton) logoutButton.onclick=async()=>{
    logoutButton.disabled=true;
    logoutButton.textContent='Uitloggen…';
    const {error}=await sb.auth.signOut();
    if(error){
      console.error(error);
      logoutButton.disabled=false;
      logoutButton.textContent='Uitloggen';
      toast('Uitloggen mislukt. Probeer opnieuw.');
    }
  };
  try{
    profile=await data.loadProfile(sb,user.id);
    if(!profile){
      const display=u.email?.split('@')[0]||'Golfer';
      const {data:p,error}=await sb.from('profiles').insert({id:user.id,display_name:display,handicap_index:54,target_handicap:null,is_discoverable:false}).select().single();
      if(error) throw error; profile=p;
    }
    $('#hcpInput').value=profile.handicap_index;
    courses=await data.loadCourses(sb); fillCourses(); await restoreDraft(); await refreshDashboard();
  }catch(e){console.error(e);toast('Kon BOUNDS data niet laden.');}
}

function fillCourses(){
  $('#courseSelect').innerHTML='<option value="">Kies een baan…</option>'+courses.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('#courseSelect').onchange=loadCourseConfiguration; $('#holesSelect').onchange=loadCourseConfiguration; $('#variantSelect').onchange=loadTeeOptions; $('#loopSelect').onchange=loadTeeOptions; $('#teeSelect').onchange=updateRoundConfig;
  $('#variantWrap').classList.add('hidden'); $('#loopWrap').classList.add('hidden');
  $('#configNote').textContent='';
}
async function loadCourseConfiguration(){
  const cid=$('#courseSelect').value, hp=Number($('#holesSelect').value);
  $('#teeSelect').innerHTML='<option value="">Kies tee…</option>';
  $('#variantSelect').innerHTML='';
  $('#variantWrap').classList.add('hidden'); $('#loopWrap').classList.add('hidden');
  tees=[]; ranges=[]; holes=[]; variants=[];
  if(!cid) return;
  variants=await data.loadCourseVariants(sb,cid,hp);
  if(variants.length>1){
    $('#variantSelect').innerHTML=variants.map(v=>`<option value="${esc(v)}">${variantLabel(v)}</option>`).join('');
    $('#variantWrap').classList.remove('hidden');
  }
  await loadTeeOptions();
}
function variantLabel(v){return ({main:'Main Course',par3:'Par 3',par34:'14 holes / qualifying 9'}[v]||v)}

async function loadTeeOptions(){
  const cid=$('#courseSelect').value, hp=Number($('#holesSelect').value); if(!cid)return;
  const variant=$('#variantSelect').value||null;
  tees=await data.loadTees(sb,cid,hp,variant);
  const men=tees.filter(t=>t.gender==='men'||!t.gender);
  const loops=[...new Set(men.map(t=>t.loop||'full'))];
  const hasLoopChoice=hp===9 && loops.length>1;
  if(hasLoopChoice){
    $('#loopWrap').classList.remove('hidden');
    const current=$('#loopSelect').value;
    $('#loopSelect').innerHTML=loops.map(l=>`<option value="${l}">${l==='first'?'1e 9':l==='second'?'2e 9':'Hele baan'}</option>`).join('');
    if(loops.includes(current)) $('#loopSelect').value=current;
  } else {
    $('#loopWrap').classList.add('hidden');
    $('#loopSelect').innerHTML='<option value="full">Hele baan</option>';
    $('#loopSelect').value='full';
  }
  const loop=$('#loopSelect').value;
  const matching=men.filter(t=>(hp===18 || (t.loop||'full')===loop));
  const unique=[]; const seen=new Set();
  matching.forEach(t=>{const k=`${t.tee_name}|${t.course_rating}|${t.slope_rating}|${t.id}`;if(!seen.has(k)){seen.add(k);unique.push(t)}});
  $('#teeSelect').innerHTML=unique.map(t=>`<option value="${t.id}">${esc(t.tee_name)}</option>`).join('')||'<option value="">Geen tee beschikbaar</option>';
  if(unique[0]){ $('#teeSelect').value=unique[0].id; await updateRoundConfig(); }
}

async function loadPlayableHoles(tee){
  let hs=await data.loadHoles(sb,tee.id);
  if(Number(tee.physical_holes)===14 && tee.course_variant==='par34'){
    const qualifying=String(tee.qualifying_holes||'').split(',').map(x=>Number(x.trim())).filter(Number.isFinite);
    if(qualifying.length===9 && hs.length){const wanted=new Set(qualifying);return hs.filter(h=>wanted.has(Number(h.hole_number)));}
  }
  if(hs.length) return hs;
  if(Number(tee.holes)===18 && Number(tee.physical_holes)===9){
    const physicalTees=await data.loadTees(sb,tee.course_id,9,tee.course_variant);
    const source=physicalTees.find(t=>t.tee_name===tee.tee_name && t.gender===tee.gender) || physicalTees.find(t=>t.tee_name===tee.tee_name);
    if(source){
      const physical=await data.loadHoles(sb,source.id);
      if(physical.length===9)return [...physical.map(h=>({...h,played_hole_number:h.hole_number})),...physical.map(h=>({...h,id:`${h.id}-2`,hole_number:h.hole_number+9,played_hole_number:h.hole_number+9,stroke_index:Number(h.stroke_index)+1}))];
    }
  }
  return [];
}
function fallbackCourseHandicap(tee, handicap){const h=Number(handicap),cr=Number(tee.course_rating),sr=Number(tee.slope_rating),par=Number(tee.par);if(!Number.isFinite(h)||!Number.isFinite(cr)||!Number.isFinite(sr)||!Number.isFinite(par))return null;const raw=Number(tee.holes)===9?h*sr/226+(cr-par)/2:h*sr/113+(cr-par);return Number(tee.holes)===18?Math.round(raw):Math.floor(raw)}
async function updateRoundConfig(){const tee=tees.find(t=>t.id===$('#teeSelect').value);if(!tee)return;ranges=await data.loadRanges(sb,tee.id);holes=await loadPlayableHoles(tee);const hcp=Number($('#hcpInput').value),ch=courseHandicapFromRanges(ranges,hcp),resolvedCh=ch??fallbackCourseHandicap(tee,hcp);$('#courseHcp').textContent=resolvedCh??'—';$('#crsr').textContent=`${fmt(tee.course_rating)} / ${tee.slope_rating}`;$('#coursePar').textContent=tee.par;const physical=Number(tee.physical_holes||0);if(Number(tee.physical_holes)===14&&tee.course_variant==='par34'&&holes.length===9)$('#configNote').textContent='Almkreek · qualifying 9 holes · holes 6–14.';else if(Number(tee.holes)===18&&physical===9&&holes.length===18)$('#configNote').textContent='Deze baan heeft 9 fysieke holes. De 18-holes ronde speelt dezelfde lus twee keer; de tweede lus gebruikt de even stroke-indexen.';else if(Number(tee.holes)===9&&physical===9)$('#configNote').textContent='9-hole ronde · officiële 9-hole course rating en slope.';else $('#configNote').textContent=''}
$('#hcpInput').addEventListener('input',()=>{if($('#teeSelect').value)updateRoundConfig()});
function makeDraft(){const tee=tees.find(t=>t.id===$('#teeSelect').value);if(!tee)return null;const ch=courseHandicapFromRanges(ranges,Number($('#hcpInput').value))??fallbackCourseHandicap(tee,Number($('#hcpInput').value));const playedStrokeIndices=holes.map(h=>h.stroke_index);return {clientRoundId:crypto.randomUUID(),courseId:tee.course_id,teeId:tee.id,holesPlayed:Number($('#holesSelect').value),loop:tee.loop||'full',variant:tee.course_variant,handicap:Number($('#hcpInput').value),courseHandicap:ch,holes:holes.map(h=>({id:h.id,hole:h.hole_number,par:h.par,si:h.stroke_index,score:0,putts:'',penalty:'',fairway:'',gir:'',note:'',playedStrokeIndices}))}}
function renderScorecard(){if(!activeRound)return;const n=activeRound.holes.length,indices=activeRound.holes.map(h=>h.si);$('#scoreRows').innerHTML=activeRound.holes.map((h,i)=>{const strokes=strokesForSI(activeRound.courseHandicap,h.si,n,indices),sf=stableford(h.par,h.score,strokes);h.sf=sf;const statsOpen=openStatsHoles.has(h.hole),fairwayField=Number(h.par)===3?'':`<label>Fairway<select data-field="fairway"><option value="" ${!h.fairway?'selected':''}>Niet ingevuld</option><option value="hit" ${h.fairway==='hit'?'selected':''}>✓ geraakt</option><option value="miss" ${h.fairway==='miss'?'selected':''}>✕ gemist</option></select></label>`;return `<div class="hole" data-i="${i}"><div class="hole-main"><div class="hole-no"><b>${h.hole}</b><small>Par ${h.par} · SI ${h.si}</small><button class="hole-stats-btn" data-stats type="button">${statsOpen?'− Stats':'＋ Stats'}</button></div><div class="muted">${strokes?`+${strokes} slag${strokes>1?'en':''}`:'Geen slag'}</div><div class="scorebox"><button data-act="minus">−</button><span class="score">${h.score||'—'}</span><button data-act="plus">+</button></div><div class="sf">${sf??'—'} SF</div></div><div class="stats-panel ${statsOpen?'open':''}"><div class="extra-grid"><label>Putts<div class="stepper"><button data-extra="putts:-">−</button><span>${h.putts||'—'}</span><button data-extra="putts:+">+</button></div></label><label>Penalty<div class="stepper"><button data-extra="penalty:-">−</button><span>${h.penalty||'—'}</span><button data-extra="penalty:+">+</button></div></label>${fairwayField}<label>GIR<select data-field="gir"><option value="" ${!h.gir?'selected':''}>Niet ingevuld</option><option value="yes" ${h.gir==='yes'?'selected':''}>✓ GIR</option><option value="no" ${h.gir==='no'?'selected':''}>✕ geen GIR</option></select></label></div><button class="text-button note-btn" data-note type="button">📝 ${h.note?'Notitie bekijken/wijzigen':'Notitie toevoegen'}</button></div></div>`}).join('');$('#scoreRows').onclick=e=>{const row=e.target.closest('.hole');if(!row)return;const i=Number(row.dataset.i),h=activeRound.holes[i];const statsButton=e.target.closest('[data-stats]');if(statsButton){if(openStatsHoles.has(h.hole))openStatsHoles.delete(h.hole);else openStatsHoles.add(h.hole);renderScorecard();return}if(e.target.dataset.act){const d=e.target.dataset.act==='plus'?1:-1;h.score=h.score?Math.max(1,h.score+d):h.par;renderScorecard();persistDraft();return}if(e.target.dataset.extra){const[field,op]=e.target.dataset.extra.split(':');h[field]=String(Math.max(0,Number(h[field]||0)+(op==='+'?1:-1))||'');renderScorecard();persistDraft();return}if(e.target.dataset.note){const v=prompt(`Notitie voor hole ${h.hole}:`,h.note||'');if(v!==null){h.note=v;renderScorecard();persistDraft()}}};$('#scoreRows').onchange=e=>{const row=e.target.closest('.hole');if(!row)return;const h=activeRound.holes[Number(row.dataset.i)];if(e.target.dataset.field){h[e.target.dataset.field]=e.target.value;persistDraft()}};const totals=roundTotals(activeRound.holes);$('#totalScore').textContent=totals.score;$('#totalSf').textContent=`${totals.stableford} SF`}
function persistDraft(){if(!activeRound)return;localStorage.setItem(localKey,JSON.stringify({clientRoundId:activeRound.clientRoundId,courseId:activeRound.courseId,teeId:activeRound.teeId,holesPlayed:activeRound.holesPlayed,loop:activeRound.loop,variant:activeRound.variant,handicap:activeRound.handicap,courseHandicap:activeRound.courseHandicap,scores:Object.fromEntries(activeRound.holes.map(h=>[h.hole,h.score])),extra:Object.fromEntries(activeRound.holes.map(h=>[h.hole,{putts:h.putts,penalty:h.penalty,fairway:h.fairway,gir:h.gir,note:h.note}]))}))}
async function restoreDraft(){const raw=localStorage.getItem(localKey);if(!raw)return;try{const d=JSON.parse(raw);if(!d?.clientRoundId){localStorage.removeItem(localKey);return}toast('Er staat nog een onafgemaakte ronde klaar.')}catch{localStorage.removeItem(localKey)}}
function resetRoundUI(){activeRound=null;openStatsHoles.clear();localStorage.removeItem(localKey);$('#scoreArea').classList.add('hidden');$('#roundSetup').classList.remove('hidden');$('#roundStatus').classList.add('hidden');$('#roundStatus').textContent='🟢 Ronde bezig';$('#playTitle').textContent='Nieuwe ronde'}
function cancelRound(){if(!activeRound&&!localStorage.getItem(localKey))return;if(!confirm('Deze onafgemaakte ronde afbreken? Alle nog niet opgeslagen scores en statistieken gaan verloren.'))return;resetRoundUI();toast('Ronde afgebroken.')}
async function startNewRound(){const hasOpenRound=Boolean(activeRound||localStorage.getItem(localKey));if(hasOpenRound){const ok=confirm('Er staat nog een onafgemaakte ronde open. Wil je die afbreken en een nieuwe ronde starten?');if(!ok){showTab('play');return}resetRoundUI()}showTab('play');$('#playTitle').textContent='Nieuwe ronde';window.scrollTo({top:0,behavior:'smooth'})}
$('#startRound').onclick=async()=>{localStorage.removeItem(localKey);const draft=makeDraft();if(!draft){toast('Kies eerst baan en tee.');return}if(draft.holes.length!==draft.holesPlayed){toast(`Deze configuratie levert ${draft.holes.length} speelbare holes op, maar ${draft.holesPlayed} is gekozen.`);return}activeRound=draft;openStatsHoles.clear();$('#roundSetup').classList.add('hidden');$('#scoreArea').classList.remove('hidden');$('#roundStatus').classList.remove('hidden');$('#roundStatus').textContent='🟢 Ronde bezig';$('#scoreSubtitle').textContent=`${courses.find(c=>c.id===draft.courseId)?.name||''} · ${draft.holesPlayed} holes · ${variantLabel(draft.variant)}`;renderScorecard();persistDraft()};
$('#saveRound').onclick=async()=>{if(!activeRound)return;const totals=roundTotals(activeRound.holes);if(!totals.score){toast('Vul eerst minimaal één score in.');return}const normalizeInt=(value,min,max)=>{if(value===''||value===null||value===undefined)return null;const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:null};const normalizedHoles=activeRound.holes.map(h=>({hole:Number(h.hole),played_hole_number:Number(h.hole),score:normalizeInt(h.score,1,20),sf:normalizeInt(h.sf,0,50),putts:normalizeInt(h.putts,0,20),penalty:normalizeInt(h.penalty,0,20),fairway:h.fairway==='hit'||h.fairway==='yes'?'yes':h.fairway==='miss'||h.fairway==='no'?'no':null,gir:h.gir==='yes'?'yes':h.gir==='no'?'no':null,note:h.note?String(h.note):null}));const payload={p_client_round_id:activeRound.clientRoundId,p_course_id:activeRound.courseId,p_tee_id:activeRound.teeId,p_holes_played:activeRound.holesPlayed,p_loop:activeRound.loop,p_played_at:new Date().toISOString(),p_handicap:activeRound.handicap,p_course_handicap:activeRound.courseHandicap,p_final_score:totals.score,p_stableford:totals.stableford,p_holes:normalizedHoles};try{await data.saveRound(sb,payload);resetRoundUI();toast('Ronde opgeslagen.');await refreshDashboard();showTab('game')}catch(e){console.error(e);toast('Opslaan mislukt: '+(e.message||'controleer je login'))}};
async function refreshDashboard(){await renderHome();await renderGame();await renderCourses()}
