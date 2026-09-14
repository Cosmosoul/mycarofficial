/* ============================================================
   content/vehicles.js —— 车辆内容目录
   ┌─────────────────────────────────────────────────────────┐
   │ 加一辆新车，只需三步：                                  │
   │  ① 在这里 buildXxxModel() 里加建模函数                  │
   │  ② 在 VEHICLES 里加一条 register('xxx', {...数值...})   │
   │  ③ 在 VEHICLE_I18N 里加中英文名称和描述                 │
   │  ④ 在 config.js 的 CAR_UNLOCK_RULES 里加解锁条件        │
   └─────────────────────────────────────────────────────────┘
   ============================================================ */

import * as THREE from 'three';
import { getLang } from '@/i18n.js';
import { selectedCarId } from '@/core.js';

/* ============================================================
   1. 共享材质工厂
   ============================================================ */
export const MAT = {
  body:   () => new THREE.MeshStandardMaterial({ color: 0x2A6FB8, roughness: 0.28, metalness: 0.85, emissive: 0x0A2040, emissiveIntensity: 0.35 }),
  dark:   () => new THREE.MeshStandardMaterial({ color: 0x0A0A0C, roughness: 0.75, metalness: 0.3 }),
  glass:  () => new THREE.MeshStandardMaterial({ color: 0x102030, roughness: 0.08, metalness: 0.9, emissive: 0x1A3060, emissiveIntensity: 0.35, transparent: true, opacity: 0.88 }),
  chrome: () => new THREE.MeshStandardMaterial({ color: 0xC8D0D8, roughness: 0.15, metalness: 1.0 }),
  tire:   () => new THREE.MeshStandardMaterial({ color: 0x0A0A0A, roughness: 0.9, metalness: 0.1 }),
  head:   () => new THREE.MeshBasicMaterial({ color: 0xE8F4FF }),
  tail:   () => new THREE.MeshBasicMaterial({ color: 0xFF1A3A }),
};

/* ============================================================
   2. 车辆数值定义
   ============================================================ */
export const VEHICLES = {
  coupe: {
    id: 'coupe', name: '轿跑车', icon: '🚗',
    desc: '一台被诅咒的 2003 年二手轿跑。均衡、可靠、没有短板——你永远可以相信它。',
    maxSpeed: 70, accel: 20, brake: 80, friction: 1.2,
    maxSteer: 0.85, steerFalloff: 0.15, steerResponse: 10, yawRateBase: 8.0, lowSpeedSteerPoint: 6,
    hitRadius: 3.6, ramBase: 22, ramPerSpeed: 0.32,
    exhausts: [[-0.55, 0.42, -2.20], [0.55, 0.42, -2.20]],
    exhaustDir: [0, 0, -1],
    flame: [[0.70, 0.90, 1.00], [1.00, 0.82, 0.34], [1.00, 0.42, 0.10]],
    preview: { dist: 11, height: 1.4 },
  },
  motorcycle: {
    id: 'motorcycle', name: '摩托车', icon: '🏍️',
    desc: '轻量、敏捷、转得像疯了一样。极速极高但撞击力度偏弱——用灵活换生存。',
    maxSpeed: 88, accel: 31, brake: 70, friction: 0.9,
    maxSteer: 1.05, steerFalloff: 0.09, steerResponse: 14, yawRateBase: 10.6, lowSpeedSteerPoint: 4,
    hitRadius: 2.4, ramBase: 16, ramPerSpeed: 0.34,
    exhausts: [[0, 0.55, -1.15]],
    exhaustDir: [0, 0, -1],
    flame: [[0.92, 1.00, 1.00], [0.55, 0.90, 1.00], [0.20, 0.35, 1.00]],
    preview: { dist: 9.5, height: 1.0 },
  },
  truck: {
    id: 'truck', name: '大卡车', icon: '🚚',
    desc: '重甲洪流。加速慢、转向笨，但这一撞下去，整条街都得让路。',
    maxSpeed: 52, accel: 13, brake: 95, friction: 1.5,
    maxSteer: 0.62, steerFalloff: 0.22, steerResponse: 7, yawRateBase: 5.6, lowSpeedSteerPoint: 8,
    hitRadius: 5.0, ramBase: 34, ramPerSpeed: 0.38,
    exhausts: [[-0.85, 1.65, -4.40], [0.85, 1.65, -4.40]],
    exhaustDir: [0, 0, -1],
    flame: [[1.00, 0.95, 0.78], [1.00, 0.58, 0.14], [0.55, 0.14, 0.02]],
    preview: { dist: 17, height: 2.2 },
  },
  train: {
    id: 'train', name: '火车头', icon: '🚂',
    desc: '单节蒸汽机车。转向迟钝到令人绝望，但没有任何东西能挡住它——撞谁谁飞。',
    maxSpeed: 62, accel: 16, brake: 120, friction: 1.8,
    maxSteer: 0.45, steerFalloff: 0.28, steerResponse: 5, yawRateBase: 4.2, lowSpeedSteerPoint: 10,
    hitRadius: 6.0, ramBase: 45, ramPerSpeed: 0.30,
    exhausts: [[0, 2.30, 2.10]],
    exhaustDir: [0, 1, 0],
    flame: [[1.00, 0.90, 0.55], [1.00, 0.42, 0.08], [0.35, 0.10, 0.02]],
    preview: { dist: 19, height: 2.4 },
  },
  tank: {
    id: 'tank', name: '坦克', icon: '🛡️',
    desc: '履带压过一切的重装堡垒。速度慢、转向笨，但冲撞力近乎碾压——正面硬刚从不吃亏。',
    maxSpeed: 48, accel: 15, brake: 100, friction: 1.7,
    maxSteer: 0.56, steerFalloff: 0.26, steerResponse: 6, yawRateBase: 4.6, lowSpeedSteerPoint: 9,
    hitRadius: 5.2, ramBase: 40, ramPerSpeed: 0.44,
    exhausts: [[-0.85, 1.92, -3.62], [0.85, 1.92, -3.62]],
    exhaustDir: [0, 0, -1],
    flame: [[0.62, 0.55, 0.48], [1.00, 0.58, 0.18], [0.42, 0.12, 0.02]],
    preview: { dist: 18, height: 2.4 },
  },
  future: {
    id: 'future', name: '未来战车', icon: '🛸',
    desc: '纳米涂层 + 等离子推进。加速猛、转向顺、极速高，只是车体偏轻，硬碰硬会吃亏。',
    maxSpeed: 92, accel: 33, brake: 68, friction: 0.85,
    maxSteer: 1.00, steerFalloff: 0.08, steerResponse: 15, yawRateBase: 11.4, lowSpeedSteerPoint: 3,
    hitRadius: 3.0, ramBase: 24, ramPerSpeed: 0.36,
    exhausts: [[-0.62, 0.82, -3.00], [0.62, 0.82, -3.00]],
    exhaustDir: [0, 0, -1],
    flame: [[0.88, 1.00, 1.00], [0.28, 0.88, 1.00], [0.05, 0.35, 1.00]],
    preview: { dist: 12.5, height: 1.5 },
  },
  hover: {
    id: 'hover', name: '悬浮导弹车', icon: '🚀',
    desc: '黑市流出的实验兵器。悬浮滑行、转向顺滑，撞击附带高热切割——尖锐、炫酷、危险。',
    maxSpeed: 78, accel: 27, brake: 62, friction: 1.0,
    maxSteer: 0.96, steerFalloff: 0.07, steerResponse: 12, yawRateBase: 9.6, lowSpeedSteerPoint: 3,
    hitRadius: 3.2, ramBase: 28, ramPerSpeed: 0.40,
    exhausts: [[-0.72, 0.58, -1.70], [0.72, 0.58, -1.70]],
    exhaustDir: [0, 0, -1],
    flame: [[0.94, 0.76, 1.00], [0.72, 0.40, 1.00], [0.32, 0.08, 0.70]],
    preview: { dist: 12, height: 1.6 },
  },
  phantom: {
    id: 'phantom', name: '幻影战车', icon: '👻',
    desc: '半透明的幽影载具。极速最高、转向最灵敏，撞击却很轻——它靠的是“打不到”，不是“撞得疼”。',
    maxSpeed: 100, accel: 36, brake: 60, friction: 0.75,
    maxSteer: 1.15, steerFalloff: 0.06, steerResponse: 17, yawRateBase: 12.6, lowSpeedSteerPoint: 3,
    hitRadius: 2.6, ramBase: 17, ramPerSpeed: 0.36,
    exhausts: [[-0.40, 0.86, -3.50], [0.40, 0.86, -3.50]],
    exhaustDir: [0, 0, -1],
    flame: [[0.92, 0.72, 1.00], [0.62, 0.26, 1.00], [0.26, 0.05, 0.66]],
    preview: { dist: 11, height: 1.2 },
  },
  cyber: {
    id: 'cyber', name: '赛博战车', icon: '⚡',
    desc: '霓虹管线布满全身，尾焰自带电子脉冲。攻守均衡，是最“全能”的一辆改装车。',
    maxSpeed: 84, accel: 29, brake: 78, friction: 1.05,
    maxSteer: 0.92, steerFalloff: 0.11, steerResponse: 13, yawRateBase: 9.4, lowSpeedSteerPoint: 4,
    hitRadius: 3.4, ramBase: 27, ramPerSpeed: 0.38,
    exhausts: [[-0.55, 0.72, -2.42], [0.55, 0.72, -2.42]],
    exhaustDir: [0, 0, -1],
    flame: [[1.00, 1.00, 0.60], [1.00, 0.30, 0.78], [0.62, 0.06, 0.92]],
    preview: { dist: 12.5, height: 1.6 },
  },
  siege: {
    id: 'siege', name: '攻城车', icon: '🏰',
    desc: '带推铲与冲锤的重型工程车。极速最低，但冲撞力全车库第一，一次正面撞击就能清空一条街。',
    maxSpeed: 40, accel: 11, brake: 110, friction: 1.9,
    maxSteer: 0.45, steerFalloff: 0.30, steerResponse: 5, yawRateBase: 3.8, lowSpeedSteerPoint: 11,
    hitRadius: 6.4, ramBase: 52, ramPerSpeed: 0.46,
    exhausts: [[-1.20, 4.00, -3.00], [1.20, 4.00, -3.00]],
    exhaustDir: [0, 1, 0],
    flame: [[1.00, 0.86, 0.48], [1.00, 0.44, 0.08], [0.30, 0.06, 0.02]],
    preview: { dist: 21, height: 2.8 },
  },
  champion: {
    id: 'champion', name: '冠军战车', icon: '🏆',
    desc: '冠军限定涂装的方程式战车。速度、加速、操控、撞击无一短板——它是所有幸存者的最终答案。',
    maxSpeed: 86, accel: 31, brake: 90, friction: 1.0,
    maxSteer: 0.98, steerFalloff: 0.09, steerResponse: 14, yawRateBase: 10.2, lowSpeedSteerPoint: 3,
    hitRadius: 3.6, ramBase: 34, ramPerSpeed: 0.42,
    exhausts: [[-0.34, 1.15, -2.50], [0.34, 1.15, -2.50]],
    exhaustDir: [0, 0, -1],
    flame: [[1.00, 1.00, 0.86], [1.00, 0.78, 0.26], [1.00, 0.45, 0.04]],
    preview: { dist: 13, height: 1.6 },
  },
};

/* ============================================================
   3. 车辆名称 / 描述本地化
   ============================================================ */
export const VEHICLE_I18N = {
  coupe: {
    zh: { name: '轿跑车', desc: '一台被诅咒的 2003 年二手轿跑。均衡、可靠、没有短板——你永远可以相信它。' },
    en: { name: 'Coupe', desc: 'A cursed 2003 second-hand coupe. Balanced, reliable, no weak spots — you can always count on it.' },
  },
  motorcycle: {
    zh: { name: '摩托车', desc: '轻量、敏捷、转得像疯了一样。极速极高但撞击力度偏弱——用灵活换生存。' },
    en: { name: 'Motorcycle', desc: 'Light, agile, turns like a maniac. Huge top speed but weaker ramming — trade toughness for mobility.' },
  },
  truck: {
    zh: { name: '大卡车', desc: '重甲洪流。加速慢、转向笨，但这一撞下去，整条街都得让路。' },
    en: { name: 'Big Rig', desc: 'A rolling fortress. Slow to accelerate and clumsy to steer, but one hit makes the whole street give way.' },
  },
  train: {
    zh: { name: '火车头', desc: '单节蒸汽机车。转向迟钝到令人绝望，但没有任何东西能挡住它——撞谁谁飞。' },
    en: { name: 'Locomotive', desc: 'A single-car steam engine. Hopelessly sluggish steering, but nothing can stop it — anything you hit goes flying.' },
  },
  tank: {
    zh: { name: '坦克', desc: '履带压过一切的重装堡垒。速度慢、转向笨，但冲撞力近乎碾压——正面硬刚从不吃亏。' },
    en: { name: 'Tank', desc: 'A tracked fortress that crushes everything. Slow and clumsy, but its ramming power is overwhelming — never lose a head-on collision.' },
  },
  future: {
    zh: { name: '未来战车', desc: '纳米涂层 + 等离子推进。加速猛、转向顺、极速高，只是车体偏轻，硬碰硬会吃亏。' },
    en: { name: 'Future Car', desc: 'Nano coating plus plasma thrust. Violent acceleration, smooth steering, high top speed — but a light chassis that loses pure slugfests.' },
  },
  hover: {
    zh: { name: '悬浮导弹车', desc: '黑市流出的实验兵器。悬浮滑行、转向顺滑，撞击附带高热切割——尖锐、炫酷、危险。' },
    en: { name: 'Hover Missile Car', desc: 'A black-market experimental weapon. Hovers, glides, turns smoothly, and rams with cutting heat — sharp, flashy, dangerous.' },
  },
  phantom: {
    zh: { name: '幻影战车', desc: '半透明的幽影载具。极速最高、转向最灵敏，撞击却很轻——它靠的是“打不到”，不是“撞得疼”。' },
    en: { name: 'Phantom Car', desc: 'A translucent spectre craft. Highest top speed, sharpest steering, but a light ram — it survives by not being hit, not by hitting hard.' },
  },
  cyber: {
    zh: { name: '赛博战车', desc: '霓虹管线布满全身，尾焰自带电子脉冲。攻守均衡，是最“全能”的一辆改装车。' },
    en: { name: 'Cyber Car', desc: 'Neon tubing over every panel, exhaust spitting digital pulses. Balanced in every stat — the most all-round modified car there is.' },
  },
  siege: {
    zh: { name: '攻城车', desc: '带推铲与冲锤的重型工程车。极速最低，但冲撞力全车库第一，一次正面撞击就能清空一条街。' },
    en: { name: 'Siege Engine', desc: 'A heavy engineering vehicle with a dozer blade and ram hammer. Lowest top speed, but the highest ramming power in the garage — one hit can clear a street.' },
  },
  champion: {
    zh: { name: '冠军战车', desc: '冠军限定涂装的方程式战车。速度、加速、操控、撞击无一短板——它是所有幸存者的最终答案。' },
    en: { name: 'Champion Car', desc: 'A champion-liveried formula car. Speed, acceleration, handling, ramming — no weak stat at all. The final answer for every survivor.' },
  },
};

export function vehName(id) {
  const v = VEHICLE_I18N[id];
  const l = getLang();
  return (v && v[l] && v[l].name) || (v && v.en && v.en.name) || VEHICLES[id].name;
}
export function vehDesc(id) {
  const v = VEHICLE_I18N[id];
  const l = getLang();
  return (v && v[l] && v[l].desc) || (v && v.en && v.en.desc) || VEHICLES[id].desc;
}

/* 当前选定车辆（便捷访问） */
export function V() {
  return VEHICLES[selectedCarId] || VEHICLES.coupe;
}

/* ============================================================
   4. 车辆建模
   ============================================================ */

/* ---------- 🚗 轿跑车 ---------- */
function buildCoupeModel() {
  const g = new THREE.Group();
  const bodyMat = MAT.body();
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x1A4A80, roughness: 0.3, metalness: 0.9, emissive: 0x0A1830, emissiveIntensity: 0.4 });
  const darkMat = MAT.dark();
  const glassMat = MAT.glass();
  const chromeMat = MAT.chrome();
  const tailMat = MAT.tail();
  const headMat = MAT.head();
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.35, 3.9), bodyMat); chassis.position.set(0, 0.55, 0); g.add(chassis);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.18, 1.5), bodyMat); hood.position.set(0, 0.80, 1.15); g.add(hood);
  const noseGeo = new THREE.BufferGeometry();
  const nv = new Float32Array([-0.86,0,0, 0.86,0,0, -0.86,0.36,0, 0.86,0.36,0, -0.55,0.05,0.7, 0.55,0.05,0.7, -0.55,0.30,0.7, 0.55,0.30,0.7]);
  noseGeo.setAttribute('position', new THREE.BufferAttribute(nv, 3));
  noseGeo.setIndex([0,1,2,1,3,2,4,6,5,5,6,7,0,2,4,4,2,6,1,5,3,3,5,7,2,3,6,3,7,6,0,4,1,1,4,5]);
  noseGeo.computeVertexNormals();
  const nose = new THREE.Mesh(noseGeo, bodyMat); nose.position.set(0, 0.62, 1.9); g.add(nose);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.45, 1.6), accentMat); cabin.position.set(0, 1.05, -0.25); g.add(cabin);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.55, 0.06), glassMat); windshield.position.set(0, 1.05, 0.55); windshield.rotation.x = 0.55; g.add(windshield);
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.42, 0.06), glassMat); rearGlass.position.set(0, 1.05, -1.05); rearGlass.rotation.x = -0.6; g.add(rearGlass);
  for (const sx of [-1, 1]) { const sg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 1.15), glassMat); sg.position.set(sx * 0.78, 1.08, -0.25); g.add(sg); }
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.22, 0.9), bodyMat); trunk.position.set(0, 0.88, -1.75); g.add(trunk);
  for (const sx of [-1, 1]) { const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 2.4), darkMat); skirt.position.set(sx * 0.97, 0.38, 0); g.add(skirt); }
  const tireGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.34, 18);
  const rimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.36, 8);
  const tireMat = MAT.tire();
  for (const [wx, wy, wz] of [[-1, 0.46, 1.35], [1, 0.46, 1.35], [-1, 0.46, -1.35], [1, 0.46, -1.35]]) {
    const tire = new THREE.Mesh(tireGeo, tireMat); tire.rotation.z = Math.PI / 2; tire.position.set(wx, wy, wz); g.add(tire);
    const rim = new THREE.Mesh(rimGeo, chromeMat); rim.rotation.z = Math.PI / 2; rim.position.set(wx, wy, wz); g.add(rim);
  }
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.4), accentMat); wing.position.set(0, 1.35, -1.95); wing.rotation.x = -0.15; g.add(wing);
  for (const sx of [-0.6, 0.6]) { const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.15), darkMat); stand.position.set(sx, 1.22, -1.95); g.add(stand); }
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.05, 0.45), darkMat); splitter.position.set(0, 0.36, 2.15); g.add(splitter);
  for (const sx of [-0.62, 0.62]) { const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), headMat); head.position.set(sx, 0.82, 2.28); g.add(head); }
  for (const sx of [-0.68, 0.68]) { const tail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.08), tailMat); tail.position.set(sx, 0.76, -2.18); g.add(tail); }
  for (const sx of [-0.55, 0.55]) { const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 10), chromeMat); exhaust.rotation.x = Math.PI / 2; exhaust.position.set(sx, 0.42, -2.15); g.add(exhaust); }
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x40D8FF, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.8), glowMat); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 🏍️ 摩托车 ---------- */
function buildMotorcycleModel() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xC8202A, roughness: 0.25, metalness: 0.75, emissive: 0x300408, emissiveIntensity: 0.45 });
  const darkMat = MAT.dark();
  const chromeMat = MAT.chrome();
  const tireMat = MAT.tire();
  const headMat = MAT.head();
  const tailMat = MAT.tail();

  const tireGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.22, 20);
  const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.24, 6);

  const fw = new THREE.Mesh(tireGeo, tireMat); fw.rotation.z = Math.PI / 2; fw.position.set(0, 0.44, 1.15); g.add(fw);
  const fr = new THREE.Mesh(rimGeo, chromeMat); fr.rotation.z = Math.PI / 2; fr.position.copy(fw.position); g.add(fr);
  const bw = new THREE.Mesh(tireGeo, tireMat); bw.rotation.z = Math.PI / 2; bw.position.set(0, 0.44, -1.15); g.add(bw);
  const br = new THREE.Mesh(rimGeo, chromeMat); br.rotation.z = Math.PI / 2; br.position.copy(bw.position); g.add(br);

  for (const sx of [-0.17, 0.17]) {
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.15, 8), chromeMat);
    fork.position.set(sx, 0.92, 1.10); fork.rotation.x = -0.20; g.add(fork);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.98, 8), darkMat);
  bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.34, 0.94); g.add(bar);
  for (const sx of [-0.48, 0.48]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.2, 8), darkMat);
    grip.rotation.z = Math.PI / 2; grip.position.set(sx, 1.34, 0.94); g.add(grip);
  }
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.40, 1.05), bodyMat);
  tank.position.set(0, 1.08, 0.14); g.add(tank);
  const tankTop = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.8), bodyMat);
  tankTop.position.set(0, 1.30, 0.14); g.add(tankTop);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.88), darkMat);
  seat.position.set(0, 1.02, -0.72); g.add(seat);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.5), bodyMat);
  tail.position.set(0, 1.10, -1.28); tail.rotation.x = 0.18; g.add(tail);
  const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.06), tailMat);
  tailLight.position.set(0, 1.06, -1.52); g.add(tailLight);
  for (const sx of [-0.15, 0.15]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 1.05), darkMat);
    arm.position.set(sx, 0.48, -0.58); g.add(arm);
  }
  const eng = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.58), chromeMat);
  eng.position.set(0, 0.70, -0.05); g.add(eng);
  for (const sx of [-0.24, 0.24]) {
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 1.15, 10), chromeMat);
    ex.rotation.x = Math.PI / 2; ex.position.set(sx, 0.53, -0.95); g.add(ex);
  }
  const headLight = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 12), headMat);
  headLight.rotation.x = Math.PI / 2; headLight.position.set(0, 1.06, 1.42); g.add(headLight);
  const headRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 14), chromeMat);
  headRing.position.set(0, 1.06, 1.44); g.add(headRing);
  const fender = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.7), bodyMat);
  fender.position.set(0, 0.86, 1.18); fender.rotation.x = -0.05; g.add(fender);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xFF3040, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.2), glowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.04; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 🚚 大卡车 ---------- */
function buildTruckModel() {
  const g = new THREE.Group();
  const cabMat = new THREE.MeshStandardMaterial({ color: 0xD85A18, roughness: 0.35, metalness: 0.65, emissive: 0x3A1004, emissiveIntensity: 0.28 });
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x8A8F98, roughness: 0.55, metalness: 0.55 });
  const darkMat = MAT.dark();
  const chromeMat = MAT.chrome();
  const glassMat = MAT.glass();
  const headMat = MAT.head();
  const tailMat = MAT.tail();
  const tireMat = MAT.tire();

  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 7.6), darkMat);
  frame.position.set(0, 0.72, -0.3); g.add(frame);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.85, 2.1), cabMat);
  cab.position.set(0, 1.92, 2.25); g.add(cab);
  const cabTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 1.7), cabMat);
  cabTop.position.set(0, 2.98, 2.15); g.add(cabTop);
  const ws = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.85, 0.08), glassMat);
  ws.position.set(0, 2.34, 3.32); g.add(ws);
  for (const sx of [-1.06, 1.06]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 1.1), glassMat);
    side.position.set(sx, 2.30, 2.4); g.add(side);
  }
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.25, 1.3), cabMat);
  hood.position.set(0, 1.62, 3.5); g.add(hood);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 0.1), chromeMat);
  grille.position.set(0, 1.55, 4.16); g.add(grille);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.42, 0.4), chromeMat);
  bumper.position.set(0, 0.85, 4.22); g.add(bumper);
  for (const sx of [-0.78, 0.78]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.1), headMat);
    hl.position.set(sx, 1.85, 4.16); g.add(hl);
  }
  for (const sx of [-0.92, 0.92]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.2, 10), chromeMat);
    stack.position.set(sx, 3.1, 1.3); g.add(stack);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.18, 10), darkMat);
    cap.position.set(sx, 4.2, 1.3); g.add(cap);
  }
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.4, 4.9), boxMat);
  box.position.set(0, 2.5, -2.1); g.add(box);
  for (let i = 0; i < 7; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.1, 0.12), darkMat);
    rib.position.set(0, 2.5, -4.35 + i * 0.78); g.add(rib);
  }
  const roofRail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 5.0), darkMat);
  roofRail.position.set(0, 3.76, -2.1); g.add(roofRail);
  const mudFlap = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.7, 0.1), darkMat);
  mudFlap.position.set(0, 1.0, -4.62); g.add(mudFlap);
  for (const sx of [-0.9, 0.9]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.24, 0.09), tailMat);
    tl.position.set(sx, 1.55, -4.62); g.add(tl);
  }

  const tireGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.5, 18);
  const rimGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.52, 8);
  const axlePos = [[3.1], [-1.2], [-2.7]];
  for (const [az] of axlePos) {
    for (const sx of [-1.14, 1.14]) {
      const t = new THREE.Mesh(tireGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(sx, 0.68, az); g.add(t);
      const r = new THREE.Mesh(rimGeo, chromeMat); r.rotation.z = Math.PI / 2; r.position.set(sx, 0.68, az); g.add(r);
    }
  }

  const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFA040, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 8.6), glowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 🚂 火车头 ---------- */
function buildTrainModel() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1E3A5C, roughness: 0.4, metalness: 0.8, emissive: 0x061020, emissiveIntensity: 0.45 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xA81A18, roughness: 0.4, metalness: 0.6 });
  const darkMat = MAT.dark();
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xD8A848, roughness: 0.22, metalness: 1.0 });
  const headMat = MAT.head();
  const tireMat = MAT.tire();

  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 4.8, 22), bodyMat);
  boiler.rotation.x = Math.PI / 2; boiler.position.set(0, 1.5, 0.5); g.add(boiler);
  for (let i = 0; i < 5; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.06, 6, 22), brassMat);
    band.position.set(0, 1.5, -1.5 + i * 1.0); g.add(band);
  }
  const smokeBox = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.7, 22), redMat);
  smokeBox.rotation.x = Math.PI / 2; smokeBox.position.set(0, 1.5, 3.0); g.add(smokeBox);
  const smokeFace = new THREE.Mesh(new THREE.CircleGeometry(1.0, 22), darkMat);
  smokeFace.position.set(0, 1.5, 3.36); g.add(smokeFace);
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 1.6, 16), brassMat);
  stack.position.set(0, 3.05, 2.55); g.add(stack);
  const stackLip = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.42, 0.32, 16), brassMat);
  stackLip.position.set(0, 3.9, 2.55); g.add(stackLip);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), brassMat);
  dome.position.set(0, 2.42, 1.1); g.add(dome);
  const dome2 = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), brassMat);
  dome2.position.set(0, 2.35, 0.1); g.add(dome2);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.8, 1.8), bodyMat);
  cab.position.set(0, 2.35, -1.95); g.add(cab);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.16, 2.0), redMat);
  roof.position.set(0, 3.3, -1.95); g.add(roof);
  const cabWin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.62, 0.08), MAT.glass());
  cabWin.position.set(0, 2.72, -1.03); g.add(cabWin);
  for (const sx of [-1.04, 1.04]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.6, 1.2), MAT.glass());
    sw.position.set(sx, 2.66, -1.95); g.add(sw);
  }
  const tender = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.0, 1.9), redMat);
  tender.position.set(0, 1.7, -3.65); g.add(tender);

  const cowcatcher = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 0.55), darkMat);
  cowcatcher.position.set(0, 0.72, 3.6); cowcatcher.rotation.x = -0.32; g.add(cowcatcher);

  for (const sx of [-0.66, 0.66]) {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 12), headMat);
    hl.rotation.x = Math.PI / 2; hl.position.set(sx, 2.3, 3.36); g.add(hl);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.34, 18);
  const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.36, 8);
  const wheelZ = [2.1, 0.9, -0.3, -1.5, -3.1, -4.0];
  for (const wz of wheelZ) {
    for (const sx of [-0.86, 0.86]) {
      const w = new THREE.Mesh(wheelGeo, tireMat); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.55, wz); g.add(w);
      const r = new THREE.Mesh(rimGeo, brassMat); r.rotation.z = Math.PI / 2; r.position.set(sx, 0.55, wz); g.add(r);
    }
  }
  const sideRod = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 6.4), brassMat);
  sideRod.position.set(0.92, 0.55, -0.9); g.add(sideRod);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 🚀 悬浮导弹车 ---------- */
function buildHoverModel() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x2A1A4A, roughness: 0.2, metalness: 0.95, emissive: 0x4A1080, emissiveIntensity: 0.5 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x1A0F2E, roughness: 0.35, metalness: 0.8 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xB060FF, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const headMat = MAT.head();

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.78, 3.4, 6), hullMat);
  nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.05, 1.7); g.add(nose);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 3.2, 6), hullMat);
  body.rotation.x = Math.PI / 2; body.position.set(0, 1.05, -0.55); g.add(body);
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.78, 1.4, 6), hullMat);
  tailCone.rotation.x = -Math.PI / 2; tailCone.position.set(0, 1.05, -2.85); g.add(tailCone);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 6.6), trimMat);
  spine.position.set(0, 1.62, -0.4); g.add(spine);

  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.2), hullMat);
    wing.position.set(sx * 1.35, 1.02, -1.15);
    wing.rotation.z = sx * 0.18; wing.rotation.y = sx * 0.22;
    g.add(wing);
    const wingTip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 1.0), trimMat);
    wingTip.position.set(sx * 2.5, 1.15, -1.35);
    wingTip.rotation.z = sx * 0.18;
    g.add(wingTip);
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 1.4), trimMat);
    pylon.position.set(sx * 0.95, 0.75, -1.9); g.add(pylon);
  }

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 1.7), MAT.glass());
  canopy.position.set(0, 1.72, 0.55); canopy.rotation.x = -0.1; g.add(canopy);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.14, 8, 36), glowMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.42; g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.08, 8, 30), glowMat);
  ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.24; g.add(ring2);
  for (const sx of [-0.85, 0.85]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.0, 12), trimMat);
    pod.position.set(sx, 0.6, -2.3); g.add(pod);
    const podGlow = new THREE.Mesh(new THREE.CircleGeometry(0.28, 14), glowMat);
    podGlow.position.set(sx, 0.6, -2.82); podGlow.rotation.y = Math.PI; g.add(podGlow);
  }
  for (const sx of [-0.28, 0.28]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.09), headMat);
    light.position.set(sx, 1.0, 3.35); g.add(light);
  }
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 7.0), glowMat.clone());
  glow.material.opacity = 0.22;
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 🛡️ 坦克 ---------- */
function buildTankModel() {
  const g = new THREE.Group();
  const armor = new THREE.MeshStandardMaterial({ color: 0x4E5A3C, roughness: 0.68, metalness: 0.5, emissive: 0x0A1408, emissiveIntensity: 0.3 });
  const armorDark = new THREE.MeshStandardMaterial({ color: 0x2C3524, roughness: 0.78, metalness: 0.55 });
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x15181A, roughness: 0.96, metalness: 0.15 });
  const metal = MAT.chrome();
  const headMat = MAT.head();
  const tailMat = MAT.tail();

  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.0, 5.0), armor);
  hull.position.set(0, 1.25, -0.1); g.add(hull);
  const glacis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 1.5), armorDark);
  glacis.position.set(0, 1.62, 2.35); glacis.rotation.x = -0.42; g.add(glacis);
  const bustle = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 1.0), armorDark);
  bustle.position.set(0, 1.35, -3.0); g.add(bustle);

  for (const sx of [-1.35, 1.35]) {
    const track = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.0, 5.3), trackMat);
    track.position.set(sx, 0.62, -0.1); g.add(track);
    for (let i = 0; i < 5; i++) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.78, 12), armorDark);
      w.rotation.z = Math.PI / 2;
      w.position.set(sx, 0.62, -2.1 + i * 1.05); g.add(w);
    }
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 4.6), armor);
    skirt.position.set(sx + (sx > 0 ? 0.44 : -0.44), 1.05, -0.1); g.add(skirt);
  }

  const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.34, 0.9, 10), armor);
  turret.position.set(0, 2.2, -0.35); g.add(turret);
  const turretTop = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 0.35, 10), armorDark);
  turretTop.position.set(0, 2.8, -0.35); g.add(turretTop);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 3.6, 10), armorDark);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 2.28, 1.85); g.add(barrel);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.42, 10), armor);
  muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, 2.28, 3.6); g.add(muzzle);
  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.4, 10), armorDark);
  cupola.position.set(0.55, 3.05, -0.9); g.add(cupola);

  for (const sx of [-0.85, 0.85]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.1), headMat);
    hl.position.set(sx, 1.78, 3.02); g.add(hl);
  }
  for (const sx of [-1.0, 1.0]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.1), tailMat);
    tl.position.set(sx, 1.35, -3.52); g.add(tl);
  }
  for (const sx of [-0.85, 0.85]) {
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.7, 8), metal);
    ex.rotation.x = Math.PI / 2; ex.position.set(sx, 1.92, -3.62); g.add(ex);
  }

  const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFA040, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6.6), glowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 🛸 未来战车 ---------- */
function buildFutureModel() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xE2EEF6, roughness: 0.12, metalness: 0.9, emissive: 0x0A3050, emissiveIntensity: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x14243A, roughness: 0.35, metalness: 0.85 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x40E8FF, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const headMat = MAT.head();

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.44, 4.2), hullMat);
  base.position.set(0, 0.80, -0.2); g.add(base);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.30, 1.6), hullMat);
  nose.position.set(0, 0.72, 2.35); nose.rotation.x = 0.16; g.add(nose);
  const noseTip = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.7), darkMat);
  noseTip.position.set(0, 0.60, 3.25); g.add(noseTip);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.55), MAT.glass());
  canopy.scale.set(1.0, 0.75, 1.7);
  canopy.position.set(0, 1.02, 0.55); g.add(canopy);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 3.0), darkMat);
  spine.position.set(0, 1.06, -1.0); g.add(spine);

  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1.9), hullMat);
    wing.position.set(sx * 1.55, 0.86, -1.2);
    wing.rotation.z = sx * 0.12; wing.rotation.y = sx * -0.16;
    g.add(wing);
    const wingGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 1.5), glowMat);
    wingGlow.position.set(sx * 2.26, 0.94, -1.34);
    g.add(wingGlow);
  }

  for (const sx of [-0.62, 0.62]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 1.5, 12), darkMat);
    pod.rotation.x = Math.PI / 2; pod.position.set(sx, 0.82, -2.2); g.add(pod);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 8, 20), glowMat);
    ring.position.set(sx, 0.82, -2.96); g.add(ring);
  }

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.09, 8, 36), glowMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.34; g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.05, 8, 28), glowMat);
  ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.18; g.add(ring2);

  for (const sx of [-0.42, 0.42]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.10, 0.09), headMat);
    hl.position.set(sx, 0.86, 3.12); g.add(hl);
  }
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 7.0), glowMat.clone());
  glow.material.opacity = 0.2;
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 👻 幻影战车 ---------- */
function buildPhantomModel() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x2A1A45, roughness: 0.22, metalness: 0.8, emissive: 0x2A0A50, emissiveIntensity: 0.7, transparent: true, opacity: 0.92 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x120A24, roughness: 0.4, metalness: 0.75 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xA060FF, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const headMat = MAT.head();

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.62, 3.2, 4), hullMat);
  nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 4;
  nose.scale.set(1.35, 1, 1);
  nose.position.set(0, 0.82, 1.45); g.add(nose);

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.46, 2.4), hullMat);
  body.position.set(0, 0.82, -0.9); g.add(body);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 4), hullMat);
  tail.rotation.x = -Math.PI / 2; tail.rotation.y = Math.PI / 4;
  tail.scale.set(1.2, 1, 1);
  tail.position.set(0, 0.82, -2.8); g.add(tail);

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.34, 1.5), MAT.glass());
  canopy.position.set(0, 1.14, -0.15); canopy.rotation.x = -0.08; g.add(canopy);

  for (const sx of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.9), hullMat);
    fin.position.set(sx * 1.15, 0.9, -1.7);
    fin.rotation.z = sx * 0.24; fin.rotation.y = sx * 0.4;
    g.add(fin);
    const finGlow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 1.0), glowMat);
    finGlow.position.set(sx * 1.98, 1.06, -1.95);
    finGlow.rotation.z = sx * 0.24; finGlow.rotation.y = sx * 0.4;
    g.add(finGlow);
  }

  for (const sx of [-0.4, 0.4]) {
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), glowMat);
    core.position.set(sx, 0.86, -3.3); g.add(core);
  }

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.07, 8, 36), glowMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.30; g.add(ring);

  for (const sx of [-0.30, 0.30]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.08), headMat);
    hl.position.set(sx, 0.88, 2.9); g.add(hl);
  }

  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 6.4), glowMat.clone());
  glow.material.opacity = 0.24;
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- ⚡ 赛博战车 ---------- */
function buildCyberModel() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x14161F, roughness: 0.24, metalness: 0.92, emissive: 0x180A2A, emissiveIntensity: 0.5 });
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x2A2F44, roughness: 0.35, metalness: 0.85 });
  const neonPink = new THREE.MeshBasicMaterial({ color: 0xFF3AA0, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const neonYellow = new THREE.MeshBasicMaterial({ color: 0xFFE040, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const headMat = MAT.head();
  const tireMat = MAT.tire();

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.34, 4.3), bodyMat);
  chassis.position.set(0, 0.66, -0.1); g.add(chassis);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.34, 1.7), panelMat);
  hood.position.set(0, 1.0, 1.5); hood.rotation.x = 0.12; g.add(hood);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.52, 1.7), bodyMat);
  cabin.position.set(0, 1.18, -0.2); g.add(cabin);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.5, 0.07), MAT.glass());
  windshield.position.set(0, 1.18, 0.72); windshield.rotation.x = 0.62; g.add(windshield);
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.42, 0.07), MAT.glass());
  rearGlass.position.set(0, 1.18, -1.05); rearGlass.rotation.x = -0.7; g.add(rearGlass);

  for (const sx of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 3.6), neonPink);
    strip.position.set(sx * 0.96, 0.72, -0.1); g.add(strip);
    const strip2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.2), neonYellow);
    strip2.position.set(sx * 0.78, 1.44, -0.2); g.add(strip2);
  }
  const frontBar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.09, 0.08), neonPink);
  frontBar.position.set(0, 0.76, 2.16); g.add(frontBar);
  const rearBar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.11, 0.08), neonPink);
  rearBar.position.set(0, 1.0, -2.26); g.add(rearBar);

  const tireGeo = new THREE.CylinderGeometry(0.50, 0.50, 0.36, 18);
  const rimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.38, 10);
  for (const [wx, wz] of [[-1.02, 1.42], [1.02, 1.42], [-1.02, -1.42], [1.02, -1.42]]) {
    const t = new THREE.Mesh(tireGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(wx, 0.50, wz); g.add(t);
    const r = new THREE.Mesh(rimGeo, neonPink); r.rotation.z = Math.PI / 2; r.position.set(wx, 0.50, wz); g.add(r);
  }

  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.44), bodyMat);
  wing.position.set(0, 1.58, -1.95); wing.rotation.x = -0.12; g.add(wing);
  for (const sx of [-0.68, 0.68]) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.14), panelMat);
    stand.position.set(sx, 1.44, -1.95); g.add(stand);
  }

  for (const sx of [-0.55, 0.55]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.09), headMat);
    hl.position.set(sx, 1.02, 2.32); g.add(hl);
  }

  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 6.4), neonPink.clone());
  glow.material.opacity = 0.2;
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 🏰 攻城车 ---------- */
function buildSiegeModel() {
  const g = new THREE.Group();
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x4A4038, roughness: 0.72, metalness: 0.6, emissive: 0x1A0C04, emissiveIntensity: 0.3 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x241E1A, roughness: 0.85, metalness: 0.55 });
  const metalMat = MAT.chrome();
  const tireMat = MAT.tire();
  const headMat = MAT.head();
  const tailMat = MAT.tail();

  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.5, 6.4), armorMat);
  hull.position.set(0, 1.55, -0.4); g.add(hull);
  const topArmor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 4.2), darkMat);
  topArmor.position.set(0, 2.5, -1.0); g.add(topArmor);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.6, 0.4), darkMat);
  blade.position.set(0, 1.0, 3.5); blade.rotation.x = -0.25; g.add(blade);
  for (let i = 0; i < 6; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 4), metalMat);
    tooth.rotation.x = Math.PI / 2;
    tooth.position.set(-1.5 + i * 0.6, 0.5, 3.9); g.add(tooth);
  }
  const ram = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 3.0, 10), darkMat);
  ram.rotation.x = Math.PI / 2; ram.position.set(0, 2.0, 1.5); g.add(ram);
  const ramHead = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), metalMat);
  ramHead.position.set(0, 2.0, 3.05); g.add(ramHead);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 1.4), armorMat);
  cab.position.set(0, 3.15, -2.4); g.add(cab);
  const cabWin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.08), MAT.glass());
  cabWin.position.set(0, 3.28, -1.72); g.add(cabWin);

  const tireGeo = new THREE.CylinderGeometry(0.88, 0.88, 0.62, 20);
  const rimGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.64, 10);
  for (const az of [2.4, 0.2, -2.0]) {
    for (const sx of [-1.6, 1.6]) {
      const t = new THREE.Mesh(tireGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(sx, 0.88, az); g.add(t);
      const r = new THREE.Mesh(rimGeo, metalMat); r.rotation.z = Math.PI / 2; r.position.set(sx, 0.88, az); g.add(r);
    }
  }
  for (const sx of [-1.2, 1.2]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 2.0, 10), metalMat);
    stack.position.set(sx, 3.0, -3.0); g.add(stack);
  }

  for (const sx of [-1.0, 1.0]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.1), headMat);
    hl.position.set(sx, 2.2, 2.78); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.1), tailMat);
    tl.position.set(sx, 1.7, -3.62); g.add(tl);
  }

  const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 9.6), new THREE.MeshBasicMaterial({ color: 0xFFA040, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 🏆 冠军战车 ---------- */
function buildChampionModel() {
  const g = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xE8B53A, roughness: 0.18, metalness: 1.0, emissive: 0x4A3000, emissiveIntensity: 0.4 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xB01A28, roughness: 0.22, metalness: 0.85, emissive: 0x300408, emissiveIntensity: 0.4 });
  const darkMat = MAT.dark();
  const tireMat = MAT.tire();
  const headMat = MAT.head();
  const tailMat = MAT.tail();

  const tub = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 4.4), bodyMat);
  tub.position.set(0, 0.72, 0); g.add(tub);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.9, 6), bodyMat);
  nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.72, 3.0); g.add(nose);
  const frontWing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.7), goldMat);
  frontWing.position.set(0, 0.5, 3.7); g.add(frontWing);
  for (const sx of [-0.95, 0.95]) {
    const ep = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.7), bodyMat);
    ep.position.set(sx, 0.72, 3.7); g.add(ep);
  }
  for (const sx of [-0.82, 0.82]) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.46, 1.9), bodyMat);
    pod.position.set(sx, 0.78, -0.35); g.add(pod);
    const podTop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 1.6), goldMat);
    podTop.position.set(sx, 1.02, -0.35); g.add(podTop);
  }
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.3, 1.3), MAT.glass());
  cockpit.position.set(0, 1.04, 0.75); cockpit.rotation.x = -0.12; g.add(cockpit);
  const intake = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.34, 0.7), darkMat);
  intake.position.set(0, 1.12, -0.35); g.add(intake);
  const rearWing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.09, 0.62), goldMat);
  rearWing.position.set(0, 1.62, -2.1); rearWing.rotation.x = -0.14; g.add(rearWing);
  for (const sx of [-0.62, 0.62]) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.16), bodyMat);
    stand.position.set(sx, 1.32, -2.1); g.add(stand);
  }
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.34, 0.5), darkMat);
  diffuser.position.set(0, 0.6, -2.5); g.add(diffuser);

  const tireGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.42, 20);
  const rimGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.44, 8);
  for (const [wx, wz] of [[-1.12, 1.75], [1.12, 1.75], [-1.16, -1.72], [1.16, -1.72]]) {
    const t = new THREE.Mesh(tireGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(wx, 0.52, wz); g.add(t);
    const r = new THREE.Mesh(rimGeo, goldMat); r.rotation.z = Math.PI / 2; r.position.set(wx, 0.52, wz); g.add(r);
  }
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.08), headMat);
  hl.position.set(0, 0.76, 3.9); g.add(hl);
  for (const sx of [-0.42, 0.42]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.08), tailMat);
    tl.position.set(sx, 0.86, -2.74); g.add(tl);
  }
  for (const sx of [-0.34, 0.34]) {
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 10), goldMat);
    ex.rotation.x = Math.PI / 2; ex.position.set(sx, 1.15, -2.42); g.add(ex);
  }

  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 7.0), new THREE.MeshBasicMaterial({ color: 0xFFC860, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ============================================================
   5. 工厂函数 —— 唯一出口
   ============================================================ */
export function buildVehicleModel(id) {
  switch (id) {
    case 'motorcycle': return buildMotorcycleModel();
    case 'truck':      return buildTruckModel();
    case 'train':      return buildTrainModel();
    case 'hover':      return buildHoverModel();
    case 'tank':       return buildTankModel();
    case 'future':     return buildFutureModel();
    case 'phantom':    return buildPhantomModel();
    case 'cyber':      return buildCyberModel();
    case 'siege':      return buildSiegeModel();
    case 'champion':   return buildChampionModel();
    default:           return buildCoupeModel();
  }
}