import {createBoundsSupabase} from './supabase-rest.js?v=1.16.1';

const SUPABASE_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SUPABASE_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const sb=createBoundsSupabase(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s);
let lastUserId=null;
let lastSignature='';
let busy=false;

function fmt(n,d=1){return Number.isFinite(Number(n))?Number(n).toFixed(d).replace('.',','):'—'}
function dateLabel(v){return new Date(v).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})}
function filledNumber(v){if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}

function installStyles(){
  if($('#boundsInsightFixStyles'))return;
  const s=document.createElement('style');s.id='boundsInsightFixStyles';s.textContent=`
    #insights .insight-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    #insights .insight-card{padding:14px;border:1px solid rgba(15,23,42,.08);border-radius:14px}
    #insights .insight-card b{display:block;font-size:1.15rem;margin:4px 0}
    #insights .insight-card span{display:block;font-size:.78rem;color:#667085}
    #insights .insight-kicker{font-size:.72rem;font-weight:800;letter-spacing:.08em;color:#667085}
    #insights .insight-subsection{margin-top:18px;padding-top:14px;border-top:1px solid rgba(15,23,42,.08)}
    #insights .performance-row{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid rgba(15,23,42,.07)}
    #insights .performance-row span{font-weight:800}
    #insights .performance-row small{color:#667085}
    #insights .insight-lead{margin-bottom:12px}
    #insights .insight-lead b{display:block;margin-bottom:4px}
    #insights .insight-lead span{color:#667085}
    #insights .stat-coverage{margin-top:12px;font-size:.8rem;color:#667085}
    #insights .trend-row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(15,23,42,.07)}
    @media(max-width:640px){#insights .insight-grid{grid-template-columns:1fr 1fr}}
  `;document.head.appendChild(s);
}

async function load(){
  if(busy)return;
  const page=$('#page-game'), insights=$('#insights');
  if(!page||!page.classList.contains('active')||!insights)return;
  busy=true;
  try{
    const {data:{session}}=await sb.auth.getSession();
    const user=session?.user;
    if(!user){lastUserId=null;return}
    if(user.id!==lastUserId){lastUserId=user.id;lastSignature=''}

    const {data:stats,error}=await sb.from('rounds').select('id,played_at,holes_played,course:courses(name),players:round_players!inner(id,user_id,final_score,stableford)').eq('owner_id',user.id).eq('round_players.user_id',user.id).order('played_at',{ascending:false}).limit(100);
    if(error)throw error;
    const rounds=stats||[];
    const playerIds=rounds.flatMap(r=>(r.players||[]).map(p=>p.id));
    let holes=[];
    if(playerIds.length){
      const {data:hs,error:he}=await sb.from('hole_scores').select('round_player_id,score,putts,penalty,fairway,gir,course_hole:course_holes(hole_number,par,stroke_index)').in('round_player_id',playerIds);
      if(he)throw he;
      holes=(hs||[]).filter(h=>h.course_hole);
    }
    const signature=JSON.stringify({rounds:rounds.map(r=>[r.id,r.played_at,r.players?.[0]?.final_score,r.players?.[0]?.stableford]),holes:holes.map(h=>[h.round_player_id,h.score,h.putts,h.penalty,h.fairway,h.gir])});
    if(signature===lastSignature)return;
    lastSignature=signature;

    if(!holes.length){insights.innerHTML='<div class="muted">Vul tijdens je rondes enkele extra stats in. Daarna laat BOUNDS zien waar je structureel de meeste winst kunt pakken.</div>';return}

    const byPar={3:[],4:[],5:[]};
    holes.forEach(h=>{const par=Number(h.course_hole.par),score=filledNumber(h.score);if(byPar[par]&&score!==null)byPar[par].push(score-par)});
    const parSummary=Object.entries(byPar).filter(([,v])=>v.length).map(([p,v])=>({p:Number(p),avg:v.reduce((a,b)=>a+b,0)/v.length,n:v.length})).sort((a,b)=>b.avg-a.avg);
    const reliable=parSummary.filter(x=>x.n>=8);
    const worstPar=(reliable.length?reliable:parSummary)[0];
    const preliminary=Boolean(worstPar&&worstPar.n<8);

    const putts=holes.map(h=>filledNumber(h.putts)).filter(v=>v!==null);
    const gir=holes.map(h=>h.gir).filter(v=>v==='yes'||v==='no');
    const fw=holes.filter(h=>[4,5].includes(Number(h.course_hole.par))).map(h=>h.fairway).filter(v=>['yes','no','hit','miss'].includes(v));
    const penalties=holes.map(h=>filledNumber(h.penalty)).filter(v=>v!==null);
    const avgPutts=putts.length?putts.reduce((a,b)=>a+b,0)/putts.length:null;
    const girPct=gir.length?gir.filter(v=>v==='yes').length/gir.length:null;
    const fwPct=fw.length?fw.filter(v=>v==='yes'||v==='hit').length/fw.length:null;
    const totalPenalties=penalties.reduce((a,b)=>a+b,0);

    const cards=[];
    if(worstPar)cards.push(`<div class="insight-card"><div class="insight-kicker">${preliminary?'VOORLOPIGE KANS':'GROOTSTE KANS'}</div><b>Par ${worstPar.p}</b><span>Gemiddeld ${worstPar.avg>=0?'+':''}${fmt(worstPar.avg)} slag t.o.v. par over ${worstPar.n} gespeelde holes.${preliminary?' Nog te weinig data voor een harde conclusie.':''}</span></div>`);
    if(avgPutts!==null)cards.push(`<div class="insight-card"><div class="insight-kicker">PUTTING</div><b>${fmt(avgPutts)} putts</b><span>${putts.length} holes met putts ingevuld.</span></div>`);
    if(girPct!==null)cards.push(`<div class="insight-card"><div class="insight-kicker">GIR</div><b>${Math.round(girPct*100)}%</b><span>Gebaseerd op ${gir.length} holes met GIR ingevuld.</span></div>`);
    if(fwPct!==null)cards.push(`<div class="insight-card"><div class="insight-kicker">FAIRWAY</div><b>${Math.round(fwPct*100)}%</b><span>${fw.length} par 4/5 holes met fairway ingevuld.</span></div>`);
    if(totalPenalties)cards.push(`<div class="insight-card"><div class="insight-kicker">PENALTIES</div><b>${totalPenalties}</b><span>Geregistreerde penaltyslagen. Dit is directe score-impact.</span></div>`);

    const recent=rounds.slice(0,6).reverse().filter(r=>r.players?.[0]?.final_score!=null);
    const trend=recent.map(r=>`<div class="trend-row"><span>${dateLabel(r.played_at)}</span><b>${r.players[0].final_score}</b></div>`).join('');
    const coverage=`${holes.length} holes met scoredata · ${putts.length} met putts · ${gir.length} met GIR · ${fw.length} met fairway · ${penalties.length} met penalty`;
    insights.innerHTML=`<div class="insight-lead"><b>Waar zit je grootste winst?</b><span>BOUNDS kijkt eerst naar score boven par en gebruikt extra stats alleen wanneer je ze invult.</span></div><div class="insight-grid">${cards.join('')}</div><div class="insight-subsection"><div class="section-title">Score per par-type</div>${parSummary.map(x=>`<div class="performance-row"><b>Par ${x.p}</b><span>${x.avg>=0?'+':''}${fmt(x.avg)} / hole</span><small>${x.n} holes</small></div>`).join('')}</div>${recent.length?`<div class="insight-subsection"><div class="section-title">Laatste scores</div>${trend}</div>`:''}<div class="stat-coverage">${coverage}</div>`;
  }catch(e){console.error('BOUNDS insight fix',e)}finally{busy=false}
}

installStyles();
window.addEventListener('load',()=>{setTimeout(load,1200);setInterval(load,5000)});
document.addEventListener('click',e=>{if(e.target.closest('.tab[data-tab="game"]'))setTimeout(load,500)});
