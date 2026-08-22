(() => {
  const root = document.getElementById('scoreArea');
  const rows = document.getElementById('scoreRows');
  const play = document.getElementById('page-play');
  if (!root || !rows || !play) return;

  let currentIndex = 0;
  let controls = null;
  let newRoundCard = null;
  let lastCount = 0;

  const style = document.createElement('style');
  style.textContent = `
    #page-play .section-head { margin-bottom: 8px; }
    #scoreArea { padding: 14px; }
    #scoreArea .score-head { margin: 0 0 12px; padding: 12px 4px 14px; border-bottom: 1px solid var(--line); }
    #scoreArea .score-head > div { min-width: 0; }
    #scoreArea .score-head b { font-size: 20px; letter-spacing: -.4px; }
    #scoreArea .score-head small { font-size: 12px; color: var(--muted); }
    #scoreArea .score-head::before { content: '⚑'; display:block; float:left; margin:2px 10px 0 0; width:38px; height:38px; border-radius:12px; background:#edf6ef; color:var(--green); text-align:center; line-height:38px; font-size:18px; }
    .scorecard-nav { padding: 14px 4px 10px; }
    .scorecard-progress { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .scorecard-progress b { display:block; font-size:18px; letter-spacing:-.3px; }
    .scorecard-progress span { display:block; color:var(--muted); font-size:12px; margin-top:3px; }
    .scorecard-nav-buttons { display:flex; gap:7px; flex-shrink:0; }
    .scorecard-nav-buttons button { padding:10px 12px; font-size:12px; }
    .scorecard-nav-buttons button:disabled { opacity:.35; }
    .scorecard-dots { display:flex; gap:6px; overflow:hidden; margin:14px 2px 6px; }
    .score-dot { width:9px; height:9px; flex:0 0 9px; border-radius:50%; background:#dfe3e5; }
    .score-dot.done { background:#aeb8bd; }
    .score-dot.active { background:#102a35; box-shadow:0 0 0 3px #e5ecef; }
    #scoreRows .hole { display:none; border-top:0; padding:8px 0 4px; }
    #scoreRows .hole.ux-active-hole { display:block; }
    #scoreRows .hole-main { background:#fff; border:1px solid var(--line); border-radius:18px; padding:14px 12px; }
    #scoreRows .hole-no b { font-size:24px; color:var(--green); }
    #scoreRows .hole-no small { font-size:11px; }
    #scoreRows .muted { font-size:11px; }
    #scoreRows .scorebox button { width:42px; height:42px; }
    #scoreRows .sf { font-size:15px; color:var(--green); }
    #scoreRows .stats-panel { margin:8px 0 0; }
    .play-new-round-card { margin-top:12px; }
    .play-new-round-card .new-round-copy { display:flex; gap:12px; align-items:flex-start; }
    .play-new-round-card .new-round-icon { width:38px; height:38px; border-radius:12px; background:#edf6ef; color:var(--green); display:grid; place-items:center; flex:0 0 auto; font-size:18px; }
    .play-new-round-card h3 { margin:1px 0 4px; font-size:17px; }
    .play-new-round-card p { margin:0; color:var(--muted); font-size:12px; line-height:1.45; }
    .play-new-round-card button { margin-top:12px; width:100%; }
    @media(max-width:560px){
      .scorecard-progress { align-items:flex-end; }
      .scorecard-nav-buttons button { padding:9px 10px; }
      #scoreRows .hole-main { grid-template-columns:45px 1fr 88px 62px; }
    }
  `;
  document.head.appendChild(style);

  function holes() { return [...rows.querySelectorAll('.hole')]; }

  function setupCourseHeader() {
    const title = root.querySelector('.score-head b');
    const subtitle = document.getElementById('scoreSubtitle');
    if (!title || !subtitle) return;
    const parts = (subtitle.textContent || '').split(' · ');
    title.textContent = parts.shift() || 'Huidige ronde';
    subtitle.textContent = parts.join(' · ');
  }

  function buildControls() {
    if (controls) return;
    controls = document.createElement('div');
    controls.className = 'scorecard-nav';
    controls.innerHTML = `
      <div class="scorecard-progress">
        <div><b id="uxHoleLabel">Hole 1 van 1</b><span id="uxHolePlayed">0 holes gespeeld</span></div>
        <div class="scorecard-nav-buttons"><button type="button" class="secondary ux-prev">‹ Vorige</button><button type="button" class="primary ux-next">Volgende ›</button></div>
      </div>
      <div class="scorecard-dots" id="uxScoreDots"></div>`;
    rows.parentElement.insertBefore(controls, rows);
    controls.querySelector('.ux-prev').onclick = () => { if (currentIndex > 0) { currentIndex--; apply(); } };
    controls.querySelector('.ux-next').onclick = () => { if (currentIndex < holes().length - 1) { currentIndex++; apply(); } };
  }

  function buildNewRoundCard() {
    if (newRoundCard) return;
    newRoundCard = document.createElement('div');
    newRoundCard.className = 'card play-new-round-card hidden';
    newRoundCard.innerHTML = `<div class="new-round-copy"><div class="new-round-icon">⚑</div><div><h3>Nieuwe ronde starten</h3><p>Kies een baan en start een nieuwe ronde.</p></div></div><button type="button" class="secondary" id="uxNewRound">Nieuwe ronde</button>`;
    root.insertAdjacentElement('afterend', newRoundCard);
    newRoundCard.querySelector('#uxNewRound').onclick = () => {
      const trigger = document.querySelector('[data-new-round]');
      if (trigger) trigger.click();
      window.scrollTo({top:0, behavior:'smooth'});
    };
  }

  function syncVisibility() {
    const active = !root.classList.contains('hidden');
    const status = document.getElementById('roundStatus');
    const title = document.getElementById('playTitle');
    if (active) {
      if (title) title.textContent = 'Huidige ronde';
      if (status) status.textContent = '🟢 Ronde bezig';
      if (newRoundCard) newRoundCard.classList.remove('hidden');
    } else {
      if (title) title.textContent = 'Nieuwe ronde';
      if (newRoundCard) newRoundCard.classList.add('hidden');
    }
  }

  function apply() {
    const list = holes();
    if (!list.length) return;
    currentIndex = Math.max(0, Math.min(currentIndex, list.length - 1));
    list.forEach((el, i) => el.classList.toggle('ux-active-hole', i === currentIndex));
    const active = list[currentIndex];
    const number = active.querySelector('.hole-no b')?.textContent || String(currentIndex + 1);
    const label = document.getElementById('uxHoleLabel');
    const played = document.getElementById('uxHolePlayed');
    const dots = document.getElementById('uxScoreDots');
    const count = list.filter(h => (h.querySelector('.score')?.textContent || '—') !== '—').length;
    if (label) label.textContent = `Hole ${number} van ${list.length}`;
    if (played) played.textContent = `${count} ${count === 1 ? 'hole' : 'holes'} gespeeld`;
    if (dots) dots.innerHTML = list.map((_, i) => `<span class="score-dot ${i === currentIndex ? 'active' : i < currentIndex ? 'done' : ''}"></span>`).join('');
    const prev = controls?.querySelector('.ux-prev');
    const next = controls?.querySelector('.ux-next');
    if (prev) prev.disabled = currentIndex === 0;
    if (next) next.disabled = currentIndex === list.length - 1;
    setupCourseHeader();
    syncVisibility();
  }

  buildControls();
  buildNewRoundCard();

  const observer = new MutationObserver(() => {
    const count = holes().length;
    if (count && count !== lastCount) currentIndex = Math.min(currentIndex, count - 1);
    lastCount = count;
    requestAnimationFrame(apply);
    syncVisibility();
  });
  observer.observe(rows, {childList:true, subtree:true});
  observer.observe(root, {attributes:true, attributeFilter:['class']});

  apply();
})();