import { createBoundsSupabase } from './supabase-rest.js?v=1.16.6';

const SUPABASE_URL = 'https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const FAVORITES_KEY = 'bounds_courses_favorites_v1';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const fmt = value => Number.isFinite(Number(value)) ? String(Number(value)).replace('.', ',') : '—';
const dateLabel = value => new Date(value).toLocaleDateString('nl-NL', {day:'numeric', month:'short', year:'numeric'});

let sb = null;
let user = null;
let courses = [];
let history = [];
let currentMode = 'nearby';
let selectedCourseId = null;
let locationState = 'idle';
let userLocation = null;

function favorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveFavorites(set) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]));
}

function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const lat1 = Number(a.latitude) * Math.PI / 180;
  const lat2 = Number(b.latitude) * Math.PI / 180;
  const dLat = (Number(b.latitude) - Number(a.latitude)) * Math.PI / 180;
  const dLon = (Number(b.longitude) - Number(a.longitude)) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function courseStats(courseId) {
  const rounds = history.filter(r => r.course_id === courseId);
  const scores = rounds.flatMap(r => r.players || []).map(p => Number(p.final_score)).filter(Number.isFinite);
  return {
    rounds,
    best: scores.length ? Math.min(...scores) : null,
    average: scores.length ? scores.reduce((a,b) => a + b, 0) / scores.length : null
  };
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
    .eq('owner_id', user.id)
    .eq('round_players.user_id', user.id)
    .order('played_at', {ascending:false})
    .limit(100);
  if (historyResult.error) throw historyResult.error;
  history = historyResult.data || [];
  return true;
}

function renderShell() {
  const page = $('#page-courses');
  if (!page) return;
  page.innerHTML = `
    <div class="courses-v1-head">
      <div>
        <div class="eyebrow">YOUR COURSES</div>
        <h2>Courses</h2>
        <p class="courses-subtitle">Vind jouw volgende baan</p>
      </div>
      <button class="courses-profile-button" type="button" aria-label="Profiel">◯</button>
    </div>
    <div class="courses-search-wrap">
      <span class="courses-search-icon">⌕</span>
      <input id="coursesSearch" type="search" placeholder="Zoek een golfbaan, plaats of club" autocomplete="off" />
    </div>
    <div class="courses-shortcuts">
      <button class="course-shortcut active" data-courses-mode="nearby" type="button"><span>●</span><div><b>Nearby</b><small>Ontdek banen in de buurt</small></div></button>
      <button class="course-shortcut" data-courses-mode="favorites" type="button"><span>♥</span><div><b>Mijn banen</b><small>Jouw favoriete golfbanen</small></div></button>
    </div>
    <div class="courses-section-head"><b id="coursesSectionTitle">IN DE BUURT</b><button id="coursesSectionAction" type="button">Bekijk alles</button></div>
    <div id="coursesList" class="courses-list"></div>
    <div class="courses-section-head courses-history-head"><b>MIJN BANEN</b><button id="coursesFavoritesAction" type="button">Bekijk alles</button></div>
    <div id="coursesMine" class="courses-mini-list"></div>
  `;

  $('#coursesSearch').addEventListener('input', renderLists);
  $$('[data-courses-mode]').forEach(button => button.addEventListener('click', () => {
    currentMode = button.dataset.coursesMode;
    $$('[data-courses-mode]').forEach(b => b.classList.toggle('active', b === button));
    renderLists();
  }));
  $('#coursesSectionAction').onclick = () => {
    currentMode = 'all';
    $$('[data-courses-mode]').forEach(b => b.classList.remove('active'));
    renderLists();
  };
  $('#coursesFavoritesAction').onclick = () => {
    currentMode = 'favorites';
    $$('[data-courses-mode]').forEach(b => b.classList.toggle('active', b.dataset.coursesMode === 'favorites'));
    renderLists();
  };
}

function courseImageClass(index) {
  return `course-thumb course-thumb-${(index % 4) + 1}`;
}

function renderCard(course, index) {
  const stats = courseStats(course.id);
  const distance = userLocation ? distanceKm(userLocation, course) : null;
  const fav = favorites().has(String(course.id));
  const distanceText = distance != null ? `${distance.toFixed(1).replace('.', ',')} km` : (course.location || 'Nederland');
  return `
    <div class="course-card" data-course-id="${esc(course.id)}">
      <button class="course-card-main" data-open-course="${esc(course.id)}" type="button">
        <div class="${courseImageClass(index)}"><span>⚑</span></div>
        <div class="course-card-copy">
          <b>${esc(course.name)}</b>
          <small>${esc(course.location || 'Nederland')}</small>
          <small class="course-meta">${stats.rounds.length ? `${stats.rounds.length} ${stats.rounds.length === 1 ? 'ronde' : 'rondes'}` : 'Nog niet gespeeld'} · ${distanceText}</small>
        </div>
        <span class="course-arrow">›</span>
      </button>
      <button class="course-heart ${fav ? 'is-favorite' : ''}" data-favorite-course="${esc(course.id)}" type="button" aria-label="${fav ? 'Verwijder uit mijn banen' : 'Voeg toe aan mijn banen'}">${fav ? '♥' : '♡'}</button>
    </div>`;
}

function renderMini(course) {
  const stats = courseStats(course.id);
  return `<button class="course-mini-item" data-open-course="${esc(course.id)}" type="button">
    <span class="course-mini-thumb">⚑</span>
    <span><b>${esc(course.name)}</b><small>${stats.rounds.length} ${stats.rounds.length === 1 ? 'ronde' : 'rondes'} · ${stats.best != null ? `beste ${stats.best}` : 'nog geen score'}</small></span>
    <span>›</span>
  </button>`;
}

function renderLists() {
  const list = $('#coursesList');
  const mine = $('#coursesMine');
  if (!list || !mine) return;
  const search = ($('#coursesSearch')?.value || '').trim().toLowerCase();
  const favs = favorites();
  let filtered = courses.filter(c => `${c.name} ${c.location || ''} ${c.country || ''}`.toLowerCase().includes(search));

  if (currentMode === 'favorites') filtered = filtered.filter(c => favs.has(String(c.id)));
  if (currentMode === 'nearby' && userLocation) {
    filtered = [...filtered].sort((a,b) => (distanceKm(userLocation,a) ?? Infinity) - (distanceKm(userLocation,b) ?? Infinity));
  }

  const title = currentMode === 'favorites' ? 'MIJN BANEN' : currentMode === 'all' ? 'ALLE BANEN' : 'IN DE BUURT';
  $('#coursesSectionTitle').textContent = title;
  $('#coursesSectionAction').textContent = currentMode === 'all' ? 'Bekijk dichtbij' : 'Bekijk alles';

  if (!filtered.length) {
    list.innerHTML = `<div class="courses-empty">${currentMode === 'favorites' ? 'Je hebt nog geen favoriete banen.' : 'Geen banen gevonden.'}</div>`;
  } else {
    list.innerHTML = filtered.slice(0, 12).map(renderCard).join('');
  }

  const mineCourses = courses.filter(c => courseStats(c.id).rounds.length || favs.has(String(c.id))).sort((a,b) => courseStats(b.id).rounds.length - courseStats(a.id).rounds.length).slice(0,4);
  mine.innerHTML = mineCourses.length ? mineCourses.map(renderMini).join('') : '<div class="courses-empty mini-empty">Speel een ronde of voeg een baan toe aan je favorieten.</div>';

  $$('[data-open-course]').forEach(button => button.onclick = () => openDetail(button.dataset.openCourse));
  $$('[data-favorite-course]').forEach(button => button.onclick = event => {
    event.stopPropagation();
    const set = favorites();
    const id = String(button.dataset.favoriteCourse);
    if (set.has(id)) set.delete(id); else set.add(id);
    saveFavorites(set);
    renderLists();
  });
}

async function requestLocation() {
  if (!navigator.geolocation) return;
  locationState = 'loading';
  navigator.geolocation.getCurrentPosition(
    position => {
      userLocation = {latitude: position.coords.latitude, longitude: position.coords.longitude};
      locationState = 'ready';
      renderLists();
    },
    () => {
      locationState = 'denied';
      renderLists();
    },
    {enableHighAccuracy:false, maximumAge:300000, timeout:8000}
  );
}

async function openDetail(id) {
  const course = courses.find(c => String(c.id) === String(id));
  if (!course) return;
  selectedCourseId = id;
  const stats = courseStats(id);
  let tees = [];
  try {
    const result = await sb.from('course_tees').select('id,tee_name,gender,holes,course_rating,slope_rating,par,course_variant').eq('course_id', id).order('holes').order('tee_name');
    if (!result.error) tees = result.data || [];
  } catch {}
  const has9 = tees.some(t => Number(t.holes) === 9);
  const has18 = tees.some(t => Number(t.holes) === 18);
  const variants = [...new Set(tees.map(t => t.course_variant).filter(Boolean))];

  const page = $('#page-courses');
  page.innerHTML = `
    <div class="course-detail-v1">
      <div class="course-detail-top"><button id="backCoursesV1" class="course-back" type="button">‹ Courses</button><div><button class="course-detail-icon" type="button" data-detail-favorite>${favorites().has(String(id)) ? '♥' : '♡'}</button><button class="course-detail-icon" type="button">↗</button></div></div>
      <div class="course-hero ${courseImageClass(0)}"><span>⚑</span></div>
      <div class="course-detail-title"><div class="eyebrow">COURSE</div><h2>${esc(course.name)}</h2><p>${esc(course.location || 'Nederland')}</p></div>
      <div class="course-hole-toggle"><div class="${has9 ? 'selected' : ''}"><b>${has9 ? '✓' : '—'}</b><span>9 holes</span></div><div class="${has18 ? 'selected' : ''}"><b>${has18 ? '✓' : '—'}</b><span>18 holes</span></div></div>
      <div class="course-detail-card"><div class="eyebrow">OVER DE BAAN</div><p>${variants.length ? `Beschikbare layouts: ${variants.map(v => esc(v)).join(' · ')}.` : 'Baaninformatie en teegegevens worden hier weergegeven zodra deze beschikbaar zijn.'}</p></div>
      <div class="course-detail-section"><div class="courses-section-head"><b>JOUW HISTORIE</b><button type="button" id="historyCount">Bekijk alles</button></div>${stats.rounds.length ? stats.rounds.slice(0,6).map(r => `<button class="course-history-row" data-detail-round="${esc(r.id)}" type="button"><span>▦</span><span><b>${dateLabel(r.played_at)}</b><small>${r.holes_played} holes</small></span><strong>${r.players?.[0]?.final_score ?? '—'}</strong><span class="score-pill">${r.players?.[0]?.final_score ?? '—'}</span><span>›</span></button>`).join('') : '<div class="courses-empty">Nog geen rondes op deze baan.</div>'}</div>
      <div class="course-summary"><span>Gemiddeld <b>${stats.average != null ? fmt(stats.average.toFixed(1)) : '—'}</b></span><span>·</span><span>Beste <b>${stats.best ?? '—'}</b></span></div>
      <button id="startCourseRound" class="primary full course-start-button" type="button">Start ronde op ${esc(course.name)}</button>
    </div>`;

  $('#backCoursesV1').onclick = () => { renderShell(); renderLists(); };
  $('[data-detail-favorite]').onclick = () => {
    const set = favorites();
    const key = String(id);
    if (set.has(key)) set.delete(key); else set.add(key);
    saveFavorites(set);
    $('[data-detail-favorite]').textContent = set.has(key) ? '♥' : '♡';
  };
  $('#startCourseRound').onclick = () => startRoundOnCourse(id, has18 ? 18 : 9);
  $$('.course-history-row').forEach(button => button.onclick = () => {
    const playTab = $('[data-tab="play"]');
    playTab?.click();
    setTimeout(() => {
      const courseSelect = $('#courseSelect');
      if (!courseSelect) return;
      courseSelect.value = String(course.id);
      courseSelect.dispatchEvent(new Event('change'));
    }, 50);
  });
}

function startRoundOnCourse(courseId, holes) {
  const playTab = $('[data-tab="play"]');
  playTab?.click();
  setTimeout(() => {
    const courseSelect = $('#courseSelect');
    const holesSelect = $('#holesSelect');
    if (!courseSelect) return;
    courseSelect.value = String(courseId);
    courseSelect.dispatchEvent(new Event('change'));
    if (holesSelect) {
      holesSelect.value = String(holes);
      holesSelect.dispatchEvent(new Event('change'));
    }
  }, 80);
}

async function init() {
  const appShell = $('#appShell');
  if (!appShell) return;
  try {
    const loaded = await loadData();
    if (!loaded) return;
    renderShell();
    renderLists();
    requestLocation();
  } catch (error) {
    console.error('BOUNDS Courses V1:', error);
  }
}

function bootWhenReady() {
  if ($('#appShell')?.classList.contains('hidden')) {
    setTimeout(bootWhenReady, 250);
    return;
  }
  init();
}

bootWhenReady();
