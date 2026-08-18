// BOUNDS Supabase adapter.
// GitHub Pages uses the official Supabase browser client. The previous
// hand-written REST/Auth implementation could leave the login request
// hanging on Safari. Keep this adapter name so the rest of the app does not
// need to change, but delegate all auth/data/session handling to Supabase JS.
export function createBoundsSupabase(url, anonKey){
  const api=window.supabase;
  if(!api?.createClient) throw new Error('Supabase browser client kon niet worden geladen.');
  return api.createClient(url,anonKey,{
    auth:{
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true,
      storageKey:'bounds_supabase_session'
    }
  });
}
