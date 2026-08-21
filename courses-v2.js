import { createBoundsSupabase } from './supabase-rest.js?v=1.16.6';

const SUPABASE_URL = 'https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const FAVORITES_KEY = 'bounds_courses_favorites_v1';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const fmt = v => Number.isFinite(Number(v)) ? String(Number(v)).replace('.', ',') : '—';
const dateLabel = v => new Date(v).toLocaleDateString('nl-NL', {day:'numeric', month:'short', year:'numeric'});

let sb = null;
let user = null;
let courses = [];
let history = [];
let currentMode = 'nearby';
let userLocation = null;
let selectedCourseId = null;
let selectedHoles = 18;
let selectedTeeId = null;
let detailTees = [];

function favorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch { return new Set(); }
}
function saveFavorites(set) { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set])); }
function distanceKm(a, b) {
  if (!a || !b || !Number.isFinite(Number(a.latitude)) || !Number.isFinite(Number(b.latitude))) return null;
  const R = 6371, p1 = Number(a.latitude) * Math.PI / 180, p2 = Number(b.latitude) * Math.PI / 180;
  const dLat = (Number(b.latitude) - Number(a.latitude)) * Math.PI / 180;
  const dLon = (Number(b.longitude) - Number(a.longitude)) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function courseStats(courseId) {
  const rounds = history.filter(r => r.course_id === courseId);
  const scores = rounds.flatMap(r => r.players || []).map(p => Number(p.final_score)).filter(Number.isFinite);
  return { rounds, best: scores.length ? Math.min(...scores) : null, average: scores.length ? scores.reduce((a,b) => a+b, 0) / scores.length : null };
}

async function loadData() {
  if (!sb) sb = createBoundsSupabase(SUPABASE_URL, SUPABASE_KEY);
  const sessionResult = await sb.auth.getSession();
  user = sessionResult?.data?.session?.user || null;
  if (!user) return false;
  const courseResult = await sb.from('courses').select('id,name,location,country,latitude,longitude').order('name');
  if (courseResult.error) throw courseResult.error;
  courses = courseResult.data || [];
  const historyResult = await sb.from('rounds')
    .select('id,course_id,played_at,holes_played,course:courses(name,location),players:round_players!inner(user_id,final_score,stableford)')
    .eq('owner_id', user.id).eq('round_players.user_id', user.id)
    .order('played_at', {ascending:false}).limit(100);
  if (historyResult.error) throw historyResult.error;
  history = historyResult.data || [];
  return true;
}

function renderShell() {
  const page = $('#page-courses');
  if (!page) return;
  page.innerHTML = `
    <div class="courses-v1-head"><div><div class="eyebrow">YOUR COURSES</div><h2>Courses</h2><p class="courses-subtitle">Vind jouw volgende baan</p></div><button class="courses-profile-button" type="button" aria-label="Profiel">◯</button></div>
    <div class="courses-search-wrap"><span class="courses-search-icon">⌕</span><input id="coursesSearch" type="search" placeholder="Zoek een golfbaan, plaats of club" autocomplete="off" /></div>
    <div class="courses-shortcuts"><button class="course-shortcut active" data-courses-mode="nearby" type="button"><span>●</span><div><b>Nearby</b><small>Ontdek banen in de buurt</small></div></button><button class="course-shortcut" data-courses-mode="favorites" type="button"><span>♥</span><div><b>Mijn banen</b><small>Jouw favoriete golfbanen</small></div></button></div>
    <div class="courses-section-head"><b id="coursesSectionTitle">IN DE BUURT</b><button id="coursesSectionAction" type="button">Bekijk alles</button></div>
    <div id="coursesList" class="courses-list"></div>
    <div class="courses-section-head courses-history-head"><b>MIJN BANEN</b><button id="coursesFavoritesAction" type="button">Bekijk alles</button></div>
    <div id="coursesMine" class="courses-mini-list"></div>`;
  $('#coursesSearch').addEventListener('input', renderLists);
  $$('[data-courses-mode]').forEach(b => b.addEventListener('click', () => { currentMode=b.dataset.coursesMode; $$('[data-courses-mode]').forEach(x=>x.classList.toggle('active',x===b)); renderLists(); }));
  $('#coursesSectionAction').onclick = () => { currentMode = currentMode === 'all' ? 'nearby' : 'all'; renderLists(); };
  $('#coursesFavoritesAction').onclick = () => { currentMode='favorites'; $$('[data-courses-mode]').forEach(b=>b.classList.toggle('active',b.dataset.coursesMode==='favorites')); renderLists(); };
}
function courseImageClass(i) { return `course-thumb course-thumb-${(i % 4) + 1}`; }
function renderCard(course, index) {
  const stats=courseStats(course.id), d=userLocation ? distanceKm(userLocation,course) : null, fav=favorites().has(String(course.id));
  const meta=d!=null ? `${d.toFixed(1).replace('.',',')} km` : (course.location || 'Nederland');
  return `<div class="course-card"><button class="course-card-main" data-open-course="${esc(course.id)}" type="button"><div class="${courseImageClass(index)}"><span>⚑</span></div><div class="course-card-copy"><b>${esc(course.name)}</b><small>${esc(course.location || 'Nederland')}</small><small class="course-meta">${stats.rounds.length ? `${stats.rounds.length} ${stats.rounds.length===1?'ronde':'rondes'}` : 'Nog niet gespeeld'} · ${meta}</small></div><span class="course-arrow">›</span></button><button class="course-heart ${fav?'is-favorite':''}" data-favorite-course="${esc(course.id)}" type="button">${fav?'♥':'♡'}</button></div>`;
}
function renderMini(course) { const s=courseStats(course.id); return `<button class="course-mini-item" data-open-course="${esc(course.id)}" type="button"><span class="course-mini-thumb">⚑</span><span><b>${esc(course.name)}</b><small>${s.rounds.length} ${s.rounds.length===1?'ronde':'rondes'} · ${s.best!=null?`beste ${s.best}`:'nog geen score'}</small></span><span>›</span></button>`; }
function renderLists() {
  const list=$('#coursesList'), mine=$('#coursesMine'); if(!list||!mine)return;
  const q=($('#coursesSearch')?.value||'').trim().toLowerCase(), favs=favorites();
  let filtered=courses.filter(c=>`${c.name} ${c.location||''} ${c.country||''}`.toLowerCase().includes(q));
  if(currentMode==='favorites') filtered=filtered.filter(c=>favs.has(String(c.id)));
  if(currentMode==='nearby'&&userLocation) filtered=[...filtered].sort((a,b)=>(distanceKm(userLocation,a)??Infinity)-(distanceKm(userLocation,b)??Infinity));
  $('#coursesSectionTitle').textContent=currentMode==='favorites'?'MIJN BANEN':currentMode==='all'?'ALLE BANEN':'IN DE BUURT';
  $('#coursesSectionAction').textContent=currentMode==='all'?'Bekijk dichtbij':'Bekijk alles';
  list.innerHTML=filtered.length?filtered.slice(0,12).map(renderCard).join(''):`<div class="courses-empty">${currentMode==='favorites'?'Je hebt nog geen favoriete banen.':'Geen banen gevonden.'}</div>`;
  const mineCourses=courses.filter(c=>courseStats(c.id).rounds.length||favs.has(String(c.id))).sort((a,b)=>courseStats(b.id).rounds.length-courseStats(a.id).rounds.length).slice(0,4);
  mine.innerHTML=mineCourses.length?mineCourses.map(renderMini).join(''):'<div class="courses-empty mini-empty">Speel een ronde of voeg een baan toe aan je favorieten.</div>';
  $$('[data-open-course]').forEach(b=>b.onclick=()=>openDetail(b.dataset.openCourse));
  $$('[data-favorite-course]').forEach(b=>b.onclick=e=>{e.stopPropagation();const s=favorites(),id=String(b.dataset.favoriteCourse);s.has(id)?s.delete(id):s.add(id);saveFavorites(s);renderLists();});
}
function requestLocation(){ if(!navigator.geolocation)return; navigator.geolocation.getCurrentPosition(p=>{userLocation={latitude:p.coords.latitude,longitude:p.coords.longitude};renderLists();},()=>{}, {enableHighAccuracy:false,maximumAge:300000,timeout:8000}); }

function teeLabel(t) { return `${t.tee_name}${t.gender==='women'?' · dames':''}`; }
function verificationLabel(t) { return t.verification_status==='verified' ? 'Geverifieerd' : 'Nog te verifiëren'; }
function teeGroups() {
  const all=detailTees.filter(t=>Number(t.holes)===selectedHoles);
  const men=all.filter(t=>t.gender==='men'||!t.gender);
  return men.length ? men : all;
}
function selectTee(id){ selectedTeeId=id; renderDetailBody(); }

function renderDetailBody() {
  const page=$('#page-courses'), course=courses.find(c=>String(c.id)===String(selectedCourseId)); if(!page||!course)return;
  const stats=courseStats(course.id), options=teeGroups(), tee=options.find(t=>String(t.id)===String(selectedTeeId))||options[0]||null;
  if(tee && String(selectedTeeId)!==String(tee.id)) selectedTeeId=tee.id;
  const has9=detailTees.some(t=>Number(t.holes)===9), has18=detailTees.some(t=>Number(t.holes)===18);
  const verified=tee?.verification_status==='verified';
  page.innerHTML=`
    <div class="course-detail-v1">
      <div class="course-detail-top"><button id="backCoursesV2" class="course-back" type="button">‹ Courses</button><div><button class="course-detail-icon" id="detailFav" type="button">${favorites().has(String(course.id))?'♥':'♡'}</button><button class="course-detail-icon" type="button">↗</button></div></div>
      <div class="course-hero ${courseImageClass(0)}"><span>⚑</span></div>
      <div class="course-detail-title"><div class="eyebrow">COURSE</div><h2>${esc(course.name)}</h2><p>${esc(course.location||'Nederland')}</p></div>
      <div class="course-hole-toggle"><button data-hole-choice="9" type="button" ${!has9?'disabled':''} class="${selectedHoles===9?'selected':''}"><b>${has9?'✓':'—'}</b><span>9 holes</span></button><button data-hole-choice="18" type="button" ${!has18?'disabled':''} class="${selectedHoles===18?'selected':''}"><b>${has18?'✓':'—'}</b><span>18 holes</span></button></div>
      <div class="course-detail-card">
        <div class="eyebrow">TEE &amp; BAANGEGEVENS</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px">${options.length?options.map(t=>`<button type="button" data-tee-choice="${esc(t.id)}" style="padding:9px 12px;border-radius:999px;border:1px solid ${String(t.id)===String(tee?.id)?'#2c8d4d':'#e2e3e5'};background:${String(t.id)===String(tee?.id)?'#f5fbf6':'#fff'};color:#333;font-weight:600">${esc(teeLabel(t))}</button>`).join(''):'<span style="color:#777">Geen teegegevens beschikbaar.</span>'}</div>
        ${tee?`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px"><div><small>CR</small><br><b>${fmt(tee.course_rating)}</b></div><div><small>Slope</small><br><b>${tee.slope_rating??'—'}</b></div><div><small>Par</small><br><b>${tee.par??'—'}</b></div></div><p style="margin-bottom:5px">${Number(tee.length_m)?`${tee.length_m} m · `:''}${tee.course_variant?`Layout: ${esc(tee.course_variant)} · `:''}${verified?'Gegevens geverifieerd.':'Deze configuratie is nog niet volledig geverifieerd.'}</p>${!verified&&tee.source_url?`<a href="${esc(tee.source_url)}" target="_blank" rel="noopener" style="font-size:11px;color:#33834a">Bron bekijken</a>`:''}`:'<p>Selecteer een beschikbare tee.</p>'}
      </div>
      <div class="course-detail-section"><div class="courses-section-head"><b>JOUW HISTORIE</b><button type="button">${stats.rounds.length?'Bekijk alles':''}</button></div>${stats.rounds.length?stats.rounds.slice(0,6).map(r=>`<button class="course-history-row" data-detail-round="${esc(r.id)}" type="button"><span>▦</span><span><b>${dateLabel(r.played_at)}</b><small>${r.holes_played} holes</small></span><strong>${r.players?.[0]?.final_score??'—'}</strong><span class="score-pill">${r.players?.[0]?.final_score??'—'}</span><span>›</span></button>`).join(''):'<div class="courses-empty">Nog geen rondes op deze baan.</div>'}</div>
      <div class="course-summary"><span>Gemiddeld <b>${stats.average!=null?fmt(stats.average.toFixed(1)):'—'}</b></span><span>·</span><span>Beste <b>${stats.best??'—'}</b></span></div>
      <button id="startCourseRoundV2" class="primary full course-start-button" type="button" ${tee?'':'disabled'}>Start ronde op ${esc(course.name)} · ${selectedHoles} holes</button>
    </div>`;
  $('#backCoursesV2').onclick=()=>{renderShell();renderLists();};
  $('#detailFav').onclick=()=>{const s=favorites(),k=String(course.id);s.has(k)?s.delete(k):s.add(k);saveFavorites(s);$('#detailFav').textContent=s.has(k)?'♥':'♡';};
  $$('[data-hole-choice]').forEach(b=>b.onclick=()=>{if(b.disabled)return;selectedHoles=Number(b.dataset.holeChoice);const next=teeGroups()[0];selectedTeeId=next?.id||null;renderDetailBody();});
  $$('[data-tee-choice]').forEach(b=>b.onclick=()=>selectTee(b.dataset.teeChoice));
  $('#startCourseRoundV2').onclick=()=>startRoundOnCourse(course.id,selectedHoles,selectedTeeId);
  $$('.course-history-row').forEach(b=>b.onclick=()=>openRoundInPlay(course.id));
}

async function openDetail(id){
  const course=courses.find(c=>String(c.id)===String(id)); if(!course)return;
  selectedCourseId=id;
  try {
    const r=await sb.from('course_tees').select('id,course_id,tee_name,gender,holes,course_rating,slope_rating,par,course_variant,verification_status,source_url,length_m,physical_holes,layout_holes,layout_par').eq('course_id',id).order('holes').order('tee_name');
    detailTees=r.error?[]:(r.data||[]);
  } catch { detailTees=[]; }
  selectedHoles=detailTees.some(t=>Number(t.holes)===18)?18:9;
  selectedTeeId=teeGroups()[0]?.id||null;
  renderDetailBody();
}
function openRoundInPlay(courseId){
  $('[data-tab="play"]')?.click();
  setTimeout(()=>{const s=$('#courseSelect');if(!s)return;s.value=String(courseId);s.dispatchEvent(new Event('change'));},150);
}
function startRoundOnCourse(courseId,holes,teeId){
  $('[data-tab="play"]')?.click();
  setTimeout(async()=>{
    const courseSelect=$('#courseSelect'), holesSelect=$('#holesSelect'); if(!courseSelect)return;
    courseSelect.value=String(courseId); courseSelect.dispatchEvent(new Event('change'));
    if(holesSelect){holesSelect.value=String(holes);holesSelect.dispatchEvent(new Event('change'));}
    for(let i=0;i<12;i++){
      await new Promise(r=>setTimeout(r,100));
      const teeSelect=$('#teeSelect');
      if(teeSelect && teeId && [...teeSelect.options].some(o=>o.value===String(teeId))){teeSelect.value=String(teeId);teeSelect.dispatchEvent(new Event('change'));break;}
    }
  },100);
}

async function init(){
  if(!$('#appShell'))return;
  try{if(await loadData()){renderShell();renderLists();requestLocation();}}catch(e){console.error('BOUNDS Courses V2:',e);}
}
function bootWhenReady(){if($('#appShell')?.classList.contains('hidden')){setTimeout(bootWhenReady,250);return;}init();}
bootWhenReady();
