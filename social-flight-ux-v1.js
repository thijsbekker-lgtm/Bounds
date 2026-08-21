/* BOUNDS Social flight UX — progressive disclosure */
(function(){
  function init(){
    const page=document.getElementById('page-social');
    if(!page)return;
    const panel=page.querySelector('.social-flight-panel');
    if(!panel){setTimeout(init,150);return}
    const cards=[...panel.querySelectorAll('.social-flight-card')];
    if(cards.length<2)return;
    cards.forEach((card,index)=>{
      if(card.dataset.uxReady==='1')return;
      card.dataset.uxReady='1';
      const title=card.querySelector('h3');
      const description=card.querySelector('p');
      const form=card.querySelector('.social-flight-form');
      const actions=card.querySelector('.social-flight-actions');
      const note=card.querySelector('.social-flight-note');
      const button=actions?.querySelector('button');
      if(!title||!description||!form||!button)return;
      const originalTitle=title.textContent.trim();
      const originalDescription=description.textContent.trim();
      const choice=document.createElement('div');
      choice.className='sf-choice';
      choice.innerHTML=`<div class="sf-choice-copy"><h3>${originalTitle}</h3><p>${originalDescription}</p></div><div class="sf-choice-icon" aria-hidden="true">${index===0?'＋':'⌁'}</div>`;
      title.replaceWith(choice);
      form.hidden=true;
      if(actions)actions.hidden=true;
      if(note)note.hidden=true;
      const open=document.createElement('button');
      open.type='button';open.className='sf-open-button';open.textContent=index===0?'Beschikbaarheid instellen':'Flight toevoegen';
      choice.insertAdjacentElement('afterend',open);
      const close=document.createElement('button');
      close.type='button';close.className='sf-close-button';close.textContent='Terug';close.hidden=true;
      form.insertAdjacentElement('afterend',close);
      open.addEventListener('click',()=>{
        card.classList.add('sf-expanded');
        form.hidden=false;if(actions)actions.hidden=false;if(note)note.hidden=false;
        open.hidden=true;close.hidden=false;
        card.scrollIntoView({behavior:'smooth',block:'nearest'});
      });
      close.addEventListener('click',()=>{
        card.classList.remove('sf-expanded');
        form.hidden=true;if(actions)actions.hidden=true;if(note)note.hidden=true;
        open.hidden=false;close.hidden=true;
      });
    });
  }
  const start=()=>setTimeout(init,100);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  const observer=new MutationObserver(()=>init());
  observer.observe(document.body,{childList:true,subtree:true});
})();
