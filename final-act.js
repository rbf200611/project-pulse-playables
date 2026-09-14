(() => {
  'use strict';

  // CAMPAIGN_DURATION_TUNE_V1: +15% stage distance, +12% obstacle spacing.

  const canvas = document.getElementById('game');
  const ctx = canvas?.getContext('2d', { alpha: false });
  if (!canvas || !ctx) return;

  const ui = {
    menu: document.getElementById('menuScreen'),
    pause: document.getElementById('pauseScreen'),
    victory: document.getElementById('victoryScreen'),
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
    victoryEyebrow: document.getElementById('victoryEyebrow'),
    jump: document.getElementById('jumpBtn'),
    pulse: document.getElementById('pulseBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resume: document.getElementById('resumeBtn'),
    quit: document.getElementById('quitBtn'),
    mute: document.getElementById('muteBtn')
  };

  const W = 960;
  const H = 540;
  const FLOOR = 447;
  const CEILING = 86;
  const PLAYER_X = 176;
  const PLAYER_W = 34;
  const PLAYER_H = 46;
  const GRAVITY = 1800;
  const JUMP = 760;
  const COLORS = {
    cyan:'#55efff', magenta:'#ff43b8', white:'#f7fbff', gold:'#ffd25d',
    green:'#76ffb0', violet:'#9a68ff', orange:'#ff9b54', red:'#ff536b'
  };

  const O = (x,type,world,w,h,anchor='floor') => ({x,type,world,w,h,anchor,collected:false,passed:false});
  const C = (x,world,anchor='floor') => O(x,'core',world,30,30,anchor);
  const B = (x,world,anchor='floor') => O(x,'bossCore',world,38,38,anchor);
  const D = (x,world,centerY,amp=90,freq=2.2,phase=0) => ({x,type:'drone',world,w:46,h:46,centerY,amp,freq,phase,collected:false,passed:false});
  const E = (x,centerY,amp=85,freq=2.4,period=1.15,phase=0) => ({x,type:'echo',world:0,w:48,h:48,centerY,amp,freq,period,phase,collected:false,passed:false});
  const R = (x,w=54,h=170,anchor='floor') => ({x,type:'rift',world:-1,w,h,anchor,collected:false,passed:false});
  const S = (x,anchor='floor') => O(x,'shield',-1,34,34,anchor);

  const stages = [
    {
      abs:9, act:'ACT III — FRACTURE', name:'PHASE LOCK',
      hint:'Rifts exist in both realities. Pulse THROUGH them — do not simply switch early.',
      length:6440, speed:366, gravityFlip:false,
      obstacles:[
        O(694,'spike',0,86,34),C(986,0),R(1333,58,165),O(1635,'wall',1,64,155),
        D(1971,0,285,105,2.25,.4),R(2296,58,190),C(2576,1),O(2856,'spike',1,100,34),
        O(3181,'wall',0,66,168),R(3539,62,180),D(3886,1,270,115,2.55,1.6),C(4189,0),
        O(4514,'spike',0,108,34),R(4850,60,205),O(5197,'wall',1,70,178),C(5499,1),
        R(5824,62,170),O(6082,'spike',0,90,34)
      ]
    },
    {
      abs:10, act:'ACT III — FRACTURE', name:'CROSS CURRENT',
      hint:'Gravity flips on Pulse. The rift timing stays the same.',
      length:6785, speed:378, gravityFlip:true,
      obstacles:[
        O(728,'wall',0,60,128,'floor'),R(1098,56,155,'ceiling'),C(1411,1,'ceiling'),
        O(1736,'spike',1,92,34,'ceiling'),O(2061,'wall',0,64,150,'floor'),R(2397,60,180,'floor'),
        D(2733,1,270,115,2.5,.8),C(3013,0,'floor'),O(3338,'wall',1,68,165,'ceiling'),
        R(3696,60,190,'ceiling'),O(4032,'spike',0,104,34,'floor'),C(4357,1,'ceiling'),
        D(4704,0,290,105,2.75,2.0),R(5051,62,180,'floor'),O(5398,'wall',1,70,178,'ceiling'),
        O(5779,'spike',0,112,34,'floor'),R(6138,62,200,'ceiling'),C(6418,1,'ceiling')
      ]
    },
    {
      abs:11, act:'ACT III — FRACTURE', name:'ECHO CHAMBER',
      hint:'Echo drones switch reality on their own. Read the glow before you commit.',
      length:7130, speed:390, gravityFlip:false,
      obstacles:[
        E(762,280,95,2.2,1.35,.1),O(1098,'spike',0,96,34),C(1378,0),E(1691,300,110,2.5,1.1,.7),
        R(2027,58,180),O(2363,'wall',1,66,170),E(2710,260,120,2.7,.95,1.4),C(2990,1),
        O(3293,'spike',1,108,34),R(3629,60,195),E(3965,305,100,2.85,1.05,2.3),
        O(4301,'wall',0,70,180),C(4614,0),E(4950,270,125,3.0,.9,3.0),R(5286,62,205),
        O(5645,'spike',0,116,34),E(6003,295,110,3.1,.85,.4),O(6328,'wall',1,72,175),C(6675,1)
      ]
    },
    {
      abs:12, act:'ACT III — FRACTURE', name:'BREAKPOINT',
      hint:'Hunter Wraith found the fracture. Take five cores before the breach closes.',
      length:8050, speed:405, gravityFlip:false, boss:true, bossRequired:5, voidChase:true,
      obstacles:[
        O(661,'spike',0,92,34),E(952,285,100,2.55,1.1,.2),B(1243,0),R(1546,58,180),
        O(1859,'wall',1,68,170),B(2162,1),D(2453,0,295,115,2.7,1.0),O(2778,'spike',0,110,34),
        R(3091,60,195),B(3405,0),E(3718,270,120,2.9,.95,1.9),O(4054,'wall',1,70,185),
        B(4379,1),R(4693,62,210),O(5018,'spike',1,118,34),D(5342,0,300,120,3.0,.4),
        B(5667,0),S(5914),O(6194,'wall',1,74,190),R(6552,64,205),E(6888,285,125,3.1,.82,2.7),
        O(7235,'spike',0,120,34),O(7549,'wall',1,74,178)
      ]
    },
    {
      abs:13, act:'ACT IV — COLLAPSE', name:'REDLINE',
      hint:'The system stops teaching. Keep the rhythm or get erased.',
      length:7360, speed:420, gravityFlip:false,
      obstacles:[
        R(683,56,170),O(974,'spike',0,96,34),E(1266,285,110,2.8,1.0,.2),O(1557,'wall',1,68,175),
        R(1882,58,195),D(2184,0,300,115,3.0,1.1),C(2464,0),O(2733,'spike',1,112,34),
        E(3058,260,125,3.1,.9,2.0),R(3382,60,200),O(3707,'wall',0,70,188),C(3987,1),
        O(4278,'spike',0,120,34),R(4592,62,210),E(4917,300,120,3.2,.8,.6),O(5253,'wall',1,72,190),
        D(5566,0,275,130,3.25,2.4),R(5891,64,215),O(6227,'spike',1,124,34),C(6541,1),
        R(6832,62,190)
      ]
    },
    {
      abs:14, act:'ACT IV — COLLAPSE', name:'DEAD SIGNAL',
      hint:'Blackout. Echoes. Rifts. Pulse is your radar and your only opening.',
      length:7590, speed:428, gravityFlip:false, blackout:true,
      obstacles:[
        C(694,0),R(1008,58,185),E(1333,280,115,2.8,1.05,.2),O(1669,'spike',0,108,34),
        O(1994,'wall',1,70,180),R(2318,60,205),E(2654,300,120,3.0,.9,1.5),S(2923),
        O(3203,'spike',1,118,34),R(3528,62,215),D(3853,0,280,130,3.1,.7),C(4133,1),
        O(4435,'wall',0,72,190),E(4760,265,125,3.2,.82,2.6),R(5085,64,210),
        O(5421,'spike',0,122,34),D(5746,1,300,125,3.3,2.0),R(6070,64,220),
        O(6406,'wall',1,76,192),E(6742,285,130,3.35,.75,.4),C(7067,0)
      ]
    },
    {
      abs:15, act:'ACT IV — COLLAPSE', name:'NO RETURN',
      hint:'The collapse is behind you now. Perfect Pulses push it back.',
      length:8280, speed:440, gravityFlip:true, voidChase:true,
      obstacles:[
        O(661,'spike',0,100,34),R(963,58,185,'ceiling'),E(1288,275,115,3.0,.92,.1),
        O(1613,'wall',1,70,178,'floor'),C(1893,1,'floor'),R(2206,60,205,'floor'),
        D(2531,0,295,125,3.15,1.2),O(2867,'spike',0,116,34,'ceiling'),R(3192,62,215,'ceiling'),
        O(3528,'wall',1,72,190,'floor'),S(3808),E(4133,265,130,3.3,.8,2.1),
        R(4458,64,220,'floor'),O(4794,'spike',1,124,34,'ceiling'),C(5096,0,'ceiling'),
        D(5421,1,300,130,3.4,2.6),R(5757,64,215,'ceiling'),O(6104,'wall',0,74,195,'floor'),
        E(6440,280,135,3.45,.72,.6),R(6787,66,225,'floor'),O(7134,'spike',0,128,34,'ceiling'),
        O(7470,'wall',1,76,198,'floor'),R(7795,64,210,'ceiling')
      ]
    },
    {
      abs:16, act:'ACT IV — COLLAPSE', name:'EVENT HORIZON',
      hint:'Hunter Prime. Eight cores. Every mechanic. One clean exit.',
      length:9890, speed:452, gravityFlip:false, boss:true, bossRequired:8, finalBoss:true, voidChase:true,
      obstacles:[
        O(627,'spike',0,104,34),E(918,285,120,3.1,.9,.2),B(1210,0),R(1501,58,190),
        O(1803,'wall',1,70,185),B(2106,1),D(2397,0,300,125,3.2,.8),O(2710,'spike',0,118,34),
        R(3024,60,210),B(3338,0),E(3651,270,130,3.35,.78,1.5),O(3987,'wall',1,72,195),
        B(4301,1),R(4614,62,220),O(4939,'spike',1,124,34),D(5264,0,295,135,3.45,2.0),
        B(5589,0),S(5835),E(6138,265,135,3.55,.7,.4),R(6462,64,225),
        O(6798,'wall',1,76,200),B(7123,1),O(7448,'spike',0,130,34),D(7773,1,305,130,3.6,1.0),
        B(8098,0),R(8422,66,230),E(8747,280,140,3.65,.65,2.5),B(9050,1),
        O(9318,'spike',1,132,34)
      ]
    }
  ];

  const state = {
    active:false, paused:false, stageAbs:9, local:0, distance:0, world:0, score:0,
    pulseCooldown:0, pulseGrace:0, combo:0, overdrive:0, overdriveTime:0,
    deadTimer:0, stageCompleteTimer:0, gravitySign:1, shake:0, slowMo:0,
    coyote:0, jumpBuffer:0, elapsed:0, shield:0, revealTimer:0,
    perfect:0, clutch:0, near:0, deaths:0, bossHits:0, bossFlash:0,
    voidPressure:0, stageStart:{perfect:0,clutch:0,near:0,deaths:0}
  };

  const player = { x:PLAYER_X, y:FLOOR-PLAYER_H, vy:0, grounded:true, trail:[] };
  let obstacles = [];
  let particles = [];
  let rings = [];
  let feedback = [];
  let last = performance.now();
  let bannerTimer = 0;
  let actOverlayTimer = 0;
  let audioCtx = null;
  let fxMuted = false;
  let frameId = 0;
  let platformPaused = false;
  let pausedByPlatform = false;

  const current = () => stages[state.local];
  const rectOverlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  const playerRect = () => ({x:player.x+6,y:player.y+6,w:PLAYER_W-12,h:PLAYER_H-10});

  function effectiveWorld(o) {
    if (o.type !== 'echo') return o.world;
    return Math.floor((state.elapsed + o.phase) / o.period) % 2;
  }

  function screenX(o) { return o.x - state.distance + PLAYER_X; }

  function obstacleRect(o) {
    const x = screenX(o);
    if (o.type === 'drone' || o.type === 'echo') {
      const y = o.centerY + Math.sin(state.elapsed * o.freq + o.phase) * o.amp;
      return {x,y:y-o.h/2,w:o.w,h:o.h};
    }
    const y = o.anchor === 'ceiling' ? CEILING : FLOOR - o.h;
    return {x,y,w:o.w,h:o.h};
  }

  function isPickup(o) { return o.type === 'core' || o.type === 'bossCore' || o.type === 'shield'; }
  function isHazard(o) { return !isPickup(o); }

  function resetPlayer() {
    state.gravitySign = 1;
    player.x = PLAYER_X;
    player.y = FLOOR - PLAYER_H;
    player.vy = 0;
    player.grounded = true;
    player.trail.length = 0;
    state.coyote = .09;
    state.jumpBuffer = 0;
  }

  function saveSnapshot() {
    try {
      const oldRanks = window.PulsePlatform?.save?.ranks || JSON.parse(localStorage.getItem('pulseRanks') || '{}');
      const rank = state.lastRank;
      if (rank) {
        const idx = String(state.stageAbs - 1);
        const value = {C:1,B:2,A:3,S:4};
        if (!oldRanks[idx] || value[rank] > value[oldRanks[idx]]) oldRanks[idx] = rank;
      }
      if (window.PulsePlatform) {
        window.PulsePlatform.setField('ranks', oldRanks, true);
        window.PulsePlatform.setField('unlockedStage', Math.min(16, Math.max(window.PulsePlatform.save.unlockedStage || 1, state.stageAbs + 1)), true);
        window.PulsePlatform.setField('bestScore', Math.max(window.PulsePlatform.save.bestScore || 0, Math.floor(state.score)), true);
      } else {
        localStorage.setItem('pulseRanks', JSON.stringify(oldRanks));
        localStorage.setItem('pulseUnlockedStage', String(Math.min(16, state.stageAbs + 1)));
      }
    } catch (_) {}
  }

  function loadStage(abs, show=true, resetStats=true) {
    state.stageAbs = Math.max(9, Math.min(16, abs));
    state.local = state.stageAbs - 9;
    state.distance = 0; state.world = 0; state.pulseCooldown = 0; state.pulseGrace = 0;
    state.combo = 0; state.overdrive = 0; state.overdriveTime = 0; state.deadTimer = 0;
    state.stageCompleteTimer = 0; state.shake = 0; state.slowMo = 0; state.shield = 0;
    state.revealTimer = .65; state.bossHits = 0; state.bossFlash = 0; state.voidPressure = 0;
    particles=[]; rings=[]; feedback=[]; resetPlayer();
    if (resetStats) state.stageStart = {perfect:state.perfect,clutch:state.clutch,near:state.near,deaths:state.deaths};
    obstacles = current().obstacles.map(o => ({...o,collected:false,passed:false}));
    syncHud();
    if (show) showBanner();
    showActIfNeeded();
  }

  function start(abs=9, carryScore=0) {
    state.active = true;
    state.paused = false;
    state.score = Math.max(0, Number(carryScore) || 0);
    state.perfect = 0; state.clutch = 0; state.near = 0; state.deaths = 0;
    ui.menu?.classList.remove('active'); ui.pause?.classList.remove('active'); ui.victory?.classList.remove('active');
    ui.pauseBtn.textContent = 'PAUSE'; ui.pauseBtn.setAttribute('aria-pressed','false');
    loadStage(abs,true,true);
    initAudio();
    last = performance.now();
  }

  function stopToMenu() {
    state.active = false; state.paused = false;
    ui.pause?.classList.remove('active'); ui.victory?.classList.remove('active'); ui.menu?.classList.add('active');
    ui.pauseBtn.textContent='PAUSE'; ui.pauseBtn.setAttribute('aria-pressed','false');
  }

  function showBanner() {
    clearTimeout(bannerTimer);
    const s=current();
    ui.bannerStage.textContent=`STAGE ${String(state.stageAbs).padStart(2,'0')} / 16`;
    ui.bannerName.textContent=s.name;
    ui.bannerHint.textContent=s.hint;
    ui.banner.classList.add('show');
    bannerTimer=setTimeout(()=>ui.banner.classList.remove('show'),2300);
  }

  function showActIfNeeded() {
    if (state.stageAbs !== 9 && state.stageAbs !== 13) return;
    const overlay=document.querySelector('.act-overlay');
    if (!overlay) return;
    const s=current();
    const parts=s.act.split(' — ');
    overlay.querySelector('small').textContent=parts[0];
    overlay.querySelector('strong').textContent=parts[1] || '';
    overlay.querySelector('span').textContent=state.stageAbs===9?'Reality has fractured. New rules now overlap.':'Everything you learned now stacks together.';
    overlay.classList.add('show');
    clearTimeout(actOverlayTimer);
    actOverlayTimer=setTimeout(()=>overlay.classList.remove('show'),1900);
  }

  function togglePause(force) {
    if (!state.active || state.deadTimer > 0 || state.stageCompleteTimer > 0) return;
    state.paused = typeof force === 'boolean' ? force : !state.paused;
    ui.pause?.classList.toggle('active', state.paused);
    ui.pauseBtn.textContent = state.paused ? 'RESUME' : 'PAUSE';
    ui.pauseBtn.setAttribute('aria-pressed', String(state.paused));
    if (!state.paused) last = performance.now();
  }

  function doJump() {
    player.grounded = false; state.coyote = 0; state.jumpBuffer = 0;
    player.vy = -state.gravitySign * JUMP;
    sound('jump'); burst(player.x + 17, player.y + 23, state.world, 7, 1.1);
  }

  function jump() {
    if (!state.active || state.paused || state.deadTimer > 0 || state.stageCompleteTimer > 0) return;
    if (player.grounded || state.coyote > 0) doJump(); else state.jumpBuffer = .115;
  }

  function pulse() {
    if (!state.active || state.paused || state.deadTimer > 0 || state.stageCompleteTimer > 0 || state.pulseCooldown > 0) return;
    const old = state.world;
    state.world = 1 - state.world;
    state.pulseCooldown = state.overdriveTime > 0 ? .075 : .115;
    state.pulseGrace = .23;
    state.revealTimer = current().blackout ? .82 : state.revealTimer;
    if (current().gravityFlip) {
      state.gravitySign *= -1; player.grounded = false; player.vy = state.gravitySign * -120; state.coyote = 0;
    }
    const nearest = obstacles.filter(o => !o.collected && isHazard(o))
      .map(o => ({o,x:screenX(o),w:effectiveWorld(o)}))
      .filter(v => v.x > PLAYER_X - 26 && v.x < PLAYER_X + 190 && (v.o.type === 'rift' || v.w === old))
      .sort((a,b) => a.x - b.x)[0];
    rings.push({x:player.x+17,y:player.y+23,r:18,a:1,world:state.world});
    if (nearest) {
      const clutch = nearest.x - PLAYER_X < 86;
      state.combo++; state.perfect++; if (clutch) state.clutch++;
      state.overdrive = Math.min(100, state.overdrive + (clutch ? 35 : 29));
      state.score += (clutch ? 260 : 175) * Math.max(1, state.combo);
      state.slowMo = clutch ? .17 : .11; state.shake = Math.max(state.shake, clutch ? 14 : 10);
      if (current().voidChase) state.voidPressure = Math.max(0, state.voidPressure - (clutch ? .2 : .12));
      addFeedback(clutch ? 'CLUTCH PULSE' : 'PERFECT PULSE', clutch ? COLORS.gold : COLORS.white, PLAYER_X + 78, player.y - 12, clutch ? 1.15 : 1);
      burst(PLAYER_X + 48, player.y + 23, state.world, clutch ? 32 : 24, clutch ? 3 : 2.5);
      sound(clutch ? 'clutch' : 'perfect');
      if (state.overdrive >= 100 && state.overdriveTime <= 0) triggerOverdrive();
    } else {
      state.combo = Math.max(0, state.combo - 1); state.overdrive = Math.max(0, state.overdrive - 5);
      if (current().voidChase) state.voidPressure = Math.min(1, state.voidPressure + .04);
      sound('pulse');
    }
    flashPulse();
  }

  function triggerOverdrive() {
    state.overdriveTime = 5.4; state.overdrive = 100; state.slowMo = .2; state.shake = 16;
    if (current().voidChase) state.voidPressure = Math.max(0, state.voidPressure - .25);
    addFeedback('OVERDRIVE', COLORS.white, W * .5, 160, 1.5); burst(player.x+17,player.y+23,state.world,50,3.2); sound('overdrive');
  }

  function flashPulse() {
    ui.pulseFlash.classList.remove('cyan','magenta'); void ui.pulseFlash.offsetWidth;
    ui.pulseFlash.classList.add(state.world === 0 ? 'cyan' : 'magenta');
  }

  function die() {
    if (state.deadTimer > 0 || state.stageCompleteTimer > 0) return;
    if (state.shield > 0) {
      state.shield = 0; state.slowMo = .14; state.shake = 16;
      addFeedback('SHIELD BREAK', COLORS.green, player.x + 60, player.y - 15, 1.1);
      burst(player.x+17,player.y+23,state.world,34,3.2,COLORS.green); sound('shieldBreak'); return;
    }
    state.deadTimer = .42; state.deaths++; state.combo = 0; state.overdrive = 0; state.overdriveTime = 0; state.shake = 18;
    ui.death?.classList.add('show'); burst(player.x+17,player.y+23,state.world,36,4); sound('death');
  }

  function restart() { ui.death?.classList.remove('show'); loadStage(state.stageAbs,false,false); }

  function rankStage() {
    const d=state.deaths-state.stageStart.deaths,p=state.perfect-state.stageStart.perfect,n=state.near-state.stageStart.near,c=state.clutch-state.stageStart.clutch;
    let rank='C'; if(d===0&&(p>=3||c>=1)) rank='S'; else if(d<=1&&p>=2) rank='A'; else if(d<=3) rank='B';
    if(current().boss&&state.bossHits<(current().bossRequired||1)&&(rank==='S'||rank==='A')) rank='B';
    return {rank,d,p,n,c};
  }

  function completeStage() {
    if (state.stageCompleteTimer > 0) return;
    const r = rankStage(); state.lastRank = r.rank; state.stageCompleteTimer = 1.85;
    state.score += 1600 + state.combo * 140 + ({S:1100,A:750,B:420,C:180}[r.rank]); state.shake = 9; sound('clear');
    addFeedback(`RANK ${r.rank}`, r.rank==='S'?COLORS.gold:COLORS.white, W*.5,175,1.65);
    ui.bannerStage.textContent=`STAGE ${String(state.stageAbs).padStart(2,'0')} CLEAR • RANK ${r.rank}`;
    ui.bannerName.textContent=current().name;
    const boss=current().boss?` • cores ${state.bossHits}/${current().bossRequired}`:'';
    ui.bannerHint.textContent=`${r.p} perfect • ${r.c} clutch • ${r.d} deaths${boss}`;
    ui.banner.classList.add('show'); saveSnapshot();
  }

  function advance() {
    ui.banner.classList.remove('show');
    if (state.stageAbs >= 16) { finish(); return; }
    loadStage(state.stageAbs + 1, true, true);
  }

  function finish() {
    state.active=false; saveSnapshot();
    const destroyed=state.bossHits>=current().bossRequired;
    ui.victoryEyebrow.textContent=destroyed?'SYSTEM COLLAPSE COMPLETE':'YOU ESCAPED — PRIME SURVIVED';
    ui.victoryTitle.innerHTML=destroyed?'HUNTER PRIME<br>ERASED.':'EVENT HORIZON<br>BREACHED.';
    const ranks=window.PulsePlatform?.save?.ranks||{}; const sRanks=Object.values(ranks).filter(v=>v==='S').length;
    ui.victoryStats.textContent=`16 stages • ${sRanks} S-ranks • ${state.perfect} perfect pulses • ${state.near} near misses • ${state.deaths} deaths • ${Math.floor(state.score).toLocaleString()} score`;
    ui.victory.classList.add('active');
    window.PulsePlatform?.setField?.('unlockedStage',16,true);
    window.PulsePlatform?.sendScore?.(state.score);
    window.dispatchEvent(new CustomEvent('pulse:campaign-complete',{detail:{score:Math.floor(state.score),destroyed}}));
  }

  function update(raw) {
    if(!state.active||state.paused)return;
    const scale=state.slowMo>0?.38:1; if(state.slowMo>0)state.slowMo=Math.max(0,state.slowMo-raw); const dt=raw*scale;
    state.elapsed+=dt; state.pulseCooldown=Math.max(0,state.pulseCooldown-dt); state.pulseGrace=Math.max(0,state.pulseGrace-dt);
    state.shake=Math.max(0,state.shake-23*dt);state.coyote=Math.max(0,state.coyote-dt);state.jumpBuffer=Math.max(0,state.jumpBuffer-dt);
    state.revealTimer=Math.max(0,state.revealTimer-raw);state.bossFlash=Math.max(0,state.bossFlash-dt);
    if(state.deadTimer>0){state.deadTimer-=raw;effects(raw);if(state.deadTimer<=0)restart();return;}
    if(state.stageCompleteTimer>0){state.stageCompleteTimer-=raw;effects(raw);if(state.stageCompleteTimer<=0)advance();return;}
    const s=current();let speed=s.speed;
    if(state.overdriveTime>0){state.overdriveTime-=raw;speed*=1.22;state.overdrive=Math.max(0,100*(state.overdriveTime/5.4));state.score+=60*raw;}
    state.distance+=speed*dt; state.score+=speed*dt*.095*(1+Math.min(5,state.combo)*.13);
    if(s.voidChase) state.voidPressure=Math.min(1,state.voidPressure+dt*.018);
    const was=player.grounded;player.grounded=false;player.vy+=GRAVITY*state.gravitySign*dt;player.y+=player.vy*dt;
    if(state.gravitySign>0&&player.y+PLAYER_H>=FLOOR){player.y=FLOOR-PLAYER_H;player.vy=0;player.grounded=true;}
    else if(state.gravitySign<0&&player.y<=CEILING){player.y=CEILING;player.vy=0;player.grounded=true;}
    if(was&&!player.grounded)state.coyote=.085;if(player.grounded&&state.jumpBuffer>0)doJump();
    player.trail.unshift({x:player.x,y:player.y,a:1,world:state.world});if(player.trail.length>(state.overdriveTime>0?22:10))player.trail.pop();player.trail.forEach(t=>t.a*=.86);
    collisions();nearMisses();effects(dt);
    if(s.voidChase){const edge=42+Math.min(86,state.distance/s.length*72)+state.voidPressure*42;if(edge>player.x-12)die();}
    if(state.distance>=s.length)completeStage();syncHud();
  }

  function collisions() {
    const pr=playerRect();
    for(const o of obstacles){if(o.collected)continue;const r=obstacleRect(o);if(r.x>W+130||r.x+r.w<-120||!rectOverlap(pr,r))continue;
      const ew=effectiveWorld(o);
      if(o.type==='core'){if(ew===state.world)collect(o,r,false);continue;}
      if(o.type==='bossCore'){if(ew===state.world)collect(o,r,true);continue;}
      if(o.type==='shield'){o.collected=true;state.shield=1;state.score+=700;addFeedback('SHIELD ONLINE',COLORS.green,r.x,r.y-12,1.05);burst(r.x+r.w/2,r.y+r.h/2,state.world,20,2.4,COLORS.green);sound('shield');continue;}
      if(o.type==='rift'){if(state.pulseGrace<=0)die();continue;}
      if(ew===state.world){if(state.shield>0)o.collected=true;die();return;}
    }
  }

  function collect(o,r,boss) {
    o.collected=true;state.score+=(boss?1200:520)+state.combo*(boss?70:30);state.overdrive=Math.min(100,state.overdrive+(boss?18:11));
    burst(r.x+r.w/2,r.y+r.h/2,effectiveWorld(o),boss?26:15,boss?3.1:2.4,boss?COLORS.gold:null);
    if(boss){state.bossHits++;state.bossFlash=.38;state.shake=Math.max(state.shake,14);if(current().voidChase)state.voidPressure=Math.max(0,state.voidPressure-.18);addFeedback(`HUNTER HIT ${state.bossHits}/${current().bossRequired}`,COLORS.gold,W*.58,150,1.12);sound('bossHit');}
    else sound('core');
  }

  function nearMisses() {
    const pr=playerRect();
    for(const o of obstacles){if(o.passed||o.collected||isPickup(o)||o.type==='rift')continue;const r=obstacleRect(o);if(r.x+r.w>=pr.x)continue;o.passed=true;if(effectiveWorld(o)!==state.world)continue;
      let gap=999;if(o.type==='drone'||o.type==='echo'){const dx=(pr.x+pr.w/2)-(r.x+r.w/2),dy=(pr.y+pr.h/2)-(r.y+r.h/2);gap=Math.hypot(dx,dy)-Math.max(pr.w,pr.h)/2-r.w/2;}
      else if(o.anchor==='ceiling')gap=pr.y-(r.y+r.h);else gap=r.y-(pr.y+pr.h);
      if(gap>=-1&&gap<17){state.near++;state.score+=300+state.combo*32;state.overdrive=Math.min(100,state.overdrive+9);state.slowMo=Math.max(state.slowMo,.075);addFeedback('NEAR MISS',COLORS.gold,player.x+65,player.y-8,.95);sound('near');}
    }
  }

  function effects(dt) {
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=250*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0);
    rings.forEach(r=>{r.r+=320*dt;r.a-=1.8*dt;});rings=rings.filter(r=>r.a>0);
    feedback.forEach(f=>{f.y-=30*dt;f.life-=dt;});feedback=feedback.filter(f=>f.life>0);
  }

  function burst(x,y,world,count=10,power=1,forced=null){const color=forced||(world===0?COLORS.cyan:COLORS.magenta);for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=(45+Math.random()*150)*power;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.55,max:.9,size:1.5+Math.random()*3.5,color});}}
  function addFeedback(text,color,x,y,scale=1){feedback.push({text,color,x,y,life:.8,max:.8,scale});}

  function syncHud(){const s=current();ui.stageLabel.textContent=`STAGE ${String(state.stageAbs).padStart(2,'0')} / 16`;ui.stageName.textContent=s.name;ui.score.textContent=String(Math.floor(state.score)).padStart(6,'0');const sh=state.shield?' • SHIELD':'';ui.combo.textContent=state.overdriveTime>0?`OVERDRIVE • x${Math.max(1,state.combo)}${sh}`:`COMBO x${state.combo}${sh}`;ui.meter.style.width=`${Math.max(0,Math.min(100,state.overdrive))}%`;}

  function draw(){if(!state.active)return;const s=current();const sx=state.shake?(Math.random()-.5)*state.shake:0,sy=state.shake?(Math.random()-.5)*state.shake*.55:0;ctx.save();ctx.translate(sx,sy);background(s);track(s);progress(s);drawObstacles();if(s.boss)hunter(s);if(s.blackout)blackout();drawPlayer();drawRings();drawParticles();drawFeedback();if(s.voidChase)voidWall(s);ctx.restore();}

  function background(s) {
    const c=state.world===0?[20,165,255]:[255,35,158],g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,`rgb(${4+c[0]*.015},${6+c[1]*.025},${18+c[2]*.025})`);g.addColorStop(.58,'#07101d');g.addColorStop(1,'#03050b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const cx=720+Math.sin(state.elapsed*.1)*25,cy=155,rg=ctx.createRadialGradient(cx,cy,0,cx,cy,170);rg.addColorStop(0,state.world===0?'rgba(85,239,255,.18)':'rgba(255,67,184,.19)');rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.fillRect(cx-180,cy-180,360,360);
    ctx.globalAlpha=s.blackout?.12:.34;for(let i=0;i<18;i++){const x=((i*91-state.distance*.09)%(W+120))-60,h=35+((i*37)%105);ctx.fillStyle=i%3===0?'#0d2944':'#101a31';ctx.fillRect(x,FLOOR-h-58,54,h);}ctx.globalAlpha=1;
    if(state.overdriveTime>0){ctx.strokeStyle=state.world===0?'rgba(85,239,255,.3)':'rgba(255,67,184,.3)';ctx.lineWidth=2;for(let i=0;i<26;i++){const y=(i*29+state.elapsed*300)%H,x=(i*83)%W;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-140,y);ctx.stroke();}}
  }

  function track(s){const accent=state.world===0?COLORS.cyan:COLORS.magenta,ghost=state.world===0?'rgba(85,239,255,.12)':'rgba(255,67,184,.12)';ctx.fillStyle='#07111d';ctx.fillRect(0,FLOOR,W,H-FLOOR);ctx.fillRect(0,0,W,CEILING);ctx.fillStyle=accent;ctx.globalAlpha=.75;ctx.fillRect(0,FLOOR,W,2);if(s.gravityFlip)ctx.fillRect(0,CEILING-2,W,2);ctx.globalAlpha=1;ctx.strokeStyle=ghost;for(let x=-80;x<W+80;x+=70){const off=(state.distance*.35)%70;ctx.beginPath();ctx.moveTo(x-off,FLOOR);ctx.lineTo(x-off-80,H);ctx.stroke();}}
  function progress(s){const p=Math.max(0,Math.min(1,state.distance/s.length));ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(220,67,520,3);const g=ctx.createLinearGradient(220,0,740,0);g.addColorStop(0,COLORS.cyan);g.addColorStop(1,COLORS.magenta);ctx.fillStyle=g;ctx.fillRect(220,67,520*p,3);}

  function drawObstacles(){for(const o of obstacles){if(o.collected)continue;const r=obstacleRect(o);if(r.x>W+140||r.x+r.w<-130)continue;const ew=effectiveWorld(o),active=o.world===-1||ew===state.world,color=o.type==='rift'?COLORS.orange:ew===0?COLORS.cyan:ew===1?COLORS.magenta:COLORS.green;ctx.save();ctx.globalAlpha=active?1:.13;ctx.shadowColor=active?color:'transparent';ctx.shadowBlur=active?18:0;if(o.type==='wall')wall(r,color,active);else if(o.type==='spike')spike(r,color,active,o.anchor);else if(o.type==='core')core(r,color,false);else if(o.type==='bossCore')core(r,COLORS.gold,true);else if(o.type==='drone'||o.type==='echo')drone(r,color,active,o.type==='echo');else if(o.type==='shield')shield(r);else if(o.type==='rift')rift(r);ctx.restore();}}
  function wall(r,color,active){const g=ctx.createLinearGradient(r.x,r.y,r.x+r.w,r.y+r.h);g.addColorStop(0,active?color:'rgba(255,255,255,.15)');g.addColorStop(1,'rgba(7,12,24,.94)');ctx.fillStyle=g;roundRect(r.x,r.y,r.w,r.h,9);ctx.fill();ctx.strokeStyle=active?color:'rgba(255,255,255,.22)';ctx.lineWidth=2;roundRect(r.x,r.y,r.w,r.h,9);ctx.stroke();}
  function spike(r,color,active,anchor){ctx.fillStyle=active?color:'rgba(255,255,255,.18)';const count=Math.max(2,Math.floor(r.w/22)),sw=r.w/count;for(let i=0;i<count;i++){ctx.beginPath();if(anchor==='ceiling'){ctx.moveTo(r.x+i*sw,r.y);ctx.lineTo(r.x+i*sw+sw/2,r.y+r.h);ctx.lineTo(r.x+(i+1)*sw,r.y);}else{ctx.moveTo(r.x+i*sw,r.y+r.h);ctx.lineTo(r.x+i*sw+sw/2,r.y);ctx.lineTo(r.x+(i+1)*sw,r.y+r.h);}ctx.closePath();ctx.fill();}}
  function core(r,color,boss){const cx=r.x+r.w/2,cy=r.y+r.h/2,rad=boss?28:22,rg=ctx.createRadialGradient(cx,cy,2,cx,cy,rad);rg.addColorStop(0,'#fff');rg.addColorStop(.22,color);rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=boss?3:2;ctx.beginPath();ctx.arc(cx,cy,10+Math.sin(state.elapsed*7)*2,0,Math.PI*2);ctx.stroke();}
  function drone(r,color,active,echo){const cx=r.x+r.w/2,cy=r.y+r.h/2;ctx.fillStyle=active?'#091321':'rgba(255,255,255,.08)';ctx.strokeStyle=active?color:'rgba(255,255,255,.2)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,r.w*.36,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.save();ctx.translate(cx,cy);ctx.rotate(state.elapsed*(echo?4.2:3.2));for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillStyle=active?color:'rgba(255,255,255,.2)';ctx.fillRect(15,-2,16,4);}ctx.restore();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx,cy,4.5,0,Math.PI*2);ctx.fill();}
  function shield(r){const cx=r.x+r.w/2,cy=r.y+r.h/2;ctx.strokeStyle=COLORS.green;ctx.fillStyle='rgba(118,255,176,.12)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,17,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font='800 12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('+',cx,cy+1);}
  function rift(r){const safe=state.pulseGrace>0;ctx.fillStyle=safe?'rgba(255,210,93,.16)':'rgba(255,120,72,.22)';ctx.strokeStyle=safe?COLORS.gold:COLORS.orange;ctx.lineWidth=safe?2:4;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=safe?10:24;roundRect(r.x,r.y,r.w,r.h,12);ctx.fill();ctx.stroke();for(let y=r.y+10;y<r.y+r.h-5;y+=20){ctx.globalAlpha=.45;ctx.fillStyle=ctx.strokeStyle;ctx.fillRect(r.x+8,y,r.w-16,2);}ctx.globalAlpha=1;}

  function drawPlayer(){const color=state.world===0?COLORS.cyan:COLORS.magenta;for(let i=player.trail.length-1;i>=0;i--){const t=player.trail[i];ctx.save();ctx.globalAlpha=t.a*.14;ctx.strokeStyle=t.world===0?COLORS.cyan:COLORS.magenta;runner(t.x,t.y,false,i*.18);ctx.restore();}ctx.save();ctx.shadowColor=color;ctx.shadowBlur=state.overdriveTime>0?30:20;ctx.strokeStyle='#f7fbff';ctx.fillStyle=color;runner(player.x,player.y,true,state.elapsed*11);if(state.shield){ctx.strokeStyle=COLORS.green;ctx.globalAlpha=.8;ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.x+17,player.y+23,31,0,Math.PI*2);ctx.stroke();}ctx.restore();}
  function runner(x,y,main,phase){const mid=x+17,head=y+9,top=y+17,bottom=y+31,swing=player.grounded?Math.sin(phase):.45,arm=player.grounded?Math.sin(phase+Math.PI):-.35;ctx.fillStyle=main?'#f7fbff':ctx.strokeStyle;ctx.beginPath();ctx.arc(mid+3,head,5.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle=main?ctx.fillStyle:ctx.strokeStyle;ctx.lineWidth=main?5.5:4;ctx.beginPath();ctx.moveTo(mid,top);ctx.lineTo(mid-1,bottom);ctx.stroke();ctx.lineWidth=main?4.5:3;ctx.beginPath();ctx.moveTo(mid,top+4);ctx.lineTo(mid-11*arm,top+13);ctx.moveTo(mid,top+5);ctx.lineTo(mid+10*arm,top+12);ctx.stroke();ctx.lineWidth=main?5:3.5;ctx.beginPath();ctx.moveTo(mid-1,bottom);ctx.lineTo(mid+10*swing,y+42);ctx.moveTo(mid-1,bottom);ctx.lineTo(mid-10*swing,y+44);ctx.stroke();if(main){ctx.fillStyle=state.world===0?COLORS.cyan:COLORS.magenta;ctx.beginPath();ctx.arc(mid,top+6,3.3,0,Math.PI*2);ctx.fill();}}
  function drawRings(){for(const r of rings){ctx.save();ctx.globalAlpha=r.a;ctx.strokeStyle=r.world===0?COLORS.cyan:COLORS.magenta;ctx.lineWidth=3;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();ctx.restore();}}
  function drawParticles(){for(const p of particles){ctx.save();ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=8;ctx.fillRect(p.x,p.y,p.size,p.size);ctx.restore();}}
  function drawFeedback(){for(const f of feedback){ctx.save();ctx.globalAlpha=Math.max(0,f.life/f.max);ctx.fillStyle=f.color;ctx.font=`900 ${Math.round(17*f.scale)}px system-ui`;ctx.textAlign='center';ctx.shadowColor=f.color;ctx.shadowBlur=12;ctx.fillText(f.text,f.x,f.y);ctx.restore();}}

  function hunter(s){const required=s.bossRequired,hp=Math.max(0,required-state.bossHits),right=s.finalBoss?815:840,cy=215+Math.sin(state.elapsed*1.9)*28,r=s.finalBoss?58:44;ctx.save();const color=state.bossFlash>0?COLORS.gold:COLORS.violet;ctx.shadowColor=color;ctx.shadowBlur=32+state.distance/s.length*24;ctx.fillStyle='#090715';ctx.strokeStyle=color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(right,cy,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(right,cy,7+Math.sin(state.elapsed*8)*1.5,0,Math.PI*2);ctx.fill();ctx.font='800 11px system-ui';ctx.fillStyle='rgba(255,255,255,.82)';ctx.textAlign='center';ctx.fillText(s.finalBoss?'HUNTER PRIME':'HUNTER WRAITH',right,cy-r-20);ctx.fillStyle='rgba(255,255,255,.12)';roundRect(right-62,cy+r+17,124,7,4);ctx.fill();const g=ctx.createLinearGradient(right-62,0,right+62,0);g.addColorStop(0,COLORS.magenta);g.addColorStop(1,COLORS.violet);ctx.fillStyle=g;roundRect(right-62,cy+r+17,124*(hp/required),7,4);ctx.fill();ctx.restore();}
  function blackout(){const radius=state.revealTimer>0?520:132,cx=player.x+17,cy=player.y+23,g=ctx.createRadialGradient(cx,cy,28,cx,cy,radius);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.38,state.revealTimer>0?'rgba(0,0,0,.06)':'rgba(0,0,0,.2)');g.addColorStop(1,'rgba(0,0,0,.91)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  function voidWall(s){const danger=Math.min(1,state.distance/s.length),width=42+danger*72+state.voidPressure*42+Math.sin(state.elapsed*5)*5,g=ctx.createLinearGradient(0,0,width,0);g.addColorStop(0,'rgba(175,0,255,.96)');g.addColorStop(.48,'rgba(255,0,117,.62)');g.addColorStop(1,'rgba(255,0,100,0)');ctx.fillStyle=g;ctx.fillRect(0,0,width,H);}
  function roundRect(x,y,w,h,r){if(w<=0||h<=0)return;const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();}

  function initAudio(){if(fxMuted||audioCtx)return;const AC=window.AudioContext||window.webkitAudioContext;if(AC)audioCtx=new AC();}
  function tone(freq,dur,type,vol,end=null,delay=0){if(!audioCtx||fxMuted)return;const start=audioCtx.currentTime+delay,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,start);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(1,end),start+dur);g.gain.setValueAtTime(vol,start);g.gain.exponentialRampToValueAtTime(.0001,start+dur);o.connect(g);g.connect(audioCtx.destination);o.start(start);o.stop(start+dur);}
  function sound(k){if(fxMuted||platformPaused||(window.PulsePlatform?.inPlayables&&!window.PulsePlatform.systemAudioEnabled))return;initAudio();if(!audioCtx)return;if(audioCtx.state==='suspended')audioCtx.resume();if(k==='jump')tone(330,.07,'square',.04,430);else if(k==='pulse'){tone(110,.1,'sine',.06,78);tone(660,.07,'triangle',.018,920,.015);}else if(k==='perfect'){tone(460,.09,'triangle',.06,760);tone(920,.11,'sine',.025,1200,.03);}else if(k==='clutch'){tone(180,.12,'sawtooth',.055,95);tone(620,.12,'triangle',.065,1120,.025);}else if(k==='near')tone(760,.07,'triangle',.035,980);else if(k==='core')tone(820,.11,'sine',.055,1180);else if(k==='bossHit'){tone(120,.18,'sawtooth',.09,62);tone(520,.16,'triangle',.055,1040,.02);}else if(k==='shield')tone(560,.12,'sine',.05,840);else if(k==='shieldBreak'){tone(220,.14,'square',.055,90);tone(900,.1,'triangle',.03,400,.02);}else if(k==='death')tone(75,.24,'sawtooth',.09,38);else if(k==='clear'){tone(620,.12,'triangle',.06,880);tone(880,.16,'triangle',.05,1220,.09);}else if(k==='overdrive'){tone(95,.3,'sawtooth',.09,58);tone(380,.24,'triangle',.045,760,.03);}}

  function frame(now){if(platformPaused){frameId=0;return;}const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);draw();frameId=requestAnimationFrame(frame);}
  function handlePlatformPause(){platformPaused=true;pausedByPlatform=state.active&&!state.paused;if(pausedByPlatform)togglePause(true);clearTimeout(bannerTimer);clearTimeout(actOverlayTimer);bannerTimer=0;actOverlayTimer=0;ui.banner?.classList.remove('show');document.querySelector('.act-overlay')?.classList.remove('show');if(frameId){cancelAnimationFrame(frameId);frameId=0;}if(audioCtx?.state==='running')audioCtx.suspend().catch(()=>{});}
  function handlePlatformResume(){platformPaused=false;if(pausedByPlatform)togglePause(false);pausedByPlatform=false;last=performance.now();if(audioCtx&&!fxMuted&&(!window.PulsePlatform?.inPlayables||window.PulsePlatform.systemAudioEnabled)&&audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});if(!frameId)frameId=requestAnimationFrame(frame);}

  window.addEventListener('keydown',e=>{if(!state.active||state.paused)return;const k=e.key.toLowerCase();if([' ','x','p','arrowup','w'].includes(k))e.preventDefault();if(k===' '||k==='arrowup'||k==='w')jump();else if(k==='x'||k==='shift')pulse();else if(k==='p'||k==='escape')togglePause();},{passive:false});
  ui.jump?.addEventListener('pointerdown',e=>{if(state.active){e.preventDefault();jump();}});
  ui.pulse?.addEventListener('pointerdown',e=>{if(state.active){e.preventDefault();pulse();}});
  canvas.addEventListener('pointerdown',e=>{if(!state.active||state.paused)return;const r=canvas.getBoundingClientRect(),x=e.clientX-r.left;if(x<r.width*.5)jump();else pulse();});
  ui.pauseBtn?.addEventListener('click',()=>{if(state.active)togglePause();});
  ui.resume?.addEventListener('click',()=>{if(state.active)togglePause(false);});
  ui.quit?.addEventListener('click',()=>{if(state.active)stopToMenu();});
  ui.mute?.addEventListener('click',()=>{fxMuted=ui.mute.getAttribute('aria-pressed')==='true';});
  window.addEventListener('pulse:system-pause',handlePlatformPause);
  window.addEventListener('pulse:system-resume',handlePlatformResume);
  window.addEventListener('pulse:system-audio',event=>{const enabled=Boolean(event.detail?.enabled);if(!enabled&&audioCtx?.state==='running')audioCtx.suspend().catch(()=>{});else if(enabled&&!platformPaused&&!fxMuted&&audioCtx?.state==='suspended')audioCtx.resume().catch(()=>{});});

  window.PulseFinal = {
    start,
    continue(){const u=window.PulsePlatform?.save?.unlockedStage||Number(localStorage.getItem('pulseUnlockedStage')||9);start(Math.max(9,Math.min(16,u)));},
    get active(){return state.active;},
    get stage(){return state.stageAbs;},
    get score(){return Math.floor(state.score);},
    pause:()=>togglePause(true),
    resume:()=>togglePause(false)
  };

  frameId=requestAnimationFrame(frame);
})();