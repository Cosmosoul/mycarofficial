/* ============================================================
   platform.js —— 唯一的平台兼容层
   目标：仅支持 PC 浏览器 + 手机普通浏览器（无微信 / 无多 App 分支）
   职责：环境探测 / localStorage / 触摸与鼠标输入 / 全屏与横屏 / resize 分发
   ============================================================ */

/* ------------------------------------------------------------
   1. 环境探测（只区分「手机」「桌面」）
   ------------------------------------------------------------ */
const ua = navigator.userAgent;

const isIOS     = /iphone|ipad|ipod/i.test(ua);
const isAndroid = /android/i.test(ua);
const isMobile  = /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
                || ('ontouchstart' in window && window.innerWidth < 1024);

export const platform = {
  isMobile,
  isIOS,
  isAndroid,
  isTouch: isMobile || 'ontouchstart' in window,
};

/* ------------------------------------------------------------
   2. 本地存储（含隐私模式兜底）
   ------------------------------------------------------------ */
const _mem = new Map();

export function load(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch (e) {
    return _mem.has(key) ? _mem.get(key) : fallback;
  }
}

export function save(key, value) {
  try { localStorage.setItem(key, String(value)); }
  catch (e) { _mem.set(key, String(value)); }
}

export function loadJSON(key, fallback = {}) {
  const raw = load(key);
  if (raw == null) return fallback;
  try { return JSON.parse(raw); } catch (e) { return fallback; }
}

export function saveJSON(key, obj) {
  save(key, JSON.stringify(obj));
}

/* ------------------------------------------------------------
   3. 通用 tap / 触摸按钮 / 键盘
   ------------------------------------------------------------ */
let _lastTapTime = 0;

/* 全局去抖：防止触摸后被合成的 click 二次触发 */
document.addEventListener('click', (e) => {
  if (Date.now() - _lastTapTime < 120) {
    e.stopPropagation();
    e.preventDefault();
    return false;
  }
}, true);

/**
 * 通用点击绑定：同时支持触摸与鼠标，自动去抖。
 */
export function bindTap(el, handler) {
  if (!el) return;
  let sx = 0, sy = 0, moved = false;

  el.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    sx = t.clientX; sy = t.clientY; moved = false;
  }, { passive: true });

  el.addEventListener('touchmove', (e) => {
    const t = e.changedTouches[0];
    if (Math.abs(t.clientX - sx) > 12 || Math.abs(t.clientY - sy) > 12) moved = true;
  }, { passive: true });

  el.addEventListener('touchend', (e) => {
    if (moved) return;
    e.preventDefault();
    e.stopPropagation();
    _lastTapTime = Date.now();
    handler(e);
  }, { passive: false });

  el.addEventListener('click', (e) => {
    if (Date.now() - _lastTapTime < 120) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    _lastTapTime = Date.now();
    handler(e);
  });
}

/**
 * 触屏按钮：按下 / 抬起两个回调，附带 .pressed 视觉反馈。
 */
export function bindTouchButton(el, { onDown, onUp } = {}) {
  if (!el) return;

  const down = (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.add('pressed');
    _lastTapTime = Date.now();
    onDown && onDown();
  };
  const up = () => {
    el.classList.remove('pressed');
    onUp && onUp();
  };

  el.addEventListener('touchstart', down, { passive: false });
  el.addEventListener('touchend',   (e) => { e.preventDefault(); e.stopPropagation(); up(); }, { passive: false });
  el.addEventListener('touchcancel', up, { passive: false });
  el.addEventListener('mousedown', down);
  el.addEventListener('mouseup', up);
  el.addEventListener('mouseleave', up);
}

/* 键盘状态表（供业务模块直接读取 keys['KeyW'] 等） */
export const keys = {};

export function installKeyboard(onKeyDown) {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    onKeyDown && onKeyDown(e);
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
}

/* ------------------------------------------------------------
   4. 屏幕：尺寸 / 全屏 / 强制横屏 / resize 分发
   ------------------------------------------------------------ */
let _forcedRotate = false;
const _resizeListeners = new Set();

/**
 * 主渲染区（gameWrapper）的可用尺寸。
 */
export function getRenderSize() {
  const wrapper = document.getElementById('gameWrapper');
  const cw = wrapper.clientWidth || window.innerWidth;
  const ch = wrapper.clientHeight || window.innerHeight;
  const cs = getComputedStyle(wrapper);
  const pl = parseFloat(cs.paddingLeft) || 0;
  const pr = parseFloat(cs.paddingRight) || 0;
  const pt = parseFloat(cs.paddingTop) || 0;
  const pb = parseFloat(cs.paddingBottom) || 0;
  return { w: Math.max(1, cw - pl - pr), h: Math.max(1, ch - pt - pb) };
}

export function isForcedRotate() { return _forcedRotate; }

/** 屏幕坐标位移 → wrapper 内部坐标位移（考虑强制旋转） */
export function screenDeltaToWrapper(dx, dy) {
  return _forcedRotate ? { dx: dy, dy: -dx } : { dx, dy };
}

export function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement
         || document.mozFullScreenElement || document.msFullscreenElement);
}

export function requestFullscreen() {
  try {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  } catch (e) {}
}

export function exitFullscreen() {
  try {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  } catch (e) {}
}

export function lockLandscape() {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
}

/** 手机竖屏兜底：通过 CSS 旋转 gameWrapper，让游戏保持横向可玩 */
export function enableForceRotate() {
  _forcedRotate = true;
  document.getElementById('gameWrapper').classList.add('force-rotate');
  setTimeout(emitResize, 30);
  setTimeout(emitResize, 120);
  setTimeout(emitResize, 300);
}

export function onResize(fn) { _resizeListeners.add(fn); }

export function emitResize() {
  const { w, h } = getRenderSize();
  _resizeListeners.forEach(fn => fn(w, h));
}

/* 全局事件挂载 */
window.addEventListener('resize', () => emitResize());
window.addEventListener('orientationchange', () => setTimeout(emitResize, 120));
document.addEventListener('fullscreenchange', () => { emitResize(); });
document.addEventListener('webkitfullscreenchange', () => { emitResize(); });