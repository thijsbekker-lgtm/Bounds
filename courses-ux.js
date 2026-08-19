const COURSES_SUPABASE_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const COURSES_SUPABASE_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';

const coursesState={client:null,courses:[],history:[],query:'',mode:'all',detail:null,rendered:false};
const c$=s=>document.querySelector(s);
const cEsc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function client(){
  if(coursesState.client)return coursesState.client;
  if(!window.supabase?.createClient)return null;
  coursesState.client=window.supabase.createClient(COURSES_SUPABASE_URL,COURSES_SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return coursesState.client;
}
async function getUser(){const s=client();if(!s)return null;const {data}=await s.auth.getSession();return data?.session?.user||null}
async function loadState(){
  const s=client(),u=await getUser();
  if(!s||!u)return false;
  const [cr,hr]=await Promise.all([
    s.from('courses').select('id,name,location,country,latitude,longitude').order('name'),
    s.from('rounds').select('id,course_id,played_at,holes_played,course:courses(name,location),players:round_players!inner(user_id,final_score,stableford)').eq('owner_id',u.id).eq('round_players.user_id',u.id).order('played_at',{ascending:false}).limit(100)
  ]);
  if(cr.error)throw cr.error;if(hr.error)throw hr.error;
  coursesState.courses=cr.data||[];coursesState.history=hr.data||[];return true;
}
function haversine(a,b,c,d){const R=6371,rad=x=>x*Math.PI/180,da=rad(c-a),db=rad(d-b),q=Math.sin(da/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(db/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
function historyFor(id){return coursesState.history.filter(r=>r.course_id===id)}
function scoreStats(rs){const a=rs.flatMap(r=>r.players||[]).map(p=>Number(p.final_score)).filter(Number.isFinite);return {n:a.length,best:a.length?Math.min(...a):null,avg:a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1).replace('.',','):null}}
async function teeInfo(id){const s=client();const {data,error}=await s.from('course_tees').select('holes,course_variant,loop,tee_name,course_rating,slope_rating,par,physical_holes').eq('course_id',id).order('holes').order('tee_name');if(error)throw error;return data||[]}
function labelVariant(v){return ({main:'Main Course',par3:'Par 3',par34:'Par 3/4'})[v]||v||''}
function availableLayouts(ts){const nine=ts.some(t=>Number(t.holes)===9),eighteen=ts.some(t=>Number(t.holes)===18);return {nine,eighteen}}
function distanceLabel(km){return km<1?`${Math.round(km*1000)} m`:`${km.toFixed(1).replace('.',',')} km`}

async function startCourseRound(id,holes){
  const courseSelect=c$('#courseSelect'),holesSelect=c$('#holesSelect');
  if(!courseSelect||!holesSelect)return;
  c$('.tab[data-tab="play"]')?.click();
  courseSelect.value=id;courseSelect.dispatchEvent(new Event('change',{bubbles:true}));
  await new Promise(r=>setTimeout(r,250));
  if(holes){holesSelect.value=String(holes);holesSelect.dispatchEvent(new Event('change',{bubbles:true}));}
  window.scrollTo({top:0,behavior:'smooth'});
}

function bindList(){
  c$('#courseSearch')?.addEventListener('input',e=>{coursesState.query=e.target.value;renderCoursesUX()});
  c$('#courseAll')?.addEventListener('click',()=>{coursesState.mode='all';renderCoursesUX()});
  c$('#courseNearby')?.addEventListener('click',()=>{coursesState.mode='nearby';renderCoursesUX(true)});
  c$('#coursePlayed')?.addEventListener('click',()=>{coursesState.mode='played';renderCoursesUX()});
  c$('#courseBack')?.addEventListener('click',()=>{coursesState.detail=null;renderCoursesUX()});
  c$('#courseStart')?.addEventListener('click',()=>startCourseRound(c$('#courseStart')?.dataset.course,'9'));
  c$('#courseStart18')?.addEventListener('click',()=>startCourseRound(c$('#courseStart18')?.dataset.course,'18'));
  document.querySelectorAll('[data-course-open]').forEach(b=>b.addEventListener('click',()=>{coursesState.detail=b.dataset.courseOpen;renderCoursesUX()}));
}

async function renderDetail(id){
  const c=coursesState.courses.find(x=>x.id===id);if(!c)return;
  const rs=historyFor(id),st=scoreStats(rs),ts=await teeInfo(id),layouts=availableLayouts(ts);
  const variants=[...new Set(ts.map(t=>t.course_variant).filter(Boolean))];
  const hist=rs.slice(0,8).map(r=>{const p=r.players?.[0]||{};return `<button class="course-history-row" data-round-open="${cEsc(r.id)}"><div><b>${new Date(r.played_at).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})}</b><small>${r.holes_played} holes</small></div><strong>${p.final_score??'—'} slagen</strong><span>${p.final_score??'—'}</span></button>`}).join('');
  c$('#courseCatalog').innerHTML=`<div class="courses-detail-view">
    <button class="courses-back" id="courseBack">‹ Courses</button>
    <div class="courses-detail-hero"><div><div class="eyebrow">COURSE</div><h2>${cEsc(c.name)}</h2><p>${cEsc(c.location||'Nederland')}</p></div></div>
    <div class="layout-choice">${layouts.nine?`<button id="courseStart" data-course="${cEsc(id)}"><b>⚑ 9 holes</b><small>${ts.find(t=>Number(t.holes)===9)?.par?'Par '+ts.find(t=>Number(t.holes)===9).par:''}</small></button>`:''}${layouts.eighteen?`<button id="courseStart18" data-course="${cEsc(id)}"><b>⚑ 18 holes</b><small>${ts.find(t=>Number(t.holes)===18)?.par?'Par '+ts.find(t=>Number(t.holes)===18).par:''}</small></button>`:''}</div>
    <div class="courses-card"><div class="section-title">OVER DE BAAN</div><p class="courses-description">${cEsc(c.name)} · ${cEsc(c.location||'Nederland')}.</p><div class="course-meta-grid"><div><b>${layouts.nine?'9':''}${layouts.nine&&layouts.eighteen?' / ':''}${layouts.eighteen?'18':''}</b><span>holes</span></div><div><b>${variants.length?variants.map(labelVariant).join(' · '):'—'}</b><span>layouts</span></div><div><b>${st.n}</b><span>jouw rondes</span></div></div></div>
    <div class="courses-card"><div class="section-title">JOUW HISTORIE</div>${rs.length?hist:'<div class="muted">Nog geen rondes op deze baan.</div>'}${rs.length?`<div class="course-history-summary"><b>Gemiddeld ${st.avg}</b><span>${st.n} rondes</span><strong>Beste ${st.best}</strong></div>`:''}</div>
  </div>`;
  c$('#courseBack').onclick=()=>{coursesState.detail=null;renderCoursesUX()};
  c$('#courseStart')?.addEventListener('click',()=>startCourseRound(id,9));
  c$('#courseStart18')?.addEventListener('click',()=>startCourseRound(id,18));
  c$('#courseCatalog').querySelectorAll('[data-round-open]').forEach(b=>b.addEventListener('click',()=>{c$('.tab[data-tab="game"]')?.click()}));
}

async function renderCoursesUX(forceNearby=false){
  const root=c$('#courseCatalog');if(!root)return;
  if(coursesState.detail){await renderDetail(coursesState.detail);return}
  let list=[...coursesState.courses];
  const q=coursesState.query.trim().toLowerCase();
  if(q)list=list.filter(c=>`${c.name} ${c.location||''}`.toLowerCase().includes(q));
  if(coursesState.mode==='played')list=list.filter(c=>historyFor(c.id).length);
  if(coursesState.mode==='nearby'||forceNearby){
    try{const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:false,timeout:5000}));list=list.map(c=>({...c,_distance:Number.isFinite(Number(c.latitude))&&Number.isFinite(Number(c.longitude))?haversine(pos.coords.latitude,pos.coords.longitude,Number(c.latitude),Number(c.longitude)):Infinity})).filter(c=>Number.isFinite(c._distance)&&c._distance<=25).sort((a,b)=>a._distance-b._distance)}catch{list=[];root.innerHTML=`<div class="courses-empty"><b>Locatie nodig voor Nearby</b><span>Sta locatie toe in je browser om banen binnen 25 km te tonen.</span></div>`;return}
  }
  const cards=list.map(c=>{const rs=historyFor(c.id),st=scoreStats(rs);return `<button class="course-item course-button" data-course-open="${cEsc(c.id)}"><div class="course-main"><b>${cEsc(c.name)}</b><small>${cEsc(c.location||'Nederland')}</small>${c._distance!=null&&Number.isFinite(c._distance)?`<em>● ${distanceLabel(c._distance)}</em>`:''}</div><div class="course-performance"><b>${st.best??'—'}</b><small>${st.n?`${st.n} ${st.n===1?'ronde':'rondes'}`:'Nog niet gespeeld'}</small></div><div class="course-chevron">›</div></button>`}).join('');
  root.innerHTML=`<div class="courses-home"><div class="courses-search"><span>⌕</span><input id="courseSearch" placeholder="Zoek een golfbaan, plaats of club" value="${cEsc(coursesState.query)}"></div><div class="courses-actions"><button id="courseNearby">●<b>Nearby</b><small>Banen in de buurt</small></button><button id="coursePlayed">▥<b>Mijn banen</b><small>Gespeelde banen</small></button></div><div class="courses-filter-row"><button id="courseAll" class="${coursesState.mode==='all'?'active':''}">Alle banen</button><button id="coursePlayed" class="${coursesState.mode==='played'?'active':''}">Gespeeld</button></div><div class="courses-section-title"><span>${coursesState.mode==='nearby'?'NEARBY':coursesState.mode==='played'?'GESPEELDE BANEN':'BANEN'}</span><small>${list.length} resultaten</small></div>${cards||'<div class="courses-empty"><b>Geen banen gevonden</b><span>Probeer een andere zoekopdracht.</span></div>'}</div>`;
  // The duplicate id above is avoided by wiring the lower filter through delegation.
  bindList();
  root.querySelectorAll('[data-course-open]').forEach(b=>b.addEventListener('click',()=>{coursesState.detail=b.dataset.courseOpen;renderCoursesUX()}));
}

async function initCoursesUX(){
  const ready=await new Promise(resolve=>{let n=0;const t=setInterval(()=>{n++;if(window.supabase?.createClient&&c$('#courseCatalog')&&(!c$('#authView')||c$('#authView').classList.contains('hidden'))){clearInterval(t);resolve(true)}if(n>100){clearInterval(t);resolve(false)}},100)});
  if(!ready)return;
  try{await loadState();renderCoursesUX()}catch(e){console.error('Courses UX',e)}
  document.addEventListener('click',e=>{const tab=e.target.closest('.tab[data-tab="courses"]');if(tab)setTimeout(async()=>{try{await loadState();renderCoursesUX()}catch(err){console.error(err)}},80)},{capture:true});
}
initCoursesUX();
