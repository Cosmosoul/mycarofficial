/* ============================================================
   ui/story.js —— 剧情动画
   · 一次性播放（首次进入关卡 1）
   · 鉴赏页「▶ 剧情」按钮重播
   · 可点击 / 空格 / 回车跳过
   ============================================================ */

import * as THREE from 'three';
import { on, emit, state } from '@/core.js';
import { load, save } from '@/platform.js';
import { T, getLang } from '@/i18n.js';
import { startBGM, stopBGM } from '@/audio.js';
import { buildVehicleModel } from '@/content/vehicles.js';

/* ============================================================
   1. 剧情文本
   ============================================================ */
const STORY_TEXTS = {
  zh: [
    '一觉醒来……',
    '城市已经被丧尸吞没，',
    '只剩下你孤身一人，',
    '与你的破旧二手车。',
    '想要活下去的话，',
    '就油门踩到底，杀出一条生路吧！',
  ],
  en: [
    'You wake up…',
    'The city has been swallowed by the undead.',
    'All that is left is you,',
    'and your beat-up second-hand car.',
    'If you want to live,',
    'floor the gas and carve out a way!',
  ],
};

const STORY_SEEN_KEY = 'myCarStorySeen';

function hasSeenStory() {
  try { return load(STORY_SEEN_KEY, null) === '1'; } catch (e) { return false; }
}
function markStorySeen() {
  try { save(STORY_SEEN_KEY, '1'); } catch (e) {}
}

/* ============================================================
   2. 剧情状态
   ============================================================ */
const storyAnim = {
  renderer: null, scene: null, camera: null,
  car: null, carGlow: null, zombies: [], buildings: [], dust: null,
  active: false, finished: false,
  t: 0, lastT: 0,
  raf: null,
  textIndex: -1,
  onDone: null,
  texts: null,
};

/* ============================================================
   3. 场景搭建
   ============================================================ */
function initStoryRenderer() {
  if (storyAnim.renderer) return;

  const canvas = document.getElementById('storyCanvas');
  storyAnim.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  storyAnim.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  storyAnim.renderer.setSize(window.innerWidth, window.innerHeight, false);
  storyAnim.renderer.outputColorSpace = THREE.SRGBColorSpace;
  storyAnim.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  storyAnim.renderer.toneMappingExposure = 1.35;

  storyAnim.scene = new THREE.Scene();
  storyAnim.scene.background = new THREE.Color(0x1A2230);
  storyAnim.scene.fog = new THREE.Fog(0x1A2230, 40, 160);

  storyAnim.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 400);
  storyAnim.camera.position.set(0, 5, 16);
  storyAnim.camera.lookAt(0, 2.2, 0);

  /* 光照 */
  storyAnim.scene.add(new THREE.HemisphereLight(0x6A8AB8, 0x141820, 1.35));
  const key = new THREE.DirectionalLight(0xFFB080, 1.75);
  key.position.set(-14, 18, 8);
  storyAnim.scene.add(key);
  const rim = new THREE.DirectionalLight(0x80C0FF, 0.95);
  rim.position.set(12, 8, -12);
  storyAnim.scene.add(rim);
  storyAnim.scene.add(new THREE.AmbientLight(0x6090C0, 0.75));
  const carFill = new THREE.PointLight(0x8FE0FF, 1.4, 30, 2);
  carFill.position.set(0, 8, 4);
  storyAnim.scene.add(carFill);

  /* 地面 */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({ color: 0x1A1E24, roughness: 0.95, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  storyAnim.scene.add(ground);

  /* 马路 + 车道线 */
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 200),
    new THREE.MeshStandardMaterial({ color: 0x2A2A2A, roughness: 0.9, metalness: 0.05 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  storyAnim.scene.add(road);

  for (let i = -45; i <= 45; i += 6) {
    const dash = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 2.4),
      new THREE.MeshBasicMaterial({ color: 0x9A9A70 })
    );
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.035, i);
    storyAnim.scene.add(dash);
  }

  /* 两侧建筑 + 窗 */
  for (let i = 0; i < 18; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -70 + (i / 18) * 140 + Math.random() * 6;
    const h = 6 + Math.random() * 22;
    const w = 6 + Math.random() * 8;
    const d = 6 + Math.random() * 8;
    const col = new THREE.Color().setHSL(0.60, 0.18 + Math.random() * 0.12, 0.06 + Math.random() * 0.06);

    const b = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.92, metalness: 0.12, emissive: 0x000000 })
    );
    b.position.set(side * (12 + Math.random() * 22), h / 2, z);
    b.rotation.y = (Math.random() - 0.5) * 0.3;
    storyAnim.scene.add(b);
    storyAnim.buildings.push(b);

    if (Math.random() < 0.6) {
      const winMat = new THREE.MeshBasicMaterial({
        color: Math.random() < 0.5 ? 0xFFB060 : 0x90D0FF,
        transparent: true, opacity: 0.55,
      });
      for (let k = 0; k < 3; k++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), winMat);
        win.position.set(
          b.position.x + (side > 0 ? -w / 2 - 0.02 : w / 2 + 0.02),
          1.6 + Math.random() * (h - 2.4),
          b.position.z + (Math.random() - 0.5) * d * 0.7
        );
        win.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        storyAnim.scene.add(win);
      }
    }
  }

  /* 主角车 */
  storyAnim.car = buildVehicleModel('coupe');
  storyAnim.car.position.set(0, 0, 0);
  storyAnim.car.rotation.y = 0;
  storyAnim.scene.add(storyAnim.car);

  storyAnim.carGlow = new THREE.PointLight(0x4FDDC0, 1.4, 14, 2);
  storyAnim.carGlow.position.set(0, 1.4, 0);
  storyAnim.scene.add(storyAnim.carGlow);

  /* 环绕僵尸 */
  for (let i = 0; i < 26; i++) {
    const zg = new THREE.Group();
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.95, metalness: 0.05 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.24, 0.45), darkMat);
    torso.position.y = 1.37; zg.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.375, 7, 5), darkMat);
    head.position.y = 2.30; zg.add(head);

    for (const sx of [-0.53, 0.53]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.21, 1.01, 0.21), darkMat);
      arm.position.set(sx, 1.44, 0.35);
      arm.rotation.x = 0.7;
      zg.add(arm);
    }
    for (const sx of [-0.21, 0.21]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.29, 1.10, 0.29), darkMat);
      leg.position.set(sx, 0.55, 0);
      zg.add(leg);
    }

    const a = Math.random() * Math.PI * 2;
    const r = 14 + Math.random() * 30;
    zg.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 6);
    zg.rotation.y = -a;
    zg.userData = {
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.5,
      baseR: r,
      baseA: a,
    };
    storyAnim.scene.add(zg);
    storyAnim.zombies.push(zg);
  }

  /* 空气颗粒 */
  const dustCount = 220;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3]     = (Math.random() - 0.5) * 120;
    dustPos[i * 3 + 1] = 0.5 + Math.random() * 22;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0x8AA8C0, size: 0.12,
    transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  storyAnim.dust = new THREE.Points(dustGeo, dustMat);
  storyAnim.scene.add(storyAnim.dust);

  storyAnim.renderer.render(storyAnim.scene, storyAnim.camera);
}

/* ============================================================
   4. 文本展示
   ============================================================ */
function showStoryText(idx) {
  if (idx === storyAnim.textIndex) return;
  storyAnim.textIndex = idx;

  const el = document.getElementById('storyText');
  const texts = storyAnim.texts || STORY_TEXTS[getLang()] || STORY_TEXTS.en;

  if (idx < 0 || idx >= texts.length) {
    el.style.opacity = '0';
    return;
  }
  el.style.opacity = '0';
  setTimeout(() => {
    if (storyAnim.textIndex !== idx) return;
    el.textContent = texts[idx];
    el.style.opacity = '1';
  }, 180);
}

/* ============================================================
   5. 主循环
   ============================================================ */
function updateStory(now) {
  if (!storyAnim.active) return;

  const dt = Math.min((now - storyAnim.lastT) / 1000 || 0.016, 0.05);
  storyAnim.lastT = now;
  storyAnim.t += dt;
  const t = storyAnim.t;

  /* 镜头推进 */
  const camZ = 16 - Math.min(t * 0.55, 8.5);
  const camY = 5  - Math.min(t * 0.09, 1.4);
  storyAnim.camera.position.set(0, camY, camZ);
  storyAnim.camera.lookAt(0, 2.1, 0);

  /* 车体轻微悬浮 */
  if (storyAnim.car) {
    storyAnim.car.position.y = Math.sin(t * 2.1) * 0.045;
    storyAnim.car.rotation.z = Math.sin(t * 1.3) * 0.012;
    storyAnim.car.rotation.x = Math.sin(t * 1.7) * 0.008;
  }
  if (storyAnim.carGlow) {
    storyAnim.carGlow.intensity = 1.25 + Math.sin(t * 3.4) * 0.25;
  }

  /* 僵尸环绕 */
  for (const zg of storyAnim.zombies) {
    const ud = zg.userData;
    ud.phase += dt * ud.speed * 2.2;
    const a = ud.baseA + Math.sin(ud.phase * 0.5) * 0.06;
    const r = ud.baseR + Math.sin(ud.phase * 0.8) * 0.9;
    zg.position.x = Math.cos(a) * r;
    zg.position.z = Math.sin(a) * r - 6;
    zg.rotation.y = -a + Math.sin(ud.phase * 0.7) * 0.25;
    zg.rotation.z = Math.sin(ud.phase * 1.2) * 0.06;
  }

  /* 颗粒漂浮 */
  if (storyAnim.dust) {
    const attr = storyAnim.dust.geometry.attributes.position;
    const arr = attr.array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i]     += Math.sin(t * 0.5 + i) * dt * 0.25;
      arr[i + 1] += dt * 0.28;
      arr[i + 2] += Math.cos(t * 0.4 + i) * dt * 0.25;
      if (arr[i + 1] > 24) arr[i + 1] = 0.5;
    }
    attr.needsUpdate = true;
  }

  /* 分句 */
  const texts = storyAnim.texts || STORY_TEXTS[getLang()] || STORY_TEXTS.en;
  const total = 13.5;
  const per = total / texts.length;
  const idx = Math.min(texts.length - 1, Math.floor(t / per));
  showStoryText(idx);

  if (t >= total) {
    storySkip();
    return;
  }

  storyAnim.renderer.render(storyAnim.scene, storyAnim.camera);
  storyAnim.raf = requestAnimationFrame(updateStory);
}

/* ============================================================
   6. 跳过 / 播放
   ============================================================ */
export function storySkip() {
  if (!storyAnim.active || storyAnim.finished) return;
  storyAnim.finished = true;

  if (storyAnim.raf) {
    cancelAnimationFrame(storyAnim.raf);
    storyAnim.raf = null;
  }
  showStoryText(-1);

  document.getElementById('storyScreen').classList.remove('show');
  storyAnim.active = false;

  const cb = storyAnim.onDone;
  storyAnim.onDone = null;
  stopBGM();

  if (cb) setTimeout(cb, 120);
}

export function playStory(onDone) {
  initStoryRenderer();
  const screen = document.getElementById('storyScreen');
  screen.classList.add('show');

  storyAnim.active = true;
  storyAnim.finished = false;
  storyAnim.t = 0;
  storyAnim.textIndex = -1;
  storyAnim.texts = STORY_TEXTS[getLang()] || STORY_TEXTS.en;
  storyAnim.onDone = onDone;
  storyAnim.lastT = performance.now();

  showStoryText(0);
  stopBGM();
  setTimeout(() => startBGM('storyTheme'), 60);

  const w = window.innerWidth, h = window.innerHeight;
  storyAnim.renderer.setSize(w, h, false);
  storyAnim.camera.aspect = w / h;
  storyAnim.camera.updateProjectionMatrix();

  storyAnim.raf = requestAnimationFrame(updateStory);
}

/* ============================================================
   7. 初始化 & 事件
   ============================================================ */
export function initStory() {
  /* 点击跳过 */
  document.getElementById('storyScreen').addEventListener('click', storySkip);
  document.getElementById('storyScreen').addEventListener('touchend', (e) => {
    e.preventDefault();
    storySkip();
  }, { passive: false });

  /* 首次进入关卡 1 —— 由 menus.js 通过事件触发 */
  on('story:playOnce', ({ onDone }) => {
    state.phase = 'story';
    playStory(() => {
      markStorySeen();
      onDone && onDone();
    });
  });

  /* 鉴赏页「▶ 剧情」——重播 */
  on('ui:replayStory', () => {
    state.phase = 'story';
    playStory(() => {
      state.phase = 'menu';
      document.getElementById('galleryScreen').classList.add('show');
      emit('ui:galleryOpen');
      setTimeout(() => startBGM('menu'), 80);
    });
  });
}

/* 供 menus.js 查询：是否还需要播放首次剧情 */
export function shouldPlayFirstStory(levelId) {
  return levelId === 1 && !hasSeenStory();
}

/* 当窗口尺寸变化时由 main.js 调用 */
export function onStoryResize(w, h) {
  if (!storyAnim.renderer) return;
  storyAnim.renderer.setSize(w, h, false);
  storyAnim.camera.aspect = w / h;
  storyAnim.camera.updateProjectionMatrix();
}