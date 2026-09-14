/* ============================================================
   config.js —— 所有数值 / 关卡 / 解锁规则 / 进度存档
   修改游戏手感、难度曲线、解锁条件 → 只改这里
   ============================================================ */

import { loadJSON, saveJSON } from '@/platform.js';
import { getLang, T } from '@/i18n.js';

/* ============================================================
   1. Tuning —— 全局可调数值
   ============================================================ */
const Tuning = {
  Dodge:  { dashDistance: 8, dashDuration: 0.15, iframes: 0.3, cooldown: 0.3 },
  Jump:   { height: 1.6, duration: 0.42, airInvuln: 0.42, airStompRange: 7, airStompDamage: 30, cooldown: 0.3 },
  Ram: {
    invuln: 0.18, cooldownPerEnemy: 0.35,
    knockImpulse: 40, knockSpeedBonus: 60, knockUpward: 20,
    bossKnockImpulse: 7, bossKnockUpward: 2.5, bossKnockTime: 0.4,
    hitStopDuration: 0.02, hitStopScale: 0.4, fovKick: 6,
  },
  Points: { initialCap: 100, perKill: 10, perElite: 30, perBoss: 100, capGrowth: 1.35 },
  Wave: {
    baseCount: 30, growthPerWave: 1.20, onScreenCap: 400,
    spawnRate: 120, waveDuration: 50, clearWaveDelay: 0.6, bossEvery: 4,
    spawnRadiusMin: 20, spawnRadiusMax: 50,
  },
  AI: {
    flankRatio: 0.35, rearRatio: 0.20, separationWeight: 1.5,
    prediction: 0.5, flankAngle: 2.2, rearAngle: 0.4, orbitSpeed: 0.5,
  },
  Physics:   { gravity: 60, airDrag: 0.4 },
  Particles: { count: 18, bossCount: 60, speed: 14, gravity: 70, life: 0.85 },
  Terrain:   { treeCount: 80, lampSpacing: 25, destructDestroySpeed: 4, grassCount: 2400 },
  SpeedFx: {
    threshold: 0.70, fullAt: 0.95,
    riseRate: 9.0, fallRate: 10.0, fovBoost: 7.0,
    lineCount: 56, emitRate: 150, emitRateGain: 430, maxFlames: 600,
  },
};

export default Tuning;

/* ============================================================
   2. 关卡数据
   ============================================================ */
export const LEVELS = [
  { name: '新手试炼', waves: 2,  mult: 1.0, elite: false, times: [45, 70, 100] },
  { name: '荒野初探', waves: 3,  mult: 1.0, elite: false, times: [70, 100, 140] },
  { name: '车流涌动', waves: 4,  mult: 1.0, elite: false, times: [95, 135, 180] },
  { name: '尸潮来袭', waves: 5,  mult: 1.0, elite: false, times: [120, 165, 220] },
  { name: '钢铁洪流', waves: 6,  mult: 1.0, elite: false, times: [145, 200, 260] },
  { name: '加重压力', waves: 2,  mult: 1.5, elite: false, times: [55, 85, 120] },
  { name: '层层逼近', waves: 3,  mult: 1.5, elite: false, times: [80, 120, 165] },
  { name: '血肉之墙', waves: 4,  mult: 1.5, elite: false, times: [110, 155, 205] },
  { name: '绝境求生', waves: 5,  mult: 1.5, elite: false, times: [140, 195, 255] },
  { name: '狂潮',     waves: 6,  mult: 1.5, elite: false, times: [170, 235, 300] },
  { name: '精准打击', waves: 2,  mult: 1.5, elite: true,  times: [70, 105, 145] },
  { name: '铁壁铜墙', waves: 3,  mult: 1.5, elite: true,  times: [100, 145, 195] },
  { name: '暗流涌动', waves: 4,  mult: 1.5, elite: true,  times: [135, 190, 250] },
  { name: '地狱之路', waves: 5,  mult: 1.5, elite: true,  times: [170, 230, 300] },
  { name: '钢铁炼狱', waves: 6,  mult: 1.5, elite: true,  times: [210, 280, 360] },
  { name: '无限模式', waves: Infinity, mult: 1.0, elite: false, times: null },
];

const LEVEL_NAMES = {
  zh: ['新手试炼','荒野初探','车流涌动','尸潮来袭','钢铁洪流','加重压力','层层逼近','血肉之墙','绝境求生','狂潮','精准打击','铁壁铜墙','暗流涌动','地狱之路','钢铁炼狱','无限模式'],
  en: ['Novice Trial','Into the Wild','Traffic Surge','Horde Incoming','Steel Tide','Rising Pressure','Closing In','Wall of Flesh','Desperate Survival','Frenzy','Precision Strike','Iron Wall','Undercurrent','Road to Hell','Steel Purgatory','Endless Mode'],
};

export function getLevelName(id) {
  const arr = LEVEL_NAMES[getLang()] || LEVEL_NAMES.en;
  return arr[id - 1] || LEVEL_NAMES.en[id - 1] || '';
}

export function getLevelRewardText(id) {
  const parts = [];
  if (id === 16) {
    parts.push(T('unlockByWave'));
  } else {
    if (id < 15) parts.push(T('unlockNext'));
    else if (id === 15) parts.push(T('unlockEndless'));
    if (id === 5)  parts.push(T('unlockMotorcycle'));
    if (id === 8)  parts.push(T('unlockTruck'));
    if (id === 15) parts.push(T('unlockTrain'));
  }
  return parts.join(getLang() === 'zh' ? '　+　' : '  +  ');
}

/* ============================================================
   3. 进度存档
   ============================================================ */
export let progress = loadJSON('myCarProgress', {});

export function saveProgress() {
  saveJSON('myCarProgress', progress);
}

export function isLevelUnlocked(id) {
  if (id === 1) return true;
  if (id === 16) return true;
  return !!(progress[id] && progress[id].unlocked === true);
}

export function getLevelStars(id) {
  return (progress[id] && progress[id].stars) || 0;
}

export function isLevelCleared(id) {
  if (progress.cleared && progress.cleared[id]) return true;
  if (progress[id] && progress[id].stars > 0) return true;
  if (id < 16 && progress[id + 1] && progress[id + 1].unlocked) return true;
  return false;
}

export function saveLevelResult(id, stars, time) {
  if (!progress[id]) progress[id] = { unlocked: true, stars: 0, bestTime: Infinity };
  progress[id].stars = Math.max(progress[id].stars, stars);
  if (time < progress[id].bestTime) progress[id].bestTime = time;
  if (!progress.cleared) progress.cleared = {};
  progress.cleared[id] = true;
  const nextId = id + 1;
  if (nextId <= 16) {
    if (!progress[nextId]) progress[nextId] = { unlocked: false, stars: 0, bestTime: Infinity };
    progress[nextId].unlocked = true;
  }
  saveProgress();
}

/* ============================================================
   4. 车辆解锁规则
   —— 车辆数值在 content/vehicles.js，这里只负责「是否解锁」
   ============================================================ */
export const CAR_UNLOCK_RULES = {
  coupe:      { textKey: 'carUnlockDefault' },
  motorcycle: { textKey: 'carUnlockMotorcycle', check: () => isLevelCleared(5) },
  truck:      { textKey: 'carUnlockTruck',      check: () => isLevelCleared(8) },
  train:      { textKey: 'carUnlockTrain',      check: () => isLevelCleared(15) },
  tank:       { textKey: 'carUnlockTank',       check: () => (progress.infiniteBest || 0) >= 5 },
  future:     { textKey: 'carUnlockFuture',     check: () => (progress.infiniteBest || 0) >= 10 },
  hover:      { textKey: 'carUnlockHover',      check: () => (progress.infiniteBest || 0) >= 15 },
  phantom:    { textKey: 'carUnlockPhantom',    check: () => (progress.infiniteBest || 0) >= 18 },
  cyber:      { textKey: 'carUnlockCyber',      check: () => (progress.infiniteBest || 0) >= 20 },
  siege:      { textKey: 'carUnlockSiege',      check: () => (progress.infiniteBest || 0) >= 22 },
  champion:   { textKey: 'carUnlockChampion',   check: () => (progress.infiniteBest || 0) >= 25 },
};

export function isVehicleUnlocked(id) {
  if (id === 'coupe') return true;
  const rule = CAR_UNLOCK_RULES[id];
  if (!rule || !rule.check) return false;
  return rule.check();
}

/* 无限模式通关达到新波次后，检查是否有新解锁车辆 */
export function getNewlyUnlockedCars() {
  const out = [];
  if (!progress.cars) progress.cars = {};
  for (const id of Object.keys(CAR_UNLOCK_RULES)) {
    if (id === 'coupe') continue;
    if (isVehicleUnlocked(id) && !progress.cars[id]) {
      progress.cars[id] = true;
      out.push(id);
    }
  }
  if (out.length) saveProgress();
  return out;
}

/* 启动时回填一次（玩家在旧版本已达成条件但未记录） */
(function backfillCarUnlocks() {
  let changed = false;
  if (!progress.cars) progress.cars = {};
  for (const id of Object.keys(CAR_UNLOCK_RULES)) {
    if (id === 'coupe') continue;
    if (isVehicleUnlocked(id) && !progress.cars[id]) {
      progress.cars[id] = true;
      changed = true;
    }
  }
  if (changed) saveProgress();
})();

/* 无限模式记录最佳波次 */
export function recordInfiniteBest(waves) {
  const best = Math.max(progress.infiniteBest || 0, waves);
  if (best !== (progress.infiniteBest || 0)) {
    progress.infiniteBest = best;
    saveProgress();
    return true;
  }
  return false;
}