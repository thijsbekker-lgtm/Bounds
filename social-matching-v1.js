const SM_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SM_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const SM_SESSION='bounds_supabase_session';
let smReady=false;

function smSession(){try{return JSON.parse(localStorage.getItem(SM_SESSION)||'null')}catch{return null}}
function smHeaders(json=false){const s=smSession();const h={apikey:SM_KEY,Authorization:`Bearer ${s?.access_token||''}`};if(json)h['Content-Type']='application/json';return h}
async function smRest(path,{method='GET',body=null,prefer=null}={}){const r=await fetch(`${SM_URL}/rest/v1/${path}`,{method,headers:{...smHeaders(Boolean(body)),...(prefer?{Prefer:prefer}:{})},body:body?JSON.stringify(body):undefined});const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok){const e=new Error(d?.message||d?.details||d?.hint||d?.error||t||`HTTP ${r.status}`);e.status=r.status;e.code=d?.code;throw e}return d}
const smEsc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const smMinutes=v=>{const [h,m]=String(v||'').slice(0,5).split(':').map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:null};
const smNorm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');

async function smLoad(){
  const s=smSession();if(!s?.user?.id||!s.access_token)return null;
  const own=(await smRest(`profiles?select=id,display_name,handicap_index,is_discoverable&id=eq.${encodeURIComponent(s.user.id)}&limit=1`))?.[0];
  if(!own)return null;
  const ownAvailability=await smRest(`golfer_availability?select=id,user_id,region,radius_km,course_id,available_date,start_time,end_time,holes,min_handicap,max_handicap,playing_style,status&user_id=eq.${encodeURIComponent(s.user.id)}&status=eq.active&available_date=gte.${encodeURIComponent(new Date().toISOString().slice(0,10))}&order=available_date.asc,start_time.asc`)||[];
  const others=await smRest(`golfer_availability?select=id,user_id,region,radius_km,course_id,available_date,start_time,end_time,holes,min_handicap,max_handicap,playing_style,status&user_id=neq.${encodeURIComponent(s.user.id)}&status=eq.active&available_date=gte.${encodeURIComponent(new Date().toISOString().slice(0,10))}&order=available_date.asc,start_time.asc&limit=100`)||[];
  const ids=[...new Set(others.map(a=>a.user_id))];
  const profiles=ids.length?await smRest(`profiles?select=id,display_name,handicap_index,region,woonplaats,is_discoverable&id=in.(${ids.map(encodeURIComponent).join(',')})`)||[]:[];
  const byId=new Map(profiles.filter(p=>p.is_discoverable).map(p=>[p.id,p]));
  return {own,ownAvailability,others:others.filter(a=>byId.has(a.user_id)),profiles:byId};
}

function smCompatible(a,b,ownProfile,otherProfile){
  if(a.available_date!==b.available_date)return false;
  const as=smMinutes(a.start_time),ae=smMinutes(a.end_time),bs=smMinutes(b.start_time),be=smMinutes(b.end_time);
  if(as!==null&&be!==null&&as>be)return false;
  if(bs!==null&&ae!==null&&bs>ae)return false;
  if(a.holes!=='both'&&b.holes!=='both'&&a.holes!==b.holes)return false;
  if(a.course_id&&b.course_id&&String(a.course_id)!==String(b.course_id))return false;
  if(!a.course_id&&!b.course_id&&smNorm(a.region)!==smNorm(b.region))return false;
  if(a.min_handicap!==null&&a.min_handicap!==undefined&&Number(otherProfile.handicap_index)<Number(a.min_handicap))return false;
  if(a.max_handicap!==null&&a.max_handicap!==undefined&&Number(otherProfile.handicap_index)>Number(a.max_handicap))return false;
  if(b.min_handicap!==null&&b.min_handicap!==undefined&&Number(ownProfile.handicap_index)<Number(b.min_handicap))return false;
  if(b.max_handicap!==null&&b.max_handicap!==undefined&&Number(ownProfile.handicap_index)>Number(b.max_handicap))return false;
  if(a.playing_style&&b.playing_style&&a.playing_style!==b.playing_style)return false;
  return true;
}

async function smRequests(){
  const s=smSession();if(!s?.user?.id)return [];
  return await smRest(`golf_play_requests?select=id,requester_user_id,recipient_user_id,availability_id,status&or=(requester_user_id.eq.${encodeURIComponent(s.user.id)},recipient_user_id.eq.${encodeURIComponent(s.user.id)})`)||[];
}

function smFormatDate(v){try{return new Date(`${v}T12:00:00`).toLocaleDateString('nl-NL',{day:'numeric',month:'short'})}catch{return v}}
function smFormatTime(v){return v?String(v).slice(0,5):'flexibel'}
function smLabel(a,b){
  const parts=[smFormatDate(a.available_date)];
  if(a.start_time||a.end_time)parts.push(`${smFormatTime(a.start_time)}${a.end_time?`–${smFormatTime(a.end_time)}`:''}`);
  parts.push(a.holes==='both'?'9 of 18 holes':`${a.holes} holes`);
  if(a.course_id&&b?.courseName)parts.push(b.courseName);
  else if(a.region)parts.push(a.region);
  return parts.join(' · ');
}

async function smRender(){
  const page=document.getElementById('page-social');if(!page)return;
  const data=await smLoad();if(!data)return;
  let section=page.querySelector('.social-matching-section');
  if(!section){
    section=document.createElement('section');section.className='social-section social-matching-section';
    const flightPanel=page.querySelector('.social-flight-panel');
    if(flightPanel)flightPanel.before(section);else page.appendChild(section);
  }
  const courseRows=data.others.filter(a=>a.course_id).length?await smRest(`courses?select=id,name&id=in.(${[...new Set(data.others.filter(a=>a.course_id).map(a=>a.course_id))].map(encodeURIComponent).join(',')})`)||[]:[];
  const courseNames=new Map(courseRows.map(c=>[c.id,c.name]));
  const requests=await smRequests();
  const activeRequest=(recipient,availabilityId)=>requests.find(r=>r.recipient_user_id===recipient&&r.availability_id===availabilityId&&['requested','accepted'].includes(r.status));
  const matches=[];
  for(const mine of data.ownAvailability){
    for(const other of data.others){
      const profile=data.profiles.get(other.user_id);if(!profile)continue;
      if(smCompatible(mine,other,data.own,profile))matches.push({mine,other,profile,score:(mine.course_id&&other.course_id?3:0)+(mine.holes===other.holes?2:1)+(mine.playing_style&&mine.playing_style===other.playing_style?1:0)});
    }
  }
  const unique=new Map();matches.sort((x,y)=>y.score-x.score).forEach(m=>{const key=`${m.profile.id}:${m.other.id}`;if(!unique.has(key))unique.set(key,m)});
  const list=[...unique.values()].slice(0,10);
  section.innerHTML=`<div class="social-section-head"><div><h3>Golfers die bij jou passen</h3><span class="social-matching-subtitle">op basis van je beschikbaarheid</span></div><span>${list.length}</span></div><div class="social-matching-list">${list.length?list.map(m=>{const req=activeRequest(m.profile.id,m.other.id);const courseName=courseNames.get(m.other.course_id);return `<article class="social-matching-row"><div class="social-avatar">${smEsc(String(m.profile.display_name||'G').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase())}</div><div class="social-matching-copy"><strong>${smEsc(m.profile.display_name||'Golfer')}</strong><span>HCP ${Number(m.profile.handicap_index).toFixed(1).replace('.',',')} · ${smEsc(smLabel(m.other,{courseName}))}</span></div><div class="social-matching-action">${req?`<span class="social-status-pill">${req.status==='accepted'?'Samen spelen':'Verzoek verstuurd'}</span>`:`<button class="social-secondary" type="button" data-sm-request="${smEsc(m.other.id)}" data-sm-recipient="${smEsc(m.profile.id)}">Vraag om samen te spelen</button>`}</div></article>`}).join(''):'<div class="social-flight-empty">Nog geen golfers gevonden die bij jouw beschikbaarheid passen.</div>'}</div>`;
  section.onclick=async e=>{const b=e.target.closest('[data-sm-request]');if(!b)return;b.disabled=true;b.textContent='Versturen…';try{const s=smSession();await smRest('golf_play_requests',{method:'POST',prefer:'return=minimal',body:{requester_user_id:s.user.id,recipient_user_id:b.dataset.smRecipient,availability_id:b.dataset.smRequest,status:'requested'}});b.outerHTML='<span class="social-status-pill">Verzoek verstuurd</span>'}catch(err){console.error(err);b.disabled=false;b.textContent='Vraag om samen te spelen';document.getElementById('toast')?.classList.add('show');if(document.getElementById('toast')){document.getElementById('toast').textContent=err.code==='23505'?'Verzoek bestaat al.':'Verzoek versturen mislukt.';setTimeout(()=>document.getElementById('toast')?.classList.remove('show'),2200)}}};
}

async function smInit(){if(smReady)return;const page=document.getElementById('page-social');if(!page)return;try{await smRender();smReady=true}catch(e){console.error('BOUNDS social matching init',e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(smInit,900));else setTimeout(smInit,900);
new MutationObserver(()=>{if(!smReady)smInit()}).observe(document.body,{childList:true,subtree:true});