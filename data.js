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

export async function loadRoundDetail(sb,userId,roundId){
  const {data,error}=await sb.from('rounds').select('id,client_round_id,owner_id,course_id,tee_id,holes_played,loop,played_at,status,course:courses(name,location),players:round_players!inner(id,user_id,handicap_index_at_round,course_handicap,final_score,stableford,is_owner)').eq('id',roundId).eq('owner_id',userId).eq('round_players.user_id',userId).maybeSingle();
  if(error) throw error;
  if(!data) return null;
  const player=data.players?.[0];
  if(!player) return null;
  const {data:hs,error:he}=await sb.from('hole_scores').select('id,course_hole_id,score,stableford,putts,penalty,fairway,gir,played_hole_number,course_hole:course_holes(hole_number,par,stroke_index,meters,loop)').eq('round_player_id',player.id).order('played_hole_number').order('course_hole_id');
  if(he) throw he;
  const notes={};
  if(hs?.length){
    const ids=hs.map(x=>x.id);
    const {data:ns,error:ne}=await sb.from('hole_score_notes').select('hole_score_id,note').in('hole_score_id',ids);
    if(ne) throw ne;
    (ns||[]).forEach(n=>{notes[n.hole_score_id]=n.note||''});
  }
  return {...data,player,holes:(hs||[]).map(h=>({
    hole:h.course_hole?.hole_number ?? h.played_hole_number,
    par:h.course_hole?.par ?? 0,
    si:h.course_hole?.stroke_index ?? 0,
    score:h.score||0, sf:h.stableford, putts:h.putts||'', penalty:h.penalty||'',
    fairway:h.fairway||'', gir:h.gir||'', note:notes[h.id]||''
  }))};
}

export async function loadCourseHistory(sb,userId){
  const {data,error}=await sb.from('rounds').select('id,course_id,played_at,holes_played,course:courses(name),players:round_players!inner(user_id,final_score,stableford)').eq('owner_id',userId).eq('round_players.user_id',userId).order('played_at',{ascending:false}).limit(100);
  if(error) throw error; return data||[];
}

export async function saveRound(sb,payload){
  const {data,error}=await sb.rpc('save_round_v1',payload);
  if(error) throw error; return data;
}
