/* ============================================================
   audio.js —— 音频系统
   1. AudioContext / Gain 节点
   2. SFX（音效 + 门控限流）
   3. Engine（8bit 引擎声浪）
   4. BGM（多曲目调度 + 淡入淡出）
   ============================================================ */

import { state, player, isEngineEnabled } from '@/core.js';
import { keys } from '@/platform.js';
import { V } from '@/content/vehicles.js';
import {
  BGM_TRACKS, GAME_TRACK_ROTATION,
} from '@/content/music.js';

/* ============================================================
   1. AudioContext / Gain
   ============================================================ */
let audioCtx = null;
let sfxGain = null;
let musicGain = null;
let bgmGain = null;

export function initAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }
  if (audioCtx && !sfxGain) {
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = state.soundOn ? state.sfxVolume : 0;
    sfxGain.connect(audioCtx.destination);

    musicGain = audioCtx.createGain();
    musicGain.gain.value = state.musicOn ? state.musicVolume * 0.22 : 0;
    musicGain.connect(audioCtx.destination);

    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 1.0;
    bgmGain.connect(musicGain);
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

export function getAudioCtx()  { return audioCtx; }
export function getSfxGain()   { return sfxGain; }
export function getMusicGain() { return musicGain; }
export function getBgmGain()   { return bgmGain; }

/* 音量变化后刷新节点（供 ui/menus 调用） */
export function refreshVolumes() {
  if (sfxGain)   sfxGain.gain.value   = state.soundOn ? state.sfxVolume : 0;
  if (musicGain) musicGain.gain.value = state.musicOn ? state.musicVolume * 0.22 : 0;
}

/* ============================================================
   2. SFX —— 音效 + 门控限流
   ============================================================ */
const _sfxHistory = new Map();
const SFX_WINDOW_MS = 300;
const SFX_MAX_PER_WINDOW = 5;

function sfxGate(name) {
  const now = performance.now();
  let arr = _sfxHistory.get(name);
  if (!arr) { arr = []; _sfxHistory.set(name, arr); }
  while (arr.length && now - arr[0] >= SFX_WINDOW_MS) arr.shift();
  if (arr.length >= SFX_MAX_PER_WINDOW) return false;
  arr.push(now);
  return true;
}

/* ★ 已导出：供 systems/gameplay.js 的 doJump 使用 */
export function playTone(freq, duration, type = 'square', volume = 0.08) {
  if (!state.soundOn || !audioCtx || !sfxGain) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(volume, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  o.connect(g); g.connect(sfxGain);
  o.start(); o.stop(audioCtx.currentTime + duration);
}

function playNoise(duration, volume = 0.1, filterFreq = 2000) {
  if (!state.soundOn || !audioCtx || !sfxGain) return;
  const bs = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bs, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bs; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource(); src.buffer = buffer;
  const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = filterFreq;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(volume, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  src.connect(filter); filter.connect(g); g.connect(sfxGain);
  src.start(); src.stop(audioCtx.currentTime + duration);
}

function playSweep(f1, f2, d, t = 'square', v = 0.08) {
  if (!state.soundOn || !audioCtx || !sfxGain) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = t;
  o.frequency.setValueAtTime(f1, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(f2, audioCtx.currentTime + d);
  g.gain.setValueAtTime(v, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
  o.connect(g); g.connect(sfxGain);
  o.start(); o.stop(audioCtx.currentTime + d);
}

/* ---------- 具体音效 ---------- */
export function sfxBasic()       { if (!sfxGate('basic')) return; playTone(1400, 0.03, 'square', 0.025); playTone(1800, 0.02, 'square', 0.018); }
export function sfxAoe()         { if (!sfxGate('aoe')) return; playSweep(300, 80, 0.2, 'square', 0.06); playNoise(0.22, 0.06, 900); }
export function sfxShock()       { if (!sfxGate('shock')) return; playTone(220, 0.1, 'square', 0.05); playTone(165, 0.16, 'square', 0.05); playTone(110, 0.22, 'triangle', 0.05); }
export function sfxHeal()        { if (!sfxGate('heal')) return; playTone(523, 0.06, 'square', 0.045); setTimeout(() => playTone(659, 0.06, 'square', 0.045), 55); setTimeout(() => playTone(784, 0.1, 'square', 0.05), 110); }
export function sfxCrit()        { if (!sfxGate('crit')) return; playTone(1800, 0.04, 'square', 0.05); setTimeout(() => playTone(2600, 0.05, 'square', 0.045), 25); }
export function sfxExecute()     { if (!sfxGate('execute')) return; playSweep(1200, 200, 0.2, 'sawtooth', 0.055); playTone(80, 0.1, 'sine', 0.06); }
export function sfxLuck()        { if (!sfxGate('luck')) return; playTone(1320, 0.08, 'triangle', 0.045); playTone(1760, 0.1, 'triangle', 0.04); }
export function sfxThunder()     { if (!sfxGate('thunder')) return; playNoise(0.5, 0.15, 1000); playSweep(90, 40, 0.5, 'sawtooth', 0.13); playTone(2000, 0.1, 'square', 0.03); }
export function sfxChain()       { if (!sfxGate('chain')) return; playTone(1400, 0.025, 'square', 0.035); setTimeout(() => playTone(1100, 0.025, 'square', 0.032), 20); setTimeout(() => playTone(1700, 0.035, 'square', 0.03), 42); }
export function sfxFreeze()      { if (!sfxGate('freeze')) return; playTone(2400, 0.08, 'sine', 0.04); playTone(3200, 0.06, 'sine', 0.028); }
export function sfxEnergy()      { if (!sfxGate('energy')) return; playTone(1200, 0.04, 'square', 0.04); setTimeout(() => playTone(1800, 0.08, 'square', 0.045), 45); }
export function sfxHealCard()    { if (!sfxGate('healcard')) return; playTone(440, 0.08, 'sine', 0.05); setTimeout(() => playTone(554, 0.08, 'sine', 0.05), 55); setTimeout(() => playTone(659, 0.14, 'sine', 0.055), 110); }
export function sfxRam()         { if (!sfxGate('ram')) return; playSweep(320, 100, 0.12, 'square', 0.09); playNoise(0.14, 0.08, 1400); playTone(90, 0.15, 'sawtooth', 0.06); }
export function sfxKill()        { if (!sfxGate('kill')) return; playTone(400 + Math.random() * 150, 0.055, 'square', 0.04); }
export function sfxHurt()        { if (!sfxGate('hurt')) return; playSweep(400, 120, 0.14, 'sawtooth', 0.07); }
export function sfxCardSelect()  { if (!sfxGate('cardselect')) return; playTone(800, 0.1, 'sine', 0.07); setTimeout(() => playTone(1200, 0.14, 'sine', 0.06), 80); }
export function sfxCardPick()    { if (!sfxGate('cardpick')) return; playTone(600, 0.08, 'square', 0.06); setTimeout(() => playTone(900, 0.08, 'square', 0.06), 50); setTimeout(() => playTone(1350, 0.16, 'square', 0.06), 100); }
export function sfxGameOver()    { if (!sfxGate('gameover')) return; playSweep(400, 100, 0.6, 'sawtooth', 0.12); setTimeout(() => playSweep(300, 60, 0.8, 'square', 0.1), 200); setTimeout(() => playTone(50, 1.2, 'sine', 0.13), 400); }
export function sfxVictory()     { if (!sfxGate('victory')) return; playTone(523, 0.12, 'square', 0.08); setTimeout(() => playTone(659, 0.12, 'square', 0.08), 120); setTimeout(() => playTone(784, 0.12, 'square', 0.08), 240); setTimeout(() => playTone(1047, 0.24, 'square', 0.09), 360); setTimeout(() => playTone(1319, 0.32, 'triangle', 0.08), 540); }
export function sfxBossSpawn()   { if (!sfxGate('bossspawn')) return; playSweep(60, 160, 0.6, 'sawtooth', 0.14); playSweep(120, 40, 0.8, 'square', 0.1); }
export function sfxDodge()       { if (!sfxGate('dodge')) return; playSweep(900, 1800, 0.12, 'square', 0.06); playNoise(0.1, 0.04, 3000); }
export function sfxZombieGroan() { if (!sfxGate('groan')) return; playSweep(180 + Math.random() * 60, 80, 0.5, 'sawtooth', 0.03); }
export function sfxZombieAttack(){ if (!sfxGate('zattack')) return; playSweep(300, 150, 0.15, 'sawtooth', 0.045); playNoise(0.12, 0.035, 1800); }
export function sfxSmash()       { if (!sfxGate('smash')) return; playSweep(180, 60, 0.18, 'sawtooth', 0.09); playNoise(0.18, 0.1, 800); }
export function sfxUI()          { if (!sfxGate('ui')) return; playTone(700, 0.05, 'triangle', 0.035); }

/* ============================================================
   3. Engine —— 8bit 引擎声浪
   ============================================================ */
const Engine = {
  running: false,
  master: null, filter: null,
  osc: [], oscGain: [],
  noiseSrc: null, noiseFilter: null, noiseGain: null,
  acc: 0,
};

export function startEngineSound() {
  if (Engine.running || !audioCtx || !sfxGain) return;
  const ctx = audioCtx;
  const now = ctx.currentTime;

  Engine.master = ctx.createGain();
  Engine.master.gain.value = 0;
  Engine.master.connect(sfxGain);

  Engine.filter = ctx.createBiquadFilter();
  Engine.filter.type = 'lowpass';
  Engine.filter.frequency.value = 600;
  Engine.filter.Q.value = 2.4;
  Engine.filter.connect(Engine.master);

  const shapes = ['square', 'sawtooth', 'square'];
  const gains  = [0.50, 0.34, 0.10];
  const mults  = [1, 0.5, 2.02];

  Engine.osc = []; Engine.oscGain = [];
  for (let i = 0; i < 3; i++) {
    const o = ctx.createOscillator();
    o.type = shapes[i];
    o.frequency.value = 60 * mults[i];
    const g = ctx.createGain();
    g.gain.value = gains[i];
    o.connect(g); g.connect(Engine.filter);
    o.start(now);
    Engine.osc.push(o);
    Engine.oscGain.push(g);
  }

  const len = Math.floor(ctx.sampleRate * 0.8);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;

  Engine.noiseFilter = ctx.createBiquadFilter();
  Engine.noiseFilter.type = 'bandpass';
  Engine.noiseFilter.frequency.value = 220;
  Engine.noiseFilter.Q.value = 0.9;

  Engine.noiseGain = ctx.createGain();
  Engine.noiseGain.gain.value = 0.22;

  src.connect(Engine.noiseFilter);
  Engine.noiseFilter.connect(Engine.noiseGain);
  Engine.noiseGain.connect(Engine.master);
  src.start(now);
  Engine.noiseSrc = src;

  Engine.running = true;
}

export function updateEngineSound(dt) {
  if (!Engine.running || !audioCtx) return;
  Engine.acc += dt;
  if (Engine.acc < 0.033) return;
  Engine.acc = 0;

  const ctx = audioCtx;
  const t = ctx.currentTime;
  const C = V();

  const spd = player.speed;
  const rev = spd < -0.5;
  const ratio = Math.min(1, Math.abs(spd) / Math.max(1, C.maxSpeed));
  const rpm = Math.pow(ratio, 0.85);

  const baseFreq = rev ? (38 + rpm * 72) : (52 + rpm * 164);
  const cutoff   = rev ? (240 + ratio * 900) : (420 + ratio * 3000);
  const qVal     = rev ? 5.5 : 2.4;

  Engine.osc[0].frequency.setTargetAtTime(baseFreq, t, 0.05);
  Engine.osc[1].frequency.setTargetAtTime(baseFreq * 0.5, t, 0.06);
  Engine.osc[2].frequency.setTargetAtTime(baseFreq * 2.02, t, 0.05);

  Engine.filter.frequency.setTargetAtTime(cutoff, t, 0.08);
  Engine.filter.Q.setTargetAtTime(qVal, t, 0.12);

  Engine.noiseFilter.frequency.setTargetAtTime(Math.max(80, baseFreq * 3.2), t, 0.07);
  Engine.noiseGain.gain.setTargetAtTime(rev ? 0.34 : (0.20 + ratio * 0.28), t, 0.10);

  const throttleOn = !!(keys['KeyW'] || keys['ArrowUp'] || _touchThrottle);
  const brakeOn    = !!(keys['KeyS'] || keys['ArrowDown'] || _touchBrake);

  let vol = 0;
  if (state.phase === 'playing' && isEngineEnabled()) {
    if (rev) {
      vol = 0.017 + ratio * 0.030;
    } else {
      vol = 0.013 + ratio * 0.048 + (throttleOn ? 0.010 : 0);
      if (brakeOn) vol *= 0.85;
    }
  }
  Engine.master.gain.setTargetAtTime(vol, t, 0.07);
}

/* 触屏状态由 gameplay 层注入，避免 audio 直接 import 输入模块 */
let _touchThrottle = false;
let _touchBrake = false;
export function setTouchPedals(throttle, brake) {
  _touchThrottle = !!throttle;
  _touchBrake = !!brake;
}

/* ============================================================
   4. BGM —— 多曲目调度器
   ============================================================ */
let musicRunning = false;
let musicTimerHandle = null;
let musicStep = 0;
let nextNoteTime = 0;
let activeTrack = null;
let bgmTransitionToken = 0;
let bgmPausedState = false;
let lastGameTrackIndex = -1;

export function getActiveTrack() { return activeTrack; }
export function isMusicRunning() { return musicRunning; }
export function isBgmPaused() { return bgmPausedState; }
export function getMusicStep() { return musicStep; }

export function startBGM(trackName) {
  if (!audioCtx || !musicGain || !bgmGain) return;
  if (!state.musicOn) return;
  if (activeTrack === trackName && musicRunning) return;

  bgmTransitionToken++;
  const myToken = bgmTransitionToken;

  if (musicRunning) {
    const now = audioCtx.currentTime;
    bgmGain.gain.cancelScheduledValues(now);
    bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
    bgmGain.gain.linearRampToValueAtTime(0, now + 0.2);
    setTimeout(() => {
      if (myToken !== bgmTransitionToken) return;
      musicRunning = false;
      if (musicTimerHandle) { clearInterval(musicTimerHandle); musicTimerHandle = null; }
      beginTrack(trackName, myToken);
    }, 220);
  } else {
    beginTrack(trackName, myToken);
  }
}

function beginTrack(trackName, token) {
  if (token !== bgmTransitionToken) return;
  if (musicTimerHandle) { clearInterval(musicTimerHandle); musicTimerHandle = null; }
  activeTrack = trackName;
  musicStep = 0;
  nextNoteTime = audioCtx.currentTime + 0.08;
  musicRunning = true;
  bgmPausedState = false;
  musicTimerHandle = setInterval(musicScheduler, 25);
  const t = audioCtx.currentTime;
  bgmGain.gain.cancelScheduledValues(t);
  bgmGain.gain.setValueAtTime(0, t);
  bgmGain.gain.linearRampToValueAtTime(1, t + 0.4);
}

export function stopBGM(immediate) {
  bgmTransitionToken++;
  const myToken = bgmTransitionToken;
  bgmPausedState = false;

  const hardStop = () => {
    musicRunning = false;
    if (musicTimerHandle) { clearInterval(musicTimerHandle); musicTimerHandle = null; }
    activeTrack = null;
  };
  if (immediate) hardStop();

  if (!audioCtx || !bgmGain) { if (!immediate) hardStop(); return; }
  const now = audioCtx.currentTime;
  bgmGain.gain.cancelScheduledValues(now);
  bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
  bgmGain.gain.linearRampToValueAtTime(0, now + 0.2);
  if (immediate) return;

  setTimeout(() => {
    if (myToken !== bgmTransitionToken) return;
    hardStop();
  }, 220);
}

export function pauseBGM() {
  if (!audioCtx || !bgmGain || !musicRunning) return;
  bgmTransitionToken++;
  const now = audioCtx.currentTime;
  bgmGain.gain.cancelScheduledValues(now);
  bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
  bgmGain.gain.linearRampToValueAtTime(0, now + 0.14);
  musicRunning = false;
  if (musicTimerHandle) { clearInterval(musicTimerHandle); musicTimerHandle = null; }
  bgmPausedState = true;
}

export function resumeBGM() {
  if (!audioCtx || !bgmGain || !activeTrack) { bgmPausedState = false; return; }
  if (musicRunning) return;
  bgmPausedState = false;
  musicRunning = true;
  nextNoteTime = audioCtx.currentTime + 0.06;
  musicTimerHandle = setInterval(musicScheduler, 25);
  const t = audioCtx.currentTime;
  bgmGain.gain.cancelScheduledValues(t);
  bgmGain.gain.setValueAtTime(0, t);
  bgmGain.gain.linearRampToValueAtTime(1, t + 0.22);
}

export function pickRandomGameTrack() {
  if (GAME_TRACK_ROTATION.length <= 1) return GAME_TRACK_ROTATION[0];
  let idx = Math.floor(Math.random() * GAME_TRACK_ROTATION.length);
  if (idx === lastGameTrackIndex) idx = (idx + 1) % GAME_TRACK_ROTATION.length;
  lastGameTrackIndex = idx;
  return GAME_TRACK_ROTATION[idx];
}

function musicScheduler() {
  if (!musicRunning || !audioCtx || !musicGain || !activeTrack) return;
  const track = BGM_TRACKS[activeTrack];
  if (!track) return;
  const sixteenth = 60 / track.bpm / 4;
  const totalSteps = 64;
  while (nextNoteTime < audioCtx.currentTime + 0.1) {
    scheduleMusicStep(track, musicStep, nextNoteTime, sixteenth);
    nextNoteTime += sixteenth;
    musicStep = (musicStep + 1) % totalSteps;
  }
}

function scheduleMusicStep(track, step, time, sixteenth) {
  const mel = track.melody[step];
  if (mel !== null && mel !== undefined) {
    const lenMul = track.drums === 'psychedelic' ? 2.4
                 : track.drums === 'airy'        ? 2.0
                 : 1.6;
    musicNote(mel, time, sixteenth * lenMul, 'square', 0.05);
  }
  if (step % 4 === 0) musicNote(track.bass[(step / 4) % 16], time, sixteenth * 3.6, 'triangle', 0.09);

  const d = track.drums;
  if (d === 'soft') {
    if (step % 8 === 0) musicKick(time);
    if (step % 4 === 0) musicHat(time);
  } else if (d === 'normal') {
    if (step % 8 === 0) musicKick(time);
    if (step % 8 === 4) musicSnare(time);
    if (step % 2 === 0) musicHat(time);
  } else if (d === 'intense') {
    if (step % 8 === 0) musicKick(time);
    if (step % 8 === 4) musicSnare(time);
    if (step % 2 === 0) musicHat(time);
    if (step % 4 === 2) musicHat(time);
  } else if (d === 'jazz') {
    if (step % 4 === 0) musicKick(time);
    if (step % 8 === 6) musicSnare(time);
    if (step % 2 === 1) musicHat(time);
    if (step % 8 === 3) musicHat(time);
  } else if (d === 'blues') {
    if (step % 4 === 0) musicKick(time);
    if (step % 8 === 5) musicKick(time);
    if (step % 4 === 2) musicSnare(time);
    if (step % 2 === 1) musicHat(time);
  } else if (d === 'rock') {
    if (step % 4 === 0) musicKick(time);
    if (step % 4 === 2 && step % 8 !== 4) musicKick(time);
    if (step % 8 === 4) musicSnare(time);
    if (step % 2 === 1) musicHat(time);
  } else if (d === 'electronic') {
    if (step % 4 === 0) musicKick(time);
    if (step % 8 === 4) musicSnare(time);
    if (step % 2 === 1) musicHat(time);
    if (step % 8 === 2 || step % 8 === 6) musicHat(time);
  } else if (d === 'soul') {
    if (step % 4 === 0) musicKick(time);
    if (step % 8 === 4) musicSnare(time);
    if (step % 4 === 2) musicHat(time);
    if (step % 16 === 11) musicSnare(time);
  } else if (d === 'psychedelic') {
    if (step % 8 === 0) musicKick(time);
    if (step % 8 === 4) musicSnare(time);
    if (step % 3 === 0) musicHat(time);
  } else if (d === 'funk') {
    if (step % 4 === 0) musicKick(time);
    if (step % 8 === 3) musicKick(time);
    if (step % 8 === 4) musicSnare(time);
    if (step % 4 === 1 || step % 4 === 3) musicHat(time);
    if (step % 16 === 6) musicSnare(time);
  } else if (d === 'airy') {
    if (step % 8 === 0) musicKick(time);
    if (step % 16 === 8) musicSnare(time);
    if (step % 4 === 0) musicHat(time);
  }
}

function musicNote(f, t, d, ty, v) {
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = ty; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g); g.connect(bgmGain);
  o.start(t); o.stop(t + d);
}

function musicKick(t) {
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  o.connect(g); g.connect(bgmGain);
  o.start(t); o.stop(t + 0.15);
}

function musicSnare(t) {
  const bs = audioCtx.sampleRate * 0.1;
  const buf = audioCtx.createBuffer(1, bs, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bs; i++) d[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const filter = audioCtx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 1200;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  src.connect(filter); filter.connect(g); g.connect(bgmGain);
  src.start(t); src.stop(t + 0.1);
}

function musicHat(t) {
  const bs = audioCtx.sampleRate * 0.03;
  const buf = audioCtx.createBuffer(1, bs, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bs; i++) d[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const filter = audioCtx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 7000;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.028, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  src.connect(filter); filter.connect(g); g.connect(bgmGain);
  src.start(t); src.stop(t + 0.04);
}