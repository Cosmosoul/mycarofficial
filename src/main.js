/* ============================================================
   main.js —— 唯一入口
   · 初始化 three.js / 场景 / 地形 / 系统 / UI
   · 主循环：boot / menu / story / playing 四个阶段
   ============================================================ */

import * as THREE from 'three';

/* ---------- core ---------- */
import {
  scene, camera, renderer, emit,
  state, player, selectedCarId,
} from '@/core.js';
import { mountRenderer } from '@/core.js';

/* ---------- platform ---------- */
import {
  platform, installKeyboard, onResize, emitResize,
  isForcedRotate,
} from '@/platform.js';

/* ---------- i18n ---------- */
import { applyLanguage, getLang } from '@/i18n.js';

/* ---------- content ---------- */
import { attachZombieMeshes } from '@/content/enemies.js';
import { pickRandomMap } from '@/content/maps.js';
import { V } from '@/content/vehicles.js';

/* ---------- audio ---------- */
import {
  initAudio, updateEngineSound, startBGM, stopBGM,
  pickRandomGameTrack,
} from '@/audio.js';

/* ---------- fx ---------- */
import {
  initFxLayer, initSpeedLines, resizeSpeedLineCanvas, drawSpeedOverlay,
  updateSpeedFx, getSpeedFxIntensity, emitExhaustFlames, updateExhaustFlames,
  updateBullets, updateParticles, updateLightning, updateFx,
  updateEnemyBullets, setCarMeshY,
} from '@/fx.js';

/* ---------- world / entities ---------- */
import {
  buildTerrain, updateDestructibles, updateDebris, setMapType,
} from '@/world.js';
import {
  rebuildCarMesh, resetEnemies, attachEnemyMeshes, getCarMesh,
} from '@/entities.js';

/* ---------- systems ---------- */
import {
  initGameplay, resetGame, updateSpawning, updateEnemies, updatePlayer,
  updateSkills, checkRam, checkPointOverflow,
  doDodge, doJump, triggerGameOver,
} from '@/systems/gameplay.js';

/* ---------- ui ---------- */
import { initHud, tickHud } from '@/ui/hud.js';
import { initMenus } from '@/ui/menus.js';
import { initViewers, tickViewers } from '@/ui/viewers.js';
import { initBgmPlayer, tickBgmPlayer } from '@/ui/bgm-player.js';
import { initStory, onStoryResize } from '@/ui/story.js';

/* ============================================================
   1. 注入 THREE 向量到全局状态
   ============================================================ */
player.pos = new THREE.Vector3(0, 0, 0);
player.dodgeStartPos = new THREE.Vector3();
player.dodgeEndPos = new THREE.Vector3();

/* ============================================================
   2. 挂载渲染器 / 加入敌人 InstancedMesh / 初始化特效层
   ============================================================ */
mountRenderer();
attachEnemyMeshes();
initFxLayer();
initSpeedLines();

/* ============================================================
   3. 键鼠 / 键盘
   ============================================================ */
installKeyboard((e) => {
  /* 游戏内快捷操作 */
  if (e.code === 'KeyK' && state.phase === 'playing') doDodge();
  if (e.code === 'Space' && state.phase === 'playing') { e.preventDefault(); doJump(); }
  if (state.phase === 'story' && (e.code === 'Space' || e.code === 'Enter')) {
    // story 的 skip 在 story.js 内部监听 —— 这里同步派发
    document.getElementById('storyScreen').click();
  }
  /* Esc 与卡牌快捷键由 menus.js 处理 */
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
  onStoryResize(w, h);
  resizeSpeedLineCanvas();
  checkOrientation();
  updateFullscreenButtons();
});

/* 强制旋转时更新尺寸 */
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

/* 全屏按钮文案同步 —— 委托给 menus.js 的内部函数，此处只做状态感知 */
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
   6. 装配：地形 / 车 / UI
   ============================================================ */
setMapType('park');
buildTerrain('park');
resetEnemies();
rebuildCarMesh();
// resetGame 内部会再次 buildTerrain，但保证一致
/* 注意：第一次 resetGame 之前 state.phase 还是 'boot'，所以不会真正开跑；
   后面 phase 变为 'menu' 时 loop 会跳过游戏更新。 */

applyLanguage();

/* 一次性初始化所有子系统 */
initGameplay();
initHud();
initMenus();
initViewers();
initBgmPlayer();
initStory();

/* ============================================================
   7. 主循环
   ============================================================ */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.05);

  /* ---------- boot：只渲染初始场景 ---------- */
  if (state.phase === 'boot') {
    renderer.render(scene, camera);
    return;
  }

  /* ---------- 引擎声浪（所有阶段都跑，非 game 时自动静音） ---------- */
  updateEngineSound(rawDt);

  /* ---------- menu：背景 shader + viewer / BGM / 车库 ---------- */
  if (state.phase === 'menu') {
    if (!menuBgStarted) initMenuBg();
    if (menuRenderer) {
      menuUniforms.uTime.value = performance.now() * 0.001;
      const cw = menuBgCanvas.clientWidth || 1;
      const ch = menuBgCanvas.clientHeight || 1;
      menuUniforms.uAspect.value = cw / ch;
      menuRenderer.setSize(cw, ch, false);
      menuRenderer.render(menuScene, menuCamera);
    }
    tickViewers(rawDt);
    tickBgmPlayer();
    return;
  }

  /* ---------- story：由 story.js 自己的 raf 驱动 ---------- */
  if (state.phase === 'story') {
    return;
  }

  /* ---------- viewer / garage / bgm 面板（游戏内仍可打开） ---------- */
  tickViewers(rawDt);
  tickBgmPlayer();

  /* ---------- FOV kick 衰减 ---------- */
  if (state.fovKick > 0) {
    state.fovKick *= Math.exp(-14 * rawDt);
    if (state.fovKick < 0.05) state.fovKick = 0;
  }

  /* ---------- 速度感 ---------- */
  updateSpeedFx(rawDt);

  /* ---------- 计算时间缩放 ---------- */
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

  /* ---------- 游戏 / 卡牌阶段：更新所有玩法系统 ---------- */
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

  /* ---------- 尾焰 ---------- */
  /* 把车体 Y 偏移传给 fx.js */
  {
    const carMesh = getCarMesh();
    if (carMesh) setCarMeshY(carMesh.position.y);
  }
  if (state.phase === 'playing') {
    emitExhaustFlames(dt, getSpeedFxIntensity());
  }
  updateExhaustFlames(dt);

  /* ---------- 全局特效 ---------- */
  updateLightning(rawDt);
  updateFx(rawDt);
  updateParticles(rawDt);
  updateDestructibles(rawDt);
  updateDebris(rawDt);

  /* ---------- HUD ---------- */
  tickHud();

  /* ---------- 屏幕震动 ---------- */
  if (state.screenShake > 0) {
    state.screenShake = Math.max(0, state.screenShake - rawDt * 60);
    const s = state.screenShake * 0.35;
    renderer.domElement.style.transform =
      `translate(${(Math.random() - 0.5) * s}px, ${(Math.random() - 0.5) * s}px)`;
  } else {
    renderer.domElement.style.transform = '';
  }

  /* ---------- 速度线 overlay ---------- */
  drawSpeedOverlay(getSpeedFxIntensity());

  /* ---------- 主渲染 ---------- */
  renderer.render(scene, camera);
}

animate();

/* ============================================================
   8. 启动后续
   ============================================================ */
checkOrientation();
emitResize();