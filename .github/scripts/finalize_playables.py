from pathlib import Path


def rep(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing expected block: {label}")
    return text.replace(old, new, 1)


# Audio unlock must never override YouTube pause/mute.
p = Path("audio-unlock.js")
t = p.read_text(encoding="utf-8")
t = rep(
    t,
    "  const contexts = new Set();\n",
    "  const contexts = new Set();\n\n  function platformAllowsAudio() {\n    const platform = window.PulsePlatform;\n    return !platform?.inPlayables || (!platform.systemPaused && platform.systemAudioEnabled);\n  }\n",
    "audio allow gate",
)
t = rep(
    t,
    "  function unlockContext(context) {\n    if (!context || context.state === 'closed') return;",
    "  function unlockContext(context) {\n    if (!platformAllowsAudio() || !context || context.state === 'closed') return;",
    "audio unlock guard",
)
t = rep(
    t,
    """  function onUserGesture() {
    // Resume contexts that already exist, then run again after the current
    // gesture finishes so contexts created by Start/Continue are included.
    unlockAll();
    queueMicrotask(unlockAll);
  }""",
    """  function suspendAll() {
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
  }""",
    "audio user gesture",
)
t = rep(
    t,
    "  document.addEventListener('keydown', onUserGesture, true);\n\n  window.PulseAudioUnlock = {",
    "  document.addEventListener('keydown', onUserGesture, true);\n  window.addEventListener('pulse:system-pause', suspendAll);\n  window.addEventListener('pulse:system-audio', event => { if (!event.detail?.enabled) suspendAll(); });\n\n  window.PulseAudioUnlock = {",
    "audio lifecycle listeners",
)
p.write_text(t, encoding="utf-8")


# Block game input at capture phase while YouTube says paused.
p = Path("bootstrap.js")
t = p.read_text(encoding="utf-8")
t = rep(
    t,
    """    if (quit) {
      quit.hidden = true;
      quit.style.display = 'none';
      quit.setAttribute('aria-hidden', 'true');
      quit.tabIndex = -1;
    }
  }""",
    """    if (quit) {
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
  }""",
    "bootstrap input freeze",
)
p.write_text(t, encoding="utf-8")


# Stage 1-8 banner timers stop during platform pause.
p = Path("game-v3.js")
t = p.read_text(encoding="utf-8")
t = rep(
    t,
    """  function handlePlatformPause() {
    platformPaused = true;
    pausedByPlatform = state.running && !state.paused;
    if (pausedByPlatform) togglePause(true);
    if (frameId) { cancelAnimationFrame(frameId); frameId = 0; }
    if (audioCtx?.state === 'running') audioCtx.suspend().catch(() => {});
  }""",
    """  function handlePlatformPause() {
    platformPaused = true;
    pausedByPlatform = state.running && !state.paused;
    if (pausedByPlatform) togglePause(true);
    clearTimeout(bannerTimeout);
    bannerTimeout = 0;
    ui.banner?.classList.remove('show');
    if (frameId) { cancelAnimationFrame(frameId); frameId = 0; }
    if (audioCtx?.state === 'running') audioCtx.suspend().catch(() => {});
  }""",
    "game-v3 pause timers",
)
p.write_text(t, encoding="utf-8")


# Final-act stage/act overlays stop during platform pause.
p = Path("final-act.js")
t = p.read_text(encoding="utf-8")
t = rep(
    t,
    "  let last = performance.now();\n  let bannerTimer = 0;\n  let audioCtx = null;",
    "  let last = performance.now();\n  let bannerTimer = 0;\n  let actOverlayTimer = 0;\n  let audioCtx = null;",
    "final timer variable",
)
t = rep(
    t,
    "    overlay.classList.add('show');\n    setTimeout(()=>overlay.classList.remove('show'),1900);",
    "    overlay.classList.add('show');\n    clearTimeout(actOverlayTimer);\n    actOverlayTimer=setTimeout(()=>overlay.classList.remove('show'),1900);",
    "final act overlay timer",
)
t = rep(
    t,
    "  function handlePlatformPause(){platformPaused=true;pausedByPlatform=state.active&&!state.paused;if(pausedByPlatform)togglePause(true);if(frameId){cancelAnimationFrame(frameId);frameId=0;}if(audioCtx?.state==='running')audioCtx.suspend().catch(()=>{});}",
    "  function handlePlatformPause(){platformPaused=true;pausedByPlatform=state.active&&!state.paused;if(pausedByPlatform)togglePause(true);clearTimeout(bannerTimer);clearTimeout(actOverlayTimer);bannerTimer=0;actOverlayTimer=0;ui.banner?.classList.remove('show');document.querySelector('.act-overlay')?.classList.remove('show');if(frameId){cancelAnimationFrame(frameId);frameId=0;}if(audioCtx?.state==='running')audioCtx.suspend().catch(()=>{});}",
    "final pause timers",
)
p.write_text(t, encoding="utf-8")


# Cosmetic timers stop in the YouTube environment.
p = Path("polish.js")
t = p.read_text(encoding="utf-8")
t = rep(
    t,
    "  setInterval(mirrorProgress, 1000);\n  window.addEventListener('pagehide', mirrorProgress);\n  window.addEventListener('beforeunload', mirrorProgress);",
    "  if (!window.PulsePlatform?.inPlayables) {\n    setInterval(mirrorProgress, 1000);\n    window.addEventListener('pagehide', mirrorProgress);\n    window.addEventListener('beforeunload', mirrorProgress);\n  }",
    "polish mirror timer",
)
t = rep(
    t,
    "  let lastAct = '';\n  let actTimer = null;",
    "  let lastAct = '';\n  let actTimer = null;\n  let platformPaused = false;",
    "polish lifecycle variable",
)
t = rep(
    t,
    "  function maybeShowAct() {\n    const n = stageNumber();",
    "  function maybeShowAct() {\n    if (platformPaused) return;\n    const n = stageNumber();",
    "polish act guard",
)
t = rep(
    t,
    "  startButtons.forEach(btn => btn.addEventListener('click', () => {\n    clearTimeout(guideTimer);",
    "  startButtons.forEach(btn => btn.addEventListener('click', () => {\n    if (platformPaused) return;\n    clearTimeout(guideTimer);",
    "polish guide guard",
)
t = rep(
    t,
    """  window.addEventListener('keydown', e => {
    if ([' ', 'x', 'w', 'arrowup'].includes(e.key.toLowerCase())) tutorial.classList.remove('show');
  });

  if ('matchMedia' in window) {""",
    """  window.addEventListener('keydown', e => {
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

  if ('matchMedia' in window) {""",
    "polish lifecycle listeners",
)
p.write_text(t, encoding="utf-8")


# Mechanic-intro countdowns freeze and continue from the same number.
p = Path("rift-tutorial.js")
t = p.read_text(encoding="utf-8")
t = rep(
    t,
    "  let activeStage = 0;\n  let countdownTimer = null;\n  const seen = new Set();",
    "  let activeStage = 0;\n  let countdownTimer = null;\n  let finishTimer = null;\n  let platformPaused = false;\n  let currentCount = 0;\n  let currentInterval = 0;\n  const seen = new Set();",
    "tutorial lifecycle vars",
)
t = rep(
    t,
    "  function finishTutorial(stage) {\n    clearInterval(countdownTimer);\n    countdownTimer = null;",
    "  function finishTutorial(stage) {\n    clearInterval(countdownTimer);\n    clearTimeout(finishTimer);\n    countdownTimer = null;\n    finishTimer = null;",
    "tutorial finish timers",
)
old_countdown = """    let count = tutorial.count;
    countNode.textContent = String(count);
    overlay.classList.add('show');

    const interval = stage === 9 ? 850 : 650;
    countdownTimer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        countNode.textContent = String(count);
        return;
      }
      clearInterval(countdownTimer);
      countdownTimer = null;
      countNode.textContent = 'GO';
      setTimeout(() => finishTutorial(stage), stage === 9 ? 340 : 260);
    }, interval);"""
new_countdown = """    currentCount = tutorial.count;
    currentInterval = stage === 9 ? 850 : 650;
    countNode.textContent = String(currentCount);
    overlay.classList.add('show');
    startCountdown(stage);"""
t = rep(t, old_countdown, new_countdown, "tutorial countdown")
helper = """  function startCountdown(stage) {
    if (platformPaused || activeStage !== stage) return;
    clearInterval(countdownTimer);
    clearTimeout(finishTimer);
    countdownTimer = null;
    finishTimer = null;
    if (currentCount <= 0) {
      countNode.textContent = 'GO';
      finishTimer = setTimeout(() => finishTutorial(stage), stage === 9 ? 340 : 260);
      return;
    }
    countdownTimer = setInterval(() => {
      currentCount -= 1;
      if (currentCount > 0) {
        countNode.textContent = String(currentCount);
        return;
      }
      clearInterval(countdownTimer);
      countdownTimer = null;
      countNode.textContent = 'GO';
      finishTimer = setTimeout(() => finishTutorial(stage), stage === 9 ? 340 : 260);
    }, currentInterval);
  }

"""
marker = "  function showTutorial(stage) {\n"
if marker not in t:
    raise SystemExit("Missing expected block: tutorial show marker")
t = t.replace(marker, helper + marker, 1)
t = rep(
    t,
    "    if (stage !== 9 && TUTORIALS[stage]) setTimeout(() => showTutorial(stage), 60);",
    "    if (stage !== 9 && TUTORIALS[stage]) showTutorial(stage);",
    "tutorial stage delay",
)
t = rep(
    t,
    """  const observer = new MutationObserver(detectStage);
  if (stageLabel) observer.observe(stageLabel, { childList:true, characterData:true, subtree:true });
  reinforceHint();""",
    """  const observer = new MutationObserver(detectStage);
  if (stageLabel) observer.observe(stageLabel, { childList:true, characterData:true, subtree:true });
  window.addEventListener('pulse:system-pause', () => {
    platformPaused = true;
    clearInterval(countdownTimer); countdownTimer = null;
    clearTimeout(finishTimer); finishTimer = null;
  });
  window.addEventListener('pulse:system-resume', () => {
    platformPaused = false;
    if (activeStage) startCountdown(activeStage);
  });
  reinforceHint();""",
    "tutorial lifecycle listeners",
)
p.write_text(t, encoding="utf-8")


# YouTube's master audio state gates output without rewriting player preferences.
p = Path("progression-final.js")
t = p.read_text(encoding="utf-8")
t = rep(
    t,
    "  let act2Handled = false;\n  let forcedMusic = false;\n  let forcedFx = false;\n  let applyingSystemAudio = false;",
    "  let act2Handled = false;",
    "progression audio vars",
)
t = rep(
    t,
    "  function persistAudioSettings() {\n    if (applyingSystemAudio) return;\n    const next = {",
    "  function persistAudioSettings() {\n    const next = {",
    "progression persistence gate",
)
t = rep(
    t,
    """  function applySystemAudio(enabled) {
    if (!musicBtn || !fxBtn) return;
    applyingSystemAudio = true;
    if (!enabled) {
      if (musicBtn.getAttribute('aria-pressed') !== 'true') { forcedMusic = true; musicBtn.click(); }
      if (fxBtn.getAttribute('aria-pressed') !== 'true') { forcedFx = true; fxBtn.click(); }
    } else {
      if (forcedMusic && musicBtn.getAttribute('aria-pressed') === 'true') musicBtn.click();
      if (forcedFx && fxBtn.getAttribute('aria-pressed') === 'true') fxBtn.click();
      forcedMusic = false; forcedFx = false;
    }
    applyingSystemAudio = false;
  }""",
    """  function applySystemAudio(enabled) {
    document.documentElement.classList.toggle('pulse-system-muted', !enabled);
  }""",
    "progression system audio",
)
t = rep(
    t,
    "  musicBtn?.addEventListener('click', () => setTimeout(persistAudioSettings, 0));\n  fxBtn?.addEventListener('click', () => setTimeout(persistAudioSettings, 0));",
    "  musicBtn?.addEventListener('click', persistAudioSettings);\n  fxBtn?.addEventListener('click', persistAudioSettings);",
    "progression setting timers",
)
p.write_text(t, encoding="utf-8")


# Platform state is reflected in DOM classes for rendering/audio gates.
p = Path("platform.js")
t = p.read_text(encoding="utf-8")
t = rep(
    t,
    "    window.__PULSE_SYSTEM_AUDIO__ = systemAudioEnabled;\n\n    window.ytgame.system.onAudioEnabledChange",
    "    window.__PULSE_SYSTEM_AUDIO__ = systemAudioEnabled;\n    document.documentElement.classList.toggle('pulse-system-muted', !systemAudioEnabled);\n\n    window.ytgame.system.onAudioEnabledChange",
    "platform initial audio class",
)
t = rep(
    t,
    "      systemAudioEnabled = Boolean(enabled);\n      window.__PULSE_SYSTEM_AUDIO__ = systemAudioEnabled;\n      dispatch('pulse:system-audio', { enabled: systemAudioEnabled });",
    "      systemAudioEnabled = Boolean(enabled);\n      window.__PULSE_SYSTEM_AUDIO__ = systemAudioEnabled;\n      document.documentElement.classList.toggle('pulse-system-muted', !systemAudioEnabled);\n      dispatch('pulse:system-audio', { enabled: systemAudioEnabled });",
    "platform audio class",
)
t = rep(
    t,
    """    window.ytgame.system.onPause(() => {
      systemPaused = true;
      scheduleSave(true);
      dispatch('pulse:system-pause');
    });

    window.ytgame.system.onResume(() => {
      systemPaused = false;
      dispatch('pulse:system-resume');
    });""",
    """    window.ytgame.system.onPause(() => {
      systemPaused = true;
      document.documentElement.classList.add('pulse-system-paused');
      scheduleSave(true);
      dispatch('pulse:system-pause');
    });

    window.ytgame.system.onResume(() => {
      systemPaused = false;
      document.documentElement.classList.remove('pulse-system-paused');
      dispatch('pulse:system-resume');
    });""",
    "platform pause classes",
)
p.write_text(t, encoding="utf-8")


# Freeze CSS-driven rendering too while YouTube is paused.
p = Path("styles.css")
t = p.read_text(encoding="utf-8")
marker = "/* YOUTUBE_PLAYABLES_PAUSE_FREEZE */"
if marker not in t:
    t += """

/* YOUTUBE_PLAYABLES_PAUSE_FREEZE */
.youtube-playables.pulse-system-paused *,
.youtube-playables.pulse-system-paused *::before,
.youtube-playables.pulse-system-paused *::after {
  animation-play-state: paused !important;
  transition: none !important;
}
.youtube-playables.pulse-system-paused body { pointer-events: none !important; }
"""
p.write_text(t, encoding="utf-8")

print("Playables lifecycle finalization applied")
