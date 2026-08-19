const BOUNDS_AUTH_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const BOUNDS_AUTH_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const BOUNDS_SESSION_KEY='bounds_supabase_session';

window.wireAuthForm=function wireAuthForm(){
  const form=document.getElementById('authForm');
  const mode=document.getElementById('authMode');
  const button=document.getElementById('authSubmit');
  const message=document.getElementById('authMessage');
  if(!form||!button)return;
  if(form.dataset.authWired==='1')return;
  form.dataset.authWired='1';
  let registering=false;
  mode?.addEventListener('click',()=>{
    registering=!registering;
    button.textContent=registering?'Account maken':'Inloggen';
    mode.textContent=registering?'Al een account? Inloggen':'Nog geen account? Registreren';
    const password=document.getElementById('authPassword');
    if(password)password.autocomplete=registering?'new-password':'current-password';
    if(message)message.textContent='';
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    event.stopPropagation();
    const email=(document.getElementById('authEmail')?.value||'').trim();
    const password=document.getElementById('authPassword')?.value||'';
    if(!email||!password){if(message)message.textContent='Vul e-mail en wachtwoord in.';return;}
    button.disabled=true;
    button.textContent=registering?'Account maken…':'Inloggen…';
    if(message)message.textContent=registering?'Account aanmaken…':'Inloggen…';
    try{
      const endpoint=registering?'/signup':'/token?grant_type=password';
      const response=await fetch(`${BOUNDS_AUTH_URL}/auth/v1${endpoint}`,{method:'POST',headers:{apikey:BOUNDS_AUTH_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const text=await response.text();
      let data={};try{data=text?JSON.parse(text):{}}catch{data={message:text}};
      if(!response.ok)throw new Error(data.error_description||data.msg||data.message||data.error||`HTTP ${response.status}`);
      if(!data.access_token){
        if(message)message.textContent='Account aangemaakt. Controleer je e-mail en bevestig je account.';
        registering=false;button.disabled=false;button.textContent='Inloggen';return;
      }
      const session={...data,expires_at:data.expires_at||Math.floor(Date.now()/1000)+Number(data.expires_in||3600)};
      localStorage.setItem(BOUNDS_SESSION_KEY,JSON.stringify(session));
      if(message)message.textContent='Inloggen gelukt…';
      window.location.reload();
    }catch(error){
      console.error('BOUNDS login error',error);
      const raw=String(error?.message||'Inloggen mislukt.');
      if(message)message.textContent=/invalid login credentials/i.test(raw)?'E-mailadres of wachtwoord klopt niet.':/email not confirmed/i.test(raw)?'Bevestig eerst je e-mailadres via de bevestigingsmail.':`Inloggen mislukt: ${raw}`;
      button.disabled=false;
      button.textContent=registering?'Account maken':'Inloggen';
    }
  });
};