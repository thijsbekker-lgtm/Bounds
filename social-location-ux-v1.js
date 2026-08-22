const SL_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SL_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const SL_SESSION='bounds_supabase_session';
(function(){
  let ready=false;
  let profile={};
  let mode='area';
  let radius=25;

  function session(){try{return JSON.parse(localStorage.getItem(SL_SESSION)||'null')}catch{return null}}
  function headers(json=false){const s=session();const h={apikey:SL_KEY,Authorization:`Bearer ${s?.access_token||''}`};if(json)h['Content-Type']='application/json';return h}
  async function rest(path,{method='GET',body=null,prefer=null}={}){
    const r=await fetch(`${SL_URL}/rest/v1/${path}`,{method,headers:{...headers(Boolean(body)),...(prefer?{Prefer:prefer}:{})},body:body?JSON.stringify(body):undefined});
    const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{d=t}
    if(!r.ok){const e=new Error(d?.message||d?.details||d?.hint||d?.error||t||`HTTP ${r.status}`);e.code=d?.code;throw e}
    return d;
  }
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>new Date().toISOString().slice(0,10);
  const regionText=()=>profile.region||profile.woonplaats||'Je omgeving';

  async function loadContext(){
    const s=session();if(!s?.user?.id||!s.access_token)return;
    const rows=await rest(`profiles?select=region,woonplaats,home_course_id&id=eq.${encodeURIComponent(s.user.id)}&limit=1`);
    profile=rows?.[0]||{};
    const saved=await rest(`golfer_availability?select=location_mode,radius_km,course_id&user_id=eq.${encodeURIComponent(s.user.id)}&status=eq.active&available_date=gte.${encodeURIComponent(today())}&order=available_date.asc,start_time.asc&limit=1`)||[];
    if(saved[0]){
      mode=saved[0].location_mode||'area';
      radius=Number(saved[0].radius_km)||25;
      const course=document.getElementById('sfAvailCourse');
      if(course&&saved[0].course_id)course.value=saved[0].course_id;
    }
  }

  function build(){
    const panel=document.querySelector('.social-flight-panel');
    const form=panel?.querySelector('.social-flight-card .social-flight-form');
    if(!form||form.dataset.locationUx==='1')return Boolean(form);
    const region=document.getElementById('sfAvailRegion');
    const radiusInput=document.getElementById('sfAvailRadius');
    const course=document.getElementById('sfAvailCourse');
    if(!region||!radiusInput||!course)return false;
    form.dataset.locationUx='1';
    region.closest('label')?.classList.add('sf-location-hidden');
    radiusInput.closest('label')?.classList.add('sf-location-hidden');
    const courseLabel=course.closest('label');
    const block=document.createElement('div');
    block.className='sf-location-block';
    block.innerHTML=`
      <span class="sf-location-label">Waar wil je spelen?</span>
      <div class="sf-location-options" role="group" aria-label="Speelgebied">
        <button type="button" class="sf-location-option" data-location-mode="area">
          <span class="sf-location-option-icon">⌖</span><span class="sf-location-option-copy"><strong>In mijn omgeving</strong><small>${esc(regionText())} · binnen ${radius} km</small></span>
        </button>
        <button type="button" class="sf-location-option" data-location-mode="course">
          <span class="sf-location-option-icon">⚑</span><span class="sf-location-option-copy"><strong>Een bepaalde baan</strong><small>Kies waar je wilt spelen</small></span>
        </button>
        <button type="button" class="sf-location-option" data-location-mode="flexible">
          <span class="sf-location-option-icon">↗</span><span class="sf-location-option-copy"><strong>Maakt me niet uit</strong><small>Ik ben flexibel met de locatie</small></span>
        </button>
      </div>
      <div class="sf-location-detail" data-location-detail="area">
        <div class="sf-location-summary">${esc(regionText())}<span>Je omgeving als uitgangspunt</span></div>
        <div class="sf-location-radius"><span class="sf-location-radius-label">Afstand</span><button type="button" class="sf-radius-button" data-radius="10">10 km</button><button type="button" class="sf-radius-button" data-radius="25">25 km</button><button type="button" class="sf-radius-button" data-radius="50">50 km</button></div>
      </div>
      <div class="sf-location-detail sf-location-hidden" data-location-detail="course">
        <span class="sf-location-course-label">Golfbaan</span>
      </div>
      <div class="sf-location-detail sf-location-hidden" data-location-detail="flexible"><div class="sf-location-flexible">Dan kijkt BOUNDS vooral naar datum, tijd, holes en speelstijl. Locatie is niet leidend.</div></div>`;
    form.insertBefore(block,form.querySelector('#sfAvailMinHcp')?.closest('label')||null);
    const courseDetail=block.querySelector('[data-location-detail="course"]');
    course.classList.add('sf-location-course-select');
    courseDetail?.appendChild(course);
    courseLabel?.remove();

    const sync=()=>{
      block.querySelectorAll('[data-location-mode]').forEach(b=>b.classList.toggle('is-active',b.dataset.locationMode===mode));
      block.querySelectorAll('[data-location-detail]').forEach(d=>d.classList.toggle('sf-location-hidden',d.dataset.locationDetail!==mode));
      block.querySelectorAll('[data-radius]').forEach(b=>b.classList.toggle('is-active',Number(b.dataset.radius)===radius));
      region.value=mode==='flexible'?(profile.region||profile.woonplaats||'flexibel'):mode==='course'?(course.selectedOptions[0]?.textContent.split(' — ')[1]||regionText()):regionText();
      radiusInput.value=radius;
      if(mode!=='course')course.value='';
      const areaCopy=block.querySelector('[data-location-mode="area"] small');if(areaCopy)areaCopy.textContent=`${regionText()} · binnen ${radius} km`;
    };
    block.addEventListener('click',e=>{
      const choice=e.target.closest('[data-location-mode]');
      if(choice){mode=choice.dataset.locationMode;sync();return}
      const rb=e.target.closest('[data-radius]');
      if(rb){radius=Number(rb.dataset.radius)||25;sync()}
    });
    course.addEventListener('change',()=>{if(mode==='course')sync()});
    block._sync=sync;
    sync();
    return true;
  }

  async function save(e){
    e.preventDefault();e.stopImmediatePropagation();
    const s=session();
    const date=document.getElementById('sfAvailDate')?.value;
    const course=document.getElementById('sfAvailCourse');
    const region=document.getElementById('sfAvailRegion');
    const radiusInput=document.getElementById('sfAvailRadius');
    const message=document.getElementById('sfAvailMessage');
    const button=document.getElementById('sfSaveAvailability');
    if(!s?.user?.id||!date){message.textContent='Kies een datum.';return}
    if(mode==='course'&&!course?.value){message.textContent='Kies een golfbaan.';return}
    button.disabled=true;button.textContent='Opslaan…';message.textContent='';
    try{
      const selectedCourse=course?.selectedOptions?.[0];
      const storedRegion=mode==='course'?(selectedCourse?.textContent?.split(' — ')[1]||regionText()):mode==='flexible'?(profile.region||profile.woonplaats||'flexibel'):regionText();
      await rest('golfer_availability',{method:'POST',prefer:'return=minimal',body:{user_id:s.user.id,region:storedRegion,radius_km:Number(radiusInput.value)||25,course_id:mode==='course'?course.value:null,location_mode:mode,available_date:date,start_time:document.getElementById('sfAvailStart')?.value||null,end_time:document.getElementById('sfAvailEnd')?.value||null,holes:document.getElementById('sfAvailHoles')?.value,min_handicap:document.getElementById('sfAvailMinHcp')?.value===''?null:Number(document.getElementById('sfAvailMinHcp').value),max_handicap:document.getElementById('sfAvailMaxHcp')?.value===''?null:Number(document.getElementById('sfAvailMaxHcp').value),playing_style:document.getElementById('sfAvailStyle')?.value||null,status:'active'}});
      message.textContent='Opgeslagen';
      const toast=document.getElementById('toast');if(toast){toast.textContent='Beschikbaarheid opgeslagen.';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2200)}
      if(typeof window.sfRefresh==='function')await window.sfRefresh();
    }catch(err){console.error('BOUNDS location availability save',err);message.textContent='Opslaan mislukt';const toast=document.getElementById('toast');if(toast){toast.textContent='Beschikbaarheid opslaan mislukt.';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2200)}}
    finally{button.disabled=false;button.textContent='Beschikbaar maken'}
  }

  async function init(){
    const panel=document.querySelector('.social-flight-panel');if(!panel)return false;
    if(!build())return false;
    try{await loadContext()}catch(err){console.warn('BOUNDS location context',err)}
    const block=panel.querySelector('.sf-location-block');
    const sync=block?._sync;if(sync)sync();
    const button=document.getElementById('sfSaveAvailability');
    if(button&&!button.dataset.locationUxSave){button.dataset.locationUxSave='1';button.addEventListener('click',save,true)}
    ready=true;return true;
  }

  const observer=new MutationObserver(()=>{if(!ready)init().catch(()=>{})});
  observer.observe(document.body,{childList:true,subtree:true});
  const start=()=>{let tries=0;const tick=async()=>{tries++;if(await init()||tries>30)return;setTimeout(tick,250)};tick()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();