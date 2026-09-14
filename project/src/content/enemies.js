/* ============================================================
   content/enemies.js —— 敌人内容目录
   ┌─────────────────────────────────────────────────────────┐
   │ 加一种新敌人：                                          │
   │  ① 在 ENEMY_DEFS 里加一条数值                           │
   │  ② 在 ENEMY_I18N 里加中英文名称/描述/数值标签           │
   │  ③ 若外观特殊，可在这里新增材质与几何                   │
   │  ④ 图鉴列表在 index.html 里加一条 .gallery-item         │
   └─────────────────────────────────────────────────────────┘
   ============================================================ */

import * as THREE from 'three';
import { getLang } from '@/i18n.js';

/* ============================================================
   1. 僵尸皮肤 / 面部 / 衣物纹理（Canvas 程序化生成）
   ============================================================ */
function makeCanvasTexture(size, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const skinTexture = makeCanvasTexture(192, (ctx, s) => {
  ctx.fillStyle = '#E4E4E4'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 70; i++) {
    const r = 6 + Math.random() * 26;
    const x = Math.random() * s, y = Math.random() * s;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = Math.random() < 0.6;
    if (dark) {
      g.addColorStop(0, `rgba(40,42,36,${0.34 + Math.random() * 0.34})`);
      g.addColorStop(1, 'rgba(40,42,36,0)');
    } else {
      g.addColorStop(0, `rgba(190,190,190,${0.25 + Math.random() * 0.3})`);
      g.addColorStop(1, 'rgba(190,190,190,0)');
    }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 30; i++) {
    ctx.strokeStyle = `rgba(50,20,20,${0.24 + Math.random() * 0.34})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.8;
    let x = Math.random() * s, y = Math.random() * s;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 0; j < 5; j++) { x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * s, y = Math.random() * s;
    const r = 2.5 + Math.random() * 7;
    ctx.fillStyle = `rgba(26,8,10,${0.75 + Math.random() * 0.25})`;
    ctx.beginPath();
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      const rr = r * (0.6 + Math.random() * 0.7);
      const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(120,10,16,${0.45 + Math.random() * 0.35})`;
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(${20 + Math.random() * 60 | 0},${20 + Math.random() * 50 | 0},${20 + Math.random() * 40 | 0},${0.05 + Math.random() * 0.14})`;
    ctx.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 4, 1 + Math.random() * 4);
  }
});

const faceTexture = makeCanvasTexture(192, (ctx, s) => {
  ctx.fillStyle = '#E4E4E4'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 34; i++) {
    const x = Math.random() * s, y = Math.random() * s, r = 6 + Math.random() * 24;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(56,58,50,${0.16 + Math.random() * 0.3})`);
    g.addColorStop(1, 'rgba(56,58,50,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  for (const ex of [0.30, 0.70]) {
    const cx = s * ex, cy = s * 0.40;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.20);
    g.addColorStop(0, 'rgba(2,2,3,1)');
    g.addColorStop(0.55, 'rgba(12,10,10,0.96)');
    g.addColorStop(1, 'rgba(20,20,18,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.19, s * 0.145, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(190,180,120,0.75)';
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.012, s * 0.058, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0A0202';
    ctx.beginPath(); ctx.arc(cx + s * 0.008, cy + s * 0.014, s * 0.026, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(130,20,20,0.7)'; ctx.lineWidth = 1.2;
    for (let k = 0; k < 4; k++) {
      const a = Math.random() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * s * 0.07, cy + Math.sin(a) * s * 0.07);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(96,8,12,0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.075, s * 0.045, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#120304';
  ctx.beginPath(); ctx.ellipse(s * 0.5, s * 0.76, s * 0.24, s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2A0508';
  ctx.beginPath(); ctx.ellipse(s * 0.5, s * 0.76, s * 0.18, s * 0.10, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 7; i++) {
    const w = s * 0.036 + Math.random() * s * 0.016;
    const h = s * 0.05 + Math.random() * s * 0.05;
    ctx.fillStyle = `rgba(${215 + Math.random() * 30 | 0},${205 + Math.random() * 30 | 0},${168 + Math.random() * 30 | 0},1)`;
    ctx.fillRect(s * (0.31 + i * 0.062), s * 0.685, w, h);
    ctx.fillStyle = `rgba(${200 + Math.random() * 30 | 0},${190 + Math.random() * 30 | 0},${160 + Math.random() * 30 | 0},1)`;
    ctx.fillRect(s * (0.31 + i * 0.062), s * 0.815, w, h * 0.8);
  }
  ctx.strokeStyle = 'rgba(80,6,10,0.85)'; ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(s * 0.26, s * 0.76);
  ctx.lineTo(s * 0.20, s * 0.83);
  ctx.moveTo(s * 0.74, s * 0.76);
  ctx.lineTo(s * 0.81, s * 0.84);
  ctx.stroke();
  ctx.fillStyle = 'rgba(110,10,14,0.7)';
  ctx.fillRect(s * 0.40, s * 0.08, s * 0.045, s * 0.20);
  ctx.fillRect(s * 0.56, s * 0.06, s * 0.038, s * 0.16);
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(${30 + Math.random() * 60 | 0},${30 + Math.random() * 50 | 0},${28 + Math.random() * 40 | 0},${0.05 + Math.random() * 0.13})`;
    ctx.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 3.5, 1 + Math.random() * 3.5);
  }
});

const clothTexture = makeCanvasTexture(192, (ctx, s) => {
  ctx.fillStyle = '#DEDEDE'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(70,70,70,0.25)'; ctx.lineWidth = 1;
  for (let i = -s; i < s * 2; i += 5) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + s, s); ctx.stroke(); }
  for (let i = 0; i < s * 2; i += 7) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - s, s); ctx.stroke(); }
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * s, y = Math.random() * s, r = 3 + Math.random() * 10;
    ctx.fillStyle = 'rgba(20,18,20,0.85)';
    ctx.beginPath();
    for (let a = 0; a < 9; a++) {
      const ang = (a / 9) * Math.PI * 2;
      const rr = r * (0.55 + Math.random() * 0.8);
      const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * s, y = Math.random() * s, r = 4 + Math.random() * 16;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(112,10,14,${0.55 + Math.random() * 0.35})`);
    g.addColorStop(1, 'rgba(112,10,14,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * s, y = Math.random() * s, r = 5 + Math.random() * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(40,38,34,${0.18 + Math.random() * 0.3})`);
    g.addColorStop(1, 'rgba(40,38,34,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(${24 + Math.random() * 50 | 0},${22 + Math.random() * 46 | 0},${20 + Math.random() * 42 | 0},${0.05 + Math.random() * 0.13})`;
    ctx.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 4, 1 + Math.random() * 4);
  }
});

/* ============================================================
   2. 僵尸骨架常量 + InstancedMesh + 骨骼 rig
   ============================================================ */
export const MAX_ZOMBIES = 400;

export const ZOMBIE = {
  torso: { w: 0.80, h: 1.24, d: 0.45, y: 1.37 },
  head:  { r: 0.375, y: 2.30 },
  arm:   { w: 0.21, h: 1.01, d: 0.21, shoulderX: 0.53, shoulderY: 1.94, offsetY: -0.50 },
  leg:   { w: 0.29, h: 1.10, d: 0.29, hipX: 0.21, hipY: 1.10, offsetY: -0.55 },
};

export const HEAD_GEO = new THREE.SphereGeometry(ZOMBIE.head.r, 7, 5);

/* 共享材质（InstancedMesh 用） */
export const zombieClothMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: clothTexture, roughness: 0.93, metalness: 0.02 });
export const zombieSkinMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, map: skinTexture,  roughness: 0.86, metalness: 0.03 });
export const zombieHeadMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, map: faceTexture,  roughness: 0.86, metalness: 0.03 });

/* 六件套 InstancedMesh */
export const zombieMeshes = {
  torso: new THREE.InstancedMesh(new THREE.BoxGeometry(ZOMBIE.torso.w, ZOMBIE.torso.h, ZOMBIE.torso.d), zombieClothMat, MAX_ZOMBIES),
  head:  new THREE.InstancedMesh(HEAD_GEO, zombieHeadMat, MAX_ZOMBIES),
  armL:  new THREE.InstancedMesh(new THREE.BoxGeometry(ZOMBIE.arm.w, ZOMBIE.arm.h, ZOMBIE.arm.d), zombieSkinMat, MAX_ZOMBIES),
  armR:  new THREE.InstancedMesh(new THREE.BoxGeometry(ZOMBIE.arm.w, ZOMBIE.arm.h, ZOMBIE.arm.d), zombieSkinMat, MAX_ZOMBIES),
  legL:  new THREE.InstancedMesh(new THREE.BoxGeometry(ZOMBIE.leg.w, ZOMBIE.leg.h, ZOMBIE.leg.d), zombieClothMat, MAX_ZOMBIES),
  legR:  new THREE.InstancedMesh(new THREE.BoxGeometry(ZOMBIE.leg.w, ZOMBIE.leg.h, ZOMBIE.leg.d), zombieClothMat, MAX_ZOMBIES),
};

for (const [key, mesh] of Object.entries(zombieMeshes)) {
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.castShadow = (key === 'torso' || key === 'head');
  const colorArr = new Float32Array(MAX_ZOMBIES * 3);
  for (let i = 0; i < MAX_ZOMBIES; i++) { colorArr[i * 3] = 1; colorArr[i * 3 + 1] = 1; colorArr[i * 3 + 2] = 1; }
  mesh.instanceColor = new THREE.InstancedBufferAttribute(colorArr, 3);
}

/* 骨骼 rig：只在生成实例矩阵时使用，不加入场景 */
export const rig = {
  root: new THREE.Object3D(),
  torso: new THREE.Object3D(),
  head: new THREE.Object3D(),
  armLPivot: new THREE.Object3D(),
  armRPivot: new THREE.Object3D(),
  legLPivot: new THREE.Object3D(),
  legRPivot: new THREE.Object3D(),
  armL: new THREE.Object3D(),
  armR: new THREE.Object3D(),
  legL: new THREE.Object3D(),
  legR: new THREE.Object3D(),
};
rig.root.add(rig.torso, rig.head, rig.armLPivot, rig.armRPivot, rig.legLPivot, rig.legRPivot);
rig.armLPivot.add(rig.armL); rig.armRPivot.add(rig.armR);
rig.legLPivot.add(rig.legL); rig.legRPivot.add(rig.legR);
rig.torso.position.set(0, ZOMBIE.torso.y, 0);
rig.head.position.set(0, ZOMBIE.head.y, 0);
rig.armLPivot.position.set(-ZOMBIE.arm.shoulderX, ZOMBIE.arm.shoulderY, 0);
rig.armRPivot.position.set( ZOMBIE.arm.shoulderX, ZOMBIE.arm.shoulderY, 0);
rig.armL.position.set(0, ZOMBIE.arm.offsetY, 0);
rig.armR.position.set(0, ZOMBIE.arm.offsetY, 0);
rig.legLPivot.position.set(-ZOMBIE.leg.hipX, ZOMBIE.leg.hipY, 0);
rig.legRPivot.position.set( ZOMBIE.leg.hipX, ZOMBIE.leg.hipY, 0);
rig.legL.position.set(0, ZOMBIE.leg.offsetY, 0);
rig.legR.position.set(0, ZOMBIE.leg.offsetY, 0);

/* 便捷方法：把 zombieMeshes 加入场景（由 main.js 调用） */
export function attachZombieMeshes(scene) {
  for (const mesh of Object.values(zombieMeshes)) scene.add(mesh);
}

/* 重置视觉状态（敌人数组由 systems/gameplay.js 管理） */
export function resetEnemyVisuals() {
  for (const mesh of Object.values(zombieMeshes)) {
    mesh.count = 0;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  }
  bossRig.root.visible = false;
}

/* ============================================================
   3. BOSS 建模
   ============================================================ */
export const bossBodyMat  = new THREE.MeshStandardMaterial({ color: 0xC03048, map: clothTexture, roughness: 0.72, metalness: 0.2,  emissive: 0x500A18, emissiveIntensity: 0.7 });
export const bossSkinMat  = new THREE.MeshStandardMaterial({ color: 0xE05568, map: skinTexture,  roughness: 0.75, metalness: 0.15, emissive: 0x581020, emissiveIntensity: 0.6 });
export const bossHeadMat  = new THREE.MeshStandardMaterial({ color: 0xE85068, map: faceTexture,  roughness: 0.75, metalness: 0.15, emissive: 0x5A0E1C, emissiveIntensity: 0.7 });
export const bossEyeMat   = new THREE.MeshBasicMaterial({ color: 0xFFFF20 });
export const bossMouthMat = new THREE.MeshBasicMaterial({ color: 0x140202 });
export const bossTeethMat = new THREE.MeshBasicMaterial({ color: 0xF0E8C8 });

export const bossRig = {
  root: new THREE.Group(),
  body: new THREE.Group(),
  head: new THREE.Group(),
  armLPivot: new THREE.Group(),
  armRPivot: new THREE.Group(),
  legLPivot: new THREE.Group(),
  legRPivot: new THREE.Group(),
};

/* 躯干 */
const bTorso = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.0, 1.3), bossBodyMat);
bTorso.castShadow = true;
bossRig.body.add(bTorso);
bossRig.body.position.set(0, 3.65, 0);

/* 头 */
const bSkull = new THREE.Mesh(new THREE.SphereGeometry(0.98, 8, 6), bossHeadMat);
bSkull.scale.set(1.0, 1.05, 0.9);
bSkull.castShadow = true;
bossRig.head.add(bSkull);
for (const sx of [-0.42, 0.42]) {
  const socket = new THREE.Mesh(new THREE.SphereGeometry(0.30, 8, 6), bossMouthMat);
  socket.position.set(sx, 0.24, 0.78);
  socket.scale.set(1, 0.85, 0.6);
  bossRig.head.add(socket);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), bossEyeMat);
  eye.position.set(sx, 0.24, 0.86);
  bossRig.head.add(eye);
}
const bMouth = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.5, 0.16), bossMouthMat);
bMouth.position.set(0, -0.55, 0.82);
bossRig.head.add(bMouth);
for (let i = 0; i < 6; i++) {
  const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.18 + Math.random() * 0.08, 0.1), bossTeethMat);
  tooth.position.set(-0.42 + i * 0.168, -0.40, 0.88);
  bossRig.head.add(tooth);
}
bossRig.head.position.set(0, 6.05, 0);

/* 手臂 */
function buildBossArm() {
  const pivot = new THREE.Group();
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.5, 0.65), bossSkinMat);
  upper.position.y = -0.75; upper.castShadow = true; pivot.add(upper);
  const lowerPivot = new THREE.Group(); lowerPivot.position.y = -1.5;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), bossSkinMat);
  lower.position.y = -0.6; lower.castShadow = true; lowerPivot.add(lower);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.38, 0.75), bossSkinMat);
  hand.position.set(0, -1.3, 0.1); hand.castShadow = true; lowerPivot.add(hand);
  pivot.add(lowerPivot);
  return pivot;
}
const bossArmL = buildBossArm(), bossArmR = buildBossArm();
bossArmL.position.set(-1.45, 5.05, 0);
bossArmR.position.set( 1.45, 5.05, 0);
bossRig.armLPivot.add(bossArmL);
bossRig.armRPivot.add(bossArmR);

/* 腿 */
function buildBossLeg() {
  const pivot = new THREE.Group();
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.2, 0.85), bossSkinMat);
  upper.position.y = -0.6; upper.castShadow = true; pivot.add(upper);
  const lowerPivot = new THREE.Group(); lowerPivot.position.y = -1.2;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.05, 0.75), bossSkinMat);
  lower.position.y = -0.525; lower.castShadow = true; lowerPivot.add(lower);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.4, 1.2), bossSkinMat);
  foot.position.set(0, -1.15, 0.22); foot.castShadow = true; lowerPivot.add(foot);
  pivot.add(lowerPivot);
  return pivot;
}
const bossLegL = buildBossLeg(), bossLegR = buildBossLeg();
bossLegL.position.set(-0.6, 2.3, 0);
bossLegR.position.set( 0.6, 2.3, 0);
bossRig.legLPivot.add(bossLegL);
bossRig.legRPivot.add(bossLegR);

/* 光环 */
export const bossAuraMat = new THREE.MeshBasicMaterial({ color: 0xFF3050, transparent: true, opacity: 0.4, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
export const bossAura = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.32, 8, 48), bossAuraMat);
bossAura.rotation.x = -Math.PI / 2; bossAura.position.y = 0.5;
bossRig.root.add(bossAura);
export const bossAura2 = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.16, 8, 40), bossAuraMat);
bossAura2.rotation.x = -Math.PI / 2; bossAura2.position.y = 1.6;
bossRig.root.add(bossAura2);

bossRig.root.add(bossRig.body, bossRig.head, bossRig.armLPivot, bossRig.armRPivot, bossRig.legLPivot, bossRig.legRPivot);
bossRig.root.visible = false;

/* ============================================================
   4. 敌人数值表
   ============================================================ */
export const ENEMY_DEFS = {
  mob:    { hp: 30,  speed: 16, dmg: 25, cloth: 0x4A5C30, skin: 0x9CB485, radius: 1.2, scale: { x: 1.0,  y: 1.0,  z: 1.0  }, isBoss: false },
  bomber: { hp: 20,  speed: 14, dmg: 30, cloth: 0x7A4418, skin: 0xC08858, radius: 1.3, scale: { x: 1.3,  y: 1.0,  z: 1.3  }, isBoss: false },
  ranged: { hp: 25,  speed: 11, dmg: 20, cloth: 0x8A7A28, skin: 0xB6A878, radius: 1.1, scale: { x: 0.85, y: 1.08, z: 0.85 }, isBoss: false, range: 22, fireCD: 2 },
  shield: { hp: 80,  speed: 10, dmg: 15, cloth: 0x1E5A78, skin: 0x7E98A8, radius: 1.5, scale: { x: 1.3,  y: 1.05, z: 1.3  }, isBoss: false },
  elite:  { hp: 300, speed: 12, dmg: 40, cloth: 0x5A1E70, skin: 0xA868C0, radius: 2.0, scale: { x: 1.4,  y: 1.5,  z: 1.4  }, isBoss: false },
  boss:   { hp: 3000,speed: 9,  dmg: 60, cloth: 0x7A1828, skin: 0xE05060, radius: 4.0, scale: { x: 1.0,  y: 1.0,  z: 1.0  }, isBoss: true  },
};

/* ============================================================
   5. 图鉴文案
   ============================================================ */
const ENEMY_I18N = {
  mob: {
    zh: { name: '🧟 暴徒僵尸', desc: '最常见的僵尸，速度不快，但架不住人多。它们最爱做三件事：跑、嚎、撞车。腐烂的皮肤下几乎能看到骨头。', stats: ['HP 30', '速度 16 m/s', '伤害 25/s'] },
    en: { name: '🧟 Thug Zombie', desc: 'The most common zombie. Not fast, but there are always more of them. Their three favourite hobbies: running, howling, and headbutting cars.', stats: ['HP 30', 'Speed 16 m/s', 'Damage 25/s'] },
  },
  bomber: {
    zh: { name: '💥 自爆僵尸', desc: '被感染前是个喜欢拥抱别人的热心大哥。现在他依然热爱拥抱——只是拥抱附带 30 点爆炸伤害。', stats: ['HP 20', '速度 14 m/s', '自爆 AOE 30'] },
    en: { name: '💥 Bomber Zombie', desc: 'Before the infection he was a very huggy guy. He still loves hugs — they just come with 30 points of explosive damage now.', stats: ['HP 20', 'Speed 14 m/s', 'Blast AoE 30'] },
  },
  ranged: {
    zh: { name: '🎯 远程僵尸', desc: '生前是个铅球运动员，可惜现在只能扔石头了。它胆小怕事，喜欢躲在背后偷袭。', stats: ['HP 25', '速度 11 m/s', '弹道 20'] },
    en: { name: '🎯 Ranged Zombie', desc: 'A shot-put athlete in a past life — now reduced to throwing rocks. Skittish, and loves attacking from behind.', stats: ['HP 25', 'Speed 11 m/s', 'Projectile 20'] },
  },
  shield: {
    zh: { name: '🛡️ 盾兵僵尸', desc: '盾兵的遗体被感染后，还保留着举盾的本能。正面硬得像铁板，撞上去你的车可能会散架。', stats: ['HP 80', '正面减伤 70%', '撞击需绕后'] },
    en: { name: '🛡️ Shield Zombie', desc: 'Even after infection, the shield-bearer still remembers how to raise its shield. The front is like a steel plate — ramming head-on may wreck your car.', stats: ['HP 80', 'Frontal DR 70%', 'Flank to ram'] },
  },
  elite: {
    zh: { name: '💜 精英僵尸', desc: '健身教练的尸体。3 米高，会召唤小弟，还会举铁（举的其实是被感染的哑铃）。', stats: ['HP 300', '速度 12 m/s', '召唤小怪'] },
    en: { name: '💜 Elite Zombie', desc: 'The corpse of a fitness coach. Three metres tall, summons minions, and lifts weights (which are actually infected dumbbells).', stats: ['HP 300', 'Speed 12 m/s', 'Summons mobs'] },
  },
  boss: {
    zh: { name: '👑 僵尸之王', desc: '整容失败的前健美冠军，现在全身散发着红光。它是这一切的源头——把整个城市变成了他的健身房。', stats: ['HP 3000', '伤害 60/s', '三阶段狂暴'] },
    en: { name: '👑 Zombie King', desc: 'A former bodybuilding champion with a botched surgery, now radiating red light. He is the source of all this — he turned the whole city into his gym.', stats: ['HP 3000', 'Damage 60/s', '3-phase frenzy'] },
  },
};

export function enemyInfo(type) {
  const e = ENEMY_I18N[type];
  const l = getLang();
  return (e && e[l]) || (e && e.en) || null;
}

/* ============================================================
   6. Viewer 工厂 —— 图鉴预览用的可克隆单位
   （与运行时 InstancedMesh 无关，独立建模）
   ============================================================ */
export function buildViewerZombie(clothHex, skinHex, scaleVec) {
  const g = new THREE.Group();
  const clothMat = zombieClothMat.clone(); clothMat.color.setHex(clothHex);
  const skinMat  = zombieSkinMat.clone();  skinMat.color.setHex(skinHex);
  const headMat  = zombieHeadMat.clone();  headMat.color.setHex(skinHex);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(ZOMBIE.torso.w, ZOMBIE.torso.h, ZOMBIE.torso.d), clothMat);
  torso.position.y = ZOMBIE.torso.y; torso.castShadow = true; g.add(torso);

  const head = new THREE.Mesh(HEAD_GEO, headMat);
  head.position.y = ZOMBIE.head.y; head.castShadow = true; g.add(head);

  const parts = [];
  for (const side of [-1, 1]) {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * ZOMBIE.arm.shoulderX, ZOMBIE.arm.shoulderY, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(ZOMBIE.arm.w, ZOMBIE.arm.h, ZOMBIE.arm.d), skinMat);
    arm.position.y = ZOMBIE.arm.offsetY; arm.castShadow = true;
    armPivot.add(arm); g.add(armPivot);
    parts.push({ pivot: armPivot, side, type: 'arm' });

    const legPivot = new THREE.Group();
    legPivot.position.set(side * ZOMBIE.leg.hipX, ZOMBIE.leg.hipY, 0);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(ZOMBIE.leg.w, ZOMBIE.leg.h, ZOMBIE.leg.d), clothMat);
    leg.position.y = ZOMBIE.leg.offsetY; leg.castShadow = true;
    legPivot.add(leg); g.add(legPivot);
    parts.push({ pivot: legPivot, side, type: 'leg' });
  }

  g.userData = { parts, torso, head };
  if (scaleVec) g.scale.set(scaleVec.x, scaleVec.y, scaleVec.z);
  return g;
}

export function buildViewerBoss() {
  const g = new THREE.Group();
  const bodyMat  = bossBodyMat.clone();
  const skinMat  = bossSkinMat.clone();
  const headMat  = bossHeadMat.clone();
  const eyeMat   = bossEyeMat.clone();
  const mouthMat = bossMouthMat.clone();
  const teethMat = bossTeethMat.clone();

  const body = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.0, 1.3), bodyMat);
  torso.castShadow = true;
  body.add(torso); body.position.set(0, 3.65, 0); g.add(body);

  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.98, 8, 6), headMat);
  skull.scale.set(1.0, 1.05, 0.9); skull.castShadow = true; head.add(skull);
  for (const sx of [-0.42, 0.42]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.30, 8, 6), mouthMat);
    socket.position.set(sx, 0.24, 0.78); socket.scale.set(1, 0.85, 0.6); head.add(socket);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), eyeMat);
    eye.position.set(sx, 0.24, 0.86); head.add(eye);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.5, 0.16), mouthMat);
  mouth.position.set(0, -0.55, 0.82); head.add(mouth);
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.18, 0.1), teethMat);
    t.position.set(-0.42 + i * 0.168, -0.40, 0.88); head.add(t);
  }
  head.position.set(0, 6.05, 0); g.add(head);

  const parts = [];
  for (const side of [-1, 1]) {
    const armPivot = new THREE.Group(); armPivot.position.set(side * 1.45, 5.05, 0);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.5, 0.65), skinMat);
    upper.position.y = -0.75; upper.castShadow = true; armPivot.add(upper);
    const lowerPivot = new THREE.Group(); lowerPivot.position.y = -1.5;
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), skinMat);
    lower.position.y = -0.6; lower.castShadow = true; lowerPivot.add(lower);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.38, 0.75), skinMat);
    hand.position.set(0, -1.3, 0.1); hand.castShadow = true; lowerPivot.add(hand);
    armPivot.add(lowerPivot); g.add(armPivot);
    parts.push({ pivot: armPivot, side, type: 'arm' });

    const legPivot = new THREE.Group(); legPivot.position.set(side * 0.6, 2.3, 0);
    const lu = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.2, 0.85), skinMat);
    lu.position.y = -0.6; lu.castShadow = true; legPivot.add(lu);
    const llPivot = new THREE.Group(); llPivot.position.y = -1.2;
    const ll = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.05, 0.75), skinMat);
    ll.position.y = -0.525; ll.castShadow = true; llPivot.add(ll);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.4, 1.2), skinMat);
    foot.position.set(0, -1.15, 0.22); foot.castShadow = true; llPivot.add(foot);
    legPivot.add(llPivot); g.add(legPivot);
    parts.push({ pivot: legPivot, side, type: 'leg' });
  }

  g.userData = { parts, torso, head };
  return g;
}