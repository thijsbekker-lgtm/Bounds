const SUPABASE_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SUPABASE_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';

function authMessage(msg=''){
  const el=document.querySelector('#authMessage');
  if(el) el.textContent=msg;
}

async function directAuth(path,payload){
  const res=await fetch(`${SUPABASE_URL}/auth/v1/${path}`,{
    method:'POST',
    headers:{
      apikey:SUPABASE_KEY,
      'Content-Type':'application/json'
    },
    body:JSON.stringify(payload)
  });
  const text=await res.text();
  let body=null;
  try{body=text?JSON.parse(text):null}catch{body=text}
  if(!res.ok){
    const message=body?.error_description||body?.msg||body?.message||body?.error||text||`HTTP ${res.status}`;
    throw new Error(message);
  }
  return body;
}

async function persistSession(session){
  if(!session?.access_token) return;
  const normalized={
    ...session,
    expires_at:session.expires_at||Math.floor(Date.now()/1000)+Number(session.expires_in||3600)
  };

  // Prefer the official Supabase client's storage when its CDN loaded.
  // This makes the next page load see exactly the same authenticated session.
  if(globalThis.supabase?.createClient){
    const client=globalThis.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    const {error}=await client.auth.setSession({
      access_token:normalized.access_token,
      refresh_token:normalized.refresh_token,
      expires_in:Number(normalized.expires_in||3600),
      expires_at:Number(normalized.expires_at),
      token_type:normalized.token_type||'bearer'
    });
    if(error) throw error;
    return;
  }

  // REST fallback used when the Supabase CDN is blocked.
  localStorage.setItem('bounds_supabase_session',JSON.stringify(normalized));
}

function install(){
  const form=document.querySelector('#authForm');
  if(!form) return;

  // Replace the previous handler. The original UI remains unchanged; this
  // handler talks directly to Supabase Auth so a CDN/client problem cannot
  // prevent the login request from being sent.
  form.onsubmit=async event=>{
    event.preventDefault();
    const email=document.querySelector('#authEmail')?.value.trim();
    const password=document.querySelector('#authPassword')?.value||'';
    const submit=document.querySelector('#authSubmit');
    const registering=submit?.textContent==='Account maken';
    if(!email||!password){authMessage('Vul e-mail en wachtwoord in.');return;}

    if(submit){submit.disabled=true;submit.textContent=registering?'Account maken…':'Inloggen…';}
    authMessage(registering?'Account aanmaken…':'Inloggen…');

    try{
      if(registering){
        const data=await directAuth('signup',{email,password});
        if(data?.access_token){
          await persistSession(data);
          location.reload();
          return;
        }
        authMessage('Account aangemaakt. Controleer je e-mail als verificatie actief is.');
      }else{
        const data=await directAuth('token?grant_type=password',{email,password});
        if(!data?.access_token) throw new Error('Supabase gaf geen actieve sessie terug.');
        await persistSession(data);
        authMessage('Inloggen gelukt.');
        location.reload();
      }
    }catch(error){
      console.error('BOUNDS direct auth error',error);
      const raw=String(error?.message||'Inloggen mislukt.');
      const friendly=/invalid login credentials/i.test(raw)
        ? 'Inloggen mislukt. Controleer e-mailadres en wachtwoord.'
        : /email not confirmed/i.test(raw)
          ? 'Bevestig eerst je e-mailadres via de bevestigingsmail.'
          : raw;
      authMessage(friendly);
    }finally{
      if(submit){submit.disabled=false;submit.textContent=registering?'Account maken':'Inloggen';}
    }
  };
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
