(() => {
  const root = document.getElementById('scoreArea');
  const rows = document.getElementById('scoreRows');
  if (!root || !rows) return;

  let currentIndex = 0;
  let lastCount = 0;
  let controls = null;
  let applying = false;

  function holes() { return [...rows.querySelectorAll('.hole')]; }

  function buildControls() {
    if (controls || !rows.parentElement) return;
    controls = document.createElement('div');
    controls.className = 'scorecard-nav';
    controls.innerHTML = `
      <div class="scorecard-nav-top">
        <div>
          <div class="scorecard-kicker">SCOREKAART</div>
          <h3 class="scorecard-title">Scorekaart</h3>
          <div class="scorecard-subtitle" id="uxScoreSubtitle"></div>
        </div>
        <span class="scorecard-resume">🟢 Ronde bezig</span>
      </div>
      <div class="scorecard-progress">
        <div>
          <b id="uxHoleLabel">Hole 1 van 1</b>
          <span id="uxHolePlayed">0 holes gespeeld</span>
        </div>
        <div class="scorecard-nav-buttons">
          <button type="button" class="secondary ux-prev">‹ Vorige</button>
          <button type="button" class="primary ux-next">Volgende ›</button>
        </div>
      </div>
      <div class="scorecard-dots" id="uxScoreDots"></div>`;
    rows.parentElement.insertBefore(controls, rows);

    controls.querySelector('.ux-prev').addEventListener('click', () => {
      if (currentIndex > 0) { currentIndex -= 1; apply(); }
    });
    controls.querySelector('.ux-next').addEventListener('click', () => {
      const list = holes();
      if (currentIndex < list.length - 1) { currentIndex += 1; apply(); }
    });
  }

  function apply() {
    if (applying) return;
    const list = holes();
    if (!list.length) return;
    applying = true;
    currentIndex = Math.max(0, Math.min(currentIndex, list.length - 1));
    list.forEach((el, i) => el.classList.toggle('ux-active-hole', i === currentIndex));
    const active = list[currentIndex];
    const number = active.querySelector('.hole-no b')?.textContent || String(currentIndex + 1);
    const score = active.querySelector('.score')?.textContent || '—';
    const subtitle = document.getElementById('scoreSubtitle')?.textContent || '';
    const label = document.getElementById('uxHoleLabel');
    const played = document.getElementById('uxHolePlayed');
    const dots = document.getElementById('uxScoreDots');
    const sub = document.getElementById('uxScoreSubtitle');
    if (label) label.textContent = `Hole ${number} van ${list.length}`;
    if (played) {
      const playedCount = list.filter(h => (h.querySelector('.score')?.textContent || '—') !== '—').length;
      played.textContent = `${playedCount} ${playedCount === 1 ? 'hole' : 'holes'} gespeeld`;
    }
    if (sub) sub.textContent = subtitle;
    if (dots) dots.innerHTML = list.map((_, i) => `<span class="score-dot ${i === currentIndex ? 'active' : i < currentIndex ? 'done' : ''}"></span>`).join('');
    const prev = controls?.querySelector('.ux-prev');
    const next = controls?.querySelector('.ux-next');
    if (prev) prev.disabled = currentIndex === 0;
    if (next) next.disabled = currentIndex === list.length - 1;
    const resume = controls?.querySelector('.scorecard-resume');
    if (resume) resume.textContent = currentIndex > 0 || list.some(h => (h.querySelector('.score')?.textContent || '—') !== '—') ? '🟢 Ronde hervat' : '🟢 Ronde bezig';
    if (score && active !== document.activeElement) active.scrollIntoView({block:'nearest', behavior:'auto'});
    lastCount = list.length;
    applying = false;
  }

  buildControls();
  const observer = new MutationObserver(() => {
    const count = holes().length;
    if (count && count !== lastCount) currentIndex = Math.min(currentIndex, count - 1);
    requestAnimationFrame(apply);
  });
  observer.observe(rows, {childList:true, subtree:true});

  root.addEventListener('click', (event) => {
    if (!event.target.closest('[data-act],[data-extra],[data-stats],[data-note]')) return;
    requestAnimationFrame(apply);
  });
})();
