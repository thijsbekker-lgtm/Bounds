import { createBoundsSupabase } from './supabase-rest.js?v=1.16.6';

const SUPABASE_URL = 'https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SUPABASE_KEY = atob('c2JfcHVibGlzaGFibGVfSEFvajM5dUpZcFZERGdKdXVKY3RPQV9LSEl1TDI3dg==');
const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

const sb = createBoundsSupabase(SUPABASE_URL, SUPABASE_KEY);

const fallbackContent = {
  'De Kroonprins': {
    description: 'Een afwisselende golfbaan waar de hoofdbaan en de par-3 baan ieder hun eigen karakter hebben. Kies de layout die je speelt en bekijk daarna de bijbehorende tee-configuratie.',
    facilities: [['⛳','Golfbaan','Hoofdbaan + Par 3'],['🏌','Driving range','Oefenen voor je ronde'],['🛒','Trolley','Beschikbaar'],['🛍','Golfshop','Proshop']]
  },
  'Crimpenerhout': {
    description: 'Een waterrijke golfbaan met bunkers, ontworpen door Bruno Steensels. De baan vraagt om nauwkeurig spel en een goede keuze vanaf de tee.',
    facilities: [['⛳','Golfbaan','Hoofdbaan + Par 3'],['🌊','Water','Waterrijk karakter'],['🏖','Bunkers','Strategisch in de baan'],['🏌','Driving range','Oefenfaciliteit'],['🛒','Trolley / handicart','Beschikbaar'],['🛍','Golfshop','Proshop']]
  }
};

async function historyForCourse(name) {
  try {
    const c = await sb.from('courses').select('id').eq('name', name).limit(1);
    const id = c?.data?.[0]?.id;
    if (!id) return null;
    const r = await sb.from('rounds').select('id,played_at,holes_played,players:round_players!inner(final_score,user_id)').eq('course_id', id).order('played_at',{ascending:false}).limit(50);
    const rows = r?.data || [];
    const scores = rows.flatMap(x => x.players || []).map(p => Number(p.final_score)).filter(Number.isFinite);
    return {count: rows.length, best: scores.length ? Math.min(...scores) : null, average: scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null};
  } catch { return null; }
}

async function enrich(detail) {
  if (!detail || detail.querySelector('.course-content-v1')) return;
  const title = detail.querySelector('.course-detail-title h2');
  const holeToggle = detail.querySelector('.course-hole-toggle');
  if (!title || !holeToggle) return;
  const name = title.textContent.trim();
  const content = fallbackContent[name];
  if (!content) return;

  const block = document.createElement('div');
  block.className = 'course-content-v1';
  block.innerHTML = `
    <section class="course-detail-card course-about-v1">
      <div class="eyebrow">OVER DE BAAN</div>
      <p>${esc(content.description)}</p>
    </section>
    <section class="course-detail-card course-facilities-v1">
      <div class="eyebrow">FACILITEITEN</div>
      <div class="course-facilities">${content.facilities.map(([icon,label,meta]) => `<div class="course-facility"><span class="course-facility-icon">${icon}</span><span><b>${esc(label)}</b><small>${esc(meta)}</small></span></div>`).join('')}</div>
    </section>
    <section class="course-detail-card course-history-card course-history-v1">
      <div class="eyebrow">JOUW BANENHISTORIE</div>
      <div class="course-history-content"><div class="course-history-empty">Laden…</div></div>
    </section>`;

  detail.insertBefore(block, holeToggle);
  const history = await historyForCourse(name);
  const target = block.querySelector('.course-history-content');
  if (!target) return;
  if (!history || !history.count) {
    target.innerHTML = '<div class="course-history-empty">Je hebt hier nog geen rondes gespeeld.</div>';
    return;
  }
  target.innerHTML = `<div class="course-history-summary"><div><b>${history.count}</b><small>Rondes</small></div><div><b>${history.best ?? '—'}</b><small>Beste score</small></div><div><b>${history.average != null ? history.average.toFixed(1).replace('.', ',') : '—'}</b><small>Gemiddeld</small></div></div>`;
}

const observer = new MutationObserver(() => {
  const detail = document.querySelector('#page-courses .course-detail-v1');
  if (detail) enrich(detail);
});
observer.observe(document.body, {subtree:true, childList:true});
