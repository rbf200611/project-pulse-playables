(() => {
  'use strict';

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
    victoryStats: document.getElementById('victoryStats')
  };

  const W = 960;
  const H = 540;
  const FLOOR = 447;
  const CEILING = 86;
  const PLAYER_X = 176;
  const PLAYER_W = 34;
  const PLAYER_H = 46;
  const BASE_GRAVITY = 1880;
  const JUMP_POWER = 670;
  const COLORS = {
    cyan: '#55efff',
    magenta: '#ff43b8',
    white: '#f7fbff'
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
    deaths: 0
  };

  const player = {
    x: PLAYER_X,
    y: FLOOR - PLAYER_H,
    vy: 0,
    grounded: true,
    trail: []
  };

  let particles = [];
  let activeObstacles = [];
  let lastTime = performance.now();
  let audioCtx = null;
  let muted = false;
  let bannerTimeout = 0;

  function O(x,type,world,w,h,anchor='floor') {
    return { x, type, world, w, h, anchor, collected:false };
  }
  function C(x,world,anchor='floor') {
    return { x, type:'core', world, w:30, h:30, anchor, collected:false };
  }

  const stages = [
    {
      name: 'FIRST CONTACT',
      hint: 'Pulse through what should be impossible.',
      length: 4100,
      speed: 300,
      gravityFlip: false,
      obstacles: [
        O(760,'wall',0,58,110), C(1040,0), O(1320,'spike',1,54,30),
        O(1640,'wall',1,60,130), C(1870,1), O(2160,'spike',0,72,34),
        O(2480,'wall',0,56,155), C(2750,0), O(3100,'wall',1,64,105),
        O(3440,'spike',1,84,34), C(3710,1)
      ]
    },
    {
      name: 'SPLIT SECOND',
      hint: 'Jump and pulse in the same breath.',
      length: 4700,
      speed: 325,
      gravityFlip: false,
      obstacles: [
        O(650,'spike',0,88,36), O(940,'wall',1,64,140), C(1160,1),
        O(1390,'wall',0,66,96), O(1545,'spike',1,70,34),
        O(1900,'wall',1,58,160), C(2130,0), O(2400,'spike',0,104,34),
        O(2690,'wall',0,62,120), O(2960,'wall',1,62,120),
        C(3200,1), O(3490,'spike',1,96,34), O(3780,'wall',0,70,170), C(4230,0)
      ]
    },
    {
      name: 'CHAIN REACTION',
      hint: 'Perfect pulses feed Overdrive. Keep the chain alive.',
      length: 5400,
      speed: 350,
      gravityFlip: false,
      obstacles: [
        O(620,'wall',0,56,120), O(900,'wall',1,56,120), O(1180,'wall',0,56,120),
        O(1460,'wall',1,56,120), C(1680,1), O(1980,'spike',0,90,34),
        O(2260,'wall',1,62,150), O(2510,'spike',1,74,34), C(2750,0),
        O(3020,'wall',0,66,120), O(3280,'wall',1,66,120), O(3550,'wall',0,66,120),
        C(3810,1), O(4100,'spike',1,100,34), O(4450,'wall',0,72,165),
        O(4760,'spike',0,76,34), C(5070,0)
      ]
    },
    {
      name: 'INVERTED',
      hint: 'Every pulse now flips gravity too.',
      length: 4700,
      speed: 330,
      gravityFlip: true,
      obstacles: [
        O(720,'wall',0,60,130,'floor'),
        O(1120,'wall',1,60,130,'ceiling'),
        C(1390,1,'ceiling'),
        O(1720,'wall',0,66,150,'ceiling'),
        O(2080,'wall',1,66,150,'floor'),
        C(2380,0,'floor'),
        O(2680,'spike',0,92,34,'ceiling'),
        O(3020,'spike',1,92,34,'floor'),
        O(3400,'wall',0,64,170,'floor'),
        C(3710,1,'ceiling'),
        O(4060,'wall',1,64,160,'ceiling'),
        C(4440,0,'floor')
      ]
    },
    {
      name: 'THE VOID',
      hint: 'The system is collapsing behind you. Run clean.',
      length: 6200,
      speed: 390,
      gravityFlip: false,
      voidChase: true,
      obstacles: [
        O(600,'spike',0,86,34), O(900,'wall',1,62,130), O(1220,'wall',0,62,145),
        C(1450,0), O(1710,'spike',1,100,34), O(2010,'wall',1,66,165),
        O(2310,'wall',0,66,100), C(2570,1), O(2860,'spike',0,108,34),
        O(3170,'wall',1,70,150), O(3470,'spike',1,88,34), C(3720,0),
        O(3990,'wall',0,72,170), O(4320,'wall',1,72,105),
        O(4630,'spike',0,112,34), C(4890,1), O(5190,'wall',1,72,175),
        O(5520,'spike',1,100,34), O(5820,'wall',0,70,130)
      ]
    }
  ];

  const endlessStageProxy = {
    name:'ENDLESS',
    hint:'No finish line. Only cleaner decisions.',
    length:Infinity,
    speed:335,
    gravityFlip:false,
    voidChase:false,
    obstacles:[]
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
  }

  function loadStage(index, showBanner = true) {
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
    resetPlayer();
    const stage = currentStage();
    activeObstacles = state.mode === 'endless' ? [] : stage.obstacles.map(o => ({...o, collected:false}));
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
    ui.pauseBtn.setAttribute('aria-pressed','false');
  }

  function showStageBanner(stage) {
    clearTimeout(bannerTimeout);
    ui.bannerStage.textContent = state.mode === 'endless' ? 'ENDLESS MODE' : `STAGE ${String(state.stageIndex + 1).padStart(2,'0')}`;
    ui.bannerName.textContent = stage.name;
    ui.bannerHint.textContent = stage.hint;
    ui.banner.classList.add('show');
    bannerTimeout = setTimeout(() => ui.banner.classList.remove('show'), 1900);
  }

  function togglePause(force) {
    if (!state.running || state.deadTimer > 0 || state.stageCompleteTimer > 0) return;
    state.paused = typeof force === 'boolean' ? force : !state.paused;
    ui.pause.classList.toggle('active', state.paused);
    ui.pauseBtn.textContent = state.paused ? 'RESUME' : 'PAUSE';
    ui.pauseBtn.setAttribute('aria-pressed', String(state.paused));
    if (!state.paused) lastTime = performance.now();
  }

  function jump() {
    if (!state.running || state.paused || state.deadTimer > 0 || state.stageCompleteTimer > 0) return;
    if (!player.grounded) return;
    player.grounded = false;
    player.vy = -state.gravitySign * JUMP_POWER;
    sound('jump');
    burst(player.x + PLAYER_W/2, player.y + PLAYER_H/2, state.world, 8, 1.2);
  }

  function pulse() {
    if (!state.running || state.paused || state.deadTimer > 0 || state.stageCompleteTimer > 0) return;
    if (state.pulseCooldown > 0) return;

    const oldWorld = state.world;
    state.world = 1 - state.world;
    state.pulseCooldown = .13;
    const stage = currentStage();

    if (stage.gravityFlip) {
      state.gravitySign *= -1;
      player.grounded = false;
      player.vy = state.gravitySign * -110;
    }

    const nearest = activeObstacles
      .filter(o => !o.collected && o.type !== 'core' && o.world === oldWorld)
      .map(o => ({o, sx:o.x - state.distance + PLAYER_X}))
      .filter(v => v.sx > PLAYER_X - 20 && v.sx < PLAYER_X + 150)
      .sort((a,b) => a.sx - b.sx)[0];

    if (nearest) {
      state.combo += 1;
      state.perfectPulses += 1;
      state.overdrive = Math.min(100, state.overdrive + 24);
      state.score += 120 * Math.max(1, state.combo);
      burst(PLAYER_X + 46, player.y + PLAYER_H/2, state.world, 18, 2.2);
      sound('perfect');
      if (state.overdrive >= 100 && state.overdriveTime <= 0) {
        state.overdriveTime = 4.25;
        state.overdrive = 100;
        state.shake = 9;
        sound('overdrive');
      }
    } else {
      state.combo = Math.max(0, state.combo - 1);
      state.overdrive = Math.max(0, state.overdrive - 6);
      sound('pulse');
    }

    flashPulse();
    state.shake = Math.max(state.shake, 4);
  }

  function flashPulse() {
    ui.pulseFlash.classList.remove('cyan','magenta');
    void ui.pulseFlash.offsetWidth;
    ui.pulseFlash.classList.add(state.world === 0 ? 'cyan' : 'magenta');
  }

  function die() {
    if (state.deadTimer > 0 || state.stageCompleteTimer > 0) return;
    state.deadTimer = .48;
    state.deaths += 1;
    state.combo = 0;
    state.overdrive = 0;
    state.overdriveTime = 0;
    state.shake = 16;
    ui.death.classList.add('show');
    sound('death');
    burst(player.x + PLAYER_W/2, player.y + PLAYER_H/2, state.world, 34, 4);
  }

  function restartAfterDeath() {
    ui.death.classList.remove('show');
    if (state.mode === 'endless') {
      state.bestEndless = Math.max(state.bestEndless, Math.floor(state.distance));
      sessionStorage.setItem('pulseBest', String(state.bestEndless));
      loadStage(0, false);
      showStageBanner(endlessStageProxy);
    } else {
      loadStage(state.stageIndex, false);
    }
  }

  function completeStage() {
    if (state.stageCompleteTimer > 0) return;
    state.stageCompleteTimer = 1.35;
    state.score += 1000 + state.combo * 100;
    state.shake = 7;
    sound('clear');
    ui.bannerStage.textContent = `STAGE ${String(state.stageIndex + 1).padStart(2,'0')} CLEAR`;
    ui.bannerName.textContent = currentStage().name;
    ui.bannerHint.textContent = state.stageIndex < stages.length - 1 ? 'Rebuilding the next reality…' : 'The system has one last message.';
    ui.banner.classList.add('show');
  }

  function advanceStage() {
    ui.banner.classList.remove('show');
    if (state.stageIndex >= stages.length - 1) {
      state.running = false;
      ui.victoryStats.textContent = `${state.perfectPulses} perfect pulses • ${state.deaths} deaths • ${Math.floor(state.score).toLocaleString()} score`;
      ui.victory.classList.add('active');
      return;
    }
    loadStage(state.stageIndex + 1, true);
  }

  function update(dt) {
    if (!state.running || state.paused) return;
    state.elapsed += dt;
    state.pulseCooldown = Math.max(0, state.pulseCooldown - dt);
    state.shake = Math.max(0, state.shake - 22 * dt);

    if (state.deadTimer > 0) {
      state.deadTimer -= dt;
      updateParticles(dt);
      if (state.deadTimer <= 0) restartAfterDeath();
      return;
    }

    if (state.stageCompleteTimer > 0) {
      state.stageCompleteTimer -= dt;
      updateParticles(dt);
      if (state.stageCompleteTimer <= 0) advanceStage();
      return;
    }

    const stage = currentStage();
    let speed = stage.speed;
    if (state.mode === 'endless') speed += Math.min(155, state.distance / 90);

    if (state.overdriveTime > 0) {
      state.overdriveTime -= dt;
      speed *= 1.18;
      state.score += 35 * dt;
      state.overdrive = Math.max(0, 100 * (state.overdriveTime / 4.25));
      if (Math.random() < .35) burst(player.x - 6, player.y + PLAYER_H/2, state.world, 1, 1.4);
    }

    state.distance += speed * dt;
    state.score += speed * dt * .08 * (1 + Math.min(3,state.combo)*.12);

    if (state.mode === 'endless') updateEndless();

    const gravity = BASE_GRAVITY * state.gravitySign;
    player.vy += gravity * dt;
    player.y += player.vy * dt;

    if (state.gravitySign > 0) {
      if (player.y + PLAYER_H >= FLOOR) {
        player.y = FLOOR - PLAYER_H;
        player.vy = 0;
        player.grounded = true;
      }
    } else {
      if (player.y <= CEILING) {
        player.y = CEILING;
        player.vy = 0;
        player.grounded = true;
      }
    }

    player.trail.unshift({x:player.x,y:player.y,a:1,world:state.world});
    if (player.trail.length > (state.overdriveTime > 0 ? 18 : 8)) player.trail.pop();
    player.trail.forEach(t => t.a *= .86);

    handleCollisions();
    updateParticles(dt);

    if (state.mode !== 'endless' && state.distance >= stage.length) completeStage();
    syncHud();
  }

  function updateEndless() {
    while (state.endlessSpawnX < state.distance + 1700) {
      const gap = 300 + Math.random()*210;
      state.endlessSpawnX += gap;
      const world = Math.random() < .5 ? 0 : 1;
      const roll = Math.random();
      const type = roll < .42 ? 'wall' : roll < .78 ? 'spike' : 'core';

      if (type === 'core') {
        activeObstacles.push(C(state.endlessSpawnX, world));
      } else if (type === 'wall') {
        activeObstacles.push(O(state.endlessSpawnX,'wall',world,56 + Math.random()*18,95 + Math.random()*80));
      } else {
        activeObstacles.push(O(state.endlessSpawnX,'spike',world,70 + Math.random()*50,34));
      }

      if (Math.random() < .22) activeObstacles.push(C(state.endlessSpawnX + 145, 1-world));
    }
    activeObstacles = activeObstacles.filter(o => o.x > state.distance - 500 && !o.collected);
  }

  function obstacleRect(o) {
    const sx = o.x - state.distance + PLAYER_X;
    const y = o.anchor === 'ceiling' ? CEILING : FLOOR - o.h;
    return {x:sx,y,w:o.w,h:o.h};
  }

  function handleCollisions() {
    const pr = {x:player.x+5,y:player.y+5,w:PLAYER_W-10,h:PLAYER_H-10};

    for (const o of activeObstacles) {
      if (o.collected) continue;
      const r = obstacleRect(o);
      if (r.x > W + 120 || r.x + r.w < -100) continue;

      const overlap = pr.x < r.x+r.w && pr.x+pr.w > r.x && pr.y < r.y+r.h && pr.y+pr.h > r.y;
      if (!overlap) continue;

      if (o.type === 'core') {
        if (o.world === state.world) {
          o.collected = true;
          state.score += 450 + state.combo*25;
          state.overdrive = Math.min(100, state.overdrive + 10);
          burst(r.x+r.w/2,r.y+r.h/2,state.world,14,2.8);
          sound('core');
        }
      } else if (o.world === state.world) {
        die();
        return;
      }
    }
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function burst(x,y,world,count=10,power=1) {
    const color = world === 0 ? COLORS.cyan : COLORS.magenta;
    for (let i=0;i<count;i++) {
      const a = Math.random()*Math.PI*2;
      const s = (45+Math.random()*150)*power;
      particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.55,max:.9,size:1.5+Math.random()*3.5,color});
    }
  }

  function syncHud() {
    const stage = currentStage();
    ui.stageLabel.textContent = state.mode === 'endless' ? 'ENDLESS' : `STAGE ${String(state.stageIndex+1).padStart(2,'0')}`;
    ui.stageName.textContent = stage.name;
    ui.score.textContent = String(Math.floor(state.score)).padStart(6,'0');
    ui.combo.textContent = state.overdriveTime > 0 ? `OVERDRIVE • x${Math.max(1,state.combo)}` : `COMBO x${state.combo}`;
    ui.meter.style.width = `${Math.max(0,Math.min(100,state.overdrive))}%`;
  }

  function draw() {
    const stage = currentStage();
    const shakeX = state.shake ? (Math.random()-.5)*state.shake : 0;
    const shakeY = state.shake ? (Math.random()-.5)*state.shake*.55 : 0;

    ctx.save();
    ctx.translate(shakeX,shakeY);
    drawBackground(stage);
    drawTrack(stage);
    drawObstacles();
    drawPlayer();
    drawParticles();
    if (stage.voidChase && state.running) drawVoid();
    if (state.mode === 'endless' && state.running) drawEndlessBest();
    ctx.restore();
  }

  function drawBackground() {
    const wcol = state.world === 0 ? [20,165,255] : [255,35,158];
    const grd = ctx.createLinearGradient(0,0,0,H);
    grd.addColorStop(0, `rgb(${4+wcol[0]*.015},${6+wcol[1]*.025},${18+wcol[2]*.025})`);
    grd.addColorStop(.58, '#07101d');
    grd.addColorStop(1, '#03050b');
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,W,H);

    const sunX = 720 + Math.sin(state.elapsed*.12)*25;
    const sunY = 160;
    const rg = ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,150);
    rg.addColorStop(0, state.world===0?'rgba(85,239,255,.17)':'rgba(255,67,184,.18)');
    rg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=rg;
    ctx.fillRect(sunX-160,sunY-160,320,320);

    ctx.globalAlpha=.36;
    for (let i=0;i<18;i++) {
      const x = ((i*91 - state.distance*.08)%(W+120))-60;
      const h = 35 + ((i*37)%95);
      ctx.fillStyle = i%3===0 ? '#0c2941' : '#101a31';
      ctx.fillRect(x,FLOOR-h-58,54,h);
      ctx.fillStyle = state.world===0?'rgba(85,239,255,.22)':'rgba(255,67,184,.22)';
      for(let wy=FLOOR-h-48; wy<FLOOR-70; wy+=18) ctx.fillRect(x+9,wy,5,6);
    }
    ctx.globalAlpha=1;

    if (state.overdriveTime > 0) {
      ctx.strokeStyle = state.world===0?'rgba(85,239,255,.25)':'rgba(255,67,184,.25)';
      ctx.lineWidth=2;
      for(let i=0;i<22;i++){
        const y=(i*31 + state.elapsed*260)%H;
        const x=(i*83)%W;
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.lineTo(x-100,y);
        ctx.stroke();
      }
    }
  }

  function drawTrack(stage) {
    const accent = state.world===0 ? COLORS.cyan : COLORS.magenta;
    const ghost = state.world===0 ? 'rgba(85,239,255,.12)' : 'rgba(255,67,184,.12)';

    ctx.fillStyle='#07111d';
    ctx.fillRect(0,FLOOR,W,H-FLOOR);
    ctx.fillRect(0,0,W,CEILING);
    ctx.fillStyle=accent;
    ctx.globalAlpha=.75;
    ctx.fillRect(0,FLOOR,W,2);
    if(stage.gravityFlip) ctx.fillRect(0,CEILING-2,W,2);
    ctx.globalAlpha=1;

    ctx.strokeStyle=ghost;
    ctx.lineWidth=1;
    for(let x=-80;x<W+80;x+=70){
      const off=(state.distance*.35)%70;
      ctx.beginPath();
      ctx.moveTo(x-off,FLOOR);
      ctx.lineTo(x-off-80,H);
      ctx.stroke();
    }
    for(let y=FLOOR+18;y<H;y+=22){
      ctx.beginPath();
      ctx.moveTo(0,y);
      ctx.lineTo(W,y);
      ctx.stroke();
    }

    if (stage.gravityFlip) {
      for(let x=-80;x<W+80;x+=70){
        const off=(state.distance*.35)%70;
        ctx.beginPath();
        ctx.moveTo(x-off,CEILING);
        ctx.lineTo(x-off-80,0);
        ctx.stroke();
      }
    }
  }

  function drawObstacles() {
    for (const o of activeObstacles) {
      if (o.collected) continue;
      const r = obstacleRect(o);
      if (r.x > W+120 || r.x+r.w < -120) continue;

      const active = o.world === state.world;
      const color = o.world===0?COLORS.cyan:COLORS.magenta;
      ctx.save();
      ctx.globalAlpha = active ? 1 : .14;
      ctx.shadowColor = active ? color : 'transparent';
      ctx.shadowBlur = active ? 18 : 0;

      if (o.type==='wall') {
        const g=ctx.createLinearGradient(r.x,r.y,r.x+r.w,r.y+r.h);
        g.addColorStop(0, active?color:'rgba(255,255,255,.15)');
        g.addColorStop(1,'rgba(7,12,24,.92)');
        ctx.fillStyle=g;
        roundRect(ctx,r.x,r.y,r.w,r.h,9);
        ctx.fill();
        ctx.strokeStyle=active?color:'rgba(255,255,255,.22)';
        ctx.lineWidth=2;
        roundRect(ctx,r.x,r.y,r.w,r.h,9);
        ctx.stroke();
        ctx.globalAlpha*=.45;
        for(let yy=r.y+14;yy<r.y+r.h-6;yy+=18){
          ctx.fillStyle='#fff';
          ctx.fillRect(r.x+9,yy,r.w-18,2);
        }
      } else if(o.type==='spike') {
        ctx.fillStyle=active?color:'rgba(255,255,255,.18)';
        const count=Math.max(2,Math.floor(r.w/22));
        const sw=r.w/count;
        for(let i=0;i<count;i++){
          ctx.beginPath();
          if(o.anchor==='ceiling'){
            ctx.moveTo(r.x+i*sw,r.y);
            ctx.lineTo(r.x+i*sw+sw/2,r.y+r.h);
            ctx.lineTo(r.x+(i+1)*sw,r.y);
          }else{
            ctx.moveTo(r.x+i*sw,r.y+r.h);
            ctx.lineTo(r.x+i*sw+sw/2,r.y);
            ctx.lineTo(r.x+(i+1)*sw,r.y+r.h);
          }
          ctx.closePath();
          ctx.fill();
        }
      } else if(o.type==='core') {
        ctx.globalAlpha = active ? 1 : .18;
        const cx=r.x+r.w/2,cy=r.y+r.h/2;
        const rg=ctx.createRadialGradient(cx,cy,2,cx,cy,22);
        rg.addColorStop(0,'#fff');
        rg.addColorStop(.25,color);
        rg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=rg;
        ctx.beginPath();
        ctx.arc(cx,cy,22,0,Math.PI*2);
        ctx.fill();
        ctx.strokeStyle=color;
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.arc(cx,cy,10+Math.sin(state.elapsed*6)*2,0,Math.PI*2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawPlayer() {
    const color = state.world===0?COLORS.cyan:COLORS.magenta;

    for(let i=player.trail.length-1;i>=0;i--){
      const t=player.trail[i];
      ctx.save();
      ctx.globalAlpha=t.a*.18;
      ctx.fillStyle=t.world===0?COLORS.cyan:COLORS.magenta;
      roundRect(ctx,t.x,t.y,PLAYER_W,PLAYER_H,10);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor=color;
    ctx.shadowBlur=22;
    const grad=ctx.createLinearGradient(player.x,player.y,player.x+PLAYER_W,player.y+PLAYER_H);
    grad.addColorStop(0,'#f4fdff');
    grad.addColorStop(.35,color);
    grad.addColorStop(1,'#16233a');
    ctx.fillStyle=grad;
    roundRect(ctx,player.x,player.y,PLAYER_W,PLAYER_H,10);
    ctx.fill();
    ctx.strokeStyle='#fff';
    ctx.globalAlpha=.7;
    ctx.lineWidth=1.5;
    roundRect(ctx,player.x,player.y,PLAYER_W,PLAYER_H,10);
    ctx.stroke();
    ctx.globalAlpha=1;
    ctx.fillStyle='#06101a';
    ctx.fillRect(player.x+20,player.y+11,7,4);
    ctx.restore();
  }

  function drawParticles(){
    for(const p of particles){
      ctx.save();
      ctx.globalAlpha=Math.max(0,p.life/p.max);
      ctx.fillStyle=p.color;
      ctx.shadowColor=p.color;
      ctx.shadowBlur=8;
      ctx.fillRect(p.x,p.y,p.size,p.size);
      ctx.restore();
    }
  }

  function drawVoid(){
    const danger = Math.min(1, state.distance/currentStage().length);
    const width = 54 + danger*90 + Math.sin(state.elapsed*5)*7;
    const g=ctx.createLinearGradient(0,0,width,0);
    g.addColorStop(0,'rgba(175,0,255,.9)');
    g.addColorStop(.45,'rgba(255,0,117,.55)');
    g.addColorStop(1,'rgba(255,0,100,0)');
    ctx.fillStyle=g;
    ctx.fillRect(0,0,width,H);
    ctx.strokeStyle='rgba(255,210,255,.35)';
    ctx.lineWidth=2;
    for(let i=0;i<7;i++){
      const x=width-20+Math.sin(state.elapsed*7+i)*16;
      ctx.beginPath();
      ctx.moveTo(x,0);
      ctx.lineTo(x+Math.sin(i*2)*20,H);
      ctx.stroke();
    }
  }

  function drawEndlessBest(){
    ctx.save();
    ctx.font='700 12px Inter,system-ui';
    ctx.fillStyle='rgba(215,227,247,.55)';
    ctx.textAlign='left';
    ctx.fillText(`SESSION BEST ${Math.floor(state.bestEndless)}m`,22,H-18);
    ctx.restore();
  }

  function roundRect(c,x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);
    c.beginPath();
    c.moveTo(x+rr,y);
    c.arcTo(x+w,y,x+w,y+h,rr);
    c.arcTo(x+w,y+h,x,y+h,rr);
    c.arcTo(x,y+h,x,y,rr);
    c.arcTo(x,y,x+w,y,rr);
    c.closePath();
  }

  function frame(now){
    const dt=Math.min(.033,(now-lastTime)/1000 || 0);
    lastTime=now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function initAudio(){
    if(muted || audioCtx) return;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return;
    audioCtx=new AC();
  }

  function sound(kind){
    if(muted) return;
    initAudio();
    if(!audioCtx) return;
    if(audioCtx.state==='suspended') audioCtx.resume();

    const map={
      jump:[320,.06,'square',.05],
      pulse:[120,.09,'sine',.07],
      perfect:[520,.08,'triangle',.07],
      core:[760,.1,'sine',.06],
      death:[72,.22,'sawtooth',.09],
      clear:[660,.16,'triangle',.07],
      overdrive:[95,.28,'sawtooth',.1]
    };

    const [freq,dur,type,vol]=map[kind]||map.pulse;
    const o=audioCtx.createOscillator();
    const g=audioCtx.createGain();
    o.type=type;
    o.frequency.setValueAtTime(freq,audioCtx.currentTime);
    if(kind==='perfect'||kind==='clear')o.frequency.exponentialRampToValueAtTime(freq*1.55,audioCtx.currentTime+dur);
    if(kind==='death')o.frequency.exponentialRampToValueAtTime(38,audioCtx.currentTime+dur);
    g.gain.setValueAtTime(vol,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime+dur);
  }

  function handleKey(e,down){
    if(!down) return;
    const key=e.key.toLowerCase();
    if([' ','x','p','arrowup','w'].includes(key)) e.preventDefault();
    if(key===' '||key==='arrowup'||key==='w') jump();
    else if(key==='x'||key==='shift') pulse();
    else if(key==='p'||key==='escape') togglePause();
  }

  window.addEventListener('keydown',e=>handleKey(e,true),{passive:false});
  ui.jump.addEventListener('pointerdown',e=>{e.preventDefault();jump();});
  ui.pulse.addEventListener('pointerdown',e=>{e.preventDefault();pulse();});

  canvas.addEventListener('pointerdown',e=>{
    if(!state.running||state.paused) return;
    const r=canvas.getBoundingClientRect();
    const x=e.clientX-r.left;
    if(x<r.width*.5) jump();
    else pulse();
  });

  ui.startCampaign.addEventListener('click',()=>start('campaign'));
  ui.startEndless.addEventListener('click',()=>start('endless'));
  ui.replay.addEventListener('click',()=>start('campaign'));
  ui.victoryEndless.addEventListener('click',()=>start('endless'));
  ui.resume.addEventListener('click',()=>togglePause(false));
  ui.quit.addEventListener('click',quitToMenu);
  ui.pauseBtn.addEventListener('click',()=>togglePause());
  ui.mute.addEventListener('click',()=>{
    muted=!muted;
    ui.mute.textContent=muted?'SOUND OFF':'SOUND ON';
    ui.mute.setAttribute('aria-pressed',String(muted));
  });

  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&state.running&&!state.paused) togglePause(true);
  });

  canvas.width=W;
  canvas.height=H;
  syncHud();
  draw();
  requestAnimationFrame(frame);
})();
