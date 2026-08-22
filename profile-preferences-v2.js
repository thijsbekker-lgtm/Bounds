// BOUNDS profile preferences v11 — handicap, tee selection/color, playing style and home course.
(function(){
  const $=s=>document.querySelector(s);
  const SUPABASE_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
  const SUPABASE_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
  const SESSION_KEY='bounds_supabase_session';
  let courses=[];let userCourses=[];let profileReady=false;let booted=false;
  function getSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
  function prefKey(id){return `bounds_profile_preferences_${id}`}
  function readLocal(id){try{return JSON.parse(localStorage.getItem(prefKey(id))||'{}')}catch{return {}}}
  function writeLocal(id,v){localStorage.setItem(prefKey(id),JSON.stringify(v))}
  function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
  async function request(path,options={}){
    const s=getSession();const headers={apikey:SUPABASE_KEY,'Content-Type':'application/json',...(options.headers||{})};if(s?.access_token)headers.Authorization=`Bearer ${s.access_token}`;
    const r=await fetch(`${SUPABASE_URL}/rest/v1${path}`,{...options,headers});const text=await r.text();let body=null;try{body=text?JSON.parse(text):null}catch{body=text}
    if(!r.ok)throw new Error(body?.message||body?.hint||body?.details||body?.error||text||`HTTP ${r.status}`);return body;
  }
  function renderLoading(){const host=$('#profilePreferences');if(host&&!host.innerHTML.trim())host.innerHTML='<div class="profile-pref-card card"><div class="eyebrow">PROFIEL</div><h3>Jouw golfvoorkeuren</h3><div class="muted">Profiel laden…</div></div>'}

  async function loadContext(){
    const s=getSession();
    if(!s?.access_token||!s?.user?.id)return false;
    window.boundsUser=s.user;

    // Core profile loading must never depend on optional Social/profile fields.
    // This keeps My Game usable if an older preview has a partial schema/RLS state.
    let rows=[];
    try{
      rows=await request(`/profiles?select=id,display_name,handicap_index,target_handicap,region,woonplaats,avatar_url,home_course_id,favorite_course_id,tee_gender_preference,tee_color_preference,playing_style&id=eq.${encodeURIComponent(s.user.id)}&limit=1`);
    }catch(firstError){
      console.warn('BOUNDS extended profile read failed; retrying core profile.',firstError);
      rows=await request(`/profiles?select=id,display_name,handicap_index,target_handicap,region,woonplaats,avatar_url,home_course_id,favorite_course_id&id=eq.${encodeURIComponent(s.user.id)}&limit=1`);
      rows=rows?.map(p=>({...p,...readLocal(s.user.id)}));
    }
    window.boundsProfile=rows?.[0]||window.boundsProfile||{};

    // Course data is supporting UI only; it must not prevent the profile card
    // from rendering when course/RLS data is temporarily unavailable.
    try{courses=await request('/courses?select=id,name,location&order=name')||[]}catch(e){console.warn('BOUNDS courses could not be loaded',e);courses=[]}
    try{userCourses=await request(`/user_courses?select=id,course_id,is_member,is_home_course,is_favorite&user_id=eq.${encodeURIComponent(s.user.id)}`)||[]}catch(e){console.warn('BOUNDS user_courses could not be loaded',e);userCourses=[]}

    profileReady=true;return true;
  }

  function render(){
    const host=$('#profilePreferences');if(!host||!profileReady)return;
    const p=window.boundsProfile||{};const id=window.boundsUser?.id||getSession()?.user?.id;const local=readLocal(id);
    const hcp=Number.isFinite(Number(p.handicap_index))?p.handicap_index:'';
    const gender=p.tee_gender_preference||local.tee_gender_preference||'men';
    const color=p.tee_color_preference||local.tee_color_preference||'';
    const style=p.playing_style||local.playing_style||'';
    const home=userCourses.find(r=>r.is_home_course)?.course_id||p.home_course_id||'';

    host.innerHTML=`<div class="profile-pref-card card"><div class="eyebrow">PROFIEL</div><h3>Jouw golfvoorkeuren</h3><div class="profile-pref-grid">
      <label>Handicap Index<input id="profileHcpInput" type="number" min="-10" max="54" step="0.1" value="${esc(hcp)}"></label>
      <label>Tee voor<select id="profileTeeGender"><option value="men" ${gender==='men'?'selected':''}>Heren</option><option value="women" ${gender==='women'?'selected':''}>Dames</option></select></label>
      <label>Tee kleur<select id="profileTeeColor"><option value="">Geen voorkeur</option><option value="Wit" ${color==='Wit'?'selected':''}>Wit</option><option value="Geel" ${color==='Geel'?'selected':''}>Geel</option><option value="Blauw" ${color==='Blauw'?'selected':''}>Blauw</option><option value="Rood" ${color==='Rood'?'selected':''}>Rood</option><option value="Oranje" ${color==='Oranje'?'selected':''}>Oranje</option></select></label>
      <label>Speelstijl<select id="profilePlayingStyle"><option value="">Geen voorkeur</option><option value="Relaxed" ${style==='Relaxed'?'selected':''}>Relaxed</option><option value="Relaxed competitief" ${style==='Relaxed competitief'?'selected':''}>Relaxed competitief</option><option value="Competitief" ${style==='Competitief'?'selected':''}>Competitief</option></select></label>
      <label>Home course<select id="profileHomeCourse"><option value="">Geen home course</option>${courses.map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(home)?'selected':''}>${esc(c.name)}${c.location?` — ${esc(c.location)}`:''}</option>`).join('')}</select></label>
    </div><div class="profile-pref-actions"><button class="primary" id="saveProfilePreferences" type="button">Opslaan</button><span id="profileMessage" class="muted"></span></div></div>`;

    $('#saveProfilePreferences').onclick=async()=>{
      const b=$('#saveProfilePreferences');b.disabled=true;b.textContent='Opslaan…';
      try{
        const h=Number($('#profileHcpInput').value);if(!Number.isFinite(h)||h<-10||h>54)throw new Error('Voer een handicap index van -10 tot 54 in.');
        const currentId=window.boundsUser?.id||getSession()?.user?.id;if(!currentId)throw new Error('Gebruikerssessie ontbreekt.');
        const homeId=$('#profileHomeCourse').value||null;
        const teeGender=$('#profileTeeGender').value;
        const teeColor=$('#profileTeeColor').value||null;
        const playingStyle=$('#profilePlayingStyle').value||null;

        const profileData=await request(`/profiles?id=eq.${encodeURIComponent(currentId)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({handicap_index:h,home_course_id:homeId,tee_gender_preference:teeGender,tee_color_preference:teeColor,playing_style:playingStyle})});
        if(!profileData?.[0])throw new Error('Profiel kon niet worden opgeslagen.');

        const existingByCourse=new Map(userCourses.map(r=>[String(r.course_id),r]));
        for(const existing of userCourses){
          const shouldBeHome=homeId!==null&&String(existing.course_id)===String(homeId);
          if(Boolean(existing.is_home_course)!==shouldBeHome){
            await request(`/user_courses?id=eq.${encodeURIComponent(existing.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({is_home_course:shouldBeHome})});
          }
        }
        if(homeId&&!existingByCourse.has(String(homeId))){
          try{await request('/user_courses',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({user_id:currentId,course_id:homeId,is_member:false,is_home_course:true,is_favorite:false})})}catch(e){console.warn('BOUNDS user_courses relation could not be created',e)}
        }
        try{userCourses=await request(`/user_courses?select=id,course_id,is_member,is_home_course,is_favorite&user_id=eq.${encodeURIComponent(currentId)}`)||userCourses}catch(e){console.warn('BOUNDS user_courses refresh failed',e)}

        window.boundsProfile={...window.boundsProfile,...profileData[0]};
        writeLocal(currentId,{tee_gender_preference:teeGender,tee_color_preference:teeColor,playing_style:playingStyle});
        const roundHcp=$('#hcpInput');if(roundHcp)roundHcp.value=h;
        $('#profileMessage').textContent='Opgeslagen';
        document.dispatchEvent(new CustomEvent('bounds:profile-updated',{detail:window.boundsProfile}));
      }catch(e){console.error(e);$('#profileMessage').textContent=e.message||'Opslaan mislukt'}finally{b.disabled=false;b.textContent='Opslaan'}
    };
  }

  async function boot(){
    if(booted&&profileReady)return;
    renderLoading();
    try{
      if(await loadContext()){
        booted=true;render();document.dispatchEvent(new CustomEvent('bounds:profile-loaded',{detail:window.boundsProfile}));return true;
      }
    }catch(e){console.warn('BOUNDS profile preferences retry',e)}
    return false;
  }

  window.renderBoundsProfilePreferences=render;
  const start=()=>{
    let tries=0;
    const tick=async()=>{tries++;if(await boot()||tries>=40)return;setTimeout(tick,300)};
    tick();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  document.addEventListener('bounds:profile-refresh',()=>{booted=false;start()});
})();