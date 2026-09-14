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

    for (const type of ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend', 'keydown', 'keyup']) {
      document.addEventListener(type, event => {
        if (!window.PulsePlatform?.systemPaused) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      }, { capture: true, passive: false });
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