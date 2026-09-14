(() => {
  'use strict';

  // CAMPAIGN_DURATION_TUNE_V1: +15% stage distance, +12% obstacle spacing.

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  const ui = {
    menu: document.getElementById('menuScreen'),
    pause: document.getElementById('pauseScreen'),
    victory: document.getElementById('victoryScreen'),
    startCampaign: document.getElementById('startCampaign'),
    startEndless: document.getElementById('startEndless'),
    replay: document.getElementById('replayBtn'),
    victoryEndless: document.getElementById('victoryEndlessBtn'),
    resume: document.getElementById('resumeBtn'),
    quit: document.getElementById('quitBtn'),
    mute: document.getElementById('muteBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    jump: document.getElementById('jumpBtn'),
    pulse: document.getElementById('pulseBtn'),
    stageLabel: document.getElementById('stageLabel'),
    stageName: document.getElementById('stageName'),
    score: document.getElementById('scoreLabel'),
    combo: document.getElementById('comboLabel'),
    meter: document.getElementById('overdriveFill'),
    banner: document.getElementById('stageBanner'),
    bannerStage: document.getElementById('bannerStage'),
    bannerName: document.getElementById('bannerName'),
    bannerHint: document.getElementById('bannerHint'),
    death: document.getElementById('deathFlash'),
    pulseFlash: document.getElementById('pulseFlash'),
    victoryStats: document.getElementById('victoryStats'),
    victoryTitle: document.getElementById('victoryTitle'),
    victoryEyebrow: document.getElementById('victoryEyebrow')
  };

  const W = 960;
  const H = 540;
  const FLOOR = 447;
  const CEILING = 86;
  const PLAYER_X = 176;
  const PLAYER_W = 34;
  const PLAYER_H = 46;
  const BASE_GRAVITY = 1800;
  const JUMP_POWER = 760;

  const COLORS = {
    cyan: '#55efff',
    magenta: '#ff43b8',
    white: '#f7fbff',
    gold: '#ffd25d',
    green: '#76ffb0',
    violet: '#9a68ff'
  };

  const state = {
    mode: 'menu',
    running: false,
    paused: false,
    stageIndex: 0,
    distance: 0,
    score: 0,
    bestEndless: Number(sessionStorage.getItem('pulseBest') || 0),
    world: 0,
    pulseCooldown: 0,
    combo: 0,
    overdrive: 0,
    overdriveTime: 0,
    stageCompleteTimer: 0,
    deadTimer: 0,
    shake: 0,
    gravitySign: 1,
    endlessSpawnX: 900,
    elapsed: 0,
    perfectPulses: 0,
    nearMisses: 0,
    clutchPulses: 0,
    deaths: 0,
    slowMo: 0,
    coyote: 0,
    jumpBuffer: 0,
    bossHits: 0,
    bossFlash: 0,
    shield: 0,
    revealTimer: 0,
    stageStartDeaths: 0,
    stageStartPerfect: 0,
    stageStartNear: 0,
    stageStartClutch: 0,
    lastRank: '',
    ranks: safeParse(sessionStorage.getItem('pulseRanks'), {}),
    hunterAnger: 0
  };

  const player = {
    x: PLAYER_X,
    y: FLOOR - PLAYER_H,
    vy: 0,
    grounded: true,
    trail: []
  };

  let particles = [];
  let pulseRings = [];
  let feedback = [];
  let activeObstacles = [];
  let lastTime = performance.now();
  let audioCtx = null;
  let muted = false;
  let bannerTimeout = 0;
  let frameId = 0;
  let platformPaused = false;
  let pausedByPlatform = false;

  function safeParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; }
    catch { return fallback; }
  }

  function O(x, type, world, w, h, anchor = 'floor') {
    return { x, type, world, w, h, anchor, collected: false, passed: false };
  }
  function C(x, world, anchor = 'floor') {
    return { x, type: 'core', world, w: 30, h: 30, anchor, collected: false, passed: false };
  }
  function B(x, world, anchor = 'floor') {
    return { x, type: 'bossCore', world, w: 38, h: 38, anchor, collected: false, passed: false };
  }
  function D(x, world, centerY, amp = 90, freq = 2.1, phase = 0) {
    return { x, type: 'drone', world, w: 46, h: 46, centerY, amp, freq, phase, collected: false, passed: false };
  }
  function S(x, anchor = 'floor') {
    return { x, type: 'shield', world: -1, w: 34, h: 34, anchor, collected: false, passed: false };
  }

  const stages = [
    {
      name: 'FIRST CONTACT',
      hint: 'JUMP the spikes. PULSE through the tall wall.',
      length: 4600,
      speed: 295,
      gravityFlip: false,
      obstacles: [
        O(806, 'spike', 0, 64, 30), C(1098, 0), O(1422, 'wall', 0, 64, 190), C(1697, 1),
        O(1999, 'spike', 1, 70, 32), O(2302, 'wall', 1, 60, 158), C(2587, 0),
        O(2890, 'spike', 0, 80, 34), O(3237, 'wall', 0, 60, 176), C(3550, 1),
        O(3886, 'spike', 1, 88, 34), C(4200, 1)
      ]
    },
    {
      name: 'SPLIT SECOND',
      hint: 'Read the color. Jump and Pulse in the same breath.',
      length: 5232,
      speed: 320,
      gravityFlip: false,
      obstacles: [
        O(694, 'spike', 0, 82, 34), O(1014, 'wall', 1, 64, 150), C(1254, 1),
        O(1534, 'spike', 1, 72, 34), O(1686, 'wall', 0, 62, 125), C(1982, 0),
        O(2262, 'wall', 1, 60, 168), O(2531, 'spike', 0, 96, 34),
        O(2845, 'wall', 0, 64, 128), O(3130, 'wall', 1, 64, 128), C(3416, 1),
        O(3707, 'spike', 1, 96, 34), O(4043, 'wall', 0, 68, 178), O(4424, 'spike', 0, 84, 34), C(4771, 0)
      ]
    },
    {
      name: 'CHAIN REACTION',
      hint: 'Pulse late. Perfect timing fills Overdrive.',
      length: 5980,
      speed: 342,
      gravityFlip: false,
      obstacles: [
        O(683, 'wall', 0, 58, 130), O(980, 'wall', 1, 58, 130), O(1277, 'wall', 0, 58, 130), O(1574, 'wall', 1, 58, 130),
        C(1820, 1), O(2106, 'spike', 0, 92, 34), O(2402, 'wall', 1, 62, 155), O(2677, 'spike', 1, 74, 34),
        C(2940, 0), O(3214, 'wall', 0, 64, 132), O(3489, 'wall', 1, 64, 132), O(3774, 'wall', 0, 64, 132),
        C(4032, 1), O(4301, 'spike', 1, 100, 34), O(4626, 'wall', 0, 70, 168), O(4950, 'spike', 0, 82, 34),
        O(5242, 'wall', 1, 62, 146), C(5522, 1)
      ]
    },
    {
      name: 'INVERTED',
      hint: 'Every Pulse flips gravity. Commit to the switch.',
      length: 5232,
      speed: 326,
      gravityFlip: true,
      obstacles: [
        O(784, 'wall', 0, 60, 128, 'floor'), O(1210, 'wall', 1, 60, 128, 'ceiling'), C(1490, 1, 'ceiling'),
        O(1792, 'wall', 0, 64, 148, 'ceiling'), O(2173, 'wall', 1, 64, 148, 'floor'), C(2453, 0, 'floor'),
        O(2766, 'spike', 0, 90, 34, 'ceiling'), O(3114, 'spike', 1, 90, 34, 'floor'),
        O(3494, 'wall', 0, 64, 165, 'floor'), C(3808, 1, 'ceiling'), O(4178, 'wall', 1, 64, 160, 'ceiling'),
        O(4514, 'spike', 0, 92, 34, 'floor'), C(4850, 0, 'floor')
      ]
    },
    {
      name: 'THE HUNTER',
      hint: 'The Hunter is on you. Steal five cores and survive the collapse.',
      length: 6900,
      speed: 380,
      gravityFlip: false,
      voidChase: true,
      boss: true,
      bossRequired: 5,
      obstacles: [
        O(661, 'spike', 0, 86, 34), O(980, 'wall', 1, 62, 138), B(1277, 0),
        O(1579, 'wall', 0, 64, 152), O(1882, 'spike', 1, 100, 34), B(2173, 1),
        O(2475, 'wall', 1, 66, 168), O(2778, 'spike', 0, 106, 34), B(3080, 0),
        O(3394, 'wall', 0, 68, 110), O(3707, 'wall', 1, 68, 160), B(4004, 1),
        O(4323, 'spike', 0, 112, 34), O(4670, 'wall', 1, 72, 175), B(4995, 0),
        O(5320, 'spike', 1, 104, 34), O(5645, 'wall', 0, 70, 138), O(5970, 'spike', 0, 96, 34), O(6283, 'wall', 1, 70, 170)
      ]
    },
    {
      name: 'PRISM TRAFFIC',
      hint: 'Moving drones have their own rhythm. A shield buys one mistake.',
      length: 6210,
      speed: 345,
      gravityFlip: false,
      drones: true,
      obstacles: [
        S(694), D(1098, 0, 300, 105, 2.0, 0.1), C(1344, 0), O(1624, 'spike', 1, 86, 34),
        D(1971, 1, 270, 120, 2.25, 1.4), O(2285, 'wall', 0, 62, 150), C(2542, 1),
        D(2834, 0, 310, 95, 2.55, 2.0), O(3125, 'spike', 0, 96, 34), S(3416),
        O(3685, 'wall', 1, 66, 160), D(3987, 1, 255, 125, 2.15, 3.1), C(4267, 0),
        O(4558, 'spike', 1, 104, 34), D(4906, 0, 295, 110, 2.75, 0.8), O(5242, 'wall', 0, 68, 170),
        C(5566, 1), O(5813, 'spike', 1, 90, 34)
      ]
    },
    {
      name: 'BLACKOUT',
      hint: 'Pulse is now your radar. Switch reality to light the road.',
      length: 6440,
      speed: 352,
      gravityFlip: false,
      blackout: true,
      drones: true,
      obstacles: [
        C(694, 0), O(997, 'spike', 0, 82, 34), O(1322, 'wall', 1, 64, 158),
        D(1658, 0, 285, 105, 2.2, 0.4), C(1926, 1), O(2229, 'spike', 1, 96, 34),
        O(2565, 'wall', 0, 66, 175), S(2834), D(3147, 1, 260, 120, 2.6, 1.7),
        O(3472, 'spike', 0, 102, 34), C(3774, 0), O(4088, 'wall', 1, 68, 170),
        D(4413, 0, 305, 95, 2.9, 2.6), O(4738, 'spike', 1, 110, 34), C(5029, 1),
        O(5342, 'wall', 0, 70, 185), D(5678, 1, 275, 115, 2.45, 0.2), C(6003, 0)
      ]
    },
    {
      name: 'SINGULARITY',
      hint: 'Hunter Prime. Six cores. No clean exit unless you break it.',
      length: 7935,
      speed: 400,
      gravityFlip: false,
      voidChase: true,
      boss: true,
      finalBoss: true,
      bossRequired: 6,
      drones: true,
      obstacles: [
        O(650, 'spike', 0, 88, 34), D(952, 1, 280, 105, 2.4, 0.2), B(1243, 0),
        O(1557, 'wall', 1, 66, 160), O(1870, 'spike', 0, 102, 34), B(2162, 1),
        D(2453, 0, 300, 120, 2.65, 1.0), O(2766, 'wall', 0, 70, 180), B(3091, 0),
        O(3405, 'spike', 1, 110, 34), D(3707, 1, 255, 120, 2.8, 2.0), B(4021, 1),
        S(4278), O(4558, 'wall', 0, 72, 175), O(4872, 'spike', 0, 108, 34), B(5174, 0),
        D(5477, 1, 300, 110, 3.0, 0.5), O(5779, 'wall', 1, 72, 185), B(6104, 1),
        O(6418, 'spike', 0, 114, 34), D(6742, 0, 270, 125, 2.9, 1.6),
        O(7056, 'wall', 1, 74, 175), O(7392, 'spike', 1, 100, 34)
      ]
    }
  ];

  const endlessStageProxy = {
    name: 'ENDLESS',
    hint: 'No finish line. Chase cleaner decisions.',
    length: Infinity,
    speed: 332,
    gravityFlip: false,
    voidChase: false,
    boss: false,
    blackout: false,
    obstacles: []
  };

  function currentStage() {
    return state.mode === 'endless' ? endlessStageProxy : stages[state.stageIndex];
  }

  function resetPlayer() {
    state.gravitySign = 1;
    player.x = PLAYER_X;
    player.y = FLOOR - PLAYER_H;
    player.vy = 0;
    player.grounded = true;
    player.trail.length = 0;
    state.coyote = .08;
    state.jumpBuffer = 0;
  }

  function resetStageStats() {
    state.stageStartDeaths = state.deaths;
    state.stageStartPerfect = state.perfectPulses;
    state.stageStartNear = state.nearMisses;
    state.stageStartClutch = state.clutchPulses;
  }

  function loadStage(index, showBanner = true, resetStats = true) {
    state.stageIndex = index;
    state.distance = 0;
    state.world = 0;
    state.pulseCooldown = 0;
    state.combo = 0;
    state.overdrive = 0;
    state.overdriveTime = 0;
    state.stageCompleteTimer = 0;
    state.deadTimer = 0;
    state.endlessSpawnX = 900;
    state.slowMo = 0;
    state.bossHits = 0;
    state.bossFlash = 0;
    state.shield = 0;
    state.revealTimer = .4;
    state.hunterAnger = 0;
    particles = [];
    pulseRings = [];
    feedback = [];
    resetPlayer();
    if (resetStats) resetStageStats();
    const stage = currentStage();
    activeObstacles = state.mode === 'endless' ? [] : stage.obstacles.map(o => ({ ...o, collected: false, passed: false }));
    syncHud();
    if (showBanner) showStageBanner(stage);
  }

  function start(mode) {
    initAudio();
    state.mode = mode;
    state.running = true;
    state.paused = false;
    state.score = 0;
    state.perfectPulses = 0;
    state.nearMisses = 0;
    state.clutchPulses = 0;
    state.deaths = 0;
    hideAllScreens();
    loadStage(0, true);
    lastTime = performance.now();
  }

  function hideAllScreens() {
    ui.menu.classList.remove('active');
    ui.pause.classList.remove('active');
    ui.victory.classList.remove('active');
  }

  function quitToMenu() {
    state.running = false;
    state.paused = false;
    state.mode = 'menu';
    ui.pause.classList.remove('active');
    ui.victory.classList.remove('active');
    ui.menu.classList.add('active');
    ui.pauseBtn.textContent = 'PAUSE';
    ui.pauseBtn.setAttribute('aria-pressed', 'false');
  }

  function showStageBanner(stage) {
    clearTimeout(bannerTimeout);
    ui.bannerStage.textContent = state.mode === 'endless' ? 'ENDLESS MODE' : `STAGE ${String(state.stageIndex + 1).padStart(2, '0')} / ${stages.length}`;
    ui.bannerName.textContent = stage.name;
    ui.bannerHint.textContent = stage.hint;
    ui.banner.classList.add('show');
    bannerTimeout = setTimeout(() => ui.banner.classList.remove('show'), 2100);
  }

  function togglePause(force) {
    if (!state.running || state.deadTimer > 0 || state.stageCompleteTimer > 0) return;
    state.paused = typeof force === 'boolean' ? force : !state.paused;
    ui.pause.classList.toggle('active', state.paused);
    ui.pauseBtn.textContent = state.paused ? 'RESUME' : 'PAUSE';
    ui.pauseBtn.setAttribute('aria-pressed', String(state.paused));
    if (!state.paused) lastTime = performance.now();
  }

  function doJump() {
    player.grounded = false;
    state.coyote = 0;
    state.jumpBuffer = 0;
    player.vy = -state.gravitySign * JUMP_POWER;
    sound('jump');
    burst(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, state.world, 8, 1.2);
  }

  function jump() {
    if (!state.running || state.paused || state.deadTimer > 0 || state.stageCompleteTimer > 0) return;
    if (player.grounded || state.coyote > 0) doJump();
    else state.jumpBuffer = .11;
  }

  function pulse() {
    if (!state.running || state.paused || state.deadTimer > 0 || state.stageCompleteTimer > 0) return;
    if (state.pulseCooldown > 0) return;

    const oldWorld = state.world;
    state.world = 1 - state.world;
    state.pulseCooldown = state.overdriveTime > 0 ? .085 : .125;
    const stage = currentStage();
    state.revealTimer = stage.blackout ? .78 : state.revealTimer;

    if (stage.gravityFlip) {
      state.gravitySign *= -1;
      player.grounded = false;
      player.vy = state.gravitySign * -120;
      state.coyote = 0;
    }

    const nearest = activeObstacles
      .filter(o => !o.collected && !isPickup(o) && o.world === oldWorld)
      .map(o => ({ o, sx: screenX(o) }))
      .filter(v => v.sx > PLAYER_X - 24 && v.sx < PLAYER_X + 190)
      .sort((a, b) => a.sx - b.sx)[0];

    pulseRings.push({ x: player.x + PLAYER_W / 2, y: player.y + PLAYER_H / 2, r: 18, a: 1, world: state.world });

    if (nearest) {
      const delta = nearest.sx - PLAYER_X;
      const clutch = delta < 88;
      state.combo += 1;
      state.perfectPulses += 1;
      if (clutch) state.clutchPulses += 1;
      state.overdrive = Math.min(100, state.overdrive + (clutch ? 34 : 28));
      state.score += (clutch ? 230 : 150) * Math.max(1, state.combo);
      state.slowMo = clutch ? .17 : .11;
      state.shake = Math.max(state.shake, clutch ? 14 : 10);
      burst(PLAYER_X + 48, player.y + PLAYER_H / 2, state.world, clutch ? 34 : 25, clutch ? 3.0 : 2.5);
      addFeedback(clutch ? 'CLUTCH PULSE' : 'PERFECT PULSE', clutch ? COLORS.gold : COLORS.white, PLAYER_X + 82, player.y - 14, clutch ? 1.18 : 1.0);
      sound(clutch ? 'clutch' : 'perfect');
      if (state.overdrive >= 100 && state.overdriveTime <= 0) triggerOverdrive();
    } else {
      state.combo = Math.max(0, state.combo - 1);
      state.overdrive = Math.max(0, state.overdrive - 5);
      state.shake = Math.max(state.shake, 5);
      sound('pulse');
    }

    flashPulse();
  }

  function triggerOverdrive() {
    state.overdriveTime = 5.2;
    state.overdrive = 100;
    state.shake = 15;
    state.slowMo = .2;
    burst(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, state.world, 52, 3.2);
    addFeedback('OVERDRIVE', COLORS.white, W * .5, 160, 1.5);
    sound('overdrive');
  }

  function flashPulse() {
    ui.pulseFlash.classList.remove('cyan', 'magenta');
    void ui.pulseFlash.offsetWidth;
    ui.pulseFlash.classList.add(state.world === 0 ? 'cyan' : 'magenta');
  }

  function addFeedback(text, color, x, y, scale = 1) {
    feedback.push({ text, color, x, y, life: .8, max: .8, scale });
  }

  function die() {
    if (state.deadTimer > 0 || state.stageCompleteTimer > 0) return;
    if (state.shield > 0) {
      state.shield = 0;
      state.slowMo = .14;
      state.shake = 16;
      burst(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, state.world, 38, 3.4, COLORS.green);
      addFeedback('SHIELD BREAK', COLORS.green, player.x + 60, player.y - 18, 1.12);
      sound('shieldBreak');
      return;
    }

    state.deadTimer = .42;
    state.deaths += 1;
    state.combo = 0;
    state.overdrive = 0;
    state.overdriveTime = 0;
    state.shake = 18;
    ui.death.classList.add('show');
    sound('death');
    burst(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, state.world, 38, 4.2);
  }

  function restartAfterDeath() {
    ui.death.classList.remove('show');
    if (state.mode === 'endless') {
      state.bestEndless = Math.max(state.bestEndless, Math.floor(state.distance));
      sessionStorage.setItem('pulseBest', String(state.bestEndless));
      loadStage(0, false, true);
      showStageBanner(endlessStageProxy);
    } else {
      loadStage(state.stageIndex, false, false);
    }
  }

  function rankStage() {
    const d = state.deaths - state.stageStartDeaths;
    const p = state.perfectPulses - state.stageStartPerfect;
    const n = state.nearMisses - state.stageStartNear;
    const c = state.clutchPulses - state.stageStartClutch;
    let rank = 'C';
    if (d === 0 && (p >= 2 || c >= 1)) rank = 'S';
    else if (d <= 1 && p >= 1) rank = 'A';
    else if (d <= 3) rank = 'B';

    const stage = currentStage();
    if (stage.boss && state.bossHits < stage.bossRequired && (rank === 'S' || rank === 'A')) rank = 'B';

    const old = state.ranks[state.stageIndex];
    const value = { C: 1, B: 2, A: 3, S: 4 };
    if (!old || value[rank] > value[old]) {
      state.ranks[state.stageIndex] = rank;
      sessionStorage.setItem('pulseRanks', JSON.stringify(state.ranks));
    }
    return { rank, d, p, n, c };
  }

  function completeStage() {
    if (state.stageCompleteTimer > 0) return;
    const stage = currentStage();
    const result = rankStage();
    state.lastRank = result.rank;
    state.stageCompleteTimer = 1.7;
    state.score += 1200 + state.combo * 120 + ({ S: 900, A: 600, B: 350, C: 150 }[result.rank]);
    state.shake = 8;
    sound('clear');
    addFeedback(`RANK ${result.rank}`, result.rank === 'S' ? COLORS.gold : COLORS.white, W * .5, 175, 1.6);
    ui.bannerStage.textContent = `STAGE ${String(state.stageIndex + 1).padStart(2, '0')} CLEAR • RANK ${result.rank}`;
    ui.bannerName.textContent = stage.name;
    const bossNote = stage.boss ? ` • cores ${state.bossHits}/${stage.bossRequired}` : '';
    ui.bannerHint.textContent = `${result.p} perfect • ${result.c} clutch • ${result.d} deaths${bossNote}`;
    ui.banner.classList.add('show');
  }

  function finishCampaign() {
    state.running = false;
    const stage = currentStage();
    const trueWin = !stage.finalBoss || state.bossHits >= stage.bossRequired;
    if (ui.victoryEyebrow) ui.victoryEyebrow.textContent = trueWin ? 'CAMPAIGN BREACH COMPLETE' : 'YOU ESCAPED — BUT IT SURVIVED';
    if (ui.victoryTitle) ui.victoryTitle.innerHTML = trueWin ? 'HUNTER PRIME<br>DESTROYED.' : 'THE HUNTER<br>IS STILL ALIVE.';
    const ranks = Object.values(state.ranks);
    const sRanks = ranks.filter(r => r === 'S').length;
    ui.victoryStats.textContent = `${stages.length} stages • ${sRanks} S-ranks • ${state.perfectPulses} perfect pulses • ${state.nearMisses} near misses • ${state.deaths} deaths • ${Math.floor(state.score).toLocaleString()} score`;
    ui.victory.classList.add('active');
  }

  function advanceStage() {
    ui.banner.classList.remove('show');
    if (state.stageIndex >= stages.length - 1) {
      finishCampaign();
      return;
    }
    loadStage(state.stageIndex + 1, true);
  }

  function update(rawDt) {
    if (!state.running || state.paused) return;

    const slowScale = state.slowMo > 0 ? .38 : 1;
    if (state.slowMo > 0) state.slowMo = Math.max(0, state.slowMo - rawDt);
    const dt = rawDt * slowScale;

    state.elapsed += dt;
    state.pulseCooldown = Math.max(0, state.pulseCooldown - dt);
    state.shake = Math.max(0, state.shake - 23 * dt);
    state.bossFlash = Math.max(0, state.bossFlash - dt);
    state.coyote = Math.max(0, state.coyote - dt);
    state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);
    state.revealTimer = Math.max(0, state.revealTimer - rawDt);

    if (state.deadTimer > 0) {
      state.deadTimer -= rawDt;
      updateEffects(rawDt);
      if (state.deadTimer <= 0) restartAfterDeath();
      return;
    }

    if (state.stageCompleteTimer > 0) {
      state.stageCompleteTimer -= rawDt;
      updateEffects(rawDt);
      if (state.stageCompleteTimer <= 0) advanceStage();
      return;
    }

    const stage = currentStage();
    let speed = stage.speed;
    if (state.mode === 'endless') speed += Math.min(165, state.distance / 86);

    if (state.overdriveTime > 0) {
      state.overdriveTime -= rawDt;
      speed *= 1.22;
      state.score += 50 * rawDt;
      state.overdrive = Math.max(0, 100 * (state.overdriveTime / 5.2));
      if (Math.random() < .38) burst(player.x - 6, player.y + PLAYER_H / 2, state.world, 1, 1.45);
    }

    state.distance += speed * dt;
    state.score += speed * dt * .085 * (1 + Math.min(4, state.combo) * .13);
    state.hunterAnger = stage.boss ? Math.min(1, state.distance / stage.length) : 0;

    if (state.mode === 'endless') updateEndless();

    const wasGrounded = player.grounded;
    player.grounded = false;
    const gravity = BASE_GRAVITY * state.gravitySign;
    player.vy += gravity * dt;
    player.y += player.vy * dt;

    if (state.gravitySign > 0) {
      if (player.y + PLAYER_H >= FLOOR) {
        player.y = FLOOR - PLAYER_H;
        player.vy = 0;
        player.grounded = true;
      }
    } else if (player.y <= CEILING) {
      player.y = CEILING;
      player.vy = 0;
      player.grounded = true;
    }

    if (wasGrounded && !player.grounded) state.coyote = .08;
    if (player.grounded && state.jumpBuffer > 0) doJump();

    player.trail.unshift({ x: player.x, y: player.y, a: 1, world: state.world });
    if (player.trail.length > (state.overdriveTime > 0 ? 20 : 9)) player.trail.pop();
    player.trail.forEach(t => { t.a *= .86; });

    handleCollisions();
    checkNearMisses();
    updateEffects(dt);

    if (state.mode !== 'endless' && state.distance >= stage.length) completeStage();
    syncHud();
  }

  function updateEndless() {
    while (state.endlessSpawnX < state.distance + 1800) {
      const gap = 290 + Math.random() * 220;
      state.endlessSpawnX += gap;
      const world = Math.random() < .5 ? 0 : 1;
      const roll = Math.random();

      if (roll < .34) {
        activeObstacles.push(O(state.endlessSpawnX, 'wall', world, 56 + Math.random() * 18, 96 + Math.random() * 78));
      } else if (roll < .64) {
        activeObstacles.push(O(state.endlessSpawnX, 'spike', world, 70 + Math.random() * 52, 34));
      } else if (roll < .79) {
        activeObstacles.push(D(state.endlessSpawnX, world, 260 + Math.random() * 60, 80 + Math.random() * 50, 2 + Math.random() * 1.1, Math.random() * 6));
      } else if (roll < .94) {
        activeObstacles.push(C(state.endlessSpawnX, world));
      } else {
        activeObstacles.push(S(state.endlessSpawnX));
      }

      if (Math.random() < .20) activeObstacles.push(C(state.endlessSpawnX + 145, 1 - world));
    }

    activeObstacles = activeObstacles.filter(o => o.x > state.distance - 520 && !o.collected);
  }

  function screenX(o) {
    return o.x - state.distance + PLAYER_X;
  }

  function obstacleRect(o) {
    const sx = screenX(o);
    if (o.type === 'drone') {
      const cy = o.centerY + Math.sin(state.elapsed * o.freq + o.phase) * o.amp;
      return { x: sx, y: cy - o.h / 2, w: o.w, h: o.h };
    }
    const y = o.anchor === 'ceiling' ? CEILING : FLOOR - o.h;
    return { x: sx, y, w: o.w, h: o.h };
  }

  function isPickup(o) {
    return o.type === 'core' || o.type === 'bossCore' || o.type === 'shield';
  }

  function playerRect() {
    return { x: player.x + 6, y: player.y + 6, w: PLAYER_W - 12, h: PLAYER_H - 10 };
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function handleCollisions() {
    const pr = playerRect();

    for (const o of activeObstacles) {
      if (o.collected) continue;
      const r = obstacleRect(o);
      if (r.x > W + 140 || r.x + r.w < -120) continue;
      if (!overlap(pr, r)) continue;

      if (o.type === 'core') {
        if (o.world === state.world) collectCore(o, r, false);
        continue;
      }

      if (o.type === 'bossCore') {
        if (o.world === state.world) collectCore(o, r, true);
        continue;
      }

      if (o.type === 'shield') {
        o.collected = true;
        state.shield = 1;
        state.score += 600;
        burst(r.x + r.w / 2, r.y + r.h / 2, state.world, 22, 2.6, COLORS.green);
        addFeedback('SHIELD ONLINE', COLORS.green, r.x, r.y - 12, 1.05);
        sound('shield');
        continue;
      }

      if (o.world === state.world) {
        if (state.shield > 0) o.collected = true;
        die();
        return;
      }
    }
  }

  function collectCore(o, r, boss) {
    o.collected = true;
    const amount = boss ? 1050 : 480;
    state.score += amount + state.combo * (boss ? 60 : 28);
    state.overdrive = Math.min(100, state.overdrive + (boss ? 18 : 11));
    burst(r.x + r.w / 2, r.y + r.h / 2, o.world, boss ? 26 : 15, boss ? 3.1 : 2.5, boss ? COLORS.gold : null);

    if (boss) {
      state.bossHits += 1;
      state.bossFlash = .35;
      state.shake = Math.max(state.shake, 13);
      const required = currentStage().bossRequired || 1;
      addFeedback(`HUNTER HIT ${state.bossHits}/${required}`, COLORS.gold, W * .58, 150, 1.12);
      sound('bossHit');
    } else {
      sound('core');
    }
  }

  function checkNearMisses() {
    const pr = playerRect();
    for (const o of activeObstacles) {
      if (o.passed || o.collected || isPickup(o)) continue;
      const r = obstacleRect(o);
      if (r.x + r.w >= pr.x) continue;
      o.passed = true;
      if (o.world !== state.world) continue;

      let gap = 999;
      if (o.type === 'drone') {
        const pcx = pr.x + pr.w / 2;
        const pcy = pr.y + pr.h / 2;
        const ocx = r.x + r.w / 2;
        const ocy = r.y + r.h / 2;
        gap = Math.hypot(pcx - ocx, pcy - ocy) - Math.max(pr.w, pr.h) / 2 - r.w / 2;
      } else if (o.anchor === 'ceiling') {
        gap = pr.y - (r.y + r.h);
      } else {
        gap = r.y - (pr.y + pr.h);
      }

      if (gap >= -1 && gap < 17) {
        state.nearMisses += 1;
        state.score += 260 + state.combo * 30;
        state.overdrive = Math.min(100, state.overdrive + 9);
        state.slowMo = Math.max(state.slowMo, .08);
        addFeedback('NEAR MISS', COLORS.gold, player.x + 65, player.y - 8, .95);
        sound('near');
      }
    }
  }

  function updateEffects(dt) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 250 * dt;
      p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);

    for (const r of pulseRings) {
      r.r += 310 * dt;
      r.a -= 1.8 * dt;
    }
    pulseRings = pulseRings.filter(r => r.a > 0);

    for (const f of feedback) {
      f.y -= 30 * dt;
      f.life -= dt;
    }
    feedback = feedback.filter(f => f.life > 0);
  }

  function burst(x, y, world, count = 10, power = 1, forcedColor = null) {
    const color = forcedColor || (world === 0 ? COLORS.cyan : COLORS.magenta);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (45 + Math.random() * 150) * power;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .35 + Math.random() * .55, max: .9, size: 1.5 + Math.random() * 3.5, color });
    }
  }

  function syncHud() {
    const stage = currentStage();
    ui.stageLabel.textContent = state.mode === 'endless' ? 'ENDLESS' : `STAGE ${String(state.stageIndex + 1).padStart(2, '0')} / ${stages.length}`;
    ui.stageName.textContent = stage.name;
    ui.score.textContent = String(Math.floor(state.score)).padStart(6, '0');
    const shield = state.shield ? ' • SHIELD' : '';
    ui.combo.textContent = state.overdriveTime > 0 ? `OVERDRIVE • x${Math.max(1, state.combo)}${shield}` : `COMBO x${state.combo}${shield}`;
    ui.meter.style.width = `${Math.max(0, Math.min(100, state.overdrive))}%`;
  }

  function draw() {
    const stage = currentStage();
    const shakeX = state.shake ? (Math.random() - .5) * state.shake : 0;
    const shakeY = state.shake ? (Math.random() - .5) * state.shake * .55 : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawBackground(stage);
    drawTrack(stage);
    drawProgress(stage);
    drawObstacles();
    if (stage.boss && state.running) drawHunter(stage);
    if (stage.blackout && state.running) drawBlackout();
    drawPlayer();
    drawPulseRings();
    drawParticles();
    drawFeedback();
    if (stage.voidChase && state.running) drawVoid(stage);
    if (state.mode === 'endless' && state.running) drawEndlessBest();
    ctx.restore();
  }

  function drawBackground(stage) {
    const wcol = state.world === 0 ? [20, 165, 255] : [255, 35, 158];
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, `rgb(${4 + wcol[0] * .015},${6 + wcol[1] * .025},${18 + wcol[2] * .025})`);
    grd.addColorStop(.58, '#07101d');
    grd.addColorStop(1, '#03050b');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    const sunX = 720 + Math.sin(state.elapsed * .12) * 25;
    const sunY = 160;
    const rg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 155);
    rg.addColorStop(0, state.world === 0 ? 'rgba(85,239,255,.17)' : 'rgba(255,67,184,.18)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(sunX - 170, sunY - 170, 340, 340);

    ctx.globalAlpha = stage.blackout ? .14 : .36;
    for (let i = 0; i < 18; i++) {
      const x = ((i * 91 - state.distance * .08) % (W + 120)) - 60;
      const h = 35 + ((i * 37) % 95);
      ctx.fillStyle = i % 3 === 0 ? '#0c2941' : '#101a31';
      ctx.fillRect(x, FLOOR - h - 58, 54, h);
      ctx.fillStyle = state.world === 0 ? 'rgba(85,239,255,.22)' : 'rgba(255,67,184,.22)';
      for (let wy = FLOOR - h - 48; wy < FLOOR - 70; wy += 18) ctx.fillRect(x + 9, wy, 5, 6);
    }
    ctx.globalAlpha = 1;

    if (state.overdriveTime > 0) {
      ctx.strokeStyle = state.world === 0 ? 'rgba(85,239,255,.28)' : 'rgba(255,67,184,.28)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 24; i++) {
        const y = (i * 31 + state.elapsed * 270) % H;
        const x = (i * 83) % W;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 120, y);
        ctx.stroke();
      }
    }
  }

  function drawTrack(stage) {
    const accent = state.world === 0 ? COLORS.cyan : COLORS.magenta;
    const ghost = state.world === 0 ? 'rgba(85,239,255,.12)' : 'rgba(255,67,184,.12)';

    ctx.fillStyle = '#07111d';
    ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillRect(0, 0, W, CEILING);
    ctx.fillStyle = accent;
    ctx.globalAlpha = .75;
    ctx.fillRect(0, FLOOR, W, 2);
    if (stage.gravityFlip) ctx.fillRect(0, CEILING - 2, W, 2);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = ghost;
    ctx.lineWidth = 1;
    for (let x = -80; x < W + 80; x += 70) {
      const off = (state.distance * .35) % 70;
      ctx.beginPath();
      ctx.moveTo(x - off, FLOOR);
      ctx.lineTo(x - off - 80, H);
      ctx.stroke();
    }
    for (let y = FLOOR + 18; y < H; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    if (stage.gravityFlip) {
      for (let x = -80; x < W + 80; x += 70) {
        const off = (state.distance * .35) % 70;
        ctx.beginPath();
        ctx.moveTo(x - off, CEILING);
        ctx.lineTo(x - off - 80, 0);
        ctx.stroke();
      }
    }
  }

  function drawProgress(stage) {
    if (!state.running || state.mode === 'endless') return;
    const p = Math.max(0, Math.min(1, state.distance / stage.length));
    ctx.save();
    ctx.globalAlpha = .7;
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillRect(220, 67, 520, 3);
    const g = ctx.createLinearGradient(220, 0, 740, 0);
    g.addColorStop(0, COLORS.cyan);
    g.addColorStop(1, COLORS.magenta);
    ctx.fillStyle = g;
    ctx.fillRect(220, 67, 520 * p, 3);
    ctx.restore();
  }

  function drawObstacles() {
    for (const o of activeObstacles) {
      if (o.collected) continue;
      const r = obstacleRect(o);
      if (r.x > W + 140 || r.x + r.w < -130) continue;

      const active = o.world === -1 || o.world === state.world;
      const color = o.world === 0 ? COLORS.cyan : o.world === 1 ? COLORS.magenta : COLORS.green;
      ctx.save();
      ctx.globalAlpha = active ? 1 : .13;
      ctx.shadowColor = active ? color : 'transparent';
      ctx.shadowBlur = active ? 18 : 0;

      if (o.type === 'wall') drawWall(r, color, active);
      else if (o.type === 'spike') drawSpike(r, color, active, o.anchor);
      else if (o.type === 'core') drawCore(r, color, false);
      else if (o.type === 'bossCore') drawCore(r, COLORS.gold, true);
      else if (o.type === 'drone') drawDrone(r, color, active);
      else if (o.type === 'shield') drawShieldPickup(r);
      ctx.restore();
    }
  }

  function drawWall(r, color, active) {
    const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    g.addColorStop(0, active ? color : 'rgba(255,255,255,.15)');
    g.addColorStop(1, 'rgba(7,12,24,.94)');
    ctx.fillStyle = g;
    roundRect(ctx, r.x, r.y, r.w, r.h, 9);
    ctx.fill();
    ctx.strokeStyle = active ? color : 'rgba(255,255,255,.22)';
    ctx.lineWidth = 2;
    roundRect(ctx, r.x, r.y, r.w, r.h, 9);
    ctx.stroke();
    ctx.globalAlpha *= .42;
    for (let yy = r.y + 14; yy < r.y + r.h - 6; yy += 18) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(r.x + 9, yy, r.w - 18, 2);
    }
  }

  function drawSpike(r, color, active, anchor) {
    ctx.fillStyle = active ? color : 'rgba(255,255,255,.18)';
    const count = Math.max(2, Math.floor(r.w / 22));
    const sw = r.w / count;
    for (let i = 0; i < count; i++) {
      ctx.beginPath();
      if (anchor === 'ceiling') {
        ctx.moveTo(r.x + i * sw, r.y);
        ctx.lineTo(r.x + i * sw + sw / 2, r.y + r.h);
        ctx.lineTo(r.x + (i + 1) * sw, r.y);
      } else {
        ctx.moveTo(r.x + i * sw, r.y + r.h);
        ctx.lineTo(r.x + i * sw + sw / 2, r.y);
        ctx.lineTo(r.x + (i + 1) * sw, r.y + r.h);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawCore(r, color, boss) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const rad = boss ? 28 : 22;
    const rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
    rg.addColorStop(0, '#fff');
    rg.addColorStop(.22, color);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = boss ? 3 : 2;
    ctx.beginPath();
    if (boss) polygon(ctx, cx, cy, 14 + Math.sin(state.elapsed * 8) * 2, 6, state.elapsed * .9);
    else ctx.arc(cx, cy, 10 + Math.sin(state.elapsed * 6) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawDrone(r, color, active) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    ctx.fillStyle = active ? '#091321' : 'rgba(255,255,255,.08)';
    ctx.strokeStyle = active ? color : 'rgba(255,255,255,.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r.w * .36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(state.elapsed * 3.2);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = active ? color : 'rgba(255,255,255,.2)';
      ctx.fillRect(15, -2, 16, 4);
    }
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShieldPickup(r) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    ctx.strokeStyle = COLORS.green;
    ctx.fillStyle = 'rgba(118,255,176,.12)';
    ctx.lineWidth = 3;
    polygon(ctx, cx, cy, 17 + Math.sin(state.elapsed * 5) * 2, 6, Math.PI / 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '800 12px Inter,system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', cx, cy + 1);
  }

  function drawPlayer() {
    const color = state.world === 0 ? COLORS.cyan : COLORS.magenta;

    for (let i = player.trail.length - 1; i >= 0; i--) {
      const t = player.trail[i];
      ctx.save();
      ctx.globalAlpha = t.a * .15;
      ctx.strokeStyle = t.world === 0 ? COLORS.cyan : COLORS.magenta;
      ctx.lineWidth = 5;
      drawRunner(t.x, t.y, false, i * .18);
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = state.overdriveTime > 0 ? 30 : 20;
    ctx.strokeStyle = '#f7fbff';
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawRunner(player.x, player.y, true, state.elapsed * 11);

    if (state.shield > 0) {
      ctx.shadowColor = COLORS.green;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = COLORS.green;
      ctx.globalAlpha = .75 + Math.sin(state.elapsed * 7) * .12;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, 31, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRunner(x, y, main, phase) {
    const grounded = player.grounded;
    const midX = x + 17;
    const headY = y + 9;
    const torsoTop = y + 17;
    const torsoBottom = y + 31;
    const swing = grounded ? Math.sin(phase) : .45;
    const armSwing = grounded ? Math.sin(phase + Math.PI) : -.35;

    ctx.fillStyle = main ? '#f7fbff' : ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(midX + 3, headY, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = main ? ctx.fillStyle : ctx.strokeStyle;
    ctx.lineWidth = main ? 5.5 : 4;
    ctx.beginPath();
    ctx.moveTo(midX, torsoTop);
    ctx.lineTo(midX - 1, torsoBottom);
    ctx.stroke();

    ctx.lineWidth = main ? 4.5 : 3;
    ctx.beginPath();
    ctx.moveTo(midX, torsoTop + 4);
    ctx.lineTo(midX - 11 * armSwing, torsoTop + 13);
    ctx.moveTo(midX, torsoTop + 5);
    ctx.lineTo(midX + 10 * armSwing, torsoTop + 12);
    ctx.stroke();

    const legA = grounded ? swing : .55;
    const legB = grounded ? -swing : -.35;
    ctx.lineWidth = main ? 5 : 3.5;
    ctx.beginPath();
    ctx.moveTo(midX - 1, torsoBottom);
    ctx.lineTo(midX + 10 * legA, y + 42);
    ctx.moveTo(midX - 1, torsoBottom);
    ctx.lineTo(midX + 10 * legB, y + 44);
    ctx.stroke();

    if (main) {
      ctx.fillStyle = state.world === 0 ? COLORS.cyan : COLORS.magenta;
      ctx.beginPath();
      ctx.arc(midX, torsoTop + 6, 3.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPulseRings() {
    for (const r of pulseRings) {
      ctx.save();
      ctx.globalAlpha = r.a;
      ctx.strokeStyle = r.world === 0 ? COLORS.cyan : COLORS.magenta;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }
  }

  function drawFeedback() {
    for (const f of feedback) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, f.life / f.max);
      ctx.fillStyle = f.color;
      ctx.font = `900 ${Math.round(17 * f.scale)}px Inter,system-ui`;
      ctx.textAlign = 'center';
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 12;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  function drawHunter(stage) {
    const required = stage.bossRequired || 1;
    const hp = Math.max(0, required - state.bossHits);
    const right = stage.finalBoss ? 820 : 845;
    const cy = 215 + Math.sin(state.elapsed * 1.9) * 28;
    const r = stage.finalBoss ? 54 : 42;

    ctx.save();
    ctx.globalAlpha = .95;
    const color = state.bossFlash > 0 ? COLORS.gold : COLORS.violet;
    ctx.shadowColor = color;
    ctx.shadowBlur = 30 + state.hunterAnger * 25;
    ctx.fillStyle = '#090715';
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(right, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(right, cy);
    ctx.rotate(-state.elapsed * (stage.finalBoss ? 1.8 : 1.2));
    ctx.strokeStyle = state.world === 0 ? COLORS.magenta : COLORS.cyan;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.rotate(Math.PI * 2 / 3);
      ctx.beginPath();
      ctx.arc(0, 0, r + 14 + i * 4, -.45, .45);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(right, cy, 7 + Math.sin(state.elapsed * 8) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = state.world === 0 ? COLORS.magenta : COLORS.cyan;
    ctx.beginPath();
    ctx.arc(right, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '800 11px Inter,system-ui';
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.textAlign = 'center';
    ctx.fillText(stage.finalBoss ? 'HUNTER PRIME' : 'THE HUNTER', right, cy - r - 20);

    const bw = 120;
    const bx = right - bw / 2;
    const by = cy + r + 17;
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    roundRect(ctx, bx, by, bw, 7, 4);
    ctx.fill();
    const pct = hp / required;
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, COLORS.magenta);
    g.addColorStop(1, COLORS.violet);
    ctx.fillStyle = g;
    roundRect(ctx, bx, by, bw * pct, 7, 4);
    ctx.fill();
    ctx.restore();
  }

  function drawBlackout() {
    const radius = state.revealTimer > 0 ? 520 : 135;
    const cx = player.x + PLAYER_W / 2;
    const cy = player.y + PLAYER_H / 2;
    const g = ctx.createRadialGradient(cx, cy, 28, cx, cy, radius);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(.38, state.revealTimer > 0 ? 'rgba(0,0,0,.06)' : 'rgba(0,0,0,.18)');
    g.addColorStop(1, 'rgba(0,0,0,.90)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawVoid(stage) {
    const danger = Math.min(1, state.distance / stage.length);
    const width = 48 + danger * (stage.finalBoss ? 150 : 110) + Math.sin(state.elapsed * 5) * 7;
    const g = ctx.createLinearGradient(0, 0, width, 0);
    g.addColorStop(0, 'rgba(175,0,255,.94)');
    g.addColorStop(.45, 'rgba(255,0,117,.58)');
    g.addColorStop(1, 'rgba(255,0,100,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, H);
    ctx.strokeStyle = 'rgba(255,210,255,.38)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const x = width - 20 + Math.sin(state.elapsed * 7 + i) * 16;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + Math.sin(i * 2) * 20, H);
      ctx.stroke();
    }
  }

  function drawEndlessBest() {
    ctx.save();
    ctx.font = '700 12px Inter,system-ui';
    ctx.fillStyle = 'rgba(215,227,247,.55)';
    ctx.textAlign = 'left';
    ctx.fillText(`SESSION BEST ${Math.floor(state.bestEndless)}m`, 22, H - 18);
    ctx.restore();
  }

  function polygon(c, cx, cy, r, sides, rotation = 0) {
    c.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rotation + i * Math.PI * 2 / sides;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.closePath();
  }

  function roundRect(c, x, y, w, h, r) {
    if (w <= 0 || h <= 0) return;
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function frame(now) {
    if (platformPaused) { frameId = 0; return; }
    const dt = Math.min(.033, (now - lastTime) / 1000 || 0);
    lastTime = now;
    update(dt);
    draw();
    frameId = requestAnimationFrame(frame);
  }

  function handlePlatformPause() {
    platformPaused = true;
    pausedByPlatform = state.running && !state.paused;
    if (pausedByPlatform) togglePause(true);
    clearTimeout(bannerTimeout);
    bannerTimeout = 0;
    ui.banner?.classList.remove('show');
    if (frameId) { cancelAnimationFrame(frameId); frameId = 0; }
    if (audioCtx?.state === 'running') audioCtx.suspend().catch(() => {});
  }

  function handlePlatformResume() {
    platformPaused = false;
    if (pausedByPlatform) togglePause(false);
    pausedByPlatform = false;
    lastTime = performance.now();
    if (audioCtx && !muted && (!window.PulsePlatform?.inPlayables || window.PulsePlatform.systemAudioEnabled) && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    if (!frameId) frameId = requestAnimationFrame(frame);
  }

  function initAudio() {
    if (muted || audioCtx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
  }

  function tone(freq, dur, type, vol, endFreq = null, delay = 0) {
    if (!audioCtx || muted) return;
    const start = audioCtx.currentTime + delay;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + dur);
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(.0001, start + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(start);
    o.stop(start + dur);
  }

  function sound(kind) {
    if (muted || platformPaused || (window.PulsePlatform?.inPlayables && !window.PulsePlatform.systemAudioEnabled)) return;
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (kind === 'jump') tone(330, .07, 'square', .04, 430);
    else if (kind === 'pulse') { tone(110, .10, 'sine', .065, 78); tone(660, .07, 'triangle', .018, 920, .015); }
    else if (kind === 'perfect') { tone(460, .09, 'triangle', .06, 760); tone(920, .11, 'sine', .025, 1200, .03); }
    else if (kind === 'clutch') { tone(180, .12, 'sawtooth', .055, 95); tone(620, .12, 'triangle', .065, 1120, .025); tone(1240, .1, 'sine', .02, 1560, .05); }
    else if (kind === 'near') tone(760, .07, 'triangle', .035, 980);
    else if (kind === 'core') tone(820, .11, 'sine', .055, 1180);
    else if (kind === 'bossHit') { tone(120, .18, 'sawtooth', .09, 62); tone(520, .16, 'triangle', .055, 1040, .02); }
    else if (kind === 'shield') { tone(560, .12, 'sine', .05, 840); tone(1120, .16, 'triangle', .025, 1320, .04); }
    else if (kind === 'shieldBreak') { tone(220, .14, 'square', .055, 90); tone(900, .1, 'triangle', .03, 400, .02); }
    else if (kind === 'death') tone(75, .24, 'sawtooth', .09, 38);
    else if (kind === 'clear') { tone(620, .12, 'triangle', .06, 880); tone(880, .16, 'triangle', .05, 1220, .09); }
    else if (kind === 'overdrive') { tone(95, .30, 'sawtooth', .09, 58); tone(380, .24, 'triangle', .045, 760, .03); tone(760, .22, 'sine', .025, 1280, .08); }
  }

  function handleKey(e, down) {
    if (!down) return;
    const key = e.key.toLowerCase();
    if ([' ', 'x', 'p', 'arrowup', 'w'].includes(key)) e.preventDefault();
    if (key === ' ' || key === 'arrowup' || key === 'w') jump();
    else if (key === 'x' || key === 'shift') pulse();
    else if (key === 'p' || key === 'escape') togglePause();
  }

  window.addEventListener('keydown', e => handleKey(e, true), { passive: false });
  ui.jump.addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
  ui.pulse.addEventListener('pointerdown', e => { e.preventDefault(); pulse(); });

  canvas.addEventListener('pointerdown', e => {
    if (!state.running || state.paused) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    if (x < r.width * .5) jump();
    else pulse();
  });

  ui.startCampaign.addEventListener('click', () => start('campaign'));
  ui.startEndless.addEventListener('click', () => start('endless'));
  ui.replay.addEventListener('click', () => start('campaign'));
  ui.victoryEndless.addEventListener('click', () => start('endless'));
  ui.resume.addEventListener('click', () => togglePause(false));
  ui.quit.addEventListener('click', quitToMenu);
  ui.pauseBtn.addEventListener('click', () => togglePause());
  ui.mute.addEventListener('click', () => {
    muted = !muted;
    ui.mute.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
    ui.mute.setAttribute('aria-pressed', String(muted));
  });

  window.addEventListener('pulse:system-pause', handlePlatformPause);
  window.addEventListener('pulse:system-resume', handlePlatformResume);
  window.addEventListener('pulse:system-audio', event => {
    const enabled = Boolean(event.detail?.enabled);
    if (!enabled && audioCtx?.state === 'running') audioCtx.suspend().catch(() => {});
    else if (enabled && !platformPaused && !muted && audioCtx?.state === 'suspended') audioCtx.resume().catch(() => {});
  });

  canvas.width = W;
  canvas.height = H;
  syncHud();
  draw();
  frameId = requestAnimationFrame(frame);
})();
