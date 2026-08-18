import {createBoundsSupabase} from './supabase-rest.js';
import * as data from './data.js';
import {strokesForSI,stableford,roundTotals} from './domain.js';

const SUPABASE_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SUPABASE_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const sb=createBoundsSupabase(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dateLabel=v=>new Date(v).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'});
let user=null,history=[],editing=null;

function styles(){
  if($('#myGameEnhancementStyles'))return;
  const s=document.createElement('style');s.id='myGameEnhancementStyles';s.textContent=`
    .history-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
    .history-summary>div{background:#f5f5f7;border-radius:14px;padding:11px;text-align:center}.history-summary b{display:block;font-size:18px}.history-summary span{display:block;color:#7b858a;font-size:10px;margin-top:3px}
    .history-list{display:grid;gap:7px}.history-row{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;padding:12px;border:1px solid #e7e7eb;border-radius:14px;background:#fff}.history-row b{display:block}.history-row small{display:block;color:#7b858a;margin-top:3px;font-size:10px}.history-score{text-align:right}.history-score b{font-size:18px}.history-action{border:0;border-radius:11px;background:#eef3f5;padding:9px 11px;font-weight:800;font-size:11px}.history-empty{padding:12px 0;color:#7b858a;font-size:13px}
    .round-editor{position:fixed;inset:0;background:#f5f5f7;z-index:100;overflow:auto;padding:16px}.round-editor-card{max-width:760px;margin:0 auto 30px;background:#fff;border-radius:24px;padding:18px}.editor-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.editor-head h2{margin:5px 0;font-size:27px;letter-spacing:-1px}.editor-close{border:0;background:#ececef;border-radius:50%;width:38px;height:38px;font-size:20px}.editor-hole{display:grid;grid-template-columns:58px 1fr 96px 72px;gap:8px;align-items:center;border-top:1px solid #e7e7eb;padding:11px 0}.editor-hole small{display:block;color:#7b858a;font-size:10px;margin-top:2px}.editor-score{display:flex;align-items:center;justify-content:center;gap:6px}.editor-score button,.editor-step button{border:0;background:#f0f0f2;border-radius:50%;width:34px;height:34px;font-size:18px}.editor-score b{min-width:20px;text-align:center}.editor-sf{text-align:center;font-weight:900}.editor-stats{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px;background:#f7f7f8;border-radius:13px}.editor-stats select{height:38px;font-size:13px}.editor-actions{display:grid;gap:8px;margin-top:14px}.editor-total{display:flex;justify-content:space-between;border-top:2px solid #111;padding:15px 2px;margin-top:8px;font-weight:900}
    @media(max-width:560px){.history-row{grid-template-columns:1fr auto}.history-row .history-action{grid-column:2;grid-row:1/3}.editor-hole{grid-template-columns:48px 1fr 76px 55px}.editor-stats{grid-template-columns:1fr 1fr}}
  `;document.head.appendChild(s);
}

async function init(){
  styles();
  for(let i=0;i<80;i++){
    try{const {data:{session}}=await sb.auth.getSession();if(session?.user){user=session.user;break}}catch(e){}
    await new Promise(r=>setTimeout(r,250));
  }
  if(!user)return;
  sb.auth.onAuthStateChange((_e,s)=>{user=s?.user||null;if(user)renderHistory();});
  renderHistory();
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>setTimeout(renderHistory,80)));
}

async function renderHistory(){
  if(!user)return;
  const el=$('#history');if(!el)return;
  try{
    history=await data.loadHistory(sb,user.id);
    const scores=history.map(r=>Number(r.players?.[0]?.final_score)).filter(Number.isFinite);
    const sf=history.map(r=>Number(r.players?.[0]?.stableford)).filter(Number.isFinite);
    const avg=a=>a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1).replace('.',','):'—';
    el.innerHTML=`<div class="history-summary"><div><b>${history.length}</b><span>Rondes</span></div><div><b>${scores.length?Math.min(...scores):'—'}</b><span>Beste score</span></div><div><b>${sf.length?Math.max(...sf):'—'}</b><span>Beste SF</span></div></div>`+
      (history.length?`<div class="history-list">${history.map(r=>`<div class="history-row"><div><b>${esc(r.course?.name||'Baan')}</b><small>${dateLabel(r.played_at)} · ${r.holes_played} holes · HCP ${r.players?.[0]?.handicap_index_at_round??'—'}</small></div><div class="history-score"><b>${r.players?.[0]?.final_score??'—'}</b><small>${r.players?.[0]?.stableford??'—'} SF</small></div><button class="history-action" data-edit-round="${r.id}">Bekijk / bewerk</button></div>`).join('')}</div>`:'<div class="history-empty">Nog geen opgeslagen rondes.</div>')+
      (history.length?`<div class="muted" style="margin-top:10px">Gemiddelde score: ${avg(scores)} · Gemiddelde Stableford: ${avg(sf)}</div>`:'');
    el.querySelectorAll('[data-edit-round]').forEach(b=>b.onclick=()=>openEditor(b.dataset.editRound));
  }catch(e){console.error('My Game history',e);el.innerHTML='<div class="history-empty">Historie kon niet worden geladen.</div>'}
}

function editorHtml(r){
  return `<div class="round-editor" id="roundEditor"><div class="round-editor-card"><div class="editor-head"><div><div class="eyebrow">RONDE BEWERKEN</div><h2>${esc(r.course?.name||'Baan')}</h2><div class="muted">${dateLabel(r.played_at)} · ${r.holes_played} holes · HCP ${r.player.handicap_index_at_round}</div></div><button class="editor-close" id="closeEditor">×</button></div><div id="editorRows" style="margin-top:14px"></div><div class="editor-total"><span>Totaal</span><span id="editorTotal">0 · 0 SF</span></div><div class="editor-actions"><button class="primary full" id="saveEditor">Wijzigingen opslaan</button><button class="secondary full" id="cancelEditor">Annuleren</button></div></div></div>`;
}

function renderEditorRows(){
  if(!editing)return;
  const rows=$('#editorRows');
  const n=editing.holes.length,indices=editing.holes.map(h=>h.si);
  rows.innerHTML=editing.holes.map((h,i)=>{const strokes=strokesForSI(editing.player.course_handicap,h.si,n,indices);const sf=h.score?stableford(h.par,h.score,strokes):null;h.sf=sf;return `<div class="editor-hole" data-i="${i}"><div><b>Hole ${h.hole}</b><small>Par ${h.par} · SI ${h.si}</small></div><div class="muted">${strokes?`+${strokes}`:'Geen slag'}</div><div class="editor-score"><button data-score="-">−</button><b>${h.score||'—'}</b><button data-score="+">+</button></div><div class="editor-sf">${sf??'—'} SF</div><div class="editor-stats"><label>Putts<div class="editor-step"><button data-stat="putts:-">−</button><b>${h.putts||'—'}</b><button data-stat="putts:+">+</button></div></label><label>Penalty<div class="editor-step"><button data-stat="penalty:-">−</button><b>${h.penalty||'—'}</b><button data-stat="penalty:+">+</button></div></label><label>Fairway<select data-field="fairway"><option value="" ${!h.fairway?'selected':''}>Niet ingevuld</option><option value="yes" ${h.fairway==='yes'?'selected':''}>✓ geraakt</option><option value="no" ${h.fairway==='no'?'selected':''}>✕ gemist</option></select></label><label>GIR<select data-field="gir"><option value="" ${!h.gir?'selected':''}>Niet ingevuld</option><option value="yes" ${h.gir==='yes'?'selected':''}>✓ GIR</option><option value="no" ${h.gir==='no'?'selected':''}>✕ geen GIR</option></select></label></div></div>`}).join('');
  const totals=roundTotals(editing.holes);$('#editorTotal').textContent=`${totals.score} · ${totals.stableford} SF`;
  rows.onclick=e=>{const row=e.target.closest('.editor-hole');if(!row)return;const h=editing.holes[Number(row.dataset.i)];if(e.target.dataset.score){const d=e.target.dataset.score==='+'?1:-1;h.score=h.score?Math.max(1,h.score+d):h.par;renderEditorRows()}if(e.target.dataset.stat){const [field,op]=e.target.dataset.stat.split(':');h[field]=String(Math.max(0,Number(h[field]||0)+(op==='+'?1:-1))||'');renderEditorRows()}};
  rows.onchange=e=>{const row=e.target.closest('.editor-hole');if(!row)return;const h=editing.holes[Number(row.dataset.i)];if(e.target.dataset.field)h[e.target.dataset.field]=e.target.value};
}

async function openEditor(roundId){
  try{
    const r=await data.loadRoundDetail(sb,user.id,roundId);if(!r){alert('Ronde niet gevonden.');return}
    editing=r;document.body.insertAdjacentHTML('beforeend',editorHtml(r));renderEditorRows();
    $('#closeEditor').onclick=closeEditor;$('#cancelEditor').onclick=closeEditor;$('#saveEditor').onclick=saveEditor;
  }catch(e){console.error(e);alert('Deze ronde kon niet worden geopend.');}
}
function closeEditor(){editing=null;$('#roundEditor')?.remove()}
async function saveEditor(){
  if(!editing)return;
  const totals=roundTotals(editing.holes);if(!totals.score){alert('Vul minimaal één score in.');return}
  const normalize=(v,min,max)=>{if(v===''||v==null)return null;const n=Number(v);return Number.isInteger(n)&&n>=min&&n<=max?n:null};
  const payload={p_client_round_id:`cloud-${editing.id}`,p_course_id:editing.course_id,p_tee_id:editing.tee_id,p_holes_played:Number(editing.holes_played),p_loop:editing.loop||'full',p_played_at:editing.played_at,p_handicap:Number(editing.player.handicap_index_at_round),p_course_handicap:Number(editing.player.course_handicap),p_final_score:totals.score,p_stableford:totals.stableford,p_holes:editing.holes.map(h=>({hole:Number(h.hole),played_hole_number:Number(h.hole),score:normalize(h.score,1,20),sf:normalize(h.sf,0,50),putts:normalize(h.putts,0,20),penalty:normalize(h.penalty,0,20),fairway:h.fairway==='yes'?'yes':h.fairway==='no'?'no':null,gir:h.gir==='yes'?'yes':h.gir==='no'?'no':null,note:h.note||null}))};
  const b=$('#saveEditor');b.disabled=true;b.textContent='Opslaan…';
  try{await data.saveRound(sb,payload);closeEditor();await renderHistory();document.querySelector('[data-tab="home"]')?.click();setTimeout(()=>document.querySelector('[data-tab="game"]')?.click(),100);}
  catch(e){console.error(e);alert('Opslaan mislukt: '+(e.message||'onbekende fout'));b.disabled=false;b.textContent='Wijzigingen opslaan'}
}

init();
