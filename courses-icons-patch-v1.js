/* Courses icon patch — keeps the existing Courses behavior untouched while replacing legacy glyphs. */
(function(){
  const icon = name => window.boundsIcon ? window.boundsIcon(name, 20) : '';
  function patch(root=document){
    if(!window.boundsIcon) return;

    root.querySelectorAll('.courses-search-icon').forEach(el=>{
      if(!el.querySelector('.bounds-icon')) el.innerHTML=icon('search');
    });
    root.querySelectorAll('.courses-profile-button').forEach(el=>{
      if(!el.querySelector('.bounds-icon')) el.innerHTML=icon('profile');
    });
    root.querySelectorAll('.course-shortcut').forEach(el=>{
      const holder=el.querySelector(':scope > span');
      if(!holder || holder.querySelector('.bounds-icon')) return;
      holder.innerHTML=icon(el.dataset.coursesMode === 'favorites' ? 'heart' : 'location');
    });
    root.querySelectorAll('.course-thumb span,.course-mini-thumb').forEach(el=>{
      if(!el.querySelector('.bounds-icon')) el.innerHTML=icon('flag');
    });
    root.querySelectorAll('.course-detail-icon').forEach((el,i)=>{
      if(!el.querySelector('.bounds-icon')) el.innerHTML=icon(i === 0 ? 'heart' : 'share');
    });
    root.querySelectorAll('.course-hero span').forEach(el=>{
      if(!el.querySelector('.bounds-icon')) el.innerHTML=icon('flag',32);
    });
    root.querySelectorAll('.course-back').forEach(el=>{
      if(!el.querySelector('.bounds-icon')) el.innerHTML=`${icon('back',17)}<span>Courses</span>`;
    });
    root.querySelectorAll('.course-hole-toggle b').forEach(el=>{
      if(el.querySelector('.bounds-icon')) return;
      const selected=el.parentElement?.classList.contains('selected');
      el.innerHTML=selected ? icon('check',17) : '<span class="bounds-hole-empty"></span>';
    });
    root.querySelectorAll('.course-arrow,.course-mini-item > span:last-child').forEach(el=>{
      if(!el.querySelector('.bounds-icon')) el.innerHTML=icon('chevron',18);
    });
  }
  const observer=new MutationObserver(()=>patch(document));
  observer.observe(document.body,{subtree:true,childList:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>patch(document)); else patch(document);
})();
