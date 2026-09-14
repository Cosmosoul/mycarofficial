/* ============================================================
   content/vehicles.js —— 车辆内容目录
   ┌─────────────────────────────────────────────────────────┐
   │ 加一辆新车，只需四步：                                  │
   │  ① 在这里 buildXxxModel() 里加建模函数                  │
   │  ② 在 VEHICLES 里加一条 { ...数值... }                  │
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

  /* ==================== 新增：默认解锁 5 辆 ==================== */
  tractor: {
    id: 'tractor', name: '拖拉机', icon: '🚜',
    desc: '一辆哐当作响的农用拖拉机。极速低、转向钝，但扭矩惊人、皮糙肉厚——撞谁谁飞，自己纹丝不动。',
    maxSpeed: 44, accel: 15, brake: 92, friction: 1.65,
    maxSteer: 0.66, steerFalloff: 0.24, steerResponse: 6.5, yawRateBase: 5.0, lowSpeedSteerPoint: 9,
    hitRadius: 4.4, ramBase: 34, ramPerSpeed: 0.44,
    exhausts: [[0, 2.20, 1.20]],
    exhaustDir: [0, 1, 0],
    flame: [[0.62, 0.62, 0.58], [1.00, 0.55, 0.15], [0.50, 0.14, 0.02]],
    preview: { dist: 15, height: 2.0 },
  },
  tricycle: {
    id: 'tricycle', name: '三轮车', icon: '🛺',
    desc: '拉货用的三轮车，轻得能被风吹跑。转向贼飘、极速一般，但钻起空子来谁都追不上。',
    maxSpeed: 62, accel: 26, brake: 74, friction: 1.05,
    maxSteer: 1.10, steerFalloff: 0.10, steerResponse: 13, yawRateBase: 10.0, lowSpeedSteerPoint: 4,
    hitRadius: 2.8, ramBase: 18, ramPerSpeed: 0.30,
    exhausts: [[0, 0.72, -1.55]],
    exhaustDir: [0, 0, -1],
    flame: [[0.85, 0.85, 0.85], [1.00, 0.70, 0.30], [0.70, 0.30, 0.10]],
    preview: { dist: 9.5, height: 1.1 },
  },
  bullet_train: {
    id: 'bullet_train', name: '子弹头列车', icon: '🚄',
    desc: '高铁车头改装的直线怪兽。极速全场第一，加速缓慢，转向几乎转不动——一旦跑起来，只走直线。',
    maxSpeed: 112, accel: 18, brake: 72, friction: 0.88,
    maxSteer: 0.42, steerFalloff: 0.30, steerResponse: 4.5, yawRateBase: 3.6, lowSpeedSteerPoint: 12,
    hitRadius: 4.6, ramBase: 42, ramPerSpeed: 0.36,
    exhausts: [[-0.90, 0.90, -5.20], [0.90, 0.90, -5.20]],
    exhaustDir: [0, 0, -1],
    flame: [[0.85, 0.95, 1.00], [0.30, 0.60, 1.00], [0.10, 0.20, 0.80]],
    preview: { dist: 20, height: 2.4 },
  },
  bumper_car: {
    id: 'bumper_car', name: '碰碰车', icon: '🎠',
    desc: '游乐场退役的碰碰车，撞人是刻在 DNA 里的本能。加速极快但极速低，橡胶护圈一撞一个飞。',
    maxSpeed: 54, accel: 44, brake: 88, friction: 1.85,
    maxSteer: 1.02, steerFalloff: 0.10, steerResponse: 15, yawRateBase: 11.2, lowSpeedSteerPoint: 3,
    hitRadius: 3.8, ramBase: 42, ramPerSpeed: 0.58,
    exhausts: [[-0.55, 0.55, -1.55], [0.55, 0.55, -1.55]],
    exhaustDir: [0, 0, -1],
    flame: [[1.00, 1.00, 0.70], [1.00, 0.50, 0.80], [1.00, 0.20, 0.40]],
    preview: { dist: 12, height: 1.4 },
  },
  crystal_rainbow: {
    id: 'crystal_rainbow', name: '水晶彩虹车', icon: '💎',
    desc: '整块彩虹水晶雕成的车。周身流光溢彩，尾焰是蓝紫渐变的冷焰混着红色高光——纯粹的行走艺术品。',
    maxSpeed: 78, accel: 27, brake: 80, friction: 1.10,
    maxSteer: 0.90, steerFalloff: 0.13, steerResponse: 11, yawRateBase: 8.8, lowSpeedSteerPoint: 5,
    hitRadius: 3.6, ramBase: 26, ramPerSpeed: 0.36,
    exhausts: [[-0.62, 0.52, -2.30], [0.62, 0.52, -2.30]],
    exhaustDir: [0, 0, -1],
    /* 蓝 → 紫渐变，混红色高光；flameWeights 让蓝紫占大头，红只做高光 */
    flame: [[0.15, 0.42, 1.00], [0.60, 0.20, 1.00], [1.00, 0.25, 0.30]],
    flameWeights: [0.50, 0.40, 0.10],
    preview: { dist: 12, height: 1.4 },
  },

  /* ==================== 新增：无限模式 27/29/30 波解锁 ==================== */
  zombie_car: {
    id: 'zombie_car', name: '僵尸车', icon: '🧟',
    desc: '用残骸与尸块拼成的血肉战车。车身还在搏动，方向盘上扣着一只枯手——撞人时它们会替你嘶吼。',
    maxSpeed: 66, accel: 23, brake: 86, friction: 1.30,
    maxSteer: 0.82, steerFalloff: 0.15, steerResponse: 9, yawRateBase: 7.8, lowSpeedSteerPoint: 6,
    hitRadius: 4.0, ramBase: 32, ramPerSpeed: 0.38,
    exhausts: [[-0.65, 0.85, -2.50], [0.65, 0.85, -2.50]],
    exhaustDir: [0, 0, -1],
    flame: [[0.45, 0.70, 0.35], [0.75, 0.30, 0.20], [0.30, 0.15, 0.05]],
    preview: { dist: 13, height: 1.6 },
  },
  pirate_ship: {
    id: 'pirate_ship', name: '海盗船', icon: '🏴‍☠️',
    desc: '整艘海盗船装上了轮子。船身沉重、惯性巨大，桅杆上的骷髅旗迎风招展——转向全靠信仰。',
    maxSpeed: 58, accel: 17, brake: 86, friction: 1.50,
    maxSteer: 0.58, steerFalloff: 0.26, steerResponse: 6, yawRateBase: 5.2, lowSpeedSteerPoint: 9,
    hitRadius: 5.0, ramBase: 38, ramPerSpeed: 0.42,
    exhausts: [[-1.30, 1.20, -3.40], [1.30, 1.20, -3.40]],
    exhaustDir: [0, 0, -1],
    flame: [[0.85, 0.75, 0.55], [1.00, 0.55, 0.15], [0.45, 0.20, 0.05]],
    preview: { dist: 17, height: 2.6 },
  },
  cat_car: {
    id: 'cat_car', name: '猫猫车', icon: '🐱',
    desc: '一只粉色猫咪伏地飞行的载具。轻巧、灵敏、速度快，彩虹三色尾焰一路撒下——可爱到让人分心。',
    maxSpeed: 84, accel: 31, brake: 78, friction: 0.95,
    maxSteer: 1.02, steerFalloff: 0.09, steerResponse: 14, yawRateBase: 10.8, lowSpeedSteerPoint: 3,
    hitRadius: 3.2, ramBase: 24, ramPerSpeed: 0.36,
    exhausts: [[-0.70, 0.72, -2.10], [0.70, 0.72, -2.10]],
    exhaustDir: [0, 0, -1],
    /* 红 / 黄 / 蓝 三色静态等权 */
    flame: [[1.00, 0.25, 0.30], [1.00, 0.88, 0.20], [0.25, 0.55, 1.00]],
    flameWeights: [1, 1, 1],
    preview: { dist: 11, height: 1.2 },
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
  tractor: {
    zh: { name: '拖拉机', desc: '一辆哐当作响的农用拖拉机。极速低、转向钝，但扭矩惊人、皮糙肉厚——撞谁谁飞，自己纹丝不动。' },
    en: { name: 'Tractor', desc: 'A clattering farm tractor. Low top speed and clumsy steering, but monstrous torque and a thick hide — anything you hit goes flying while you barely budge.' },
  },
  tricycle: {
    zh: { name: '三轮车', desc: '拉货用的三轮车，轻得能被风吹跑。转向贼飘、极速一般，但钻起空子来谁都追不上。' },
    en: { name: 'Tricycle', desc: 'A cargo tricycle light enough to blow away in the wind. Slippery steering and average top speed, but nothing threads a gap quite like it.' },
  },
  bullet_train: {
    zh: { name: '子弹头列车', desc: '高铁车头改装的直线怪兽。极速全场第一，加速缓慢，转向几乎转不动——一旦跑起来，只走直线。' },
    en: { name: 'Bullet Train', desc: 'A high-speed rail nose turned straight-line monster. Highest top speed in the game, sluggish acceleration, and near-zero steering — once it rolls, it goes only straight.' },
  },
  bumper_car: {
    zh: { name: '碰碰车', desc: '游乐场退役的碰碰车，撞人是刻在 DNA 里的本能。加速极快但极速低，橡胶护圈一撞一个飞。' },
    en: { name: 'Bumper Car', desc: 'A retired amusement-park bumper car with ramming hard-wired into its DNA. Violent acceleration, low top speed, and a rubber ring that sends everything flying.' },
  },
  crystal_rainbow: {
    zh: { name: '水晶彩虹车', desc: '整块彩虹水晶雕成的车。周身流光溢彩，尾焰是蓝紫渐变的冷焰混着红色高光——纯粹的行走艺术品。' },
    en: { name: 'Crystal Rainbow', desc: 'A car carved from a single rainbow crystal. Iridescent all over, its exhaust is a blue-purple gradient cold flame laced with red highlights — a walking work of art.' },
  },
  zombie_car: {
    zh: { name: '僵尸车', desc: '用残骸与尸块拼成的血肉战车。车身还在搏动，方向盘上扣着一只枯手——撞人时它们会替你嘶吼。' },
    en: { name: 'Zombie Car', desc: 'A flesh-and-bone war machine welded from wrecks and corpses. The chassis still pulses, a dead hand grips the wheel — and when you ram, they howl for you.' },
  },
  pirate_ship: {
    zh: { name: '海盗船', desc: '整艘海盗船装上了轮子。船身沉重、惯性巨大，桅杆上的骷髅旗迎风招展——转向全靠信仰。' },
    en: { name: 'Pirate Ship', desc: 'An entire pirate ship bolted onto wheels. Heavy hull, huge inertia, a skull flag snapping in the wind — steering is a matter of faith.' },
  },
  cat_car: {
    zh: { name: '猫猫车', desc: '一只粉色猫咪伏地飞行的载具。轻巧、灵敏、速度快，彩虹三色尾焰一路撒下——可爱到让人分心。' },
    en: { name: 'Cat Car', desc: 'A pink kitty gliding belly-down in flight. Light, nimble, fast, and leaving a trail of red-yellow-blue exhaust — adorable enough to be distracting.' },
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
  for (const sx of [-0.17, 0.17]) { const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.15, 8), chromeMat); fork.position.set(sx, 0.92, 1.10); fork.rotation.x = -0.20; g.add(fork); }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.98, 8), darkMat); bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.34, 0.94); g.add(bar);
  for (const sx of [-0.48, 0.48]) { const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.2, 8), darkMat); grip.rotation.z = Math.PI / 2; grip.position.set(sx, 1.34, 0.94); g.add(grip); }
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.40, 1.05), bodyMat); tank.position.set(0, 1.08, 0.14); g.add(tank);
  const tankTop = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.8), bodyMat); tankTop.position.set(0, 1.30, 0.14); g.add(tankTop);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.88), darkMat); seat.position.set(0, 1.02, -0.72); g.add(seat);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.5), bodyMat); tail.position.set(0, 1.10, -1.28); tail.rotation.x = 0.18; g.add(tail);
  const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.06), tailMat); tailLight.position.set(0, 1.06, -1.52); g.add(tailLight);
  for (const sx of [-0.15, 0.15]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 1.05), darkMat); arm.position.set(sx, 0.48, -0.58); g.add(arm); }
  const eng = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.58), chromeMat); eng.position.set(0, 0.70, -0.05); g.add(eng);
  for (const sx of [-0.24, 0.24]) { const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 1.15, 10), chromeMat); ex.rotation.x = Math.PI / 2; ex.position.set(sx, 0.53, -0.95); g.add(ex); }
  const headLight = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 12), headMat); headLight.rotation.x = Math.PI / 2; headLight.position.set(0, 1.06, 1.42); g.add(headLight);
  const headRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 14), chromeMat); headRing.position.set(0, 1.06, 1.44); g.add(headRing);
  const fender = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.7), bodyMat); fender.position.set(0, 0.86, 1.18); fender.rotation.x = -0.05; g.add(fender);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xFF3040, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.2), glowMat); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.04; g.add(glow);
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
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 7.6), darkMat); frame.position.set(0, 0.72, -0.3); g.add(frame);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.85, 2.1), cabMat); cab.position.set(0, 1.92, 2.25); g.add(cab);
  const cabTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 1.7), cabMat); cabTop.position.set(0, 2.98, 2.15); g.add(cabTop);
  const ws = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.85, 0.08), glassMat); ws.position.set(0, 2.34, 3.32); g.add(ws);
  for (const sx of [-1.06, 1.06]) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 1.1), glassMat); side.position.set(sx, 2.30, 2.4); g.add(side); }
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.25, 1.3), cabMat); hood.position.set(0, 1.62, 3.5); g.add(hood);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 0.1), chromeMat); grille.position.set(0, 1.55, 4.16); g.add(grille);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.42, 0.4), chromeMat); bumper.position.set(0, 0.85, 4.22); g.add(bumper);
  for (const sx of [-0.78, 0.78]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.1), headMat); hl.position.set(sx, 1.85, 4.16); g.add(hl); }
  for (const sx of [-0.92, 0.92]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.2, 10), chromeMat); stack.position.set(sx, 3.1, 1.3); g.add(stack);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.18, 10), darkMat); cap.position.set(sx, 4.2, 1.3); g.add(cap);
  }
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.4, 4.9), boxMat); box.position.set(0, 2.5, -2.1); g.add(box);
  for (let i = 0; i < 7; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.1, 0.12), darkMat); rib.position.set(0, 2.5, -4.35 + i * 0.78); g.add(rib); }
  const roofRail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 5.0), darkMat); roofRail.position.set(0, 3.76, -2.1); g.add(roofRail);
  const mudFlap = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.7, 0.1), darkMat); mudFlap.position.set(0, 1.0, -4.62); g.add(mudFlap);
  for (const sx of [-0.9, 0.9]) { const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.24, 0.09), tailMat); tl.position.set(sx, 1.55, -4.62); g.add(tl); }
  const tireGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.5, 18);
  const rimGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.52, 8);
  const axlePos = [3.1, -1.2, -2.7];
  for (const az of axlePos) {
    for (const sx of [-1.14, 1.14]) {
      const t = new THREE.Mesh(tireGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(sx, 0.68, az); g.add(t);
      const r = new THREE.Mesh(rimGeo, chromeMat); r.rotation.z = Math.PI / 2; r.position.set(sx, 0.68, az); g.add(r);
    }
  }
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFA040, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 8.6), glowMat); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);
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
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 4.8, 22), bodyMat); boiler.rotation.x = Math.PI / 2; boiler.position.set(0, 1.5, 0.5); g.add(boiler);
  for (let i = 0; i < 5; i++) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.06, 6, 22), brassMat); band.position.set(0, 1.5, -1.5 + i * 1.0); g.add(band); }
  const smokeBox = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.7, 22), redMat); smokeBox.rotation.x = Math.PI / 2; smokeBox.position.set(0, 1.5, 3.0); g.add(smokeBox);
  const smokeFace = new THREE.Mesh(new THREE.CircleGeometry(1.0, 22), darkMat); smokeFace.position.set(0, 1.5, 3.36); g.add(smokeFace);
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 1.6, 16), brassMat); stack.position.set(0, 3.05, 2.55); g.add(stack);
  const stackLip = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.42, 0.32, 16), brassMat); stackLip.position.set(0, 3.9, 2.55); g.add(stackLip);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), brassMat); dome.position.set(0, 2.42, 1.1); g.add(dome);
  const dome2 = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), brassMat); dome2.position.set(0, 2.35, 0.1); g.add(dome2);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.8, 1.8), bodyMat); cab.position.set(0, 2.35, -1.95); g.add(cab);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.16, 2.0), redMat); roof.position.set(0, 3.3, -1.95); g.add(roof);
  const cabWin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.62, 0.08), MAT.glass()); cabWin.position.set(0, 2.72, -1.03); g.add(cabWin);
  for (const sx of [-1.04, 1.04]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.6, 1.2), MAT.glass()); sw.position.set(sx, 2.66, -1.95); g.add(sw); }
  const tender = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.0, 1.9), redMat); tender.position.set(0, 1.7, -3.65); g.add(tender);
  const cowcatcher = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 0.55), darkMat); cowcatcher.position.set(0, 0.72, 3.6); cowcatcher.rotation.x = -0.32; g.add(cowcatcher);
  for (const sx of [-0.66, 0.66]) { const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 12), headMat); hl.rotation.x = Math.PI / 2; hl.position.set(sx, 2.3, 3.36); g.add(hl); }
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.34, 18);
  const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.36, 8);
  const wheelZ = [2.1, 0.9, -0.3, -1.5, -3.1, -4.0];
  for (const wz of wheelZ) {
    for (const sx of [-0.86, 0.86]) {
      const w = new THREE.Mesh(wheelGeo, tireMat); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.55, wz); g.add(w);
      const r = new THREE.Mesh(rimGeo, brassMat); r.rotation.z = Math.PI / 2; r.position.set(sx, 0.55, wz); g.add(r);
    }
  }
  const sideRod = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 6.4), brassMat); sideRod.position.set(0.92, 0.55, -0.9); g.add(sideRod);
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
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.78, 3.4, 6), hullMat); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.05, 1.7); g.add(nose);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 3.2, 6), hullMat); body.rotation.x = Math.PI / 2; body.position.set(0, 1.05, -0.55); g.add(body);
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.78, 1.4, 6), hullMat); tailCone.rotation.x = -Math.PI / 2; tailCone.position.set(0, 1.05, -2.85); g.add(tailCone);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 6.6), trimMat); spine.position.set(0, 1.62, -0.4); g.add(spine);
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.2), hullMat); wing.position.set(sx * 1.35, 1.02, -1.15); wing.rotation.z = sx * 0.18; wing.rotation.y = sx * 0.22; g.add(wing);
    const wingTip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 1.0), trimMat); wingTip.position.set(sx * 2.5, 1.15, -1.35); wingTip.rotation.z = sx * 0.18; g.add(wingTip);
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 1.4), trimMat); pylon.position.set(sx * 0.95, 0.75, -1.9); g.add(pylon);
  }
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 1.7), MAT.glass()); canopy.position.set(0, 1.72, 0.55); canopy.rotation.x = -0.1; g.add(canopy);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.14, 8, 36), glowMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.42; g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.08, 8, 30), glowMat); ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.24; g.add(ring2);
  for (const sx of [-0.85, 0.85]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.0, 12), trimMat); pod.position.set(sx, 0.6, -2.3); g.add(pod);
    const podGlow = new THREE.Mesh(new THREE.CircleGeometry(0.28, 14), glowMat); podGlow.position.set(sx, 0.6, -2.82); podGlow.rotation.y = Math.PI; g.add(podGlow);
  }
  for (const sx of [-0.28, 0.28]) { const light = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.09), headMat); light.position.set(sx, 1.0, 3.35); g.add(light); }
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 7.0), glowMat.clone()); glow.material.opacity = 0.22; glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);
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
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.0, 5.0), armor); hull.position.set(0, 1.25, -0.1); g.add(hull);
  const glacis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 1.5), armorDark); glacis.position.set(0, 1.62, 2.35); glacis.rotation.x = -0.42; g.add(glacis);
  const bustle = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 1.0), armorDark); bustle.position.set(0, 1.35, -3.0); g.add(bustle);
  for (const sx of [-1.35, 1.35]) {
    const track = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.0, 5.3), trackMat); track.position.set(sx, 0.62, -0.1); g.add(track);
    for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.78, 12), armorDark); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.62, -2.1 + i * 1.05); g.add(w); }
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 4.6), armor); skirt.position.set(sx + (sx > 0 ? 0.44 : -0.44), 1.05, -0.1); g.add(skirt);
  }
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.34, 0.9, 10), armor); turret.position.set(0, 2.2, -0.35); g.add(turret);
  const turretTop = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 0.35, 10), armorDark); turretTop.position.set(0, 2.8, -0.35); g.add(turretTop);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 3.6, 10), armorDark); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 2.28, 1.85); g.add(barrel);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.42, 10), armor); muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, 2.28, 3.6); g.add(muzzle);
  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.4, 10), armorDark); cupola.position.set(0.55, 3.05, -0.9); g.add(cupola);
  for (const sx of [-0.85, 0.85]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.1), headMat); hl.position.set(sx, 1.78, 3.02); g.add(hl); }
  for (const sx of [-1.0, 1.0]) { const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.1), tailMat); tl.position.set(sx, 1.35, -3.52); g.add(tl); }
  for (const sx of [-0.85, 0.85]) { const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.7, 8), metal); ex.rotation.x = Math.PI / 2; ex.position.set(sx, 1.92, -3.62); g.add(ex); }
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFA040, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6.6), glowMat); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);
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
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.44, 4.2), hullMat); base.position.set(0, 0.80, -0.2); g.add(base);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.30, 1.6), hullMat); nose.position.set(0, 0.72, 2.35); nose.rotation.x = 0.16; g.add(nose);
  const noseTip = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.7), darkMat); noseTip.position.set(0, 0.60, 3.25); g.add(noseTip);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.55), MAT.glass()); canopy.scale.set(1.0, 0.75, 1.7); canopy.position.set(0, 1.02, 0.55); g.add(canopy);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 3.0), darkMat); spine.position.set(0, 1.06, -1.0); g.add(spine);
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1.9), hullMat); wing.position.set(sx * 1.55, 0.86, -1.2); wing.rotation.z = sx * 0.12; wing.rotation.y = sx * -0.16; g.add(wing);
    const wingGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 1.5), glowMat); wingGlow.position.set(sx * 2.26, 0.94, -1.34); g.add(wingGlow);
  }
  for (const sx of [-0.62, 0.62]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 1.5, 12), darkMat); pod.rotation.x = Math.PI / 2; pod.position.set(sx, 0.82, -2.2); g.add(pod);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 8, 20), glowMat); ring.position.set(sx, 0.82, -2.96); g.add(ring);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.09, 8, 36), glowMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.34; g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.05, 8, 28), glowMat); ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.18; g.add(ring2);
  for (const sx of [-0.42, 0.42]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.10, 0.09), headMat); hl.position.set(sx, 0.86, 3.12); g.add(hl); }
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 7.0), glowMat.clone()); glow.material.opacity = 0.2; glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);
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
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.62, 3.2, 4), hullMat); nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 4; nose.scale.set(1.35, 1, 1); nose.position.set(0, 0.82, 1.45); g.add(nose);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.46, 2.4), hullMat); body.position.set(0, 0.82, -0.9); g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 4), hullMat); tail.rotation.x = -Math.PI / 2; tail.rotation.y = Math.PI / 4; tail.scale.set(1.2, 1, 1); tail.position.set(0, 0.82, -2.8); g.add(tail);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.34, 1.5), MAT.glass()); canopy.position.set(0, 1.14, -0.15); canopy.rotation.x = -0.08; g.add(canopy);
  for (const sx of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.9), hullMat); fin.position.set(sx * 1.15, 0.9, -1.7); fin.rotation.z = sx * 0.24; fin.rotation.y = sx * 0.4; g.add(fin);
    const finGlow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 1.0), glowMat); finGlow.position.set(sx * 1.98, 1.06, -1.95); finGlow.rotation.z = sx * 0.24; finGlow.rotation.y = sx * 0.4; g.add(finGlow);
  }
  for (const sx of [-0.4, 0.4]) { const core = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), glowMat); core.position.set(sx, 0.86, -3.3); g.add(core); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.07, 8, 36), glowMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.30; g.add(ring);
  for (const sx of [-0.30, 0.30]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.08), headMat); hl.position.set(sx, 0.88, 2.9); g.add(hl); }
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 6.4), glowMat.clone()); glow.material.opacity = 0.24; glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);
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
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.34, 4.3), bodyMat); chassis.position.set(0, 0.66, -0.1); g.add(chassis);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.34, 1.7), panelMat); hood.position.set(0, 1.0, 1.5); hood.rotation.x = 0.12; g.add(hood);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.52, 1.7), bodyMat); cabin.position.set(0, 1.18, -0.2); g.add(cabin);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.5, 0.07), MAT.glass()); windshield.position.set(0, 1.18, 0.72); windshield.rotation.x = 0.62; g.add(windshield);
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.42, 0.07), MAT.glass()); rearGlass.position.set(0, 1.18, -1.05); rearGlass.rotation.x = -0.7; g.add(rearGlass);
  for (const sx of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 3.6), neonPink); strip.position.set(sx * 0.96, 0.72, -0.1); g.add(strip);
    const strip2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.2), neonYellow); strip2.position.set(sx * 0.78, 1.44, -0.2); g.add(strip2);
  }
  const frontBar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.09, 0.08), neonPink); frontBar.position.set(0, 0.76, 2.16); g.add(frontBar);
  const rearBar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.11, 0.08), neonPink); rearBar.position.set(0, 1.0, -2.26); g.add(rearBar);
  const tireGeo = new THREE.CylinderGeometry(0.50, 0.50, 0.36, 18);
  const rimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.38, 10);
  for (const [wx, wz] of [[-1.02, 1.42], [1.02, 1.42], [-1.02, -1.42], [1.02, -1.42]]) {
    const t = new THREE.Mesh(tireGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(wx, 0.50, wz); g.add(t);
    const r = new THREE.Mesh(rimGeo, neonPink); r.rotation.z = Math.PI / 2; r.position.set(wx, 0.50, wz); g.add(r);
  }
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.44), bodyMat); wing.position.set(0, 1.58, -1.95); wing.rotation.x = -0.12; g.add(wing);
  for (const sx of [-0.68, 0.68]) { const stand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.14), panelMat); stand.position.set(sx, 1.44, -1.95); g.add(stand); }
  for (const sx of [-0.55, 0.55]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.09), headMat); hl.position.set(sx, 1.02, 2.32); g.add(hl); }
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 6.4), neonPink.clone()); glow.material.opacity = 0.2; glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);
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
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.5, 6.4), armorMat); hull.position.set(0, 1.55, -0.4); g.add(hull);
  const topArmor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 4.2), darkMat); topArmor.position.set(0, 2.5, -1.0); g.add(topArmor);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.6, 0.4), darkMat); blade.position.set(0, 1.0, 3.5); blade.rotation.x = -0.25; g.add(blade);
  for (let i = 0; i < 6; i++) { const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 4), metalMat); tooth.rotation.x = Math.PI / 2; tooth.position.set(-1.5 + i * 0.6, 0.5, 3.9); g.add(tooth); }
  const ram = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 3.0, 10), darkMat); ram.rotation.x = Math.PI / 2; ram.position.set(0, 2.0, 1.5); g.add(ram);
  const ramHead = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), metalMat); ramHead.position.set(0, 2.0, 3.05); g.add(ramHead);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 1.4), armorMat); cab.position.set(0, 3.15, -2.4); g.add(cab);
  const cabWin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.08), MAT.glass()); cabWin.position.set(0, 3.28, -1.72); g.add(cabWin);
  const tireGeo = new THREE.CylinderGeometry(0.88, 0.88, 0.62, 20);
  const rimGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.64, 10);
  for (const az of [2.4, 0.2, -2.0]) {
    for (const sx of [-1.6, 1.6]) {
      const t = new THREE.Mesh(tireGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(sx, 0.88, az); g.add(t);
      const r = new THREE.Mesh(rimGeo, metalMat); r.rotation.z = Math.PI / 2; r.position.set(sx, 0.88, az); g.add(r);
    }
  }
  for (const sx of [-1.2, 1.2]) { const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 2.0, 10), metalMat); stack.position.set(sx, 3.0, -3.0); g.add(stack); }
  for (const sx of [-1.0, 1.0]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.1), headMat); hl.position.set(sx, 2.2, 2.78); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.1), tailMat); tl.position.set(sx, 1.7, -3.62); g.add(tl);
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
  const tub = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 4.4), bodyMat); tub.position.set(0, 0.72, 0); g.add(tub);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.9, 6), bodyMat); nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.72, 3.0); g.add(nose);
  const frontWing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.7), goldMat); frontWing.position.set(0, 0.5, 3.7); g.add(frontWing);
  for (const sx of [-0.95, 0.95]) { const ep = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.7), bodyMat); ep.position.set(sx, 0.72, 3.7); g.add(ep); }
  for (const sx of [-0.82, 0.82]) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.46, 1.9), bodyMat); pod.position.set(sx, 0.78, -0.35); g.add(pod);
    const podTop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 1.6), goldMat); podTop.position.set(sx, 1.02, -0.35); g.add(podTop);
  }
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.3, 1.3), MAT.glass()); cockpit.position.set(0, 1.04, 0.75); cockpit.rotation.x = -0.12; g.add(cockpit);
  const intake = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.34, 0.7), darkMat); intake.position.set(0, 1.12, -0.35); g.add(intake);
  const rearWing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.09, 0.62), goldMat); rearWing.position.set(0, 1.62, -2.1); rearWing.rotation.x = -0.14; g.add(rearWing);
  for (const sx of [-0.62, 0.62]) { const stand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.16), bodyMat); stand.position.set(sx, 1.32, -2.1); g.add(stand); }
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.34, 0.5), darkMat); diffuser.position.set(0, 0.6, -2.5); g.add(diffuser);
  const tireGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.42, 20);
  const rimGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.44, 8);
  for (const [wx, wz] of [[-1.12, 1.75], [1.12, 1.75], [-1.16, -1.72], [1.16, -1.72]]) {
    const t = new THREE.Mesh(tireGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(wx, 0.52, wz); g.add(t);
    const r = new THREE.Mesh(rimGeo, goldMat); r.rotation.z = Math.PI / 2; r.position.set(wx, 0.52, wz); g.add(r);
  }
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.08), headMat); hl.position.set(0, 0.76, 3.9); g.add(hl);
  for (const sx of [-0.42, 0.42]) { const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.08), tailMat); tl.position.set(sx, 0.86, -2.74); g.add(tl); }
  for (const sx of [-0.34, 0.34]) { const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 10), goldMat); ex.rotation.x = Math.PI / 2; ex.position.set(sx, 1.15, -2.42); g.add(ex); }
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 7.0), new THREE.MeshBasicMaterial({ color: 0xFFC860, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ============================================================
   4b. 新增 8 辆车的建模
   ============================================================ */

/* ---------- 🚜 拖拉机 ---------- */
function buildTractorModel() {
  const g = new THREE.Group();
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x2E7A2A, roughness: 0.55, metalness: 0.45, emissive: 0x0A2008, emissiveIntensity: 0.30 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xE8C840, roughness: 0.4, metalness: 0.65 });
  const darkMat = MAT.dark();
  const chromeMat = MAT.chrome();
  const tireMat = MAT.tire();
  const headMat = MAT.head();
  const tailMat = MAT.tail();

  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 3.8), darkMat);
  frame.position.set(0, 0.85, 0); g.add(frame);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.85, 2.0), greenMat);
  hood.position.set(0, 1.45, 0.85); g.add(hood);
  const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.10, 1.8), yellowMat);
  hoodTop.position.set(0, 1.92, 0.85); g.add(hoodTop);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.55, 0.1), darkMat);
  grille.position.set(0, 1.35, 1.90); g.add(grille);
  for (const sx of [-0.42, 0.42]) {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 12), headMat);
    hl.rotation.x = Math.PI / 2; hl.position.set(sx, 1.72, 1.90); g.add(hl);
  }

  /* 驾驶座（敞开式） */
  const seatBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.9), darkMat);
  seatBase.position.set(0, 1.20, -0.55); g.add(seatBase);
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.85, 0.18), darkMat);
  seatBack.position.set(0, 1.75, -0.95); g.add(seatBack);
  const fenderL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 1.4), greenMat);
  fenderL.position.set(-0.75, 1.55, -0.35); g.add(fenderL);
  const fenderR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 1.4), greenMat);
  fenderR.position.set(0.75, 1.55, -0.35); g.add(fenderR);

  /* 方向盘 */
  const wheelCol = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), darkMat);
  wheelCol.rotation.x = 0.55; wheelCol.position.set(0, 1.72, 0.0); g.add(wheelCol);
  const steerWheel = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 6, 18), darkMat);
  steerWheel.position.set(0, 2.02, -0.05); steerWheel.rotation.x = Math.PI / 2 - 0.55; g.add(steerWheel);

  /* 排气管（车头立着） */
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 1.4, 10), chromeMat);
  stack.position.set(0.55, 2.15, 1.55); g.add(stack);
  const stackCap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 10), darkMat);
  stackCap.position.set(0.55, 2.85, 1.55); g.add(stackCap);

  /* 车轮：后大前小 */
  const rearTireGeo = new THREE.CylinderGeometry(0.92, 0.92, 0.44, 22);
  const rearRimGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.46, 10);
  const frontTireGeo = new THREE.CylinderGeometry(0.50, 0.50, 0.30, 18);
  const frontRimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.32, 8);
  for (const sx of [-0.95, 0.95]) {
    const t = new THREE.Mesh(rearTireGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(sx, 0.92, -0.75); g.add(t);
    const r = new THREE.Mesh(rearRimGeo, chromeMat); r.rotation.z = Math.PI / 2; r.position.set(sx, 0.92, -0.75); g.add(r);
    const t2 = new THREE.Mesh(frontTireGeo, tireMat); t2.rotation.z = Math.PI / 2; t2.position.set(sx * 0.75, 0.50, 1.60); g.add(t2);
    const r2 = new THREE.Mesh(frontRimGeo, chromeMat); r2.rotation.z = Math.PI / 2; r2.position.set(sx * 0.75, 0.50, 1.60); g.add(r2);
  }

  /* 尾灯 */
  for (const sx of [-0.55, 0.55]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.08), tailMat);
    tl.position.set(sx, 1.20, -1.95); g.add(tl);
  }

  const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFD060, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 5.6), glowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 🛺 三轮车 ---------- */
function buildTricycleModel() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3E6FC8, roughness: 0.35, metalness: 0.55, emissive: 0x0A1A38, emissiveIntensity: 0.3 });
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x8A5A2A, roughness: 0.85, metalness: 0.15 });
  const darkMat = MAT.dark();
  const chromeMat = MAT.chrome();
  const tireMat = MAT.tire();
  const headMat = MAT.head();
  const tailMat = MAT.tail();

  /* 前轮（单轮） */
  const frontTire = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.22, 18), tireMat);
  frontTire.rotation.z = Math.PI / 2; frontTire.position.set(0, 0.44, 1.25); g.add(frontTire);
  const frontRim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.24, 8), chromeMat);
  frontRim.rotation.z = Math.PI / 2; frontRim.position.copy(frontTire.position); g.add(frontRim);

  /* 后轮（双轮） */
  const rearTireGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.26, 18);
  const rearRimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.28, 8);
  for (const sx of [-0.78, 0.78]) {
    const t = new THREE.Mesh(rearTireGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(sx, 0.46, -1.05); g.add(t);
    const r = new THREE.Mesh(rearRimGeo, chromeMat); r.rotation.z = Math.PI / 2; r.position.set(sx, 0.46, -1.05); g.add(r);
  }

  /* 前叉 + 车把 */
  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.05, 8), chromeMat);
  fork.position.set(0, 0.95, 1.25); fork.rotation.x = -0.18; g.add(fork);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.95, 8), darkMat);
  bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.48, 1.05); g.add(bar);
  for (const sx of [-0.44, 0.44]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.18, 8), darkMat);
    grip.rotation.z = Math.PI / 2; grip.position.set(sx, 1.48, 1.05); g.add(grip);
  }

  /* 前脸 + 挡风 */
  const front = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.7), bodyMat);
  front.position.set(0, 1.05, 1.05); g.add(front);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.05), MAT.glass());
  shield.position.set(0, 1.55, 0.82); shield.rotation.x = 0.22; g.add(shield);

  /* 车架 */
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 2.4), darkMat);
  spine.position.set(0, 0.72, 0.0); g.add(spine);

  /* 驾驶座 */
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 0.7), darkMat);
  seat.position.set(0, 1.05, 0.0); g.add(seat);
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.62, 0.16), darkMat);
  seatBack.position.set(0, 1.4, -0.35); g.add(seatBack);

  /* 后货斗 */
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.55, 1.6), bedMat);
  bed.position.set(0, 1.05, -1.55); g.add(bed);
  const bedRailF = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.10, 0.10), darkMat);
  bedRailF.position.set(0, 1.36, -0.75); g.add(bedRailF);
  const bedRailB = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.10, 0.10), darkMat);
  bedRailB.position.set(0, 1.36, -2.35); g.add(bedRailB);
  for (const sx of [-0.78, 0.78]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 1.6), darkMat);
    rail.position.set(sx, 1.36, -1.55); g.add(rail);
  }

  /* 前灯 */
  const headLight = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.10, 12), headMat);
  headLight.rotation.x = Math.PI / 2; headLight.position.set(0, 1.05, 1.40); g.add(headLight);

  /* 尾灯 */
  for (const sx of [-0.62, 0.62]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.08), tailMat);
    tl.position.set(sx, 1.10, -2.40); g.add(tl);
  }

  const glowMat = new THREE.MeshBasicMaterial({ color: 0x80C0FF, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 5.0), glowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 🚄 子弹头列车 ---------- */
function buildBulletTrainModel() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xEEF2F6, roughness: 0.20, metalness: 0.55, emissive: 0x1A3050, emissiveIntensity: 0.25 });
  const blueStripe = new THREE.MeshStandardMaterial({ color: 0x1050B0, roughness: 0.28, metalness: 0.72, emissive: 0x0A2050, emissiveIntensity: 0.45 });
  const darkMat = MAT.dark();
  const chromeMat = MAT.chrome();
  const tireMat = MAT.tire();
  const headMat = MAT.head();
  const tailMat = MAT.tail();
  const glassMat = MAT.glass();

  /* 主车身：细长圆柱（沿 Z 轴） */
  const main = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 6.0, 22), hullMat);
  main.rotation.x = Math.PI / 2; main.position.set(0, 1.05, -0.6); g.add(main);

  /* 子弹头（前部锥） */
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.85, 3.0, 22), hullMat);
  nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.05, 3.9); g.add(nose);

  /* 尾部锥 */
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.9, 22), hullMat);
  tailCone.rotation.x = -Math.PI / 2; tailCone.position.set(0, 1.05, -4.05); g.add(tailCone);

  /* 蓝色腰线 */
  for (const sx of [-0.86, 0.86]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 5.8), blueStripe);
    stripe.position.set(sx, 0.62, -0.6); g.add(stripe);
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 2.8), blueStripe);
    stripe2.position.set(sx * 0.85, 0.62, 3.2); g.add(stripe2);
  }

  /* 驾驶舱玻璃（车头） */
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.55, 0.08), glassMat);
  canopy.position.set(0, 1.55, 1.85); canopy.rotation.x = 0.35; g.add(canopy);

  /* 侧窗 */
  for (const sx of [-0.87, 0.87]) {
    for (let i = 0; i < 5; i++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.55), glassMat);
      win.position.set(sx, 1.42, 1.0 - i * 0.95); g.add(win);
    }
  }

  /* 车底结构 */
  const underbelly = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.28, 6.4), darkMat);
  underbelly.position.set(0, 0.30, -0.8); g.add(underbelly);

  /* 车灯（前） */
  for (const sx of [-0.40, 0.40]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.10, 0.08), headMat);
    hl.position.set(sx, 1.05, 5.30); g.add(hl);
  }

  /* 尾灯 */
  for (const sx of [-0.60, 0.60]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.08), tailMat);
    tl.position.set(sx, 1.05, -4.55); g.add(tl);
  }

  /* 车轮：4 组，圆盘式小轮 */
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.30, 16);
  const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.32, 8);
  for (const az of [2.0, 0.2, -1.8, -3.4]) {
    for (const sx of [-0.92, 0.92]) {
      const t = new THREE.Mesh(wheelGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(sx, 0.42, az); g.add(t);
      const r = new THREE.Mesh(rimGeo, chromeMat); r.rotation.z = Math.PI / 2; r.position.set(sx, 0.42, az); g.add(r);
    }
  }

  /* 车顶天线 */
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), chromeMat);
  antenna.position.set(0, 1.85, -2.0); g.add(antenna);
  const antBall = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), blueStripe);
  antBall.position.set(0, 2.18, -2.0); g.add(antBall);

  const glowMat = new THREE.MeshBasicMaterial({ color: 0x60B8FF, transparent: true, opacity: 0.30, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 11.5), glowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 🎠 碰碰车 ---------- */
function buildBumperCarModel() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xF0C018, roughness: 0.35, metalness: 0.45, emissive: 0x3A2800, emissiveIntensity: 0.35 });
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x18181C, roughness: 0.95, metalness: 0.10 });
  const bumperEdgeMat = new THREE.MeshStandardMaterial({ color: 0xE02020, roughness: 0.75, metalness: 0.20, emissive: 0x400000, emissiveIntensity: 0.35 });
  const darkMat = MAT.dark();
  const chromeMat = MAT.chrome();
  const tireMat = MAT.tire();
  const headMat = MAT.head();
  const tailMat = MAT.tail();

  /* 车身：椭圆盒 */
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 2.6), bodyMat);
  body.position.set(0, 0.62, -0.10); g.add(body);

  /* 前鼻尖 */
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), bodyMat);
  nose.scale.set(1.0, 0.55, 1.2); nose.position.set(0, 0.62, 1.15); g.add(nose);

  /* 橡胶缓冲圈：用 12 个盒子拼出一个环绕的圈 */
  const segments = 14;
  const R = 1.45;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = Math.sin(a) * R;
    const z = Math.cos(a) * R * 1.05 - 0.10;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.42, 0.18), bumperMat);
    seg.position.set(x, 0.55, z); seg.rotation.y = -a; g.add(seg);
    /* 红边 */
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.22), bumperEdgeMat);
    edge.position.set(x, 0.78, z); edge.rotation.y = -a; g.add(edge);
  }
  /* 缓冲圈底环 */
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.30, 8, 24), bumperMat);
  ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.42, -0.10); ring.scale.set(1.0, 1.05, 1.0); g.add(ring);

  /* 驾驶舱 */
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.65, 1.1), bodyMat);
  cabin.position.set(0, 1.20, -0.25); g.add(cabin);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.5, 0.06), MAT.glass());
  canopy.position.set(0, 1.30, 0.28); canopy.rotation.x = 0.45; g.add(canopy);

  /* 座椅 */
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.65), darkMat);
  seat.position.set(0, 1.05, -0.30); g.add(seat);
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.14), darkMat);
  seatBack.position.set(0, 1.35, -0.65); g.add(seatBack);

  /* 方向盘 */
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 8), darkMat);
  col.rotation.x = 0.45; col.position.set(0, 1.32, 0.05); g.add(col);
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 16), darkMat);
  sw.position.set(0, 1.53, 0.15); sw.rotation.x = Math.PI / 2 - 0.45; g.add(sw);

  /* 天线（碰碰车的招牌） */
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 6), chromeMat);
  pole.position.set(-0.35, 1.95, -0.85); pole.rotation.x = -0.10; g.add(pole);
  const tipCap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), bumperEdgeMat);
  tipCap.position.set(-0.38, 2.90, -0.94); g.add(tipCap);

  /* 车灯 */
  for (const sx of [-0.55, 0.55]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), headMat);
    hl.position.set(sx, 0.82, 1.28); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.08), tailMat);
    tl.position.set(sx, 0.82, -1.45); g.add(tl);
  }

  /* 小车轮 */
  const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 14);
  const rimGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.24, 6);
  for (const [wx, wz] of [[-0.95, 0.85], [0.95, 0.85], [-0.95, -1.05], [0.95, -1.05]]) {
    const t = new THREE.Mesh(wheelGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(wx, 0.28, wz); g.add(t);
    const r = new THREE.Mesh(rimGeo, chromeMat); r.rotation.z = Math.PI / 2; r.position.set(wx, 0.28, wz); g.add(r);
  }

  const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFD040, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 5.0), glowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 💎 水晶彩虹车 ---------- */
function buildCrystalRainbowModel() {
  const g = new THREE.Group();
  /* 彩虹多面体材质：用高透明度 + 强自发光模拟水晶 */
  const crystalRed    = new THREE.MeshStandardMaterial({ color: 0xFF3A5A, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.85, emissive: 0xC01030, emissiveIntensity: 0.55 });
  const crystalOrange = new THREE.MeshStandardMaterial({ color: 0xFF9A30, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.85, emissive: 0xC05010, emissiveIntensity: 0.55 });
  const crystalYellow = new THREE.MeshStandardMaterial({ color: 0xFFE040, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.85, emissive: 0xC0A010, emissiveIntensity: 0.55 });
  const crystalGreen  = new THREE.MeshStandardMaterial({ color: 0x40E070, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.85, emissive: 0x108030, emissiveIntensity: 0.55 });
  const crystalBlue   = new THREE.MeshStandardMaterial({ color: 0x4080FF, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.85, emissive: 0x1040C0, emissiveIntensity: 0.55 });
  const crystalPurple = new THREE.MeshStandardMaterial({ color: 0xA060FF, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.85, emissive: 0x5010C0, emissiveIntensity: 0.55 });
  const crystalPink   = new THREE.MeshStandardMaterial({ color: 0xFF60C0, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.85, emissive: 0xC02080, emissiveIntensity: 0.55 });
  const crystalPalette = [crystalRed, crystalOrange, crystalYellow, crystalGreen, crystalBlue, crystalPurple, crystalPink];

  const darkMat = MAT.dark();
  const chromeMat = MAT.chrome();
  const tireMat = MAT.tire();
  const headMat = MAT.head();
  const tailMat = MAT.tail();

  /* 底盘（暗色） */
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.30, 3.9), darkMat);
  chassis.position.set(0, 0.52, 0); g.add(chassis);

  /* 车身主体：多面体，分 6 段彩虹 */
  const bodySegments = 7;
  const segLen = 3.6 / bodySegments;
  for (let i = 0; i < bodySegments; i++) {
    const mat = crystalPalette[i % crystalPalette.length];
    const seg = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, segLen * 0.95), mat);
    seg.position.set(0, 0.90, -1.8 + (i + 0.5) * segLen); g.add(seg);
  }

  /* 车头：水晶尖端 */
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.4, 6), crystalBlue);
  nose.rotation.x = Math.PI / 2; nose.rotation.z = Math.PI / 6;
  nose.scale.set(1.0, 1, 1);
  nose.position.set(0, 0.95, 2.55); g.add(nose);

  /* 车尾：水晶尖端 */
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.80, 1.1, 6), crystalPurple);
  tail.rotation.x = -Math.PI / 2; tail.rotation.z = Math.PI / 6;
  tail.position.set(0, 0.95, -2.40); g.add(tail);

  /* 顶部水晶驾驶舱 */
  const cabin = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), crystalPink);
  cabin.scale.set(1.0, 0.75, 1.55);
  cabin.position.set(0, 1.42, -0.20); g.add(cabin);

  /* 侧翼水晶碎片 */
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.28 - i * 0.05, 0), crystalPalette[(i + 2) % 7]);
      shard.position.set(sx * 1.05, 0.95, 0.9 - i * 0.9);
      shard.rotation.y = sx * 0.4; g.add(shard);
    }
  }

  /* 环绕发光水晶环 */
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xC060FF, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.07, 8, 36), ringMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.42; g.add(ring);

  /* 车轮 */
  const tireGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.34, 18);
  const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.36, 8);
  for (const [wx, wz] of [[-1.02, 1.35], [1.02, 1.35], [-1.02, -1.35], [1.02, -1.35]]) {
    const t = new THREE.Mesh(tireGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(wx, 0.48, wz); g.add(t);
    const r = new THREE.Mesh(rimGeo, crystalPink); r.rotation.z = Math.PI / 2; r.position.set(wx, 0.48, wz); g.add(r);
  }

  /* 车灯 */
  for (const sx of [-0.45, 0.45]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.12, 0.08), headMat);
    hl.position.set(sx, 0.92, 3.05); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.08), tailMat);
    tl.position.set(sx, 0.92, -2.85); g.add(tl);
  }

  /* 底部光晕：彩虹 */
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xB050FF, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 7.0), glowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 🧟 僵尸车 ---------- */
function buildZombieCarModel() {
  const g = new THREE.Group();
  /* 僵尸皮肤 / 布料色 —— 与敌人配色一致 */
  const fleshMat = new THREE.MeshStandardMaterial({ color: 0x6F8A5A, roughness: 0.85, metalness: 0.10, emissive: 0x1A2A0A, emissiveIntensity: 0.30 });
  const fleshDarkMat = new THREE.MeshStandardMaterial({ color: 0x4A5A3A, roughness: 0.90, metalness: 0.08, emissive: 0x0A1A08, emissiveIntensity: 0.30 });
  const bloodMat = new THREE.MeshStandardMaterial({ color: 0x701818, roughness: 0.85, metalness: 0.10, emissive: 0x2A0404, emissiveIntensity: 0.40 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x5A4A38, roughness: 0.95, metalness: 0.05 });
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xD8D0B0, roughness: 0.70, metalness: 0.05 });
  const darkMat = MAT.dark();
  const tireMat = MAT.tire();
  const tailMat = MAT.tail();

  /* 车架：血肉躯体 */
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.55, 3.9), fleshDarkMat);
  chassis.position.set(0, 0.72, 0); g.add(chassis);

  /* 车身：肉块拼成的壳 */
  const bodyCount = 8;
  for (let i = 0; i < bodyCount; i++) {
    const s = 0.6 + Math.random() * 0.35;
    const lump = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), i % 3 === 0 ? bloodMat : (i % 3 === 1 ? fleshMat : fleshDarkMat));
    lump.position.set(
      (Math.random() - 0.5) * 1.7,
      0.95 + Math.random() * 0.25,
      -1.7 + (i / (bodyCount - 1)) * 3.4
    );
    lump.scale.set(1.0, 0.7, 1.1);
    g.add(lump);
  }

  /* 车头：僵木头颅 */
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), fleshMat);
  head.scale.set(1.0, 0.85, 1.1);
  head.position.set(0, 1.05, 1.90); g.add(head);
  /* 眼窝 */
  for (const sx of [-0.28, 0.28]) {
    const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), darkMat);
    eyeSocket.position.set(sx, 1.15, 2.40); g.add(eyeSocket);
    const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), new THREE.MeshBasicMaterial({ color: 0x80FF30 }));
    eyeGlow.position.set(sx, 1.15, 2.50); g.add(eyeGlow);
  }
  /* 嘴 */
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.14), darkMat);
  mouth.position.set(0, 0.78, 2.45); g.add(mouth);
  /* 牙齿 */
  for (let i = 0; i < 5; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), boneMat);
    tooth.rotation.x = Math.PI; tooth.position.set(-0.20 + i * 0.10, 0.84, 2.50); g.add(tooth);
  }

  /* 车顶：从车里伸出的僵尸手 */
  for (const sx of [-0.55, 0.55]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 1.0, 8), fleshMat);
    arm.position.set(sx, 1.85, -0.35); arm.rotation.x = -0.25; arm.rotation.z = sx > 0 ? -0.35 : 0.35; g.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), fleshMat);
    hand.position.set(sx * 1.10, 2.28, -0.55); g.add(hand);
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.20, 5), fleshMat);
      finger.position.set(sx * 1.10 + (f - 1.5) * 0.06, 2.42, -0.55);
      finger.rotation.x = -0.5 + f * 0.15;
      g.add(finger);
    }
  }

  /* 车身侧面：破布条 */
  for (const sx of [-1.0, 1.0]) {
    for (let i = 0; i < 4; i++) {
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55 + Math.random() * 0.35, 0.35), clothMat);
      cloth.position.set(sx, 0.68 + Math.random() * 0.15, -1.2 + i * 0.85); g.add(cloth);
    }
  }

  /* 车尾：骷髅 */
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), boneMat);
  skull.scale.set(1.0, 0.9, 1.0); skull.position.set(0, 1.30, -2.25); g.add(skull);
  for (const sx of [-0.15, 0.15]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), darkMat);
    socket.position.set(sx, 1.35, -2.58); g.add(socket);
  }
  /* 交叉骨 */
  for (const sx of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6), boneMat);
    b.position.set(sx * 0.35, 1.20, -2.42); b.rotation.z = sx * 0.7; b.rotation.x = 0.3; g.add(b);
    const cap1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), boneMat);
    cap1.position.set(sx * 0.60, 1.42, -2.42); g.add(cap1);
    const cap2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), boneMat);
    cap2.position.set(sx * 0.10, 0.98, -2.42); g.add(cap2);
  }

  /* 车轮 */
  const tireGeo = new THREE.CylinderGeometry(0.50, 0.50, 0.34, 18);
  const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.36, 8);
  for (const [wx, wz] of [[-1.02, 1.35], [1.02, 1.35], [-1.02, -1.35], [1.02, -1.35]]) {
    const t = new THREE.Mesh(tireGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(wx, 0.50, wz); g.add(t);
    const r = new THREE.Mesh(rimGeo, bloodMat); r.rotation.z = Math.PI / 2; r.position.set(wx, 0.50, wz); g.add(r);
  }

  /* 尾灯 */
  for (const sx of [-0.55, 0.55]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), tailMat);
    tl.position.set(sx, 0.82, -2.05); g.add(tl);
  }

  const glowMat = new THREE.MeshBasicMaterial({ color: 0x80C040, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 6.5), glowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 🏴‍☠️ 海盗船 ---------- */
function buildPirateShipModel() {
  const g = new THREE.Group();
  const woodMat    = new THREE.MeshStandardMaterial({ color: 0x6A3F1E, roughness: 0.88, metalness: 0.10 });
  const woodDarkMat= new THREE.MeshStandardMaterial({ color: 0x3E2410, roughness: 0.92, metalness: 0.08 });
  const sailMat    = new THREE.MeshStandardMaterial({ color: 0xE8E0C8, roughness: 0.90, metalness: 0.05, side: THREE.DoubleSide });
  const flagMat    = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.85, metalness: 0.10, side: THREE.DoubleSide });
  const skullMat   = new THREE.MeshStandardMaterial({ color: 0xE8E0C8, roughness: 0.70, metalness: 0.05 });
  const brassMat   = new THREE.MeshStandardMaterial({ color: 0xB08A38, roughness: 0.30, metalness: 0.95 });
  const darkMat    = MAT.dark();
  const tireMat    = MAT.tire();
  const headMat    = MAT.head();
  const tailMat    = MAT.tail();

  /* 船体（纵向船形）：用锥台 + 盒体拼 */
  const hullMain = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 5.6), woodMat);
  hullMain.position.set(0, 0.95, -0.30); g.add(hullMain);

  /* 船首收窄 */
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.20, 2.2, 4), woodMat);
  bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4;
  bow.scale.set(1.0, 0.9, 1);
  bow.position.set(0, 0.95, 2.55); g.add(bow);

  /* 船尾台阶 */
  const stern = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.35, 1.1), woodDarkMat);
  stern.position.set(0, 1.05, -3.25); g.add(stern);

  /* 甲板 */
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.10, 5.4), woodDarkMat);
  deck.position.set(0, 1.55, -0.30); g.add(deck);

  /* 船体舷侧条纹 */
  for (const sx of [-1.20, 1.20]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 5.4), brassMat);
    stripe.position.set(sx, 1.42, -0.30); g.add(stripe);
  }

  /* 桅杆 */
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 4.2, 10), woodMat);
  mast.position.set(0, 3.6, -0.20); g.add(mast);
  /* 横杆 */
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.0, 8), woodDarkMat);
  yard.rotation.z = Math.PI / 2; yard.position.set(0, 4.6, -0.20); g.add(yard);
  const yard2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 8), woodDarkMat);
  yard2.rotation.z = Math.PI / 2; yard2.position.set(0, 3.5, -0.20); g.add(yard2);

  /* 主帆 */
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.4), sailMat);
  sail.position.set(0, 3.6, -0.18); g.add(sail);
  const sail2 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), sailMat);
  sail2.position.set(0, 2.6, -0.18); g.add(sail2);

  /* 海盗旗（骷髅旗）：挂在桅顶 */
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), woodDarkMat);
  flagPole.rotation.z = Math.PI / 2; flagPole.position.set(0.55, 5.55, -0.20); g.add(flagPole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.66), flagMat);
  flag.position.set(1.05, 5.35, -0.18); g.add(flag);
  /* 旗帜上的白骷髅 */
  const fSkull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), skullMat);
  fSkull.scale.set(1.0, 0.95, 1.0); fSkull.position.set(1.05, 5.42, -0.20); g.add(fSkull);
  /* 交叉骨 */
  for (const sx of [-1, 1]) {
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.30, 4), skullMat);
    bone.position.set(1.05 + sx * 0.08, 5.22, -0.20);
    bone.rotation.z = sx * 0.6; g.add(bone);
  }

  /* 船舷栏 */
  for (const sx of [-1.18, 1.18]) {
    for (let i = 0; i < 6; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.30, 6), woodDarkMat);
      post.position.set(sx, 1.75, -2.85 + i * 1.05); g.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 5.4), woodDarkMat);
    rail.position.set(sx, 1.90, -0.30); g.add(rail);
  }

  /* 船头雕像：骷髅 + 交叉骨（立体） */
  const bowSkull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skullMat);
  bowSkull.scale.set(1.0, 0.95, 1.0);
  bowSkull.position.set(0, 2.05, 2.85); g.add(bowSkull);
  for (const sx of [-0.13, 0.13]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), darkMat);
    socket.position.set(sx, 2.10, 3.04); g.add(socket);
  }

  /* 车灯（船头两侧灯笼） */
  for (const sx of [-0.70, 0.70]) {
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.30, 8), brassMat);
    lantern.position.set(sx, 1.85, 2.35); g.add(lantern);
    const lg = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), headMat);
    lg.position.set(sx, 1.85, 2.35); g.add(lg);
  }

  /* 车尾灯笼（红） */
  for (const sx of [-0.70, 0.70]) {
    const tl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), tailMat);
    tl.position.set(sx, 1.85, -3.75); g.add(tl);
  }

  /* 车轮（藏在船底下） */
  const tireGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.40, 18);
  const rimGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.42, 8);
  for (const az of [1.8, -0.4, -2.4]) {
    for (const sx of [-1.18, 1.18]) {
      const t = new THREE.Mesh(tireGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(sx, 0.62, az); g.add(t);
      const r = new THREE.Mesh(rimGeo, brassMat); r.rotation.z = Math.PI / 2; r.position.set(sx, 0.62, az); g.add(r);
    }
  }

  const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFB050, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 9.0), glowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; g.add(glow);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 🐱 猫猫车 ---------- */
function buildCatCarModel() {
  const g = new THREE.Group();
  const pinkMat   = new THREE.MeshStandardMaterial({ color: 0xFFA0C8, roughness: 0.45, metalness: 0.20, emissive: 0x601830, emissiveIntensity: 0.30 });
  const pinkDark  = new THREE.MeshStandardMaterial({ color: 0xE878A8, roughness: 0.55, metalness: 0.20 });
  const creamMat  = new THREE.MeshStandardMaterial({ color: 0xFFE0EE, roughness: 0.75, metalness: 0.05 });
  const eyeMat    = new THREE.MeshBasicMaterial({ color: 0x101020 });
  const irisMat   = new THREE.MeshBasicMaterial({ color: 0x40C8FF });
  const noseMat   = new THREE.MeshBasicMaterial({ color: 0xFF6080 });
  const darkMat   = MAT.dark();
  const chromeMat = MAT.chrome();
  const tireMat   = MAT.tire();

  /* 主体：猫咪伏地的圆润躯干 */
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 10), pinkMat);
  body.scale.set(1.20, 0.72, 1.65);
  body.position.set(0, 0.75, -0.30); g.add(body);

  /* 胸前（奶油色） */
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8), creamMat);
  chest.scale.set(1.0, 0.65, 1.0);
  chest.position.set(0, 0.72, 0.65); g.add(chest);

  /* 头部 */
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.82, 14, 10), pinkMat);
  head.scale.set(1.05, 0.92, 1.0);
  head.position.set(0, 1.10, 1.35); g.add(head);

  /* 口鼻 */
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 7), creamMat);
  muzzle.scale.set(1.0, 0.7, 0.8);
  muzzle.position.set(0, 0.92, 1.98); g.add(muzzle);

  /* 眼睛 */
  for (const sx of [-0.34, 0.34]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), eyeMat);
    eye.position.set(sx, 1.22, 1.92); g.add(eye);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), irisMat);
    iris.position.set(sx, 1.22, 2.00); g.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), eyeMat);
    pupil.position.set(sx, 1.22, 2.05); g.add(pupil);
  }

  /* 鼻子 */
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.10, 4), noseMat);
  nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.96, 2.10); g.add(nose);

  /* 胡须 */
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.55, 4), creamMat);
      w.rotation.z = Math.PI / 2;
      w.rotation.x = -0.25 + i * 0.25;
      w.rotation.y = sx * 0.2;
      w.position.set(sx * 0.55, 0.94 + (i - 1) * 0.06, 2.00); g.add(w);
    }
  }

  /* 猫耳（两个三角锥） */
  for (const sx of [-0.45, 0.45]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.62, 4), pinkMat);
    ear.rotation.y = Math.PI / 4;
    ear.position.set(sx, 1.92, 1.15); g.add(ear);
    /* 耳内 */
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 4), creamMat);
    inner.rotation.y = Math.PI / 4;
    inner.position.set(sx, 1.86, 1.28); g.add(inner);
  }

  /* 前爪（伏地） */
  for (const sx of [-0.60, 0.60]) {
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 7), pinkMat);
    paw.scale.set(1.0, 0.55, 1.3);
    paw.position.set(sx, 0.32, 1.15); g.add(paw);
    /* 爪垫 */
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), creamMat);
    pad.scale.set(1.0, 0.3, 1.0);
    pad.position.set(sx, 0.42, 1.28); g.add(pad);
  }

  /* 后爪 */
  for (const sx of [-0.72, 0.72]) {
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 7), pinkMat);
    paw.scale.set(1.0, 0.55, 1.3);
    paw.position.set(sx, 0.32, -1.25); g.add(paw);
  }

  /* 尾巴（卷曲的圆柱） */
  const tailSegments = 5;
  let prevX = 0, prevY = 1.10, prevZ = -1.85;
  for (let i = 0; i < tailSegments; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.11 - i * 0.012, 0.10 - i * 0.012, 0.5, 8), pinkMat);
    const angle = i * 0.35;
    const nx = prevX + Math.sin(angle) * 0.30;
    const ny = prevY + Math.cos(angle) * 0.42;
    const nz = prevZ - 0.45;
    seg.position.set(nx, ny, nz);
    seg.rotation.x = 0.5 + i * 0.15;
    g.add(seg);
    /* 尾尖：奶油色小球 */
    if (i === tailSegments - 1) {
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), creamMat);
      tip.position.set(nx, ny + 0.25, nz); g.add(tip);
    }
    prevX = nx; prevY = ny; prevZ = nz;
  }

  /* 车轮：小圆轮，藏在毛茸茸的粉色底下 */
  const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.30, 16);
  const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.32, 8);
  for (const [wx, wz] of [[-0.88, 0.95], [0.88, 0.95], [-0.94, -1.10], [0.94, -1.10]]) {
    const t = new THREE.Mesh(tireGeo, tireMat); t.rotation.z = Math.PI / 2; t.position.set(wx, 0.38, wz); g.add(t);
    const r = new THREE.Mesh(rimGeo, pinkDark); r.rotation.z = Math.PI / 2; r.position.set(wx, 0.38, wz); g.add(r);
  }

  /* 底部光晕 */
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xFF80B8, transparent: true, opacity: 0.30, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 6.0), glowMat);
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
    case 'tractor':    return buildTractorModel();
    case 'tricycle':   return buildTricycleModel();
    case 'bullet_train': return buildBulletTrainModel();
    case 'bumper_car': return buildBumperCarModel();
    case 'crystal_rainbow': return buildCrystalRainbowModel();
    case 'zombie_car': return buildZombieCarModel();
    case 'pirate_ship': return buildPirateShipModel();
    case 'cat_car':    return buildCatCarModel();
    default:           return buildCoupeModel();
  }
}