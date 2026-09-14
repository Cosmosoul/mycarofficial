/* ============================================================
   entities.js —— 运行时实体
   1. 车辆 mesh 挂载 / 切换
   2. 敌人对象池 + spawnEnemy 工厂 + resetEnemies
   3. 把僵尸 InstancedMesh 与 Boss rig 挂入场景
   ============================================================ */

import * as THREE from 'three';
import {
  scene, state, player, selectedCarId, emit,
} from '@/core.js';
import { sfxBossSpawn } from '@/audio.js';
import {
  ENEMY_DEFS, zombieMeshes, bossRig, resetEnemyVisuals,
} from '@/content/enemies.js';
import { buildVehicleModel } from '@/content/vehicles.js';
import Tuning from '@/config.js';

/* ============================================================
   1. 车辆 mesh
   ============================================================ */
let carMesh = null;

export function getCarMesh() { return carMesh; }

/**
 * 依据当前选定车辆重建车体 mesh。
 * 用于：开局、切车、结算重开。
 */
export function rebuildCarMesh() {
  if (carMesh && carMesh.parent) scene.remove(carMesh);
  carMesh = buildVehicleModel(selectedCarId);
  scene.add(carMesh);
}

/* ============================================================
   2. 敌人对象池
   ============================================================ */
export const enemies = [];

/**
 * 生成一只敌人。
 * - 波次越高，敌人 hp / dmg / speed 微增
 * - 随机分配 AI 角色（vanguard / flank / rear / thrower）
 * - Boss 生成会触发 `boss:spawn` 事件，由 UI / 音频层响应
 */
export function spawnEnemy(type, x, z) {
  const def = ENEMY_DEFS[type];
  if (!def) return;
  if (enemies.length >= Tuning.Wave.onScreenCap) return;

  /* —— 角色 roll —— */
  const roll = Math.random();
  let role = 'vanguard';
  if (roll < Tuning.AI.flankRatio) {
    role = 'flank';
  } else if (roll < Tuning.AI.flankRatio + Tuning.AI.rearRatio) {
    role = 'rear';
  } else if (type === 'ranged') {
    role = 'thrower';
  }

  /* —— 波次成长 —— */
  const hpScale  = Math.pow(1.08, state.wave - 1);
  const dmgScale = Math.pow(1.05, state.wave - 1);
  const spdScale = Math.pow(1.02, state.wave - 1);

  const e = {
    type, role,
    pos: new THREE.Vector3(x, 0, z),
    vel: new THREE.Vector3(0, 0, 0),
    airTime: 0, roll: 0, rollSpeed: 0,

    hp:    def.hp * hpScale,
    maxHp: def.hp * hpScale,
    speed: def.speed * spdScale,
    dmg:   def.dmg * dmgScale,

    radius: def.radius,
    color: def.skin,
    scaleVec: def.scale,
    scaleRadius: def.radius * Math.max(def.scale.x, def.scale.z),

    angle: Math.random() * Math.PI * 2,
    sideSign: Math.random() < 0.5 ? -1 : 1,
    orbitAngle: Math.random() * Math.PI * 2,

    frozen: 0,
    fireCD: def.fireCD ? def.fireCD * Math.random() : 0,
    ramCD: 0,

    isBoss: !!def.isBoss,
    active: true,

    walkPhase: Math.random() * Math.PI * 2,
    attackPhase: 0,
    attackCD: 0,
    groanCD: Math.random() * 5,
  };

  /* —— 每只敌人的颜色变体 —— */
  e.clothColor = new THREE.Color(def.cloth).offsetHSL(
    (Math.random() - 0.5) * 0.035,
    (Math.random() - 0.5) * 0.14,
    (Math.random() - 0.5) * 0.10
  );
  e.skinColor = new THREE.Color(def.skin).offsetHSL(
    (Math.random() - 0.5) * 0.04,
    (Math.random() - 0.5) * 0.16,
    (Math.random() - 0.5) * 0.12
  );
  e.legColor  = e.clothColor.clone().multiplyScalar(0.72);
  e.headColor = e.skinColor.clone().multiplyScalar(1.0);

  enemies.push(e);

  /* —— Boss 生成广播 —— */
  if (e.isBoss) {
    state.boss = e;
    state.bossActive = true;
    bossRig.root.visible = true;
    emit('boss:spawn', e);
  }
}

/**
 * 清空敌人池与视觉状态。
 * 由 gameplay 层在 resetGame 时调用。
 */
export function resetEnemies() {
  enemies.length = 0;
  state.boss = null;
  state.bossActive = false;
  resetEnemyVisuals();
  emit('boss:reset');
}

/** 场上活跃敌人数量（用于 HUD 显示） */
export function getActiveEnemyCount() {
  let n = 0;
  for (const e of enemies) if (e.active) n++;
  return n;
}

/* ============================================================
   3. Boss 视觉控制 —— 供 gameplay 层在 boss 死亡时使用
   ============================================================ */
export function hideBossRig() {
  bossRig.root.visible = false;
}

/* ============================================================
   4. 一次性把敌人视觉资源挂进场景（由 main.js 调用）
      —— 6 件僵尸 InstancedMesh + Boss rig 都需要
   ============================================================ */
export function attachEnemyMeshes() {
  for (const mesh of Object.values(zombieMeshes)) scene.add(mesh);
  scene.add(bossRig.root);   // ★ 修复：Boss 建模之前漏加到场景
}