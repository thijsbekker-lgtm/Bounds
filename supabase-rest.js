// Minimal Supabase-compatible browser client for BOUNDS.
// Uses Supabase Auth + PostgREST directly so login does not depend on a CDN JS bundle.
export function createBoundsSupabase(url, anonKey){
  const REST = `${url}/rest/v1`;
  const AUTH = `${url}/auth/v1`;
  const STORAGE_KEY = 'bounds_supabase_session';
  const listeners = new Set();

  const readSession = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch { return null; }
  };
  const writeSession = (session) => {
    if(session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  };
  const emit = (event, session) => listeners.forEach(fn => { try { fn(event, session); } catch(e) { console.error(e); } });

  async function request(base, path='', options={}){
    const session = readSession();
    const headers = {
      // Publishable keys belong in `apikey`. They are not JWTs and must not be
      // sent as `Authorization: Bearer <publishable-key>`.
      apikey: anonKey,
      ...(options.body ? {'Content-Type':'application/json'} : {}),
      ...(options.headers || {})
    };
    // Only attach Authorization when we actually have a user JWT.
    // This is especially important for password sign-in/sign-up requests.
    if(session?.access_token && !options.skipSessionAuth){
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const res = await fetch(`${base}${path}`, { ...options, headers });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if(!res.ok){
      const message = body?.msg || body?.message || body?.error_description || body?.error || text || `HTTP ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      err.code = body?.code;
      throw err;
    }
    return body;
  }

  function result(data, error=null){ return {data, error}; }

  class QueryBuilder {
    constructor(table){ this.table=table; this.params=[]; this.method='GET'; this.body=null; this.headers={}; this.singleMode=null; }
    select(columns='*'){ this.params.push(['select', columns]); this.selectColumns=columns; return this; }
    eq(column,value){ this.params.push([column,`eq.${value}`]); return this; }
    in(column,values){ this.params.push([column,`in.(${(values||[]).join(',')})`]); return this; }
    order(column,{ascending=true}={}){ this.params.push(['order',`${column}.${ascending?'asc':'desc'}`]); return this; }
    limit(n){ this.params.push(['limit',String(n)]); return this; }
    maybeSingle(){ this.singleMode='maybe'; return this; }
    single(){ this.singleMode='single'; return this; }
    insert(payload){ this.method='POST'; this.body=payload; this.headers.Prefer='return=representation'; return this; }
    then(resolve,reject){ return this.execute().then(resolve,reject); }
    catch(reject){ return this.execute().catch(reject); }
    async execute(){
      try{
        let path=`/${this.table}`;
        const qs=new URLSearchParams(this.params);
        if(this.method==='POST'){
          const data=await request(REST,path,{method:'POST',headers:this.headers,body:JSON.stringify(this.body)});
          const normalized=this.singleMode ? (Array.isArray(data)?data[0]||null:data) : data;
          if(this.singleMode==='single' && !normalized) return result(null,new Error('Geen record gevonden.'));
          return result(normalized);
        }
        if(qs.toString()) path += `?${qs.toString()}`;
        const data=await request(REST,path,{method:'GET'});
        if(this.singleMode==='single'){
          if(!Array.isArray(data) || data.length!==1) return result(null,new Error(data?.length===0?'Geen record gevonden.':'Meerdere records gevonden.'));
          return result(data[0]);
        }
        if(this.singleMode==='maybe') return result(Array.isArray(data)?(data[0]||null):data||null);
        return result(data||[]);
      }catch(error){ return result(null,error); }
    }
  }

  const auth = {
    async getSession(){
      let session=readSession();
      if(!session) return result({session:null});
      if(session.expires_at && Date.now()/1000 > Number(session.expires_at)-30 && session.refresh_token){
        try{
          const refreshed=await request(AUTH,`/token?grant_type=refresh_token`,{method:'POST',skipSessionAuth:true,body:JSON.stringify({refresh_token:session.refresh_token})});
          session={...session,...refreshed,expires_at:Math.floor(Date.now()/1000)+Number(refreshed.expires_in||3600)};
          writeSession(session);
        }catch(e){
          writeSession(null); session=null; emit('SIGNED_OUT',null);
        }
      }
      return result({session});
    },
    onAuthStateChange(callback){ listeners.add(callback); return {data:{subscription:{unsubscribe:()=>listeners.delete(callback)}}}; },
    async signInWithPassword({email,password}){
      try{
        const data=await request(AUTH,'/token?grant_type=password',{method:'POST',skipSessionAuth:true,body:JSON.stringify({email,password})});
        const session={...data,expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600)};
        writeSession(session); emit('SIGNED_IN',session); return result({session,user:data.user});
      }catch(error){ return result({session:null},error); }
    },
    async signUp({email,password}){
      try{
        const data=await request(AUTH,'/signup',{method:'POST',skipSessionAuth:true,body:JSON.stringify({email,password})});
        let session=null;
        if(data?.access_token){ session={...data,expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600)}; writeSession(session); emit('SIGNED_IN',session); }
        return result({session,user:data?.user||null});
      }catch(error){ return result({session:null},error); }
    },
    async signOut(){
      const session=readSession();
      try{
        if(session?.access_token) await request(AUTH,'/logout',{method:'POST'});
      }catch(e){ /* clear local session even if remote logout fails */ }
      writeSession(null); emit('SIGNED_OUT',null); return result(null);
    }
  };

  return {
    auth,
    from:(table)=>new QueryBuilder(table),
    async rpc(name,payload={}){
      try{return result(await request(REST,`/rpc/${name}`,{method:'POST',body:JSON.stringify(payload)}));}
      catch(error){return result(null,error);}
    }
  };
}
