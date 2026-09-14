/* ============================================================
   fx.js —— 全部视觉效果
   1. 玩家子弹（Points）
   2. 通用粒子（Points）
   3. 超速尾焰（Points）
   4. 速度线 / 边缘光晕（Canvas overlay）
   5. 闪电 / 冲击环 / 火花 / 闪冲轨迹
   6. 敌方火球（Points）
   ============================================================ */

import * as THREE from 'three';
import { scene, state, player } from '@/core.js';
import { getRenderSize } from '@/platform.js';
import Tuning from '@/config.js';
import { V } from '@/content/vehicles.js';

/* 由 entities.js 每帧注入 carMesh 的 Y 偏移（跳跃高度） */
let _carMeshY = 0;
export function setCarMeshY(y) { _carMeshY = y; }

/* 所有 FX 系统一次性加入场景；由 main.js 调用 */
export function initFxLayer() {
  scene.add(bulletPoints);
  scene.add(particlePoints);
  scene.add(flamePoints);
  scene.add(lightningGroup);
  scene.add(fxGroup);
  scene.add(enemyBulletPoints);
}

/* ============================================================
   1. 玩家子弹
   ============================================================ */
const BULLET_MAX = 2000;
const bulletGeo = new THREE.BufferGeometry();
const bulletPos = new Float32Array(BULLET_MAX * 3);
const bulletCol = new Float32Array(BULLET_MAX * 3);
const bulletSize = new Float32Array(BULLET_MAX);
for (let i = 0; i < BULLET_MAX; i++) bulletPos[i * 3 + 1] = -1000;
bulletGeo.setAttribute('position', new THREE.BufferAttribute(bulletPos, 3));
bulletGeo.setAttribute('color', new THREE.BufferAttribute(bulletCol, 3));
bulletGeo.setAttribute('size', new THREE.BufferAttribute(bulletSize, 1));

const bulletMat = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float size; varying vec3 vColor;
    void main(){
      vColor = color;
      vec4 mv = modelViewMatrix * vec4(position,1.0);
      gl_PointSize = size * (350.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying vec3 vColor;
    void main(){
      vec2 c = gl_PointCoord - vec2(0.5);
      float d = length(c);
      if (d > 0.5) discard;
      float core = smoothstep(0.5, 0.0, d);
      float glow = smoothstep(0.5, 0.15, d);
      float a = core * 0.85 + glow * 0.4;
      gl_FragColor = vec4(vColor * (1.0 + core * 0.8), a);
    }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true,
});

const bulletPoints = new THREE.Points(bulletGeo, bulletMat);
bulletPoints.frustumCulled = false;

const bullets = [];
for (let i = 0; i < BULLET_MAX; i++) {
  bullets.push({
    active: false,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    life: 0, dmg: 0,
    color: new THREE.Color(),
    size: 1, kind: 'basic',
    target: null, aoeData: null,
  });
}

/**
 * 生成一发子弹。
 * @param {THREE.Vector3} from 起点
 * @param {THREE.Vector3} to   目标（用于计算方向）
 * @param {number|THREE.Color} color
 * @param {number} dmg
 * @param {string} kind  'basic' | 'aoe_projectile'
 * @param {number} size
 * @param {number} speed
 */
export function spawnBullet(from, to, color, dmg, kind, size = 1.6, speed = 90) {
  for (const b of bullets) {
    if (b.active) continue;
    b.active = true;
    b.pos.copy(from); b.pos.y = 1.4;
    const dir = new THREE.Vector3(to.x - from.x, 0, to.z - from.z).normalize();
    b.vel.copy(dir).multiplyScalar(speed);
    b.life = 1.5;
    b.dmg = dmg;
    b.color.set(color);
    b.size = size;
    b.kind = kind;
    b.target = null;
    b.aoeData = null;
    return b;
  }
  return null;
}

/**
 * 更新子弹。命中回调通过事件总线触发——由 gameplay 层在初始化时注册
 * `bullet:hit`（命中敌人）与 `bullet:aoeHit`（AoE 爆炸）。
 */
export function updateBullets(dt) {
  for (const b of bullets) {
    if (!b.active) continue;
    b.life -= dt;
    if (b.life <= 0) { b.active = false; continue; }
    b.pos.addScaledVector(b.vel, dt);

    if (b.kind === 'aoe_projectile' && b.target) {
      const dx = b.pos.x - b.target.x, dz = b.pos.z - b.target.z;
      if (dx * dx + dz * dz < 9) {
        _emit('bullet:aoeHit', b);
        b.active = false;
        continue;
      }
      continue;
    }

    /* 普通子弹：交给外部做敌人碰撞检测 */
    _emit('bullet:tick', b);
  }

  /* 写回 GPU */
  let idx = 0;
  for (const b of bullets) {
    if (!b.active) continue;
    if (idx >= BULLET_MAX) break;
    bulletPos[idx * 3]     = b.pos.x;
    bulletPos[idx * 3 + 1] = b.pos.y;
    bulletPos[idx * 3 + 2] = b.pos.z;
    bulletCol[idx * 3]     = b.color.r;
    bulletCol[idx * 3 + 1] = b.color.g;
    bulletCol[idx * 3 + 2] = b.color.b;
    bulletSize[idx]        = b.size;
    idx++;
  }
  for (let i = idx; i < BULLET_MAX; i++) {
    bulletPos[i * 3 + 1] = -1000;
    bulletSize[i] = 0;
  }
  bulletGeo.attributes.position.needsUpdate = true;
  bulletGeo.attributes.color.needsUpdate = true;
  bulletGeo.attributes.size.needsUpdate = true;
}

/* 从当前帧中查询：位置附近是否有活跃子弹 */
export function forEachBullet(fn) {
  for (const b of bullets) if (b.active) fn(b);
}
export function deactivateBullet(b) { b.active = false; }

/* 事件总线简易转发（避免顶部 import 造成循环） */
function _emit(event, payload) {
  // 延迟 import 避免与 core 的循环引用
  import('@/core.js').then(({ emit }) => emit(event, payload));
}

/* ============================================================
   2. 通用粒子
   ============================================================ */
const PARTICLE_MAX = 3000;
const particleGeo = new THREE.BufferGeometry();
const pPos  = new Float32Array(PARTICLE_MAX * 3);
const pCol  = new Float32Array(PARTICLE_MAX * 3);
const pSize = new Float32Array(PARTICLE_MAX);
for (let i = 0; i < PARTICLE_MAX; i++) pPos[i * 3 + 1] = -1000;
particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
particleGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
particleGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1));

const particleMat = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float size; varying vec3 vColor;
    void main(){
      vColor = color;
      vec4 mv = modelViewMatrix * vec4(position,1.0);
      gl_PointSize = size * (350.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying vec3 vColor;
    void main(){
      vec2 c = gl_PointCoord - vec2(0.5);
      float d = length(c);
      if (d > 0.5) discard;
      float core = smoothstep(0.5, 0.0, d);
      float glow = smoothstep(0.5, 0.15, d);
      float a = core * 0.9 + glow * 0.5;
      gl_FragColor = vec4(vColor * (1.0 + core * 1.2), a);
    }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true,
});

const particlePoints = new THREE.Points(particleGeo, particleMat);
particlePoints.frustumCulled = false;

const particles = [];
for (let i = 0; i < PARTICLE_MAX; i++) {
  particles.push({
    active: false,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(),
    life: 0, maxLife: 0,
    color: new THREE.Color(), size: 1,
  });
}

export function spawnBurstParticles(center, color, count, baseSpeed) {
  let spawned = 0;
  for (const p of particles) {
    if (spawned >= count) break;
    if (p.active) continue;
    p.active = true;
    p.pos.copy(center);
    p.pos.y += 0.5 + Math.random() * 1.0;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.7;
    const spd = baseSpeed * (0.5 + Math.random() * 1.0);
    p.vel.set(
      Math.sin(phi) * Math.cos(theta) * spd,
      Math.cos(phi) * spd + 3 + Math.random() * 6,
      Math.sin(phi) * Math.sin(theta) * spd
    );
    p.maxLife = Tuning.Particles.life * (0.6 + Math.random() * 0.7);
    p.life = p.maxLife;
    p.color.set(color);
    p.size = 1.4 + Math.random() * 2.4;
    spawned++;
  }
}

export function updateParticles(dt) {
  for (const p of particles) {
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { p.active = false; continue; }
    p.vel.y -= Tuning.Particles.gravity * dt;
    p.vel.x *= (1 - 1.6 * dt);
    p.vel.z *= (1 - 1.6 * dt);
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.pos.z += p.vel.z * dt;
    if (p.pos.y < 0.2) {
      p.pos.y = 0.2;
      p.vel.y *= -0.35;
      p.vel.x *= 0.6;
      p.vel.z *= 0.6;
    }
  }

  let idx = 0;
  for (const p of particles) {
    if (!p.active) continue;
    if (idx >= PARTICLE_MAX) break;
    const alpha = p.life / p.maxLife;
    pPos[idx * 3]     = p.pos.x;
    pPos[idx * 3 + 1] = p.pos.y;
    pPos[idx * 3 + 2] = p.pos.z;
    pCol[idx * 3]     = p.color.r * alpha;
    pCol[idx * 3 + 1] = p.color.g * alpha;
    pCol[idx * 3 + 2] = p.color.b * alpha;
    pSize[idx]        = p.size * alpha;
    idx++;
  }
  for (let i = idx; i < PARTICLE_MAX; i++) {
    pPos[i * 3 + 1] = -1000;
    pSize[i] = 0;
  }
  particleGeo.attributes.position.needsUpdate = true;
  particleGeo.attributes.color.needsUpdate = true;
  particleGeo.attributes.size.needsUpdate = true;
}

export function clearParticles() {
  for (const p of particles) p.active = false;
  for (let i = 0; i < PARTICLE_MAX; i++) {
    pPos[i * 3 + 1] = -1000;
    pSize[i] = 0;
  }
  particleGeo.attributes.position.needsUpdate = true;
  particleGeo.attributes.size.needsUpdate = true;
}

/* ============================================================
   3. 超速尾焰
   ============================================================ */
const FLAME_MAX = Tuning.SpeedFx.maxFlames;
const flameGeo = new THREE.BufferGeometry();
const flamePos  = new Float32Array(FLAME_MAX * 3);
const flameCol  = new Float32Array(FLAME_MAX * 3);
const flameSize = new Float32Array(FLAME_MAX);
for (let i = 0; i < FLAME_MAX; i++) flamePos[i * 3 + 1] = -1000;
flameGeo.setAttribute('position', new THREE.BufferAttribute(flamePos, 3));
flameGeo.setAttribute('color', new THREE.BufferAttribute(flameCol, 3));
flameGeo.setAttribute('size', new THREE.BufferAttribute(flameSize, 1));

const flameMat = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float size; varying vec3 vColor;
    void main(){
      vColor = color;
      vec4 mv = modelViewMatrix * vec4(position,1.0);
      gl_PointSize = size * (350.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying vec3 vColor;
    void main(){
      vec2 c = gl_PointCoord - vec2(0.5);
      float d = length(c);
      if (d > 0.5) discard;
      float core = smoothstep(0.5, 0.0, d);
      float glow = smoothstep(0.5, 0.10, d);
      float a = core * 0.95 + glow * 0.62;
      gl_FragColor = vec4(vColor * (1.0 + core * 1.8), a);
    }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true,
});

const flamePoints = new THREE.Points(flameGeo, flameMat);
flamePoints.frustumCulled = false;

const flameParticles = [];
for (let i = 0; i < FLAME_MAX; i++) {
  flameParticles.push({
    active: false,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(),
    life: 0, maxLife: 0,
    size: 1, drag: 3,
    r: 1, g: 1, b: 1,
  });
}
let _flameCursor = 0;
function _getFreeFlame() {
  for (let i = 0; i < FLAME_MAX; i++) {
    const idx = (_flameCursor + i) % FLAME_MAX;
    if (!flameParticles[idx].active) {
      _flameCursor = (idx + 1) % FLAME_MAX;
      return flameParticles[idx];
    }
  }
  return null;
}

const SPEED_FX = { intensity: 0, emitAccum: 0 };
export function getSpeedFxIntensity() { return SPEED_FX.intensity; }

export function updateSpeedFx(rawDt) {
  let target = 0;
  if (state.phase === 'playing') {
    const ratio = Math.abs(player.speed) / V().maxSpeed;
    if (ratio > Tuning.SpeedFx.threshold) {
      target = Math.min(1,
        (ratio - Tuning.SpeedFx.threshold) /
        (Tuning.SpeedFx.fullAt - Tuning.SpeedFx.threshold));
    }
  }
  const rate = target > SPEED_FX.intensity
    ? Tuning.SpeedFx.riseRate
    : Tuning.SpeedFx.fallRate;
  SPEED_FX.intensity += (target - SPEED_FX.intensity) * (1 - Math.exp(-rate * rawDt));
  if (SPEED_FX.intensity < 0.002) SPEED_FX.intensity = 0;
}

export function emitExhaustFlames(dt, intensity) {
  if (intensity <= 0.002) return;
  const veh = V();
  const exhausts = veh.exhausts || [[0, 0.45, -2.1]];
  const exDir = veh.exhaustDir || [0, 0, -1];
  const flamePal = veh.flame || [[0.7, 0.9, 1.0], [1.0, 0.82, 0.34], [1.0, 0.42, 0.10]];

  const yaw = player.yaw;
  const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
  const fwdX = sinY, fwdZ = cosY;
  const carY = _carMeshY;

  const carVelX = fwdX * player.speed;
  const carVelZ = fwdZ * player.speed;

  const rate = Tuning.SpeedFx.emitRate + intensity * Tuning.SpeedFx.emitRateGain;
  SPEED_FX.emitAccum += rate * dt;
  let n = Math.floor(SPEED_FX.emitAccum);
  if (n > 70) n = 70;
  SPEED_FX.emitAccum -= n;
  if (n <= 0) return;

  const jetSpeed = 22 + intensity * 48;
  const spread = 3.0 + intensity * 5.0;

  const dx =  exDir[0] * cosY + exDir[2] * sinY;
  const dz = -exDir[0] * sinY + exDir[2] * cosY;
  const dy =  exDir[1];

  for (let i = 0; i < n; i++) {
    const p = _getFreeFlame();
    if (!p) break;

    const port = exhausts[(Math.random() * exhausts.length) | 0];
    const lx = port[0] + (Math.random() - 0.5) * 0.18;
    const ly = port[1] + (Math.random() - 0.5) * 0.16;
    const lz = port[2] + (Math.random() - 0.5) * 0.16;

    p.pos.set(
      lx * cosY + lz * sinY + player.pos.x,
      ly + carY,
      -lx * sinY + lz * cosY + player.pos.z
    );

    p.vel.set(
      carVelX + dx * jetSpeed + (Math.random() - 0.5) * spread,
      dy * jetSpeed * 0.6 + 0.6 + Math.random() * 2.2 + intensity * 1.6,
      carVelZ + dz * jetSpeed + (Math.random() - 0.5) * spread
    );

    p.maxLife = 0.14 + Math.random() * 0.26;
    p.life = p.maxLife;
    p.drag = 2.6 + Math.random() * 2.0;
    p.size = (1.5 + Math.random() * 2.2) * (0.7 + intensity * 0.9);

    const roll = Math.random();
    let ci;
    if (roll < 0.16 + intensity * 0.38) ci = 0;
    else if (roll < 0.62) ci = 1;
    else ci = 2;
    const c = flamePal[ci];
    const jit = 0.9 + Math.random() * 0.2;
    p.r = Math.min(1, c[0] * jit);
    p.g = Math.min(1, c[1] * jit);
    p.b = Math.min(1, c[2] * jit);

    p.active = true;
  }
}

export function updateExhaustFlames(dt) {
  for (const p of flameParticles) {
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { p.active = false; continue; }

    const d = Math.exp(-p.drag * dt);
    p.vel.x *= d; p.vel.z *= d; p.vel.y *= d;
    p.vel.y += 1.6 * dt;

    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.pos.z += p.vel.z * dt;

    if (p.pos.y < 0.12) {
      p.pos.y = 0.12;
      p.vel.y = Math.abs(p.vel.y) * 0.18;
    }
  }

  let idx = 0;
  for (const p of flameParticles) {
    if (!p.active) continue;
    if (idx >= FLAME_MAX) break;
    const t = p.life / p.maxLife;
    const fade = t < 0.5 ? 1.0 : (1 - t) * 2.0;
    flamePos[idx * 3]     = p.pos.x;
    flamePos[idx * 3 + 1] = p.pos.y;
    flamePos[idx * 3 + 2] = p.pos.z;
    flameCol[idx * 3]     = p.r * fade;
    flameCol[idx * 3 + 1] = p.g * fade;
    flameCol[idx * 3 + 2] = p.b * fade;
    flameSize[idx]        = p.size * (0.30 + t * 0.70);
    idx++;
  }
  for (let i = idx; i < FLAME_MAX; i++) {
    flamePos[i * 3 + 1] = -1000;
    flameSize[i] = 0;
  }
  flameGeo.attributes.position.needsUpdate = true;
  flameGeo.attributes.color.needsUpdate = true;
  flameGeo.attributes.size.needsUpdate = true;
}

export function clearFlames() {
  for (const p of flameParticles) p.active = false;
  for (let i = 0; i < FLAME_MAX; i++) {
    flamePos[i * 3 + 1] = -1000;
    flameSize[i] = 0;
  }
  flameGeo.attributes.position.needsUpdate = true;
  flameGeo.attributes.size.needsUpdate = true;
  SPEED_FX.intensity = 0;
  SPEED_FX.emitAccum = 0;
  if (_slCtx) { _slCtx.clearRect(0, 0, _slCanvas.width, _slCanvas.height); _slDirty = false; }
  if (_speedVignetteEl) _speedVignetteEl.style.opacity = '0';
}

/* ============================================================
   4. 速度线 / 边缘光晕
   ============================================================ */
let _slCanvas = null, _slCtx = null, _speedVignetteEl = null;
let _slW = 0, _slH = 0, _slDirty = false;

export function initSpeedLines() {
  _slCanvas = document.getElementById('speedLines');
  _slCtx = _slCanvas ? _slCanvas.getContext('2d') : null;
  _speedVignetteEl = document.getElementById('speedVignette');
  resizeSpeedLineCanvas();
}

export function resizeSpeedLineCanvas() {
  if (!_slCanvas) return;
  const w = _slCanvas.clientWidth || window.innerWidth;
  const h = _slCanvas.clientHeight || window.innerHeight;
  if (w <= 0 || h <= 0) return;
  _slW = w; _slH = h;
  const s = 0.55;
  _slCanvas.width  = Math.max(1, Math.round(w * s));
  _slCanvas.height = Math.max(1, Math.round(h * s));
}

export function drawSpeedOverlay(intensity) {
  if (!_slCanvas || !_slCtx) return;
  if (_slCanvas.clientWidth !== _slW || _slCanvas.clientHeight !== _slH) {
    resizeSpeedLineCanvas();
  }
  const ctx = _slCtx;
  const W = _slCanvas.width, H = _slCanvas.height;
  if (W <= 0 || H <= 0) return;

  if (intensity <= 0.004) {
    if (_slDirty) { ctx.clearRect(0, 0, W, H); _slDirty = false; }
    if (_speedVignetteEl) _speedVignetteEl.style.opacity = '0';
    return;
  }
  _slDirty = true;
  ctx.clearRect(0, 0, W, H);

  const cx = W * 0.5, cy = H * 0.5;
  const R = Math.hypot(W, H) * 0.5;

  const count = Math.max(6, Math.round(Tuning.SpeedFx.lineCount * intensity));
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const r0 = R * (0.26 + Math.random() * 0.40);
    const len = R * (0.08 + Math.random() * 0.42) * intensity;
    const alpha = (0.07 + Math.random() * 0.30) * intensity;

    ctx.strokeStyle = `rgba(200,235,255,${alpha.toFixed(3)})`;
    ctx.lineWidth = 0.6 + Math.random() * 2.4 * intensity;
    ctx.beginPath();
    ctx.moveTo(cx + ca * r0, cy + sa * r0);
    ctx.lineTo(cx + ca * (r0 + len), cy + sa * (r0 + len));
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  if (_speedVignetteEl) {
    _speedVignetteEl.style.opacity = (intensity * 0.88).toFixed(3);
  }
}

/* ============================================================
   5. 闪电 / 冲击环 / 火花 / 闪冲轨迹
   ============================================================ */
const lightningGroup = new THREE.Group();
const lightningList = [];

function generateLightning(s, e, iter = 5, off = 3.0) {
  let pts = [s.clone(), e.clone()];
  for (let it = 0; it < iter; it++) {
    const next = [];
    for (let j = 0; j < pts.length - 1; j++) {
      const a = pts[j], b = pts[j + 1];
      const mid = a.clone().lerp(b, 0.5);
      const dir = b.clone().sub(a).normalize();
      const perp = new THREE.Vector3(-dir.z, 0, dir.x);
      mid.addScaledVector(perp, (Math.random() - 0.5) * off);
      mid.y += (Math.random() - 0.5) * off * 0.35;
      next.push(a, mid);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    off *= 0.55;
  }
  return pts;
}

export function spawnLightning(s, e, color, life = 0.15, forks = 2) {
  const pts = generateLightning(s, e, 5, 4.5);
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  const line = new THREE.Line(geo, mat);
  lightningGroup.add(line);
  lightningList.push({ obj: line, life, maxLife: life });

  for (let i = 0; i < forks; i++) {
    const idx = 2 + Math.floor(Math.random() * Math.max(1, pts.length - 4));
    const origin = pts[idx];
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 0.4 - 0.2,
      (Math.random() - 0.5) * 2
    ).normalize();
    const len = 5 + Math.random() * 12;
    const end2 = origin.clone().addScaledVector(dir, len);
    const fpts = generateLightning(origin, end2, 3, 1.8);
    const fgeo = new THREE.BufferGeometry().setFromPoints(fpts);
    const fmat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const fline = new THREE.Line(fgeo, fmat);
    lightningGroup.add(fline);
    lightningList.push({ obj: fline, life: life * 0.75, maxLife: life * 0.75 });
  }
}

export function updateLightning(dt) {
  for (let i = lightningList.length - 1; i >= 0; i--) {
    const l = lightningList[i];
    l.life -= dt;
    if (l.life <= 0) {
      lightningGroup.remove(l.obj);
      l.obj.geometry.dispose();
      l.obj.material.dispose();
      lightningList.splice(i, 1);
      continue;
    }
    l.obj.material.opacity = l.life / l.maxLife;
  }
}

/* —— 环 / 火花 —— */
const fxGroup = new THREE.Group();
const fxList = [];

export function spawnHitSpark(pos, color) {
  const geo = new THREE.RingGeometry(0.2, 0.5, 12);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.rotation.x = -Math.PI / 2;
  fxGroup.add(mesh);
  fxList.push({ obj: mesh, life: 0.25, maxLife: 0.25, type: 'spark', maxR: 3 });
}

export function spawnRing(pos, color, maxR, life = 0.4, y = 0.5) {
  const geo = new THREE.RingGeometry(0.6, 1.0, 32);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.position.y = y;
  mesh.rotation.x = -Math.PI / 2;
  fxGroup.add(mesh);
  fxList.push({ obj: mesh, life, maxLife: life, type: 'ring', maxR });
}

export function updateFx(dt) {
  for (let i = fxList.length - 1; i >= 0; i--) {
    const f = fxList[i];
    f.life -= dt;
    if (f.life <= 0) {
      fxGroup.remove(f.obj);
      f.obj.geometry.dispose();
      f.obj.material.dispose();
      fxList.splice(i, 1);
      continue;
    }
    const t = 1 - f.life / f.maxLife;
    if (f.type === 'ring') {
      const s = 0.5 + t * f.maxR;
      f.obj.scale.set(s, s, s);
      f.obj.material.opacity = (1 - t) * 0.9;
    } else if (f.type === 'spark') {
      const s = 1 + t * f.maxR;
      f.obj.scale.set(s, s, s);
      f.obj.material.opacity = (1 - t) * 0.95;
    }
  }
}

export function spawnDodgeEffect(start, end) {
  const sr = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1.2, 32),
    new THREE.MeshBasicMaterial({ color: 0x60E0FF, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  sr.position.copy(start); sr.position.y = 0.3; sr.rotation.x = -Math.PI / 2;
  fxGroup.add(sr); fxList.push({ obj: sr, life: 0.35, maxLife: 0.35, type: 'ring', maxR: 4 });

  const er = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1.2, 32),
    new THREE.MeshBasicMaterial({ color: 0x80E8FF, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  er.position.copy(end); er.position.y = 0.3; er.rotation.x = -Math.PI / 2;
  fxGroup.add(er); fxList.push({ obj: er, life: 0.45, maxLife: 0.45, type: 'ring', maxR: 6 });

  const beamGeo = new THREE.BufferGeometry().setFromPoints([start.clone().setY(0.8), end.clone().setY(0.8)]);
  const beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: 0xA0F0FF, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  fxGroup.add(beam); fxList.push({ obj: beam, life: 0.25, maxLife: 0.25, type: 'beam' });
}

/* ============================================================
   6. 敌方火球
   ============================================================ */
const EB_MAX = 300;
const ebGeo = new THREE.BufferGeometry();
const ebPos   = new Float32Array(EB_MAX * 3);
const ebSize  = new Float32Array(EB_MAX);
const ebPhase = new Float32Array(EB_MAX);
for (let i = 0; i < EB_MAX; i++) { ebPos[i * 3 + 1] = -1000; ebSize[i] = 0; }
ebGeo.setAttribute('position', new THREE.BufferAttribute(ebPos, 3));
ebGeo.setAttribute('size', new THREE.BufferAttribute(ebSize, 1));
ebGeo.setAttribute('phase', new THREE.BufferAttribute(ebPhase, 1));

const ebMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    attribute float size;
    attribute float phase;
    uniform float uTime;
    varying float vFlicker;
    void main(){
      vFlicker = 0.78 + 0.22 * sin(uTime * 24.0 + phase);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * vFlicker * (350.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying float vFlicker;
    void main(){
      vec2 c = gl_PointCoord - vec2(0.5);
      float d = length(c);
      if (d > 0.5) discard;
      float core = smoothstep(0.20, 0.0, d);
      float mid  = smoothstep(0.44, 0.14, d);
      float halo = smoothstep(0.50, 0.32, d);
      vec3 col = vec3(1.00, 0.96, 0.80) * core
               + vec3(1.00, 0.40, 0.05) * mid  * 0.92
               + vec3(0.80, 0.04, 0.10) * halo * 0.85;
      float a = (core + mid * 0.85 + halo * 0.55) * vFlicker;
      gl_FragColor = vec4(col * vFlicker, a);
    }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
});

const enemyBulletPoints = new THREE.Points(ebGeo, ebMat);
enemyBulletPoints.frustumCulled = false;

const enemyBullets = [];

export function spawnEnemyBullet(from, dir, dmg) {
  enemyBullets.push({
    pos: from.clone(),
    vel: dir.clone().multiplyScalar(32),
    life: 2,
    dmg,
    phase: Math.random() * 6.283,
  });
}

export function clearEnemyBullets() { enemyBullets.length = 0; }

/**
 * 命中玩家时触发 `enemybullet:hitPlayer`，由 gameplay 层决定扣血 / 无敌判定。
 */
export function updateEnemyBullets(dt) {
  ebMat.uniforms.uTime.value += dt;

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.life -= dt;
    if (b.life <= 0) { enemyBullets.splice(i, 1); continue; }
    b.pos.addScaledVector(b.vel, dt);

    const dx = b.pos.x - player.pos.x;
    const dz = b.pos.z - player.pos.z;
    if (dx * dx + dz * dz < 4 && player.iframe <= 0 && !player.isJumping) {
      _emit('enemybullet:hitPlayer', b);
      spawnRing(b.pos.clone().setY(0.3), 0xFF5020, 3, 0.28);
      enemyBullets.splice(i, 1);
    }
  }

  let idx = 0;
  for (const b of enemyBullets) {
    if (idx >= EB_MAX) break;
    ebPos[idx * 3]     = b.pos.x;
    ebPos[idx * 3 + 1] = b.pos.y;
    ebPos[idx * 3 + 2] = b.pos.z;
    ebSize[idx]  = 2.8;
    ebPhase[idx] = b.phase;
    idx++;
  }
  for (let i = idx; i < EB_MAX; i++) {
    ebPos[i * 3 + 1] = -1000;
    ebSize[i] = 0;
  }
  ebGeo.attributes.position.needsUpdate = true;
  ebGeo.attributes.size.needsUpdate = true;
  ebGeo.attributes.phase.needsUpdate = true;
}