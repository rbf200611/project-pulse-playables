(() => {
  'use strict';

  const KEYS = ['pulseBest', 'pulseRanks'];

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