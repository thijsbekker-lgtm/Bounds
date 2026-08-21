/* BOUNDS Icons V1 — restrained line icons, no emoji. */
(function(){
  const paths = {
    home:'<path d="M3.5 10.5 12 3.8l8.5 6.7"/><path d="M5.5 9.5v9h13v-9"/><path d="M9.5 18.5v-5h5v5"/>',
    play:'<path d="M6.5 20V4"/><path d="M6.5 4h9.5l-2.4 3 2.4 3H6.5"/><path d="M4 20h5"/>',
    game:'<path d="M4 19.5h16"/><path d="M5.5 16.5 10 12l3.2 2.5L19 8"/><path d="M16.5 8H19v2.5"/>',
    courses:'<path d="M6 20V4"/><path d="M6 4h10l-2.4 3L16 10H6"/><path d="M3.5 20h5"/>',
    flag:'<path d="M6 20V4"/><path d="M6 4h10l-2.4 3L16 10H6"/>',
    location:'<path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.2"/>',
    water:'<path d="M3 9c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0"/><path d="M3 14c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0"/>',
    bunker:'<path d="M4 17c2.5-5 5.2-7.5 8-7.5s5.5 2.5 8 7.5"/><path d="M6 17.5h12"/><path d="M8 13.5h8"/>',
    range:'<path d="M5 19.5c1.5-5 4.3-9 9-12"/><path d="m14 7 3.5-.5-1.2 3.3"/><path d="M5 19.5h5"/>',
    cart:'<path d="M3 5h2l1.7 9h10.8l2-7H6"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/>',
    shop:'<path d="M4 10.5h16"/><path d="m5 10.5 1-6h12l1 6"/><path d="M6 10.5v8h12v-8"/><path d="M9 18.5v-4h6v4"/>',
    club:'<path d="M8 4h5"/><path d="M10 4v7.5"/><path d="M10 11.5c0 2.8-2.2 4.5-4.5 5.5"/><path d="M13 8.5 18.5 4"/><path d="M18.5 4h2"/><path d="M18.5 4v2"/>',
    restaurant:'<path d="M5 4v16"/><path d="M9 4v7c0 1.7-1 3-2 3s-2-1.3-2-3"/><path d="M7 14v6"/><path d="M15 4v16"/><path d="M15 4c3 1 4 3 4 5.5 0 2-1 3.5-4 3.5"/>',
    school:'<path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 11.5V16c2.7 2 7.3 2 10 0v-4.5"/><path d="M21 9v6"/>',
    buggy:'<path d="M5 13h14l-1.2-5H6.2L5 13Z"/><path d="M7 13v4h10v-4"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/><path d="M8 8V6h8v2"/>',
    charge:'<path d="M7 3h7v18H7z"/><path d="M14 7h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3"/><path d="m10 7-2 5h3l-1 5 3-6h-3l2-4"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    heart:'<path d="M20 8.8c0 5-8 10.2-8 10.2S4 13.8 4 8.8A4.3 4.3 0 0 1 12 6a4.3 4.3 0 0 1 8 2.8Z"/>',
    profile:'<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6"/>',
    share:'<path d="M7 12v7h10v-7"/><path d="M12 15V3"/><path d="m8.5 6.5 3.5-3.5 3.5 3.5"/>',
    back:'<path d="m14.5 5-7 7 7 7"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',
    check:'<path d="m5 12.5 4.2 4.2L19 7"/>'
  };
  function icon(name, size){
    const body=paths[name] || paths.flag;
    const s=size || 20;
    return `<svg class="bounds-icon bounds-icon-${name}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }
  window.boundsIcon = icon;
  function renderStatic(){
    document.querySelectorAll('[data-bounds-icon]').forEach(el=>{ el.innerHTML=icon(el.dataset.boundsIcon, Number(el.dataset.iconSize)||20); });
  }
  window.renderBoundsIcons=renderStatic;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',renderStatic); else renderStatic();
})();