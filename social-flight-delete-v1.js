const SFD_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SFD_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const SFD_SESSION='bounds_supabase_session';
let sfdRendering=false;

function sfdSession(){try{return JSON.parse(localStorage.getItem(SFD_SESSION)||'null')}catch{return null}}
function sfdHeaders(json=false){const s=sfdSession();const h={apikey:SFD_KEY,Authorization:`Bearer ${s?.access_token||''}`};if(json)h['Content-Type']='application/json';return h}
async function sfdRest(path,{method='GET',body=null,prefer=null}={}){const r=await fetch(`${SFD_URL}/rest/v1/${path}`,{method,headers:{...sfdHeaders(Boolean(body)),...(prefer?{Prefer:prefer}:{})},body:body?JSON.stringify(body):undefined});const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}if(!r.ok){const e=new Error(data?.message||data?.details||data?.hint||data?.error||text||`HTTP ${r.status}`);e.status=r.status;e.code=data?.code;throw e}return data}
const sfdEsc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const sfdTime=v=>String(v||'').slice(0,5);
const sfdDate=v=>{try{return new Date(`${v}T12:00:00`).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})}catch{return v}};
function sfdCourseName(id){return document.querySelector(`#sfMyFlights`)?.closest('.social-flight-panel')?.querySelector(`[data-sfd-course-name="${CSS.escape(String(id))}"]`)?.textContent||'Flight'}
function sfdToast(message){if(typeof sfToast==='function'){sfToast(message);return}const t=document.getElementById('toast');if(!t)return;t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}

async function sfdLoadMine(){
  const s=sfdSession();
  if(!s?.user?.id)return [];
  return await sfdRest(`golf_flights?select=id,host_user_id,course_id,flight_date,start_time,holes,max_players,status,visibility&host_user_id=eq.${encodeURIComponent(s.user.id)}&order=flight_date.asc,start_time.asc&limit=50`)||[];
}
async function sfdLoadCourses(){
  return await sfdRest('courses?select=id,name,location&order=name')||[];
}
async function sfdLoadPlayers(ids){
  if(!ids.length)return [];
  return await sfdRest(`golf_flight_players?select=id,flight_id,user_id,status&flight_id=in.(${ids.map(encodeURIComponent).join(',')})`)||[];
}

async function sfdRender(){
  const host=document.getElementById('sfMyFlights');
  if(!host||sfdRendering)return;
  const flights=await sfdLoadMine();
  if(host.querySelector('[data-sfd-flight]')&&host.dataset.sfdIds==flights.map(f=>f.id).join(','))return;
  const courses=await sfdLoadCourses();
  const byCourse=new Map(courses.map(c=>[String(c.id),c]));
  const players=await sfdLoadPlayers(flights.map(f=>f.id));
  const byFlight=new Map();
  players.forEach(p=>{if(!byFlight.has(p.flight_id))byFlight.set(p.flight_id,[]);byFlight.get(p.flight_id).push(p)});
  sfdRendering=true;
  try{
    host.dataset.sfdIds=flights.map(f=>f.id).join(',');
    if(!flights.length){host.innerHTML='<div class="social-flight-empty">Je hebt nog geen gedeelde flights.</div>';return}
    host.innerHTML=flights.map(f=>{
      const course=byCourse.get(String(f.course_id));
      const ps=byFlight.get(f.id)||[];
      const accepted=ps.filter(p=>p.status==='accepted').length;
      const courseName=course?.name||'Onbekende baan';
      return `<article class="social-flight-row" data-sfd-flight="${sfdEsc(f.id)}"><div><strong>${sfdEsc(courseName)}</strong><small>${sfdEsc(sfdDate(f.flight_date))} · ${sfdEsc(sfdTime(f.start_time))} · ${sfdEsc(f.holes)} holes</small><small>${accepted}/${sfdEsc(f.max_players)} spelers · ${sfdEsc(f.status)}</small></div><div class="sf-flight-buttons"><button class="social-secondary sf-delete" type="button" data-sfd-delete="${sfdEsc(f.id)}">Verwijder</button></div></article>`;
    }).join('');
  }finally{queueMicrotask(()=>{sfdRendering=false})}
}

async function sfdDeleteFlight(id){
  const ok=confirm('Deze flight verwijderen? De flight en de bijbehorende deelnemers worden verwijderd.');
  if(!ok)return;
  try{
    await sfdRest(`golf_flight_players?flight_id=eq.${encodeURIComponent(id)}`,{method:'DELETE',prefer:'return=minimal'});
    await sfdRest(`golf_flights?id=eq.${encodeURIComponent(id)}&host_user_id=eq.${encodeURIComponent(sfdSession()?.user?.id||'')}`,{method:'DELETE',prefer:'return=minimal'});
    sfdToast('Flight verwijderd.');
    const host=document.getElementById('sfMyFlights');if(host)host.dataset.sfdIds='';
    await sfdRender();
  }catch(e){
    console.error('BOUNDS flight delete error',e);
    sfdToast(`Flight verwijderen mislukt${e?.message?`: ${e.message}`:''}`);
  }
}

function sfdWire(){
  const host=document.getElementById('sfMyFlights');if(!host)return false;
  if(!host.dataset.sfdListener){
    host.dataset.sfdListener='1';
    host.addEventListener('click',e=>{const b=e.target.closest('[data-sfd-delete]');if(b){e.preventDefault();e.stopPropagation();sfdDeleteFlight(b.dataset.sfdDelete)}});
  }
  sfdRender();
  return true;
}

function sfdInit(){
  if(sfdWire())return;
  setTimeout(sfdInit,300);
}

document.addEventListener('DOMContentLoaded',()=>setTimeout(sfdInit,300));
new MutationObserver(()=>{if(!sfdRendering)sfdWire()}).observe(document.body,{childList:true,subtree:true});
