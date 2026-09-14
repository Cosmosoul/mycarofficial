/* ============================================================
   core.js —— 核心层
   1. EventBus     系统间解耦通信
   2. State        全局可变状态 + 玩家状态
   3. Engine       three.js 渲染器 / 场景 / 相机 / 光照 / 天空装饰
   ============================================================ */

import * as THREE from 'three';
import { load, save } from '@/platform.js';
import Tuning from '@/config.js';

/* ============================================================
   1. EventBus
   ============================================================ */
const _bus = new Map();

export function on(event, fn) {
  if (!_bus.has(event)) _bus.set(event, new Set());
  _bus.get(event).add(fn);
  return () => off(event, fn);
}
export function off(event, fn) { _bus.get(event)?.delete(fn); }
export function emit(event, payload) {
  const set = _bus.get(event);
  if (!set) return;
  for (const fn of set) {
    try { fn(payload); } catch (e) { console.error(`[EventBus] ${event}`, e); }
  }
}

/* ============================================================
   2. State
   ============================================================ */

/* —— 玩家状态（位置向量在 main.js 初始化时注入）—— */
export const player = {
  pos: null,
  yaw: 0, speed: 0, steer: 0, groundY: 0,
  hp: 100, maxHp: 100,
  iframe: 0, dodgeTimer: 0, dodgeCD: 0, jumpCD: 0,
  isJumping: false, jumpTimer: 0,
  ramInvuln: 0, speedBoost: 0,
  dodgeStartPos: null, dodgeEndPos: null,
  hitStreak: 0, protectMode: 0, fountainHitCD: 0,
};

/* —— 全局运行状态 —— */
const _sfxVolume   = parseFloat(load('myCarSfxVol',   '1.0'));
const _musicVolume = parseFloat(load('myCarMusicVol', '1.0'));

export const state = {
  phase: 'boot',                 // boot | menu | story | playing | card | paused | victory | over
  mode: 'campaign',              // campaign | infinite
  currentLevel: 1,
  targetWaves: 2,
  wavesCleared: 0,
  countMult: 1.0,
  eliteMix: false,
  elapsed: 0,
  wave: 1,
  waveTimer: 0,
  kills: 0,
  points: 0,
  pointCap: Tuning.Points.initialCap,
  totalPoints: 0,
  timeScale: 1,
  bulletTime: 0,
  spawnQueue: 0,
  spawnAccum: 0,
  bossActive: false,
  boss: null,
  screenShake: 0,
  hitStop: 0,
  fovKick: 0,
  waveClearTimer: 0,
  soundOn: true,
  musicOn: true,
  sfxVolume:   Number.isFinite(_sfxVolume)   ? _sfxVolume   : 1.0,
  musicVolume: Number.isFinite(_musicVolume) ? _musicVolume : 1.0,
  forceRotate: false,
  bootTransitionPlayed: false,
};

/* —— 引擎声浪开关 —— */
export let engineEnabled = load('myCarEngineEnabled', '1') !== '0';

export function setEngineEnabled(v) {
  engineEnabled = !!v;
  save('myCarEngineEnabled', engineEnabled ? '1' : '0');
}
export function isEngineEnabled() { return engineEnabled; }

/* —— 当前选定车辆 —— */
export let selectedCarId = load('myCarSelectedCar', 'coupe');

export function setSelectedCarId(id) {
  selectedCarId = id;
  save('myCarSelectedCar', id);
}

/* ============================================================
   3. Engine —— three.js 渲染器 / 场景 / 相机 / 光照
   ============================================================ */

/* 渲染器 */
export const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/* 场景 */
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7FB4DE);
scene.fog = new THREE.Fog(0x7FB4DE, 120, 400);

/* 相机 */
export const camera = new THREE.PerspectiveCamera(
  60, window.innerWidth / window.innerHeight, 0.5, 600
);
camera.position.set(0, 6, -12);

/* —— 光照 —— */
export const hemi = new THREE.HemisphereLight(0xC8E8FF, 0x5A6A72, 1.0);
scene.add(hemi);

export const sun = new THREE.DirectionalLight(0xFFF4E0, 1.3);
sun.position.set(50, 80, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left   = -80;
sun.shadow.camera.right  =  80;
sun.shadow.camera.top    =  80;
sun.shadow.camera.bottom = -80;
sun.shadow.camera.near   = 1;
sun.shadow.camera.far    = 250;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun);

scene.add(new THREE.AmbientLight(0x8098B0, 0.5));

const _fill = new THREE.DirectionalLight(0x90B8E0, 0.4);
_fill.position.set(-30, -20, -20);
scene.add(_fill);

/* —— 天空装饰：太阳 + 光晕 + 云 —— */
export const sunOrb = new THREE.Mesh(
  new THREE.SphereGeometry(28, 20, 16),
  new THREE.MeshBasicMaterial({ color: 0xFFF8D0, fog: false })
);
sunOrb.position.set(150, 220, -180);
scene.add(sunOrb);

export const sunGlow = new THREE.Mesh(
  new THREE.SphereGeometry(42, 20, 16),
  new THREE.MeshBasicMaterial({
    color: 0xFFEE80, transparent: true, opacity: 0.32, fog: false,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  })
);
sunGlow.position.copy(sunOrb.position);
scene.add(sunGlow);

export const cloudGroup = new THREE.Group();
{
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF, roughness: 0.95, metalness: 0,
    fog: false, emissive: 0x8AB4D8, emissiveIntensity: 0.18, flatShading: true,
  });
  for (let c = 0; c < 14; c++) {
    const cluster = new THREE.Group();
    const baseSize = 10 + Math.random() * 14;
    const puffCount = 4 + Math.floor(Math.random() * 3);
    for (let j = 0; j < puffCount; j++) {
      const size = baseSize * (0.6 + Math.random() * 0.6);
      const puff = new THREE.Mesh(new THREE.SphereGeometry(size, 7, 5), cloudMat);
      puff.position.set(
        (Math.random() - 0.5) * baseSize * 2.4,
        (Math.random() - 0.5) * baseSize * 0.5,
        (Math.random() - 0.5) * baseSize * 1.6
      );
      puff.scale.y = 0.55;
      cluster.add(puff);
    }
    cluster.position.set(
      (Math.random() - 0.5) * 480,
      75 + Math.random() * 55,
      (Math.random() - 0.5) * 480
    );
    cloudGroup.add(cluster);
  }
}
scene.add(cloudGroup);

/* —— 便捷方法：把 renderer.domElement 挂到 gameWrapper —— */
export function mountRenderer() {
  const wrapper = document.getElementById('gameWrapper');
  if (wrapper && renderer.domElement.parentNode !== wrapper) {
    wrapper.appendChild(renderer.domElement);
  }
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
}