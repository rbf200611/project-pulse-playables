(() => {
  'use strict';

  const gameCard = document.getElementById('gameCard');
  const stageLabel = document.getElementById('stageLabel');
  const bannerHint = document.getElementById('bannerHint');
  const scoreLabel = document.getElementById('scoreLabel');
  const menu = document.getElementById('menuScreen');
  const victory = document.getElementById('victoryScreen');
  if (!gameCard) return;

  const TUTORIALS = {
    9: {
      kicker: 'ORANGE RIFT',
      title: 'RAPIDLY <span>PULSE</span>',
      rule: 'through the orange blocks.',
      hint: 'ORANGE RIFT — rapidly pulse through the orange blocks.',
      count: 3,
      prestart: true
    },
    11: {
      kicker: 'ECHO DRONE',
      title: 'READ THE <span>GLOW</span>',
      rule: 'It switches realities.',
      hint: 'ECHO DRONE — read the glow before you commit.',
      count: 2
    },
    14: {
      kicker: 'BLACKOUT',
      title: '<span>PULSE</span> TO SEE',
      rule: 'Your Pulse is the radar.',
      hint: 'BLACKOUT — pulse to reveal the road.',
      count: 2
    },
    16: {
      kicker: 'HUNTER PRIME',
      title: 'EIGHT <span>CORES</span>',
      rule: 'Hit every core. Survive.',
      hint: 'HUNTER PRIME — eight cores. One clean exit.',
      count: 2
    }
  };

  const style = document.createElement('style');
  style.textContent = `
    .rift-preflight{position:absolute;inset:0;z-index:80;display:grid;place-items:center;padding:22px;background:radial-gradient(circle at 50% 48%,rgba(255,143,72,.16),rgba(3,5,11,.94) 58%);opacity:0;pointer-events:none;transition:opacity .16s ease}.rift-preflight.show{opacity:1;pointer-events:auto}.rift-preflight-card{width:min(500px,92%);padding:22px 20px 20px;border:1px solid rgba(255,155,84,.55);border-radius:22px;background:rgba(8,9,18,.95);box-shadow:0 0 42px rgba(255,126,61,.2),inset 0 0 28px rgba(255,155,84,.05);text-align:center}.rift-preflight .rift-kicker{display:block;margin-bottom:7px;color:#ff9b54;font-size:.68rem;font-weight:950;letter-spacing:.2em}.rift-preflight h3{margin:0;color:#fff;font-size:clamp(1.8rem,5vw,3rem);line-height:.94;letter-spacing:.03em}.rift-preflight h3 span{color:#ffd25d}.rift-preflight .rift-rule{margin:13px 0 0;color:#fff;font-size:clamp(.92rem,2.4vw,1.12rem);font-weight:900;letter-spacing:.02em}.rift-preflight .rift-count{margin-top:17px;color:#ff9b54;font-size:.7rem;font-weight:950;letter-spacing:.16em}.rift-preflight .rift-count b{display:inline-block;min-width:1.2em;color:#fff;font-size:1.04rem}.reduced-effects .rift-preflight{transition:none}.reduced-effects .rift-preflight-card{box-shadow:none}@media(max-width:640px){.rift-preflight-card{padding:19px 15px 17px}}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'rift-preflight';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-live', 'assertive');
  overlay.setAttribute('aria-label', 'Project Pulse mechanic introduction');
  overlay.innerHTML = `
    <div class="rift-preflight-card">
      <span class="rift-kicker"></span>
      <h3></h3>
      <p class="rift-rule"></p>
      <div class="rift-count">RUN STARTS IN <b>3</b></div>
    </div>`;
  gameCard.appendChild(overlay);

  const kickerNode = overlay.querySelector('.rift-kicker');
  const titleNode = overlay.querySelector('h3');
  const ruleNode = overlay.querySelector('.rift-rule');
  const countWrap = overlay.querySelector('.rift-count');
  const countNode = overlay.querySelector('.rift-count b');

  let activeStage = 0;
  let countdownTimer = null;
  let finishTimer = null;
  let platformPaused = false;
  let currentCount = 0;
  let currentInterval = 0;
  const seen = new Set();

  function stageNumber() {
    return Number((stageLabel?.textContent || '').match(/STAGE\s+(\d+)/i)?.[1] || 0);
  }

  function savedUnlocked() {
    try {
      if (window.PulsePlatform?.save) return Number(window.PulsePlatform.save.unlockedStage || 1);
      return Number(localStorage.getItem('pulseUnlockedStage') || 1);
    } catch (_) { return 1; }
  }

  function reinforceHint(stage = stageNumber()) {
    const tutorial = TUTORIALS[stage];
    if (!tutorial || !bannerHint) return;
    if (bannerHint.textContent !== tutorial.hint) bannerHint.textContent = tutorial.hint;
  }

  function finishTutorial(stage) {
    clearInterval(countdownTimer);
    clearTimeout(finishTimer);
    countdownTimer = null;
    finishTimer = null;
    overlay.classList.remove('show');
    activeStage = 0;

    const tutorial = TUTORIALS[stage];
    if (tutorial?.prestart) {
      victory?.classList.remove('active');
      menu?.classList.remove('active');
      window.PulseFinal?.start(stage, Number(scoreLabel?.textContent || 0));
      return;
    }
    window.PulseFinal?.resume?.();
    reinforceHint(stage);
  }

  function startCountdown(stage) {
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

  function showTutorial(stage) {
    const tutorial = TUTORIALS[stage];
    if (!tutorial || seen.has(stage) || activeStage) return;

    seen.add(stage);
    activeStage = stage;
    clearInterval(countdownTimer);

    if (!tutorial.prestart && window.PulseFinal?.active) window.PulseFinal.pause?.();

    kickerNode.textContent = tutorial.kicker;
    titleNode.innerHTML = tutorial.title;
    ruleNode.textContent = tutorial.rule;
    countWrap.firstChild.textContent = 'RUN STARTS IN ';

    currentCount = tutorial.count;
    currentInterval = stage === 9 ? 850 : 650;
    countNode.textContent = String(currentCount);
    overlay.classList.add('show');
    startCountdown(stage);
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('#continueActThree')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showTutorial(9);
      return;
    }

    if (target.closest('#continueCampaign')) {
      const unlocked = Math.max(9, Math.min(16, savedUnlocked()));
      if (unlocked !== 9) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showTutorial(9);
    }
  }, true);

  let lastObservedStage = stageNumber();
  function detectStage() {
    const stage = stageNumber();
    if (!stage || stage === lastObservedStage) return;
    lastObservedStage = stage;
    reinforceHint(stage);
    if (stage !== 9 && TUTORIALS[stage]) showTutorial(stage);
  }

  const observer = new MutationObserver(detectStage);
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
  reinforceHint();
})();