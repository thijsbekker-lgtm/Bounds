const SUPABASE_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SUPABASE_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const SOCIAL_SESSION_KEY='bounds_supabase_session';

let socialClient=null;
let socialUser=null;
let socialProfile=null;
let socialFriends=[];
let socialIncomingRequests=[];

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

async function socialPatchFriendship(id,status){
  const session=readSocialSession();
  if(!session?.access_token)throw new Error('Geen geldige sessie.');
  const response=await fetch(`${SUPABASE_URL}/rest/v1/friendships?id=eq.${encodeURIComponent(id)}`,{
    method:'PATCH',
    headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',Prefer:'return=minimal'},
    body:JSON.stringify({status})
  });
  if(!response.ok){const text=await response.text();throw new Error(text||`HTTP ${response.status}`);}
}

async function loadSocialData(){
  const client=await getSocialClient();
  const {data:{session}}=await client.auth.getSession();
  socialUser=session?.user||null;
  if(!socialUser){socialProfile=null;socialFriends=[];socialIncomingRequests=[];return;}

  const profileResult=await client.from('profiles').select('id,display_name,handicap_index,woonplaats,region,avatar_url').eq('id',socialUser.id).maybeSingle();
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
    if(!requestSection.querySelector('.social-request-list')){
      requestSection.insertAdjacentHTML('beforeend','<div class="social-request-list"></div>');
    }
  }
  if(!page.querySelector('.social-friends-content')){
    page.insertAdjacentHTML('beforeend','<section class="social-section social-friends-content hidden"><div class="social-section-head"><h3>Vrienden</h3></div><div class="social-friends-list"></div></section>');
  }
  if(!page.querySelector('.social-requests-content')){
    page.insertAdjacentHTML('beforeend','<section class="social-section social-requests-content hidden"><div class="social-section-head"><h3>Verzoeken</h3></div><div class="social-requests-list"></div></section>');
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
  const people=page.querySelector('.people-section');
  const requests=page.querySelector('.requests-section');
  const friends=page.querySelector('.social-friends-content');
  const requestView=page.querySelector('.social-requests-content');
  [actions,people,requests].forEach(el=>el?.classList.toggle('hidden',view!=='overview'));
  friends?.classList.toggle('hidden',view!=='friends');
  requestView?.classList.toggle('hidden',view!=='requests');
  if(view==='friends')renderSocialFriendsList();
  if(view==='requests')renderSocialRequestsList();
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
    const play=event.target.closest('.social-primary');
    if(play){goToMainTab('play');return;}
    const search=event.target.closest('.social-secondary');
    if(search){socialToast('Find a Golfer bouwen we als volgende stap.');return;}
    const viewAll=event.target.closest('.social-section-head button');
    if(viewAll){
      const section=viewAll.closest('.social-section');
      if(section?.classList.contains('people-section'))setSocialView('friends');
      if(section?.classList.contains('requests-section'))setSocialView('requests');
    }
  });

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
