// BOUNDS save/edit guard.
// The current app stores the round identity in the browser draft. Before a
// save reaches Supabase, restore that identity when an older/parallel code
// path has dropped p_client_round_id. This makes editing an existing round
// idempotent instead of silently creating a second round.
const BOUNDS_SUPABASE_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const BOUNDS_SUPABASE_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const BOUNDS_SESSION_KEY='bounds_supabase_session';
const BOUNDS_DRAFT_KEY='bounds_v1_draft';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const nativeFetch=window.fetch.bind(window);

function readJson(key){
  try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}
}

async function findExistingRound(clientRoundId){
  const session=readJson(BOUNDS_SESSION_KEY);
  if(!session?.access_token || !UUID.test(clientRoundId)) return null;
  const qs=new URLSearchParams({select:'id,played_at',client_round_id:`eq.${clientRoundId}`,limit:'1'});
  try{
    const res=await nativeFetch(`${BOUNDS_SUPABASE_URL}/rest/v1/rounds?${qs}`,{
      headers:{apikey:BOUNDS_SUPABASE_KEY,Authorization:`Bearer ${session.access_token}`}
    });
    if(!res.ok)return null;
    const rows=await res.json();
    return Array.isArray(rows)&&rows[0]?rows[0]:null;
  }catch{return null}
}

window.fetch=async(input,init={})=>{
  const url=typeof input==='string'?input:(input?.url||'');
  const isSave=/\/rest\/v1\/rpc\/save_round_v[12](?:\?|$)/.test(url);
  if(!isSave)return nativeFetch(input,init);

  let payload=null;
  try{payload=JSON.parse(init?.body||'{}')}catch{}
  if(!payload)return nativeFetch(input,init);

  const draft=readJson(BOUNDS_DRAFT_KEY);
  if(!UUID.test(String(payload.p_client_round_id||'')) && UUID.test(String(draft?.clientRoundId||''))){
    payload.p_client_round_id=draft.clientRoundId;
  }

  // Preserve the original played_at when this is an edit. Editing a historical
  // round must not move it to the time at which the user happened to edit it.
  if(UUID.test(String(payload.p_client_round_id||''))){
    const existing=await findExistingRound(payload.p_client_round_id);
    if(existing?.played_at) payload.p_played_at=existing.played_at;
  }

  const nextInit={...init,body:JSON.stringify(payload)};
  return nativeFetch(input,nextInit);
};
