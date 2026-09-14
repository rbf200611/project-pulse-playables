(() => {
  'use strict';

  const scripts = ['bootstrap.js', 'game-v3.js', 'music.js', 'polish.js'];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(s);
    });
  }

  function logPlatformError() {
    try {
      if (window.PulsePlatform?.inPlayables) window.ytgame.health?.logError?.();
    } catch (_) {}
  }

  window.addEventListener('error', logPlatformError);
  window.addEventListener('unhandledrejection', logPlatformError);

  async function boot() {
    try {
      if (!window.PulsePlatform) throw new Error('PulsePlatform missing');
      await window.PulsePlatform.ready;

      for (const src of scripts) await loadScript(src);

      requestAnimationFrame(() => {
        window.PulsePlatform.firstFrameReady();
        requestAnimationFrame(() => {
          window.PulsePlatform.gameReady();
          document.documentElement.classList.add('pulse-ready');
        });
      });
    } catch (error) {
      console.error(error);
      logPlatformError();
      document.documentElement.classList.add('pulse-boot-error');
      const card = document.getElementById('gameCard');
      if (card) {
        const msg = document.createElement('div');
        msg.className = 'boot-error';
        msg.innerHTML = '<strong>PROJECT PULSE COULD NOT START</strong><span>Please reload and try again.</span>';
        card.appendChild(msg);
      }
    }
  }

  boot();
})();