import {createBoundsSupabase} from './supabase-rest.js?v=1.16.1';
import * as data from './data.js';

const SUPABASE_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SUPABASE_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const sb=createBoundsSupabase(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dateLabel=v=>new Date(v).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'});
let lastUserId=null;
let lastSignature='';
let busy=false;

function installStyles(){
  if($('#boundsHistoryStyles'))return;
  const s=document.createElement('style');s.id='boundsHistoryStyles';s.textContent=`
    #history .history-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
    #history .history-summary>div{background:#f5f5f7;border-radius:14px;padding:11px;text-align:center}
    #history .history-summary b{display:block;font-size:18px}
    #history .history-summary span{display:block;color:#7b858a;font-size:10px;margin-top:3px}
    #history .history-list{display:grid;gap:7px}
    #history .history-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:12px;border:1px solid #e7e7eb;border-radius:14px;background:#fff}
    #history .history-row b{display:block}
    #history .history-row small{display:block;color:#7b858a;margin-top:3px;font-size:10px}
    #history .history-score{text-align:right}
    #history .history-score b{font-size:18px}
    #history .history-action{margin-top:7px;border:0;border-radius:11px;background:#eef3f5;padding:8px 10px;font-weight:800;font-size:11px}
    #history .history-empty{padding:12px 0;color:#7b858a;font-size:13px}
    #history .history-footer{margin-top:10px;color:#7b858a;font-size:12px}
  `;document.head.appendChild(s);
}

async function renderHistory(){
  if(busy)return;
  const el=$('#history');
  if(!el)return;
  busy=true;
  try{
    const {data:{session}}=await sb.auth.getSession();
    const user=session?.user;
    if(!user){lastUserId=null;lastSignature='';el.innerHTML='';return}
    if(user.id!==lastUserId){lastUserId=user.id;lastSignature=''}

    const history=await data.loadHistory(sb,user.id);
    const signature=JSON.stringify(history.map(r=>[r.id,r.played_at,r.holes_played,r.players?.[0]?.final_score,r.players?.[0]?.stableford]));
    if(signature===lastSignature)return;
    lastSignature=signature;

    const scores=history.map(r=>Number(r.players?.[0]?.final_score)).filter(Number.isFinite);
    const sf=history.map(r=>Number(r.players?.[0]?.stableford)).filter(Number.isFinite);
    const avg=a=>a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1).replace('.',','):'—';

    el.innerHTML=`
      ${history.length?`<div class="history-summary">
        <div><b>${history.length}</b><span>Rondes</span></div>
        <div><b>${scores.length?Math.min(...scores):'—'}</b><span>Beste score</span></div>
        <div><b>${sf.length?Math.max(...sf):'—'}</b><span>Beste SF</span></div>
      </div>
      <div class="history-list">
        ${history.map(r=>`<div class="history-row">
          <div><b>${esc(r.course?.name||'Baan')}</b><small>${dateLabel(r.played_at)} · ${r.holes_played} holes · HCP ${r.players?.[0]?.handicap_index_at_round??'—'}</small></div>
          <div class="history-score"><b>${r.players?.[0]?.final_score??'—'}</b><small>${r.players?.[0]?.stableford??'—'} SF</small></div>
        </div>`).join('')}
      </div>
      <div class="history-footer">Gemiddelde score: ${avg(scores)} · Gemiddelde Stableford: ${avg(sf)}</div>`
      :'<div class="history-empty">Nog geen opgeslagen rondes.</div>'}`;
  }catch(e){
    console.error('BOUNDS history',e);
    el.innerHTML='<div class="history-empty">Historie kon niet worden geladen.</div>';
  }finally{busy=false}
}

installStyles();
window.addEventListener('load',()=>{setTimeout(renderHistory,900);setInterval(renderHistory,5000)});
document.addEventListener('click',e=>{
  if(e.target.closest('.tab[data-tab="game"]'))setTimeout(renderHistory,400);
});
