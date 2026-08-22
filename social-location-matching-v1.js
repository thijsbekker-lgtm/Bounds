const SLM_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SLM_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const SLM_SESSION='bounds_supabase_session';
(function(){
  let rendered=false;
  function session(){try{return JSON.parse(localStorage.getItem(SLM_SESSION)||'null')}catch{return null}}
  function headers(json=false){const s=session();const h={apikey:SLM_KEY,Authorization:`Bearer ${s?.access_token||''}`};if(json)h['Content-Type']='application/json';return h}
  async function rest(path,{method='GET',body=null,prefer=null}={}){const r=await fetch(`${SLM_URL}/rest/v1/${path}`,{method,headers:{...headers(Boolean(body)),...(prefer?{Prefer:prefer}:{})},body:body?JSON.stringify(body):undefined});const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok){const e=new Error(d?.message||d?.details||d?.hint||d?.error||t||`HTTP ${r.status}`);e.code=d?.code;throw e}return d}
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
  const minutes=v=>{const [h,m]=String(v||'').slice(0,5).split(':').map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:null};
  const dateLabel=v=>{try{return new Date(`${v}T12:00:00`).toLocaleDateString('nl-NL',{day:'numeric',month:'short'})}catch{return v}};
  const timeLabel=v=>v?String(v).slice(0,5):'flexibel';
  function locationCompatible(a,b){
    const am=a.location_mode||'area',bm=b.location_mode||'area';
    if(am==='flexible'||bm==='flexible')return true;
    if(am==='course'||bm==='course')return am==='course'&&bm==='course'&&a.course_id&&b.course_id&&String(a.course_id)===String(b.course_id);
    return norm(a.region)===norm(b.region);
  }
  function timeCompatible(a,b){const as=minutes(a.start_time),ae=minutes(a.end_time),bs=minutes(b.start_time),be=minutes(b.end_time);if(as!==null&&be!==null&&as>be)return false;if(bs!==null&&ae!==null&&bs>ae)return false;return true}
  function holesCompatible(a,b){return a.holes==='both'||b.holes==='both'||a.holes===b.holes}
  function hcpCompatible(a,b,ownHcp,otherHcp){
    if(a.min_handicap!==null&&a.min_handicap!==undefined&&otherHcp<a.min_handicap)return false;
    if(a.max_handicap!==null&&a.max_handicap!==undefined&&otherHcp>a.max_handicap)return false;
    if(b.min_handicap!==null&&b.min_handicap!==undefined&&ownHcp<b.min_handicap)return false;
    if(b.max_handicap!==null&&b.max_handicap!==undefined&&ownHcp>b.max_handicap)return false;
    return true;
  }
  function styleCompatible(a,b){return !a.playing_style||!b.playing_style||a.playing_style===b.playing_style}
  function locationLabel(a,courses){
    if((a.location_mode||'area')==='flexible')return 'flexibel';
    if((a.location_mode||'area')==='course')return courses.get(a.course_id)||'Specifieke baan';
    return `${a.region||'Je omgeving'}${a.radius_km?` · ${a.radius_km} km`:''}`;
  }
  async function render(){
    const page=document.getElementById('page-social');if(!page)return;
    const s=session();if(!s?.user?.id||!s.access_token)return;
    const own=(await rest(`profiles?select=id,display_name,handicap_index,is_discoverable&id=eq.${encodeURIComponent(s.user.id)}&limit=1`))?.[0];if(!own)return;
    const ownAvailability=await rest(`golfer_availability?select=id,user_id,region,radius_km,course_id,location_mode,available_date,start_time,end_time,holes,min_handicap,max_handicap,playing_style,status&user_id=eq.${encodeURIComponent(s.user.id)}&status=eq.active&available_date=gte.${encodeURIComponent(new Date().toISOString().slice(0,10))}&order=available_date.asc,start_time.asc`)||[];
    const others=await rest(`golfer_availability?select=id,user_id,region,radius_km,course_id,location_mode,available_date,start_time,end_time,holes,min_handicap,max_handicap,playing_style,status&user_id=neq.${encodeURIComponent(s.user.id)}&status=eq.active&available_date=gte.${encodeURIComponent(new Date().toISOString().slice(0,10))}&order=available_date.asc,start_time.asc&limit=100`)||[];
    const ids=[...new Set(others.map(a=>a.user_id))];
    const profiles=ids.length?await rest(`profiles?select=id,display_name,handicap_index,is_discoverable&id=in.(${ids.map(encodeURIComponent).join(',')})`)||[]:[];
    const byProfile=new Map(profiles.filter(p=>p.is_discoverable).map(p=>[p.id,p]));
    const courseIds=[...new Set([...ownAvailability,...others].filter(a=>a.course_id).map(a=>a.course_id))];
    const courseRows=courseIds.length?await rest(`courses?select=id,name,location&id=in.(${courseIds.map(encodeURIComponent).join(',')})`)||[]:[];
    const courses=new Map(courseRows.map(c=>[c.id,c.name]));
    const requests=await rest(`golf_play_requests?select=id,requester_user_id,recipient_user_id,availability_id,status&or=(requester_user_id.eq.${encodeURIComponent(s.user.id)},recipient_user_id.eq.${encodeURIComponent(s.user.id)})`)||[];
    const activeRequest=(recipient,availabilityId)=>requests.find(r=>r.recipient_user_id===recipient&&r.availability_id===availabilityId&&['requested','accepted'].includes(r.status));
    const matches=[];
    for(const mine of ownAvailability){
      for(const other of others){
        const p=byProfile.get(other.user_id);if(!p)continue;
        if(mine.available_date!==other.available_date||!timeCompatible(mine,other)||!holesCompatible(mine,other))continue;
        if(!locationCompatible(mine,other))continue;
        if(!hcpCompatible(mine,other,Number(own.handicap_index),Number(p.handicap_index)))continue;
        if(!styleCompatible(mine,other))continue;
        const score=(mine.location_mode==='course'&&other.location_mode==='course'?4:mine.location_mode==='area'&&other.location_mode==='area'?3:1)+(mine.holes===other.holes?2:1)+(mine.playing_style&&mine.playing_style===other.playing_style?1:0);
        matches.push({mine,other,profile:p,score});
      }
    }
    const unique=new Map();matches.sort((a,b)=>b.score-a.score).forEach(m=>{const key=`${m.profile.id}:${m.other.id}`;if(!unique.has(key))unique.set(key,m)});
    const list=[...unique.values()].slice(0,10);
    let section=page.querySelector('.social-location-matching');
    if(!section){section=document.createElement('section');section.className='social-section social-matching-section social-location-matching';const flightPanel=page.querySelector('.social-flight-panel');if(flightPanel)flightPanel.before(section);else page.appendChild(section)}
    section.innerHTML=`<div class="social-section-head"><div><h3>Golfers die bij jou passen</h3><span class="social-matching-subtitle">op basis van datum, locatie en speelvoorkeur</span></div><span>${list.length}</span></div><div class="social-matching-list">${list.length?list.map(m=>{const req=activeRequest(m.profile.id,m.other.id);const label=locationLabel(m.other,courses);const initials=String(m.profile.display_name||'G').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();const requestLabel=req?.status==='accepted'?'Samen spelen':req?'Verzoek verstuurd':'Vraag om samen te spelen';return `<article class="social-matching-row"><div class="social-avatar">${esc(initials)}</div><div class="social-matching-copy"><strong>${esc(m.profile.display_name||'Golfer')}</strong><span>HCP ${Number(m.profile.handicap_index).toFixed(1).replace('.',',')} · ${esc(dateLabel(m.other.available_date))} · ${esc(timeLabel(m.other.start_time))}${m.other.end_time?`–${esc(timeLabel(m.other.end_time))}`:''} · ${esc(label)}</span></div><div class="social-matching-action">${req?`<span class="social-status-pill">${requestLabel}</span>`:`<button class="social-secondary" type="button" data-slm-request="${esc(m.other.id)}" data-slm-recipient="${esc(m.profile.id)}">Vraag om samen te spelen</button>`}</div></article>`}).join(''):'<div class="social-flight-empty">Nog geen golfers gevonden die bij jouw beschikbaarheid passen.</div>'}</div>`;
    section.onclick=async e=>{const b=e.target.closest('[data-slm-request]');if(!b)return;b.disabled=true;b.textContent='Versturen…';try{await rest('golf_play_requests',{method:'POST',prefer:'return=minimal',body:{requester_user_id:s.user.id,recipient_user_id:b.dataset.slmRecipient,availability_id:b.dataset.slmRequest,status:'requested'}});b.outerHTML='<span class="social-status-pill">Verzoek verstuurd</span>'}catch(err){console.error(err);b.disabled=false;b.textContent='Vraag om samen te spelen';const toast=document.getElementById('toast');if(toast){toast.textContent=err.code==='23505'?'Verzoek bestaat al.':'Verzoek versturen mislukt.';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2200)}}};
    rendered=true;
  }
  const start=()=>setTimeout(()=>render().catch(e=>console.error('BOUNDS location matching',e)),1300);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  document.querySelector('.tabs')?.addEventListener('click',e=>{if(e.target.closest('.tab[data-tab="social"]'))setTimeout(()=>render().catch(()=>{}),250)});
})();
