/* ============================================================
   ui/viewers.js —— 3D 预览
   1. 鉴赏 viewer（图鉴：座驾 / 僵尸 / BOSS）
   2. 车库 viewer（换车）
   3. 鉴赏页签切换
   ============================================================ */

import * as THREE from 'three';
import {
  on, emit, state,
  selectedCarId, setSelectedCarId,
} from '@/core.js';
import { bindTap, screenDeltaToWrapper } from '@/platform.js';
import { T, getLang } from '@/i18n.js';
import {
  CAR_UNLOCK_RULES, isVehicleUnlocked,
} from '@/config.js';
import {
  VEHICLES, VEHICLE_I18N, vehName, vehDesc, buildVehicleModel,
} from '@/content/vehicles.js';
import {
  ENEMY_DEFS, enemyInfo, buildViewerZombie, buildViewerBoss,
} from '@/content/enemies.js';
import { rebuildCarMesh } from '@/entities.js';
import { sfxUI, sfxCardPick, initAudio } from '@/audio.js';
import { showUnlockToast } from '@/ui/menus.js';
import { getActiveTrack, isMusicRunning } from '@/audio.js';

/* ============================================================
   1. 图鉴 viewer
   ============================================================ */
const viewer = {
  renderer: null, scene: null, camera: null,
  model: null, modelType: 'car',
  initialized: false,
  yaw: 0.5, pitch: 0.15,
  dragging: false, lastX: 0, lastY: 0,
  phase: 0,
};

function initViewer() {
  if (viewer.initialized) return;
  const canvas = document.getElementById('viewerCanvas');
  const w = Math.max(canvas.clientWidth, 300);
  const h = Math.max(canvas.clientHeight, 200);

  viewer.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  viewer.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  viewer.renderer.setSize(w, h, false);
  viewer.renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewer.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  viewer.renderer.toneMappingExposure = 1.2;

  viewer.scene = new THREE.Scene();
  viewer.scene.background = null;
  viewer.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);

  viewer.scene.add(new THREE.HemisphereLight(0xC8E8FF, 0x506070, 1.1));
  const key = new THREE.DirectionalLight(0xFFFFFF, 1.4); key.position.set(6, 12, 8); viewer.scene.add(key);
  const rim = new THREE.DirectionalLight(0x4FDDC0, 0.7); rim.position.set(-6, 6, -6); viewer.scene.add(rim);
  const fill2 = new THREE.DirectionalLight(0xFFB347, 0.4); fill2.position.set(-4, 2, 8); viewer.scene.add(fill2);
  viewer.scene.add(new THREE.AmbientLight(0x8098B0, 0.4));

  const grid = new THREE.GridHelper(14, 28, 0x4FDDC0, 0x2A3A50);
  grid.material.transparent = true;
  grid.material.opacity = 0.42;
  viewer.scene.add(grid);

  viewer.initialized = true;

  /* ---- 拖拽交互 ---- */
  canvas.addEventListener('mousedown', (e) => {
    viewer.dragging = true;
    viewer.lastX = e.clientX; viewer.lastY = e.clientY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!viewer.dragging) return;
    const rawDx = e.clientX - viewer.lastX;
    const rawDy = e.clientY - viewer.lastY;
    const { dx: cdx, dy: cdy } = screenDeltaToWrapper(rawDx, rawDy);
    viewer.yaw -= cdx * 0.01;
    viewer.pitch += cdy * 0.01;
    viewer.pitch = Math.max(-0.3, Math.min(1.2, viewer.pitch));
    viewer.lastX = e.clientX; viewer.lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => { viewer.dragging = false; });

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    viewer.dragging = true;
    viewer.lastX = e.touches[0].clientX;
    viewer.lastY = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (!viewer.dragging || e.touches.length !== 1) return;
    viewer.yaw -= (e.touches[0].clientX - viewer.lastX) * 0.012;
    viewer.pitch += (e.touches[0].clientY - viewer.lastY) * 0.012;
    viewer.pitch = Math.max(-0.3, Math.min(1.2, viewer.pitch));
    viewer.lastX = e.touches[0].clientX;
    viewer.lastY = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchend', () => { viewer.dragging = false; });
}

function setViewerModel(type) {
  initViewer();
  if (viewer.model) viewer.scene.remove(viewer.model);
  viewer.model = null;
  viewer.modelType = type;
  viewer.phase = 0;

  if (type === 'car') {
    viewer.model = buildVehicleModel(selectedCarId);
    viewer.yaw = 0.6;
    viewer.pitch = 0.35;
    const veh = VEHICLES[selectedCarId];
    document.getElementById('viewerName').textContent = veh.icon + ' ' + vehName(selectedCarId);
    document.getElementById('viewerDesc').textContent = vehDesc(selectedCarId);
    document.getElementById('viewerStats').innerHTML = [
      `${T('statSpeed')} ${veh.maxSpeed}`,
      `${T('statAccel')} ${veh.accel}`,
      `${T('statRam')} ${veh.ramBase}+`,
    ].map(s => `<span class="stat">${s}</span>`).join('');
    if (viewer.model) viewer.scene.add(viewer.model);
    return;
  }

  if (type === 'boss') {
    viewer.model = buildViewerBoss();
    viewer.yaw = 0.5;
    viewer.pitch = 0.15;
  } else {
    const def = ENEMY_DEFS[type];
    viewer.model = buildViewerZombie(def.cloth, def.skin, def.scale);
    viewer.yaw = 0.5;
    viewer.pitch = 0.15;
  }
  if (viewer.model) viewer.scene.add(viewer.model);

  const info = enemyInfo(type);
  if (!info) return;
  document.getElementById('viewerName').textContent = info.name;
  document.getElementById('viewerDesc').textContent = info.desc;
  document.getElementById('viewerStats').innerHTML =
    info.stats.map(s => `<span class="stat">${s}</span>`).join('');
}

function renderViewer(dt) {
  if (!viewer.initialized || !viewer.model) return;
  viewer.phase += dt * 3.5;

  if (viewer.modelType === 'car') {
    viewer.model.position.y = Math.sin(viewer.phase * 0.8) * 0.08;
    viewer.model.rotation.z = Math.sin(viewer.phase * 0.5) * 0.02;
  } else {
    const parts = viewer.model.userData.parts;
    if (parts) {
      const armSwing = Math.sin(viewer.phase) * 0.7;
      const legSwing = Math.sin(viewer.phase) * 0.85;
      for (const p of parts) {
        if (p.type === 'arm') p.pivot.rotation.x = 0.7 + (p.side < 0 ? armSwing : -armSwing);
        else p.pivot.rotation.x = p.side < 0 ? legSwing : -legSwing;
      }
      if (viewer.model.userData.torso) viewer.model.userData.torso.rotation.x = 0.08;
      if (viewer.model.userData.head) {
        viewer.model.userData.head.rotation.x = 0.05;
        viewer.model.userData.head.rotation.z = Math.sin(viewer.phase * 0.7) * 0.15;
      }
    }
  }

  const r = viewer.modelType === 'boss' ? 18 : 10;
  const targetY = viewer.modelType === 'boss' ? 4.5 : 1.5;
  const cy = targetY + Math.sin(viewer.pitch) * r * 0.9;
  const rr = Math.cos(viewer.pitch) * r;

  viewer.camera.position.set(Math.sin(viewer.yaw) * rr, cy, Math.cos(viewer.yaw) * rr);
  viewer.camera.lookAt(0, targetY, 0);

  const canvas = viewer.renderer.domElement;
  const w = Math.floor(canvas.clientWidth);
  const h = Math.floor(canvas.clientHeight);
  if (w > 0 && h > 0) {
    const pr = viewer.renderer.getPixelRatio();
    if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
      viewer.renderer.setSize(w, h, false);
      viewer.camera.aspect = w / h;
      viewer.camera.updateProjectionMatrix();
    }
  }
  viewer.renderer.render(viewer.scene, viewer.camera);
}

/* ============================================================
   2. 车库 viewer
   ============================================================ */
const garageViewer = {
  renderer: null, scene: null, camera: null,
  model: null, initialized: false,
  yaw: 0.55, pitch: 0.28,
  dragging: false, lastX: 0, lastY: 0,
  autoSpin: 0, time: 0,
  bgMat: null,
};

let garageCurrentId = 'coupe';
let garageOpen = false;

function buildGarageBgShader() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      varying float vDepth;
      void main(){
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      varying float vDepth;
      uniform float uTime;
      void main(){
        vec2 g = vUv * 44.0;
        g.y += uTime * 2.4;
        vec2 gr = abs(fract(g - 0.5) - 0.5) / max(fwidth(g), vec2(0.0001));
        float line = 1.0 - min(min(gr.x, gr.y), 1.0);
        float pulse = 0.5 + 0.5 * sin(uTime * 1.6 - length(vUv - 0.5) * 9.0);
        float d = length(vUv - 0.5);
        float fade = smoothstep(0.5, 0.04, d);
        vec3 colLine = mix(vec3(0.31, 0.87, 0.75), vec3(1.0, 0.70, 0.28), pulse);
        vec3 base = vec3(0.02, 0.03, 0.05);
        vec3 col = mix(base, colLine, line * 0.85);
        float a = line * fade * 0.6 + (1.0 - fade) * 0.15;
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}

function initGarageViewer() {
  if (garageViewer.initialized) return;
  const canvas = document.getElementById('garageCanvas');
  const w = Math.max(canvas.clientWidth, 300);
  const h = Math.max(canvas.clientHeight, 200);

  garageViewer.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  garageViewer.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  garageViewer.renderer.setSize(w, h, false);
  garageViewer.renderer.outputColorSpace = THREE.SRGBColorSpace;
  garageViewer.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  garageViewer.renderer.toneMappingExposure = 1.25;

  garageViewer.scene = new THREE.Scene();
  garageViewer.scene.background = null;
  garageViewer.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);

  garageViewer.scene.add(new THREE.HemisphereLight(0xBEE4FF, 0x35404E, 1.1));
  const key = new THREE.DirectionalLight(0xFFFFFF, 1.35); key.position.set(7, 14, 9); key.castShadow = false; garageViewer.scene.add(key);
  const rim = new THREE.DirectionalLight(0x4FDDC0, 0.9); rim.position.set(-8, 6, -7); garageViewer.scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xFFB347, 0.55); rim2.position.set(6, 3, -9); garageViewer.scene.add(rim2);
  garageViewer.scene.add(new THREE.AmbientLight(0x8098B0, 0.42));

  const bgMat = buildGarageBgShader();
  garageViewer.bgMat = bgMat;
  const bgPlane = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), bgMat);
  bgPlane.rotation.x = -Math.PI / 2;
  bgPlane.position.y = -0.02;
  garageViewer.scene.add(bgPlane);

  const grid = new THREE.GridHelper(26, 26, 0x4FDDC0, 0x2A3A50);
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  grid.position.y = 0.01;
  garageViewer.scene.add(grid);

  garageViewer.initialized = true;

  canvas.addEventListener('mousedown', (e) => {
    garageViewer.dragging = true;
    garageViewer.lastX = e.clientX; garageViewer.lastY = e.clientY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!garageViewer.dragging) return;
    const rawDx = e.clientX - garageViewer.lastX;
    const rawDy = e.clientY - garageViewer.lastY;
    const { dx: cdx, dy: cdy } = screenDeltaToWrapper(rawDx, rawDy);
    garageViewer.yaw -= cdx * 0.01;
    garageViewer.pitch += cdy * 0.008;
    garageViewer.pitch = Math.max(-0.1, Math.min(1.1, garageViewer.pitch));
    garageViewer.lastX = e.clientX; garageViewer.lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => { garageViewer.dragging = false; });

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    garageViewer.dragging = true;
    garageViewer.lastX = e.touches[0].clientX;
    garageViewer.lastY = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (!garageViewer.dragging || e.touches.length !== 1) return;
    const rawDx = e.touches[0].clientX - garageViewer.lastX;
    const rawDy = e.touches[0].clientY - garageViewer.lastY;
    const { dx: cdx, dy: cdy } = screenDeltaToWrapper(rawDx, rawDy);
    garageViewer.yaw -= cdx * 0.012;
    garageViewer.pitch += cdy * 0.010;
    garageViewer.pitch = Math.max(-0.1, Math.min(1.1, garageViewer.pitch));
    garageViewer.lastX = e.touches[0].clientX;
    garageViewer.lastY = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchend', () => { garageViewer.dragging = false; });
}

function disposeGroup(g) {
  g.traverse(o => {
    if (o.isMesh) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m.map) m.map = null;
          m.dispose();
        }
      }
    }
  });
}

function garagePreview(id) {
  initGarageViewer();
  garageCurrentId = id;
  if (garageViewer.model) {
    garageViewer.scene.remove(garageViewer.model);
    disposeGroup(garageViewer.model);
  }
  const veh = VEHICLES[id];
  garageViewer.model = buildVehicleModel(id);
  garageViewer.scene.add(garageViewer.model);
  garageViewer.yaw = 0.62;
  garageViewer.pitch = 0.26;

  const unlocked = isVehicleUnlocked(id);
  const ruleText = unlocked ? '' : (CAR_UNLOCK_RULES[id] ? T(CAR_UNLOCK_RULES[id].textKey) : '');

  document.getElementById('garageName').textContent =
    (unlocked ? '' : '🔒 ') + veh.icon + ' ' + vehName(id);

  const descEl = document.getElementById('garageDesc');
  descEl.textContent = vehDesc(id);
  if (!unlocked && ruleText) {
    const lockLine = document.createElement('span');
    lockLine.className = 'lock-line';
    lockLine.textContent = '🔒 ' + ruleText;
    descEl.appendChild(lockLine);
  }

  const bars = [
    [T('statSpeed'),    veh.maxSpeed / 102],
    [T('statAccel'),    veh.accel / 36],
    [T('statHandling'), veh.yawRateBase / 13],
    [T('statRam'),      veh.ramBase / 54],
  ];
  document.getElementById('garageBars').innerHTML = bars.map(([label, v]) =>
    `<div class="gbar"><span>${label}</span><span class="track"><span class="fill" style="width:${Math.min(100, Math.round(v * 100))}%"></span></span></div>`
  ).join('');

  const selBtn = document.getElementById('garageSelectBtn');
  selBtn.classList.remove('locked-btn');
  if (!unlocked) {
    selBtn.textContent = '🔒 ' + T('carLocked');
    selBtn.classList.remove('primary');
    selBtn.classList.add('locked-btn');
  } else if (id === selectedCarId) {
    selBtn.textContent = T('inUse');
    selBtn.classList.remove('primary');
  } else {
    selBtn.textContent = T('useCar');
    selBtn.classList.add('primary');
  }
}

function renderGarageList() {
  const list = document.getElementById('garageList');
  list.innerHTML = '';
  for (const id of Object.keys(VEHICLES)) {
    const v = VEHICLES[id];
    const unlocked = isVehicleUnlocked(id);
    const el = document.createElement('div');
    el.className = 'garage-item' + (unlocked ? '' : ' locked') + (id === garageCurrentId ? ' active' : '');
    const ruleText = unlocked ? '' : (CAR_UNLOCK_RULES[id] ? T(CAR_UNLOCK_RULES[id].textKey) : '');

    el.innerHTML =
      `<span class="gi-icon">${v.icon}</span><span class="gi-name">${vehName(id)}</span>` +
      (unlocked
        ? (id === selectedCarId ? `<span class="gi-badge">${T('inUse')}</span>` : '')
        : `<span class="gi-lock" title="${ruleText}">🔒</span>`);

    bindTap(el, () => { sfxUI(); garagePreview(id); renderGarageList(); });
    list.appendChild(el);
  }
}

function openGarage() {
  garageOpen = true;
  document.getElementById('garageScreen').classList.add('show');
  initGarageViewer();
  garageCurrentId = selectedCarId;
  renderGarageList();
  garagePreview(selectedCarId);
}

function closeGarage() {
  garageOpen = false;
  document.getElementById('garageScreen').classList.remove('show');
}

function renderGarage(dt) {
  if (!garageViewer.initialized || !garageViewer.model) return;
  garageViewer.time += dt;
  if (garageViewer.bgMat) garageViewer.bgMat.uniforms.uTime.value = garageViewer.time;
  if (!garageViewer.dragging) garageViewer.yaw += dt * 0.35;

  const veh = VEHICLES[garageCurrentId];
  const dist = veh.preview ? veh.preview.dist : 11;
  const tY = veh.preview ? veh.preview.height : 1.4;
  const cy = tY + Math.sin(garageViewer.pitch) * dist * 0.9;
  const rr = Math.cos(garageViewer.pitch) * dist;

  garageViewer.camera.position.set(Math.sin(garageViewer.yaw) * rr, cy, Math.cos(garageViewer.yaw) * rr);
  garageViewer.camera.lookAt(0, tY, 0);

  garageViewer.model.position.y = Math.sin(garageViewer.time * 1.4) * 0.05;

  const canvas = garageViewer.renderer.domElement;
  const w = Math.floor(canvas.clientWidth);
  const h = Math.floor(canvas.clientHeight);
  if (w > 0 && h > 0) {
    const pr = garageViewer.renderer.getPixelRatio();
    if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
      garageViewer.renderer.setSize(w, h, false);
      garageViewer.camera.aspect = w / h;
      garageViewer.camera.updateProjectionMatrix();
    }
  }
  garageViewer.renderer.render(garageViewer.scene, garageViewer.camera);
}

/* ============================================================
   3. 鉴赏页签切换
   ============================================================ */
let currentTab = 'model';

export function switchGalleryTab(tab) {
  currentTab = tab;
  const isBgm = tab === 'bgm';

  document.querySelectorAll('.gtab').forEach(b => {
    b.classList.toggle('active', b.dataset.gtab === tab);
  });
  document.getElementById('galleryPaneModel').classList.toggle('active', !isBgm);
  document.getElementById('galleryPaneBgm').classList.toggle('active', isBgm);

  if (isBgm) {
    emit('bgm:enterTab');
  } else {
    emit('bgm:leaveTab');
    setTimeout(() => {
      initViewer();
      setViewerModel(viewer.modelType || 'car');
    }, 30);
  }
}

/* ============================================================
   4. 初始化 & 事件订阅
   ============================================================ */
export function initViewers() {
  /* ---- 图鉴打开 ---- */
  on('ui:galleryOpen', () => {
    document.getElementById('galleryScreen').classList.add('show');
    switchGalleryTab('model');
  });

  /* ---- 图鉴关闭 ---- */
  bindTap(document.getElementById('galleryCloseBtn'), () => {
    document.getElementById('galleryScreen').classList.remove('show');
    emit('bgm:leaveTab');
    emit('bgm:playerDeactivate');
    if (state.phase === 'menu') {
      import('@/audio.js').then(m => m.startBGM('menu'));
    }
  });

  /* ---- 剧情按钮 ---- */
  bindTap(document.getElementById('replayStoryBtn'), () => {
    initAudio();
    sfxUI();
    emit('bgm:leaveTab');
    emit('bgm:playerDeactivate');
    document.getElementById('galleryScreen').classList.remove('show');
    emit('ui:replayStory');
  });

  /* ---- 图鉴列表 ---- */
  document.querySelectorAll('.gallery-item').forEach(item => {
    bindTap(item, () => {
      document.querySelectorAll('.gallery-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      setViewerModel(item.dataset.type);
    });
  });

  /* ---- 页签 ---- */
  document.querySelectorAll('.gtab').forEach(tab => {
    bindTap(tab, () => {
      initAudio();
      sfxUI();
      switchGalleryTab(tab.dataset.gtab);
    });
  });

  /* ---- 车库打开 ---- */
  on('ui:garageOpen', () => { openGarage(); });

  bindTap(document.getElementById('garageCloseBtn'), () => { sfxUI(); closeGarage(); });
  bindTap(document.getElementById('garageSelectBtn'), () => {
    if (!isVehicleUnlocked(garageCurrentId)) {
      sfxUI();
      const rule = CAR_UNLOCK_RULES[garageCurrentId];
      if (rule) showUnlockToast('🔒 ' + T(rule.textKey));
      return;
    }
    if (garageCurrentId === selectedCarId) { sfxUI(); return; }
    setSelectedCarId(garageCurrentId);
    rebuildCarMesh();
    sfxCardPick();
    renderGarageList();
    garagePreview(selectedCarId);
  });

  /* ---- 语言切换后刷新动态文案 ---- */
  document.addEventListener('lang:change', () => {
    if (garageOpen) {
      renderGarageList();
      garagePreview(garageCurrentId);
    }
    if (document.getElementById('galleryScreen').classList.contains('show') && viewer.initialized) {
      setViewerModel(viewer.modelType || 'car');
    }
  });
}

/* ============================================================
   5. 每帧更新（由 main.js 调用）
   ============================================================ */
export function tickViewers(dt) {
  if (document.getElementById('galleryScreen').classList.contains('show')) {
    renderViewer(dt);
  }
  if (garageOpen) renderGarage(dt);
}

export function isGarageOpen() { return garageOpen; }