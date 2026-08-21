// BOUNDS profile preferences — isolated UI layer.
(function(){
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  function render(){
    const host=$('#profilePreferences'); if(!host)return;
    const p=window.boundsProfile||{};
    const hcp=Number.isFinite(Number(p.handicap_index))?p.handicap_index:54;
    const gender=p.tee_gender_preference||'men'; const tee=p.tee_name_preference||'';
    host.innerHTML=`<div class="profile-pref-card card"><div class="eyebrow">PROFIEL</div><h3>Jouw golfvoorkeuren</h3><div class="profile-pref-grid"><label>Handicap Index<input id="profileHcpInput" type="number" min="-10" max="54" step="0.1" value="${esc(hcp)}"></label><label>Tee voor<select id="profileTeeGender"><option value="men" ${gender==='men'?'selected':''}>Mannen</option><option value="women" ${gender==='women'?'selected':''}>Vrouwen</option></select></label><label>Teevoorkeur<select id="profileTeeName"><option value="">Geen voorkeur</option><option value="Wit" ${tee==='Wit'?'selected':''}>Wit</option><option value="Geel" ${tee==='Geel'?'selected':''}>Geel</option><option value="Blauw" ${tee==='Blauw'?'selected':''}>Blauw</option><option value="Rood" ${tee==='Rood'?'selected':''}>Rood</option><option value="Oranje" ${tee==='Oranje'?'selected':''}>Oranje</option></select></label></div><div class="profile-pref-actions"><button class="primary" id="saveProfilePreferences" type="button">Opslaan</button><span id="profileMessage" class="muted"></span></div></div>`;
    $('#saveProfilePreferences').onclick=async()=>{
      const b=$('#saveProfilePreferences'); b.disabled=true; b.textContent='Opslaan…';
      try{
        const h=Number($('#profileHcpInput').value); if(!Number.isFinite(h)||h<-10||h>54)throw new Error('Voer een handicap index van -10 tot 54 in.');
        const payload={handicap_index:h,tee_gender_preference:$('#profileTeeGender').value,tee_name_preference:$('#profileTeeName').value||null};
        const {data,error}=await window.boundsSupabase.from('profiles').update(payload).eq('id',window.boundsUser.id).select().single();
        if(error)throw error; window.boundsProfile=data;
        const roundHcp=$('#hcpInput'); if(roundHcp)roundHcp.value=h;
        $('#profileMessage').textContent='Opgeslagen'; document.dispatchEvent(new CustomEvent('bounds:profile-updated',{detail:data}));
      }catch(e){console.error(e);$('#profileMessage').textContent=e.message||'Opslaan mislukt';}
      finally{b.disabled=false;b.textContent='Opslaan';}
    };
  }
  window.renderBoundsProfilePreferences=render;
  document.addEventListener('DOMContentLoaded',render);
  document.addEventListener('bounds:profile-loaded',render);
})();
