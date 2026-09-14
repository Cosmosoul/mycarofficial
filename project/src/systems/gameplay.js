/* ============================================================
   systems/gameplay.js —— 玩法系统
   （与上一版相比：setTouchPedals 会把状态同步给 audio.js）
   ============================================================ */

import * as THREE from 'three';
import { state, player, emit, on, camera } from '@/core.js';
import Tuning, {
  LEVELS, progress, recordInfiniteBest, getNewlyUnlockedCars,
} from '@/config.js';
import { getLang, T } from '@/i18n.js';
import { enemyHash, queryOut, sepOut } from './spatial.js';
import {
  enemies, spawnEnemy, resetEnemies, getCarMesh, rebuildCarMesh,
} from '@/entities.js';
import { vehName, V } from '@/content/vehicles.js';
import {
  rig, zombieMeshes, bossRig, bossAura, bossAura2, MAX_ZOMBIES,
} from '@/content/enemies.js';
import { buildTerrain, terrain, checkDestructibles } from '@/world.js';
import { pickRandomMap } from '@/content/maps.js';
import { keys } from '@/platform.js';
import {
  initAudio, startEngineSound,
  setTouchPedals as audioSetTouchPedals,   // ★ 从 audio 拉进触摸状态同步函数
  sfxBasic, sfxAoe, sfxShock, sfxHeal, sfxCrit, sfxExecute, sfxLuck,
  sfxThunder, sfxChain, sfxFreeze, sfxEnergy, sfxHealCard, sfxRam,
  sfxKill, sfxHurt, sfxCardSelect, sfxCardPick, sfxGameOver,
  sfxBossSpawn, sfxDodge, sfxZombieGroan, sfxZombieAttack,
  playTone,
} from '@/audio.js';
import {
  spawnBullet, deactivateBullet,
  spawnRing, spawnBurstParticles, spawnHitSpark, spawnLightning,
  spawnDodgeEffect, spawnEnemyBullet as fxSpawnEnemyBullet,
  getSpeedFxIntensity,
} from '@/fx.js';
import { showUnlockToast } from '@/ui/menus.js';

/* ============================================================
   1. 技能定义与数值表
   ============================================================ */
export const skills = {
  basic:   { lv: 1, cd: 0, max: 15, active: true,  icon: '⚔️' },
  aoe:     { lv: 0, cd: 0, max: 10, active: false, icon: '💥' },
  shock:   { lv: 0, cd: 0, max: 8,  active: false, icon: '🌊' },
  heal:    { lv: 0, cd: 0, max: 8,  active: false, icon: '💚' },
  crit:    { lv: 0, cd: 0, max: 10, active: false, icon: '⚡' },
  execute: { lv: 0, cd: 0, max: 8,  active: false, icon: '💀' },
  luck:    { lv: 0, cd: 0, max: 6,  active: false, icon: '🍀' },
  thunder: { lv: 0, cd: 0, max: 8,  active: false, icon: '⛈' },
  chain:   { lv: 0, cd: 0, max: 8,  active: false, icon: '🔗' },
  freeze:  { lv: 0, cd: 0, max: 6,  active: false, icon: '❄️' },
  energy:  { lv: 0, cd: 0, max: 8,  active: false, icon: '🔋' },
};

const SKILL_TABLES = {
  basic: [
    {d:10,cd:0.6},{d:12,cd:0.6},{d:14,cd:0.6},{d:16,cd:0.6},{d:20,cd:0.6},
    {d:22,cd:0.4},{d:24,cd:0.4},{d:26,cd:0.4},{d:30,cd:0.4},{d:35,cd:0.4},
    {d:38,cd:0.3},{d:42,cd:0.3},{d:48,cd:0.3},{d:54,cd:0.3},{d:60,cd:0.3},
  ],
  aoe: [
    {r:10,n:5,d:5,cd:5},{r:13,n:5,d:6,cd:5},{r:15,n:6,d:7,cd:5},{r:20,n:5,d:8,cd:5},{r:25,n:8,d:10,cd:4},
    {r:30,n:5,d:12,cd:4},{r:40,n:10,d:14,cd:4},{r:35,n:10,d:18,cd:4},{r:40,n:11,d:22,cd:3},{r:40,n:12,d:28,cd:3},
  ],
  thunder: [
    {p:0.10,m:0.8,cd:3.0},{p:0.14,m:1.0,cd:2.8},{p:0.18,m:1.2,cd:2.6},{p:0.22,m:1.4,cd:2.4},
    {p:0.25,m:1.6,cd:2.2},{p:0.28,m:1.8,cd:2.0},{p:0.30,m:2.0,cd:1.8},{p:0.35,m:2.2,cd:1.5},
  ],
};

const ENEMY_LEVEL_MULT = { mob: 1, bomber: 1, ranged: 1, shield: 1, elite: 0.5, boss: 0.15 };

/* ============================================================
   2. 技能数值描述（卡面展示）
   ============================================================ */
export function getSkillValueDesc(key, lv) {
  if (lv <= 0) return T('skillInactive');
  const zh = (getLang() === 'zh');
  switch (key) {
    case 'basic': {
      const t = SKILL_TABLES.basic[Math.min(lv, 15) - 1];
      return zh ? `伤害 ${t.d} · 冷却 ${t.cd}s` : `DMG ${t.d} · CD ${t.cd}s`;
    }
    case 'aoe': {
      const t = SKILL_TABLES.aoe[Math.min(lv, 10) - 1];
      return zh ? `半径 ${t.r}m · ${t.n}目标 · 伤害 ${t.d}` : `Radius ${t.r}m · ${t.n} targets · DMG ${t.d}`;
    }
    case 'shock': {
      const v = [0.20,0.30,0.35,0.50,0.60,0.70,0.85,1.0][lv - 1] || 1.0;
      return zh ? `撞击溅射 ${Math.round(v * 100)}%` : `Ram splash ${Math.round(v * 100)}%`;
    }
    case 'heal': {
      const p = [0.10,0.12,0.15,0.18,0.20,0.22,0.24,0.25][lv - 1] || 0.25;
      const a = [5,6,8,10,12,15,18,20][lv - 1] || 20;
      return zh ? `${Math.round(p * 100)}% 概率回 ${a} HP` : `${Math.round(p * 100)}% chance · heal ${a} HP`;
    }
    case 'crit': {
      const p = [0.05,0.05,0.10,0.10,0.15,0.15,0.15,0.20,0.20,0.25][lv - 1] || 0.25;
      const m = [1.1,1.1,1.2,1.4,1.6,1.7,1.9,2.1,2.3,2.5][lv - 1] || 2.5;
      return zh ? `${Math.round(p * 100)}% 概率 · ${m}× 倍率` : `${Math.round(p * 100)}% chance · ${m}× mult`;
    }
    case 'execute': {
      const p = [0.05,0.07,0.10,0.12,0.15,0.17,0.18,0.20][lv - 1] || 0.20;
      return zh ? `${Math.round(p * 100)}% 秒杀（精英减半）` : `${Math.round(p * 100)}% instant kill (halved vs elites)`;
    }
    case 'luck': {
      const v = [0.03,0.06,0.09,0.12,0.15,0.18][lv - 1] || 0.18;
      return zh ? `所有概率 +${Math.round(v * 100)}%` : `All proc chances +${Math.round(v * 100)}%`;
    }
    case 'thunder': {
      const t = SKILL_TABLES.thunder[Math.min(lv, 8) - 1];
      return zh ? `${Math.round(t.p * 100)}% 概率 · ${t.m}× 伤害 · CD ${t.cd}s` : `${Math.round(t.p * 100)}% chance · ${t.m}× DMG · CD ${t.cd}s`;
    }
    case 'chain': {
      const r = [10,11,12,13,14,16,18,20][lv - 1] || 20;
      return zh ? `溅射半径 ${r}m · 50% 伤害` : `Splash radius ${r}m · 50% DMG`;
    }
    case 'freeze': {
      const v = [0.15,0.20,0.25,0.30,0.35,0.40][lv - 1] || 0.40;
      return zh ? `减速 ${Math.round(v * 100)}% · 持续 2s` : `Slow ${Math.round(v * 100)}% · lasts 2s`;
    }
    case 'energy': {
      const v = [0.20,0.30,0.40,0.50,0.60,0.70,0.80,0.90][lv - 1] || 0.90;
      return zh ? `击杀积分 +${Math.round(v * 100)}%` : `Kill score +${Math.round(v * 100)}%`;
    }
  }
  return '';
}

/* ============================================================
   3. 伤害结算 / 击杀 / 天雷
   ============================================================ */
let lastChainSoundTime = 0;
let lastCritSoundTime = 0;
let lastFreezeSoundTime = 0;

function getCritChance() {
  const c = skills.crit;
  if (!c.active) return 0;
  return [0.05,0.05,0.10,0.10,0.15,0.15,0.15,0.20,0.20,0.25][c.lv - 1] || 0.25;
}
function getCritMult() {
  const c = skills.crit;
  if (!c.active) return 1;
  return [1.1,1.1,1.2,1.4,1.6,1.7,1.9,2.1,2.3,2.5][c.lv - 1] || 2.5;
}
function getLuckBonus() {
  const l = skills.luck;
  if (!l.active) return 0;
  return [0.03,0.06,0.09,0.12,0.15,0.18][l.lv - 1] || 0;
}
function getExecuteChance(e) {
  const ex = skills.execute;
  if (!ex.active) return 0;
  if (e.isBoss) return 0;
  let base = [0.05,0.07,0.10,0.12,0.15,0.17,0.18,0.20][ex.lv - 1] || 0.20;
  if (e.type === 'elite') base *= 0.5;
  return base + getLuckBonus();
}
function getThunderChance() {
  const t = skills.thunder;
  if (!t.active) return 0;
  return (SKILL_TABLES.thunder[t.lv - 1]?.p || 0.35) + getLuckBonus();
}
function getHealChance() {
  const h = skills.heal;
  if (!h.active) return 0;
  return [0.10,0.12,0.15,0.18,0.20,0.22,0.24,0.25][h.lv - 1] || 0.25;
}
function getFreezeSlow() {
  const f = skills.freeze;
  if (!f.active) return 0;
  return [0.15,0.20,0.25,0.30,0.35,0.40][f.lv - 1] || 0.40;
}

export function dealDamageToEnemy(e, dmg, kind, isCrit = false) {
  if (!e.active) return;
  const now = performance.now();
  let final = dmg;

  if (!isCrit && getCritChance() > 0 && Math.random() < getCritChance()) {
    final *= getCritMult();
    isCrit = true;
    if (now - lastCritSoundTime > 80) { sfxCrit(); lastCritSoundTime = now; }
  }

  const exe = getExecuteChance(e);
  if (exe > 0 && Math.random() < exe) {
    final = e.hp + 9999;
    sfxExecute();
  }

  if (e.type === 'shield') {
    const fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const toE = new THREE.Vector3(e.pos.x - player.pos.x, 0, e.pos.z - player.pos.z).normalize();
    if (fwd.dot(toE) < -0.3) final *= 0.3;
  }

  e.hp -= final;
  emit('dmg:number', { pos: e.pos, value: final, isCrit });

  if (kind !== 'chain' && kind !== 'thunder_aoe') {
    if (getHealChance() > 0 && Math.random() < getHealChance()) {
      const amt = [5,6,8,10,12,15,18,20][skills.heal.lv - 1] || 20;
      player.hp = Math.min(player.maxHp, player.hp + amt);
      emit('dmg:number', { pos: player.pos, value: amt, color: '#60E080' });
      sfxHeal();
    }
    if (getFreezeSlow() > 0) {
      if (!e.frozen || e.frozen <= 0) {
        if (now - lastFreezeSoundTime > 100) { sfxFreeze(); lastFreezeSoundTime = now; }
      }
      e.frozen = 2.0;
    }
    if (skills.chain.active && kind !== 'chain') {
      const radius = [10,11,12,13,14,16,18,20][skills.chain.lv - 1] || 20;
      enemyHash.query(e.pos.x, e.pos.z, radius, queryOut);
      let played = false;
      for (const other of queryOut) {
        if (other === e || !other.active) continue;
        const dx = other.pos.x - e.pos.x, dz = other.pos.z - e.pos.z;
        if (dx * dx + dz * dz < radius * radius) {
          if (!played) { sfxChain(); played = true; }
          other.hp -= final * 0.5;
          spawnLightning(e.pos.clone().setY(1.5), other.pos.clone().setY(1.5), 0xFFFFC0, 0.18, 2);
          if (other.hp <= 0) killEnemy(other);
        }
      }
    }
    const tc = getThunderChance();
    if (tc > 0 && skills.thunder.cd <= 0 && Math.random() < tc) triggerThunder();
  }

  if (e.hp <= 0) killEnemy(e);
}

export function killEnemy(e) {
  if (!e.active) return;
  e.active = false;

  let pts = Tuning.Points.perKill;
  if (e.type === 'elite') pts = Tuning.Points.perElite;
  if (e.isBoss) pts = Tuning.Points.perBoss;
  if (skills.energy.active) {
    const b = [0.20,0.30,0.40,0.50,0.60,0.70,0.80,0.90][skills.energy.lv - 1] || 0.90;
    pts = Math.round(pts * (1 + b));
  }
  state.points += pts;
  state.totalPoints += pts;
  state.kills++;

  emit('dmg:number', { pos: e.pos, value: pts, color: '#4FDDC0' });
  sfxKill();

  if (e.isBoss) {
    spawnBurstParticles(e.pos, e.color, Tuning.Particles.bossCount, Tuning.Particles.speed * 1.6);
    spawnBurstParticles(e.pos, 0xFFFFFF, Math.floor(Tuning.Particles.bossCount * 0.5), Tuning.Particles.speed * 1.2);
  } else {
    spawnBurstParticles(e.pos, e.color, Tuning.Particles.count, Tuning.Particles.speed);
  }

  if (e.isBoss) {
    state.boss = null;
    state.bossActive = false;
    bossRig.root.visible = false;
    emit('boss:dead');
    spawnRing(e.pos, 0xFFD040, 34, 0.9);
    state.screenShake = 25;
    emit('screen:flash', 0.4);
  } else {
    spawnRing(e.pos, e.color, e.radius * 4, 0.35);
    spawnHitSpark(e.pos.clone().setY(1), e.color);
  }

  checkPointOverflow();
}

export function triggerThunder() {
  const t = skills.thunder;
  if (!t.active || t.cd > 0) return;
  const tbl = SKILL_TABLES.thunder[t.lv - 1];
  t.cd = tbl.cd;
  const dmg = (SKILL_TABLES.basic[Math.min(skills.basic.lv, 15) - 1]?.d || 10) * tbl.m;

  for (let i = 0; i < 14 + Math.floor(Math.random() * 7); i++) {
    const ex = player.pos.x + (Math.random() - 0.5) * 140;
    const ez = player.pos.z + (Math.random() - 0.5) * 140;
    spawnLightning(
      new THREE.Vector3(ex, 80, ez),
      new THREE.Vector3(ex + (Math.random() - 0.5) * 12, 0, ez + (Math.random() - 0.5) * 12),
      0xE0F0FF, 0.16, 2
    );
  }

  let hitCount = 0;
  for (const e of enemies) {
    if (!e.active) continue;
    const scaled = dmg * (ENEMY_LEVEL_MULT[e.type] || 1);
    e.hp -= scaled;
    hitCount++;
    if (hitCount <= 3) emit('dmg:number', { pos: e.pos, value: scaled, isCrit: true, color: '#E0F0FF' });
    if (e.hp <= 0) killEnemy(e);
  }

  emit('screen:flash', 0.55);
  state.screenShake = 16;
  sfxThunder();
}

/* ============================================================
   4. 卡牌
   ============================================================ */
const CARD_POOL_DEFS = [
  { key: 'basic',   icon: '⚔️', numeral: 'I'    },
  { key: 'aoe',     icon: '💥', numeral: 'II'   },
  { key: 'shock',   icon: '🌊', numeral: 'III'  },
  { key: 'heal',    icon: '💚', numeral: 'IV'   },
  { key: 'crit',    icon: '⚡', numeral: 'V'    },
  { key: 'execute', icon: '💀', numeral: 'VI'   },
  { key: 'luck',    icon: '🍀', numeral: 'VII'  },
  { key: 'thunder', icon: '⛈', numeral: 'VIII' },
  { key: 'chain',   icon: '🔗', numeral: 'IX'   },
  { key: 'freeze',  icon: '❄️', numeral: 'X'    },
  { key: 'energy',  icon: '🔋', numeral: 'XI'   },
  { key: 'healcard',icon: '💖', numeral: 'XII',  isHeal: true },
];

function buildCardPool() {
  const pool = [];
  for (const def of CARD_POOL_DEFS) {
    if (def.isHeal) continue;
    const s = skills[def.key];
    if (!s) continue;
    if (!s.active) pool.push({ ...def, currentLv: 0, nextLv: 1, type: 'skill' });
    else if (s.lv < s.max) pool.push({ ...def, currentLv: s.lv, nextLv: s.lv + 1, type: 'skill' });
  }
  pool.push({ ...CARD_POOL_DEFS.find(d => d.isHeal), type: 'heal' });
  return pool;
}

let missedPicks = 0;
let lastPickHadNew = false;

export function pickCard(card) {
  if (card.type === 'heal') {
    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.3);
    emit('dmg:number', { pos: player.pos, value: player.maxHp * 0.3, isCrit: true, color: '#60E080' });
    sfxHealCard();
  } else {
    const s = skills[card.key];
    s.active = true;
    s.lv = Math.min(s.lv + 1, s.max);
    if (card.key === 'basic') {
      if (s.lv >= 6 && s.lv < 11) s.cd = 0.4;
      if (s.lv >= 11) s.cd = 0.3;
    }
    if      (card.key === 'aoe')     sfxAoe();
    else if (card.key === 'shock')   sfxShock();
    else if (card.key === 'heal')    sfxHeal();
    else if (card.key === 'crit')    sfxCrit();
    else if (card.key === 'execute') sfxExecute();
    else if (card.key === 'luck')    sfxLuck();
    else if (card.key === 'thunder') sfxThunder();
    else if (card.key === 'chain')   sfxChain();
    else if (card.key === 'freeze')  sfxFreeze();
    else if (card.key === 'energy')  sfxEnergy();
  }
  emit('skillbar:refresh');
  state.phase = 'playing';
  state.bulletTime = 0;
  state.timeScale = 1;
  emit('cards:hide');
  state.pointCap = Math.round(state.pointCap * Tuning.Points.capGrowth);
  state.points = 0;
  emit('hud:update');
  if (lastPickHadNew) missedPicks = 0; else missedPicks++;
  sfxCardPick();
}

export function triggerCardSelect() {
  state.phase = 'card';
  state.bulletTime = 1;
  state.timeScale = 0.15;

  let pool = buildCardPool();
  if (missedPicks >= 2) {
    const n = pool.filter(c => c.type === 'skill' && c.currentLv === 0);
    if (n.length > 0) pool = n;
  }

  const picks = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }

  lastPickHadNew = picks.some(p => p.type === 'skill' && p.currentLv === 0);
  emit('cards:show', { picks });
  sfxCardSelect();
}

export function checkPointOverflow() {
  if (state.points >= state.pointCap && state.phase === 'playing') {
    state.points = state.pointCap;
    triggerCardSelect();
  }
}

/* ============================================================
   5. 波次系统
   ============================================================ */
export function startWave() {
  state.wave++;
  state.waveTimer = 0;
  state.waveClearTimer = 0;

  const baseCount = Math.floor(
    Tuning.Wave.baseCount *
    Math.pow(Tuning.Wave.growthPerWave, state.wave - 1) *
    (state.countMult || 1.0)
  );
  state.spawnQueue = baseCount;
  state.spawnAccum = 0;

  if (state.wave % Tuning.Wave.bossEvery === 0 && !state.bossActive) {
    const angle = Math.random() * Math.PI * 2;
    const r = 40;
    spawnEnemy('boss', player.pos.x + Math.cos(angle) * r, player.pos.z + Math.sin(angle) * r);
    state.spawnQueue = Math.floor(state.spawnQueue * 0.5);
    sfxBossSpawn();
    state.screenShake = 20;
    emit('screen:flash', 0.35);
  }

  emit('hud:update');
}

function recordInfiniteWave() {
  state.wavesCleared++;
  const best = Math.max(progress.infiniteBest || 0, state.wavesCleared);
  if (best !== (progress.infiniteBest || 0)) {
    recordInfiniteBest(best);
    const newCars = getNewlyUnlockedCars();
    if (newCars.length > 0) {
      const names = newCars.map(id => vehName(id)).join(getLang() === 'zh' ? '、' : ', ');
      showUnlockToast(T('newCarUnlocked', names));
      sfxCardPick();
    }
  }
}

export function updateSpawning(dt) {
  state.waveTimer += dt;

  if (state.mode === 'infinite') {
    if (state.waveTimer >= Tuning.Wave.waveDuration) {
      recordInfiniteWave();
      startWave();
      return;
    }
    let nonBossCount = 0;
    for (const e of enemies) if (e.active && !e.isBoss) nonBossCount++;
    const cleared = (state.spawnQueue === 0 && nonBossCount === 0 && state.waveTimer > 1.0);
    if (cleared) {
      state.waveClearTimer += dt;
      if (state.waveClearTimer >= Tuning.Wave.clearWaveDelay) {
        recordInfiniteWave();
        startWave();
        return;
      }
    } else {
      state.waveClearTimer = 0;
    }
  } else {
    let nonBossCount = 0;
    for (const e of enemies) if (e.active && !e.isBoss) nonBossCount++;
    const cleared = (state.spawnQueue === 0 && nonBossCount === 0 && state.waveTimer > 0.8);
    if (cleared) {
      state.waveClearTimer += dt;
      if (state.waveClearTimer >= Tuning.Wave.clearWaveDelay) {
        state.wavesCleared++;
        if (state.wavesCleared >= state.targetWaves) { triggerVictory(); return; }
        startWave();
        return;
      }
    } else {
      state.waveClearTimer = 0;
    }
  }

  if (state.spawnQueue > 0) {
    state.spawnAccum += Tuning.Wave.spawnRate * dt;
    while (state.spawnAccum >= 1 && state.spawnQueue > 0 && enemies.length < Tuning.Wave.onScreenCap) {
      state.spawnAccum -= 1;
      state.spawnQueue--;

      const angle = Math.random() * Math.PI * 2;
      const r = Tuning.Wave.spawnRadiusMin + Math.random() * (Tuning.Wave.spawnRadiusMax - Tuning.Wave.spawnRadiusMin);
      const x = player.pos.x + Math.cos(angle) * r;
      const z = player.pos.z + Math.sin(angle) * r;

      const roll = Math.random();
      let type = 'mob';
      if (state.eliteMix) {
        if (roll < 0.15) type = 'ranged';
        else if (roll < 0.40) type = 'shield';
        else if (roll < 0.55) type = 'elite';
        else type = 'mob';
      } else {
        if (state.wave >= 3 && roll < 0.10) type = 'bomber';
        else if (state.wave >= 4 && roll < 0.22) type = 'ranged';
        else if (state.wave >= 5 && roll < 0.32) type = 'shield';
        else if (state.wave >= 6 && roll < 0.36) type = 'elite';
      }
      spawnEnemy(type, x, z);
    }
  }
}

/* ============================================================
   6. 敌人 AI 更新
   ============================================================ */
export function updateEnemies(dt) {
  enemyHash.clear();
  for (const e of enemies) if (e.active) enemyHash.insert(e, e.pos.x, e.pos.z);

  const predX = player.pos.x + Math.sin(player.yaw) * player.speed * Tuning.AI.prediction;
  const predZ = player.pos.z + Math.cos(player.yaw) * player.speed * Tuning.AI.prediction;

  for (const e of enemies) {
    if (!e.active) continue;

    if (e.airTime > 0) {
      e.vel.y -= Tuning.Physics.gravity * dt;
      e.vel.x *= (1 - Tuning.Physics.airDrag * dt);
      e.vel.z *= (1 - Tuning.Physics.airDrag * dt);
      e.pos.x += e.vel.x * dt;
      e.pos.y += e.vel.y * dt;
      e.pos.z += e.vel.z * dt;
      e.roll += e.rollSpeed * dt;
      e.airTime -= dt;

      const r = Math.hypot(e.pos.x, e.pos.z);
      if (r > 198) { e.pos.x *= 198 / r; e.pos.z *= 198 / r; }

      if (e.pos.y <= 0) {
        e.pos.y = 0;
        e.airTime = 0;
        e.roll = 0;
        e.rollSpeed = 0;
        spawnRing(e.pos.clone().setY(0.2), e.color, e.isBoss ? 6 : 4.5, 0.35);
        spawnHitSpark(e.pos.clone().setY(0.3), e.color);
        if (!e.isBoss) spawnBurstParticles(e.pos, e.color, 5, 8);

        if (!e.isBoss) {
          enemyHash.query(e.pos.x, e.pos.z, 4, sepOut);
          for (const other of sepOut) {
            if (other === e || !other.active || other.airTime > 0 || other.isBoss) continue;
            const odx = other.pos.x - e.pos.x, odz = other.pos.z - e.pos.z;
            const od2 = odx * odx + odz * odz;
            if (od2 < 16 && od2 > 0.01) {
              const od = Math.sqrt(od2);
              other.vel.x += odx / od * 5;
              other.vel.z += odz / od * 5;
              other.vel.y = 6;
              other.airTime = 0.7;
              other.rollSpeed = (Math.random() - 0.5) * 12;
            }
          }
        }
      }
      continue;
    }

    if (e.frozen > 0) e.frozen -= dt;
    if (e.ramCD > 0) e.ramCD -= dt;
    if (e.attackCD > 0) e.attackCD -= dt;
    if (e.groanCD > 0) e.groanCD -= dt;

    const speedMul = e.frozen > 0 ? (1 - getFreezeSlow()) : 1;
    const dx = player.pos.x - e.pos.x;
    const dz = player.pos.z - e.pos.z;
    const distToPlayer = Math.hypot(dx, dz);

    let targetX, targetZ;
    if (e.isBoss) {
      targetX = predX; targetZ = predZ;
    } else if (e.role === 'flank') {
      const sa = player.yaw + e.sideSign * Tuning.AI.flankAngle;
      targetX = player.pos.x + Math.sin(sa) * 8;
      targetZ = player.pos.z + Math.cos(sa) * 8;
    } else if (e.role === 'rear') {
      const ra = player.yaw + Math.PI + e.sideSign * Tuning.AI.rearAngle;
      targetX = player.pos.x + Math.sin(ra) * 11;
      targetZ = player.pos.z + Math.cos(ra) * 11;
    } else if (e.role === 'thrower') {
      e.orbitAngle += dt * Tuning.AI.orbitSpeed * e.sideSign;
      targetX = player.pos.x + Math.sin(e.orbitAngle) * 18;
      targetZ = player.pos.z + Math.cos(e.orbitAngle) * 18;
    } else {
      const pt = Math.min(distToPlayer / Math.max(e.speed, 1), 0.6);
      targetX = player.pos.x + Math.sin(player.yaw) * player.speed * pt * Tuning.AI.prediction;
      targetZ = player.pos.z + Math.cos(player.yaw) * player.speed * pt * Tuning.AI.prediction;
    }

    const tdx = targetX - e.pos.x, tdz = targetZ - e.pos.z;
    const tdist = Math.hypot(tdx, tdz) || 1;
    let dirX = tdx / tdist, dirZ = tdz / tdist;

    enemyHash.query(e.pos.x, e.pos.z, 4, sepOut);
    let sepX = 0, sepZ = 0;
    for (const other of sepOut) {
      if (other === e || !other.active) continue;
      const odx = e.pos.x - other.pos.x, odz = e.pos.z - other.pos.z;
      const od2 = odx * odx + odz * odz;
      const minD = e.scaleRadius + other.scaleRadius + 0.6;
      if (od2 < minD * minD && od2 > 0.001) {
        const od = Math.sqrt(od2);
        sepX += odx / od * (1 - od / minD);
        sepZ += odz / od * (1 - od / minD);
      }
    }
    dirX += sepX * Tuning.AI.separationWeight;
    dirZ += sepZ * Tuning.AI.separationWeight;
    const dlen = Math.hypot(dirX, dirZ) || 1;
    dirX /= dlen; dirZ /= dlen;

    const spd = e.speed * speedMul;
    e.pos.x += dirX * spd * dt;
    e.pos.z += dirZ * spd * dt;
    e.angle = Math.atan2(dirX, dirZ);

    if (!e.isBoss && e.groanCD <= 0 && Math.random() < 0.015) {
      sfxZombieGroan();
      e.groanCD = 3 + Math.random() * 4;
    }

    if (distToPlayer < e.scaleRadius + 2.2) {
      if (e.attackCD <= 0) {
        e.attackPhase = 1.0;
        e.attackCD = 1.0;
        if (!e.isBoss && Math.random() < 0.5) sfxZombieAttack();
      }
      if (player.iframe <= 0 && player.ramInvuln <= 0 && !player.isJumping && Math.abs(player.speed) < 15) {
        player.hp -= e.dmg * dt;
        player.iframe = 0.5;
        player.hitStreak++;
        if (player.hitStreak >= 3) { player.protectMode = 8; player.hitStreak = 0; }
        sfxHurt();
        state.screenShake = Math.max(state.screenShake, 5);
      }
    }

    if (e.type === 'bomber' && distToPlayer < 3.5) {
      spawnRing(e.pos.clone(), 0xFF9040, 8, 0.4);
      spawnBurstParticles(e.pos, 0xFF9040, 12, 12);
      const dx2 = player.pos.x - e.pos.x, dz2 = player.pos.z - e.pos.z;
      if (dx2 * dx2 + dz2 * dz2 < 25 && player.iframe <= 0 && !player.isJumping) {
        player.hp -= e.dmg;
        player.iframe = 0.5;
        sfxHurt();
        state.screenShake = 12;
      }
      killEnemy(e);
      continue;
    }

    if (e.type === 'ranged') {
      e.fireCD -= dt;
      if (e.fireCD <= 0 && distToPlayer < 30) {
        e.fireCD = 2;
        const dirToP = new THREE.Vector3(dx, 0, dz).normalize();
        fxSpawnEnemyBullet(e.pos.clone().setY(1.5), dirToP, e.dmg);
      }
    }

    e.walkPhase += dt * (Math.max(spd, 2) * 0.7);
    if (e.attackPhase > 0) e.attackPhase -= dt * 3.5;
    if (e.attackPhase < 0) e.attackPhase = 0;
  }

  let zombieIdx = 0;
  for (const e of enemies) {
    if (!e.active || e.isBoss) continue;
    if (zombieIdx >= MAX_ZOMBIES) break;

    rig.root.position.set(e.pos.x, e.pos.y, e.pos.z);
    rig.root.rotation.set(0, e.angle, e.roll);
    rig.root.scale.set(e.scaleVec.x, e.scaleVec.y, e.scaleVec.z);

    const armSwing = Math.sin(e.walkPhase) * 0.7;
    const legSwing = Math.sin(e.walkPhase) * 0.85;
    rig.armLPivot.rotation.x = 0.7 + armSwing;
    rig.armRPivot.rotation.x = 0.7 - armSwing;
    rig.legLPivot.rotation.x = legSwing;
    rig.legRPivot.rotation.x = -legSwing;
    rig.torso.rotation.x = 0.08;
    rig.head.rotation.x = 0.05;
    rig.head.rotation.z = Math.sin(e.walkPhase * 0.7) * 0.15;

    if (e.attackPhase > 0) {
      const atk = Math.sin(e.attackPhase * Math.PI);
      rig.armLPivot.rotation.x = 0.7 - atk * 1.6;
      rig.armRPivot.rotation.x = 0.7 - atk * 1.6;
      rig.torso.rotation.x = 0.08 - atk * 0.15;
    }

    rig.root.updateMatrixWorld(true);
    zombieMeshes.torso.setMatrixAt(zombieIdx, rig.torso.matrixWorld);
    zombieMeshes.head.setMatrixAt(zombieIdx, rig.head.matrixWorld);
    zombieMeshes.armL.setMatrixAt(zombieIdx, rig.armL.matrixWorld);
    zombieMeshes.armR.setMatrixAt(zombieIdx, rig.armR.matrixWorld);
    zombieMeshes.legL.setMatrixAt(zombieIdx, rig.legL.matrixWorld);
    zombieMeshes.legR.setMatrixAt(zombieIdx, rig.legR.matrixWorld);

    zombieMeshes.torso.setColorAt(zombieIdx, e.clothColor);
    zombieMeshes.legL.setColorAt(zombieIdx, e.legColor);
    zombieMeshes.legR.setColorAt(zombieIdx, e.legColor);
    zombieMeshes.armL.setColorAt(zombieIdx, e.skinColor);
    zombieMeshes.armR.setColorAt(zombieIdx, e.skinColor);
    zombieMeshes.head.setColorAt(zombieIdx, e.headColor);
    zombieIdx++;
  }
  for (const mesh of Object.values(zombieMeshes)) {
    mesh.count = zombieIdx;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  }

  if (state.boss && state.boss.active) {
    const b = state.boss;
    bossRig.root.position.set(b.pos.x, b.pos.y, b.pos.z);
    bossRig.root.rotation.set(0, b.angle, b.roll);

    const bArmSwing = Math.sin(b.walkPhase) * 0.55;
    const bLegSwing = Math.sin(b.walkPhase) * 0.65;
    bossRig.armLPivot.rotation.x = 0.5 + bArmSwing;
    bossRig.armRPivot.rotation.x = 0.5 - bArmSwing;
    bossRig.legLPivot.rotation.x = bLegSwing;
    bossRig.legRPivot.rotation.x = -bLegSwing;
    bossRig.body.rotation.x = 0.1;
    bossRig.head.rotation.x = 0.08;
    bossRig.head.rotation.z = Math.sin(performance.now() * 0.002) * 0.06;

    if (b.attackPhase > 0) {
      const atk = Math.sin(b.attackPhase * Math.PI);
      bossRig.armLPivot.rotation.x = 0.5 - atk * 1.8;
      bossRig.armRPivot.rotation.x = 0.5 - atk * 1.8;
      bossRig.body.rotation.x = 0.1 - atk * 0.2;
    }

    b.walkPhase += dt * (b.speed * 0.4);
    if (b.attackPhase > 0) b.attackPhase -= dt * 2.5;
    if (b.attackPhase < 0) b.attackPhase = 0;

    bossAura.rotation.z += dt * 0.8;
    bossAura2.rotation.z -= dt * 1.2;

    emit('boss:hp', b.hp / b.maxHp);
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    if (!enemies[i].active) enemies.splice(i, 1);
  }
}

/* ============================================================
   7. 玩家更新（含闪冲 / 跳跃 / 相机跟随 / FOV 动态）
   ============================================================ */
export function updatePlayer(dt) {
  const C = V();

  let forward = 0;
  if (keys['KeyW'] || keys['ArrowUp']) forward += 1;
  if (keys['KeyS'] || keys['ArrowDown']) forward -= 1;
  if (_touchThrottle) forward += 1;
  if (_touchBrake) forward -= 1;

  let steerInput = 0;
  if (keys['KeyA'] || keys['ArrowLeft']) steerInput += 1;
  if (keys['KeyD'] || keys['ArrowRight']) steerInput -= 1;
  steerInput += _joystickSteer;

  if (player.dodgeTimer > 0) {
    player.dodgeTimer -= dt;
    const t = 1 - player.dodgeTimer / Tuning.Dodge.dashDuration;
    const ease = 1 - Math.pow(1 - t, 3);
    player.pos.lerpVectors(player.dodgeStartPos, player.dodgeEndPos, ease);
    player.iframe = Math.max(player.iframe, Tuning.Dodge.iframes);
  } else {
    if (forward > 0) {
      player.speed += C.accel * dt;
    } else if (forward < 0) {
      player.speed -= C.brake * dt;
    } else {
      const sign = Math.sign(player.speed);
      player.speed -= sign * C.accel * C.friction * dt * 0.35;
      if (Math.sign(player.speed) !== sign) player.speed = 0;
    }

    const maxSpd = C.maxSpeed * (player.speedBoost > 0 ? 1.2 : 1);
    player.speed = Math.max(-maxSpd * 0.4, Math.min(maxSpd, player.speed));

    const speedRatio = Math.min(Math.abs(player.speed) / C.maxSpeed, 1);
    const authority = 1 - speedRatio * C.steerFalloff;
    const targetSteer = steerInput * C.maxSteer * authority;
    player.steer += (targetSteer - player.steer) * Math.min(C.steerResponse * dt, 1);

    const speedFactor = Math.min(Math.abs(player.speed) / C.lowSpeedSteerPoint, 1);
    if (Math.abs(player.speed) > 1.5) {
      player.yaw += player.steer * speedFactor * C.yawRateBase * Math.sign(player.speed) * dt;
    }

    const forwardDir = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    player.pos.addScaledVector(forwardDir, player.speed * dt);
  }

  const r = Math.hypot(player.pos.x, player.pos.z);
  if (r > 197) {
    player.pos.x *= 197 / r;
    player.pos.z *= 197 / r;
    player.speed *= 0.4;
    state.screenShake = Math.max(state.screenShake, 8);
  }

  if (terrain.fountainRadius > 0) {
    const fr = Math.hypot(player.pos.x, player.pos.z);
    if (fr < terrain.fountainRadius && fr > 0.01) {
      const pushOut = terrain.fountainRadius / fr;
      player.pos.x *= pushOut;
      player.pos.z *= pushOut;
      if (player.speed > 0) player.speed *= 0.3;
      if (player.fountainHitCD <= 0) {
        state.screenShake = Math.max(state.screenShake, 14);
        emit('sfx:smash');
        spawnRing(new THREE.Vector3(player.pos.x, 0.4, player.pos.z), 0xFFD040, 4, 0.35);
        player.fountainHitCD = 0.3;
      }
    }
  }
  if (player.fountainHitCD > 0) player.fountainHitCD -= dt;

  if (player.isJumping) {
    player.jumpTimer += dt;
    if (player.jumpTimer >= Tuning.Jump.duration) {
      player.isJumping = false;
      player.jumpTimer = 0;
      const dmg = Tuning.Jump.airStompDamage + Math.abs(player.speed) * 0.2;
      enemyHash.query(player.pos.x, player.pos.z, Tuning.Jump.airStompRange, queryOut);
      for (const e of queryOut) {
        if (!e.active) continue;
        const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z;
        if (dx * dx + dz * dz < Tuning.Jump.airStompRange * Tuning.Jump.airStompRange) {
          dealDamageToEnemy(e, dmg, 'stomp');
        }
      }
      spawnRing(player.pos.clone(), 0xFFB060, Tuning.Jump.airStompRange, 0.5);
      state.screenShake = 14;
      sfxShock();
    }
  }

  if (player.iframe > 0) player.iframe -= dt;
  if (player.dodgeCD > 0) player.dodgeCD -= dt;
  if (player.jumpCD > 0) player.jumpCD -= dt;
  if (player.ramInvuln > 0) player.ramInvuln -= dt;
  if (player.speedBoost > 0) player.speedBoost -= dt;
  if (player.protectMode > 0) player.protectMode -= dt;

  const carMesh = getCarMesh();
  if (carMesh) {
    const yOff = player.isJumping
      ? Math.sin((player.jumpTimer / Tuning.Jump.duration) * Math.PI) * Tuning.Jump.height
      : 0;
    carMesh.position.set(player.pos.x, yOff, player.pos.z);
    carMesh.rotation.y = player.yaw;

    const targetRoll = -player.steer * 0.25;
    carMesh.rotation.z += (targetRoll - carMesh.rotation.z) * Math.min(8 * dt, 1);
    carMesh.rotation.x += (0 - carMesh.rotation.x) * Math.min(6 * dt, 1);
  }

  /* 相机跟随 + FOV 动态 */
  const camTarget = new THREE.Vector3(
    player.pos.x - Math.sin(player.yaw) * 11,
    player.pos.y + 5.5,
    player.pos.z - Math.cos(player.yaw) * 11
  );
  camera.position.lerp(camTarget, 1 - Math.exp(-6 * dt));

  const lookAt = new THREE.Vector3(
    player.pos.x + Math.sin(player.yaw) * 8,
    player.pos.y + 1.4,
    player.pos.z + Math.cos(player.yaw) * 8
  );
  camera.lookAt(lookAt);

  const baseFov = 60 + (Math.abs(player.speed) / C.maxSpeed) * 15;
  const dodgeProgress = player.dodgeTimer > 0
    ? 1 - Math.abs((1 - player.dodgeTimer / Tuning.Dodge.dashDuration) * 2 - 1)
    : 0;
  const speedFov = getSpeedFxIntensity() * Tuning.SpeedFx.fovBoost;
  const targetFov = baseFov + dodgeProgress * 12 + state.fovKick + speedFov;
  camera.fov += (targetFov - camera.fov) * Math.min(8 * dt, 1);
  camera.updateProjectionMatrix();
}

export function doDodge() {
  if (player.dodgeCD > 0 || player.dodgeTimer > 0) return;
  player.dodgeCD = Tuning.Dodge.cooldown;
  player.dodgeTimer = Tuning.Dodge.dashDuration;
  const dir = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  player.dodgeStartPos = player.pos.clone();
  player.dodgeEndPos = player.pos.clone().addScaledVector(dir, Tuning.Dodge.dashDistance);

  const r = Math.hypot(player.dodgeEndPos.x, player.dodgeEndPos.z);
  if (r > 197) { player.dodgeEndPos.x *= 197 / r; player.dodgeEndPos.z *= 197 / r; }
  if (terrain.fountainRadius > 0) {
    const fr = Math.hypot(player.dodgeEndPos.x, player.dodgeEndPos.z);
    if (fr < terrain.fountainRadius + 0.5 && fr > 0.01) {
      const pushOut = (terrain.fountainRadius + 0.5) / fr;
      player.dodgeEndPos.x *= pushOut;
      player.dodgeEndPos.z *= pushOut;
    }
  }
  spawnDodgeEffect(player.dodgeStartPos.clone(), player.dodgeEndPos.clone());
  sfxDodge();
}

export function doJump() {
  if (player.jumpCD > 0 || player.isJumping) return;
  player.jumpCD = Tuning.Jump.cooldown;
  player.isJumping = true;
  player.jumpTimer = 0;
  player.iframe = Math.max(player.iframe, Tuning.Jump.airInvuln);
  playTone(500, 0.1, 'sine', 0.07);
}

/* ============================================================
   8. 车头撞击判定（含可破坏物）
   ============================================================ */
export function checkRam(dt) {
  if (Math.abs(player.speed) < 6) return;
  const C = V();
  const ramDmg = (C.ramBase + Math.abs(player.speed) * C.ramPerSpeed);
  const fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const hitX = player.pos.x + fwd.x * 2.6;
  const hitZ = player.pos.z + fwd.z * 2.6;
  let anyHit = false;

  enemyHash.query(hitX, hitZ, C.hitRadius, queryOut);
  for (const e of queryOut) {
    if (!e.active || e.ramCD > 0 || e.isBoss) continue;
    const dx = e.pos.x - hitX, dz = e.pos.z - hitZ;
    if (dx * dx + dz * dz < C.hitRadius * C.hitRadius) {
      e.ramCD = Tuning.Ram.cooldownPerEnemy;

      const pushDir = new THREE.Vector3(e.pos.x - player.pos.x, 0, e.pos.z - player.pos.z).normalize();
      const sf = Math.abs(player.speed) / C.maxSpeed;
      const impulse = Tuning.Ram.knockImpulse + sf * Tuning.Ram.knockSpeedBonus;
      e.vel.x = pushDir.x * impulse;
      e.vel.z = pushDir.z * impulse;
      e.vel.y = Tuning.Ram.knockUpward + sf * 8;
      e.airTime = 1.6;
      e.rollSpeed = (Math.random() - 0.5) * 22;

      spawnBurstParticles(e.pos, 0xFFFFFF, 8, 10);
      dealDamageToEnemy(e, ramDmg, 'ram');

      if (skills.shock.active) {
        const spct = [0.20,0.30,0.35,0.50,0.60,0.70,0.85,1.0][skills.shock.lv - 1] || 1.0;
        enemyHash.query(e.pos.x, e.pos.z, 5.5, queryOut);
        for (const other of queryOut) {
          if (other === e || !other.active || other.isBoss) continue;
          const odx = other.pos.x - e.pos.x, odz = other.pos.z - e.pos.z;
          if (odx * odx + odz * odz < 30) {
            dealDamageToEnemy(other, ramDmg * spct, 'shock');
            const od = Math.hypot(odx, odz) || 1;
            other.vel.x += odx / od * 8;
            other.vel.z += odz / od * 8;
            other.vel.y = 7;
            other.airTime = 0.9;
            other.rollSpeed = (Math.random() - 0.5) * 15;
          }
        }
        spawnRing(e.pos.clone().setY(0.3), 0xFFE080, 6, 0.35);
      }
      anyHit = true;
    }
  }

  if (state.boss && state.boss.active && state.boss.ramCD <= 0) {
    const dx = state.boss.pos.x - hitX, dz = state.boss.pos.z - hitZ;
    const bossR = state.boss.radius + 1.5;
    if (dx * dx + dz * dz < bossR * bossR) {
      state.boss.ramCD = 0.3;
      player.speed *= 0.3;
      dealDamageToEnemy(state.boss, ramDmg * 1.5, 'ram');
      player.ramInvuln = Tuning.Ram.invuln + 0.25;

      const pushDir = new THREE.Vector3(state.boss.pos.x - player.pos.x, 0, state.boss.pos.z - player.pos.z).normalize();
      state.boss.vel.x = pushDir.x * Tuning.Ram.bossKnockImpulse;
      state.boss.vel.z = pushDir.z * Tuning.Ram.bossKnockImpulse;
      state.boss.vel.y = Tuning.Ram.bossKnockUpward;
      state.boss.airTime = Tuning.Ram.bossKnockTime;
      state.boss.rollSpeed = (Math.random() - 0.5) * 4;

      state.screenShake = 18;
      sfxRam();
      spawnRing(state.boss.pos.clone().setY(0.3), 0xFFD040, 8, 0.35);
      spawnBurstParticles(state.boss.pos, 0xFFFFFF, 12, 12);
      anyHit = true;
    }
  }

  /* 车头撞可破坏物 */
  checkDestructibles(dt);

  if (anyHit) {
    player.ramInvuln = Tuning.Ram.invuln;
    player.speedBoost = 1.0;
    state.hitStop = Tuning.Ram.hitStopDuration;
    state.fovKick = Tuning.Ram.fovKick;
    state.screenShake = Math.max(state.screenShake, 16);
    spawnRing(new THREE.Vector3(hitX, 0, hitZ), 0xFFFFFF, 4, 0.25);
    spawnHitSpark(new THREE.Vector3(hitX, 1, hitZ), 0xFFFFFF);
    sfxRam();
  }
}

/* ============================================================
   9. 技能更新
   ============================================================ */
export function updateSkills(dt) {
  const b = skills.basic;
  b.cd -= dt;
  if (b.cd <= 0) {
    const tbl = SKILL_TABLES.basic[Math.min(b.lv, 15) - 1];
    if (tbl) {
      const target = findTargetInFront(60, 55);
      if (target) {
        spawnBullet(
          player.pos.clone().add(new THREE.Vector3(0, 1.3, 0)),
          target.pos, 0xC8F0FF, tbl.d, 'basic', 1.8, 100
        );
        sfxBasic();
        b.cd = tbl.cd;
      } else {
        b.cd = 0.1;
      }
    } else {
      b.cd = 0.3;
    }
  }

  const a = skills.aoe;
  if (a.active) {
    a.cd -= dt;
    if (a.cd <= 0) {
      const tbl = SKILL_TABLES.aoe[Math.min(a.lv, 10) - 1];
      if (tbl) {
        const target = findTargetInFront(360, 80);
        if (target) {
          const tpos = target.pos.clone();
          const b2 = spawnBullet(
            player.pos.clone().add(new THREE.Vector3(0, 1.6, 0)),
            tpos, 0xFFB060, tbl.d, 'aoe_projectile', 5, 55
          );
          if (b2) { b2.target = tpos.clone(); b2.aoeData = tbl; }
          sfxAoe();
          a.cd = tbl.cd;
        } else {
          a.cd = 0.3;
        }
      }
    }
  }

  if (skills.thunder.active) skills.thunder.cd -= dt;
}

function findTargetInFront(maxAngleDeg, maxDist) {
  let best = null, bestDist = Infinity;
  const fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const cosLimit = Math.cos(maxAngleDeg * Math.PI / 180);
  for (const e of enemies) {
    if (!e.active) continue;
    const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > maxDist) continue;
    const nx = dx / (d || 1), nz = dz / (d || 1);
    if (fwd.x * nx + fwd.z * nz < cosLimit) continue;
    if (d < bestDist) { bestDist = d; best = e; }
  }
  return best;
}

function handleAoeProjectileHit(b) {
  const tbl = b.aoeData;
  if (!tbl) return;
  const center = b.target || b.pos;
  enemyHash.query(center.x, center.z, tbl.r, queryOut);
  const hitSet = new Set();
  let count = 0;
  for (const e of queryOut) {
    if (!e.active || hitSet.has(e)) continue;
    const dx = e.pos.x - center.x, dz = e.pos.z - center.z;
    if (dx * dx + dz * dz < tbl.r * tbl.r) {
      hitSet.add(e);
      dealDamageToEnemy(e, tbl.d, 'aoe');
      count++;
      if (count >= tbl.n) break;
    }
  }
  spawnRing(center.clone(), 0xFF6030, tbl.r, 0.5);
  spawnRing(center.clone(), 0xFFC060, tbl.r * 0.6, 0.35);
  state.screenShake = Math.max(state.screenShake, 8);
}

/* ============================================================
   10. 事件响应
   ============================================================ */
function handleBulletTick(b) {
  enemyHash.query(b.pos.x, b.pos.z, 3, queryOut);
  for (const e of queryOut) {
    if (!e.active) continue;
    const dx = e.pos.x - b.pos.x, dz = e.pos.z - b.pos.z;
    if (dx * dx + dz * dz < (e.scaleRadius + 0.7) * (e.scaleRadius + 0.7)) {
      dealDamageToEnemy(e, b.dmg, b.kind);
      spawnHitSpark(b.pos.clone(), b.color.getHex());
      deactivateBullet(b);
      break;
    }
  }
}

function handleEnemyBulletHitPlayer(b) {
  player.hp -= b.dmg;
  player.iframe = 0.5;
  sfxHurt();
  state.screenShake = Math.max(state.screenShake, 6);
}

/* ============================================================
   11. 出怪点 / 生命周期
   ============================================================ */
const SPAWN_MIN_DIST = 26;
const SPAWN_MAX_DIST = 58;

function pickSpawnPoint() {
  const dirs = [
    { x: 1,  z: 0, yaw: Math.PI / 2 },
    { x: -1, z: 0, yaw: -Math.PI / 2 },
    { x: 0,  z: 1, yaw: 0 },
    { x: 0,  z: -1, yaw: Math.PI },
  ];
  const d = dirs[Math.floor(Math.random() * dirs.length)];
  const dist = SPAWN_MIN_DIST + Math.random() * (SPAWN_MAX_DIST - SPAWN_MIN_DIST);
  const lateral = (Math.random() - 0.5) * 4.0;
  const px = d.x !== 0 ? d.x * dist : lateral;
  const pz = d.z !== 0 ? d.z * dist : lateral;
  return { x: px, z: pz, yaw: d.yaw };
}

export function triggerVictory() {
  if (state.phase === 'victory' || state.phase === 'over') return;
  state.phase = 'victory';
  state.timeScale = 1;
  state.bulletTime = 0;
  emit('victory:show', {
    level: state.currentLevel,
    time: state.elapsed,
    kills: state.kills,
    waves: state.wavesCleared,
    points: state.totalPoints,
  });
}

export function triggerGameOver() {
  if (state.phase === 'over' || state.phase === 'victory') return;
  state.phase = 'over';
  state.timeScale = 1;
  state.bulletTime = 0;
  sfxGameOver();
  state.screenShake = 20;
  emit('gameover:show', {
    level: state.currentLevel,
    wave: state.wave,
    kills: state.kills,
    time: state.elapsed,
    points: state.totalPoints,
    mode: state.mode,
  });
}

/* ============================================================
   12. 输入状态注入（同步给 audio.js）
   ============================================================ */
let _touchThrottle = false;
let _touchBrake = false;
let _joystickSteer = 0;

export function setTouchPedals(throttle, brake) {
  _touchThrottle = !!throttle;
  _touchBrake = !!brake;
  /* ★ 同步给 audio.js —— 否则引擎声浪读不到触摸油门/刹车状态 */
  audioSetTouchPedals(_touchThrottle, _touchBrake);
}
export function setJoystickSteer(v) { _joystickSteer = v; }
export function getTouchThrottle() { return _touchThrottle; }
export function getTouchBrake() { return _touchBrake; }

/* ============================================================
   13. 事件订阅初始化
   ============================================================ */
export function initGameplay() {
  on('bullet:tick', handleBulletTick);
  on('bullet:aoeHit', handleAoeProjectileHit);
  on('enemybullet:hitPlayer', handleEnemyBulletHitPlayer);
  on('boss:spawn', () => { emit('boss:barShow'); });
  on('boss:dead', () => { emit('boss:barHide'); });
}

/* ============================================================
   14. resetGame
   ============================================================ */
export function resetGame(mapType) {
  initAudio();
  startEngineSound();

  state.phase = 'playing';
  state.elapsed = 0;
  state.wave = 0;
  state.waveTimer = 0;
  state.waveClearTimer = 0;
  state.kills = 0;
  state.points = 0;
  state.pointCap = Tuning.Points.initialCap;
  state.totalPoints = 0;
  state.timeScale = 1;
  state.bulletTime = 0;
  state.bossActive = false;
  state.boss = null;
  state.screenShake = 0;
  state.hitStop = 0;
  state.fovKick = 0;
  state.spawnQueue = 0;
  state.spawnAccum = 0;
  state.wavesCleared = 0;

  const spawn = pickSpawnPoint();
  player.pos.set(spawn.x, 0, spawn.z);
  player.yaw = spawn.yaw;
  player.speed = 0;
  player.steer = 0;
  player.groundY = 0;
  player.hp = player.maxHp;
  player.iframe = 0;
  player.dodgeTimer = 0;
  player.dodgeCD = 0;
  player.jumpCD = 0;
  player.isJumping = false;
  player.jumpTimer = 0;
  player.ramInvuln = 0;
  player.speedBoost = 0;
  player.hitStreak = 0;
  player.protectMode = 0;
  player.fountainHitCD = 0;

  setTouchPedals(false, false);
  setJoystickSteer(0);

  for (const k of Object.keys(skills)) {
    skills[k].lv = 0;
    skills[k].active = false;
    skills[k].cd = 0;
  }
  skills.basic.lv = 1;
  skills.basic.active = true;
  skills.basic.cd = 0.6;
  emit('skillbar:refresh');

  resetEnemies();
  emit('fx:clearAll');

  rebuildCarMesh();
  buildTerrain(mapType || pickRandomMap());

  camera.position.set(
    player.pos.x - Math.sin(player.yaw) * 11,
    player.pos.y + 5.5,
    player.pos.z - Math.cos(player.yaw) * 11
  );
  camera.lookAt(
    player.pos.x + Math.sin(player.yaw) * 8,
    player.pos.y + 1.4,
    player.pos.z + Math.cos(player.yaw) * 8
  );

  startWave();
  emit('hud:update');
  emit('hud:dangerVignetteHide');
}

/* ============================================================
   15. 开局 / 重启
   ============================================================ */
export function startLevel(levelId) {
  state.currentLevel = levelId;
  state.mode = levelId === 16 ? 'infinite' : 'campaign';

  const level = LEVELS[levelId - 1];
  state.targetWaves = levelId === 16 ? Infinity : level.waves;
  state.countMult = levelId === 16 ? 1.0 : level.mult;
  state.eliteMix = levelId === 16 ? false : level.elite;
  state.wavesCleared = 0;

  resetGame();
}

export function restartGame() {
  resetGame();
}