export function courseHandicapFromRanges(ranges, handicap){
  const h=Number(handicap);
  if(!Number.isFinite(h)) return null;
  const row=ranges.find(r=>h>=Number(r.min_handicap) && h<=Number(r.max_handicap));
  return row ? Number(row.course_handicap) : null;
}

// Allocate playing strokes over the holes that are actually being played.
// This matters on 9-hole loops whose Stroke Index values can be 10–18.
export function strokesForSI(courseHandicap, strokeIndex, holeCount, playedStrokeIndices=null){
  const ch=Number(courseHandicap);
  if(!Number.isFinite(ch) || ch<=0) return 0;
  const indices=(playedStrokeIndices?.length ? playedStrokeIndices : Array.from({length:holeCount},(_,i)=>i+1))
    .map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  const n=indices.length || Number(holeCount);
  if(!n) return 0;
  const idx=indices.indexOf(Number(strokeIndex));
  if(idx<0) return 0;
  return Math.floor(ch/n) + (idx < (ch%n) ? 1 : 0);
}

export function stableford(par, score, strokes){
  if(!Number(score)) return null;
  return Math.max(0,2 + Number(par) + Number(strokes||0) - Number(score));
}

export function roundTotals(holes){
  const played=holes.filter(h=>Number(h.score)>0);
  return {
    score:played.reduce((a,h)=>a+Number(h.score),0),
    stableford:played.reduce((a,h)=>a+(h.sf??0),0)
  };
}

export function basicRoundAnalysis(holes){
  const played=holes.filter(h=>Number(h.score)>0);
  if(!played.length) return null;
  const totalPar=played.reduce((a,h)=>a+Number(h.par),0);
  const totalScore=played.reduce((a,h)=>a+Number(h.score),0);
  const byPar={3:[],4:[],5:[]};
  played.forEach(h=>{ if(byPar[h.par]) byPar[h.par].push(Number(h.score)-Number(h.par)); });
  const parBreakdown=Object.entries(byPar).map(([par,vals])=>({
    par:Number(par),
    count:vals.length,
    avg:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null
  }));
  return {
    holes:played.length,
    score:totalScore,
    par:totalPar,
    toPar:totalScore-totalPar,
    birdies:played.filter(h=>h.score<h.par).length,
    pars:played.filter(h=>h.score===h.par).length,
    bogeys:played.filter(h=>h.score===h.par+1).length,
    doubles:played.filter(h=>h.score>=h.par+2).length,
    parBreakdown
  };
}

export function insightFromStats(holes){
  const a=basicRoundAnalysis(holes);
  if(!a) return null;
  return [...a.parBreakdown].filter(x=>x.avg!==null).sort((x,y)=>y.avg-x.avg)[0]||null;
}
