/* Courses icon patch — keeps the existing Courses behavior untouched while replacing legacy glyphs. */
(function(){
  const icon = (name,size) => window.boundsIcon ? window.boundsIcon(name, size || 20) : '';
  function patch(root=document){
    if(!window.boundsIcon) return;

    const replaceOnce = (el, html) => {
      if(el.dataset.boundsIconPatched === '1') return;
      el.innerHTML = html;
      el.dataset.boundsIconPatched = '1';
    };

    root.querySelectorAll('.courses-search-icon').forEach(el=>{
      replaceOnce(el, icon('search'));
    });
    root.querySelectorAll('.courses-profile-button').forEach(el=>{
      replaceOnce(el, icon('profile'));
    });
    root.querySelectorAll('.course-shortcut').forEach(el=>{
      const holder=el.querySelector(':scope > span');
      if(!holder) return;
      replaceOnce(holder, icon(el.dataset.coursesMode === 'favorites' ? 'heart' : 'location'));
    });
    root.querySelectorAll('.course-thumb span,.course-mini-thumb').forEach(el=>{
      replaceOnce(el, icon('flag'));
    });
    root.querySelectorAll('.course-detail-icon').forEach((el,i)=>{
      replaceOnce(el, icon(i === 0 ? 'heart' : 'share'));
    });
    root.querySelectorAll('.course-hero span').forEach(el=>{
      replaceOnce(el, icon('flag',32));
    });
    root.querySelectorAll('.course-back').forEach(el=>{
      replaceOnce(el, `${icon('back',17)}<span>Courses</span>`);
    });
    root.querySelectorAll('.course-hole-toggle b').forEach(el=>{
      const selected=el.parentElement?.classList.contains('selected');
      replaceOnce(el, selected ? icon('check',17) : '<span class="bounds-hole-empty"></span>');
    });
    root.querySelectorAll('.course-arrow,.course-mini-item > span:last-child').forEach(el=>{
      replaceOnce(el, icon('chevron',18));
    });
  }
  const observer=new MutationObserver(()=>patch(document));
  observer.observe(document.body,{subtree:true,childList:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>patch(document)); else patch(document);
})();
