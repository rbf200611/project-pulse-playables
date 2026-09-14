(() => {
  'use strict';

  const startIds = ['startCampaign', 'startEndless', 'replayBtn', 'victoryEndlessBtn', 'resumeBtn'];
  const musicBtn = document.getElementById('musicBtn');
  const pauseScreen = document.getElementById('pauseScreen');
  const menuScreen = document.getElementById('menuScreen');
  const victoryScreen = document.getElementById('victoryScreen');
  const stageLabel = document.getElementById('stageLabel');
  const stageName = document.getElementById('stageName');
  const comboLabel = document.getElementById('comboLabel');

  let ctx = null;
  let master = null;
  let musicBus = null;
  let dryBus = null;
  let wetBus = null;
  let compressor = null;
  let reverb = null;
  let shortNoise = null;
  let longNoise = null;
  let timer = null;
  let nextStepTime = 0;
  let step = 0;
  let started = false;
  let musicMuted = false;
  let platformPaused = false;

  const PROGRESSION = [
    { root: 73.42, chord: [146.83, 174.61, 220.00, 293.66], lead: [293.66, 349.23, 440.00, 523.25] },
    { root: 58.27, chord: [116.54, 146.83, 174.61, 233.08], lead: [233.08, 293.66, 349.23, 440.00] },
    { root: 65.41, chord: [130.81, 164.81, 196.00, 261.63], lead: [261.63, 329.63, 392.00, 493.88] },
    { root: 55.00, chord: [110.00, 138.59, 164.81, 220.00], lead: [220.00, 277.18, 329.63, 440.00] }
  ];

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    musicBus = ctx.createGain();
    dryBus = ctx.createGain();
    wetBus = ctx.createGain();
    compressor = ctx.createDynamicsCompressor();
    reverb = ctx.createConvolver();
    compressor.threshold.value = -20;
    compressor.knee.value = 18;
    compressor.ratio.value = 4.5;
    compressor.attack.value = .006;
    compressor.release.value = .24;
    master.gain.value = 0;
    musicBus.gain.value = 1;
    dryBus.gain.value = .92;
    wetBus.gain.value = .18;
    reverb.buffer = createImpulse(1.8, 2.5);
    shortNoise = createNoiseBuffer(.22);
    longNoise = createNoiseBuffer(2.2);
    musicBus.connect(dryBus);
    musicBus.connect(reverb);
    reverb.connect(wetBus);
    dryBus.connect(master);
    wetBus.connect(master);
    master.connect(compressor);
    compressor.connect(ctx.destination);
    return true;
  }

  function createNoiseBuffer(seconds) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function createImpulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return impulse;
  }

  function isGameAudible() {
    if (!started || musicMuted || platformPaused) return false;
    if (window.PulsePlatform?.inPlayables && !window.PulsePlatform.systemAudioEnabled) return false;
    if (pauseScreen?.classList.contains('active')) return false;
    if (menuScreen?.classList.contains('active')) return false;
    if (victoryScreen?.classList.contains('active')) return false;
    return true;
  }

  function gameMood() {
    const label = stageLabel?.textContent || '';
    const name = (stageName?.textContent || '').toUpperCase();
    const combo = (comboLabel?.textContent || '').toUpperCase();
    const match = label.match(/STAGE\s+(\d+)/i);
    const stage = match ? Math.max(1, Number(match[1])) : (label.includes('ENDLESS') ? 6 : 1);
    const boss = name.includes('HUNTER') || name.includes('SINGULARITY') || name.includes('BREAKPOINT') || name.includes('EVENT HORIZON');
    const blackout = name.includes('BLACKOUT') || name.includes('DEAD SIGNAL');
    const overdrive = combo.includes('OVERDRIVE');
    const firstArc = Math.min(7, Math.max(0, stage - 1));
    const finalArc = Math.min(8, Math.max(0, stage - 8));
    let intensity = .24 + firstArc * .085 + finalArc * .022;
    if (boss) intensity += .14;
    if (overdrive) intensity += .20;
    if (blackout) intensity -= .03;
    intensity = Math.max(.22, Math.min(1, intensity));
    let bpm = 112 + firstArc * 4 + finalArc;
    if (boss) bpm += 4;
    if (overdrive) bpm += 7;
    return { stage, boss, blackout, overdrive, intensity, bpm: Math.min(150, bpm) };
  }

  function startScheduler() {
    if (!ctx || timer || platformPaused) return;
    nextStepTime = ctx.currentTime + .08;
    timer = setInterval(schedule, 35);
  }

  function start() {
    if (!init()) return;
    started = true;
    step = 0;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    startScheduler();
    updateMaster(true);
  }

  function updateMaster(immediate = false) {
    if (!ctx || !master) return;
    const mood = gameMood();
    const target = isGameAudible() ? .30 + mood.intensity * .12 : 0;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    if (immediate) master.gain.setValueAtTime(target, now);
    else master.gain.setTargetAtTime(target, now, .055);
  }

  function schedule() {
    if (!ctx || !master) return;
    updateMaster();
    if (!isGameAudible()) {
      nextStepTime = Math.max(nextStepTime, ctx.currentTime + .08);
      return;
    }
    const lookAhead = .18;
    while (nextStepTime < ctx.currentTime + lookAhead) {
      const mood = gameMood();
      scheduleStep(step, nextStepTime, mood);
      nextStepTime += (60 / mood.bpm) / 4;
      step = (step + 1) % 64;
    }
  }

  function scheduleStep(s, when, mood) {
    const bar = Math.floor(s / 16);
    const local = s % 16;
    const chord = PROGRESSION[bar % PROGRESSION.length];
    const drive = mood.intensity;
    if (local === 0) {
      padChord(chord.chord, when, 60 / mood.bpm * 3.7, .018 + drive * .014, mood.blackout);
      subBass(chord.root / 2, when, .46, .030 + drive * .022);
      if (mood.stage >= 4) cinematicHit(chord.root, when, .020 + drive * .025);
    }
    const kickPattern = mood.stage <= 2 ? [0, 8] : mood.stage <= 4 ? [0, 6, 8, 14] : [0, 3, 6, 8, 11, 14];
    if (kickPattern.includes(local)) kick(when, .035 + drive * .035, mood.overdrive || mood.boss);
    if (local === 4 || local === 12) snare(when, .022 + drive * .024, mood.stage >= 5);
    if (mood.stage >= 2 && local % (mood.stage >= 5 ? 1 : 2) === 0) {
      const accent = local % 4 === 0 ? 1.35 : .72;
      hat(when, (.0045 + drive * .0075) * accent, local % 4 === 2);
    }
    const bassPattern = mood.stage <= 2 ? [0, 8] : mood.stage <= 4 ? [0, 6, 8, 11, 14] : [0, 3, 6, 8, 10, 11, 14, 15];
    if (bassPattern.includes(local)) {
      const octave = mood.overdrive && (local === 11 || local === 15) ? 2 : 1;
      wobbleBass(chord.root * octave, when, .17, .014 + drive * .020, mood);
    }
    if (mood.stage >= 2 && local % (mood.stage >= 5 ? 2 : 4) === 0) {
      const div = mood.stage >= 5 ? 2 : 4;
      const note = chord.lead[((local / div) + bar) % chord.lead.length | 0];
      pluck(note * (mood.overdrive && local === 14 ? 2 : 1), when, .16, .010 + drive * .010, mood.blackout);
    }
    if (mood.stage >= 5 && (local === 0 || local === 8)) brass(chord.root * 2, when, .30, .010 + drive * .014);
    if (mood.boss && (local === 0 || local === 5 || local === 10)) {
      subBass(chord.root / 4, when, .32, .026 + drive * .020);
      if (local === 0) cinematicHit(chord.root / 2, when, .025 + drive * .028);
    }
    if (mood.overdrive) {
      const note = chord.lead[(s + 2) % chord.lead.length] * 2;
      if (local % 2 === 1) pluck(note, when, .085, .007 + drive * .006, false);
      if (local === 15) riser(when, 60 / mood.bpm * 1.2, .022);
    }
    if (s === 60 && mood.stage >= 4 && !mood.overdrive) riser(when, 60 / mood.bpm, .014 + drive * .012);
  }

  function route(node, wet = .18) {
    const dry = ctx.createGain();
    const send = ctx.createGain();
    dry.gain.value = 1;
    send.gain.value = wet;
    node.connect(dry);
    node.connect(send);
    dry.connect(musicBus);
    send.connect(reverb);
  }

  function oscVoice(freq, when, dur, type, vol, cutoff, detune = 0, attack = .01, release = .12, wet = .12) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    osc.detune.setValueAtTime(detune, when);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, when);
    filter.Q.value = 1.2;
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, vol), when + attack);
    const hold = Math.max(when + attack + .01, when + dur - release);
    gain.gain.setValueAtTime(Math.max(.0002, vol * .8), hold);
    gain.gain.exponentialRampToValueAtTime(.0001, when + dur);
    osc.connect(filter);
    filter.connect(gain);
    route(gain, wet);
    osc.start(when);
    osc.stop(when + dur + .03);
  }

  function padChord(notes, when, dur, vol, dark) {
    notes.forEach((freq, i) => {
      oscVoice(freq, when, dur, 'sawtooth', vol * .52, dark ? 650 : 1050, -7 + i * 4, .18, .55, .34);
      oscVoice(freq / 2, when, dur, 'triangle', vol * .32, 760, 5 - i * 3, .22, .65, .28);
    });
  }

  function subBass(freq, when, dur, vol) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(vol, when + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, when + dur);
    osc.connect(gain);
    gain.connect(musicBus);
    osc.start(when);
    osc.stop(when + dur + .02);
  }

  function wobbleBass(freq, when, dur, vol, mood) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(freq, when);
    osc2.frequency.setValueAtTime(freq / 2, when);
    osc2.detune.value = 5;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260 + mood.intensity * 420, when);
    filter.Q.value = 5.5;
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(mood.overdrive ? 9 : mood.stage >= 5 ? 6 : 3.5, when);
    lfoGain.gain.setValueAtTime(140 + mood.intensity * 360, when);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(vol, when + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, when + dur);
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(musicBus);
    osc1.start(when); osc2.start(when); lfo.start(when);
    osc1.stop(when + dur + .02); osc2.stop(when + dur + .02); lfo.stop(when + dur + .02);
  }

  function pluck(freq, when, dur, vol, dark) {
    oscVoice(freq, when, dur, dark ? 'sine' : 'triangle', vol, dark ? 1250 : 3100, 0, .004, .10, .24);
  }

  function brass(freq, when, dur, vol) {
    oscVoice(freq, when, dur, 'sawtooth', vol, 1050, -8, .02, .18, .30);
    oscVoice(freq * 1.5, when, dur, 'sawtooth', vol * .55, 1250, 7, .02, .18, .32);
  }

  function kick(when, vol, harder) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(harder ? 168 : 142, when);
    osc.frequency.exponentialRampToValueAtTime(43, when + .13);
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(.0001, when + .16);
    osc.connect(gain);
    gain.connect(musicBus);
    osc.start(when);
    osc.stop(when + .17);
    if (harder && shortNoise) {
      const click = ctx.createBufferSource();
      const hp = ctx.createBiquadFilter();
      const cg = ctx.createGain();
      click.buffer = shortNoise;
      hp.type = 'highpass'; hp.frequency.value = 3800;
      cg.gain.setValueAtTime(vol * .35, when);
      cg.gain.exponentialRampToValueAtTime(.0001, when + .025);
      click.connect(hp); hp.connect(cg); cg.connect(musicBus);
      click.start(when); click.stop(when + .03);
    }
  }

  function snare(when, vol, clap) {
    if (!shortNoise) return;
    const src = ctx.createBufferSource();
    const bp = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = shortNoise;
    bp.type = 'bandpass'; bp.frequency.value = clap ? 1850 : 1450; bp.Q.value = .65;
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(.0001, when + .11);
    src.connect(bp); bp.connect(gain); route(gain, .22);
    src.start(when); src.stop(when + .12);
    oscVoice(178, when, .075, 'triangle', vol * .46, 680, 0, .003, .05, .05);
    if (clap) {
      for (const d of [.018, .034]) {
        const s = ctx.createBufferSource();
        const g = ctx.createGain();
        s.buffer = shortNoise;
        g.gain.setValueAtTime(vol * .35, when + d);
        g.gain.exponentialRampToValueAtTime(.0001, when + d + .055);
        s.connect(g); route(g, .30);
        s.start(when + d); s.stop(when + d + .06);
      }
    }
  }

  function hat(when, vol, open) {
    if (!shortNoise) return;
    const src = ctx.createBufferSource();
    const hp = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const dur = open ? .12 : .045;
    src.buffer = shortNoise;
    hp.type = 'highpass'; hp.frequency.value = 6500;
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(.0001, when + dur);
    src.connect(hp); hp.connect(gain); gain.connect(musicBus);
    src.start(when); src.stop(when + dur + .01);
  }

  function cinematicHit(freq, when, vol) {
    oscVoice(freq, when, .42, 'sawtooth', vol, 720, -11, .008, .32, .36);
    oscVoice(freq * 1.5, when, .36, 'triangle', vol * .6, 950, 8, .01, .28, .38);
    if (shortNoise) {
      const src = ctx.createBufferSource();
      const lp = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      src.buffer = shortNoise;
      lp.type = 'lowpass'; lp.frequency.value = 520;
      gain.gain.setValueAtTime(vol * .8, when);
      gain.gain.exponentialRampToValueAtTime(.0001, when + .24);
      src.connect(lp); lp.connect(gain); route(gain, .28);
      src.start(when); src.stop(when + .25);
    }
  }

  function riser(when, dur, vol) {
    if (!longNoise) return;
    const src = ctx.createBufferSource();
    const hp = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = longNoise;
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(500, when);
    hp.frequency.exponentialRampToValueAtTime(6500, when + dur);
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(vol, when + dur * .78);
    gain.gain.exponentialRampToValueAtTime(.0001, when + dur);
    src.connect(hp); hp.connect(gain); route(gain, .38);
    src.start(when); src.stop(when + dur + .02);
  }

  startIds.forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      start();
      setTimeout(() => updateMaster(), 30);
    });
  });

  // Continue controls are created after this script loads, so use delegation.
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('#continueCampaign,#continueActThree')) return;
    start();
    setTimeout(() => updateMaster(), 30);
  }, true);

  musicBtn?.addEventListener('click', () => {
    musicMuted = !musicMuted;
    musicBtn.textContent = musicMuted ? 'MUSIC OFF' : 'MUSIC ON';
    musicBtn.setAttribute('aria-pressed', String(musicMuted));
    if (!musicMuted && ctx?.state === 'suspended') ctx.resume();
    updateMaster(true);
  });

  document.getElementById('pauseBtn')?.addEventListener('click', () => setTimeout(() => updateMaster(), 0));
  document.getElementById('quitBtn')?.addEventListener('click', () => setTimeout(() => updateMaster(), 0));
  window.addEventListener('pulse:system-pause', () => {
    platformPaused = true;
    if (timer) { clearInterval(timer); timer = null; }
    updateMaster(true);
    if (ctx?.state === 'running') ctx.suspend().catch(() => {});
  });
  window.addEventListener('pulse:system-resume', () => {
    platformPaused = false;
    const resume = ctx && started && !musicMuted && (!window.PulsePlatform?.inPlayables || window.PulsePlatform.systemAudioEnabled) && ctx.state === 'suspended'
      ? ctx.resume().catch(() => {})
      : Promise.resolve();
    Promise.resolve(resume).finally(() => { startScheduler(); updateMaster(true); });
  });
  window.addEventListener('pulse:system-audio', event => {
    const enabled = Boolean(event.detail?.enabled);
    if (!enabled) { updateMaster(true); if (ctx?.state === 'running') ctx.suspend().catch(() => {}); }
    else if (!platformPaused && started && !musicMuted && ctx?.state === 'suspended') {
      ctx.resume().catch(() => {}).finally(() => { startScheduler(); updateMaster(true); });
    }
  });
})();
