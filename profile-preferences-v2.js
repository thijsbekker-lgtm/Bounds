// BOUNDS profile preferences v6 — resilient loading for profile, tee preferences and home course.
(function(){
  const $=s=>document.querySelector(s);
  const SUPABASE_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
  const SUPABASE_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
  const SESSION_KEY='bounds_supabase_session';
  let courses=[];
  let userCourses=[];
  let profileReady=false;
  let relationLoadError=null;

  function getSession(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}
    catch{return null;}
  }
  function userPreferenceKey(userId){return `bounds_profile_preferences_${userId}`;}
  function readTeePreferences(userId){
    try{return JSON.parse(localStorage.getItem(userPreferenceKey(userId))||'{}');}
    catch{return {};}
  }
  function writeTeePreferences(userId,value){localStorage.setItem(userPreferenceKey(userId),JSON.stringify(value));}

  async function request(path,options={}){
    const s=getSession();
    const headers={apikey:SUPABASE_KEY,'Content-Type':'application/json',...(options.headers||{})};
    if(s?.access_token) headers.Authorization=`Bearer ${s.access_token}`;
    const response=await fetch(`${SUPABASE_URL}/rest/v1${path}`,{...options,headers});
    const text=await response.text();
    let body=null;
    try{body=text?JSON.parse(text):null;}catch{body=text;}
    if(!response.ok) throw new Error(body?.message||body?.hint||body?.details||body?.error||text||`HTTP ${response.status}`);
    return body;
  }

  async function loadContext(){
    const s=getSession();
    if(!s?.access_token||!s?.user?.id)return null;
    window.boundsUser=s.user;

    // Profile is the critical dependency. Keep it independent from optional
    // home-course relations so one RLS/schema problem cannot blank My Game.
    const profileData=await request(`/profiles?select=id,display_name,handicap_index,target_handicap,region,woonplaats,avatar_url,home_course_id,favorite_course_id&id=eq.${encodeURIComponent(s.user.id)}&limit=1`);
    window.boundsProfile=profileData?.[0]||window.boundsProfile||{};

    // Course catalogue is required for the home-course selector.
    courses=await request('/courses?select=id,name,location&order=name')||[];

    // user_courses is supplementary. If its RLS/policy is unavailable, keep
    // the profile usable and fall back to profiles.home_course_id.
    try{
      userCourses=await request(`/user_courses?select=id,course_id,is_member,is_home_course,is_favorite&user_id=eq.${encodeURIComponent(s.user.id)}`)||[];
      relationLoadError=null;
    }catch(e){
      relationLoadError=e;
      console.warn('BOUNDS user_courses could not be loaded; using profile home_course_id fallback.',e);
      userCourses=[];
    }

    profileReady=true;
    return window.boundsProfile;
  }

  function render(){
    const host=$('#profilePreferences'); if(!host||!profileReady)return;
    const p=window.boundsProfile||{};
    const userId=window.boundsUser?.id||getSession()?.user?.id;
    const prefs=readTeePreferences(userId);
    const hcp=Number.isFinite(Number(p.handicap_index))?p.handicap_index:54;
    const gender=prefs.tee_gender_preference||'men';
    const tee=prefs.tee_name_preference||'';
    const relationHome=userCourses.find(r=>r.is_home_course);
    const homeCourseId=relationHome?.course_id||p.home_course_id||'';

    host.innerHTML=`<div class="profile-pref-card card"><div class="eyebrow">PROFIEL</div><h3>Jouw golfvoorkeuren</h3><div class="profile-pref-grid"><label>Handicap Index<input id="profileHcpInput" type="number" min="-10" max="54" step="0.1" value="${esc(hcp)}"></label><label>Tee voor<select id="profileTeeGender"><option value="men" ${gender==='men'?'selected':''}>Mannen</option><option value="women" ${gender==='women'?'selected':''}>Vrouwen</option></select></label><label>Teevoorkeur<select id="profileTeeName"><option value="">Geen voorkeur</option><option value="Wit" ${tee==='Wit'?'selected':''}>Wit</option><option value="Geel" ${tee==='Geel'?'selected':''}>Geel</option><option value="Blauw" ${tee==='Blauw'?'selected':''}>Blauw</option><option value="Rood" ${tee==='Rood'?'selected':''}>Rood</option><option value="Oranje" ${tee==='Oranje'?'selected':''}>Oranje</option></select></label><label>Home course<select id="profileHomeCourse"></select></label></div><div class="profile-pref-actions"><button class="primary" id="saveProfilePreferences" type="button">Opslaan</button><span id="profileMessage" class="muted"></span></div></div>`;

    const select=$('#profileHomeCourse');
    select.innerHTML='<option value="">Geen home course</option>'+courses.map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(homeCourseId)?'selected':''}>${esc(c.name)}${c.location?` — ${esc(c.location)}`:''}</option>`).join('');

    $('#saveProfilePreferences').onclick=async()=>{
      const b=$('#saveProfilePreferences');
      b.disabled=true;
      b.textContent='Opslaan…';
      try{
        const h=Number($('#profileHcpInput').value);
        if(!Number.isFinite(h)||h<-10||h>54)throw new Error('Voer een handicap index van -10 tot 54 in.');
        const currentUserId=window.boundsUser?.id||getSession()?.user?.id;
        if(!currentUserId)throw new Error('Gebruikerssessie ontbreekt.');

        const profileData=await request(`/profiles?id=eq.${encodeURIComponent(currentUserId)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({handicap_index:h,home_course_id:$('#profileHomeCourse').value||null})});
        if(!profileData?.[0])throw new Error('Profiel kon niet worden opgeslagen.');

        const homeId=$('#profileHomeCourse').value||null;
        const existingByCourse=new Map(userCourses.map(r=>[String(r.course_id),r]));

        // Keep the normalized user_courses relation in sync when available.
        for(const existing of userCourses){
          const shouldBeHome=homeId!==null && String(existing.course_id)===String(homeId);
          if(Boolean(existing.is_home_course)!==shouldBeHome){
            await request(`/user_courses?id=eq.${encodeURIComponent(existing.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({is_home_course:shouldBeHome})});
          }
        }

        if(homeId && !existingByCourse.has(String(homeId))){
          try{
            await request('/user_courses',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:currentUserId,course_id:homeId,is_member:false,is_home_course:true,is_favorite:false})});
          }catch(e){
            // The profile home_course_id is already saved; relation sync is
            // secondary and should not make the whole preference save fail.
            console.warn('BOUNDS user_courses relation could not be created.',e);
          }
        }

        try{
          userCourses=await request(`/user_courses?select=id,course_id,is_member,is_home_course,is_favorite&user_id=eq.${encodeURIComponent(currentUserId)}`)||userCourses;
        }catch(e){console.warn('BOUNDS user_courses refresh failed.',e);}
        window.boundsProfile={...window.boundsProfile,...profileData[0]};
        writeTeePreferences(currentUserId,{tee_gender_preference:$('#profileTeeGender').value,tee_name_preference:$('#profileTeeName').value||null});
        const roundHcp=$('#hcpInput'); if(roundHcp)roundHcp.value=h;
        $('#profileMessage').textContent='Opgeslagen';
        document.dispatchEvent(new CustomEvent('bounds:profile-updated',{detail:window.boundsProfile}));
      }catch(e){
        console.error(e);
        $('#profileMessage').textContent=e.message||'Opslaan mislukt';
      }finally{
        b.disabled=false;
        b.textContent='Opslaan';
      }
    };
  }

  function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}

  async function boot(){
    try{
      await loadContext();
      if(!profileReady)return;
      render();
      document.dispatchEvent(new CustomEvent('bounds:profile-loaded',{detail:window.boundsProfile}));
    }catch(e){
      console.error('BOUNDS profile preferences error',e);
      const host=$('#profilePreferences');
      if(host)host.innerHTML='<div class="card"><div class="muted">Profielgegevens konden niet worden geladen.</div></div>';
    }
  }

  window.renderBoundsProfilePreferences=render;
  document.addEventListener('DOMContentLoaded',boot);
  document.addEventListener('bounds:profile-loaded',()=>{if(profileReady)render();});
})();
