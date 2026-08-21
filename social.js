import {createBoundsSupabase} from './supabase-rest.js?v=1.16.6';

const SUPABASE_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SUPABASE_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const sb=createBoundsSupabase(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));

async function loadDiscoverableGolfers(){
  const host=$('#socialResults');
  if(!host)return;
  host.innerHTML='<div class="muted">Beschikbare golfers laden…</div>';
  try{
    const {data:{session},error:sessionError}=await sb.auth.getSession();
    if(sessionError)throw sessionError;
    if(!session?.user){host.innerHTML='<div class="muted">Log in om golfers te ontdekken.</div>';return;}

    const {data,error}=await sb.from('profiles')
      .select('id,display_name,handicap_index,region,avatar_url,home_course_id,favorite_course_id')
      .eq('is_discoverable',true)
      .order('display_name')
      .limit(50);
    if(error)throw error;

    const golfers=(data||[]).filter(g=>g.id!==session.user.id);
    if(!golfers.length){
      host.innerHTML='<div class="social-empty"><b>Nog geen golfers gevonden</b><span>Er zijn momenteel geen andere vindbare golfers.</span></div>';
      return;
    }

    host.innerHTML=golfers.map(g=>`<article class="social-golfer card"><div class="social-avatar">${esc((g.display_name||'G').charAt(0).toUpperCase())}</div><div class="social-golfer-main"><b>${esc(g.display_name||'Golfer')}</b><span>HCP ${Number.isFinite(Number(g.handicap_index))?String(g.handicap_index).replace('.',','):'—'}${g.region?` · ${esc(g.region)}`:''}</span></div><button class="secondary social-invite" type="button" disabled>Uitnodigen</button></article>`).join('');
  }catch(error){
    console.error('BOUNDS Social load error',error);
    host.innerHTML='<div class="message">Golfers konden niet worden geladen.</div>';
  }
}

function initSocial(){
  const tab=$('[data-tab="social"]');
  if(!tab)return;
  tab.addEventListener('click',loadDiscoverableGolfers);
  const refresh=$('#socialRefresh');
  if(refresh)refresh.addEventListener('click',loadDiscoverableGolfers);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initSocial);else initSocial();
