/* ============================================================
   gamepad.js —— Xbox 手柄原生适配
   1. 连接 / 断开检测（含"已连接过的手柄"主动扫描）
   2. 每帧轮询，暴露 pad.* 输入状态
   3. 通过 EventBus 广播 gamepad:connected / gamepad:disconnected
   ============================================================ */

import { emit } from '@/core.js';

/* 左摇杆死区 / 扳机触发阈值 / 摇杆导航重复间隔 */
const DEADZONE = 0.18;
const TRIGGER_THRESHOLD = 0.15;
const NAV_REPEAT_MS = 180;

/* Xbox 标准映射按钮索引 */
const BTN = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5, LT: 6, RT: 7,
  Back: 8, Start: 9, LS: 10, RS: 11,
  DUp: 12, DDown: 13, DLeft: 14, DRight: 15,
};

/* 对外暴露的输入状态 */
export const pad = {
  connected: false,
  id: '',

  /* 模拟量 */
  steerX: 0,        // -1（左）~ +1（右）
  throttle: 0,      // 0 ~ 1（RT）
  brake: 0,         // 0 ~ 1（LT）

  /* 边沿触发（按下当帧为 true，下一帧自动复位） */
  jumpPressed: false,     // A
  dodgePressed: false,    // X
  confirmPressed: false,  // A
  cancelPressed: false,   // B
  pausePressed: false,    // Start / Menu
  navUp: false, navDown: false, navLeft: false, navRight: false,

  _prev: [],
};

let _navTimer = 0;

export function initGamepad() {
  window.addEventListener('gamepadconnected', onConnect);
  window.addEventListener('gamepaddisconnected', onDisconnect);
  /* 页面加载时若手柄已连接，浏览器可能不派发事件 → 主动扫描几次 */
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
  pad._prev = [];
  emit('gamepad:connected', { id: pad.id });
}

function onDisconnect() {
  if (!pad.connected) return;
  pad.connected = false;
  pad.steerX = 0;
  pad.throttle = 0;
  pad.brake = 0;
  pad.jumpPressed = pad.dodgePressed = false;
  pad.confirmPressed = pad.cancelPressed = pad.pausePressed = false;
  pad.navUp = pad.navDown = pad.navLeft = pad.navRight = false;
  emit('gamepad:disconnected');
}

export function pollGamepad() {
  if (!pad.connected) return;
  const list = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (const p of list) if (p && p.connected) { gp = p; break; }
  if (!gp) { onDisconnect(); return; }

  const ax = (i) => gp.axes[i] || 0;
  const bv = (i) => gp.buttons[i] ? gp.buttons[i].value : 0;
  const bp = (i) => gp.buttons[i] ? gp.buttons[i].pressed : false;

  /* ---- 模拟量 ---- */
  const rawX = ax(0);
  const rawY = ax(1);
  pad.steerX = Math.abs(rawX) < DEADZONE ? 0 : rawX;
  pad.throttle = bv(BTN.RT) > TRIGGER_THRESHOLD ? bv(BTN.RT) : 0;
  pad.brake    = bv(BTN.LT) > TRIGGER_THRESHOLD ? bv(BTN.LT) : 0;

  /* ---- 边沿检测 ---- */
  const was = (i) => pad._prev[i] === true;
  const edge = (i) => bp(i) && !was(i);

  pad.jumpPressed    = edge(BTN.A);
  pad.dodgePressed   = edge(BTN.X);
  pad.confirmPressed = edge(BTN.A);
  pad.cancelPressed  = edge(BTN.B);
  pad.pausePressed   = edge(BTN.Start);

  /* ---- 方向键 ---- */
  let navU = edge(BTN.DUp);
  let navD = edge(BTN.DDown);
  let navL = edge(BTN.DLeft);
  let navR = edge(BTN.DRight);

  /* ---- 左摇杆导航（带节流） ---- */
  const stickX = Math.abs(rawX) > 0.5 ? rawX : 0;
  const stickY = Math.abs(rawY) > 0.5 ? rawY : 0;
  const nowMs = performance.now();
  if ((stickX || stickY) && nowMs - _navTimer > NAV_REPEAT_MS) {
    _navTimer = nowMs;
    if (Math.abs(stickX) > Math.abs(stickY)) {
      if (stickX > 0) navR = true; else navL = true;
    } else {
      if (stickY > 0) navD = true; else navU = true;
    }
  }

  pad.navUp = navU;
  pad.navDown = navD;
  pad.navLeft = navL;
  pad.navRight = navR;

  pad._prev = gp.buttons.map(b => b.pressed);
}

/** 便捷访问：当前是否处于"手柄模式"（用于 UI 显示提示图标等） */
export function isGamepadActive() { return pad.connected; }
