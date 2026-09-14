(() => {
  'use strict';

  const gameCard = document.getElementById('gameCard');
  const stageLabel = document.getElementById('stageLabel');
  const bannerHint = document.getElementById('bannerHint');
  const scoreLabel = document.getElementById('scoreLabel');
  const menu = document.getElementById('menuScreen');
  const victory = document.getElementById('victoryScreen');
  if (!gameCard) return;

  const style = document.createElement('style');
  style.textContent = `
    .rift-preflight{position:absolute;inset:0;z-index:80;display:grid;place-items:center;padding:22px;background:radial-gradient(circle at 50% 48%,rgba(255,143,72,.16),rgba(3,5,11,.94) 58%);opacity:0;pointer-events:none;transition:opacity .18s ease}.rift-preflight.show{opacity:1;pointer-events:auto}.rift-preflight-card{width:min(560px,92%);padding:26px 24px 24px;border:1px solid rgba(255,155,84,.55);border-radius:22px;background:rgba(8,9,18,.94);box-shadow:0 0 44px rgba(255,126,61,.22),inset 0 0 30px rgba(255,155,84,.05);text-align:center}.rift-preflight .rift-kicker{display:block;margin-bottom:7px;color:#ff9b54;font-size:.68rem;font-weight:950;letter-spacing:.2em}.rift-preflight h3{margin:0;color:#fff;font-size:clamp(1.8rem,5vw,3.1rem);line-height:.94;letter-spacing:.03em}.rift-preflight h3 span{color:#ffd25d}.rift-preflight .rift-rule{margin:15px 0 7px;color:#fff;font-size:clamp(.92rem,2.4vw,1.15rem);font-weight:900;letter-spacing:.02em}.rift-preflight .rift-explain{margin:0 auto;max-width:440px;color:#aebbd2;font-size:.78rem;line-height:1.5}.rift-preflight .rift-count{margin-top:18px;color:#ff9b54;font-size:.72rem;font-weight:950;letter-spacing:.16em}.rift-preflight .rift-count b{display:inline-block;min-width:1.2em;color:#fff;font-size:1.05rem}.reduced-effects .rift-preflight{transition:none}.reduced-effects .rift-preflight-card{box-shadow:none}@media(max-width:640px){.rift-preflight-card{padding:22px 17px 20px}.rift-preflight .rift-explain{font-size:.72rem}}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'rift-preflight';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-live', 'assertive');
  overlay.setAttribute('aria-label', 'Stage 9 orange Rift tutorial');
  overlay.innerHTML = `
    <div class="rift-preflight-card">
      <span class="rift-kicker">NEW THREAT • ORANGE RIFT</span>
      <h3>PINPOINT <span>PULSE</span></h3>
      <p class="rift-rule">Not too early. Not too late.<br>Pulse as the Rift reaches you.</p>
      <p class="rift-explain">Orange Rifts exist in both realities. Switching color alone will not save you. Pinpoint pulsing gets you through.</p>
      <div class="rift-count">RUN STARTS IN <b>3</b></div>
    </div>`;
  gameCard.appendChild(overlay);

  const countNode = overlay.querySelector('.rift-count b');
  let preflightActive = false;
  let countdownTimer = null;

  function savedUnlocked() {
    try {
      if (window.PulsePlatform?.save) return Number(window.PulsePlatform.save.unlockedStage || 1);
      return Number(localStorage.getItem('pulseUnlockedStage') || 1);
    } catch (_) { return 1; }
  }

  function beginStageNine() {
    preflightActive = false;
    clearInterval(countdownTimer);
    overlay.classList.remove('show');
    victory?.classList.remove('active');
    menu?.classList.remove('active');
    window.PulseFinal?.start(9, Number(scoreLabel?.textContent || 0));
  }

  function showPreflight() {
    if (preflightActive) return;
    preflightActive = true;
    let count = 3;
    countNode.textContent = String(count);
    overlay.classList.add('show');
    countdownTimer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        countNode.textContent = String(count);
        return;
      }
      clearInterval(countdownTimer);
      countNode.textContent = 'GO';
      setTimeout(beginStageNine, 420);
    }, 1000);
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('#continueActThree')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showPreflight();
      return;
    }

    if (target.closest('#continueCampaign')) {
      const unlocked = Math.max(9, Math.min(16, savedUnlocked()));
      if (unlocked !== 9) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showPreflight();
    }
  }, true);

  function reinforceHint() {
    const m = (stageLabel?.textContent || '').match(/STAGE\s+(\d+)/i);
    if (Number(m?.[1] || 0) === 9 && bannerHint) {
      bannerHint.textContent = 'PINPOINT PULSE — not too early, not too late. Pulse as the orange Rift reaches you.';
    }
  }

  const observer = new MutationObserver(() => setTimeout(reinforceHint, 0));
  if (stageLabel) observer.observe(stageLabel, { childList:true, characterData:true, subtree:true });
  if (bannerHint) observer.observe(bannerHint, { childList:true, characterData:true, subtree:true });
})();