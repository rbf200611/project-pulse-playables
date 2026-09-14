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
  const BASE_GRAVITY = 1800;
  const JUMP_POWER = 760;
  const COLORS = { cyan:'#55efff', magenta:'#ff43b8', white:'#f7fbff', gold:'#ffd25d' };

  const state = {
    mode:'menu', running:false, paused:false, stageIndex:0,
    distance:0, score:0, bestEndless:Number(sessionStorage.getItem('pulseBest') || 0),
    world:0, pulseCooldown:0, combo:0, overdrive:0, overdriveTime:0,
    stageCompleteTimer:0, deadTimer:0, shake:0, gravitySign:1,
    endlessSpawnX:900, elapsed:0, perfectPulses:0, nearMisses:0, deaths:0,
    slowMo:0, coyote:0, jumpBuffer:0, bossHits:0, bossFlash:0
  };

  const player = { x:PLAYER_X, y:FLOOR-PLAYER_H, vy:0, grounded:true, trail:[] };
  let particles = [];
  let pulseRings = [];
  let feedback = [];
  let activeObstacles = [];
  let lastTime = performance.now();
  let audioCtx = null;
  let muted = false;
  let bannerTimeout = 0;

  function O(x,type,world,w,h,anchor='floor') { return {x,type,world,w,h,anchor,collected:false,passed:false}; }
  function C(x,world,anchor='floor') { return {x,type:'core',world,w:30,h:30,anchor,collected:false,passed:false}; }
  function B(x,world,anchor='floor') { return {x,type:'bossCore',world,w:36,h:36,anchor,collected:false,passed:false}; }

  const stages = [
    { name:'FIRST CONTACT', hint:'JUMP the spikes. PULSE through the tall wall.', length:4000, speed:295, gravityFlip:false,
      obstacles:[O(720,'spike',0,64,30),C(980,0),O(1270,'wall',0,64,190),C(1515,1),O(1785,'spike',1,70,32),O(2055,'wall',1,60,158),C(2310,0),O(2580,'spike',0,80,34),O(2890,'wall',0,60,176),C(3170,1),O(3470,'spike',1,88,34),C(3750,1)] },
    { name:'SPLIT SECOND', hint:'Read the color. Jump and pulse in the same breath.', length:4550, speed:320, gravityFlip:false,
      obstacles:[O(620,'spike',0,82,34),O(905,'wall',1,64,150),C(1120,1),O(1370,'spike',1,72,34),O(1505,'wall',0,62,125),C(1770,0),O(2020,'wall',1,60,168),O(2260,'spike',0,96,34),O(2540,'wall',0,64,128),O(2795,'wall',1,64,128),C(3050,1),O(3310,'spike',1,96,34),O(3610,'wall',0,68,178),O(3950,'spike',0,84,34),C(4260,0)] },
    { name:'CHAIN REACTION', hint:'Pulse late. Perfect timing fills Overdrive.', length:5200, speed:342, gravityFlip:false,
      obstacles:[O(610,'wall',0,58,130),O(875,'wall',1,58,130),O(1140,'wall',0,58,130),O(1405,'wall',1,58,130),C(1625,1),O(1880,'spike',0,92,34),O(2145,'wall',1,62,155),O(2390,'spike',1,74,34),C(2625,0),O(2870,'wall',0,64,132),O(3115,'wall',1,64,132),O(3370,'wall',0,64,132),C(3600,1),O(3840,'spike',1,100,34),O(4130,'wall',0,70,168),O(4420,'spike',0,82,34),O(4680,'wall',1,62,146),C(4930,1)] },
    { name:'INVERTED', hint:'Every Pulse flips gravity. Commit to the switch.', length:4550, speed:326, gravityFlip:true,
      obstacles:[O(700,'wall',0,60,128,'floor'),O(1080,'wall',1,60,128,'ceiling'),C(1330,1,'ceiling'),O(1600,'wall',0,64,148,'ceiling'),O(1940,'wall',1,64,148,'floor'),C(2190,0,'floor'),O(2470,'spike',0,90,34,'ceiling'),O(2780,'spike',1,90,34,'floor'),O(3120,'wall',0,64,165,'floor'),C(3400,1,'ceiling'),O(3730,'wall',1,64,160,'ceiling'),O(4030,'spike',0,92,34,'floor'),C(4330,0,'floor')] },
    { name:'THE HUNTER', hint:'The Hunter is on you. Steal five cores and survive the collapse.', length:6100, speed:382, gravityFlip:false, voidChase:true, boss:true,
      obstacles:[O(600,'spike',0,86,34),O(890,'wall',1,62,138),B(1160,0),O(1420,'wall',0,64,152),O(1700,'spike',1,100,34),B(1960,1),O(2240,'wall',1,66,168),O(2500,'spike',0,106,34),B(2780,0),O(3070,'wall',0,68,110),O(3340,'wall',1,68,160),B(3610,1),O(3890,'spike',0,112,34),O(4200,'wall',1,72,175),B(4490,0),O(4780,'spike',1,104,34),O(5080,'wall',0,70,138),O(5380,'spike',0,96,34),O(5650,'wall',1,70,170)] }
  ];

  const endlessStageProxy = { name:'ENDLESS', hint:'No finish line. Chase cleaner decisions.', length:Infinity, speed:332, gravityFlip:false, voidChase:false, boss:false, obstacles:[] };
  function currentStage(){ return state.mode==='endless' ? endlessStageProxy : stages[state.stageIndex]; }
  function resetPlayer(){ state.gravitySign=1; player.x=PLAYER_X; player.y=FLOOR-PLAYER_H; player.vy=0; player.grounded=true; player.trail.length=0; state.coyote=.08; state.jumpBuffer=0; }
  function loadStage(index,showBanner=true){ state.stageIndex=index; state.distance=0; state.world=0; state.pulseCooldown=0; state.combo=0; state.overdrive=0; state.overdriveTime=0; state.stageCompleteTimer=0; state.deadTimer=0; state.endlessSpawnX=900; state.slowMo=0; state.bossHits=0; state.bossFlash=0; particles=[]; pulseRings=[]; feedback=[]; resetPlayer(); const stage=currentStage(); activeObstacles=state.mode==='endless'?[]:stage.obstacles.map(o=>({...o,collected:false,passed:false})); syncHud(); if(showBanner) showStageBanner(stage); }
  function start(mode){ initAudio(); state.mode=mode; state.running=true; state.paused=false; state.score=0; state.perfectPulses=0; state.nearMisses=0; state.deaths=0; hideAllScreens(); loadStage(0,true); lastTime=performance.now(); }
  function hideAllScreens(){ ui.menu.classList.remove('active'); ui.pause.classList.remove('active'); ui.victory.classList.remove('active'); }
  function quitToMenu(){ state.running=false; state.paused=false; state.mode='menu'; ui.pause.classList.remove('active'); ui.victory.classList.remove('active'); ui.menu.classList.add('active'); ui.pauseBtn.textContent='PAUSE'; ui.pauseBtn.setAttribute('aria-pressed','false'); }
  function showStageBanner(stage){ clearTimeout(bannerTimeout); ui.bannerStage.textContent=state.mode==='endless'?'ENDLESS MODE':`STAGE ${String(state.stageIndex+1).padStart(2,'0')}`; ui.bannerName.textContent=stage.name; ui.bannerHint.textContent=stage.hint; ui.banner.classList.add('show'); bannerTimeout=setTimeout(()=>ui.banner.classList.remove('show'),2100); }
  function togglePause(force){ if(!state.running||state.deadTimer>0||state.stageCompleteTimer>0)return; state.paused=typeof force==='boolean'?force:!state.paused; ui.pause.classList.toggle('active',state.paused); ui.pauseBtn.textContent=state.paused?'RESUME':'PAUSE'; ui.pauseBtn.setAttribute('aria-pressed',String(state.paused)); if(!state.paused) lastTime=performance.now(); }
  function doJump(){ player.grounded=false; state.coyote=0; state.jumpBuffer=0; player.vy=-state.gravitySign*JUMP_POWER; sound('jump'); burst(player.x+PLAYER_W/2,player.y+PLAYER_H/2,state.world,8,1.2); }
  function jump(){ if(!state.running||state.paused||state.deadTimer>0||state.stageCompleteTimer>0)return; if(player.grounded||state.coyote>0)doJump(); else state.jumpBuffer=.11; }

  function pulse(){
    if(!state.running||state.paused||state.deadTimer>0||state.stageCompleteTimer>0)return;
    if(state.pulseCooldown>0)return;
    const oldWorld=state.world; state.world=1-state.world; state.pulseCooldown=state.overdriveTime>0?.085:.125; const stage=currentStage();
    if(stage.gravityFlip){ state.gravitySign*=-1; player.grounded=false; player.vy=state.gravitySign*-120; state.coyote=0; }
    const nearest=activeObstacles.filter(o=>!o.collected&&o.type!=='core'&&o.type!=='bossCore'&&o.world===oldWorld).map(o=>({o,sx:o.x-state.distance+PLAYER_X})).filter(v=>v.sx>PLAYER_X-22&&v.sx<PLAYER_X+182).sort((a,b)=>a.sx-b.sx)[0];
    pulseRings.push({x:player.x+PLAYER_W/2,y:player.y+PLAYER_H/2,r:18,a:1,world:state.world});
    if(nearest){ state.combo+=1; state.perfectPulses+=1; state.overdrive=Math.min(100,state.overdrive+28); state.score+=150*Math.max(1,state.combo); state.slowMo=.12; state.shake=Math.max(state.shake,11); burst(PLAYER_X+48,player.y+PLAYER_H/2,state.world,26,2.6); addFeedback('PERFECT PULSE',COLORS.gold,PLAYER_X+75,player.y-12,1.05); sound('perfect'); if(state.overdrive>=100&&state.overdriveTime<=0)triggerOverdrive(); }
    else{ state.combo=Math.max(0,state.combo-1); state.overdrive=Math.max(0,state.overdrive-5); state.shake=Math.max(state.shake,5); sound('pulse'); }
    flashPulse();
  }

  function triggerOverdrive(){ state.overdriveTime=5.1; state.overdrive=100; state.shake=14; state.slowMo=.18; burst(player.x+PLAYER_W/2,player.y+PLAYER_H/2,state.world,48,3.1); addFeedback('OVERDRIVE',COLORS.white,W*.5,150,1.45); sound('overdrive'); }
  function flashPulse(){ ui.pulseFlash.classList.remove('cyan','magenta'); void ui.pulseFlash.offsetWidth; ui.pulseFlash.classList.add(state.world===0?'cyan':'magenta'); }
  function addFeedback(text,color,x,y,scale=1){ feedback.push({text,color,x,y,life:.75,max:.75,scale}); }
  function die(){ if(state.deadTimer>0||state.stageCompleteTimer>0)return; state.deadTimer=.42; state.deaths+=1; state.combo=0; state.overdrive=0; state.overdriveTime=0; state.shake=18; ui.death.classList.add('show'); sound('death'); burst(player.x+PLAYER_W/2,player.y+PLAYER_H/2,state.world,38,4.2); }
  function restartAfterDeath(){ ui.death.classList.remove('show'); if(state.mode==='endless'){ state.bestEndless=Math.max(state.bestEndless,Math.floor(state.distance)); sessionStorage.setItem('pulseBest',String(state.bestEndless)); loadStage(0,false); showStageBanner(endlessStageProxy); } else loadStage(state.stageIndex,false); }
  function completeStage(){ if(state.stageCompleteTimer>0)return; state.stageCompleteTimer=1.25; state.score+=1200+state.combo*120; state.shake=8; sound('clear'); ui.bannerStage.textContent=`STAGE ${String(state.stageIndex+1).padStart(2,'0')} CLEAR`; ui.bannerName.textContent=currentStage().name; ui.bannerHint.textContent=state.stageIndex<stages.length-1?'Reality stabilised. Next breach incoming…':'The Hunter lost the signal.'; ui.banner.classList.add('show'); }
  function advanceStage(){ ui.banner.classList.remove('show'); if(state.stageIndex>=stages.length-1){ state.running=false; ui.victoryStats.textContent=`${state.perfectPulses} perfect pulses • ${state.nearMisses} near misses • ${state.deaths} deaths • ${Math.floor(state.score).toLocaleString()} score`; ui.victory.classList.add('active'); return; } loadStage(state.stageIndex+1,true); }

  function update(rawDt){
    if(!state.running||state.paused)return;
    const slowScale=state.slowMo>0?.38:1; if(state.slowMo>0)state.slowMo=Math.max(0,state.slowMo-rawDt); const dt=rawDt*slowScale;
    state.elapsed+=dt; state.pulseCooldown=Math.max(0,state.pulseCooldown-dt); state.shake=Math.max(0,state.shake-23*dt); state.bossFlash=Math.max(0,state.bossFlash-dt); state.coyote=Math.max(0,state.coyote-dt); state.jumpBuffer=Math.max(0,state.jumpBuffer-dt);
    if(state.deadTimer>0){ state.deadTimer-=rawDt; updateEffects(rawDt); if(state.deadTimer<=0)restartAfterDeath(); return; }
    if(state.stageCompleteTimer>0){ state.stageCompleteTimer-=rawDt; updateEffects(rawDt); if(state.stageCompleteTimer<=0)advanceStage(); return; }
    const stage=currentStage(); let speed=stage.speed; if(state.mode==='endless')speed+=Math.min(160,state.distance/88);
    if(state.overdriveTime>0){ state.overdriveTime-=rawDt; speed*=1.22; state.score+=50*rawDt; state.overdrive=Math.max(0,100*(state.overdriveTime/5.1)); if(Math.random()<.5)burst(player.x-8,player.y+PLAYER_H/2,state.world,1,1.7); }
    state.distance+=speed*dt; state.score+=speed*dt*.085*(1+Math.min(4,state.combo)*.13); if(state.mode==='endless')updateEndless();
    const wasGrounded=player.grounded; player.grounded=false; player.vy+=BASE_GRAVITY*state.gravitySign*dt; player.y+=player.vy*dt;
    if(state.gravitySign>0){ if(player.y+PLAYER_H>=FLOOR){player.y=FLOOR-PLAYER_H;player.vy=0;player.grounded=true;} } else if(player.y<=CEILING){player.y=CEILING;player.vy=0;player.grounded=true;}
    if(wasGrounded&&!player.grounded)state.coyote=.075; if(player.grounded){state.coyote=.075;if(state.jumpBuffer>0)doJump();}
    player.trail.unshift({x:player.x,y:player.y,a:1,world:state.world}); if(player.trail.length>(state.overdriveTime>0?24:10))player.trail.pop(); player.trail.forEach(t=>t.a*=.84);
    handleCollisionsAndNearMisses(); updateEffects(rawDt); if(state.mode!=='endless'&&state.distance>=stage.length)completeStage(); syncHud();
  }

  function updateEndless(){
    while(state.endlessSpawnX<state.distance+1750){ state.endlessSpawnX+=300+Math.random()*220; const world=Math.random()<.5?0:1; const roll=Math.random(); const type=roll<.43?'wall':roll<.79?'spike':'core'; if(type==='core')activeObstacles.push(C(state.endlessSpawnX,world)); else if(type==='wall')activeObstacles.push(O(state.endlessSpawnX,'wall',world,56+Math.random()*18,90+Math.random()*78)); else activeObstacles.push(O(state.endlessSpawnX,'spike',world,68+Math.random()*48,34)); if(Math.random()<.24)activeObstacles.push(C(state.endlessSpawnX+140,1-world)); }
    activeObstacles=activeObstacles.filter(o=>o.x>state.distance-520&&!o.collected);
  }
  function obstacleRect(o){ const sx=o.x-state.distance+PLAYER_X; const y=o.anchor==='ceiling'?CEILING:FLOOR-o.h; return{x:sx,y,w:o.w,h:o.h}; }

  function handleCollisionsAndNearMisses(){
    const pr={x:player.x+7,y:player.y+6,w:PLAYER_W-14,h:PLAYER_H-12};
    for(const o of activeObstacles){
      if(o.collected)continue; const r=obstacleRect(o); if(r.x>W+120||r.x+r.w<-100)continue;
      const overlap=pr.x<r.x+r.w&&pr.x+pr.w>r.x&&pr.y<r.y+r.h&&pr.y+pr.h>r.y;
      if(overlap){
        if(o.type==='core'||o.type==='bossCore'){
          if(o.world===state.world){ o.collected=true; state.score+=o.type==='bossCore'?800:480; state.overdrive=Math.min(100,state.overdrive+(o.type==='bossCore'?18:11)); burst(r.x+r.w/2,r.y+r.h/2,state.world,o.type==='bossCore'?26:14,o.type==='bossCore'?3.3:2.8); if(o.type==='bossCore'){ state.bossHits++; state.bossFlash=.24; state.shake=11; addFeedback(`HUNTER HIT ${state.bossHits}/5`,COLORS.gold,W*.62,128,1.05); sound('bossHit'); } else sound('core'); }
        } else if(o.world===state.world){ die(); return; }
      }
      if(!o.passed&&o.type!=='core'&&o.type!=='bossCore'&&r.x+r.w<pr.x&&r.x+r.w>pr.x-36){ o.passed=true; if(o.world===state.world){ const verticalGap=Math.max(r.y-(pr.y+pr.h),pr.y-(r.y+r.h),0); if(verticalGap<32){ state.nearMisses++; state.score+=90+state.combo*15; state.overdrive=Math.min(100,state.overdrive+7); addFeedback('NEAR MISS',COLORS.white,player.x+58,player.y-6,.9); sound('near'); } } }
    }
  }

  function updateEffects(dt){ for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0); for(const r of pulseRings){r.r+=390*dt;r.a-=1.7*dt;}pulseRings=pulseRings.filter(r=>r.a>0); for(const f of feedback){f.y-=34*dt;f.life-=dt;}feedback=feedback.filter(f=>f.life>0); }
  function burst(x,y,world,count=10,power=1){ const color=world===0?COLORS.cyan:COLORS.magenta; for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=(45+Math.random()*150)*power;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.55,max:.9,size:1.5+Math.random()*3.5,color});} }
  function syncHud(){ const stage=currentStage(); ui.stageLabel.textContent=state.mode==='endless'?'ENDLESS':`STAGE ${String(state.stageIndex+1).padStart(2,'0')}`; ui.stageName.textContent=stage.name; ui.score.textContent=String(Math.floor(state.score)).padStart(6,'0'); ui.combo.textContent=state.overdriveTime>0?`OVERDRIVE • x${Math.max(1,state.combo)}`:`COMBO x${state.combo}`; ui.meter.style.width=`${Math.max(0,Math.min(100,state.overdrive))}%`; }

  function draw(){ const stage=currentStage(),shakeX=state.shake?(Math.random()-.5)*state.shake:0,shakeY=state.shake?(Math.random()-.5)*state.shake*.55:0; ctx.save();ctx.translate(shakeX,shakeY);drawBackground();drawTrack(stage);drawObstacles();if(stage.boss&&state.running)drawBoss();drawPlayer();drawParticles();drawPulseRings();drawFeedback();if(stage.voidChase&&state.running)drawVoid();if(state.mode==='endless'&&state.running)drawEndlessBest();if(state.overdriveTime>0)drawOverdriveFrame();ctx.restore(); }
  function drawBackground(){ const wcol=state.world===0?[20,165,255]:[255,35,158]; const grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,`rgb(${4+wcol[0]*.015},${6+wcol[1]*.025},${18+wcol[2]*.025})`);grd.addColorStop(.58,'#07101d');grd.addColorStop(1,'#03050b');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H); const sunX=720+Math.sin(state.elapsed*.12)*25,sunY=160,rg=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,160);rg.addColorStop(0,state.world===0?'rgba(85,239,255,.18)':'rgba(255,67,184,.2)');rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.fillRect(sunX-170,sunY-170,340,340);ctx.globalAlpha=.36;for(let i=0;i<18;i++){const x=((i*91-state.distance*.08)%(W+120))-60,h=35+((i*37)%95);ctx.fillStyle=i%3===0?'#0c2941':'#101a31';ctx.fillRect(x,FLOOR-h-58,54,h);ctx.fillStyle=state.world===0?'rgba(85,239,255,.22)':'rgba(255,67,184,.22)';for(let wy=FLOOR-h-48;wy<FLOOR-70;wy+=18)ctx.fillRect(x+9,wy,5,6);}ctx.globalAlpha=1;if(state.overdriveTime>0){ctx.strokeStyle=state.world===0?'rgba(85,239,255,.32)':'rgba(255,67,184,.32)';ctx.lineWidth=2;for(let i=0;i<28;i++){const y=(i*27+state.elapsed*360)%H,x=(i*79)%W;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-125,y);ctx.stroke();}} }
  function drawTrack(stage){ const accent=state.world===0?COLORS.cyan:COLORS.magenta,ghost=state.world===0?'rgba(85,239,255,.12)':'rgba(255,67,184,.12)';ctx.fillStyle='#07111d';ctx.fillRect(0,FLOOR,W,H-FLOOR);ctx.fillRect(0,0,W,CEILING);ctx.fillStyle=accent;ctx.globalAlpha=.78;ctx.fillRect(0,FLOOR,W,2);if(stage.gravityFlip)ctx.fillRect(0,CEILING-2,W,2);ctx.globalAlpha=1;ctx.strokeStyle=ghost;ctx.lineWidth=1;for(let x=-80;x<W+80;x+=70){const off=(state.distance*.35)%70;ctx.beginPath();ctx.moveTo(x-off,FLOOR);ctx.lineTo(x-off-80,H);ctx.stroke();}for(let y=FLOOR+18;y<H;y+=22){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}if(stage.gravityFlip){for(let x=-80;x<W+80;x+=70){const off=(state.distance*.35)%70;ctx.beginPath();ctx.moveTo(x-off,CEILING);ctx.lineTo(x-off-80,0);ctx.stroke();}} }

  function drawObstacles(){
    for(const o of activeObstacles){ if(o.collected)continue;const r=obstacleRect(o);if(r.x>W+120||r.x+r.w<-120)continue;const active=o.world===state.world,color=o.world===0?COLORS.cyan:COLORS.magenta;ctx.save();ctx.globalAlpha=active?1:.13;ctx.shadowColor=active?color:'transparent';ctx.shadowBlur=active?20:0;
      if(o.type==='wall'){const g=ctx.createLinearGradient(r.x,r.y,r.x+r.w,r.y+r.h);g.addColorStop(0,active?color:'rgba(255,255,255,.15)');g.addColorStop(1,'rgba(7,12,24,.92)');ctx.fillStyle=g;roundRect(ctx,r.x,r.y,r.w,r.h,9);ctx.fill();ctx.strokeStyle=active?color:'rgba(255,255,255,.22)';ctx.lineWidth=2;roundRect(ctx,r.x,r.y,r.w,r.h,9);ctx.stroke();ctx.globalAlpha*=.45;for(let yy=r.y+14;yy<r.y+r.h-6;yy+=18){ctx.fillStyle='#fff';ctx.fillRect(r.x+9,yy,r.w-18,2);}}
      else if(o.type==='spike'){ctx.fillStyle=active?color:'rgba(255,255,255,.18)';const count=Math.max(2,Math.floor(r.w/22)),sw=r.w/count;for(let i=0;i<count;i++){ctx.beginPath();if(o.anchor==='ceiling'){ctx.moveTo(r.x+i*sw,r.y);ctx.lineTo(r.x+i*sw+sw/2,r.y+r.h);ctx.lineTo(r.x+(i+1)*sw,r.y);}else{ctx.moveTo(r.x+i*sw,r.y+r.h);ctx.lineTo(r.x+i*sw+sw/2,r.y);ctx.lineTo(r.x+(i+1)*sw,r.y+r.h);}ctx.closePath();ctx.fill();}}
      else if(o.type==='core'||o.type==='bossCore'){ctx.globalAlpha=active?1:.18;const cx=r.x+r.w/2,cy=r.y+r.h/2,radius=o.type==='bossCore'?29:22,rg=ctx.createRadialGradient(cx,cy,2,cx,cy,radius);rg.addColorStop(0,'#fff');rg.addColorStop(.22,o.type==='bossCore'?COLORS.gold:color);rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle=o.type==='bossCore'?COLORS.gold:color;ctx.lineWidth=o.type==='bossCore'?3:2;ctx.beginPath();ctx.arc(cx,cy,11+Math.sin(state.elapsed*7)*2,0,Math.PI*2);ctx.stroke();}
      ctx.restore();
    }
  }
  function drawBoss(){ const hp=Math.max(0,5-state.bossHits),x=790+Math.sin(state.elapsed*1.4)*18,y=154+Math.sin(state.elapsed*2.2)*10;ctx.save();const c=state.bossFlash>0?'#ffffff':(state.world===0?COLORS.magenta:COLORS.cyan);ctx.shadowColor=c;ctx.shadowBlur=state.bossFlash>0?46:28;const rg=ctx.createRadialGradient(x,y,8,x,y,62);rg.addColorStop(0,'#fff');rg.addColorStop(.18,c);rg.addColorStop(.55,'#22122f');rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(x,y,62,0,Math.PI*2);ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,38+Math.sin(state.elapsed*3)*4,0,Math.PI*2);ctx.stroke();ctx.font='800 11px Inter,system-ui';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText('THE HUNTER',x,y+4);for(let i=0;i<5;i++){ctx.fillStyle=i<hp?'rgba(255,255,255,.8)':'rgba(255,255,255,.14)';ctx.fillRect(x-39+i*20,y+76,14,4);}ctx.restore(); }
  function drawPlayer(){ const color=state.world===0?COLORS.cyan:COLORS.magenta;for(let i=player.trail.length-1;i>=0;i--){const t=player.trail[i];ctx.save();ctx.globalAlpha=t.a*(state.overdriveTime>0?.26:.17);ctx.fillStyle=t.world===0?COLORS.cyan:COLORS.magenta;roundRect(ctx,t.x,t.y,PLAYER_W,PLAYER_H,10);ctx.fill();ctx.restore();}ctx.save();ctx.shadowColor=color;ctx.shadowBlur=state.overdriveTime>0?34:22;const grad=ctx.createLinearGradient(player.x,player.y,player.x+PLAYER_W,player.y+PLAYER_H);grad.addColorStop(0,'#f4fdff');grad.addColorStop(.35,color);grad.addColorStop(1,'#16233a');ctx.fillStyle=grad;roundRect(ctx,player.x,player.y,PLAYER_W,PLAYER_H,10);ctx.fill();ctx.strokeStyle='#fff';ctx.globalAlpha=.72;ctx.lineWidth=1.5;roundRect(ctx,player.x,player.y,PLAYER_W,PLAYER_H,10);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle='#06101a';ctx.fillRect(player.x+20,player.y+11,7,4);ctx.restore(); }
  function drawParticles(){for(const p of particles){ctx.save();ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=8;ctx.fillRect(p.x,p.y,p.size,p.size);ctx.restore();}}
  function drawPulseRings(){for(const r of pulseRings){ctx.save();ctx.globalAlpha=r.a*.75;ctx.strokeStyle=r.world===0?COLORS.cyan:COLORS.magenta;ctx.lineWidth=4;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();ctx.restore();}}
  function drawFeedback(){for(const f of feedback){ctx.save();ctx.globalAlpha=Math.min(1,f.life/f.max*1.4);ctx.fillStyle=f.color;ctx.shadowColor=f.color;ctx.shadowBlur=10;ctx.font=`900 ${Math.round(15*f.scale)}px Inter,system-ui`;ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y);ctx.restore();}}
  function drawVoid(){ const danger=Math.min(1,state.distance/currentStage().length),width=58+danger*105+Math.sin(state.elapsed*5)*7,g=ctx.createLinearGradient(0,0,width,0);g.addColorStop(0,'rgba(175,0,255,.95)');g.addColorStop(.45,'rgba(255,0,117,.62)');g.addColorStop(1,'rgba(255,0,100,0)');ctx.fillStyle=g;ctx.fillRect(0,0,width,H);ctx.strokeStyle='rgba(255,210,255,.4)';ctx.lineWidth=2;for(let i=0;i<7;i++){const x=width-20+Math.sin(state.elapsed*7+i)*16;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+Math.sin(i*2)*20,H);ctx.stroke();} }
  function drawEndlessBest(){ctx.save();ctx.font='700 12px Inter,system-ui';ctx.fillStyle='rgba(215,227,247,.55)';ctx.textAlign='left';ctx.fillText(`SESSION BEST ${Math.floor(state.bestEndless)}m`,22,H-18);ctx.restore();}
  function drawOverdriveFrame(){ctx.save();ctx.strokeStyle=state.world===0?'rgba(85,239,255,.55)':'rgba(255,67,184,.55)';ctx.lineWidth=8+Math.sin(state.elapsed*16)*3;ctx.strokeRect(5,5,W-10,H-10);ctx.restore();}
  function roundRect(c,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+rr,y);c.arcTo(x+w,y,x+w,y+h,rr);c.arcTo(x+w,y+h,x,y+h,rr);c.arcTo(x,y+h,x,y,rr);c.arcTo(x,y,x+w,y,rr);c.closePath();}
  function frame(now){const dt=Math.min(.033,(now-lastTime)/1000||0);lastTime=now;update(dt);draw();requestAnimationFrame(frame);}
  function initAudio(){if(muted||audioCtx)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioCtx=new AC();}
  function tone(freq,dur,type='sine',vol=.05,endFreq=null,delay=0){ if(muted)return;initAudio();if(!audioCtx)return;if(audioCtx.state==='suspended')audioCtx.resume();const t=audioCtx.currentTime+delay,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+dur+.01); }
  function sound(kind){ if(muted)return; if(kind==='jump')tone(330,.07,'square',.045,470); else if(kind==='pulse'){tone(118,.11,'sine',.07,76);tone(420,.05,'triangle',.025,620,.018);} else if(kind==='perfect'){tone(92,.13,'sine',.11,54);tone(620,.11,'triangle',.075,1050,.015);tone(1260,.05,'sine',.025,860,.05);} else if(kind==='near'){tone(780,.055,'triangle',.035,1030);} else if(kind==='core'){tone(760,.1,'sine',.055,1160);tone(1140,.08,'triangle',.035,1480,.04);} else if(kind==='bossHit'){tone(88,.18,'sawtooth',.09,52);tone(520,.12,'square',.05,940,.025);} else if(kind==='death'){tone(92,.22,'sawtooth',.09,38);tone(46,.24,'sine',.08,25,.03);} else if(kind==='clear'){tone(520,.12,'triangle',.055,760);tone(760,.14,'triangle',.05,1040,.1);} else if(kind==='overdrive'){tone(64,.34,'sawtooth',.105,42);tone(320,.24,'square',.045,640,.04);tone(880,.16,'triangle',.035,1320,.11);} }
  function handleKey(e,down){if(!down)return;const key=e.key.toLowerCase();if([' ','x','p','arrowup','w'].includes(key))e.preventDefault();if(key===' '||key==='arrowup'||key==='w')jump();else if(key==='x'||key==='shift')pulse();else if(key==='p'||key==='escape')togglePause();}
  window.addEventListener('keydown',e=>handleKey(e,true),{passive:false}); ui.jump.addEventListener('pointerdown',e=>{e.preventDefault();jump();}); ui.pulse.addEventListener('pointerdown',e=>{e.preventDefault();pulse();});
  canvas.addEventListener('pointerdown',e=>{if(!state.running||state.paused)return;const r=canvas.getBoundingClientRect(),x=e.clientX-r.left;if(x<r.width*.5)jump();else pulse();});
  ui.startCampaign.addEventListener('click',()=>start('campaign')); ui.startEndless.addEventListener('click',()=>start('endless')); ui.replay.addEventListener('click',()=>start('campaign')); ui.victoryEndless.addEventListener('click',()=>start('endless')); ui.resume.addEventListener('click',()=>togglePause(false)); ui.quit.addEventListener('click',quitToMenu); ui.pauseBtn.addEventListener('click',()=>togglePause());
  ui.mute.addEventListener('click',()=>{muted=!muted;ui.mute.textContent=muted?'SOUND OFF':'SOUND ON';ui.mute.setAttribute('aria-pressed',String(muted));});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.running&&!state.paused)togglePause(true);});
  canvas.width=W;canvas.height=H;syncHud();draw();requestAnimationFrame(frame);
})();
