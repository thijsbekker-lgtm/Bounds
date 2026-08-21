const BOUNDS_SOCIAL_PRIVACY_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const BOUNDS_SOCIAL_PRIVACY_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const BOUNDS_SOCIAL_PRIVACY_SESSION='bounds_supabase_session';

(function(){
  let profile=null;
  let busy=false;

  function session(){try{return JSON.parse(localStorage.getItem(BOUNDS_SOCIAL_PRIVACY_SESSION)||'null')}catch{return null}}
  function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
  function headers(json=false){
    const s=session();
    const h={apikey:BOUNDS_SOCIAL_PRIVACY_KEY,Authorization:`Bearer ${s?.access_token||''}`};
    if(json)h['Content-Type']='application/json';
    return h;
  }
  async function rest(path,{method='GET',body=null,prefer=null}={}){
    const response=await fetch(`${BOUNDS_SOCIAL_PRIVACY_URL}/rest/v1/${path}`,{method,headers:{...headers(Boolean(body)),...(prefer?{Prefer:prefer}:{})},body:body?JSON.stringify(body):undefined});
    const text=await response.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
    if(!response.ok)throw new Error(data?.message||data?.details||data?.hint||data?.error||text||`HTTP ${response.status}`);
    return data;
  }
  async function loadProfile(){
    const s=session();if(!s?.access_token||!s?.user?.id){profile=null;return null}
    const rows=await rest(`profiles?select=id,is_discoverable&id=eq.${encodeURIComponent(s.user.id)}&limit=1`);
    profile=rows?.[0]||null;return profile;
  }
  function render(){
    const page=document.getElementById('page-social');if(!page)return;
    let panel=page.querySelector('.social-privacy-panel');
    if(!panel){
      panel=document.createElement('section');panel.className='social-privacy-panel';panel.setAttribute('aria-label','Privacy');
      panel.innerHTML='<div class="social-privacy-copy"><div class="eyebrow">PRIVACY</div><h3>Vindbaar voor andere golfers</h3><p>Laat andere BOUNDS-gebruikers je vinden op naam, woonplaats of regio. Je e-mailadres wordt nooit getoond.</p></div><label class="social-privacy-toggle"><input id="socialDiscoverable" type="checkbox"><span class="social-privacy-switch" aria-hidden="true"></span><span class="social-privacy-label">Ik ben vindbaar voor andere golfers</span></label><div class="social-privacy-actions"><button class="social-secondary" id="saveSocialPrivacy" type="button" onclick="event.stopPropagation()">Opslaan</button><span id="socialPrivacyMessage" class="social-privacy-message" role="status"></span></div>';
      const searchPanel=page.querySelector('.social-search-panel');
      if(searchPanel)searchPanel.insertAdjacentElement('afterend',panel);else page.querySelector('.social-actions')?.insertAdjacentElement('afterend',panel);
      panel.querySelector('#saveSocialPrivacy')?.addEventListener('click',save);
    }
    const input=panel.querySelector('#socialDiscoverable');
    if(input&&profile)input.checked=Boolean(profile.is_discoverable);
  }
  async function save(){
    if(busy)return;
    const s=session();const input=document.getElementById('socialDiscoverable');const button=document.getElementById('saveSocialPrivacy');const message=document.getElementById('socialPrivacyMessage');
    if(!s?.user?.id||!input||!button||!message){return}
    busy=true;button.disabled=true;button.textContent='Opslaan…';message.textContent='';
    try{
      await rest(`profiles?id=eq.${encodeURIComponent(s.user.id)}`,{method:'PATCH',body:{is_discoverable:input.checked},prefer:'return=minimal'});
      profile={...(profile||{}),is_discoverable:input.checked};
      message.textContent=input.checked?'Je bent vindbaar.':'Je bent niet vindbaar.';
    }catch(error){console.error('BOUNDS social privacy error',error);message.textContent=error.message||'Opslaan mislukt.'}
    finally{busy=false;button.disabled=false;button.textContent='Opslaan'}
  }
  async function init(){
    const page=document.getElementById('page-social');if(!page)return;
    render();
    try{await loadProfile();render()}catch(error){console.error('BOUNDS social privacy load error',error)}
    document.querySelector('.tabs')?.addEventListener('click',event=>{if(event.target.closest('.tab[data-tab="social"]')){setTimeout(()=>{render();loadProfile().then(render).catch(()=>{})},0)}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

const sfStyle=document.createElement('link');sfStyle.rel='stylesheet';sfStyle.href='social-flights-v1.css?v=1.0.0';document.head.appendChild(sfStyle);
import('./social-flights-v1.js?v=1.0.0').catch(error=>console.error('BOUNDS social flights load error',error));
