const SF_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SF_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const SF_SESSION='bounds_supabase_session';
let sfInitialized=false;
let sfCourses=[];
let sfProfile=null;
let sfFlights=[];
let sfAvailability=[];

function sfSession(){try{return JSON.parse(localStorage.getItem(SF_SESSION)||'null')}catch{return null}}
function sfHeaders(json=false){const s=sfSession();const h={apikey:SF_KEY,Authorization:`Bearer ${s?.access_token||''}`};if(json)h['Content-Type']='application/json';return h}
async function sfRest(path,{method='GET',body=null,prefer=null}={}){const r=await fetch(`${SF_URL}/rest/v1/${path}`,{method,headers:{...sfHeaders(Boolean(body)),...(prefer?{Prefer:prefer}:{})},body:body?JSON.stringify(body):undefined});const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok){const e=new Error(d?.message||d?.details||d?.hint||d?.error||t||`HTTP ${r.status}`);e.status=r.status;throw e}return d}
const sfEsc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function sfToast(m){const t=document.getElementById('toast');if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function sfToday(){return new Date().toISOString().slice(0,10)}
function sfTime(t){return String(t||'').slice(0,5)}
function sfCourseName(id){return sfCourses.find(c=>String(c.id)===String(id))?.name||'Iedere baan'}
function sfCourseLocation(id){return sfCourses.find(c=>String(c.id)===String(id))?.location||''}

async function sfLoadContext(){
  const s=sfSession();if(!s?.user?.id||!s.access_token)return false;
  sfProfile=(await sfRest(`profiles?select=id,display_name,region,woonplaats,handicap_index,is_discoverable&id=eq.${encodeURIComponent(s.user.id)}&limit=1`))?.[0]||null;
  sfCourses=await sfRest('courses?select=id,name,location&order=name')||[];
  sfAvailability=await sfRest(`golfer_availability?select=id,region,radius_km,course_id,available_date,start_time,end_time,holes,min_handicap,max_handicap,playing_style,status&user_id=eq.${encodeURIComponent(s.user.id)}&status=eq.active&order=available_date.asc,start_time.asc`)||[];
  return true;
}

function sfCourseOptions(selected=''){
  return '<option value="">Geen specifieke baan</option>'+sfCourses.map(c=>`<option value="${sfEsc(c.id)}" ${String(c.id)===String(selected)?'selected':''}>${sfEsc(c.name)}${c.location?` — ${sfEsc(c.location)}`:''}</option>`).join('');
}
function sfFlightCourseOptions(selected=''){
  return '<option value="">Kies een baan</option>'+sfCourses.map(c=>`<option value="${sfEsc(c.id)}" ${String(c.id)===String(selected)?'selected':''}>${sfEsc(c.name)}${c.location?` — ${sfEsc(c.location)}`:''}</option>`).join('');
}

function sfEnsurePanel(){
  const page=document.getElementById('page-social');if(!page)return null;
  let panel=page.querySelector('.social-flight-panel');
  if(panel)return panel;
  panel=document.createElement('section');panel.className='social-flight-panel';panel.innerHTML=`
    <div class="social-flight-grid">
      <article class="social-flight-card">
        <h3>Ik ben beschikbaar</h3>
        <p>Geef aan wanneer je openstaat om samen te spelen. Alleen je beschikbaarheid wordt gebruikt voor matches.</p>
        <div class="social-flight-form">
          <label>Datum<input id="sfAvailDate" type="date" min="${sfToday()}"></label>
          <label>Holes<select id="sfAvailHoles"><option value="18">18 holes</option><option value="9">9 holes</option><option value="both">9 of 18 holes</option></select></label>
          <label>Vanaf<input id="sfAvailStart" type="time" value="09:00"></label>
          <label>Tot<input id="sfAvailEnd" type="time" value="14:00"></label>
          <label>Regio<input id="sfAvailRegion" type="text" maxlength="80" placeholder="Bijv. Utrecht"></label>
          <label>Radius<input id="sfAvailRadius" type="number" min="1" max="100" step="1" value="25"></label>
          <label class="wide">Voorkeursbaan (optioneel)<select id="sfAvailCourse">${sfCourseOptions()}</select></label>
          <label>Min. handicap<input id="sfAvailMinHcp" type="number" min="-10" max="54" step="0.1" placeholder="Geen voorkeur"></label>
          <label>Max. handicap<input id="sfAvailMaxHcp" type="number" min="-10" max="54" step="0.1" placeholder="Geen voorkeur"></label>
          <label class="wide">Speelstijl<select id="sfAvailStyle"><option value="">Geen voorkeur</option><option>Relaxed</option><option>Sportief</option><option>Gezellig</option><option>Relaxed competitief</option></select></label>
        </div>
        <div class="social-flight-actions"><button class="social-primary" id="sfSaveAvailability" type="button">Beschikbaar maken</button><span class="social-flight-message" id="sfAvailMessage"></span></div>
        <div class="social-flight-note">Vindbaarheid blijft opt-in. Zet je Social-profiel op vindbaar om daadwerkelijk gematcht te worden.</div>
      </article>
      <article class="social-flight-card">
        <h3>Ik heb een flight geboekt</h3>
        <p>Deel een concrete flight en laat BOUNDS zien wie nog kan aansluiten.</p>
        <div class="social-flight-form">
          <label class="wide">Golfbaan<select id="sfFlightCourse">${sfFlightCourseOptions()}</select></label>
          <label>Datum<input id="sfFlightDate" type="date" min="${sfToday()}"></label>
          <label>Tijd<input id="sfFlightTime" type="time" value="10:00"></label>
          <label>Holes<select id="sfFlightHoles"><option value="18">18 holes</option><option value="9">9 holes</option></select></label>
          <label>Max. spelers<select id="sfFlightMax"><option value="2">2</option><option value="3">3</option><option value="4" selected>4</option></select></label>
          <label class="wide">Zichtbaarheid<select id="sfFlightVisibility"><option value="community">Vindbaar voor golfers</option><option value="friends">Alleen vrienden</option><option value="private">Privé</option></select></label>
        </div>
        <div class="social-flight-actions"><button class="social-primary" id="sfCreateFlight" type="button">Flight delen</button><span class="social-flight-message" id="sfFlightMessage"></span></div>
      </article>
    </div>
    <div class="social-flight-section-title"><h3>Flights die bij jou passen</h3><span>op basis van beschikbaarheid</span></div>
    <div id="sfMatchingFlights" class="social-flight-list"></div>
    <div class="social-flight-section-title"><h3>Mijn beschikbaarheid</h3><span>actieve speelmomenten</span></div>
    <div id="sfMyAvailability" class="social-flight-list"></div>
    <div class="social-flight-section-title"><h3>Mijn flights</h3><span>geboekt of gedeeld</span></div>
    <div id="sfMyFlights" class="social-flight-list"></div>`;
  const host=page.querySelector('.social-page');(host||page).appendChild(panel);return panel;
}

function sfSetDefaults(){
  const d=document.getElementById('sfAvailDate');if(d&&!d.value)d.value=sfToday();
  const fd=document.getElementById('sfFlightDate');if(fd&&!fd.value)fd.value=sfToday();
  const r=document.getElementById('sfAvailRegion');if(r&&!r.value)r.value=sfProfile?.region||sfProfile?.woonplaats||'';
  const h=Number(sfProfile?.handicap_index);if(Number.isFinite(h)){
    const min=document.getElementById('sfAvailMinHcp'),max=document.getElementById('sfAvailMaxHcp');
    if(min&&!min.value)min.value=Math.max(-10,h-5).toFixed(1);if(max&&!max.value)max.value=Math.min(54,h+5).toFixed(1);
  }
}

async function sfSaveAvailability(){
  const s=sfSession();const date=document.getElementById('sfAvailDate')?.value;const region=document.getElementById('sfAvailRegion')?.value.trim();
  if(!s?.user?.id||!date||!region){sfToast('Vul datum en regio in.');return}
  const b=document.getElementById('sfSaveAvailability');b.disabled=true;
  try{
    await sfRest('golfer_availability',{method:'POST',prefer:'return=minimal',body:{user_id:s.user.id,region,radius_km:Number(document.getElementById('sfAvailRadius').value)||25,course_id:document.getElementById('sfAvailCourse').value||null,available_date:date,start_time:document.getElementById('sfAvailStart').value||null,end_time:document.getElementById('sfAvailEnd').value||null,holes:document.getElementById('sfAvailHoles').value,min_handicap:document.getElementById('sfAvailMinHcp').value===''?null:Number(document.getElementById('sfAvailMinHcp').value),max_handicap:document.getElementById('sfAvailMaxHcp').value===''?null:Number(document.getElementById('sfAvailMaxHcp').value),playing_style:document.getElementById('sfAvailStyle').value||null,status:'active'}});
    document.getElementById('sfAvailMessage').textContent='Opgeslagen';sfToast('Beschikbaarheid opgeslagen.');await sfRefresh();
  }catch(e){console.error(e);document.getElementById('sfAvailMessage').textContent='Opslaan mislukt';sfToast('Beschikbaarheid opslaan mislukt.')}finally{b.disabled=false}
}

async function sfCreateFlight(){
  const s=sfSession();const courseId=document.getElementById('sfFlightCourse')?.value;const date=document.getElementById('sfFlightDate')?.value;const time=document.getElementById('sfFlightTime')?.value;
  if(!s?.user?.id||!courseId||!date||!time){sfToast('Kies baan, datum en tijd.');return}
  const b=document.getElementById('sfCreateFlight');b.disabled=true;
  try{
    const flight=(await sfRest('golf_flights',{method:'POST',prefer:'return=representation',body:{host_user_id:s.user.id,course_id:courseId,flight_date:date,start_time:time+':00',holes:document.getElementById('sfFlightHoles').value,max_players:Number(document.getElementById('sfFlightMax').value),visibility:document.getElementById('sfFlightVisibility').value,status:'open'}}))?.[0];
    if(!flight)throw new Error('Flight kon niet worden aangemaakt.');
    await sfRest('golf_flight_players',{method:'POST',prefer:'return=minimal',body:{flight_id:flight.id,user_id:s.user.id,status:'accepted'}});
    document.getElementById('sfFlightMessage').textContent='Gedeeld';sfToast('Flight gedeeld.');await sfRefresh();
  }catch(e){console.error(e);document.getElementById('sfFlightMessage').textContent='Opslaan mislukt';sfToast('Flight delen mislukt.')}finally{b.disabled=false}
}

function sfTimeMinutes(v){const [h,m]=String(v||'').slice(0,5).split(':').map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:null}
function sfAvailabilityMatchesFlight(a,f){
  if(a.available_date!==f.flight_date)return false;
  if(a.course_id&&String(a.course_id)!==String(f.course_id))return false;
  const ft=sfTimeMinutes(f.start_time),as=sfTimeMinutes(a.start_time),ae=sfTimeMinutes(a.end_time);if(ft!==null&&as!==null&&ft<as)return false;if(ft!==null&&ae!==null&&ft>ae)return false;
  if(a.holes!=='both'&&a.holes!==f.holes)return false;
  const h=Number(sfProfile?.handicap_index);if(Number.isFinite(h)){if(a.min_handicap!==null&&h<Number(a.min_handicap))return false;if(a.max_handicap!==null&&h>Number(a.max_handicap))return false}
  return true;
}

async function sfRenderFlights(){
  const matchHost=document.getElementById('sfMatchingFlights'),myHost=document.getElementById('sfMyFlights'),availHost=document.getElementById('sfMyAvailability');if(!matchHost)return;
  const s=sfSession();if(!s?.user?.id)return;
  const flights=await sfRest('golf_flights?select=id,host_user_id,course_id,flight_date,start_time,holes,max_players,status,visibility&status=eq.open&visibility=eq.community&flight_date=gte.'+encodeURIComponent(sfToday())+'&order=flight_date.asc,start_time.asc&limit=50')||[];
  const mine=await sfRest(`golf_flights?select=id,host_user_id,course_id,flight_date,start_time,holes,max_players,status,visibility&host_user_id=eq.${encodeURIComponent(s.user.id)}&order=flight_date.asc,start_time.asc&limit=50`)||[];
  const flightIds=[...new Set([...flights,...mine].map(f=>f.id))];
  const players=flightIds.length?await sfRest(`golf_flight_players?select=flight_id,user_id,status&flight_id=in.(${flightIds.map(encodeURIComponent).join(',')})`)||[]:[];
  const profiles=[...new Set([...flights,...mine].map(f=>f.host_user_id))];
  const hostProfiles=profiles.length?await sfRest(`profiles?select=id,display_name,handicap_index,region,woonplaats&id=in.(${profiles.map(encodeURIComponent).join(',')})`)||[]:[];
  const byHost=new Map(hostProfiles.map(p=>[p.id,p]));
  const byFlight=new Map();players.forEach(p=>{if(!byFlight.has(p.flight_id))byFlight.set(p.flight_id,[]);byFlight.get(p.flight_id).push(p)});
  const acceptedCount=f=>((byFlight.get(f.id)||[]).filter(p=>p.status==='accepted').length);
  const requestedByMe=f=>(byFlight.get(f.id)||[]).find(p=>p.user_id===s.user.id)?.status||null;
  const activeAvailability=sfAvailability;
  const matches=flights.filter(f=>f.host_user_id!==s.user.id&&acceptedCount(f)<f.max_players&&(activeAvailability.length?activeAvailability.some(a=>sfAvailabilityMatchesFlight(a,f)):true));
  if(!matches.length)matchHost.innerHTML='<div class="social-flight-empty">Nog geen flights gevonden die bij jouw beschikbaarheid passen.</div>';else matchHost.innerHTML=matches.map(f=>{const host=byHost.get(f.host_user_id)||{};const req=requestedByMe(f);const spots=Math.max(0,f.max_players-acceptedCount(f));const label=req==='requested'?'Aanvraag verstuurd':req==='accepted'?'Je speelt mee':'Vraag om mee te spelen';return `<article class="social-flight-row"><div><strong>${sfEsc(sfCourseName(f.course_id))}</strong><small>${sfEsc(f.flight_date)} · ${sfEsc(sfTime(f.start_time))} · ${sfEsc(f.holes)} holes</small><small>${sfEsc(host.display_name||'Golfer')} · HCP ${host.handicap_index??'—'} · <span class="meta">${spots} plek${spots===1?'':'ken'} vrij</span></small></div><button class="social-secondary" type="button" data-sf-join="${sfEsc(f.id)}" ${req||spots===0?'disabled':''}>${label}</button></article>`}).join('');
  if(!mine.length)myHost.innerHTML='<div class="social-flight-empty">Je hebt nog geen gedeelde flights.</div>';else myHost.innerHTML=mine.map(f=>`<article class="social-flight-row"><div><strong>${sfEsc(sfCourseName(f.course_id))}</strong><small>${sfEsc(f.flight_date)} · ${sfEsc(sfTime(f.start_time))} · ${sfEsc(f.holes)} holes</small><small>${acceptedCount(f)}/${f.max_players} spelers · ${sfEsc(f.status)}</small></div></article>`).join('');
  if(!activeAvailability.length)availHost.innerHTML='<div class="social-flight-empty">Je hebt nog geen beschikbaarheid ingesteld.</div>';else availHost.innerHTML=activeAvailability.map(a=>`<article class="social-flight-row"><div><strong>${sfEsc(a.available_date)} · ${sfEsc(sfTime(a.start_time))}${a.end_time?' – '+sfEsc(sfTime(a.end_time)):''}</strong><small>${sfEsc(a.region)} · ${a.course_id?sfEsc(sfCourseName(a.course_id)):'Iedere baan'} · ${sfEsc(a.holes)} holes</small></div><button class="social-secondary" type="button" data-sf-delete-availability="${sfEsc(a.id)}">Verwijder</button></article>`).join('');
}

async function sfJoinFlight(id){const s=sfSession();if(!s?.user?.id)return;try{await sfRest('golf_flight_players',{method:'POST',prefer:'return=minimal',body:{flight_id:id,user_id:s.user.id,status:'requested'}});sfToast('Aanvraag verstuurd.');await sfRefresh()}catch(e){console.error(e);sfToast(e.code==='23505'?'Je hebt al een aanvraag gedaan.':'Aanvraag versturen mislukt.')}}
async function sfDeleteAvailability(id){try{await sfRest(`golfer_availability?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});sfToast('Beschikbaarheid verwijderd.');await sfRefresh()}catch(e){console.error(e);sfToast('Verwijderen mislukt.')}}

async function sfRefresh(){if(!await sfLoadContext())return;sfSetDefaults();sfRenderFlights()}
async function sfInit(){if(sfInitialized)return;const page=document.getElementById('page-social');if(!page)return;if(!await sfLoadContext())return;const panel=sfEnsurePanel();if(!panel)return;sfInitialized=true;sfSetDefaults();document.getElementById('sfSaveAvailability').addEventListener('click',sfSaveAvailability);document.getElementById('sfCreateFlight').addEventListener('click',sfCreateFlight);panel.addEventListener('click',e=>{const join=e.target.closest('[data-sf-join]');if(join&&!join.disabled)sfJoinFlight(join.dataset.sfJoin);const del=e.target.closest('[data-sf-delete-availability]');if(del)sfDeleteAvailability(del.dataset.sfDeleteAvailability)});await sfRenderFlights()}

document.addEventListener('DOMContentLoaded',()=>{sfInit();setTimeout(sfInit,700);setTimeout(sfInit,1800)});
new MutationObserver(()=>{if(!sfInitialized)sfInit()}).observe(document.body,{childList:true,subtree:true});