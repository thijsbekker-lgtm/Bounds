// BOUNDS Supabase adapter.
// Use the small REST adapter consistently on GitHub Pages. This avoids
// differences between CDN/browser-client storage and the static app boot.
export function createBoundsSupabase(url, anonKey){
  const REST=`${url}/rest/v1`, AUTH=`${url}/auth/v1`, KEY='bounds_supabase_session';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
  const write=s=>s?localStorage.setItem(KEY,JSON.stringify(s)):localStorage.removeItem(KEY);
  const result=(data,error=null)=>({data,error});

  async function request(base,path='',options={}){
    const session=read();
    const headers={apikey:anonKey,...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})};
    if(session?.access_token&&!options.skipSessionAuth)headers.Authorization=`Bearer ${session.access_token}`;
    const res=await fetch(`${base}${path}`,{...options,headers});
    const text=await res.text();
    let body=null;try{body=text?JSON.parse(text):null}catch{body=text}
    if(!res.ok){const e=new Error(body?.msg||body?.message||body?.error_description||body?.error||text||`HTTP ${res.status}`);e.status=res.status;e.code=body?.code;throw e}
    return body;
  }

  class Query{
    constructor(table){this.table=table;this.params=[];this.method='GET';this.body=null;this.headers={};this.mode=null}
    select(columns='*'){this.params.push(['select',columns]);return this}
    eq(column,value){this.params.push([column,`eq.${value}`]);return this}
    in(column,values){this.params.push([column,`in.(${(values||[]).join(',')})`]);return this}
    order(column,{ascending=true}={}){this.params.push(['order',`${column}.${ascending?'asc':'desc'}`]);return this}
    limit(n){this.params.push(['limit',String(n)]);return this}
    maybeSingle(){this.mode='maybe';return this}
    single(){this.mode='single';return this}
    insert(payload){this.method='POST';this.body=payload;this.headers.Prefer='return=representation';return this}
    then(resolve,reject){return this.execute().then(resolve,reject)}
    catch(reject){return this.execute().catch(reject)}
    async execute(){
      try{
        let path=`/${this.table}`;
        if(this.method==='POST'){
          const data=await request(REST,path,{method:'POST',headers:this.headers,body:JSON.stringify(this.body)});
          const value=this.mode?(Array.isArray(data)?data[0]||null:data):data;
          if(this.mode==='single'&&!value)return result(null,new Error('Geen record gevonden.'));
          return result(value);
        }
        const qs=new URLSearchParams(this.params);if(qs.toString())path+=`?${qs}`;
        const data=await request(REST,path);
        if(this.mode==='single')return Array.isArray(data)&&data.length===1?result(data[0]):result(null,new Error(Array.isArray(data)&&!data.length?'Geen record gevonden.':'Meerdere records gevonden.'));
        if(this.mode==='maybe')return result(Array.isArray(data)?data[0]||null:data||null);
        return result(data||[]);
      }catch(e){return result(null,e)}
    }
  }

  const listeners=new Set();
  const auth={
    async getSession(){
      let s=read();if(!s)return result({session:null});
      if(s.expires_at&&Date.now()/1000>Number(s.expires_at)-30&&s.refresh_token){
        try{const r=await request(AUTH,'/token?grant_type=refresh_token',{method:'POST',skipSessionAuth:true,body:JSON.stringify({refresh_token:s.refresh_token})});s={...s,...r,expires_at:Math.floor(Date.now()/1000)+Number(r.expires_in||3600)};write(s)}
        catch{write(null);s=null;listeners.forEach(f=>f('SIGNED_OUT',null))}
      }
      return result({session:s});
    },
    onAuthStateChange(fn){listeners.add(fn);return {data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}}},
    async signInWithPassword({email,password}){try{const d=await request(AUTH,'/token?grant_type=password',{method:'POST',skipSessionAuth:true,body:JSON.stringify({email,password})});const s={...d,expires_at:Math.floor(Date.now()/1000)+Number(d.expires_in||3600)};write(s);listeners.forEach(f=>f('SIGNED_IN',s));return result({session:s,user:d.user})}catch(e){return result({session:null},e)}},
    async signUp({email,password}){try{const d=await request(AUTH,'/signup',{method:'POST',skipSessionAuth:true,body:JSON.stringify({email,password})});let s=null;if(d?.access_token){s={...d,expires_at:Math.floor(Date.now()/1000)+Number(d.expires_in||3600)};write(s);listeners.forEach(f=>f('SIGNED_IN',s))}return result({session:s,user:d?.user||null})}catch(e){return result({session:null},e)}},
    async signOut(){const s=read();try{if(s?.access_token)await request(AUTH,'/logout',{method:'POST')}catch{}write(null);listeners.forEach(f=>f('SIGNED_OUT',null));return result(null)}
  };
  return {auth,from:t=>new Query(t),rpc:async(name,payload={})=>{try{return result(await request(REST,`/rpc/${name}`,{method:'POST',body:JSON.stringify(payload)}))}catch(e){return result(null,e)}}};
}