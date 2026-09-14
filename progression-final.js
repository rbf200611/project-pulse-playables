(() => {
  'use strict';

  const menu = document.getElementById('menuScreen');
  const victory = document.getElementById('victoryScreen');
  const stageLabel = document.getElementById('stageLabel');
  const bannerStage = document.getElementById('bannerStage');
  const scoreLabel = document.getElementById('scoreLabel');
  const startCampaign = document.getElementById('startCampaign');
  const endless = document.getElementById('startEndless');
  const musicBtn = document.getElementById('musicBtn');
  const fxBtn = document.getElementById('muteBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const victoryTitle = document.getElementById('victoryTitle');
  const victoryEyebrow = document.getElementById('victoryEyebrow');
  const victoryStats = document.getElementById('victoryStats');
  const actions = victory?.querySelector('.menu-actions');
  const introCard = menu?.querySelector('.intro-card');

  let act2Handled = false;

  function save() {
    try {
      if (window.PulsePlatform?.save) return window.PulsePlatform.save;
      return {
        ranks: JSON.parse(localStorage.getItem('pulseRanks') || '{}'),
        unlockedStage: Number(localStorage.getItem('pulseUnlockedStage') || 1),
        bestScore: Number(localStorage.getItem('pulseBestScore') || 0),
        settings: JSON.parse(localStorage.getItem('pulseSettings') || '{}')
      };
    } catch (_) { return { ranks:{}, unlockedStage:1, bestScore:0, settings:{} }; }
  }

  function setUnlocked(value) {
    const next = Math.max(1, Math.min(16, Number(value) || 1));
    if (window.PulsePlatform) {
      const current = window.PulsePlatform.save.unlockedStage || 1;
      if (next > current) window.PulsePlatform.setField('unlockedStage', next, true);
    } else {
      const current = Number(localStorage.getItem('pulseUnlockedStage') || 1);
      if (next > current) localStorage.setItem('pulseUnlockedStage', String(next));
    }
    updateMenuProgress();
  }

  function persistAudioSettings() {
    const next = {
      music: musicBtn?.getAttribute('aria-pressed') !== 'true',
      fx: fxBtn?.getAttribute('aria-pressed') !== 'true'
    };
    if (window.PulsePlatform) window.PulsePlatform.updateSettings(next, true);
    else {
      try {
        const old = JSON.parse(localStorage.getItem('pulseSettings') || '{}');
        localStorage.setItem('pulseSettings', JSON.stringify({...old,...next}));
      } catch (_) {}
    }
  }

  function rankCount() {
    return Object.values(save().ranks || {}).filter(v => v === 'S').length;
  }

  // Keep the primary play controls high in the card so they never get pushed below the fold.
  const menuActions = introCard?.querySelector('.menu-actions');
  const legend = introCard?.querySelector('.legend');
  if (introCard && menuActions && legend) introCard.insertBefore(menuActions, legend);

  const progress = document.createElement('div');
  progress.className = 'campaign-progress';
  progress.innerHTML = '<span>CAMPAIGN</span><strong>1 / 16</strong><i></i><small>0 S-RANKS</small>';
  if (introCard) {
    const tiny = introCard.querySelector('.tiny');
    if (tiny) introCard.insertBefore(progress, tiny);
    else introCard.appendChild(progress);
  }

  const continueBtn = document.createElement('button');
  continueBtn.className = 'primary continue-final';
  continueBtn.id = 'continueCampaign';
  continueBtn.type = 'button';
  continueBtn.hidden = true;
  continueBtn.textContent = 'CONTINUE CAMPAIGN';
  if (endless?.parentElement) endless.parentElement.insertBefore(continueBtn, endless);

  function updateMenuProgress() {
    const s = save();
    const unlocked = Math.max(1, Math.min(16, s.unlockedStage || 1));
    progress.querySelector('strong').textContent = `${Math.min(16, unlocked)} / 16`;
    progress.querySelector('i').style.width = `${Math.max(2, (unlocked / 16) * 100)}%`;
    progress.querySelector('small').textContent = `${rankCount()} S-RANK${rankCount() === 1 ? '' : 'S'}`;
    continueBtn.hidden = unlocked < 9;
    continueBtn.textContent = unlocked >= 16 ? 'REPLAY ACT IV' : `CONTINUE — STAGE ${String(Math.max(9, unlocked)).padStart(2,'0')}`;
  }

  continueBtn.addEventListener('click', () => {
    const unlocked = Math.max(9, Math.min(16, save().unlockedStage || 9));
    resumeBtn?.click();
    window.PulseFinal?.start(unlocked, Number(scoreLabel?.textContent || 0));
  });

  function normalizeStageCount(node) {
    if (!node) return;
    const value = node.textContent || '';
    if (/STAGE\s+\d+\s*\/\s*0?8/i.test(value)) node.textContent = value.replace(/\/\s*0?8/i, '/ 16');
  }

  const labelObserver = new MutationObserver(() => {
    normalizeStageCount(stageLabel);
    normalizeStageCount(bannerStage);
    const m = (stageLabel?.textContent || '').match(/STAGE\s+(\d+)/i);
    if (m) setUnlocked(Number(m[1]));
  });
  if (stageLabel) labelObserver.observe(stageLabel, {childList:true,subtree:true,characterData:true});
  if (bannerStage) labelObserver.observe(bannerStage, {childList:true,subtree:true,characterData:true});
  normalizeStageCount(stageLabel);
  normalizeStageCount(bannerStage);

  const continueActBtn = document.createElement('button');
  continueActBtn.className = 'primary';
  continueActBtn.id = 'continueActThree';
  continueActBtn.type = 'button';
  continueActBtn.textContent = 'CONTINUE — ACT III';
  continueActBtn.hidden = true;
  actions?.prepend(continueActBtn);

  continueActBtn.addEventListener('click', () => {
    victory?.classList.remove('active');
    continueActBtn.hidden = true;
    act2Handled = false;
    setUnlocked(9);
    window.PulseFinal?.start(9, Number(scoreLabel?.textContent || 0));
  });

  function handlePrototypeVictory() {
    if (!victory?.classList.contains('active') || window.PulseFinal?.active) return;
    const stage = Number((stageLabel?.textContent || '').match(/STAGE\s+(\d+)/i)?.[1] || 0);
    if (stage !== 8 || act2Handled) return;
    act2Handled = true;
    setUnlocked(9);
    victoryEyebrow.textContent = 'ACT II COMPLETE';
    victoryTitle.innerHTML = 'THE FRACTURE<br>OPENS.';
    const old = victoryStats.textContent || '';
    victoryStats.textContent = `${old} • Eight more stages detected.`;
    continueActBtn.hidden = false;
    document.getElementById('replayBtn')?.classList.add('tertiary-choice');
    window.PulsePlatform?.sendScore?.(Number(scoreLabel?.textContent || 0));
  }

  const victoryObserver = new MutationObserver(handlePrototypeVictory);
  if (victory) victoryObserver.observe(victory, {attributes:true,attributeFilter:['class']});

  startCampaign?.addEventListener('click', () => {
    act2Handled = false;
    continueActBtn.hidden = true;
    setUnlocked(1);
  });

  function applySystemAudio(enabled) {
    document.documentElement.classList.toggle('pulse-system-muted', !enabled);
  }

  function restoreAudioSettings() {
    const settings = save().settings || {};
    if (settings.music === false && musicBtn?.getAttribute('aria-pressed') !== 'true') musicBtn.click();
    if (settings.fx === false && fxBtn?.getAttribute('aria-pressed') !== 'true') fxBtn.click();
  }

  musicBtn?.addEventListener('click', persistAudioSettings);
  fxBtn?.addEventListener('click', persistAudioSettings);

  window.addEventListener('pulse:system-audio', e => applySystemAudio(Boolean(e.detail?.enabled)));
  window.addEventListener('pulse:system-pause', () => {
    if (!window.PulseFinal?.active && pauseBtn?.textContent === 'PAUSE' && !menu?.classList.contains('active') && !victory?.classList.contains('active')) pauseBtn.click();
  });
  window.addEventListener('pulse:system-resume', () => {
    if (!window.PulseFinal?.active && pauseBtn?.textContent === 'RESUME') resumeBtn?.click();
  });

  window.addEventListener('pulse:campaign-complete', e => {
    setUnlocked(16);
    window.PulsePlatform?.sendScore?.(e.detail?.score || 0);
    updateMenuProgress();
  });

  window.PulsePlatform?.ready?.then(() => {
    restoreAudioSettings();
    updateMenuProgress();
    if (window.PulsePlatform.inPlayables) applySystemAudio(window.PulsePlatform.systemAudioEnabled);
  });

  updateMenuProgress();
})();