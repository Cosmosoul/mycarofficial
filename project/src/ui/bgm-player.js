/* ============================================================
   ui/bgm-player.js —— BGM 鉴赏
   1. 曲库列表
   2. 选中 / 试听 / 上一首 / 下一首 / 停止
   3. 播放按钮 / 唱片旋转 / 状态同步
   4. 进度条
   5. 频谱可视化（基于节拍伪随机包络，无需 AnalyserNode）
   ============================================================ */

import { on, emit, state } from '@/core.js';
import { bindTap } from '@/platform.js';
import { T } from '@/i18n.js';
import { initAudio, sfxUI } from '@/audio.js';
import * as Audio from '@/audio.js';
import {
  BGM_TRACKS, BGM_META, BGM_GALLERY_ORDER, bgmLoopSeconds,
} from '@/content/music.js';

/* ============================================================
   1. 播放器状态
   ============================================================ */
const bgmPlayer = {
  current: null,       // 当前试听曲目 key
  active: false,       // 播放器是否接管了音乐（进入鉴赏页签）
  vizRaf: null,
  vizCtx: null,
  vizBars: 48,
  vizEnergy: [],
  vizTick: 0,
  vizLast: null,
  lastActive: null,
  _lastPlaying: null,
};

/* ============================================================
   2. 曲库列表
   ============================================================ */
function renderBgmList() {
  const list = document.getElementById('bgmList');
  if (!list) return;
  list.innerHTML = '';

  BGM_GALLERY_ORDER.forEach((key, i) => {
    const meta = BGM_META[key] || {};
    const track = BGM_TRACKS[key];
    const row = document.createElement('div');
    row.className = 'bgm-row' +
      (key === bgmPlayer.current ? ' sel' : '') +
      (key === bgmPlayer.current && isBgmPlaying() ? ' playing' : '');
    row.dataset.key = key;
    row.innerHTML =
      `<span class="bg-idx">${(i + 1).toString().padStart(2, '0')}</span>` +
      `<span class="bg-meta">` +
        `<span class="bg-nm">${meta.name || key}</span>` +
        `<span class="bg-gn">${(meta.genre || '')} · ${(track ? track.bpm : 0)}BPM</span>` +
      `</span>` +
      `<span class="bg-eq"><i></i><i></i><i></i></span>`;
    bindTap(row, () => { selectBgmTrack(key, true); });
    list.appendChild(row);
  });

  refreshBgmListState();
}

function refreshBgmListState() {
  const list = document.getElementById('bgmList');
  if (!list) return;
  const playing = isBgmPlaying();

  list.querySelectorAll('.bgm-row').forEach(row => {
    const isCur = row.dataset.key === bgmPlayer.current;
    row.classList.toggle('sel', isCur);
    row.classList.toggle('playing', isCur && playing);
  });

  const idx = BGM_GALLERY_ORDER.indexOf(bgmPlayer.current);
  const cnt = document.getElementById('bgmCount');
  if (cnt) cnt.textContent = `${idx >= 0 ? idx + 1 : 0} / ${BGM_GALLERY_ORDER.length}`;
}

function isBgmPlaying() {
  return !!(Audio.isMusicRunning() &&
            Audio.getActiveTrack() &&
            Audio.getActiveTrack() === bgmPlayer.current &&
            !Audio.isBgmPaused());
}

/* ============================================================
   3. 选中 / 试听 / 传输控制
   ============================================================ */
function selectBgmTrack(key, autoPlay) {
  if (!BGM_TRACKS[key]) return;
  bgmPlayer.current = key;
  refreshBgmListState();
  updateBgmNowUI();

  if (autoPlay) {
    initAudio();
    sfxUI();
    bgmPlayer.vizTick = 0;
    Audio.startBGM(key);
    /* 淡入切换需要约 220ms 才真正接轨，稍后同步播放态 */
    setTimeout(syncBgmPlayState, 120);
    setTimeout(syncBgmPlayState, 340);
  }
}

function syncBgmPlayState() {
  const playing = isBgmPlaying();
  if (bgmPlayer._lastPlaying === playing) return;
  bgmPlayer._lastPlaying = playing;

  const btn = document.getElementById('bgmPlay');
  if (btn) btn.textContent = playing ? '❚❚' : '▶';

  const disc = document.getElementById('bgmDisc');
  if (disc) disc.classList.toggle('spin', playing);

  const tipEl = document.getElementById('bgmTip');
  if (tipEl) tipEl.classList.toggle('hide', playing);

  refreshBgmListState();
}

function updateBgmNowUI() {
  const key = bgmPlayer.current;
  const meta = BGM_META[key] || {};
  const track = BGM_TRACKS[key];

  const titleEl = document.getElementById('bgmTitle');
  if (titleEl) titleEl.textContent = meta.name || key;

  const tagsEl = document.getElementById('bgmTags');
  if (tagsEl) {
    tagsEl.innerHTML =
      `<span class="np-tag">${meta.genre || ''}</span>` +
      `<span class="np-tag cool">${(track ? track.bpm : 0)} BPM</span>` +
      `<span class="np-tag cool">${(track && track.drums ? track.drums.toUpperCase() : '')}</span>`;
  }

  const bpmEl = document.getElementById('bgmBpm');
  if (bpmEl) bpmEl.textContent = `${(track ? track.bpm : 0)} BPM`;

  const tipEl = document.getElementById('bgmTip');
  if (tipEl) tipEl.classList.toggle('hide', isBgmPlaying());
}

function bgmTogglePlay() {
  initAudio();
  sfxUI();
  const key = bgmPlayer.current || BGM_GALLERY_ORDER[0];
  bgmPlayer.current = key;

  if (isBgmPlaying()) {
    Audio.pauseBGM();
    syncBgmPlayState();
  } else if (Audio.getActiveTrack() === key && !Audio.isMusicRunning()) {
    Audio.resumeBGM();
    syncBgmPlayState();
  } else {
    bgmPlayer.vizTick = 0;
    Audio.startBGM(key);
    setTimeout(syncBgmPlayState, 120);
    setTimeout(syncBgmPlayState, 340);
  }
  updateBgmNowUI();
}

function bgmStep(dir) {
  const i = BGM_GALLERY_ORDER.indexOf(bgmPlayer.current);
  const n = BGM_GALLERY_ORDER.length;
  const next = ((i < 0 ? 0 : i + dir) % n + n) % n;
  selectBgmTrack(BGM_GALLERY_ORDER[next], true);
}

function bgmStop() {
  initAudio();
  sfxUI();
  /* immediate 停止：逻辑态与 UI 同步都在本次调用内完成 */
  Audio.stopBGM(true);
  syncBgmPlayState();
  updateBgmNowUI();
  updateBgmProgress();
}

/* ============================================================
   4. 进度条
   ============================================================ */
function updateBgmProgress() {
  if (!bgmPlayer.active) return;
  const fill = document.getElementById('bgmFill');
  const timeEl = document.getElementById('bgmTime');
  const key = bgmPlayer.current;
  const loop = bgmLoopSeconds(key);
  let sec = 0;
  if (Audio.getActiveTrack() === key) sec = (Audio.getMusicStep() % 64) / 64 * loop;

  if (fill) {
    fill.style.width = (Audio.getActiveTrack() === key
      ? ((Audio.getMusicStep() % 64) / 64 * 100)
      : 0) + '%';
  }
  if (timeEl) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    timeEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}

/* ============================================================
   5. 频谱可视化
   ============================================================ */
function startBgmViz() {
  const canvas = document.getElementById('bgmViz');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  bgmPlayer.vizCtx = ctx;

  if (bgmPlayer.vizEnergy.length !== bgmPlayer.vizBars) {
    bgmPlayer.vizEnergy = new Array(bgmPlayer.vizBars).fill(0);
  }
  if (bgmPlayer.vizRaf) return;

  const loop = () => {
    bgmPlayer.vizRaf = requestAnimationFrame(loop);
    drawBgmViz();
  };
  bgmPlayer.vizRaf = requestAnimationFrame(loop);
}

function stopBgmViz() {
  if (bgmPlayer.vizRaf) {
    cancelAnimationFrame(bgmPlayer.vizRaf);
    bgmPlayer.vizRaf = null;
  }
}

function drawBgmViz() {
  const canvas = document.getElementById('bgmViz');
  const ctx = bgmPlayer.vizCtx;
  if (!canvas || !ctx) return;

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w <= 0 || h <= 0) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const playing = isBgmPlaying();
  const track = BGM_TRACKS[bgmPlayer.current] || BGM_TRACKS.menu;
  const bpm = track ? track.bpm : 100;

  const now = performance.now() / 1000;
  if (bgmPlayer.vizLast == null) bgmPlayer.vizLast = now;
  const dt = Math.min(0.1, now - bgmPlayer.vizLast);
  bgmPlayer.vizLast = now;
  if (playing) bgmPlayer.vizTick += (bpm / 60) * 4 * dt;

  const beat = bgmPlayer.vizTick;
  const n = bgmPlayer.vizBars;
  const gap = 2;
  const bw = Math.max(2, (w - gap * (n - 1)) / n);
  const mid = h;

  /* 底网 */
  ctx.strokeStyle = 'rgba(79,221,192,0.10)';
  ctx.lineWidth = 1;
  for (let g = 1; g < 4; g++) {
    const y = Math.round((h / 4) * g) + 0.5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  for (let i = 0; i < n; i++) {
    const p = i / n;
    let target;

    if (playing) {
      const kickEnv = Math.pow(Math.max(0, Math.sin(beat * Math.PI)), 2);
      const hatEnv  = Math.pow(Math.max(0, Math.sin(beat * Math.PI * 2 + 1.1)), 3.2);
      const bassBand = Math.max(0, 1 - p * 1.5);
      const highBand = Math.max(0, p * 1.4 - 0.35);
      const wobble = 0.5 + 0.5 * Math.sin(beat * 1.7 + i * 0.55);
      const hiss = 0.35 + 0.65 * Math.abs(Math.sin(i * 12.9898 + beat * 0.9));
      target = 0.10
        + kickEnv * bassBand * 0.88
        + hatEnv  * highBand * 0.55
        + wobble  * 0.22 * hiss;
    } else {
      target = 0.035 + 0.045 * Math.abs(Math.sin(i * 0.4));
    }

    target = Math.min(1, target);
    const cur = bgmPlayer.vizEnergy[i];
    bgmPlayer.vizEnergy[i] = playing
      ? (target > cur ? cur + (target - cur) * 0.42 : cur + (target - cur) * 0.14)
      : cur + (target - cur) * 0.06;

    const bh = Math.max(2, bgmPlayer.vizEnergy[i] * (h - 6));
    const x = i * (bw + gap);
    const y = mid - bh;

    const grad = ctx.createLinearGradient(0, mid, 0, y);
    grad.addColorStop(0,   'rgba(79,221,192,0.20)');
    grad.addColorStop(0.45,'rgba(79,221,192,0.85)');
    grad.addColorStop(1,   playing ? 'rgba(255,179,71,0.98)' : 'rgba(120,140,160,0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, bw, bh);

    if (playing && bh > 6) {
      ctx.fillStyle = 'rgba(255,235,190,0.9)';
      ctx.fillRect(x, y, bw, 1.6);
    }
  }
}

/* ============================================================
   6. 进入 / 离开 BGM 页签
   ============================================================ */
function enterBgmTab() {
  initAudio();
  bgmPlayer.active = true;
  bgmPlayer.lastActive = Audio.getActiveTrack();

  /* 若当前正在播放的曲目属于曲库，直接沿用为选中项；否则默认第一首 */
  const active = Audio.getActiveTrack();
  if (active && BGM_TRACKS[active]) bgmPlayer.current = active;
  if (!bgmPlayer.current || !BGM_TRACKS[bgmPlayer.current]) {
    bgmPlayer.current = BGM_GALLERY_ORDER[0];
  }

  renderBgmList();
  updateBgmNowUI();
  syncBgmPlayState();
  updateBgmProgress();   /* 首帧前先同步进度条 */
  startBgmViz();
}

function leaveBgmTab() {
  bgmPlayer.active = false;
  stopBgmViz();
}

/* ============================================================
   7. 初始化 & 事件订阅
   ============================================================ */
export function initBgmPlayer() {
  bindTap(document.getElementById('bgmPlay'), bgmTogglePlay);
  bindTap(document.getElementById('bgmPrev'), () => bgmStep(-1));
  bindTap(document.getElementById('bgmNext'), () => bgmStep(1));
  bindTap(document.getElementById('bgmStop'), bgmStop);

  on('bgm:enterTab', enterBgmTab);
  on('bgm:leaveTab', leaveBgmTab);
  on('bgm:playerDeactivate', () => { bgmPlayer.active = false; });

  document.addEventListener('lang:change', () => {
    if (bgmPlayer.active) {
      renderBgmList();
      updateBgmNowUI();
      syncBgmPlayState();
    }
  });
}

/* ============================================================
   8. 每帧更新（由 main.js 调用）
   ============================================================ */
export function tickBgmPlayer() {
  if (!bgmPlayer.active) return;
  updateBgmProgress();
  syncBgmPlayState();               /* 幂等：仅在状态变化时更新 DOM */
  if (!bgmPlayer.vizRaf) startBgmViz();
}