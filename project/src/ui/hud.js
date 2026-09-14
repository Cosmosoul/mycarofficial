/* ============================================================
   ui/hud.js —— HUD 层
   1. HP / 积分 条
   2. 波次 / 击杀 / 场上 / 时间
   3. 技能栏
   4. 伤害数字池
   5. BOSS 血条（3D → 屏幕坐标投影）
   6. 危险边缘红光 / 白闪
   ============================================================ */

import { on, state, player, camera } from '@/core.js';
import { getRenderSize } from '@/platform.js';
import { skills } from '@/systems/gameplay.js';
import { getActiveEnemyCount } from '@/entities.js';

/* ---------- DOM ---------- */
const hpFill   = document.getElementById('hpFill');
const hpLabel  = document.getElementById('hpLabel');
const ptFill   = document.getElementById('ptFill');
const ptLabel  = document.getElementById('ptLabel');
const statWave  = document.getElementById('statWave');
const statKills = document.getElementById('statKills');
const statField = document.getElementById('statField');
const statTime  = document.getElementById('statTime');

const skillsBar = document.getElementById('skillsBar');
const bossBarEl = document.getElementById('bossBar');
const bossFill  = document.getElementById('bossFill');
const dmgLayer  = document.getElementById('dmgLayer');
const dangerVignette = document.getElementById('dangerVignette');
const whiteFlash     = document.getElementById('whiteFlash');

/* ============================================================
   1. 技能栏
   ============================================================ */
const skillEls = {};

export function buildSkillBar() {
  skillsBar.innerHTML = '';
  for (const [key, s] of Object.entries(skills)) {
    const el = document.createElement('div');
    el.className = 'skill';
    el.innerHTML = `${s.icon}<span class="lv">${s.lv}</span>`;
    skillEls[key] = el;
    skillsBar.appendChild(el);
  }
}

export function refreshSkillBar() {
  for (const [key, s] of Object.entries(skills)) {
    const el = skillEls[key];
    if (!el) continue;
    el.classList.toggle('active', s.active);
    const lvEl = el.querySelector('.lv');
    if (lvEl) lvEl.textContent = s.lv;
  }
}

/* ============================================================
   2. HUD 顶部数据
   ============================================================ */
export function updateHUD() {
  const hpPct = Math.max(0, player.hp / player.maxHp);
  hpFill.style.transform = `scaleX(${hpPct})`;
  hpLabel.textContent = `${Math.max(0, Math.round(player.hp))} / ${player.maxHp}`;

  const ptPct = Math.min(1, state.points / state.pointCap);
  ptFill.style.transform = `scaleX(${ptPct})`;
  ptLabel.textContent = `${Math.round(state.points)} / ${state.pointCap}`;

  statWave.textContent = 'W' + state.wave;
  statKills.textContent = state.kills;
  statField.textContent = getActiveEnemyCount();

  const m = Math.floor(state.elapsed / 60);
  const s = Math.floor(state.elapsed % 60);
  statTime.textContent = `${m}:${s.toString().padStart(2, '0')}`;

  updateBossBarPosition();
}

/* ============================================================
   3. 伤害数字池
   ============================================================ */
const dmgPool = [];

export function spawnDmg(worldPos, value, color = '#FFFFFF', big = false) {
  const v = worldPos.clone();
  v.y += 2;
  v.project(camera);
  if (v.z < -1 || v.z > 1) return;

  const { w: W, h: H } = getRenderSize();
  const sx = (v.x * 0.5 + 0.5) * W;
  const sy = (-v.y * 0.5 + 0.5) * H;

  let el = dmgPool.find(d => !d._active);
  if (!el) {
    el = document.createElement('div');
    el.className = 'dmg';
    dmgLayer.appendChild(el);
    dmgPool.push(el);
  }
  el._active = true;
  el.style.color = color;
  el.style.fontSize = big ? '24px' : '15px';
  el.style.left = sx + 'px';
  el.style.top = sy + 'px';
  el.style.opacity = '1';
  el.textContent = Math.round(value);
  el._startT = performance.now();
  el._sy = sy;
}

export function updateDmgNumbers() {
  const now = performance.now();
  for (const el of dmgPool) {
    if (!el._active) continue;
    const t = (now - el._startT) / 900;
    if (t >= 1) {
      el._active = false;
      el.style.opacity = '0';
      continue;
    }
    el.style.top = (el._sy - t * 44) + 'px';
    el.style.opacity = (1 - t).toFixed(2);
  }
}

export function clearDmgNumbers() {
  for (const el of dmgPool) {
    el._active = false;
    el.style.opacity = '0';
  }
}

/* ============================================================
   4. BOSS 血条
   ============================================================ */
export function updateBossBarPosition() {
  const b = state.boss;
  if (!b || !b.active) {
    if (bossBarEl.classList.contains('show')) bossBarEl.classList.remove('show');
    return;
  }
  if (!bossBarEl.classList.contains('show')) bossBarEl.classList.add('show');

  const wp = b.pos.clone();
  wp.y += b.radius * 2.4 + 3.4;
  wp.project(camera);
  if (wp.z > 1) {
    bossBarEl.style.opacity = '0';
    return;
  }
  bossBarEl.style.opacity = '1';

  const { w, h } = getRenderSize();
  const sx = (wp.x * 0.5 + 0.5) * w;
  const sy = (-wp.y * 0.5 + 0.5) * h;
  const barW = Math.min(260, w * 0.42);
  const margin = 12;
  const cx = Math.max(barW / 2 + margin, Math.min(w - barW / 2 - margin, sx));
  const cy = Math.max(96, Math.min(h - 40, sy));
  bossBarEl.style.left = cx + 'px';
  bossBarEl.style.top = cy + 'px';
}

export function setBossHp(ratio) {
  bossFill.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
}

/* ============================================================
   5. 白闪 / 危险红光
   ============================================================ */
export function flashWhite(intensity = 0.3) {
  whiteFlash.style.transition = 'none';
  whiteFlash.style.opacity = intensity;
  requestAnimationFrame(() => {
    whiteFlash.style.transition = 'opacity 0.28s';
    whiteFlash.style.opacity = 0;
  });
}

export function updateDangerVignette() {
  if (state.phase === 'playing' && player.hp > 0) {
    const hpPct = Math.max(0, player.hp / player.maxHp);
    if (hpPct < 0.3) {
      const intensity = (0.3 - hpPct) / 0.3;
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.008);
      dangerVignette.style.opacity = ((0.35 + intensity * 0.45) * (0.55 + pulse * 0.45)).toFixed(3);
      return;
    }
  }
  dangerVignette.style.opacity = '0';
}

export function hideDangerVignette() {
  dangerVignette.style.opacity = '0';
}

/* ============================================================
   6. 事件订阅（由 main.js 一次性调用）
   ============================================================ */
export function initHud() {
  buildSkillBar();

  on('hud:update', updateHUD);
  on('dmg:number', (payload) => {
    const color = payload.color || (payload.isCrit ? '#FFD040' : '#FFFFFF');
    spawnDmg(payload.pos, payload.value, color, !!payload.isCrit);
  });
  on('boss:hp', setBossHp);
  on('boss:barShow', () => bossBarEl.classList.add('show'));
  on('boss:barHide', () => bossBarEl.classList.remove('show'));
  on('boss:reset', () => {
    bossBarEl.classList.remove('show');
    setBossHp(1);
  });
  on('screen:flash', flashWhite);
  on('skillbar:refresh', refreshSkillBar);
  on('hud:dangerVignetteHide', hideDangerVignette);
  on('hud:clearDmg', clearDmgNumbers);

  document.addEventListener('lang:change', updateHUD);
}

/* ============================================================
   7. 每帧调用（由 main.js 主循环）
   ============================================================ */
export function tickHud() {
  updateHUD();               // ★ 修复：原来漏了，导致 HP 条 / 时间 / 场上数不刷新
  updateDmgNumbers();
  updateDangerVignette();
}