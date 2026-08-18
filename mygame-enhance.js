import {createBoundsSupabase} from './supabase-rest.js?v=1.16.0';

const URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const sb=createBoundsSupabase(URL,KEY);
const $=s=>document.querySelector(s);
let lastSignature='';
let running=false;

const style=document.createElement('style');
style.textContent=`
#page-game .game-insight-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:14px}
#page-game .game-insight-head h3{margin:0;font-size:1.15rem}
#page-game .game-insight-head p{margin:4px 0 0}
#page-game .par-insights{display:grid;gap:0;border-top:1px solid rgba(15,23,42,.08)}
#page-game .par-row{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;padding:14px 0;border-bottom:1px solid rgba(15,23,42,.08)}
#page-game .par-row b{font-size:1.02rem}
#page-game .par-score{text-align:right;font-weight:700}
#page-game .par-score span{display:block;font-size:.78rem;font-weight:500;color:#667085;margin-top:2px}
#page-game .par-row.worst .par-score{font-weight:800}
#page-game .insight-callout{margin:16px 0 4px;padding:16px;border-radius:14px;background:#f4f5f7}
#page-game .insight-callout .kicker{font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#667085}
#page-game .insight-callout b{display:block;margin:4px 0;font-size:1.1rem}
#page-game .metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
#page-game .metric-card{padding:14px;border:1px solid rgba(15,23,42,.08);border-radius:14px}
#page-game .metric-card small{display:block;color:#667085;margin-bottom:5px}
#page-game .metric-card b{font-size:1.15rem}
#page-game .metric-card span{display:block;font-size:.78rem;color:#667085;margin-top:4px}
#page-game .recent-scores{display:grid;gap:8px;margin-top:12px}
#page-game .recent-score{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid rgba(15,23,42,.07)}
#page-game .recent-score:last-child{border-bottom:0}
#page-game .recent-score small{display:block;color:#667085;margin-top:2px}
#page-game .recent-score .score-right{text-align:right}
#page-game .recent-score .score-right b{font-size:1.05rem}
#page-game .data-note{margin-top:12px;font-size:.8rem;color:#667085}
@media(max-width:640px){#page-game .metric-grid{grid-template-columns:1fr 1fr}}
`;
document.head.appendChild(style);

function fmt(n,d=1){return Number.isFinite(Number(n))?Number(n).toFixed(d).replace('.',','):'—'}
function dateLabel(v){return new Date(v).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})}

async function load(){
  if(running)return;
  const page=$('#page-game');
  if(!page || !page.classList.contains('active'))return;
  running=true;
  try{
    const {data:{session}}=await sb.auth.getSession();
    const user=session?.user;
    if(!user)return;

    const {data:rounds,error:re}=await sb.from('rounds').select('id,played_at,holes_played,course:courses(name),players:round_players!inner(id,user_id,final_score,stableford)').eq('owner_id',user.id).eq('round_players.user_id',user.id).order('played_at',{ascending:false}).limit(100);
    if(re)throw re;
    const rows=rounds||[];
    const playerIds=rows.flatMap(r=>(r.players||[]).map(p=>p.id));
    let holes=[];
    if(playerIds.length){
      const {data:hs,error:he}=await sb.from('hole_scores').select('round_player_id,score,putts,penalty,fairway,gir,course_hole:course_holes(hole_number,par,stroke_index)').in('round_player_id',playerIds);
      if(he)throw he;
      holes=hs||[];
    }

    const signature=JSON.stringify({rounds:rows.map(r=>[r.id,r.played_at,r.players?.[0]?.final_score,r.players?.[0]?.stableford]),holes:holes.length});
    if(signature===lastSignature){running=false;return;}
    lastSignature=signature;

    const byPar={3:[],4:[],5:[]};
    holes.forEach(h=>{const par=Number(h.course_hole?.par),score=Number(h.score);if(byPar[par]&&Number.isFinite(score))byPar[par].push(score-par)});
    const summaries=Object.entries(byPar).map(([p,v])=>({par:Number(p),n:v.length,avg:v.length?v.reduce((a,b)=>a+b,0)/v.length:null}));
    const measured=summaries.filter(x=>x.avg!==null);
    const worst=measured.slice().sort((a,b)=>b.avg-a.avg)[0];

    const putts=holes.map(h=>Number(h.putts)).filter(Number.isFinite);
    const gir=holes.map(h=>h.gir).filter(v=>v==='yes'||v==='no');
    const fairways=holes.filter(h=>[4,5].includes(Number(h.course_hole?.par))).map(h=>h.fairway).filter(v=>v==='yes'||v==='no');
    const penalties=holes.map(h=>Number(h.penalty)).filter(Number.isFinite);
    const avgPutts=putts.length?putts.reduce((a,b)=>a+b,0)/putts.length:null;
    const girPct=gir.length?100*gir.filter(v=>v==='yes').length/gir.length:null;
    const fwPct=fairways.length?100*fairways.filter(v=>v==='yes').length/fairways.length:null;
    const penaltyTotal=penalties.reduce((a,b)=>a+b,0);

    const insights=$('#insights');
    if(!insights){running=false;return;}

    const parHtml=summaries.map(x=>`<div class="par-row ${worst&&x.par===worst.par?'worst':''}"><div><b>Par ${x.par}</b><div class="muted">${x.n?`${x.n} holes met scoredata`:'Nog geen scoredata'}</div></div><div class="par-score">${x.avg===null?'—':`${x.avg>=0?'+':''}${fmt(x.avg)} / hole`}<span>${x.avg===null?'':'t.o.v. par'}</span></div></div>`).join('');
    const callout=worst?`<div class="insight-callout"><div class="kicker">Grootste kans</div><b>Par ${worst.par}</b><span>Hier verlies je gemiddeld ${fmt(Math.abs(worst.avg))} slag per hole ten opzichte van par, gebaseerd op ${worst.n} holes.</span></div>`:`<div class="insight-callout"><div class="kicker">Nog te weinig data</div><b>Speel een paar rondes</b><span>Daarna kan BOUNDS betrouwbaar aangeven op welk par-type je de meeste slagen laat liggen.</span></div>`;
    const metric=(label,value,sub)=>`<div class="metric-card"><small>${label}</small><b>${value}</b><span>${sub}</span></div>`;
    const metrics=[
      avgPutts!==null?metric('Putts',fmt(avgPutts),'Gemiddeld per hole met putts ingevuld.'):null,
      girPct!==null?metric('GIR',`${Math.round(girPct)}%`,`${gir.length} holes ingevuld.`):null,
      fwPct!==null?metric('Fairway',`${Math.round(fwPct)}%`,`${fairways.length} par 4/5 holes ingevuld.`):null,
      metric('Penalty',String(penaltyTotal),penaltyTotal?'Geregistreerde penaltyslagen.':'Geen penaltyslagen geregistreerd.')
    ].filter(Boolean).join('');
    const latest=rows.slice(0,6);
    const recentHtml=latest.length?`<div class="section-title" style="margin-top:20px">Laatste scores</div><div class="recent-scores">${latest.map(r=>{const p=r.players?.[0]||{};return `<div class="recent-score"><div><b>${r.course?.name||'Baan'}</b><small>${dateLabel(r.played_at)} · ${r.holes_played} holes</small></div><div class="score-right"><b>${p.final_score??'—'}</b><small>${p.stableford??'—'} SF</small></div></div>`}).join('')}</div>`:'';

    insights.innerHTML=`<div class="game-insight-head"><div><h3>Waar verlies je slagen?</h3><p class="muted">Score ten opzichte van par, alleen op holes waarvan de score is opgeslagen.</p></div></div><div class="par-insights">${parHtml}</div>${callout}<div class="metric-grid">${metrics}</div>${recentHtml}<div class="data-note">De inzichten worden automatisch beter naarmate je meer hole-statistieken invult.</div>`;
  }catch(e){console.error('BOUNDS My Game enhance',e)}
  finally{running=false}
}

window.addEventListener('load',()=>{setTimeout(load,700);setInterval(load,4000)});
document.addEventListener('click',e=>{if(e.target.closest('.tab[data-tab="game"]'))setTimeout(load,300)});
