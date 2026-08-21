(function(){
  function setup(){
    var panel=document.querySelector('#page-social .social-flight-panel');
    if(!panel || panel.dataset.progressiveV2==='1') return !!panel;
    panel.dataset.progressiveV2='1';
    var cards=panel.querySelectorAll('.social-flight-card');
    if(cards.length<2)return false;
    for(var i=0;i<cards.length;i++){
      var card=cards[i],form=card.querySelector('.social-flight-form'),actions=card.querySelector('.social-flight-actions'),note=card.querySelector('.social-flight-note');
      if(form)form.hidden=true;if(actions)actions.hidden=true;if(note)note.hidden=true;
      var open=document.createElement('button');open.type='button';open.className='social-flight-open';open.textContent=i===0?'Beschikbaarheid instellen':'Flight toevoegen';open.setAttribute('aria-expanded','false');
      var p=card.querySelector('p');if(p)p.insertAdjacentElement('afterend',open);
      var close=document.createElement('button');close.type='button';close.className='social-flight-close';close.textContent='Sluiten';close.hidden=true;card.insertBefore(close,form||card.lastElementChild);
      function setOpen(value){
        for(var j=0;j<cards.length;j++){var other=cards[j];if(other!==card){other.classList.remove('is-open');var ob=other.querySelector('.social-flight-open'),of=other.querySelector('.social-flight-form'),oa=other.querySelector('.social-flight-actions'),on=other.querySelector('.social-flight-note'),oc=other.querySelector('.social-flight-close');if(ob){ob.hidden=false;ob.setAttribute('aria-expanded','false')}if(of)of.hidden=true;if(oa)oa.hidden=true;if(on)on.hidden=true;if(oc)oc.hidden=true;}}
        card.classList.toggle('is-open',value);open.hidden=value;open.setAttribute('aria-expanded',String(value));close.hidden=!value;if(form)form.hidden=!value;if(actions)actions.hidden=!value;if(note)note.hidden=!value;
      }
      open.addEventListener('click',function(){setOpen(true)});close.addEventListener('click',function(){setOpen(false)});
    }
    return true;
  }
  var tries=0,timer=setInterval(function(){if(setup()||++tries>80)clearInterval(timer)},100);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
