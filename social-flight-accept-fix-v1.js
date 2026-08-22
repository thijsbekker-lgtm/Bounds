/* BOUNDS — flight request acceptance fix
 *
 * The database RPC returns a composite row through PostgREST, which may be
 * represented as an array. This isolated layer also captures accept/reject
 * clicks before the generic Social navigation handlers can redirect to Play.
 */
const SFA_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SFA_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const SFA_SESSION='bounds_supabase_session';

function sfaSession(){try{return JSON.parse(localStorage.getItem(SFA_SESSION)||'null')}catch{return null}}
function sfaHeaders(json=false){const s=sfaSession();const h={apikey:SFA_KEY,Authorization:`Bearer ${s?.access_token||''}`};if(json)h['Content-Type']='application/json';return h}
async function sfaRest(path,{method='GET',body=null}={}){
  const r=await fetch(`${SFA_URL}/rest/v1/${path}`,{method,headers:sfaHeaders(Boolean(body)),body:body?JSON.stringify(body):undefined});
  const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{d=t}
  if(!r.ok){const e=new Error(d?.message||d?.details||d?.hint||d?.error||t||`HTTP ${r.status}`);e.code=d?.code;e.status=r.status;throw e}
  return d;
}
function sfaToast(message){const t=document.getElementById('toast');if(!t)return;t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}

async function sfaRespond(playerId,status,button){
  const s=sfaSession();
  if(!s?.user?.id)throw new Error('Niet ingelogd.');
  button.disabled=true;
  try{
    const resultRaw=await sfaRest('rpc/respond_to_golf_flight_request',{method:'POST',body:{p_player_id:playerId,p_status:status}});
    const result=Array.isArray(resultRaw)?resultRaw[0]:resultRaw;
    if(!result?.id||result.id!==playerId||result.status!==status){
      throw new Error('Verzoek kon niet worden verwerkt.');
    }
    sfaToast(status==='accepted'?'Verzoek geaccepteerd.':'Verzoek afgewezen.');
    if(typeof sfrRefresh==='function')await sfrRefresh();
    if(typeof spfRender==='function')await spfRender();
    window.dispatchEvent(new CustomEvent('bounds:social-flight-updated',{detail:{flightId:result.flight_id,status}}));
  }catch(error){
    console.error('BOUNDS flight request response',error);
    sfaToast(error.message||'Verzoek kon niet worden verwerkt.');
    button.disabled=false;
  }
}

function sfaBoot(){
  document.addEventListener('click',event=>{
    const accept=event.target.closest?.('[data-sfr-accept]');
    const reject=event.target.closest?.('[data-sfr-reject]');
    if(!accept&&!reject)return;
    event.preventDefault();
    event.stopPropagation();
    sfaRespond((accept||reject).dataset.sfrAccept||(accept||reject).dataset.sfrReject,accept?'accepted':'declined',accept||reject);
  },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sfaBoot);else sfaBoot();
