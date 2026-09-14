(() => {
  'use strict';

  const stageLabel = document.getElementById('stageLabel');
  const stageName = document.getElementById('stageName');
  const gameCard = document.getElementById('gameCard');
  const topActions = document.querySelector('.top-actions');
  const startButtons = ['startCampaign','startEndless','replayBtn','victoryEndlessBtn'].map(id => document.getElementById(id)).filter(Boolean);

  function mirrorProgress() {
    try {
      const best = sessionStorage.getItem('pulseBest');
      const ranks = sessionStorage.getItem('pulseRanks');
      if (best !== null) localStorage.setItem('pulseBest', best);
      if (ranks !== null) localStorage.setItem('pulseRanks', ranks);
    } catch (_) {}
  }
  if (!window.PulsePlatform?.inPlayables) {
    setInterval(mirrorProgress, 1000);
    window.addEventListener('pagehide', mirrorProgress);
    window.addEventListener('beforeunload', mirrorProgress);
  }

  const reduceBtn = document.createElement('button');
  reduceBtn.id = 'reduceFxBtn';
  reduceBtn.type = 'button';
  reduceBtn.setAttribute('aria-pressed', document.documentElement.classList.contains('reduced-effects') ? 'true' : 'false');
  reduceBtn.textContent = document.documentElement.classList.contains('reduced-effects') ? 'REDUCED FX ON' : 'REDUCED FX OFF';
  topActions?.insertBefore(reduceBtn, document.getElementById('pauseBtn'));

  reduceBtn.addEventListener('click', () => {
    const on = !document.documentElement.classList.contains('reduced-effects');
    document.documentElement.classList.toggle('reduced-effects', on);
    reduceBtn.setAttribute('aria-pressed', String(on));
    reduceBtn.textContent = on ? 'REDUCED FX ON' : 'REDUCED FX OFF';
    try { localStorage.setItem('pulseSettings', JSON.stringify({ reducedFx: on })); } catch (_) {}
  });

  const actOverlay = document.createElement('div');
  actOverlay.className = 'act-overlay';
  actOverlay.innerHTML = '<small></small><strong></strong><span></span>';
  gameCard?.appendChild(actOverlay);

  const acts = [
    { min:1, max:2, code:'ACT I', title:'IGNITION', line:'Learn the rhythm. Trust the Pulse.' },
    { min:3, max:4, code:'ACT II', title:'PRESSURE', line:'Timing tightens. Reality fights back.' },
    { min:5, max:6, code:'ACT III', title:'HUNTED', line:'The system has noticed you.' },
    { min:7, max:8, code:'ACT IV', title:'COLLAPSE', line:'No more training. Break the Hunter.' }
  ];
  let lastAct = '';
  let actTimer = null;
  let platformPaused = false;

  function stageNumber() {
    const m = (stageLabel?.textContent || '').match(/STAGE\s+(\d+)/i);
    return m ? Number(m[1]) : 0;
  }

  function maybeShowAct() {
    if (platformPaused) return;
    const n = stageNumber();
    if (!n) return;
    const act = acts.find(a => n >= a.min && n <= a.max);
    if (!act || act.code === lastAct) return;
    lastAct = act.code;
    actOverlay.querySelector('small').textContent = act.code;
    actOverlay.querySelector('strong').textContent = act.title;
    actOverlay.querySelector('span').textContent = act.line;
    actOverlay.classList.add('show');
    clearTimeout(actTimer);
    actTimer = setTimeout(() => actOverlay.classList.remove('show'), 1650);
  }

  const observer = new MutationObserver(maybeShowAct);
  if (stageLabel) observer.observe(stageLabel, { childList:true, characterData:true, subtree:true });
  if (stageName) observer.observe(stageName, { childList:true, characterData:true, subtree:true });

  const tutorial = document.createElement('div');
  tutorial.className = 'first-run-guide';
  tutorial.innerHTML = '<div><b>LEFT / SPACE</b><span>JUMP</span></div><div><b>RIGHT / X</b><span>PULSE</span></div>';
  gameCard?.appendChild(tutorial);

  let guideTimer = null;
  startButtons.forEach(btn => btn.addEventListener('click', () => {
    if (platformPaused) return;
    clearTimeout(guideTimer);
    const firstCampaign = btn.id === 'startCampaign' || btn.id === 'replayBtn';
    tutorial.classList.toggle('show', firstCampaign);
    if (firstCampaign) guideTimer = setTimeout(() => tutorial.classList.remove('show'), 6500);
  }));

  document.getElementById('jumpBtn')?.addEventListener('pointerdown', () => tutorial.classList.remove('show'));
  document.getElementById('pulseBtn')?.addEventListener('pointerdown', () => tutorial.classList.remove('show'));
  window.addEventListener('keydown', e => {
    if (platformPaused) return;
    if ([' ', 'x', 'w', 'arrowup'].includes(e.key.toLowerCase())) tutorial.classList.remove('show');
  });

  window.addEventListener('pulse:system-pause', () => {
    platformPaused = true;
    clearTimeout(actTimer); actTimer = null;
    clearTimeout(guideTimer); guideTimer = null;
    actOverlay.classList.remove('show');
    tutorial.classList.remove('show');
  });
  window.addEventListener('pulse:system-resume', () => { platformPaused = false; });

  if ('matchMedia' in window) {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches && !document.documentElement.classList.contains('reduced-effects')) {
      document.documentElement.classList.add('reduced-effects');
      reduceBtn.setAttribute('aria-pressed', 'true');
      reduceBtn.textContent = 'REDUCED FX ON';
    }
  }
})();