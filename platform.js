(() => {
  'use strict';

  const SAVE_KEY = 'projectPulseSaveV1';
  const SAVE_VERSION = 1;
  const inPlayables = typeof window.ytgame !== 'undefined' && window.ytgame.IN_PLAYABLES_ENV === true;

  const defaults = () => ({
    version: SAVE_VERSION,
    bestEndless: 0,
    bestScore: 0,
    ranks: {},
    unlockedStage: 1,
    settings: { reducedFx: false, music: true, fx: true },
    achievements: []
  });

  let save = defaults();
  let loaded = false;
  let saving = false;
  let queuedSave = false;
  let systemAudioEnabled = true;
  let systemPaused = false;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  function safeParse(raw, fallback = null) {
    try { return raw ? JSON.parse(raw) : fallback; }
    catch (_) { return fallback; }
  }

  function mergeSave(input) {
    const base = defaults();
    if (!input || typeof input !== 'object') return base;
    return {
      ...base,
      ...input,
      version: SAVE_VERSION,
      ranks: input.ranks && typeof input.ranks === 'object' ? input.ranks : {},
      settings: { ...base.settings, ...(input.settings || {}) },
      achievements: Array.isArray(input.achievements) ? [...new Set(input.achievements)] : []
    };
  }

  function legacyLocalSave() {
    const candidate = safeParse(localStorage.getItem(SAVE_KEY), null);
    if (candidate) return mergeSave(candidate);

    const ranks = safeParse(localStorage.getItem('pulseRanks'), {});
    const settings = safeParse(localStorage.getItem('pulseSettings'), {});
    const bestEndless = Number(localStorage.getItem('pulseBest') || 0);
    return mergeSave({ bestEndless, ranks, settings });
  }

  function serialize() {
    return JSON.stringify({ ...save, version: SAVE_VERSION });
  }

  async function saveNow() {
    if (!loaded) return;
    if (saving) { queuedSave = true; return; }
    saving = true;
    try {
      const data = serialize();
      if (inPlayables) {
        await window.ytgame.game.saveData(data);
      } else {
        localStorage.setItem(SAVE_KEY, data);
      }
    } catch (_) {
      try { if (inPlayables) window.ytgame.health?.logWarning?.(); } catch (_) {}
    } finally {
      saving = false;
      if (queuedSave) {
        queuedSave = false;
        setTimeout(saveNow, 0);
      }
    }
  }

  let saveDebounce = 0;
  function scheduleSave(immediate = false) {
    if (!loaded) return;
    clearTimeout(saveDebounce);
    if (immediate) saveNow();
    else saveDebounce = setTimeout(saveNow, 180);
  }

  function setField(key, value, immediate = false) {
    save[key] = value;
    scheduleSave(immediate);
  }

  function updateSettings(next, immediate = false) {
    save.settings = { ...save.settings, ...next };
    scheduleSave(immediate);
  }

  function getSnapshot() {
    return JSON.parse(JSON.stringify(save));
  }

  function compatValue(key) {
    if (key === 'pulseBest') return String(save.bestEndless || 0);
    if (key === 'pulseRanks') return JSON.stringify(save.ranks || {});
    if (key === 'pulseSettings') return JSON.stringify(save.settings || {});
    return null;
  }

  function compatSet(key, raw) {
    if (key === 'pulseBest') {
      save.bestEndless = Math.max(0, Number(raw) || 0);
      scheduleSave(true);
      return true;
    }
    if (key === 'pulseRanks') {
      save.ranks = safeParse(raw, {}) || {};
      scheduleSave(true);
      return true;
    }
    if (key === 'pulseSettings') {
      save.settings = { ...save.settings, ...(safeParse(raw, {}) || {}) };
      scheduleSave();
      return true;
    }
    return false;
  }

  function installStorageCompatibility() {
    if (!inPlayables || !window.Storage) return;
    const nativeGet = Storage.prototype.getItem;
    const nativeSet = Storage.prototype.setItem;
    const nativeRemove = Storage.prototype.removeItem;
    const keys = new Set(['pulseBest', 'pulseRanks', 'pulseSettings']);

    Storage.prototype.getItem = function(key) {
      if (keys.has(String(key)) && (this === window.localStorage || this === window.sessionStorage)) {
        return compatValue(String(key));
      }
      return nativeGet.call(this, key);
    };

    Storage.prototype.setItem = function(key, value) {
      if (keys.has(String(key)) && (this === window.localStorage || this === window.sessionStorage)) {
        compatSet(String(key), String(value));
        return;
      }
      return nativeSet.call(this, key, value);
    };

    Storage.prototype.removeItem = function(key) {
      if (keys.has(String(key)) && (this === window.localStorage || this === window.sessionStorage)) {
        if (key === 'pulseBest') save.bestEndless = 0;
        if (key === 'pulseRanks') save.ranks = {};
        if (key === 'pulseSettings') save.settings = defaults().settings;
        scheduleSave(true);
        return;
      }
      return nativeRemove.call(this, key);
    };
  }

  function dispatch(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function setupSystemHooks() {
    if (!inPlayables) return;

    try {
      systemAudioEnabled = window.ytgame.system.isAudioEnabled();
    } catch (_) {
      systemAudioEnabled = true;
    }
    window.__PULSE_SYSTEM_AUDIO__ = systemAudioEnabled;

    window.ytgame.system.onAudioEnabledChange(enabled => {
      systemAudioEnabled = Boolean(enabled);
      window.__PULSE_SYSTEM_AUDIO__ = systemAudioEnabled;
      dispatch('pulse:system-audio', { enabled: systemAudioEnabled });
    });

    window.ytgame.system.onPause(() => {
      systemPaused = true;
      scheduleSave(true);
      dispatch('pulse:system-pause');
    });

    window.ytgame.system.onResume(() => {
      systemPaused = false;
      dispatch('pulse:system-resume');
    });
  }

  async function init() {
    installStorageCompatibility();

    if (inPlayables) {
      try {
        const raw = await window.ytgame.game.loadData();
        save = mergeSave(safeParse(raw, null));
      } catch (_) {
        save = defaults();
        try { window.ytgame.health?.logWarning?.(); } catch (_) {}
      }
    } else {
      try { save = legacyLocalSave(); }
      catch (_) { save = defaults(); }
    }

    loaded = true;
    setupSystemHooks();
    resolveReady(getSnapshot());
    dispatch('pulse:platform-ready', { inPlayables, save: getSnapshot() });
  }

  function firstFrameReady() {
    if (!inPlayables) return;
    try { window.ytgame.game.firstFrameReady(); }
    catch (_) { try { window.ytgame.health?.logWarning?.(); } catch (_) {} }
  }

  function gameReady() {
    if (!inPlayables) return;
    try { window.ytgame.game.gameReady(); }
    catch (_) { try { window.ytgame.health?.logWarning?.(); } catch (_) {} }
  }

  async function sendScore(value) {
    const score = Math.max(0, Math.floor(Number(value) || 0));
    if (score > (save.bestScore || 0)) {
      save.bestScore = score;
      scheduleSave(true);
    }
    if (!inPlayables) return;
    try { await window.ytgame.engagement.sendScore({ value: save.bestScore }); }
    catch (_) { try { window.ytgame.health?.logWarning?.(); } catch (_) {} }
  }

  window.PulsePlatform = {
    inPlayables,
    ready,
    get loaded() { return loaded; },
    get systemAudioEnabled() { return systemAudioEnabled; },
    get systemPaused() { return systemPaused; },
    get save() { return getSnapshot(); },
    setField,
    updateSettings,
    saveNow,
    sendScore,
    firstFrameReady,
    gameReady
  };

  init();
})();