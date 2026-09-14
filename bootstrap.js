(() => {
  'use strict';

  const KEYS = ['pulseBest', 'pulseRanks'];

  if (window.PulsePlatform?.inPlayables) {
    document.documentElement.classList.add('youtube-playables');
    const quit = document.getElementById('quitBtn');
    if (quit) {
      quit.hidden = true;
      quit.style.display = 'none';
      quit.setAttribute('aria-hidden', 'true');
      quit.tabIndex = -1;
    }
  }

  for (const key of KEYS) {
    try {
      const persistent = localStorage.getItem(key);
      const session = sessionStorage.getItem(key);
      if (persistent !== null && (session === null || session === '' || session === '0' || session === '{}')) {
        sessionStorage.setItem(key, persistent);
      }
    } catch (_) {}
  }

  try {
    const saved = JSON.parse(localStorage.getItem('pulseSettings') || '{}');
    window.__PULSE_SETTINGS__ = { reducedFx: Boolean(saved.reducedFx) };
    if (window.__PULSE_SETTINGS__.reducedFx) document.documentElement.classList.add('reduced-effects');
  } catch (_) {
    window.__PULSE_SETTINGS__ = { reducedFx: false };
  }
})();