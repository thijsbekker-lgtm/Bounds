import { createBoundsSupabase } from './supabase-rest.js?v=1.16.6';

const SUPABASE_URL = 'https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SUPABASE_KEY = atob('c2JfcHVibGlzaGFibGVfSEFvajM5dUpZcFZERGdKdXVKY3RPQV9LSEl1TDI3dg==');
const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const icon = name => window.boundsIcon ? window.boundsIcon(name, 18) : '';
const sb = createBoundsSupabase(SUPABASE_URL, SUPABASE_KEY);

function injectCourseDetailStyles() {
  if (document.getElementById('bounds-course-detail-v2-style')) return;
  const style = document.createElement('style');
  style.id = 'bounds-course-detail-v2-style';
  style.textContent = `
    #page-courses .course-about-v1 {
      padding: 20px 21px 21px;
      background: linear-gradient(180deg,#ffffff 0%,#fbfcfb 100%);
    }
    #page-courses .course-about-v1 .eyebrow,
    #page-courses .course-facilities-v1 .eyebrow,
    #page-courses .course-history-v1 .eyebrow {
      color:#73777d;
      font-size:10px;
      font-weight:700;
      letter-spacing:1.25px;
    }
    #page-courses .course-about-v1 p {
      max-width:680px;
      margin-top:10px;
      color:#3f444a;
      font-size:14px;
      line-height:1.7;
    }
    #page-courses .course-source-note {
      margin-top:11px;
      color:#9a9ea3;
      font-size:9px;
      line-height:1.4;
    }
    #page-courses .course-facilities-v1 { padding:20px; }
    #page-courses .course-facilities {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      margin-top:13px;
    }
    #page-courses .course-facility {
      display:flex;
      align-items:center;
      gap:11px;
      min-height:62px;
      padding:10px 11px;
      border:1px solid #eceeed;
      border-radius:13px;
      background:#fafbfa;
    }
    #page-courses .course-facility-icon {
      display:grid;
      place-items:center;
      width:34px;
      height:34px;
      flex:none;
      border-radius:10px;
      background:#eef7f0;
      color:#31814a;
    }
    #page-courses .course-facility-icon .bounds-icon { width:17px; height:17px; }
    #page-courses .course-facility b {
      display:block;
      color:#25282c;
      font-size:12px;
      line-height:1.2;
    }
    #page-courses .course-facility small {
      display:block;
      margin-top:4px;
      color:#858a90;
      font-size:10px;
      line-height:1.25;
    }
    #page-courses .course-history-v1 { padding:20px; }
    #page-courses .course-history-summary {
      margin-top:13px;
      padding:14px 0 2px;
      border-top:1px solid #ededee;
    }
    @media(max-width:600px){
      #page-courses .course-facilities { grid-template-columns:1fr; }
    }
  `;
  document.head.appendChild(style);
}

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
  injectCourseDetailStyles();
  const title = detail.querySelector('.course-detail-title h2');
  const holeToggle = detail.querySelector('.course-hole-toggle');
  if (!title || !holeToggle) return;
  const name = title.textContent.trim();
  const content = window.COURSE_SOURCE_DATA_V1?.[name];
  if (!content) return;

  const sourceNote = content.verifiedWith
    ? `Bron: ${content.source} · gecontroleerd met ${content.verifiedWith}`
    : `Bron: ${content.source}`;

  const block = document.createElement('div');
  block.className = 'course-content-v1';
  block.innerHTML = `
    <section class="course-detail-card course-about-v1">
      <div class="eyebrow">OVER DE BAAN</div>
      <p>${esc(content.description)}</p>
      <div class="course-source-note">${esc(sourceNote)}</div>
    </section>
    <section class="course-detail-card course-facilities-v1">
      <div class="eyebrow">FACILITEITEN</div>
      <div class="course-facilities">${content.facilities.map(([iconName,label,meta]) => `<div class="course-facility"><span class="course-facility-icon">${icon(iconName)}</span><span><b>${esc(label)}</b><small>${esc(meta)}</small></span></div>`).join('')}</div>
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

window.enrichCourseDetailV1 = enrich;

function watchCourseDetail() {
  const run = () => {
    const detail = document.querySelector('#page-courses .course-detail-v1');
    if (detail) enrich(detail);
  };

  run();
  const page = document.getElementById('page-courses');
  if (!page) {
    setTimeout(watchCourseDetail, 100);
    return;
  }

  const observer = new MutationObserver(() => run());
  observer.observe(page, {childList:true, subtree:true});
}

watchCourseDetail();
