(() => {
  'use strict';

  const startIds = ['startCampaign', 'startEndless', 'replayBtn', 'victoryEndlessBtn', 'resumeBtn'];
  const muteBtn = document.getElementById('muteBtn');
  const pauseScreen = document.getElementById('pauseScreen');
  const menuScreen = document.getElementById('menuScreen');
  const victoryScreen = document.getElementById('victoryScreen');
  const stageLabel = document.getElementById('stageLabel');
  const stageName = document.getElementById('stageName');
  const comboLabel = document.getElementById('comboLabel');

  let ctx = null;
  let master = null;
  let compressor = null;
  let noiseBuffer = null;
  let timer = null;
  let nextStepTime = 0;
  let step = 0;
  let started = false;

  const CHORDS = [
    { bass: 73.42, arp: [293.66, 349.23, 440.00, 587.33] },
    { bass: 58.27, arp: [233.08, 293.66, 349.23, 466.16] },
    { bass: 65.41, arp: [261.63, 329.63, 392.00, 523.25] },
    { bass: 55.00, arp: [220.00, 277.18, 329.63, 440.00] }
  ];

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = .01;
    compressor.release.value = .22;
    master.gain.value = 0;
    master.connect(compressor);
    compressor.connect(ctx.destination);
    noiseBuffer = createNoiseBuffer(.14);
    return true;
  }

  function createNoiseBuffer(seconds) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function isMuted() {
    return muteBtn?.getAttribute('aria-pressed') === 'true';
  }

  function isGameAudible() {
    if (!started || document.hidden || isMuted()) return false;
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
    const boss = name.includes('HUNTER') || name.includes('SINGULARITY');
    const blackout = name.includes('BLACKOUT');
    const overdrive = combo.includes('OVERDRIVE');

    let intensity = .28 + Math.min(7, stage - 1) * .055;
    if (boss) intensity += .13;
    if (blackout) intensity -= .04;
    if (overdrive) intensity += .18;
    intensity = Math.max(.22, Math.min(.88, intensity));

    let bpm = 106 + Math.min(7, stage - 1) * 2.6;
    if (boss) bpm += 5;
    if (overdrive) bpm += 8;
    return { stage, boss, blackout, overdrive, intensity, bpm: Math.min(136, bpm) };
  }

  function start() {
    if (!init()) return;
    started = true;
    if (ctx.state === 'suspended') ctx.resume();
    if (!timer) {
      nextStepTime = ctx.currentTime + .06;
      step = 0;
      timer = setInterval(schedule, 50);
    }
    updateMaster(true);
  }

  function updateMaster(immediate = false) {
    if (!ctx || !master) return;
    const mood = gameMood();
    const target = isGameAudible() ? .18 + mood.intensity * .08 : 0;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    if (immediate) master.gain.setValueAtTime(target, now);
    else master.gain.setTargetAtTime(target, now, .07);
  }

  function schedule() {
    if (!ctx || !master) return;
    updateMaster();
    if (!isGameAudible()) {
      nextStepTime = Math.max(nextStepTime, ctx.currentTime + .08);
      return;
    }

    const lookAhead = .14;
    while (nextStepTime < ctx.currentTime + lookAhead) {
      const mood = gameMood();
      scheduleStep(step, nextStepTime, mood);
      const eighth = (60 / mood.bpm) / 2;
      nextStepTime += eighth;
      step = (step + 1) % 32;
    }
  }

  function scheduleStep(s, when, mood) {
    const chordIndex = Math.floor(s / 8) % CHORDS.length;
    const chord = CHORDS[chordIndex];
    const local = s % 8;
    const barStep = s % 16;
    const drive = mood.intensity;

    if (local === 0 || (drive > .58 && local === 4)) {
      kick(when, .028 + drive * .024, mood.overdrive);
    }

    if (local === 0 || local === 4) {
      synth(chord.bass, .31, 'triangle', .018 + drive * .018, when, 320, .02);
      if (mood.boss && local === 0) synth(chord.bass / 2, .52, 'sine', .018 + drive * .012, when, 150, .03);
    }

    const arpDensity = mood.stage <= 1 ? 4 : mood.stage <= 3 ? 2 : 1;
    if (local % arpDensity === 0) {
      const noteIndex = (s + chordIndex) % chord.arp.length;
      const octave = mood.overdrive && s % 4 === 3 ? 2 : 1;
      synth(chord.arp[noteIndex] * octave, .12, mood.blackout ? 'sine' : 'triangle', .008 + drive * .010, when, 1800 + drive * 1600, .015);
    }

    if (mood.stage >= 3 && local === 4) snare(when, .012 + drive * .014);
    if (mood.stage >= 5 && local % 2 === 1) hat(when, .005 + drive * .007);

    if (mood.overdrive) {
      const sixteenth = (60 / mood.bpm) / 4;
      hat(when + sixteenth, .008 + drive * .008);
      if (barStep === 0) synth(chord.arp[0] * 2, .26, 'sawtooth', .010, when, 2600, .02);
    }
  }

  function synth(freq, dur, type, vol, when, cutoff = 1600, attack = .01) {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, when);
    filter.Q.value = .7;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, vol), when + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, when + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + dur + .03);
  }

  function kick(when, vol, harder) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(harder ? 145 : 120, when);
    osc.frequency.exponentialRampToValueAtTime(46, when + .12);
    gain.gain.setValueAtTime(Math.max(.0001, vol), when);
    gain.gain.exponentialRampToValueAtTime(.0001, when + .14);
    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + .15);
  }

  function hat(when, vol) {
    if (!noiseBuffer) return;
    const src = ctx.createBufferSource();
    const hp = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noiseBuffer;
    hp.type = 'highpass';
    hp.frequency.value = 6200;
    gain.gain.setValueAtTime(Math.max(.0001, vol), when);
    gain.gain.exponentialRampToValueAtTime(.0001, when + .045);
    src.connect(hp);
    hp.connect(gain);
    gain.connect(master);
    src.start(when);
    src.stop(when + .055);
  }

  function snare(when, vol) {
    if (!noiseBuffer) return;
    const src = ctx.createBufferSource();
    const bp = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noiseBuffer;
    bp.type = 'bandpass';
    bp.frequency.value = 1550;
    bp.Q.value = .8;
    gain.gain.setValueAtTime(Math.max(.0001, vol), when);
    gain.gain.exponentialRampToValueAtTime(.0001, when + .09);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(master);
    src.start(when);
    src.stop(when + .10);
    synth(185, .07, 'triangle', vol * .45, when, 700, .005);
  }

  startIds.forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      start();
      setTimeout(() => updateMaster(), 30);
    });
  });

  muteBtn?.addEventListener('click', () => setTimeout(() => updateMaster(), 0));
  document.getElementById('pauseBtn')?.addEventListener('click', () => setTimeout(() => updateMaster(), 0));
  document.getElementById('quitBtn')?.addEventListener('click', () => setTimeout(() => updateMaster(), 0));
  document.addEventListener('visibilitychange', () => updateMaster());
})();
