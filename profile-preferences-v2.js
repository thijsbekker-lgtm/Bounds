// BOUNDS profile preferences v3 — handicap, tee preferences and home course.
(function(){
  const $=s=>document.querySelector(s);
  const SUPABASE_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
  const SUPABASE_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
  const SESSION_KEY='bounds_supabase_session';
  let courses=[];
  let ready=false;

  function session(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}
    catch{return null;}
  }

  async function request(path,options={}){
    const s=session();
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
    const s=session();
    if(!s?.access_token||!s?.user?.id) return null;
    window.boundsUser=s.user;
    const [profileData,courseData]=await Promise.all([
      request(`/profiles?select=id,display_name,handicap_index,target_handicap,region,woonplaats,avatar_url,home_course_id,favorite_course_id&id=eq.${encodeURIComponent(s.user.id)}&limit=1`),
      request('/courses?select=id,name,location&order=name')
    ]);
    window.boundsProfile=profileData?.[0]||window.boundsProfile||null;
    courses=courseData||[];
    ready=true;
    return window.boundsProfile;
  }

  function render(){
    const host=$('#profilePreferences'); if(!host)return;
    const p=window.boundsProfile||{};
    const hcp=Number.isFinite(Number(p.handicap_index))?p.handicap_index:54;
    const gender=p.tee_gender_preference||'men';
    const tee=p.tee_name_preference||'';
    host.innerHTML=`<div class="profile-pref-card card"><div class="eyebrow">PROFIEL</div><h3>Jouw golfvoorkeuren</h3><div class="profile-pref-grid"><label>Handicap Index<input id="profileHcpInput" type="number" min="-10" max="54" step="0.1" value="${esc(hcp)}"></label><label>Tee voor<select id="profileTeeGender"><option value="men" ${gender==='men'?'selected':''}>Mannen</option><option value="women" ${gender==='women'?'selected':''}>Vrouwen</option></select></label><label>Teevoorkeur<select id="profileTeeName"><option value="">Geen voorkeur</option><option value="Wit" ${tee==='Wit'?'selected':''}>Wit</option><option value="Geel" ${tee==='Geel'?'selected':''}>Geel</option><option value="Blauw" ${tee==='Blauw'?'selected':''}>Blauw</option><option value="Rood" ${tee==='Rood'?'selected':''}>Rood</option><option value="Oranje" ${tee==='Oranje'?'selected':''}>Oranje</option></select></label><label>Home course<select id="profileHomeCourse"></select></label></div><div class="profile-pref-actions"><button class="primary" id="saveProfilePreferences" type="button">Opslaan</button><span id="profileMessage" class="muted"></span></div></div>`;
    const select=$('#profileHomeCourse');
    const current=String(p.home_course_id||'');
    select.innerHTML='<option value="">Geen home course</option>'+courses.map(c=>`<option value="${esc(c.id)}" ${String(c.id)===current?'selected':''}>${esc(c.name)}${c.location?` — ${esc(c.location)}`:''}</option>`).join('');

    $('#saveProfilePreferences').onclick=async()=>{
      const b=$('#saveProfilePreferences'); b.disabled=true; b.textContent='Opslaan…';
      try{
        const h=Number($('#profileHcpInput').value);
        if(!Number.isFinite(h)||h<-10||h>54)throw new Error('Voer een handicap index van -10 tot 54 in.');
        const payload={handicap_index:h,tee_gender_preference:$('#profileTeeGender').value,tee_name_preference:$('#profileTeeName').value||null,home_course_id:$('#profileHomeCourse').value||null};
        const userId=window.boundsUser?.id||session()?.user?.id;
        if(!userId) throw new Error('Gebruikerssessie ontbreekt.');
        const data=await request(`/profiles?id=eq.${encodeURIComponent(userId)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
        if(!data?.[0]) throw new Error('Profiel kon niet worden opgeslagen.');
        window.boundsProfile=data[0];
        const roundHcp=$('#hcpInput'); if(roundHcp)roundHcp.value=h;
        $('#profileMessage').textContent='Opgeslagen';
        document.dispatchEvent(new CustomEvent('bounds:profile-updated',{detail:data[0]}));
      }catch(e){console.error(e);$('#profileMessage').textContent=e.message||'Opslaan mislukt';}
      finally{b.disabled=false;b.textContent='Opslaan';}
    };
  }

  function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}

  async function boot(){
    try{
      await loadContext();
      if(!ready) return;
      render();
      document.dispatchEvent(new CustomEvent('bounds:profile-loaded',{detail:window.boundsProfile}));
    }catch(e){
      console.error('BOUNDS profile preferences error',e);
      const host=$('#profilePreferences');
      if(host) host.innerHTML='<div class="card"><div class="muted">Profielgegevens konden niet worden geladen.</div></div>';
    }
  }

  window.renderBoundsProfilePreferences=render;
  document.addEventListener('DOMContentLoaded',boot);
  document.addEventListener('bounds:profile-loaded',()=>{if(ready)render();});
})();
