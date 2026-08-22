const SFO_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SFO_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
const SFO_SESSION='bounds_supabase_session';
function sfoSession(){try{return JSON.parse(localStorage.getItem(SFO_SESSION)||'null')}catch{return null}}
function sfoHeaders(){const s=sfoSession();return{apikey:SFO_KEY,Authorization:`Bearer ${s?.access_token||''}`}}
async function sfoRest(path){const r=await fetch(`${SFO_URL}/rest/v1/${path}`,{headers:sfoHeaders()});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}
async function sfoPatchCourse(){try{const s=sfoSession();if(!s?.user?.id)return;const rows=await sfoRest(`golf_flight_players?select=flight_id,status,created_at&user_id=eq.${encodeURIComponent(s.user.id)}&status=in.(accepted,declined)&order=created_at.desc&limit=1`);const row=rows?.[0];if(!row)return;const flights=await sfoRest(`golf_flights?select=course_id&id=eq.${encodeURIComponent(row.flight_id)}`);const courseId=flights?.[0]?.course_id;if(!courseId)return;const courses=await sfoRest(`courses?select=id,name&id=eq.${encodeURIComponent(courseId)}&limit=1`);const name=courses?.[0]?.name;if(!name)return;const span=document.querySelector('.sfr-notice .sfr-notice-copy span');if(!span)return;const parts=span.textContent.split(' · ');if(parts.length<4||parts[1]===name)return;parts[1]=name;span.textContent=parts.join(' · ')}catch(e){console.debug('BOUNDS flight outcome course name',e)}}
function sfoBoot(){sfoPatchCourse();setTimeout(sfoPatchCourse,1000);setTimeout(sfoPatchCourse,2500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sfoBoot);else sfoBoot();
new MutationObserver(()=>{if(document.querySelector('.sfr-notice'))sfoPatchCourse()}).observe(document.body,{childList:true,subtree:true});
