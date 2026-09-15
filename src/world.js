/* ============================================================
   world.js —— 地形 / 场景搭建
   1. 环境（地面/围墙/屋顶/山脊）+ 光照切换
   2. 中心地标（8 种地图各一）
   3. 道路 + 路灯
   4. 大门（铁门/水晶门）
   5. 散布植被
   6. 草丛 InstancedMesh
   7. 碎片 + 可破坏物
   8. 总装 buildTerrain / clearTerrain
   ============================================================ */

import * as THREE from 'three';
import {
  scene, hemi, sun, sunOrb, sunGlow, cloudGroup,
  state, player,
} from '@/core.js';
import {
  MAP_META, makeGroundTexture, makeWallTexture,
  groundTexKeyFor, wallTexKeyFor,
} from '@/content/maps.js';
import { sfxSmash } from '@/audio.js';
import { rumbleHit } from '@/gamepad.js';
import { spawnRing, spawnBurstParticles, spawnHitSpark } from '@/fx.js';
import Tuning from '@/config.js';

/* ============================================================
   0. 地形状态
   ============================================================ */
export const terrain = {
  destructibles: [],
  meshes: [],
  fountainRadius: 0,
};

let currentMapType = 'park';
export function getMapType() { return currentMapType; }
export function setMapType(t) { currentMapType = t; }

let groundMesh = null;
let gridMesh = null;
let wallMesh = null;
let roofMesh = null;
let ridgeMesh = null;

export const SHARED_GEO = {
  lampBase:   new THREE.CylinderGeometry(0.4, 0.5, 0.3, 8),
  lampPole:   new THREE.CylinderGeometry(0.12, 0.15, 6, 8),
  lampArm:    new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8),
  lampHead:   new THREE.BoxGeometry(0.8, 0.3, 0.5),
  lampBulb:   new THREE.SphereGeometry(0.22, 8, 6),
  treeTrunk:  new THREE.CylinderGeometry(0.35, 0.5, 3.5, 8),
  treeCrown1: new THREE.SphereGeometry(2.2, 8, 6),
  treeCrown2: new THREE.SphereGeometry(1.7, 8, 6),
  treeCrown3: new THREE.SphereGeometry(1.5, 8, 6),
};

/* 围墙发光色（按地图） */
const WALL_GLOW = {
  volcano:   { col: 0x300800, int: 0.35 },
  aquarium:  { col: 0x062030, int: 0.25 },
  dream:     { col: 0x200840, int: 0.32 },
  heaven:    { col: 0x605030, int: 0.20 },
  amusement: { col: 0x300820, int: 0.24 },
  hell:      { col: 0x400808, int: 0.42 },
};

/* 是否显示太阳 / 云 */
const SKY_VISIBLE = {
  park: true, desert: true, heaven: true, amusement: true,
};

/* 地图 → 灯光风格 */
const LAMP_STYLE = {
  aquarium: 'blue', volcano: 'lava', hell: 'hell',
  dream: 'dream', heaven: 'heaven', amusement: 'amusement',
};

/* 地图 → 道路材质 */
function makeRoadMat(mapType) {
  if (mapType === 'volcano') {
    return new THREE.MeshStandardMaterial({ color: 0xFF8A2E, roughness: 0.4, metalness: 0.05, emissive: 0xFF4C10, emissiveIntensity: 0.75 });
  }
  if (mapType === 'aquarium') {
    return new THREE.MeshStandardMaterial({ color: 0x9ED8E8, roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.68, emissive: 0x2070A0, emissiveIntensity: 0.4, side: THREE.DoubleSide });
  }
  if (mapType === 'dream') {
    return new THREE.MeshStandardMaterial({ color: 0xB090FF, roughness: 0.25, metalness: 0.45, emissive: 0x4020A0, emissiveIntensity: 0.55 });
  }
  if (mapType === 'heaven') {
    return new THREE.MeshStandardMaterial({ color: 0xFFF4C0, roughness: 0.35, metalness: 0.55, emissive: 0xA08040, emissiveIntensity: 0.35 });
  }
  if (mapType === 'amusement') {
    return new THREE.MeshStandardMaterial({ color: 0xFFD060, roughness: 0.5, metalness: 0.25, emissive: 0x805020, emissiveIntensity: 0.30 });
  }
  if (mapType === 'hell') {
    return new THREE.MeshStandardMaterial({ color: 0x3A0808, roughness: 0.85, metalness: 0.15, emissive: 0x400808, emissiveIntensity: 0.60 });
  }
  return new THREE.MeshStandardMaterial({ color: 0x3A3A3A, roughness: 0.9, metalness: 0.05 });
}

/* 地图 → 大门调色板 */
const GATE_PALETTES = {
  default:    { iron: 0x353B46, darkIron: 0x1A1E24, brass: 0x8E7038 },
  dream:      { iron: 0x5A40A0, darkIron: 0x2A1850, brass: 0xC080FF },
  heaven:     { iron: 0xE8C870, darkIron: 0xA08038, brass: 0xFFE8A0 },
  amusement:  { iron: 0xFF4090, darkIron: 0xC02060, brass: 0xFFD040 },
  hell:       { iron: 0x2A0A08, darkIron: 0x100404, brass: 0xC04020 },
};

/* ============================================================
   1. 环境
   ============================================================ */
function buildEnvironment(mapType) {
  for (const m of [groundMesh, gridMesh, wallMesh, roofMesh, ridgeMesh]) {
    if (!m) continue;
    scene.remove(m);
    if (m.geometry) m.geometry.dispose();
    if (m.material) {
      if (m.material.map) m.material.map.dispose();
      m.material.dispose();
    }
  }
  groundMesh = gridMesh = wallMesh = roofMesh = ridgeMesh = null;

  const meta = MAP_META[mapType] || MAP_META.park;

  scene.background.setHex(meta.sky);
  scene.fog.color.setHex(meta.sky);
  scene.fog.near = meta.fogNear;
  scene.fog.far  = meta.fogFar;

  hemi.color.setHex(meta.hemiSky);
  hemi.groundColor.setHex(meta.hemiGround);
  hemi.intensity = meta.hemiInt;
  sun.color.setHex(meta.sunCol);
  sun.intensity = meta.sunInt;

  const skyVisible = !!SKY_VISIBLE[mapType];
  sunOrb.visible = skyVisible;
  sunGlow.visible = skyVisible;
  cloudGroup.visible = skyVisible;

  const gTex = makeGroundTexture(groundTexKeyFor(mapType));
  groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({
      map: gTex, color: 0xFFFFFF,
      roughness: mapType === 'aquarium' ? 0.4 : (mapType === 'heaven' ? 0.55 : 0.96),
      metalness: mapType === 'aquarium' ? 0.25 : (mapType === 'dream' ? 0.35 : (mapType === 'heaven' ? 0.4 : 0.02)),
    })
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  gridMesh = new THREE.GridHelper(400, 100, meta.grid1, meta.grid2);
  gridMesh.material.transparent = true;
  gridMesh.material.opacity = 0.09;
  gridMesh.position.y = 0.015;
  scene.add(gridMesh);

  const wTex = makeWallTexture(wallTexKeyFor(mapType));
  const wg = WALL_GLOW[mapType] || { col: 0x000000, int: 0 };
  wallMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(200, 200, 10, 64, 1, true),
    new THREE.MeshStandardMaterial({
      map: wTex,
      side: THREE.BackSide,
      roughness: 0.92,
      metalness: 0.05,
      emissive: wg.col,
      emissiveIntensity: wg.int,
    })
  );
  wallMesh.position.y = 5;
  scene.add(wallMesh);

  roofMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(201.5, 199.5, 1.2, 64, 1, true),
    new THREE.MeshStandardMaterial({
      color: meta.roofCol, roughness: 0.55, metalness: 0.3,
      side: THREE.DoubleSide, emissive: 0x000000, emissiveIntensity: 0.15,
    })
  );
  roofMesh.position.y = 10.6;
  scene.add(roofMesh);

  ridgeMesh = new THREE.Mesh(
    new THREE.TorusGeometry(201.5, 0.35, 8, 128),
    new THREE.MeshStandardMaterial({ color: meta.ridgeCol, roughness: 0.5, metalness: 0.4 })
  );
  ridgeMesh.rotation.x = -Math.PI / 2;
  ridgeMesh.position.y = 11.3;
  scene.add(ridgeMesh);
}

/* ============================================================
   2. 中心地标
   ============================================================ */
function buildFountain() {
  const stoneMat     = new THREE.MeshStandardMaterial({ color: 0xE0D8C8, roughness: 0.7,  metalness: 0.1 });
  const stoneDarkMat = new THREE.MeshStandardMaterial({ color: 0xA8A090, roughness: 0.75, metalness: 0.1 });
  const waterMat     = new THREE.MeshStandardMaterial({ color: 0x40A0E0, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.85, emissive: 0x2060A0, emissiveIntensity: 0.35 });

  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.5, 1.0, 48), stoneMat);
  base.position.y = 0.5; base.receiveShadow = true; base.castShadow = true; group.add(base);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 8.2, 0.6, 48, 1, true), stoneDarkMat);
  inner.position.y = 1.0; group.add(inner);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(8.1, 48), waterMat);
  pool.rotation.x = -Math.PI / 2; pool.position.y = 1.1; group.add(pool);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.8, 2.5, 20), stoneMat);
  pillar.position.y = 2.35; pillar.castShadow = true; group.add(pillar);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(3, 2.5, 0.5, 24), stoneMat);
  bowl.position.y = 3.85; bowl.castShadow = true; group.add(bowl);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 1.5, 12), stoneMat);
  spire.position.y = 4.85; spire.castShadow = true; group.add(spire);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), stoneDarkMat);
  ball.position.y = 5.9; ball.castShadow = true; group.add(ball);

  const flowerColors = [0xFF4080, 0xFFD040, 0x80C0FF, 0xFF8040, 0xFF60D0];
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const r = 9.9 + Math.random() * 0.2;
    const fc = flowerColors[i % flowerColors.length];
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.32 + Math.random() * 0.1, 6, 5),
      new THREE.MeshStandardMaterial({ color: fc, roughness: 0.9, emissive: fc, emissiveIntensity: 0.18 })
    );
    flower.position.set(Math.cos(angle) * r, 0.55 + Math.random() * 0.15, Math.sin(angle) * r);
    flower.castShadow = true; group.add(flower);
  }
  const flowerRing = new THREE.Mesh(new THREE.TorusGeometry(10.3, 0.4, 8, 64), stoneMat);
  flowerRing.rotation.x = -Math.PI / 2; flowerRing.position.y = 0.4; flowerRing.receiveShadow = true;
  group.add(flowerRing);

  scene.add(group);
  terrain.meshes.push(group);
  terrain.fountainRadius = 10.7;
}

function buildLavaPool() {
  const rockMat     = new THREE.MeshStandardMaterial({ color: 0x3A2A24, roughness: 0.95, metalness: 0.05, flatShading: true });
  const rockMat2    = new THREE.MeshStandardMaterial({ color: 0x4A3028, roughness: 0.92, metalness: 0.06, flatShading: true, emissive: 0x2A0C00, emissiveIntensity: 0.5 });
  const lavaMat     = new THREE.MeshBasicMaterial({ color: 0xFF6A10 });
  const lavaGlowMat = new THREE.MeshBasicMaterial({ color: 0xFFB040, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

  const group = new THREE.Group();
  const pool = new THREE.Mesh(new THREE.CircleGeometry(9, 48), lavaMat);
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.35; group.add(pool);
  const glow = new THREE.Mesh(new THREE.RingGeometry(8.6, 10.6, 48), lavaGlowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.4; group.add(glow);
  const rimCount = 22;
  for (let i = 0; i < rimCount; i++) {
    const a = (i / rimCount) * Math.PI * 2;
    const rr = 9.6 + Math.random() * 0.9;
    const s = 0.9 + Math.random() * 0.9;
    const rock = new THREE.Mesh(new THREE.ConeGeometry(0.9 * s, 1.4 * s, 5), i % 2 ? rockMat : rockMat2);
    rock.position.set(Math.cos(a) * rr, 0.3 + Math.random() * 0.3, Math.sin(a) * rr);
    rock.rotation.y = Math.random() * Math.PI;
    rock.rotation.z = (Math.random() - 0.5) * 0.4;
    rock.castShadow = true; group.add(rock);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(10.3, 0.5, 8, 48), rockMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15; ring.receiveShadow = true;
  group.add(ring);

  scene.add(group);
  terrain.meshes.push(group);
  terrain.fountainRadius = 10.7;
}

function buildStatue() {
  const stoneMat     = new THREE.MeshStandardMaterial({ color: 0xC8BFA8, roughness: 0.85, metalness: 0.05 });
  const stoneDarkMat = new THREE.MeshStandardMaterial({ color: 0x9A9080, roughness: 0.88, metalness: 0.05 });

  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.5, 1.0, 48), stoneDarkMat);
  base.position.y = 0.5; base.receiveShadow = true; base.castShadow = true; group.add(base);
  const base2 = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 8.2, 0.5, 48), stoneMat);
  base2.position.y = 1.2; base2.receiveShadow = true; group.add(base2);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 2.4, 20), stoneMat);
  pedestal.position.y = 2.6; pedestal.castShadow = true; group.add(pedestal);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 1.0), stoneMat);
  legs.position.y = 5.1; legs.castShadow = true; group.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.6, 1.2), stoneMat);
  torso.position.y = 7.5; torso.castShadow = true; group.add(torso);
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.6, 1.2), stoneMat);
  shoulders.position.y = 8.6; shoulders.castShadow = true; group.add(shoulders);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 9), stoneMat);
  head.position.y = 9.7; head.castShadow = true; group.add(head);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.62, 2.6, 0.7), stoneMat);
    arm.position.set(sx * 1.55, 7.0, 0.05);
    arm.rotation.z = sx * 0.14;
    arm.castShadow = true; group.add(arm);
  }
  const flowerColors = [0xFF4080, 0xFFD040, 0x80C0FF, 0xFF8040, 0xFF60D0];
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const r = 9.9 + Math.random() * 0.2;
    const fc = flowerColors[i % flowerColors.length];
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.32 + Math.random() * 0.1, 6, 5),
      new THREE.MeshStandardMaterial({ color: fc, roughness: 0.9, emissive: fc, emissiveIntensity: 0.18 })
    );
    flower.position.set(Math.cos(angle) * r, 0.55 + Math.random() * 0.15, Math.sin(angle) * r);
    flower.castShadow = true; group.add(flower);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(10.3, 0.4, 8, 64), stoneMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.4; ring.receiveShadow = true;
  group.add(ring);

  scene.add(group);
  terrain.meshes.push(group);
  terrain.fountainRadius = 10.7;
}

function buildFishTank() {
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x9EE0F0, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.28, side: THREE.DoubleSide, emissive: 0x104060, emissiveIntensity: 0.3 });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2070B0, roughness: 0.2,  metalness: 0.2, transparent: true, opacity: 0.75, emissive: 0x104880, emissiveIntensity: 0.55 });
  const baseMat  = new THREE.MeshStandardMaterial({ color: 0x203040, roughness: 0.5,  metalness: 0.6 });

  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.5, 1.0, 48), baseMat);
  base.position.y = 0.5; base.receiveShadow = true; base.castShadow = true; group.add(base);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 8.2, 8.4, 36), waterMat);
  water.position.y = 5.2; group.add(water);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(8.7, 8.7, 9.4, 36, 1, true), glassMat);
  glass.position.y = 5.7; group.add(glass);
  const topRing = new THREE.Mesh(new THREE.TorusGeometry(8.7, 0.4, 8, 40), baseMat);
  topRing.rotation.x = -Math.PI / 2; topRing.position.y = 10.4; group.add(topRing);
  const botRing = new THREE.Mesh(new THREE.TorusGeometry(8.7, 0.4, 8, 40), baseMat);
  botRing.rotation.x = -Math.PI / 2; botRing.position.y = 1.0; group.add(botRing);
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = Math.random() * 7;
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.1 + Math.random() * 0.22, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xC8F0FF, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    bubble.position.set(Math.cos(a) * rr, 1.4 + Math.random() * 8.4, Math.sin(a) * rr);
    group.add(bubble);
  }
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = Math.random() * 6.8;
    const y = 1.8 + Math.random() * 7.6;
    const fishColor = [0xFF8040, 0xFFD040, 0xFF4080, 0x60E0FF, 0x80FF80][i % 5];
    const fishMat = new THREE.MeshStandardMaterial({ color: fishColor, roughness: 0.5, emissive: fishColor, emissiveIntensity: 0.35 });
    const fish = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.75, 6), fishMat);
    fish.rotation.z = Math.PI / 2;
    fish.rotation.y = Math.random() * Math.PI * 2;
    fish.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
    group.add(fish);
  }

  scene.add(group);
  terrain.meshes.push(group);
  terrain.fountainRadius = 10.7;
}

/* ---------- 🌙 梦境：浮空水晶簇 ---------- */
function buildDreamSpire() {
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x40266A, roughness: 0.5, metalness: 0.45, emissive: 0x1A0A40, emissiveIntensity: 0.45 });
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0xC080FF, roughness: 0.08, metalness: 0.45, transparent: true, opacity: 0.85, emissive: 0x6030C0, emissiveIntensity: 0.75 });
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xFF90E0, roughness: 0.10, metalness: 0.40, transparent: true, opacity: 0.82, emissive: 0xA03080, emissiveIntensity: 0.70 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xE0A0FF, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.5, 1.0, 48), baseMat);
  base.position.y = 0.5; base.receiveShadow = true; base.castShadow = true; group.add(base);
  const base2 = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 8.0, 0.6, 48), baseMat);
  base2.position.y = 1.2; base2.receiveShadow = true; group.add(base2);

  /* 中心大水晶 */
  const center = new THREE.Mesh(new THREE.OctahedronGeometry(2.4, 0), crystalMat);
  center.scale.set(0.7, 2.0, 0.7);
  center.position.y = 4.6; center.castShadow = true; group.add(center);

  /* 环绕小水晶 */
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 5.5;
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.9 + Math.random() * 0.6, 0), i % 2 ? crystalMat : pinkMat);
    shard.scale.set(0.6, 1.6, 0.6);
    shard.position.set(Math.cos(a) * r, 2.4 + Math.random() * 1.6, Math.sin(a) * r);
    shard.rotation.y = Math.random() * Math.PI;
    shard.castShadow = true; group.add(shard);
  }

  /* 浮空光球 */
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 6;
    const y = 3 + Math.random() * 6;
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.20 + Math.random() * 0.18, 8, 6), glowMat);
    orb.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    group.add(orb);
  }

  /* 光环 */
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(9.5, 0.35, 8, 48), glowMat);
  ring1.rotation.x = -Math.PI / 2; ring1.position.y = 0.45; group.add(ring1);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.22, 8, 40), glowMat);
  ring2.rotation.x = -Math.PI / 2; ring2.position.y = 1.10; group.add(ring2);

  scene.add(group);
  terrain.meshes.push(group);
  terrain.fountainRadius = 10.7;
}

/* ---------- ☁️ 天堂：云台 + 光柱 ---------- */
function buildHeavenGate() {
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.75, metalness: 0.05, emissive: 0xFFF0D0, emissiveIntensity: 0.35 });
  const goldMat  = new THREE.MeshStandardMaterial({ color: 0xE8C870, roughness: 0.22, metalness: 1.0, emissive: 0x604010, emissiveIntensity: 0.45 });
  const pearlMat = new THREE.MeshStandardMaterial({ color: 0xFFFBE0, roughness: 0.08, metalness: 0.4, emissive: 0xFFE8A0, emissiveIntensity: 0.55, transparent: true, opacity: 0.92 });
  const beamMat  = new THREE.MeshBasicMaterial({ color: 0xFFF8C0, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

  const group = new THREE.Group();
  /* 云台底座 */
  const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.5, 1.0, 48), pearlMat);
  base.position.y = 0.5; base.receiveShadow = true; base.castShadow = true; group.add(base);

  /* 云朵 */
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 8.4 + Math.random() * 1.2;
    const s = 1.0 + Math.random() * 0.7;
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), cloudMat);
    cloud.scale.set(1.0, 0.6, 1.0);
    cloud.position.set(Math.cos(a) * r, 1.2 + Math.random() * 0.4, Math.sin(a) * r);
    cloud.castShadow = true; group.add(cloud);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const r = 5.2;
    const s = 1.3 + Math.random() * 0.8;
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), cloudMat);
    cloud.scale.set(1.0, 0.55, 1.0);
    cloud.position.set(Math.cos(a) * r, 1.6 + Math.random() * 0.5, Math.sin(a) * r);
    cloud.castShadow = true; group.add(cloud);
  }

  /* 中心金色拱门 */
  const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 6.0, 12), goldMat);
  pillarL.position.set(-2.4, 4.0, 0); pillarL.castShadow = true; group.add(pillarL);
  const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 6.0, 12), goldMat);
  pillarR.position.set(2.4, 4.0, 0); pillarR.castShadow = true; group.add(pillarR);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.42, 8, 24, Math.PI), goldMat);
  arch.position.set(0, 7.0, 0); arch.rotation.z = 0; group.add(arch);

  /* 顶部宝珠 */
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 10), pearlMat);
  orb.position.set(0, 9.6, 0); orb.castShadow = true; group.add(orb);

  /* 光柱（多层圆锥） */
  for (let i = 0; i < 3; i++) {
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.0 - i * 0.2, 10 + i * 2, 16, 1, true), beamMat);
    beam.position.set(0, 5.0, 0);
    beam.rotation.x = 0;
    group.add(beam);
  }

  /* 光环 */
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(10.3, 0.42, 8, 64), goldMat);
  ring1.rotation.x = -Math.PI / 2; ring1.position.y = 0.45; ring1.receiveShadow = true; group.add(ring1);

  scene.add(group);
  terrain.meshes.push(group);
  terrain.fountainRadius = 10.7;
}

/* ---------- 🎡 游乐园：旋转木马 ---------- */
function buildCarousel() {
  const baseMat   = new THREE.MeshStandardMaterial({ color: 0xFFE0A0, roughness: 0.55, metalness: 0.25, emissive: 0x805020, emissiveIntensity: 0.18 });
  const poleMat   = new THREE.MeshStandardMaterial({ color: 0xE8C870, roughness: 0.30, metalness: 0.85 });
  const roofMat   = new THREE.MeshStandardMaterial({ color: 0xFF4080, roughness: 0.45, metalness: 0.25, emissive: 0x800020, emissiveIntensity: 0.30, side: THREE.DoubleSide });
  const roofRimMat= new THREE.MeshStandardMaterial({ color: 0xFFD040, roughness: 0.35, metalness: 0.55 });

  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.5, 1.0, 48), baseMat);
  base.position.y = 0.5; base.receiveShadow = true; base.castShadow = true; group.add(base);
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 8.2, 0.6, 48), baseMat);
  stage.position.y = 1.1; stage.receiveShadow = true; group.add(stage);

  /* 中心柱 */
  const centerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 6.0, 14), poleMat);
  centerPole.position.y = 4.4; centerPole.castShadow = true; group.add(centerPole);

  /* 顶部伞盖 */
  const roof = new THREE.Mesh(new THREE.ConeGeometry(9.0, 2.2, 24, 1, true), roofMat);
  roof.position.y = 7.9; roof.castShadow = true; group.add(roof);
  /* 伞盖顶部小旗 */
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 6), poleMat);
  flagPole.position.y = 9.9; group.add(flagPole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), roofRimMat);
  flag.position.set(0.5, 10.4, 0); group.add(flag);

  /* 伞盖边缘锯齿装饰 */
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = 8.7;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 4), roofRimMat);
    tip.rotation.y = Math.PI / 4;
    tip.position.set(Math.cos(a) * r, 6.85, Math.sin(a) * r);
    group.add(tip);
  }

  /* 8 匹木马：简化的杆 + 椭圆身 + 头 + 4 条腿 */
  const horseColors = [0xFF6AA8, 0xFFD040, 0x60D0FF, 0x80FF80, 0xC080FF, 0xFF8060, 0xFFE0F0, 0x80E0C0];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 5.8;
    const hx = Math.cos(a) * r, hz = Math.sin(a) * r;
    const hMat = new THREE.MeshStandardMaterial({ color: horseColors[i], roughness: 0.5, metalness: 0.2, emissive: horseColors[i], emissiveIntensity: 0.18 });

    /* 立杆 */
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.5, 8), poleMat);
    rod.position.set(hx, 3.7, hz); rod.castShadow = true; group.add(rod);

    /* 马身 */
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 7), hMat);
    body.scale.set(1.5, 0.9, 0.75);
    body.position.set(hx, 4.0, hz); body.castShadow = true; group.add(body);

    /* 马头 */
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), hMat);
    head.scale.set(0.85, 1.1, 0.85);
    head.position.set(hx + Math.cos(a) * 0.85, 4.6, hz + Math.sin(a) * 0.85); head.castShadow = true; group.add(head);

    /* 四腿（小圆柱） */
    for (const lx of [-0.55, 0.55]) {
      for (const lz of [-0.35, 0.35]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.1, 6), hMat);
        leg.position.set(hx + lx, 3.4, hz + lz); group.add(leg);
      }
    }
  }

  /* 底部光环 */
  const ring = new THREE.Mesh(new THREE.TorusGeometry(10.3, 0.42, 8, 64), roofRimMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.45; ring.receiveShadow = true; group.add(ring);

  scene.add(group);
  terrain.meshes.push(group);
  terrain.fountainRadius = 10.7;
}

/* ---------- 🔥 地狱：熔岩柱 + 骨门 ---------- */
function buildHellThrone() {
  const rockMat    = new THREE.MeshStandardMaterial({ color: 0x1A0808, roughness: 0.95, metalness: 0.10, flatShading: true });
  const rockMat2   = new THREE.MeshStandardMaterial({ color: 0x2A0A08, roughness: 0.92, metalness: 0.10, emissive: 0x4A0808, emissiveIntensity: 0.55 });
  const lavaMat    = new THREE.MeshBasicMaterial({ color: 0xFF4010 });
  const lavaGlowMat= new THREE.MeshBasicMaterial({ color: 0xFF8030, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const boneMat    = new THREE.MeshStandardMaterial({ color: 0xD8D0B0, roughness: 0.75, metalness: 0.10 });
  const skullMat   = new THREE.MeshStandardMaterial({ color: 0xE8E0C0, roughness: 0.70, metalness: 0.10 });

  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.5, 1.0, 48), rockMat);
  base.position.y = 0.5; base.receiveShadow = true; base.castShadow = true; group.add(base);

  /* 熔岩池 */
  const pool = new THREE.Mesh(new THREE.CircleGeometry(8.0, 48), lavaMat);
  pool.rotation.x = -Math.PI / 2; pool.position.y = 1.1; group.add(pool);
  const glow = new THREE.Mesh(new THREE.RingGeometry(7.6, 10.2, 48), lavaGlowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = 1.15; group.add(glow);

  /* 4 根熔岩柱 */
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const r = 6.0;
    const h = 4.0 + Math.random() * 1.5;
    const pillar = new THREE.Mesh(new THREE.ConeGeometry(0.9, h, 6), rockMat2);
    pillar.position.set(Math.cos(a) * r, 1.0 + h / 2, Math.sin(a) * r);
    pillar.rotation.y = Math.random() * Math.PI;
    pillar.castShadow = true; group.add(pillar);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lavaGlowMat);
    tip.position.set(Math.cos(a) * r, 1.0 + h + 0.2, Math.sin(a) * r); group.add(tip);
  }

  /* 中心骨门（拱形） */
  const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 6.5, 10), boneMat);
  pL.position.set(-1.8, 4.25, 0); pL.castShadow = true; group.add(pL);
  const pR = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 6.5, 10), boneMat);
  pR.position.set(1.8, 4.25, 0); pR.castShadow = true; group.add(pR);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.38, 8, 20, Math.PI), boneMat);
  arch.position.set(0, 7.5, 0); group.add(arch);

  /* 拱顶骷髅 */
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), skullMat);
  skull.scale.set(1.0, 0.95, 1.05);
  skull.position.set(0, 9.6, 0); skull.castShadow = true; group.add(skull);
  for (const sx of [-0.30, 0.30]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), rockMat);
    socket.position.set(sx, 9.75, 0.75); group.add(socket);
  }
  /* 下颚 */
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.55), skullMat);
  jaw.position.set(0, 9.15, 0.55); group.add(jaw);
  for (let i = 0; i < 5; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 4), skullMat);
    tooth.rotation.x = Math.PI; tooth.position.set(-0.28 + i * 0.14, 9.02, 0.62); group.add(tooth);
  }

  /* 骨头散落装饰 */
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 5.5 + Math.random() * 3.5;
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 1.0 + Math.random() * 0.6, 6), boneMat);
    bone.position.set(Math.cos(a) * r, 1.2, Math.sin(a) * r);
    bone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    bone.castShadow = true; group.add(bone);
  }

  /* 底部光环（暗红） */
  const ring = new THREE.Mesh(new THREE.TorusGeometry(10.3, 0.5, 8, 64), rockMat2);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.45; ring.receiveShadow = true; group.add(ring);

  scene.add(group);
  terrain.meshes.push(group);
  terrain.fountainRadius = 10.7;
}

/* ============================================================
   3. 道路 + 路灯
   ============================================================ */
function buildRoadsAndLamps(mapType) {
  const roadWidth = 12;
  const roadStart = 11;
  const roadEnd = 197;
  const roadLen = roadEnd - roadStart;
  const roadCenter = (roadStart + roadEnd) / 2;

  const roadMat = makeRoadMat(mapType);

  for (const sign of [-1, 1]) {
    const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, roadLen), roadMat);
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.position.set(0, 0.02, sign * roadCenter);
    roadZ.receiveShadow = true;
    scene.add(roadZ);
    terrain.meshes.push(roadZ);

    const roadX = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, roadLen), roadMat);
    roadX.rotation.x = -Math.PI / 2;
    roadX.rotation.z = Math.PI / 2;
    roadX.position.set(sign * roadCenter, 0.02, 0);
    roadX.receiveShadow = true;
    scene.add(roadX);
    terrain.meshes.push(roadX);
  }

  const lampOffset = roadWidth / 2 + 2;
  const lampStyle = LAMP_STYLE[mapType] || 'normal';
  for (const sign of [-1, 1]) {
    for (let d = roadStart + 15; d < roadEnd - 5; d += Tuning.Terrain.lampSpacing) {
      spawnLamp( lampOffset, sign * d, lampStyle);
      spawnLamp(-lampOffset, sign * d, lampStyle);
      spawnLamp(sign * d,  lampOffset, lampStyle);
      spawnLamp(sign * d, -lampOffset, lampStyle);
    }
  }
}

function spawnLamp(x, z, style) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  if (style === 'blue') {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x204060, roughness: 0.35, metalness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x60C8FF, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85, emissive: 0x2080D0, emissiveIntensity: 1.2 });
    const base = new THREE.Mesh(SHARED_GEO.lampBase, poleMat);
    base.position.y = 0.15; base.castShadow = true; g.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 4.2, 10), poleMat);
    pole.position.y = 2.3; pole.castShadow = true; g.add(pole);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.6, 12), glassMat);
    glow.position.y = 5.0; g.add(glow);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.16, 12), poleMat);
    cap.position.y = 5.9; g.add(cap);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), glassMat);
    top.position.y = 6.15; g.add(top);

  } else if (style === 'dream') {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3A2060, roughness: 0.45, metalness: 0.65, emissive: 0x3010A0, emissiveIntensity: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xE0A0FF, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85, emissive: 0x8040E0, emissiveIntensity: 1.35 });
    const base = new THREE.Mesh(SHARED_GEO.lampBase, poleMat);
    base.position.y = 0.15; base.castShadow = true; g.add(base);
    const pole = new THREE.Mesh(SHARED_GEO.lampPole, poleMat);
    pole.position.y = 3.3; pole.castShadow = true; g.add(pole);
    const arm = new THREE.Mesh(SHARED_GEO.lampArm, poleMat);
    arm.rotation.z = Math.PI / 2; arm.position.set(0.6, 6.2, 0); g.add(arm);
    const head = new THREE.Mesh(SHARED_GEO.lampHead, poleMat);
    head.position.set(1.15, 6.1, 0); g.add(head);
    const bulb = new THREE.Mesh(SHARED_GEO.lampBulb, glassMat);
    bulb.position.set(1.15, 5.9, 0); g.add(bulb);

  } else if (style === 'heaven') {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xE8C870, roughness: 0.28, metalness: 0.95 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xFFF8D0 });
    const base = new THREE.Mesh(SHARED_GEO.lampBase, poleMat);
    base.position.y = 0.15; base.castShadow = true; g.add(base);
    const pole = new THREE.Mesh(SHARED_GEO.lampPole, poleMat);
    pole.position.y = 3.3; pole.castShadow = true; g.add(pole);
    const arm = new THREE.Mesh(SHARED_GEO.lampArm, poleMat);
    arm.rotation.z = Math.PI / 2; arm.position.set(0.6, 6.2, 0); g.add(arm);
    const head = new THREE.Mesh(SHARED_GEO.lampHead, poleMat);
    head.position.set(1.15, 6.1, 0); g.add(head);
    const bulb = new THREE.Mesh(SHARED_GEO.lampBulb, glassMat);
    bulb.position.set(1.15, 5.9, 0); g.add(bulb);
    /* 顶部小装饰 */
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 6, 16), poleMat);
    halo.position.set(1.15, 6.25, 0); halo.rotation.x = Math.PI / 2; g.add(halo);

  } else if (style === 'amusement') {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xFF4080, roughness: 0.4, metalness: 0.6 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xFFF080 });
    const base = new THREE.Mesh(SHARED_GEO.lampBase, poleMat);
    base.position.y = 0.15; base.castShadow = true; g.add(base);
    const pole = new THREE.Mesh(SHARED_GEO.lampPole, poleMat);
    pole.position.y = 3.3; pole.castShadow = true; g.add(pole);
    const arm = new THREE.Mesh(SHARED_GEO.lampArm, poleMat);
    arm.rotation.z = Math.PI / 2; arm.position.set(0.6, 6.2, 0); g.add(arm);
    const head = new THREE.Mesh(SHARED_GEO.lampHead, poleMat);
    head.position.set(1.15, 6.1, 0); g.add(head);
    const bulb = new THREE.Mesh(SHARED_GEO.lampBulb, glassMat);
    bulb.position.set(1.15, 5.9, 0); g.add(bulb);
    /* 彩色小灯 */
    for (let i = 0; i < 5; i++) {
      const lightColor = [0xFF4080, 0xFFD040, 0x60D0FF, 0x80FF80, 0xC080FF][i];
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.10, 6, 5), new THREE.MeshBasicMaterial({ color: lightColor }));
      dot.position.set(0.6, 5.6 + i * 0.14, 0); g.add(dot);
    }

  } else if (style === 'hell') {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2A0808, roughness: 0.85, metalness: 0.3, emissive: 0x400808, emissiveIntensity: 0.55 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xFF6020 });
    const base = new THREE.Mesh(SHARED_GEO.lampBase, poleMat);
    base.position.y = 0.15; base.castShadow = true; g.add(base);
    const pole = new THREE.Mesh(SHARED_GEO.lampPole, poleMat);
    pole.position.y = 3.3; pole.castShadow = true; g.add(pole);
    /* 顶部火焰 */
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 8), flameMat);
    flame.position.y = 6.7; g.add(flame);
    const flameInner = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 8), new THREE.MeshBasicMaterial({ color: 0xFFD060 }));
    flameInner.position.y = 6.55; g.add(flameInner);

  } else {
    const poleMat = style === 'lava'
      ? new THREE.MeshStandardMaterial({ color: 0x3A2620, roughness: 0.55, metalness: 0.7, emissive: 0x400C00, emissiveIntensity: 0.6 })
      : new THREE.MeshStandardMaterial({ color: 0x3A3A40, roughness: 0.5, metalness: 0.85 });
    const lightMat = new THREE.MeshBasicMaterial({ color: style === 'lava' ? 0xFF9A40 : 0xFFEE80 });
    const base = new THREE.Mesh(SHARED_GEO.lampBase, poleMat);
    base.position.y = 0.15; base.castShadow = true; g.add(base);
    const pole = new THREE.Mesh(SHARED_GEO.lampPole, poleMat);
    pole.position.y = 3.3; pole.castShadow = true; g.add(pole);
    const arm = new THREE.Mesh(SHARED_GEO.lampArm, poleMat);
    arm.rotation.z = Math.PI / 2; arm.position.set(0.6, 6.2, 0); arm.castShadow = true; g.add(arm);
    const lampHead = new THREE.Mesh(SHARED_GEO.lampHead, poleMat);
    lampHead.position.set(1.15, 6.1, 0); lampHead.castShadow = true; g.add(lampHead);
    const bulb = new THREE.Mesh(SHARED_GEO.lampBulb, lightMat);
    bulb.position.set(1.15, 5.9, 0); g.add(bulb);
  }

  scene.add(g);
  terrain.destructibles.push({ group: g, type: 'lamp', x, z, radius: 1.0, broken: false, fade: 1.0, materials: null });
  terrain.meshes.push(g);
}

/* ============================================================
   4. 大门
   ============================================================ */
function buildGate(angle, palette) {
  const R = 198.4;
  const g = new THREE.Group();
  g.position.set(Math.sin(angle) * R, 0, Math.cos(angle) * R);
  g.rotation.y = angle + Math.PI;

  const P = palette || GATE_PALETTES.default;
  const ironMat     = new THREE.MeshStandardMaterial({ color: P.iron, roughness: 0.46, metalness: 0.94 });
  const darkIronMat = new THREE.MeshStandardMaterial({ color: P.darkIron, roughness: 0.62, metalness: 0.88 });
  const brassMat    = new THREE.MeshStandardMaterial({ color: P.brass, roughness: 0.30, metalness: 0.98 });

  const W = 17, H = 9;
  const barGeo = new THREE.CylinderGeometry(0.15, 0.15, H, 6);
  const tipGeo = new THREE.ConeGeometry(0.28, 0.72, 4);

  const barCount = 11;
  for (let i = 0; i < barCount; i++) {
    const x = -W / 2 + (i + 0.5) * (W / barCount);
    const bar = new THREE.Mesh(barGeo, ironMat);
    bar.position.set(x, H / 2, 0); g.add(bar);
    const tip = new THREE.Mesh(tipGeo, ironMat);
    tip.position.set(x, H + 0.36, 0);
    tip.rotation.y = Math.PI / 4;
    g.add(tip);
  }
  for (const y of [1.0, 4.5, H - 0.9]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(W + 0.9, 0.34, 0.36), darkIronMat);
    rail.position.set(0, y, 0); g.add(rail);
  }
  for (const sx of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, H + 1.4, 1.2), ironMat);
    pillar.position.set(sx * (W / 2 + 0.5), (H + 1.4) / 2, 0); g.add(pillar);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.05, 4), ironMat);
    cap.position.set(sx * (W / 2 + 0.5), H + 1.92, 0);
    cap.rotation.y = Math.PI / 4;
    g.add(cap);
  }
  const seamL = new THREE.Mesh(new THREE.BoxGeometry(0.5, H, 0.62), darkIronMat);
  seamL.position.set(-0.52, H / 2, 0.05); g.add(seamL);
  const seamR = new THREE.Mesh(new THREE.BoxGeometry(0.5, H, 0.62), darkIronMat);
  seamR.position.set(0.52, H / 2, 0.05); g.add(seamR);
  const plateRim = new THREE.Mesh(new THREE.BoxGeometry(3.9, 3.5, 0.34), brassMat);
  plateRim.position.set(0, 4.6, 0.36); g.add(plateRim);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.0, 0.55), darkIronMat);
  plate.position.set(0, 4.6, 0.52); g.add(plate);
  const keyRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.14, 8, 22), brassMat);
  keyRing.position.set(0, 3.92, 0.88); g.add(keyRing);
  const keyHole = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.42, 8), brassMat);
  keyHole.rotation.x = Math.PI / 2; keyHole.position.set(0, 5.05, 0.88); g.add(keyHole);
  const keySlot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.42), brassMat);
  keySlot.position.set(0, 4.70, 0.88); g.add(keySlot);
  const rivetGeo = new THREE.SphereGeometry(0.13, 6, 5);
  for (const y of [1.0, 4.5, H - 0.9]) {
    for (let i = 0; i < 8; i++) {
      const x = -W / 2 + 1.2 + i * (W - 2.4) / 7;
      const rv = new THREE.Mesh(rivetGeo, brassMat);
      rv.position.set(x, y, 0.22); g.add(rv);
    }
  }
  const kick = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, 0.5, 0.95), darkIronMat);
  kick.position.set(0, 0.25, 0.1); g.add(kick);
  return g;
}

function buildCrystalGate(angle) {
  const R = 198.4;
  const g = new THREE.Group();
  g.position.set(Math.sin(angle) * R, 0, Math.cos(angle) * R);
  g.rotation.y = angle + Math.PI;
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0x60C8FF, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.72, emissive: 0x2080C0, emissiveIntensity: 0.75 });
  const darkMat    = new THREE.MeshStandardMaterial({ color: 0x1A3A5A, roughness: 0.3, metalness: 0.7 });
  const W = 17, H = 9;
  const barGeo = new THREE.CylinderGeometry(0.28, 0.28, H, 6);
  const tipGeo = new THREE.ConeGeometry(0.42, 1.2, 6);
  const barCount = 9;
  for (let i = 0; i < barCount; i++) {
    const x = -W / 2 + (i + 0.5) * (W / barCount);
    const bar = new THREE.Mesh(barGeo, crystalMat);
    bar.position.set(x, H / 2, 0); g.add(bar);
    const tip = new THREE.Mesh(tipGeo, crystalMat);
    tip.position.set(x, H + 0.6, 0); g.add(tip);
  }
  for (const y of [1.0, H - 1.2]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(W + 0.9, 0.4, 0.4), darkMat);
    rail.position.set(0, y, 0); g.add(rail);
  }
  for (const sx of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, H + 2, 6), crystalMat);
    pillar.position.set(sx * (W / 2 + 0.6), (H + 2) / 2, 0); g.add(pillar);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.6, 6), crystalMat);
    cap.position.set(sx * (W / 2 + 0.6), H + 2.8, 0); g.add(cap);
  }
  const centerGem = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), crystalMat);
  centerGem.position.set(0, 4.6, 0.3); g.add(centerGem);
  return g;
}

function buildGates(mapType) {
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    let gate;
    if (mapType === 'aquarium') {
      gate = buildCrystalGate(angle);
    } else {
      const palette = GATE_PALETTES[mapType] || GATE_PALETTES.default;
      gate = buildGate(angle, palette);
    }
    scene.add(gate);
    terrain.meshes.push(gate);
  }
}

/* ============================================================
   5. 散布植被
   ============================================================ */
function buildScatterObjects(mapType) {
  const minRoadDist = 11;
  const minFountainDist = 16;
  const targetCount = Tuning.Terrain.treeCount;

  let spawnFn = spawnTree;
  if (mapType === 'volcano') spawnFn = spawnRock;
  else if (mapType === 'desert') spawnFn = spawnCactus;
  else if (mapType === 'aquarium') spawnFn = spawnCrystal;
  else if (mapType === 'dream') spawnFn = spawnDreamShard;
  else if (mapType === 'heaven') spawnFn = spawnCloudPillar;
  else if (mapType === 'amusement') spawnFn = spawnBalloon;
  else if (mapType === 'hell') spawnFn = spawnBone;

  let placed = 0;
  for (let i = 0; i < 300 && placed < targetCount; i++) {
    const x = (Math.random() - 0.5) * 360;
    const z = (Math.random() - 0.5) * 360;
    const r = Math.hypot(x, z);
    if (r > 188 || r < minFountainDist) continue;
    if (Math.abs(x) < minRoadDist || Math.abs(z) < minRoadDist) continue;
    let tooClose = false;
    for (const d of terrain.destructibles) {
      const dx = x - d.x, dz = z - d.z;
      if (dx * dx + dz * dz < 64) { tooClose = true; break; }
    }
    if (tooClose) continue;
    spawnFn(x, z);
    placed++;
  }
}

function spawnTree(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * Math.PI * 2;
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5A3A20, roughness: 0.9, metalness: 0.05 });
  const leafMat  = new THREE.MeshStandardMaterial({ color: 0x3A7028, roughness: 0.9, metalness: 0.05, flatShading: true });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x2D5A1A, roughness: 0.9, metalness: 0.05, flatShading: true });
  const trunk = new THREE.Mesh(SHARED_GEO.treeTrunk, trunkMat);
  trunk.position.y = 1.75; trunk.castShadow = true; g.add(trunk);
  const crown1 = new THREE.Mesh(SHARED_GEO.treeCrown1, leafMat);
  crown1.position.y = 4.5; crown1.castShadow = true; g.add(crown1);
  const crown2 = new THREE.Mesh(SHARED_GEO.treeCrown2, leafMat2);
  crown2.position.set(0.8, 5.5, 0.5); crown2.castShadow = true; g.add(crown2);
  const crown3 = new THREE.Mesh(SHARED_GEO.treeCrown3, leafMat);
  crown3.position.set(-0.7, 5.3, -0.6); crown3.castShadow = true; g.add(crown3);
  scene.add(g);
  terrain.destructibles.push({ group: g, type: 'tree', x, z, radius: 1.6, broken: false, fade: 1.0, materials: null });
  terrain.meshes.push(g);
}

function spawnRock(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * Math.PI * 2;
  const rockMat  = new THREE.MeshStandardMaterial({ color: 0x5A4038, roughness: 0.92, metalness: 0.06, flatShading: true, emissive: 0x2A0A00, emissiveIntensity: 0.5 });
  const rockMat2 = new THREE.MeshStandardMaterial({ color: 0x3A2A24, roughness: 0.95, metalness: 0.05, flatShading: true });
  const h = 2.2 + Math.random() * 2.4;
  const r = 1.0 + Math.random() * 0.7;
  const main = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5 + Math.floor(Math.random() * 3)), rockMat);
  main.position.y = h / 2; main.castShadow = true; g.add(main);
  const s1 = new THREE.Mesh(new THREE.ConeGeometry(r * 0.6, h * 0.6, 5), rockMat2);
  s1.position.set(r * 0.7, h * 0.3, r * 0.4); s1.rotation.z = 0.35; s1.castShadow = true; g.add(s1);
  scene.add(g);
  terrain.destructibles.push({ group: g, type: 'rock', x, z, radius: 1.5, broken: false, fade: 1.0, materials: null });
  terrain.meshes.push(g);
}

function spawnCactus(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * Math.PI * 2;
  const cactusMat = new THREE.MeshStandardMaterial({ color: 0x3E7A3A, roughness: 0.85, metalness: 0.02, emissive: 0x0A2008, emissiveIntensity: 0.25 });
  const h = 2.8 + Math.random() * 2.0;
  const r = 0.42 + Math.random() * 0.16;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, h, 8), cactusMat);
  trunk.position.y = h / 2; trunk.castShadow = true; g.add(trunk);
  const topCap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.9, 8, 5), cactusMat);
  topCap.position.y = h; topCap.scale.y = 0.7; topCap.castShadow = true; g.add(topCap);
  const armCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < armCount; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const ay = h * (0.45 + Math.random() * 0.3);
    const armH = h * (0.35 + Math.random() * 0.25);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, armH, 8), cactusMat);
    arm.position.set(side * (r + 0.42), ay, 0); arm.rotation.z = side * -0.4; arm.castShadow = true; g.add(arm);
    const armTop = new THREE.Mesh(new THREE.SphereGeometry(r * 0.62, 8, 5), cactusMat);
    armTop.position.set(side * (r + 0.42) - side * 0.28, ay + armH * 0.5, 0);
    armTop.scale.y = 0.7; armTop.castShadow = true; g.add(armTop);
  }
  scene.add(g);
  terrain.destructibles.push({ group: g, type: 'cactus', x, z, radius: 1.5, broken: false, fade: 1.0, materials: null });
  terrain.meshes.push(g);
}

function spawnCrystal(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * Math.PI * 2;
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0x50C8FF, roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.85, emissive: 0x2060A0, emissiveIntensity: 0.85 });
  const h = 2.4 + Math.random() * 2.6;
  const r = 0.5 + Math.random() * 0.35;
  const main = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), crystalMat);
  main.position.y = h / 2; main.castShadow = true; g.add(main);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.3, r * 1.5, 0.4, 6), crystalMat);
  base.position.y = 0.2; g.add(base);
  for (let i = 0; i < 2; i++) {
    const sr = r * (0.4 + Math.random() * 0.25);
    const sh = h * (0.45 + Math.random() * 0.3);
    const side = new THREE.Mesh(new THREE.ConeGeometry(sr, sh, 6), crystalMat);
    const a = Math.random() * Math.PI * 2;
    side.position.set(Math.cos(a) * (r + 0.35), sh / 2, Math.sin(a) * (r + 0.35));
    side.rotation.z = (Math.random() - 0.5) * 0.4;
    side.rotation.x = (Math.random() - 0.5) * 0.4;
    side.castShadow = true; g.add(side);
  }
  scene.add(g);
  terrain.destructibles.push({ group: g, type: 'crystal', x, z, radius: 1.5, broken: false, fade: 1.0, materials: null });
  terrain.meshes.push(g);
}

/* ---------- 🌙 梦境：漂浮水晶碎块 ---------- */
function spawnDreamShard(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * Math.PI * 2;
  const purple = new THREE.MeshStandardMaterial({ color: 0xA060FF, roughness: 0.10, metalness: 0.40, transparent: true, opacity: 0.88, emissive: 0x5020C0, emissiveIntensity: 0.75 });
  const pink   = new THREE.MeshStandardMaterial({ color: 0xFF90E0, roughness: 0.10, metalness: 0.40, transparent: true, opacity: 0.85, emissive: 0xA03080, emissiveIntensity: 0.70 });
  const blue   = new THREE.MeshStandardMaterial({ color: 0x80B0FF, roughness: 0.10, metalness: 0.40, transparent: true, opacity: 0.85, emissive: 0x3060C0, emissiveIntensity: 0.70 });
  const mat = [purple, pink, blue][Math.floor(Math.random() * 3)];
  const h = 2.6 + Math.random() * 2.2;
  const r = 0.55 + Math.random() * 0.40;

  const main = new THREE.Mesh(new THREE.OctahedronGeometry(r * 1.4, 0), mat);
  main.scale.set(0.8, h / (r * 2.8), 0.8);
  main.position.y = h / 2;
  main.castShadow = true; g.add(main);

  for (let i = 0; i < 3; i++) {
    const sr = r * (0.35 + Math.random() * 0.30);
    const sh = h * (0.35 + Math.random() * 0.35);
    const side = new THREE.Mesh(new THREE.OctahedronGeometry(sr, 0), mat);
    side.scale.set(0.7, sh / (sr * 2), 0.7);
    const a = Math.random() * Math.PI * 2;
    const rr = r * 1.2;
    side.position.set(Math.cos(a) * rr, sh / 2 + Math.random() * 1.2, Math.sin(a) * rr);
    side.rotation.y = Math.random() * Math.PI;
    side.castShadow = true; g.add(side);
  }
  /* 浮空小光球 */
  const glowOrb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xE0C0FF, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  glowOrb.position.set((Math.random() - 0.5) * 2.4, 1.2 + Math.random() * 2.0, (Math.random() - 0.5) * 2.4);
  g.add(glowOrb);

  scene.add(g);
  terrain.destructibles.push({ group: g, type: 'crystal', x, z, radius: 1.4, broken: false, fade: 1.0, materials: null });
  terrain.meshes.push(g);
}

/* ---------- ☁️ 天堂：云柱 ---------- */
function spawnCloudPillar(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * Math.PI * 2;
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.70, metalness: 0.05, emissive: 0xFFF4D0, emissiveIntensity: 0.40 });
  const goldMat  = new THREE.MeshStandardMaterial({ color: 0xE8C870, roughness: 0.25, metalness: 0.95, emissive: 0x604010, emissiveIntensity: 0.4 });

  /* 金柱底座 */
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 2.4, 10), goldMat);
  pillar.position.y = 1.2; pillar.castShadow = true; g.add(pillar);

  /* 云团：3-4 个球叠起来 */
  const cloudCount = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < cloudCount; i++) {
    const s = 0.9 + Math.random() * 0.5;
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), cloudMat);
    cloud.scale.set(1.0, 0.70, 1.0);
    cloud.position.set(
      (Math.random() - 0.5) * 1.0,
      2.6 + i * 0.7 + Math.random() * 0.3,
      (Math.random() - 0.5) * 1.0
    );
    cloud.castShadow = true; g.add(cloud);
  }
  /* 顶部光点 */
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xFFF8D0 }));
  top.position.y = 2.6 + cloudCount * 0.7 + 0.3; g.add(top);

  scene.add(g);
  terrain.destructibles.push({ group: g, type: 'crystal', x, z, radius: 1.5, broken: false, fade: 1.0, materials: null });
  terrain.meshes.push(g);
}

/* ---------- 🎡 游乐园：彩色气球柱 ---------- */
function spawnBalloon(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * Math.PI * 2;

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x8A5A2A, roughness: 0.8, metalness: 0.2 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 4.0, 8), poleMat);
  pole.position.y = 2.0; pole.castShadow = true; g.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.35, 10), poleMat);
  base.position.y = 0.18; base.castShadow = true; g.add(base);

  const colors = [0xFF4080, 0xFFD040, 0x60D0FF, 0x80FF80, 0xC080FF, 0xFF8060];
  const count = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const c = colors[Math.floor(Math.random() * colors.length)];
    const balloonMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.30, metalness: 0.10, emissive: c, emissiveIntensity: 0.35 });
    const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), balloonMat);
    balloon.scale.set(1.0, 1.2, 1.0);
    balloon.position.set(
      (Math.random() - 0.5) * 0.9,
      3.6 + i * 0.55 + Math.random() * 0.3,
      (Math.random() - 0.5) * 0.9
    );
    g.add(balloon);
    /* 细绳 */
    const stringMat = new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.6 });
    const stringGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(balloon.position.x, balloon.position.y - 0.5, balloon.position.z),
      new THREE.Vector3(0, 4.0, 0),
    ]);
    const string = new THREE.Line(stringGeo, stringMat);
    g.add(string);
  }

  scene.add(g);
  terrain.destructibles.push({ group: g, type: 'crystal', x, z, radius: 1.5, broken: false, fade: 1.0, materials: null });
  terrain.meshes.push(g);
}

/* ---------- 🔥 地狱：骨堆 + 熔岩柱 ---------- */
function spawnBone(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * Math.PI * 2;
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x1A0808, roughness: 0.95, metalness: 0.10, flatShading: true, emissive: 0x3A0808, emissiveIntensity: 0.45 });
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xD8D0B0, roughness: 0.75, metalness: 0.10 });
  const skullMat = new THREE.MeshStandardMaterial({ color: 0xE8E0C0, roughness: 0.70, metalness: 0.10 });

  /* 底部黑岩 */
  const rock = new THREE.Mesh(new THREE.ConeGeometry(1.0 + Math.random() * 0.5, 1.6 + Math.random() * 1.2, 6), rockMat);
  rock.position.y = 0.8; rock.castShadow = true; g.add(rock);

  /* 骨头 */
  const boneCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < boneCount; i++) {
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 1.0 + Math.random() * 0.8, 6), boneMat);
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 1.5;
    bone.position.set(Math.cos(a) * r, 1.4 + Math.random() * 1.2, Math.sin(a) * r);
    bone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    bone.castShadow = true; g.add(bone);
  }
  /* 骷髅 */
  if (Math.random() < 0.6) {
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), skullMat);
    skull.scale.set(1.0, 0.95, 1.0);
    skull.position.set((Math.random() - 0.5) * 0.8, 2.4 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8);
    skull.castShadow = true; g.add(skull);
  }

  scene.add(g);
  terrain.destructibles.push({ group: g, type: 'crystal', x, z, radius: 1.5, broken: false, fade: 1.0, materials: null });
  terrain.meshes.push(g);
}

/* ============================================================
   6. 草丛 InstancedMesh
   ============================================================ */
let _grassGeo = null;
let grassMesh = null;

function makeGrassBladeGeometry() {
  const pos = [], nor = [], idx = [];
  let v = 0;
  const blades = 3;
  for (let b = 0; b < blades; b++) {
    const ang = (b / blades) * Math.PI * 2 + Math.random() * 0.9;
    const dx = Math.cos(ang) * 0.13;
    const dz = Math.sin(ang) * 0.13;
    const h = 0.62 + Math.random() * 0.42;
    const tipX = dx * 2.6, tipZ = dz * 2.6;
    const px = -Math.sin(ang) * 0.07;
    const pz =  Math.cos(ang) * 0.07;
    const bx1 = dx - px, bz1 = dz - pz;
    const bx2 = dx + px, bz2 = dz + pz;
    pos.push(bx1, 0, bz1, bx2, 0, bz2, tipX, h, tipZ);
    for (let k = 0; k < 3; k++) nor.push(0, 1, 0);
    idx.push(v, v + 1, v + 2);
    v += 3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

export function buildGrass() {
  clearGrass();
  if (!_grassGeo) _grassGeo = makeGrassBladeGeometry();
  const COUNT = Tuning.Terrain.grassCount;
  const mat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide });
  grassMesh = new THREE.InstancedMesh(_grassGeo, mat, COUNT);
  grassMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let placed = 0;
  for (let attempt = 0; attempt < COUNT * 10 && placed < COUNT; attempt++) {
    const x = (Math.random() - 0.5) * 372;
    const z = (Math.random() - 0.5) * 372;
    const r = Math.hypot(x, z);
    if (r > 188 || r < 15) continue;
    if (Math.abs(x) < 7.6 || Math.abs(z) < 7.6) continue;
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    const s = 0.85 + Math.random() * 1.10;
    dummy.scale.set(s, s * (0.70 + Math.random() * 0.75), s);
    dummy.updateMatrix();
    grassMesh.setMatrixAt(placed, dummy.matrix);
    const tint = 0.72 + Math.random() * 0.55;
    col.setRGB(0.30 * tint, 0.62 * tint, 0.22 * tint);
    grassMesh.setColorAt(placed, col);
    placed++;
  }
  grassMesh.count = placed;
  grassMesh.instanceMatrix.needsUpdate = true;
  if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;
  grassMesh.frustumCulled = false;
  grassMesh.castShadow = false;
  grassMesh.receiveShadow = false;
  scene.add(grassMesh);
}

export function clearGrass() {
  if (grassMesh) {
    scene.remove(grassMesh);
    if (grassMesh.material) grassMesh.material.dispose();
    grassMesh.dispose();
    grassMesh = null;
  }
}

/* ============================================================
   7. 碎片 + 可破坏物
   ============================================================ */
const DEBRIS_DEFS = {
  tree: [
    { y: 1.5, color: 0x5A3A20, count: 7, speed: 16 },
    { y: 4.5, color: 0x3A7028, count: 9, speed: 18 },
    { y: 5.5, color: 0x2D5A1A, count: 6, speed: 16 },
  ],
  lamp: [
    { y: 3, color: 0x3A3A40, count: 8, speed: 20 },
    { y: 6, color: 0xFFEE80, count: 4, speed: 14 },
  ],
  rock: [
    { y: 1.0, color: 0x4A3830, count: 10, speed: 18 },
    { y: 2.2, color: 0x3A2A24, count: 6,  speed: 16 },
  ],
  cactus: [
    { y: 1.5, color: 0x3E7A3A, count: 8, speed: 16 },
    { y: 3.0, color: 0x2A5A2A, count: 6, speed: 14 },
  ],
  crystal: [
    { y: 1.5, color: 0x40C0FF, count: 10, speed: 18 },
    { y: 3.0, color: 0x80E0FF, count: 6,  speed: 16 },
  ],
};

const DEBRIS_BASE_GEO = new THREE.BoxGeometry(1, 1, 1);
const debrisList = [];
const MAX_DEBRIS = 400;

export function spawnDebris(center, color, count, baseSpeed, baseVel) {
  for (let i = 0; i < count; i++) {
    if (debrisList.length >= MAX_DEBRIS) {
      const old = debrisList.shift();
      scene.remove(old.mesh);
      old.mesh.material.dispose();
    }
    const size = 0.28 + Math.random() * 0.32;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(DEBRIS_BASE_GEO, mat);
    mesh.scale.setScalar(size);
    mesh.position.copy(center);
    mesh.position.x += (Math.random() - 0.5) * 0.6;
    mesh.position.y += (Math.random() - 0.5) * 0.6;
    mesh.position.z += (Math.random() - 0.5) * 0.6;
    mesh.castShadow = true;
    mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    scene.add(mesh);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.6;
    const spd = baseSpeed * (0.4 + Math.random() * 0.9);
    const vel = new THREE.Vector3(
      Math.cos(theta) * Math.sin(phi) * spd,
      Math.cos(phi) * spd * 0.7 + 4 + Math.random() * 5,
      Math.sin(theta) * Math.sin(phi) * spd
    );
    if (baseVel) vel.add(baseVel);
    const maxLife = 2.2 + Math.random() * 1.6;
    debrisList.push({
      mesh, vel,
      life: maxLife, maxLife,
      rot: new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      ),
    });
  }
}

export function updateDebris(dt) {
  for (let i = debrisList.length - 1; i >= 0; i--) {
    const d = debrisList[i];
    d.life -= dt;
    if (d.life <= 0) {
      scene.remove(d.mesh);
      d.mesh.material.dispose();
      debrisList.splice(i, 1);
      continue;
    }
    d.vel.y -= 32 * dt;
    d.mesh.position.x += d.vel.x * dt;
    d.mesh.position.y += d.vel.y * dt;
    d.mesh.position.z += d.vel.z * dt;
    if (d.mesh.position.y < 0.15) {
      d.mesh.position.y = 0.15;
      d.vel.y *= -0.4;
      d.vel.x *= 0.6;
      d.vel.z *= 0.6;
      d.rot.multiplyScalar(0.6);
    }
    d.mesh.rotation.x += d.rot.x * dt;
    d.mesh.rotation.y += d.rot.y * dt;
    d.mesh.rotation.z += d.rot.z * dt;
    const t = d.life / d.maxLife;
    if (t < 0.4) d.mesh.material.opacity = Math.max(0, t / 0.4);
  }
}

export function clearDebris() {
  for (const d of debrisList) {
    scene.remove(d.mesh);
    d.mesh.material.dispose();
  }
  debrisList.length = 0;
}

export function breakDestructible(d, hitDir) {
  if (d.broken) return;
  d.broken = true;
  let dir;
  if (hitDir) {
    dir = hitDir.clone().setY(0).normalize();
  } else {
    dir = new THREE.Vector3(d.x - player.pos.x, 0, d.z - player.pos.z);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    dir.normalize();
  }
  const carSpeed = Math.abs(player.speed);
  const flySpeed = Math.max(carSpeed * 0.5, 6);
  const baseVel = new THREE.Vector3(dir.x * flySpeed, 0, dir.z * flySpeed);
  const defs = DEBRIS_DEFS[d.type] || DEBRIS_DEFS.tree;
  for (const dd of defs) {
    spawnDebris(new THREE.Vector3(d.x, dd.y, d.z), dd.color, dd.count, dd.speed, baseVel);
  }
  state.screenShake = Math.max(state.screenShake, 14);
  state.hitStop = Tuning.Ram.hitStopDuration;
  state.fovKick = Tuning.Ram.fovKick;
  sfxSmash();
  rumbleHit();
  player.speed *= 0.93;
  const hitPos = new THREE.Vector3(d.x, 1, d.z);
  spawnRing(hitPos, 0xFFFFFF, 3.5, 0.3);
  spawnBurstParticles(hitPos, 0xFFFFFF, 8, 10);
}

export function updateDestructibles(dt) {
  for (const d of terrain.destructibles) {
    if (!d.broken) continue;
    if (d.fade <= 0) {
      if (d.group.visible) d.group.visible = false;
      continue;
    }
    d.fade -= dt * 1.5;
    if (d.fade < 0) d.fade = 0;
    if (!d.materials) {
      d.materials = [];
      d.group.traverse(o => {
        if (o.isMesh && o.material) {
          const mat = o.material.clone();
          mat.transparent = true;
          o.material = mat;
          d.materials.push(mat);
        }
      });
    }
    for (const m of d.materials) m.opacity = d.fade;
    d.group.position.y = (1 - d.fade) * -0.5;
    const s = 0.5 + d.fade * 0.5;
    d.group.scale.set(s, s, s);
  }
}

export function checkDestructibles(dt) {
  if (Math.abs(player.speed) < Tuning.Terrain.destructDestroySpeed) return;
  const R = 2.6;
  const fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const hitX = player.pos.x + fwd.x * 2.2;
  const hitZ = player.pos.z + fwd.z * 2.2;
  for (const d of terrain.destructibles) {
    if (d.broken) continue;
    const dx = hitX - d.x, dz = hitZ - d.z;
    if (dx * dx + dz * dz < (R + d.radius) * (R + d.radius)) breakDestructible(d, fwd);
  }
  for (const d of terrain.destructibles) {
    if (d.broken) continue;
    const dx = player.pos.x - d.x, dz = player.pos.z - d.z;
    if (dx * dx + dz * dz < (R + d.radius) * (R + d.radius)) breakDestructible(d, fwd);
  }
}

/* ============================================================
   8. 总装 / 卸载
   ============================================================ */
export function buildTerrain(mapType) {
  clearTerrain();
  currentMapType = mapType || currentMapType;
  buildEnvironment(currentMapType);

  if (currentMapType === 'volcano')      buildLavaPool();
  else if (currentMapType === 'desert')  buildStatue();
  else if (currentMapType === 'aquarium') buildFishTank();
  else if (currentMapType === 'dream')   buildDreamSpire();
  else if (currentMapType === 'heaven')  buildHeavenGate();
  else if (currentMapType === 'amusement') buildCarousel();
  else if (currentMapType === 'hell')    buildHellThrone();
  else                                   buildFountain();

  buildRoadsAndLamps(currentMapType);
  buildGates(currentMapType);
  buildScatterObjects(currentMapType);

  if (currentMapType === 'park') buildGrass();
}

export function clearTerrain() {
  const disposedMats = new Set();
  for (const m of terrain.meshes) {
    scene.remove(m);
    m.traverse(o => {
      if (!o.isMesh) return;
      if (o.geometry && o.geometry !== DEBRIS_BASE_GEO) {
        let isShared = false;
        for (const g of Object.values(SHARED_GEO)) {
          if (o.geometry === g) { isShared = true; break; }
        }
        if (!isShared) o.geometry.dispose();
      }
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const mat of mats) {
          if (disposedMats.has(mat)) continue;
          disposedMats.add(mat);
          if (mat.map) mat.map.dispose();
          mat.dispose();
        }
      }
    });
  }
  terrain.meshes.length = 0;
  terrain.destructibles.length = 0;
  terrain.fountainRadius = 0;
  clearDebris();
  clearGrass();
}
