(() => {
  'use strict';

  const NativeAudioContext = window.AudioContext || window.webkitAudioContext;
  if (!NativeAudioContext) return;

  const contexts = new Set();

  function platformAllowsAudio() {
    const platform = window.PulsePlatform;
    return !platform?.inPlayables || (!platform.systemPaused && platform.systemAudioEnabled);
  }

  function track(context) {
    if (context) contexts.add(context);
    return context;
  }

  function TrackedAudioContext(...args) {
    return track(new NativeAudioContext(...args));
  }

  try {
    TrackedAudioContext.prototype = NativeAudioContext.prototype;
    Object.setPrototypeOf(TrackedAudioContext, NativeAudioContext);
    window.AudioContext = TrackedAudioContext;
    if (window.webkitAudioContext) window.webkitAudioContext = TrackedAudioContext;
  } catch (_) {
    // If the browser prevents replacing the constructor, the normal audio path remains intact.
  }

  function prime(context) {
    if (!context || context.state === 'closed') return;
    try {
      const buffer = context.createBuffer(1, 1, Math.max(22050, context.sampleRate || 44100));
      const source = context.createBufferSource();
      const gain = context.createGain();
      gain.gain.value = 0;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(context.destination);
      source.start(0);
    } catch (_) {}
  }

  function unlockContext(context) {
    if (!platformAllowsAudio() || !context || context.state === 'closed') return;
    try {
      if (context.state === 'suspended' || context.state === 'interrupted') {
        const resumed = context.resume();
        if (resumed && typeof resumed.then === 'function') {
          resumed.then(() => prime(context)).catch(() => {});
        } else {
          prime(context);
        }
      } else {
        prime(context);
      }
    } catch (_) {}
  }

  function unlockAll() {
    contexts.forEach(unlockContext);
  }

  function suspendAll() {
    contexts.forEach(context => {
      if (context?.state === 'running') {
        try { context.suspend().catch(() => {}); } catch (_) {}
      }
    });
  }

  function onUserGesture() {
    if (!platformAllowsAudio()) return;
    // Resume contexts that already exist, then run again after the current
    // gesture finishes so contexts created by Start/Continue are included.
    unlockAll();
    queueMicrotask(() => { if (platformAllowsAudio()) unlockAll(); });
  }

  document.addEventListener('pointerdown', onUserGesture, true);
  document.addEventListener('touchend', onUserGesture, { capture: true, passive: true });
  document.addEventListener('click', onUserGesture, true);
  document.addEventListener('keydown', onUserGesture, true);
  window.addEventListener('pulse:system-pause', suspendAll);
  window.addEventListener('pulse:system-audio', event => { if (!event.detail?.enabled) suspendAll(); });

  window.PulseAudioUnlock = {
    track,
    unlock: unlockAll,
    get contexts() { return contexts.size; }
  };
})();
