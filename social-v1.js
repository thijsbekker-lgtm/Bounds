function initSocialV1(){
  const socialTab=document.querySelector('.tab[data-tab="social"]');
  const socialPage=document.getElementById('page-social');
  if(!socialTab||!socialPage) return;
  document.querySelector('.tabs')?.addEventListener('click',(event)=>{
    const tab=event.target.closest('.tab');
    if(!tab) return;
    if(tab.dataset.tab==='social'){
      event.preventDefault();
      document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===socialTab));
      document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x===socialPage));
    }else{
      socialTab.classList.remove('active');
      socialPage.classList.remove('active');
    }
  });
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initSocialV1); else initSocialV1();