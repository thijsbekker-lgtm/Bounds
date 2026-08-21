const SUPABASE_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SUPABASE_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const SOCIAL_SESSION_KEY='bounds_supabase_session';

let socialClient=null;
let socialUser=null;
let socialProfile=null;
let socialFriends=[];
let socialIncomingRequests=[];
let socialSearchResults=[];

const escSocial=value=>String(value??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const initialSocial=name=>String(name||'G').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'G';

function socialToast(message){
  const toast=document.getElementById('toast');
  if(!toast)return;
  toast.textContent=message;
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'),2200);
}

function readSocialSession(){
  try{return JSON.parse(localStorage.getItem(SOCIAL_SESSION_KEY)||'null')}catch{return null}
}

async function getSocialClient(){
  if(socialClient)return socialClient;
  const mod=await import('./supabase-rest.js?v=1.16.6');
  socialClient=mod.createBoundsSupabase(SUPABASE_URL,SUPABASE_KEY);
  return socialClient;
}

function socialAuthHeaders(json=false){
  const session=readSocialSession();
  const headers={apikey:SUPABASE_KEY,Authorization:`Bearer ${session?.access_token||''}`};
  if(json)headers['Content-Type']='application/json';
  return headers;
}

async function socialRest(path,{method='GET',body=null,prefer=null}={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{
    method,
    headers:{...socialAuthHeaders(Boolean(body)),...(prefer?{Prefer:prefer}:{})},
    body:body?JSON.stringify(body):undefined
  });
  const text=await response.text();
  let data=null;
  try{data=text?JSON.parse(text):null}catch{data=text;}
  if(!response.ok){
    const message=data?.message||data?.details||data?.hint||data?.error||text||`HTTP ${response.status}`;
    const error=new Error(message);error.status=response.status;error.code=data?.code;throw error;
  }
  return data;
}

async function socialPatchFriendship(id,status){
  await socialRest(`friendships?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{status},prefer:'return=minimal'});
}

async function loadSocialData(){
  const client=await getSocialClient();
  const {data:{session}}=await client.auth.getSession();
  socialUser=session?.user||null;
  if(!socialUser){socialProfile=null;socialFriends=[];socialIncomingRequests=[];return;}

  const profileResult=await client.from('profiles').select('id,display_name,handicap_index,woonplaats,region,avatar_url,is_discoverable').eq('id',socialUser.id).maybeSingle();
  if(profileResult.error)throw profileResult.error;
  socialProfile=profileResult.data||null;

  const [outgoing,incoming]=await Promise.all([
    client.from('friendships').select('id,requester_id,addressee_id,status,created_at').eq('requester_id',socialUser.id).eq('status','accepted'),
    client.from('friendships').select('id,requester_id,addressee_id,status,created_at').eq('addressee_id',socialUser.id).eq('status','accepted')
  ]);
  if(outgoing.error)throw outgoing.error;
  if(incoming.error)throw incoming.error;

  const accepted=[...(outgoing.data||[]),...(incoming.data||[])];
  const friendIds=[...new Set(accepted.map(r=>r.requester_id===socialUser.id?r.addressee_id:r.requester_id))];
  if(friendIds.length){
    const profiles=await client.from('profiles').select('id,display_name,handicap_index,woonplaats,region,avatar_url').in('id',friendIds);
    if(profiles.error)throw profiles.error;
    const byId=new Map((profiles.data||[]).map(p=>[p.id,p]));
    socialFriends=accepted.map(r=>byId.get(r.requester_id===socialUser.id?r.addressee_id:r.requester_id)).filter(Boolean);
  }else socialFriends=[];

  const pending=await client.from('friendships').select('id,requester_id,addressee_id,status,created_at').eq('addressee_id',socialUser.id).eq('status','pending');
  if(pending.error)throw pending.error;
  const requestIds=[...new Set((pending.data||[]).map(r=>r.requester_id))];
  if(requestIds.length){
    const profiles=await client.from('profiles').select('id,display_name,handicap_index,woonplaats,region,avatar_url').in('id',requestIds);
    if(profiles.error)throw profiles.error;
    const byId=new Map((profiles.data||[]).map(p=>[p.id,p]));
    socialIncomingRequests=(pending.data||[]).map(r=>({...r,profile:byId.get(r.requester_id)})).filter(r=>r.profile);
  }else socialIncomingRequests=[];
}

function friendMeta(profile){
  const parts=[];
  if(profile?.handicap_index!==null&&profile?.handicap_index!==undefined)parts.push(`HCP ${Number(profile.handicap_index).toFixed(1).replace('.',',')}`);
  if(profile?.woonplaats)parts.push(profile.woonplaats);else if(profile?.region)parts.push(profile.region);
  return parts.join(' · ')||'Golfprofiel';
}

function ensureSocialStructure(){
  const page=document.getElementById('page-social');
  if(!page)return;
  const sections=[...page.querySelectorAll('.social-section')];
  const peopleSection=sections[0];
  const requestSection=sections[1];
  if(peopleSection){
    peopleSection.classList.add('people-section');
    const title=peopleSection.querySelector('.social-section-head h3');
    if(title)title.textContent='Jouw vrienden';
    const grid=peopleSection.querySelector('.social-people');
    if(grid)grid.innerHTML='';
  }
  if(requestSection){
    requestSection.classList.add('requests-section');
    const title=requestSection.querySelector('.social-section-head h3');
    if(title)title.textContent='Verzoeken';
    const oldInvite=requestSection.querySelector('.social-invite');
    if(oldInvite)oldInvite.remove();
    if(!requestSection.querySelector('.social-request-list'))requestSection.insertAdjacentHTML('beforeend','<div class="social-request-list"></div>');
  }
  if(!page.querySelector('.social-friends-content'))page.insertAdjacentHTML('beforeend','<section class="social-section social-friends-content hidden"><div class="social-section-head"><h3>Vrienden</h3></div><div class="social-friends-list"></div></section>');
  if(!page.querySelector('.social-requests-content'))page.insertAdjacentHTML('beforeend','<section class="social-section social-requests-content hidden"><div class="social-section-head"><h3>Verzoeken</h3></div><div class="social-requests-list"></div></section>');
  if(!page.querySelector('.social-search-panel')){
    const actions=page.querySelector('.social-actions');
    actions?.insertAdjacentHTML('afterend','<section class="social-search-panel hidden" aria-label="Zoek een golfer"><div class="social-search-head"><div><h3>Vind een golfer</h3><p>Zoek golfers die ervoor hebben gekozen vindbaar te zijn op BOUNDS.</p></div><button class="social-search-close" type="button" aria-label="Sluiten">×</button></div><div class="social-search-form"><label><span>Naam of woonplaats</span><input id="socialSearchInput" type="search" autocomplete="off" placeholder="Bijv. Jeroen of Utrecht" maxlength="80"></label><button class="social-secondary" id="socialSearchButton" type="button">Zoeken</button></div><div id="socialSearchStatus" class="social-search-status"></div><div id="socialSearchResults" class="social-search-results"></div></section>');
  }
}

function renderSocialPeople(){
  const grid=document.querySelector('#page-social .social-people');
  if(!grid)return;
  const people=[socialProfile,...socialFriends].filter(Boolean).slice(0,8);
  if(!people.length){grid.innerHTML='<div class="social-empty">Nog geen golfers om te tonen.</div>';return;}
  grid.innerHTML=people.map(p=>`<div class="social-person" data-person-id="${escSocial(p.id)}"><span class="social-avatar">${escSocial(initialSocial(p.display_name))}</span><strong>${escSocial(p.id===socialUser?.id?'Jij':p.display_name||'Golfer')}</strong><small>${escSocial(p.id===socialUser?.id?'Jouw profiel':friendMeta(p))}</small></div>`).join('');
}

function renderSocialRequests(){
  const list=document.querySelector('#page-social .social-request-list');
  if(!list)return;
  if(!socialIncomingRequests.length){list.innerHTML='<div class="social-empty">Geen openstaande verzoeken.</div>';return;}
  list.innerHTML=socialIncomingRequests.map(r=>`<article class="social-invite"><div class="social-avatar">${escSocial(initialSocial(r.profile.display_name))}</div><div class="social-invite-copy"><strong>${escSocial(r.profile.display_name||'Golfer')} wil je toevoegen</strong><span>${escSocial(friendMeta(r.profile))}</span></div><button class="social-round-button" type="button" data-decline-request="${escSocial(r.id)}" aria-label="Weigeren">×</button><button class="social-round-button accept" type="button" data-accept-request="${escSocial(r.id)}" aria-label="Accepteren">✓</button></article>`).join('');
}

function renderSocialFriendsList(){
  const host=document.querySelector('#page-social .social-friends-list');
  if(!host)return;
  if(!socialFriends.length){host.innerHTML='<div class="social-empty">Je hebt nog geen vrienden op BOUNDS.</div>';return;}
  host.innerHTML=socialFriends.map(p=>`<article class="social-friend-row"><div class="social-avatar">${escSocial(initialSocial(p.display_name))}</div><div class="social-friend-copy"><strong>${escSocial(p.display_name||'Golfer')}</strong><small>${escSocial(friendMeta(p))}</small></div></article>`).join('');
}

function renderSocialRequestsList(){
  const host=document.querySelector('#page-social .social-requests-list');
  if(!host)return;
  if(!socialIncomingRequests.length){host.innerHTML='<div class="social-empty">Geen openstaande verzoeken.</div>';return;}
  host.innerHTML=socialIncomingRequests.map(r=>`<article class="social-invite"><div class="social-avatar">${escSocial(initialSocial(r.profile.display_name))}</div><div class="social-invite-copy"><strong>${escSocial(r.profile.display_name||'Golfer')}</strong><span>${escSocial(friendMeta(r.profile))}</span></div><button class="social-round-button" type="button" data-decline-request="${escSocial(r.id)}">×</button><button class="social-round-button accept" type="button" data-accept-request="${escSocial(r.id)}">✓</button></article>`).join('');
}

async function acceptSocialRequest(id){
  try{await socialPatchFriendship(id,'accepted');await refreshSocialOverview();socialToast('Vriend toegevoegd.');}
  catch(error){console.error(error);socialToast('Verzoek accepteren mislukt.');}
}

async function declineSocialRequest(id){
  try{await socialPatchFriendship(id,'declined');await refreshSocialOverview();socialToast('Verzoek geweigerd.');}
  catch(error){console.error(error);socialToast('Verzoek weigeren mislukt.');}
}

function setSocialView(view){
  const page=document.getElementById('page-social');
  if(!page)return;
  const buttons=[...page.querySelectorAll('.social-tab')];
  buttons.forEach(b=>b.classList.toggle('active',b.dataset.socialView===view));
  const actions=page.querySelector('.social-actions');
  const searchPanel=page.querySelector('.social-search-panel');
  const people=page.querySelector('.people-section');
  const requests=page.querySelector('.requests-section');
  const friends=page.querySelector('.social-friends-content');
  const requestView=page.querySelector('.social-requests-content');
  [actions,people,requests,searchPanel].forEach(el=>el?.classList.toggle('hidden',view!=='overview'));
  friends?.classList.toggle('hidden',view!=='friends');
  requestView?.classList.toggle('hidden',view!=='requests');
  if(view==='friends')renderSocialFriendsList();
  if(view==='requests')renderSocialRequestsList();
}

function searchStatusLabel(result){
  if(result.relationship==='accepted')return '<span class="social-status-pill">Vrienden</span>';
  if(result.relationship==='pending_outgoing')return '<span class="social-status-pill">Verzoek verzonden</span>';
  if(result.relationship==='pending_incoming')return '<span class="social-status-pill">Verzoek ontvangen</span>';
  if(result.relationship==='declined_outgoing')return '<span class="social-status-pill muted">Eerder afgewezen</span>';
  return '<button class="social-add-button" type="button" data-add-friend="'+escSocial(result.id)+'">＋ Vriend toevoegen</button>';
}

function renderSocialSearchResults(){
  const host=document.getElementById('socialSearchResults');
  if(!host)return;
  if(!socialSearchResults.length){host.innerHTML='<div class="social-empty">Geen vindbare golfers gevonden.</div>';return;}
  host.innerHTML=socialSearchResults.map(p=>`<article class="social-search-result"><div class="social-avatar">${escSocial(initialSocial(p.display_name))}</div><div class="social-search-copy"><strong>${escSocial(p.display_name||'Golfer')}</strong><span>${escSocial(friendMeta(p))}</span></div><div class="social-search-action">${searchStatusLabel(p)}</div></article>`).join('');
}

async function getRelationship(targetId){
  const me=socialUser?.id;
  if(!me||!targetId)return null;
  const filter=`or=(and(requester_id.eq.${encodeURIComponent(me)},addressee_id.eq.${encodeURIComponent(targetId)}),and(requester_id.eq.${encodeURIComponent(targetId)},addressee_id.eq.${encodeURIComponent(me)}))`;
  const rows=await socialRest(`friendships?${filter}&select=id,requester_id,addressee_id,status,created_at&limit=1`);
  return Array.isArray(rows)&&rows[0]?rows[0]:null;
}

async function enrichSearchRelationships(profiles){
  return Promise.all(profiles.map(async p=>{
    try{
      const relation=await getRelationship(p.id);
      let relationship=null;
      if(relation?.status==='accepted')relationship='accepted';
      else if(relation?.status==='pending')relationship=relation.requester_id===socialUser.id?'pending_outgoing':'pending_incoming';
      else if(relation?.status==='declined'&&relation.requester_id===socialUser.id)relationship='declined_outgoing';
      return {...p,relationship};
    }catch(error){
      console.error('BOUNDS friendship relation error',error);
      return {...p,relationship:null};
    }
  }));
}

async function searchSocialGolfers(){
  const input=document.getElementById('socialSearchInput');
  const status=document.getElementById('socialSearchStatus');
  const host=document.getElementById('socialSearchResults');
  const term=String(input?.value||'').trim();
  if(!status||!host)return;
  if(term.length<2){socialSearchResults=[];host.innerHTML='';status.textContent='Vul minimaal 2 tekens in.';return;}
  if(!socialUser){status.textContent='Log eerst in.';return;}
  status.textContent='Zoeken…';host.innerHTML='';
  try{
    const encoded=encodeURIComponent(`*${term.replace(/[*(),]/g,' ')}*`);
    const or=`or=(display_name.ilike.${encoded},woonplaats.ilike.${encoded},region.ilike.${encoded})`;
    const path=`profiles?select=id,display_name,handicap_index,woonplaats,region,avatar_url,is_discoverable&id=neq.${encodeURIComponent(socialUser.id)}&is_discoverable=eq.true&${or}&order=display_name.asc&limit=20`;
    const profiles=await socialRest(path);
    socialSearchResults=await enrichSearchRelationships(Array.isArray(profiles)?profiles:[]);
    status.textContent=socialSearchResults.length?`${socialSearchResults.length} golfer${socialSearchResults.length===1?'':'s'} gevonden.`:'Geen resultaten.';
    renderSocialSearchResults();
  }catch(error){
    console.error('BOUNDS Social search error',error);
    status.textContent='Zoeken lukt nu niet. Probeer opnieuw.';
  }
}

async function sendFriendRequest(targetId){
  if(!socialUser||!targetId||targetId===socialUser.id)return;
  try{
    const relation=await getRelationship(targetId);
    if(relation?.status==='accepted'){socialToast('Jullie zijn al vrienden.');return;}
    if(relation?.status==='pending'){
      socialToast(relation.requester_id===socialUser.id?'Verzoek is al verzonden.':'Deze golfer heeft jou al uitgenodigd.');
      return;
    }
    if(relation?.status==='declined'&&relation.requester_id===socialUser.id){
      await socialPatchFriendship(relation.id,'pending');
    }else if(relation?.status==='declined'){
      socialToast('Dit vriendschapsverzoek is eerder afgewezen.');
      return;
    }else{
      await socialRest('friendships',{method:'POST',body:{requester_id:socialUser.id,addressee_id:targetId,status:'pending'},prefer:'return=minimal'});
    }
    const target=socialSearchResults.find(p=>p.id===targetId);
    if(target)target.relationship='pending_outgoing';
    renderSocialSearchResults();
    socialToast('Vriendschapsverzoek verzonden.');
  }catch(error){
    console.error('BOUNDS friend request error',error);
    if(error.code==='23505')socialToast('Er bestaat al een verzoek voor deze golfer.');
    else socialToast('Vriendschapsverzoek versturen mislukt.');
  }
}

function openSocialSearch(){
  const panel=document.querySelector('.social-search-panel');
  if(!panel)return;
  panel.classList.remove('hidden');
  const input=document.getElementById('socialSearchInput');
  input?.focus();
}

function closeSocialSearch(){
  const panel=document.querySelector('.social-search-panel');
  panel?.classList.add('hidden');
  socialSearchResults=[];
}

function refreshSocialOverview(){
  ensureSocialStructure();
  return loadSocialData().then(()=>{
    renderSocialPeople();
    renderSocialRequests();
    renderSocialFriendsList();
    renderSocialRequestsList();
  }).catch(error=>{
    console.error('BOUNDS Social data error',error);
    const people=document.querySelector('#page-social .social-people');
    const requests=document.querySelector('#page-social .social-request-list');
    if(people)people.innerHTML='<div class="social-empty">Social data kon niet worden geladen.</div>';
    if(requests)requests.innerHTML='<div class="social-empty">Social data kon niet worden geladen.</div>';
  });
}

function goToMainTab(tab){document.querySelector(`.tabs .tab[data-tab="${tab}"]`)?.click();}

function initSocialV1(){
  const socialTab=document.querySelector('.tab[data-tab="social"]');
  const socialPage=document.getElementById('page-social');
  if(!socialTab||!socialPage)return;
  ensureSocialStructure();

  socialPage.querySelectorAll('.social-tab').forEach((button,index)=>{
    button.dataset.socialView=['overview','friends','requests'][index]||'overview';
    button.addEventListener('click',()=>setSocialView(button.dataset.socialView));
  });

  socialPage.addEventListener('click',event=>{
    const accept=event.target.closest('[data-accept-request]');
    if(accept){acceptSocialRequest(accept.dataset.acceptRequest);return;}
    const decline=event.target.closest('[data-decline-request]');
    if(decline){declineSocialRequest(decline.dataset.declineRequest);return;}
    const add=event.target.closest('[data-add-friend]');
    if(add){sendFriendRequest(add.dataset.addFriend);return;}
    const play=event.target.closest('.social-primary');
    if(play){goToMainTab('play');return;}
    const search=event.target.closest('.social-secondary');
    if(search){openSocialSearch();return;}
    const close=event.target.closest('.social-search-close');
    if(close){closeSocialSearch();return;}
    const viewAll=event.target.closest('.social-section-head button');
    if(viewAll){
      const section=viewAll.closest('.social-section');
      if(section?.classList.contains('people-section'))setSocialView('friends');
      if(section?.classList.contains('requests-section'))setSocialView('requests');
    }
  });

  socialPage.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&event.target.id==='socialSearchInput'){event.preventDefault();searchSocialGolfers();}
  });

  document.getElementById('socialSearchButton')?.addEventListener('click',searchSocialGolfers);

  document.querySelector('.tabs')?.addEventListener('click',event=>{
    const tab=event.target.closest('.tab');
    if(!tab)return;
    if(tab.dataset.tab==='social'){
      document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===socialTab));
      document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x===socialPage));
      setSocialView('overview');
      refreshSocialOverview();
    }
  });

  refreshSocialOverview();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initSocialV1);else initSocialV1();
