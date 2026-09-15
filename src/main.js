/* ============================================================
   main.js —— 唯一入口
   ============================================================ */

import * as THREE from 'three';

import {
  scene, camera, renderer, emit,
  state, player, selectedCarId,
} from '@/core.js';
import { mountRenderer } from '@/core.js';

import {
  platform, installKeyboard, onResize, emitResize,
  isForcedRotate,
} from '@/platform.js';

import { applyLanguage, getLang } from '@/i18n.js';

import { attachZombieMeshes } from '@/content/enemies.js';
import { pickRandomMap } from '@/content/maps.js';
import { V } from '@/content/vehicles.js';

import {
  initAudio, updateEngineSound, startBGM, stopBGM,
  pickRandomGameTrack,
} from '@/audio.js';

import {
  initFxLayer, initSpeedLines, resizeSpeedLineCanvas, drawSpeedOverlay,
  updateSpeedFx, getSpeedFxIntensity, emitExhaustFlames, updateExhaustFlames,
  updateBullets, updateParticles, updateLightning, updateFx,
  updateEnemyBullets, setCarMeshY,
} from '@/fx.js';

import {
  buildTerrain, updateDestructibles, updateDebris, setMapType,
} from '@/world.js';
import {
  rebuildCarMesh, resetEnemies, attachEnemyMeshes, getCarMesh,
} from '@/entities.js';

import {
  initGameplay, resetGame, updateSpawning, updateEnemies, updatePlayer,
  updateSkills, checkRam, checkPointOverflow,
  doDodge, doJump, triggerGameOver,
} from '@/systems/gameplay.js';

import { initGamepad, pollGamepad } from '@/gamepad.js';

import { initHud, tickHud } from '@/ui/hud.js';
import { initMenus, tickMenus } from '@/ui/menus.js';
import { initViewers, tickViewers } from '@/ui/viewers.js';
import { initBgmPlayer, tickBgmPlayer } from '@/ui/bgm-player.js';
import { initStory, onStoryResize } from '@/ui/story.js';

/* ============================================================
   0. 注入全局样式（主菜单 FX + 局内滤镜）
   ============================================================ */
function injectStyle() {
  if (document.getElementById('mainStyle')) return;
  const style = document.createElement('style');
  style.id = 'mainStyle';
  style.textContent = `
    /* ========== 主菜单：故障 + 做旧 ========== */
    #startScreen { isolation: isolate; }
    #menuBgCanvas {
      position: absolute !important;
      inset: 0;
      width: 100% !important;
      height: 100% !important;
      z-index: 0;
    }
    #menuFxCanvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
      mix-blend-mode: screen;
      opacity: 0.55;
      image-rendering: pixelated;
    }
    #startScreen > h1,
    #startScreen > .sub,
    #startScreen > .btn-grid,
    #startScreen > #langSwitch {
      position: relative;
      z-index: 2;
    }
    #startScreen > h1 {
      text-shadow: 0 0 12px rgba(79, 221, 192, 0.35), 0 0 32px rgba(255, 138, 60, 0.25);
    }
    /* 复古做旧：轻微暗角 + 扫描线，叠在最上面（不影响交互） */
    #startScreen::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 3;
      background:
        radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,0.55) 100%),
        repeating-linear-gradient(
          0deg,
          rgba(0,0,0,0.18) 0px,
          rgba(0,0,0,0.18) 1px,
          transparent 1px,
          transparent 3px
        );
      mix-blend-mode: multiply;
      opacity: 0.55;
    }

    /* ========== 局内：滤镜层 ========== */
    #gameFxLayer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 200;
      background: radial-gradient(ellipse at 50% 45%, transparent 30%, rgba(0,0,0,0.22) 70%, rgba(0,0,0,0.55) 100%);
      mix-blend-mode: multiply;
    }
    #gameFxLayer::after {
      content: '';
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.65'/></svg>");
      background-size: 140px 140px;
      opacity: 0.055;
      mix-blend-mode: overlay;
    }
    /* 3D 渲染器色调微调 */
    #gameRenderCanvas {
      filter: contrast(1.07) saturate(1.12) brightness(0.985);
    }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   1. 注入 THREE 向量
   ============================================================ */
player.pos = new THREE.Vector3(0, 0, 0);
player.dodgeStartPos = new THREE.Vector3();
player.dodgeEndPos = new THREE.Vector3();

/* ============================================================
   2. 装配
   ============================================================ */
injectStyle();
mountRenderer();
/* ★ 给 3D 渲染器 canvas 加 id，便于 CSS 定位 */
if (renderer.domElement) renderer.domElement.id = 'gameRenderCanvas';
attachEnemyMeshes();
initFxLayer();
initSpeedLines();

/* ============================================================
   3. 键盘
   ============================================================ */
installKeyboard((e) => {
  if (e.code === 'KeyK' && state.phase === 'playing') doDodge();
  if (e.code === 'Space' && state.phase === 'playing') { e.preventDefault(); doJump(); }
  if (state.phase === 'story' && (e.code === 'Space' || e.code === 'Enter')) {
    document.getElementById('storyScreen').click();
  }
  emit('keydown', e);
});

/* ============================================================
   4. resize
   ============================================================ */
onResize((w, h) => {
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);

  if (menuRenderer) {
    menuRenderer.setSize(w, h, false);
    if (menuUniforms) menuUniforms.uAspect.value = w / h;
  }
  resizeMenuFx();
  onStoryResize(w, h);
  resizeSpeedLineCanvas();
  checkOrientation();
  updateFullscreenButtons();
});

function checkOrientation() {
  if (!platform.isMobile) {
    document.getElementById('rotateHint').style.display = 'none';
    return;
  }
  const isPortrait = window.innerHeight > window.innerWidth;
  if (isForcedRotate()) {
    document.getElementById('rotateHint').style.display = 'none';
    return;
  }
  document.getElementById('rotateHint').style.display = isPortrait ? 'flex' : 'none';
}

function updateFullscreenButtons() {
  const fs = !!(document.fullscreenElement || document.webkitFullscreenElement
            || document.mozFullScreenElement || document.msFullscreenElement);
  const isFs = fs || isForcedRotate();
  document.querySelectorAll('.fs-btn').forEach(b => {
    b.textContent = isFs
      ? (getLang() === 'zh' ? '退 出 全 屏' : 'EXIT FULLSCREEN')
      : (getLang() === 'zh' ? '全 屏' : 'FULLSCREEN');
  });
}

/* ============================================================
   5. 主菜单背景 shader
   ============================================================ */
const menuBgCanvas = document.getElementById('menuBgCanvas');
let menuRenderer = null, menuScene = null, menuCamera = null, menuUniforms = null;
let menuBgStarted = false;

function initMenuBg() {
  if (menuBgStarted) return;
  menuBgStarted = true;

  menuRenderer = new THREE.WebGLRenderer({ canvas: menuBgCanvas, antialias: true });
  menuRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  const w = window.innerWidth, h = window.innerHeight;
  menuRenderer.setSize(w, h, false);

  menuScene = new THREE.Scene();
  menuCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  menuUniforms = {
    uTime:      { value: 0 },
    uAspect:    { value: w / h },
    colour1:    { value: new THREE.Color(0x121024) },
    colour2:    { value: new THREE.Color(0x0A1A26) },
    colour3:    { value: new THREE.Color(0x06080D) },
    colour4:    { value: new THREE.Color(0xFF8A3C) },
    uGradual:   { value: 1.5 },
    uWidth1:    { value: 0.030 },
    uWidth2:    { value: 0.13 },
    uScale1:    { value: 8.0 },
    uScale2:    { value: 1.2 },
    uIntensity: { value: 0.17 },
    uSpinSpeed: { value: 0.13 },
    uSpinAmount:{ value: 1.25 },
    uOffset:    { value: new THREE.Vector2(0, 0) },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms: menuUniforms,
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: `
      precision highp float;
      uniform float uTime, uAspect, uGradual, uWidth1, uWidth2, uScale1, uScale2, uIntensity, uSpinSpeed, uSpinAmount;
      uniform vec3 colour1, colour2, colour3, colour4;
      uniform vec2 uOffset;
      varying vec2 vUv;
      void main(){
        float speed = uTime * uSpinSpeed;
        vec2 uv = vec2(vUv.x * uAspect, vUv.y);
        float center = uAspect;
        uv.y -= 0.5;
        uv.x -= 0.5 * center;
        uv *= 2.0;
        uv += uOffset;
        float uv_len = length(uv);
        float angle = atan(uv.y, uv.x);
        angle -= uSpinAmount * uv_len;
        angle += speed;
        uv = vec2(uv_len * cos(angle), uv_len * sin(angle)) * uScale2;
        uv *= uScale1;
        vec2 uv2 = vec2(uv.x + uv.y);
        for (int i = 0; i < 5; i++) {
          uv2 += sin(uv);
          uv += vec2(cos(uIntensity * uv2.y + speed), sin(uIntensity * uv2.x - speed));
          uv -= cos(uv.x + uv.y) - sin(uv.x - uv.y);
        }
        float paint_res = smoothstep(0.0, uGradual, length(uv) / uScale1);
        float c3p = 1.0 - min(uWidth2, abs(paint_res - 0.5)) * (1.0 / uWidth2);
        float c_out = max(0.0, (paint_res - (1.0 - uWidth1))) * (1.0 / uWidth1);
        float c_in  = max(0.0, -(paint_res - uWidth1)) * (1.0 / uWidth1);
        float c4p = c_out + c_in;
        vec3 ret_col = mix(colour1, colour2, paint_res);
        ret_col = mix(ret_col, colour3, c3p);
        ret_col = mix(ret_col, colour4, c4p);
        gl_FragColor = vec4(ret_col, 1.0);
      }`,
    depthWrite: false,
    depthTest: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  menuScene.add(quad);
}

/* ============================================================
   5b. 主菜单 FX：故障 + noise
   ============================================================ */
const menuFxCanvas = document.getElementById('menuFxCanvas');
let menuFxCtx = null;
let menuNoiseTile = null;
let menuGlitchTimer = 0;
let menuGlitchActive = 0;

function initMenuFx() {
  if (!menuFxCanvas || menuFxCtx) return;
  menuFxCtx = menuFxCanvas.getContext('2d');

  /* 生成一次性 noise tile */
  const size = 128;
  menuNoiseTile = document.createElement('canvas');
  menuNoiseTile.width = menuNoiseTile.height = size;
  const nctx = menuNoiseTile.getContext('2d');
  const img = nctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 40;
  }
  nctx.putImageData(img, 0, 0);
  resizeMenuFx();
}

function resizeMenuFx() {
  if (!menuFxCanvas) return;
  const w = window.innerWidth, h = window.innerHeight;
  const scale = 0.5;
  menuFxCanvas.width = Math.max(2, Math.floor(w * scale));
  menuFxCanvas.height = Math.max(2, Math.floor(h * scale));
}

function drawMenuFx(dt) {
  if (!menuFxCtx || !menuNoiseTile) return;
  const ctx = menuFxCtx;
  const w = menuFxCanvas.width, h = menuFxCanvas.height;
  ctx.clearRect(0, 0, w, h);

  /* noise 铺满 */
  ctx.globalAlpha = 0.55;
  for (let y = 0; y < h; y += 128) {
    for (let x = 0; x < w; x += 128) {
      ctx.drawImage(menuNoiseTile, x, y);
    }
  }

  /* 扫描线 */
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#000';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);

  /* 随机故障 */
  menuGlitchTimer -= dt;
  if (menuGlitchTimer <= 0 && Math.random() < 0.10) {
    menuGlitchTimer = 0.7 + Math.random() * 2.5;
    menuGlitchActive = 0.12 + Math.random() * 0.10;
  }
  if (menuGlitchActive > 0) {
    menuGlitchActive -= dt;
    const slices = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < slices; i++) {
      const y = Math.random() * h;
      const sh = 1 + Math.random() * 6;
      const dx = (Math.random() - 0.5) * w * 0.25;
      const color = [
        'rgba(0, 255, 255, 0.32)',
        'rgba(255, 0, 255, 0.28)',
        'rgba(255, 80, 80, 0.22)',
      ][Math.floor(Math.random() * 3)];
      ctx.fillStyle = color;
      ctx.fillRect(dx, y, w, sh);
    }
  }

  ctx.globalAlpha = 1;
}

/* ============================================================
   6. 装配
   ============================================================ */
setMapType('park');
buildTerrain('park');
resetEnemies();
rebuildCarMesh();

applyLanguage();

initGameplay();
initHud();
initMenus();
initViewers();
initBgmPlayer();
initStory();

initGamepad();

/* ============================================================
   7. 主循环
   ============================================================ */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.05);

  if (state.phase === 'boot') {
    renderer.render(scene, camera);
    return;
  }

  pollGamepad();
  tickMenus();

  updateEngineSound(rawDt);

  if (state.phase === 'menu') {
    if (!menuBgStarted) { initMenuBg(); initMenuFx(); }
    if (menuRenderer) {
      menuUniforms.uTime.value = performance.now() * 0.001;
      const cw = menuBgCanvas.clientWidth || 1;
      const ch = menuBgCanvas.clientHeight || 1;
      menuUniforms.uAspect.value = cw / ch;
      menuRenderer.setSize(cw, ch, false);
      menuRenderer.render(menuScene, menuCamera);
    }
    drawMenuFx(rawDt);
    tickViewers(rawDt);
    tickBgmPlayer();
    return;
  }

  if (state.phase === 'story') return;

  tickViewers(rawDt);
  tickBgmPlayer();

  if (state.fovKick > 0) {
    state.fovKick *= Math.exp(-14 * rawDt);
    if (state.fovKick < 0.05) state.fovKick = 0;
  }

  updateSpeedFx(rawDt);

  let ts = state.timeScale;
  if (state.bulletTime > 0) {
    state.bulletTime -= rawDt;
    ts = 0.15;
  } else if (state.phase === 'card') {
    ts = 0.15;
  }
  if (state.hitStop > 0) {
    state.hitStop -= rawDt;
    ts *= 0.4;
  }
  const dt = rawDt * ts;

  if (state.phase === 'playing' || state.phase === 'card') {
    state.elapsed += rawDt;

    updateSpawning(dt);
    updatePlayer(dt);
    updateEnemies(dt);
    updateSkills(dt);
    updateBullets(dt);
    updateEnemyBullets(dt);
    checkRam(dt);
    checkPointOverflow();

    if (player.hp <= 0) triggerGameOver();
  }

  {
    const carMesh = getCarMesh();
    if (carMesh) setCarMeshY(carMesh.position.y);
  }
  if (state.phase === 'playing') {
    emitExhaustFlames(dt, getSpeedFxIntensity());
  }
  updateExhaustFlames(dt);

  updateLightning(rawDt);
  updateFx(rawDt);
  updateParticles(rawDt);
  updateDestructibles(rawDt);
  updateDebris(rawDt);

  tickHud();

  if (state.screenShake > 0) {
    state.screenShake = Math.max(0, state.screenShake - rawDt * 60);
    const s = state.screenShake * 0.35;
    renderer.domElement.style.transform =
      `translate(${(Math.random() - 0.5) * s}px, ${(Math.random() - 0.5) * s}px)`;
  } else {
    renderer.domElement.style.transform = '';
  }

  drawSpeedOverlay(getSpeedFxIntensity());

  renderer.render(scene, camera);
}

animate();

checkOrientation();
emitResize();
