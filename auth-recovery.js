const SUPABASE_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SUPABASE_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const SESSION_KEY='bounds_supabase_session';

// Static GitHub Pages auth fallback. Keep one storage mechanism only: the
// REST adapter used by app.js. This prevents CDN client/session mismatches.
async function recoverAuthSubmit(event){
  const form=event.target;
  if(!(form instanceof HTMLFormElement) || form.id!=='authForm') return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const email=document.querySelector('#authEmail')?.value.trim()||'';
  const password=document.querySelector('#authPassword')?.value||'';
  const button=document.querySelector('#authSubmit');
  const message=document.querySelector('#authMessage');
  const registering=button?.textContent?.toLowerCase().includes('account');
  if(!email||!password){if(message)message.textContent='Vul e-mail en wachtwoord in.';return;}

  if(button){button.disabled=true;button.textContent=registering?'Account maken…':'Inloggen…';}
  if(message)message.textContent=registering?'Account aanmaken…':'Inloggen…';

  try{
    const path=registering?'signup':'token?grant_type=password';
    const res=await fetch(`${SUPABASE_URL}/auth/v1/${path}`,{
      method:'POST',
      headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({email,password})
    });
    const text=await res.text();
    let body=null;try{body=text?JSON.parse(text):null}catch{body=text}
    if(!res.ok)throw new Error(body?.error_description||body?.msg||body?.message||body?.error||text||`HTTP ${res.status}`);
    if(!body?.access_token){
      if(message)message.textContent='Account aangemaakt. Controleer je e-mail als verificatie actief is.';
      if(button){button.disabled=false;button.textContent='Account maken';}
      return;
    }

    const session={...body,expires_at:body.expires_at||Math.floor(Date.now()/1000)+Number(body.expires_in||3600)};
    localStorage.setItem(SESSION_KEY,JSON.stringify(session));
    if(message)message.textContent='Inloggen gelukt. BOUNDS wordt geladen…';
    setTimeout(()=>window.location.replace(`${window.location.pathname}?auth=${Date.now()}`),150);
  }catch(error){
    console.error('BOUNDS auth recovery error',error);
    const raw=String(error?.message||'Inloggen mislukt.');
    const friendly=/invalid login credentials/i.test(raw)
      ? 'Inloggen mislukt. Controleer e-mailadres en wachtwoord.'
      : /email not confirmed/i.test(raw)
        ? 'Bevestig eerst je e-mailadres via de bevestigingsmail.'
        : `Inloggen mislukt: ${raw}`;
    if(message)message.textContent=friendly;
    if(button){button.disabled=false;button.textContent=registering?'Account maken':'Inloggen';}
  }
}

document.addEventListener('submit',recoverAuthSubmit,true);
