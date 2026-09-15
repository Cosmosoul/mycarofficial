/* ============================================================
   gamepad.js —— Xbox 手柄原生适配
   1. 连接 / 断开检测
   2. 双摇杆 / 双扳机 / 按钮边沿检测 + held 状态
   3. 双马达震动（分层强度 + 节流 + panic 急停 + 连续模式）
   4. y 轴翻转 / 震动开关（持久化）
   5. 手柄模式下自动隐藏鼠标光标（2s 后隐）
   6. 左摇杆导航锁（用于技能卡弹出时要求摇杆回中）
   ============================================================ */

import { emit } from '@/core.js';
import { load, save } from '@/platform.js';

const DEADZONE = 0.18;
const LOOK_DEADZONE = 0.14;
const TRIGGER_THRESHOLD = 0.15;
const NAV_REPEAT_MS = 180;
const RUMBLE_WINDOW_MS = 55;
const MOUSE_HIDE_MS = 2000;
const STICK_CENTER_THRESHOLD = 0.30;

const BTN = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5, LT: 6, RT: 7,
  Back: 8, Start: 9, LS: 10, RS: 11,
  DUp: 12, DDown: 13, DLeft: 14, DRight: 15,
};

export const pad = {
  connected: false,
  id: '',
  steerX: 0, steerY: 0,
  lookX: 0, lookY: 0,
  throttle: 0, brake: 0,

  jumpPressed: false,
  dodgePressed: false,
  confirmPressed: false,
  cancelPressed: false,
  pausePressed: false,
  lbPressed: false,
  rbPressed: false,

  navUp: false, navDown: false, navLeft: false, navRight: false,
  navUpHeld: false, navDownHeld: false, navLeftHeld: false, navRightHeld: false,

  /* ★ 左摇杆导航锁：为 true 时摇杆不产生 nav，直到摇杆回中才解锁 */
  stickNavLocked: false,

  _prev: [],
};

let _navTimer = 0;
let _lastRumbleTime = 0;
let _lastRumbleStrength = 0;
let _gamepadRef = null;
let _continuous = null;
let _continuousTimerHandle = null;
let _mouseHideTimer = null;

export let invertY = String(load('myCarInvertY', '0')) === '1';
export let rumbleEnabled = String(load('myCarRumble', '1')) !== '0';

export function setInvertY(v) {
  invertY = !!v;
  save('myCarInvertY', invertY ? '1' : '0');
}
export function setRumbleEnabled(v) {
  rumbleEnabled = !!v;
  save('myCarRumble', rumbleEnabled ? '1' : '0');
  if (!rumbleEnabled) { stopContinuousRumble(); panicRumble(); }
}

/* ★ 锁定左摇杆导航（技能卡弹出时调用） */
export function lockStickNav() {
  pad.stickNavLocked = true;
}

/* ============================================================
   鼠标光标自动隐藏
   ============================================================ */
function hideCursor() { document.body.style.cursor = 'none'; }
function showCursorTemporarily() {
  document.body.style.cursor = '';
  if (_mouseHideTimer) clearTimeout(_mouseHideTimer);
  _mouseHideTimer = setTimeout(() => {
    if (pad.connected) hideCursor();
  }, MOUSE_HIDE_MS);
}
function restoreCursor() {
  if (_mouseHideTimer) { clearTimeout(_mouseHideTimer); _mouseHideTimer = null; }
  document.body.style.cursor = '';
}

window.addEventListener('mousemove', () => {
  if (pad.connected) showCursorTemporarily();
});

/* ============================================================
   初始化
   ============================================================ */
export function initGamepad() {
  window.addEventListener('gamepadconnected', onConnect);
  window.addEventListener('gamepaddisconnected', onDisconnect);

  window.addEventListener('blur', () => panicRumble());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) panicRumble();
  });

  setTimeout(scanOnce, 400);
  setTimeout(scanOnce, 1500);
  setTimeout(scanOnce, 4000);
}

function scanOnce() {
  if (pad.connected) return;
  const list = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of list) {
    if (gp && gp.connected) { onConnect({ gamepad: gp }); return; }
  }
}

function onConnect(e) {
  if (pad.connected) return;
  pad.connected = true;
  pad.id = (e.gamepad && e.gamepad.id) || '';
  _gamepadRef = e.gamepad || null;
  pad._prev = [];
  emit('gamepad:connected', { id: pad.id });
  setTimeout(() => rumble(0.15, 0.30, 100), 80);
  hideCursor();
}

function onDisconnect() {
  if (!pad.connected) return;
  pad.connected = false;
  pad.steerX = pad.steerY = pad.lookX = pad.lookY = 0;
  pad.throttle = pad.brake = 0;
  pad.jumpPressed = pad.dodgePressed = false;
  pad.confirmPressed = pad.cancelPressed = pad.pausePressed = false;
  pad.lbPressed = pad.rbPressed = false;
  pad.navUp = pad.navDown = pad.navLeft = pad.navRight = false;
  pad.navUpHeld = pad.navDownHeld = pad.navLeftHeld = pad.navRightHeld = false;
  pad.stickNavLocked = false;
  _gamepadRef = null;
  stopContinuousRumble();
  panicRumble();
  restoreCursor();
  emit('gamepad:disconnected');
}

export function pollGamepad() {
  if (!pad.connected) return;
  const list = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (const p of list) if (p && p.connected) { gp = p; break; }
  if (!gp) { onDisconnect(); return; }
  _gamepadRef = gp;

  const ax = (i) => gp.axes[i] || 0;
  const bv = (i) => gp.buttons[i] ? gp.buttons[i].value : 0;
  const bp = (i) => gp.buttons[i] ? gp.buttons[i].pressed : false;

  const rawLX = ax(0), rawLY = ax(1);
  const rawRX = ax(2), rawRY = ax(3);

  pad.steerX = Math.abs(rawLX) < DEADZONE ? 0 : rawLX;
  pad.steerY = Math.abs(rawLY) < DEADZONE ? 0 : rawLY;
  pad.lookX  = Math.abs(rawRX) < LOOK_DEADZONE ? 0 : rawRX;
  pad.lookY  = Math.abs(rawRY) < LOOK_DEADZONE ? 0 : rawRY;
  pad.throttle = bv(BTN.RT) > TRIGGER_THRESHOLD ? bv(BTN.RT) : 0;
  pad.brake    = bv(BTN.LT) > TRIGGER_THRESHOLD ? bv(BTN.LT) : 0;

  const was = (i) => pad._prev[i] === true;
  const edge = (i) => bp(i) && !was(i);

  pad.jumpPressed    = edge(BTN.A);
  pad.dodgePressed   = edge(BTN.X);
  pad.confirmPressed = edge(BTN.A);
  pad.cancelPressed  = edge(BTN.B);
  pad.pausePressed   = edge(BTN.Start);
  pad.lbPressed      = edge(BTN.LB);
  pad.rbPressed      = edge(BTN.RB);

  let navU = edge(BTN.DUp);
  let navD = edge(BTN.DDown);
  let navL = edge(BTN.DLeft);
  let navR = edge(BTN.DRight);

  /* ★ 摇杆导航（带锁 + 回中解锁） */
  if (!navU && !navD && !navL && !navR) {
    const stickX = Math.abs(rawLX) > 0.55 ? rawLX : 0;
    const stickY = Math.abs(rawLY) > 0.55 ? rawLY : 0;

    if (pad.stickNavLocked) {
      /* 锁定期内只有摇杆回中才解锁 */
      if (Math.abs(rawLX) < STICK_CENTER_THRESHOLD
       && Math.abs(rawLY) < STICK_CENTER_THRESHOLD) {
        pad.stickNavLocked = false;
      }
    } else {
      const nowMs = performance.now();
      if ((stickX || stickY) && nowMs - _navTimer > NAV_REPEAT_MS) {
        _navTimer = nowMs;
        if (Math.abs(stickX) > Math.abs(stickY)) {
          if (stickX > 0) navR = true; else navL = true;
        } else {
          if (stickY > 0) navD = true; else navU = true;
        }
      }
    }
  }

  pad.navUp = navU;
  pad.navDown = navD;
  pad.navLeft = navL;
  pad.navRight = navR;

  /* held 状态：D-pad 按住 OR 摇杆推过阈值（held 不受锁影响，滑条可继续用摇杆调值） */
  pad.navUpHeld    = bp(BTN.DUp)    || rawLY < -0.55;
  pad.navDownHeld  = bp(BTN.DDown)  || rawLY >  0.55;
  pad.navLeftHeld  = bp(BTN.DLeft)  || rawLX < -0.55;
  pad.navRightHeld = bp(BTN.DRight) || rawLX >  0.55;

  pad._prev = gp.buttons.map(b => b.pressed);
}

/* ============================================================
   震动核心
   ============================================================ */
export function rumble(strong = 0.6, weak = 0.4, duration = 120) {
  if (!pad.connected || !rumbleEnabled) return;
  const now = performance.now();
  const inWindow = now - _lastRumbleTime < RUMBLE_WINDOW_MS;
  if (inWindow && strong <= _lastRumbleStrength + 0.15) return;

  _lastRumbleTime = now;
  _lastRumbleStrength = strong;

  const gp = _gamepadRef || (navigator.getGamepads ? [...navigator.getGamepads()].find(p => p && p.connected) : null);
  if (!gp) return;

  const act = gp.vibrationActuator;
  if (act && typeof act.playEffect === 'function') {
    try {
      const r = act.playEffect('dual-rumble', {
        startDelay: 0,
        duration,
        weakMagnitude:   Math.max(0, Math.min(1, weak)),
        strongMagnitude: Math.max(0, Math.min(1, strong)),
      });
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch (e) {}
    return;
  }
  if (gp.hapticActuators && gp.hapticActuators[0]) {
    try { gp.hapticActuators[0].pulse(Math.max(0, Math.min(1, strong)), duration); } catch (e) {}
  }
}

export function rumbleLight()  { rumble(0.18, 0.30,  70); }
export function rumbleHit()    { rumble(0.78, 0.82, 100); }
export function rumbleMedium() { rumble(0.55, 0.60, 130); }
export function rumbleHeavy()  { rumble(0.95, 0.90, 240); }

export function rumbleByDistance(dist, maxDist, strong = 0.9, weak = 0.85, dur = 220) {
  const t = Math.max(0, 1 - dist / maxDist);
  if (t <= 0.05) return;
  rumble(strong * t, weak * t, dur);
}

export function startContinuousRumble(strong = 0.10, weak = 0.14, periodMs = 180, durMs = 70) {
  if (!pad.connected || !rumbleEnabled) return;
  stopContinuousRumble();
  _continuous = { strong, weak, periodMs, durMs };
  const tick = () => {
    if (!_continuous) return;
    rumble(_continuous.strong, _continuous.weak, _continuous.durMs);
    _continuousTimerHandle = setTimeout(tick, _continuous.periodMs);
  };
  tick();
}

export function stopContinuousRumble() {
  _continuous = null;
  if (_continuousTimerHandle) { clearTimeout(_continuousTimerHandle); _continuousTimerHandle = null; }
}

export function panicRumble() {
  stopContinuousRumble();
  const gp = _gamepadRef || (navigator.getGamepads ? [...navigator.getGamepads()].find(p => p && p.connected) : null);
  if (!gp) return;
  const act = gp.vibrationActuator;
  if (act && typeof act.playEffect === 'function') {
    try {
      const r = act.playEffect('dual-rumble', {
        startDelay: 0, duration: 1,
        weakMagnitude: 0, strongMagnitude: 0,
      });
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch (e) {}
  }
  if (gp.hapticActuators && gp.hapticActuators[0]) {
    try { gp.hapticActuators[0].pulse(0, 1); } catch (e) {}
  }
}

export function isGamepadActive() { return pad.connected; }
