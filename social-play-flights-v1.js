const SPF_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SPF_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const SPF_SESSION='bounds_supabase_session';
let spfReady=false;

function spfSession(){try{return JSON.parse(localStorage.getItem(SPF_SESSION)||'null')}catch{return null}}
function spfHeaders(){const s=spfSession();return {apikey:SPF_KEY,Authorization:`Bearer ${s?.access_token||''}`}}
async function spfRest(path){
  const r=await fetch(`${SPF_URL}/rest/v1/${path}`,{headers:spfHeaders()});
  const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{d=t}
  if(!r.ok)throw new Error(d?.message||d?.details||d?.hint||d?.error||t||`HTTP ${r.status}`);
  return d;
}
const spfEsc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const spfDate=v=>{try{return new Date(`${v}T12:00:00`).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})}catch{return v}};
const spfTime=v=>String(v||'').slice(0,5);

function spfInjectStyles(){
  if(document.getElementById('spfStyles'))return;
  const s=document.createElement('style');s.id='spfStyles';s.textContent=`
    .social-play-flights{margin-bottom:18px}
    .social-play-head{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}
    .social-play-head h3{margin:2px 0 4px}
    .social-play-head p{margin:0;color:#7b8389;font-size:.92rem}
    .social-play-flight-list{display:grid;gap:10px}
    .social-play-flight{border:1px solid #e3e5e7;border-radius:16px;padding:15px 17px;background:#fff}
    .social-play-flight-main{display:grid;gap:4px}
    .social-play-flight-main strong{font-size:1.05rem;color:#1d2d36}
    .social-play-flight-main span{color:#667078;font-size:.92rem}
    .social-play-flight-people{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px;padding-top:10px;border-top:1px solid #eceeef;color:#667078;font-size:.9rem}
    .social-play-flight-people b{color:#1d2d36}
    .social-play-empty{color:#7b8389;padding:6px 0}
  `;document.head.appendChild(s);
}

async function spfRender(){
  const play=document.getElementById('page-play');if(!play)return;
  const s=spfSession();if(!s?.user?.id)return;
  let section=play.querySelector('.social-play-flights');
  if(!section){
    section=document.createElement('section');section.className='card social-play-flights';
    const setup=play.querySelector('#roundSetup');
    if(setup)setup.before(section);else play.prepend(section);
  }
  try{
    const today=new Date().toISOString().slice(0,10);
    const mine=await spfRest(`golf_flights?select=id,host_user_id,course_id,flight_date,start_time,holes,max_players,status,visibility&host_user_id=eq.${encodeURIComponent(s.user.id)}&flight_date=gte.${encodeURIComponent(today)}&order=flight_date.asc,start_time.asc&limit=50`)||[];
    const playerRows=await spfRest(`golf_flight_players?select=id,flight_id,user_id,status&user_id=eq.${encodeURIComponent(s.user.id)}&status=eq.accepted`)||[];
    const playerFlightIds=playerRows.map(p=>p.flight_id);
    let joined=[];
    if(playerFlightIds.length)joined=await spfRest(`golf_flights?select=id,host_user_id,course_id,flight_date,start_time,holes,max_players,status,visibility&id=in.(${playerFlightIds.map(encodeURIComponent).join(',')})&flight_date=gte.${encodeURIComponent(today)}`)||[];
    const flights=[...new Map([...mine,...joined].map(f=>[f.id,f])).values()];
    if(!flights.length){section.innerHTML='<div class="social-play-head"><div><div class="eyebrow">SOCIAL PLAY</div><h3>Mijn flights</h3></div></div><div class="social-play-empty">Je hebt nog geen actieve flights.</div>';return}
    const courseIds=[...new Set(flights.map(f=>f.course_id))];
    const courses=await spfRest(`courses?select=id,name,location&id=in.(${courseIds.map(encodeURIComponent).join(',')})`)||[];
    const byCourse=new Map(courses.map(c=>[String(c.id),c]));
    const flightIds=flights.map(f=>f.id);
    const players=await spfRest(`golf_flight_players?select=id,flight_id,user_id,status&flight_id=in.(${flightIds.map(encodeURIComponent).join(',')})`)||[];
    const hostIds=flights.map(f=>f.host_user_id);
    const userIds=[...new Set([...players.map(p=>p.user_id),...hostIds])];
    const profiles=userIds.length?await spfRest(`profiles?select=id,display_name,handicap_index&id=in.(${userIds.map(encodeURIComponent).join(',')})`)||[]:[];
    const byProfile=new Map(profiles.map(p=>[p.id,p]));
    const byFlight=new Map();
    players.forEach(p=>{if(!byFlight.has(p.flight_id))byFlight.set(p.flight_id,[]);byFlight.get(p.flight_id).push(p)});
    section.innerHTML=`<div class="social-play-head"><div><div class="eyebrow">SOCIAL PLAY</div><h3>Mijn flights</h3><p>Geaccepteerde flights en flights die je zelf hebt gedeeld.</p></div></div><div class="social-play-flight-list">${flights.map(f=>{
      const course=byCourse.get(String(f.course_id));
      const rows=byFlight.get(f.id)||[];
      const people=[];
      const add=(id,status)=>{if(!people.some(p=>p.id===id))people.push({id,status})};
      add(f.host_user_id,'host');
      rows.filter(p=>p.status==='accepted').forEach(p=>add(p.user_id,'accepted'));
      const mineLabel=f.host_user_id===s.user.id?'Jij bent host':'Je speelt mee';
      const places=Math.max(0,Number(f.max_players||4)-people.length);
      return `<article class="social-play-flight"><div class="social-play-flight-main"><strong>${spfEsc(course?.name||'Golfbaan')}</strong><span>${spfEsc(spfDate(f.flight_date))} · ${spfEsc(spfTime(f.start_time))} · ${spfEsc(f.holes)} holes</span><span>${spfEsc(mineLabel)} · ${people.length}/${spfEsc(f.max_players)} spelers · ${places} ${places===1?'plaats':'plaatsen'} vrij</span></div><div class="social-play-flight-people"><b>Spelers</b><span>${people.map(p=>spfEsc(byProfile.get(p.id)?.display_name||'Golfer')).join(' · ')}</span></div></article>`;
    }).join('')}</div>`;
  }catch(e){console.error('BOUNDS social play flights',e);section.innerHTML='<div class="social-play-head"><div><div class="eyebrow">SOCIAL PLAY</div><h3>Mijn flights</h3></div></div><div class="social-play-empty">Flights konden niet worden geladen.</div>'}
}

function spfInit(){
  if(spfReady)return;
  if(!document.getElementById('page-play'))return;
  spfReady=true;
  spfInjectStyles();
  const render=()=>setTimeout(()=>spfRender(),120);
  render();
  document.querySelector('.tabs')?.addEventListener('click',e=>{if(e.target.closest('.tab[data-tab="play"]'))render()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',spfInit);else spfInit();
