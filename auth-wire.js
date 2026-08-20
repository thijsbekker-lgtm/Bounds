const BOUNDS_AUTH_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const BOUNDS_AUTH_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const BOUNDS_SESSION_KEY='bounds_supabase_session';

// Keep authentication on the official Supabase JS v2 client.
// The rest of BOUNDS intentionally keeps using the existing REST adapter;
// we bridge the successful v2 session into its existing session key.
import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm').then(({createClient})=>{
  const supabase=createClient(BOUNDS_AUTH_URL,BOUNDS_AUTH_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  window.__BOUNDS_SUPABASE_AUTH__=supabase;
}).catch(error=>{
  console.error('BOUNDS Supabase JS v2 load error',error);
});

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
      let client=window.__BOUNDS_SUPABASE_AUTH__;
      if(!client){
        const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm');
        client=mod.createClient(BOUNDS_AUTH_URL,BOUNDS_AUTH_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
        window.__BOUNDS_SUPABASE_AUTH__=client;
      }
      let data,error;
      if(registering){
        ({data,error}=await client.auth.signUp({email,password}));
        if(error)throw error;
        if(!data?.session){
          if(message)message.textContent='Account aangemaakt. Controleer je e-mail en bevestig je account.';
          registering=false;button.disabled=false;button.textContent='Inloggen';return;
        }
      }else{
        ({data,error}=await client.auth.signInWithPassword({email,password}));
        if(error)throw error;
        if(!data?.session?.access_token)throw new Error('Supabase gaf geen geldige sessie terug.');
      }
      const session=data.session;
      const bridgedSession={...session,expires_at:session.expires_at||Math.floor(Date.now()/1000)+Number(session.expires_in||3600)};
      localStorage.setItem(BOUNDS_SESSION_KEY,JSON.stringify(bridgedSession));
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