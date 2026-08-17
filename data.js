export async function loadCourses(sb){
  const {data,error}=await sb.from('courses').select('id,name,location,country,latitude,longitude').order('name');
  if(error) throw error; return data||[];
}

export async function loadTees(sb, courseId, holes, variant=null){
  let q=sb.from('course_tees').select('id,course_id,tee_name,gender,holes,loop,course_rating,slope_rating,par,course_variant,layout_key,played_holes,physical_holes,physical_par,rating_holes,rating_par,length_m,qualifying_holes,qualifying_par').eq('course_id',courseId).eq('holes',holes);
  if(variant) q=q.eq('course_variant',variant);
  const {data,error}=await q.order('tee_name').order('loop'); if(error) throw error; return data||[];
}

export async function loadCourseVariants(sb, courseId, holes=null){
  let q=sb.from('course_tees').select('course_variant,holes,loop,tee_name').eq('course_id',courseId);
  if(holes) q=q.eq('holes',holes);
  const {data,error}=await q; if(error) throw error;
  return [...new Set((data||[]).map(x=>x.course_variant).filter(Boolean))];
}

export async function loadRanges(sb, teeId){
  const {data,error}=await sb.from('course_handicap_ranges').select('min_handicap,max_handicap,course_handicap').eq('tee_id',teeId).order('min_handicap');
  if(error) throw error; return data||[];
}

export async function loadHoles(sb, teeId){
  const {data,error}=await sb.from('course_holes').select('id,hole_number,par,stroke_index,meters,loop').eq('tee_id',teeId).order('hole_number');
  if(error) throw error; return data||[];
}

export async function loadProfile(sb,userId){
  const {data,error}=await sb.from('profiles').select('id,display_name,handicap_index,target_handicap,region,woonplaats,avatar_url,home_course_id,favorite_course_id').eq('id',userId).maybeSingle();
  if(error) throw error; return data;
}

export async function loadHistory(sb,userId){
  const {data,error}=await sb.from('rounds').select('id,client_round_id,course_id,tee_id,holes_played,loop,played_at,status,course:courses(name,location),players:round_players!inner(user_id,final_score,stableford,handicap_index_at_round,course_handicap,is_owner)').eq('owner_id',userId).eq('round_players.user_id',userId).order('played_at',{ascending:false}).limit(100);
  if(error) throw error; return data||[];
}

export async function loadInsightStats(sb,userId){
  const {data:rounds,error:roundError}=await sb.from('rounds')
    .select('id,played_at,holes_played,course:courses(name),players:round_players!inner(id,user_id,final_score,stableford)')
    .eq('owner_id',userId)
    .eq('round_players.user_id',userId)
    .order('played_at',{ascending:false})
    .limit(100);
  if(roundError) throw roundError;
  const rows=rounds||[];
  const playerIds=rows.flatMap(r=>(r.players||[]).map(p=>p.id));
  if(!playerIds.length) return {rounds:rows,holes:[]};
  const {data:holes,error:holeError}=await sb.from('hole_scores')
    .select('round_player_id,score,stableford,putts,penalty,fairway,gir,course_hole:course_holes(hole_number,par,stroke_index)')
    .in('round_player_id',playerIds);
  if(holeError) throw holeError;
  const roundByPlayer=new Map();
  rows.forEach(r=>(r.players||[]).forEach(p=>roundByPlayer.set(p.id,r)));
  return {rounds:rows,holes:(holes||[]).map(h=>({...h,round:roundByPlayer.get(h.round_player_id)||null}))};
}

async function loadRoundTee(sb,teeId){
  const {data,error}=await sb.from('course_tees').select('id,course_id,tee_name,gender,holes,loop,course_rating,slope_rating,par,course_variant,layout_key,played_holes,physical_holes,physical_par,rating_holes,rating_par,length_m,qualifying_holes,qualifying_par').eq('id',teeId).maybeSingle();
  if(error) throw error;
  return data||null;
}

async function loadPlayableHolesForRound(sb,tee){
  let hs=await loadHoles(sb,tee.id);

  // Almkreek Par 3/4: 14 physical holes, but qualifying 9 is holes 6–14.
  if(Number(tee.physical_holes)===14 && tee.course_variant==='par34'){
    const qualifying=String(tee.qualifying_holes||'')
      .split(',')
      .map(x=>Number(x.trim()))
      .filter(Number.isFinite);
    if(qualifying.length===9 && hs.length){
      const wanted=new Set(qualifying);
      return hs.filter(h=>wanted.has(Number(h.hole_number)));
    }
  }

  if(hs.length) return hs;

  // 18-hole round on a physical 9-hole course: reconstruct the full played card
  // from the matching 9-hole tee, exactly like the live round setup does.
  if(Number(tee.holes)===18 && Number(tee.physical_holes)===9){
    const physicalTees=await loadTees(sb,tee.course_id,9,tee.course_variant);
    const source=physicalTees.find(t=>t.tee_name===tee.tee_name && t.gender===tee.gender)
      || physicalTees.find(t=>t.tee_name===tee.tee_name);
    if(source){
      const physical=await loadHoles(sb,source.id);
      if(physical.length===9){
        return [
          ...physical.map(h=>({...h,played_hole_number:h.hole_number})),
          ...physical.map(h=>({...h,id:`${h.id}-2`,hole_number:h.hole_number+9,played_hole_number:h.hole_number+9,stroke_index:Number(h.stroke_index)+1}))
        ];
      }
    }
  }
  return [];
}

export async function loadRoundDetail(sb,userId,roundId){
  const {data,error}=await sb.from('rounds').select('id,client_round_id,owner_id,course_id,tee_id,holes_played,loop,played_at,status,course:courses(name,location),players:round_players!inner(id,user_id,handicap_index_at_round,course_handicap,final_score,stableford,is_owner)').eq('id',roundId).eq('owner_id',userId).eq('round_players.user_id',userId).maybeSingle();
  if(error) throw error;
  if(!data) return null;
  const player=data.players?.[0];
  if(!player) return null;

  const tee=await loadRoundTee(sb,data.tee_id);
  if(!tee) throw new Error('Tee van deze ronde niet gevonden.');
  const courseHoles=await loadPlayableHolesForRound(sb,tee);

  const {data:hs,error:he}=await sb.from('hole_scores').select('id,course_hole_id,score,stableford,putts,penalty,fairway,gir,played_hole_number,course_hole:course_holes(hole_number,par,stroke_index,meters,loop)').eq('round_player_id',player.id).order('played_hole_number').order('course_hole_id');
  if(he) throw he;
  const notes={};
  if(hs?.length){
    const ids=hs.map(x=>x.id);
    const {data:ns,error:ne}=await sb.from('hole_score_notes').select('hole_score_id,note').in('hole_score_id',ids);
    if(ne) throw ne;
    (ns||[]).forEach(n=>{notes[n.hole_score_id]=n.note||''});
  }

  // IMPORTANT: render the complete course scorecard, then overlay whatever
  // was actually saved. A partially played/saved round must never collapse
  // to only the holes that currently have a row in hole_scores.
  const savedByPlayedHole=new Map((hs||[]).map(h=>[Number(h.played_hole_number ?? h.course_hole?.hole_number),h]));
  const holes=courseHoles.slice(0,Number(data.holes_played)).map(h=>{
    const playedHole=Number(h.played_hole_number ?? h.hole_number);
    const saved=savedByPlayedHole.get(playedHole);
    return {
      hole:playedHole,
      par:Number(h.par)||0,
      si:Number(h.stroke_index)||0,
      score:saved?.score ?? 0,
      sf:saved?.stableford ?? null,
      putts:saved?.putts ?? '',
      penalty:saved?.penalty ?? '',
      fairway:saved?.fairway ?? '',
      gir:saved?.gir ?? '',
      note:saved ? (notes[saved.id]||'') : ''
    };
  });

  return {...data,player,tee,holes};
}

export async function loadCourseHistory(sb,userId){
  const {data,error}=await sb.from('rounds').select('id,course_id,played_at,holes_played,course:courses(name),players:round_players!inner(user_id,final_score,stableford)').eq('owner_id',userId).eq('round_players.user_id',userId).order('played_at',{ascending:false}).limit(100);
  if(error) throw error; return data||[];
}

export async function saveRound(sb,payload){
  const {data,error}=await sb.rpc('save_round_v1',payload);
  if(error) throw error; return data;
}

export async function deleteRound(sb,roundId){
  const {data,error}=await sb.rpc('delete_round_v1',{p_round_id:roundId});
  if(error) throw error;
  return Boolean(data);
}
