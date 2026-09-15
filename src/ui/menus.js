/* ============================================================
   ui/menus.js —— 菜单 / 弹窗 / 结算 / 选关 / 设置 / 帮助 / 卡牌 UI
   ============================================================ */

import {
  on, emit, state,
  engineEnabled, setEngineEnabled,
} from '@/core.js';
import {
  bindTap, bindTouchButton, platform, save, load, emitResize,
  requestFullscreen, exitFullscreen, isFullscreen, isForcedRotate,
  lockLandscape, enableForceRotate, screenDeltaToWrapper,
} from '@/platform.js';
import { T, setLang, getLang } from '@/i18n.js';
import {
  LEVELS, getLevelName, getLevelRewardText,
  isLevelUnlocked, getLevelStars, saveLevelResult,
  getNewlyUnlockedCars,
} from '@/config.js';
import {
  startLevel, restartGame, pickCard, getSkillValueDesc,
  setTouchPedals, getTouchThrottle, getTouchBrake,
  setJoystickSteer, doJump, doDodge,
} from '@/systems/gameplay.js';
import {
  initAudio, sfxUI, sfxVictory, sfxGameOver,
  refreshVolumes, startBGM, stopBGM, getMusicGain,
} from '@/audio.js';
import {
  clearFlames, clearParticles, clearEnemyBullets,
} from '@/fx.js';
import { clearDmgNumbers } from '@/ui/hud.js';
import { vehName } from '@/content/vehicles.js';
import { shouldPlayFirstStory } from '@/ui/story.js';
import {
  pad, rumbleLight, panicRumble,
  invertY, setInvertY,
  rumbleEnabled, setRumbleEnabled,
} from '@/gamepad.js';

/* ============================================================
   0. 工具
   ============================================================ */
export function showUnlockToast(text) {
  const el = document.createElement('div');
  el.className = 'floating-toast';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('out'), 1900);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 2500);
}

function clearAllFx() {
  clearFlames();
  clearParticles();
  clearEnemyBullets();
  clearDmgNumbers();
}

function closeAllOverlays() {
  document.getElementById('levelSelectScreen').classList.remove('show');
  document.getElementById('levelGoalModal').classList.remove('show');
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('victoryScreen').classList.remove('show');
  document.getElementById('overScreen').classList.remove('show');
  document.getElementById('pauseMenu').classList.remove('show');
  document.getElementById('cards').classList.remove('show');
}

function applyEngineToggleUI() {
  document.querySelectorAll('[data-engine-toggle]').forEach(btn => {
    btn.classList.toggle('active', engineEnabled);
  });
}

function applyRumbleToggleUI() {
  document.querySelectorAll('[data-rumble-toggle]').forEach(btn => {
    btn.classList.toggle('active', rumbleEnabled);
  });
}

function applyInvertYToggleUI() {
  document.querySelectorAll('[data-invert-y-toggle]').forEach(btn => {
    btn.classList.toggle('active', invertY);
  });
}

function updateFullscreenButtons() {
  const fs = isFullscreen() || isForcedRotate();
  document.querySelectorAll('.fs-btn').forEach(b => {
    b.textContent = fs ? T('exitFullscreen') : T('fullscreen');
  });
}

function toggleFullscreen() {
  sfxUI();
  if (isFullscreen()) { exitFullscreen(); return; }
  requestFullscreen();
  if (platform.isMobile) lockLandscape();
  setTimeout(updateFullscreenButtons, 160);
}

/* ============================================================
   1. 启动页 → 主菜单
   ============================================================ */
function enterMainMenu(playBootTransition) {
  const bootScreen = document.getElementById('bootScreen');
  bootScreen.classList.add('fadeout');
  setTimeout(() => { bootScreen.style.display = 'none'; }, 650);

  const startScreen = document.getElementById('startScreen');
  if (playBootTransition && !state.bootTransitionPlayed) {
    state.bootTransitionPlayed = true;
    startScreen.classList.add('boot-transition');
    setTimeout(() => { startScreen.classList.remove('boot-transition'); }, 2200);
  }
  state.phase = 'menu';
  setTimeout(() => {
    initAudio();
    startBGM('menu');
  }, 400);
}

function initBootScreen() {
  const bootScreen = document.getElementById('bootScreen');
  let tapped = false;

  function handleBootTap(e) {
    if (e) { try { e.preventDefault(); e.stopPropagation(); } catch (err) {} }
    if (tapped) return;
    tapped = true;
    initAudio();

    if (platform.isMobile) {
      requestFullscreen();
      lockLandscape();
      setTimeout(() => {
        if (!isFullscreen() && window.innerHeight > window.innerWidth) {
          enableForceRotate();
        }
      }, 400);
    }
    enterMainMenu(true);
  }

  bootScreen.addEventListener('touchend', handleBootTap, { passive: false });
  bootScreen.addEventListener('click', handleBootTap);
}

/* ============================================================
   2. 选关
   ============================================================ */
let currentPage = 0;
const TOTAL_PAGES = 3;
let pendingLevelId = 1;

function renderLevelSelect() {
  const grid = document.getElementById('levelGrid');
  grid.innerHTML = '';
  const startId = currentPage * 6 + 1;

  for (let i = 0; i < 6; i++) {
    const id = startId + i;
    if (id > 16) {
      const empty = document.createElement('div');
      empty.style.opacity = '0';
      grid.appendChild(empty);
      continue;
    }
    const unlocked = isLevelUnlocked(id);
    const stars = getLevelStars(id);
    const card = document.createElement('div');
    card.className = 'level-card' + (unlocked ? '' : ' locked') + (id === 16 ? ' infinite' : '');

    if (!unlocked) {
      card.innerHTML = `<div class="level-num">🔒</div><div class="level-name">???</div>`;
    } else {
      const starHTML = id === 16
        ? `<div class="level-stars" style="font-size:clamp(12px,2vh,16px);font-weight:900;color:#A78BFA;letter-spacing:2px">∞</div>`
        : `<div class="level-stars">${[1,2,3].map(s => `<span class="star${s <= stars ? ' filled' : ''}">★</span>`).join('')}</div>`;
      card.innerHTML = `<div class="level-num">${id === 16 ? '∞' : id}</div><div class="level-name">${getLevelName(id)}</div>${starHTML}`;
      bindTap(card, () => openLevelGoal(id));
    }
    grid.appendChild(card);
  }

  document.getElementById('pageIndicator').textContent = `${currentPage + 1} / ${TOTAL_PAGES}`;
  document.getElementById('prevPageBtn').disabled = currentPage === 0;
  document.getElementById('nextPageBtn').disabled = currentPage === TOTAL_PAGES - 1;
}

function showLevelSelect() {
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('levelSelectScreen').classList.add('show');
  initAudio();
  startBGM('levelSelect');
  renderLevelSelect();
}

function backToLevelSelect() {
  document.getElementById('levelSelectScreen').classList.add('show');
  document.getElementById('overScreen').classList.remove('show');
  document.getElementById('victoryScreen').classList.remove('show');
  document.getElementById('pauseMenu').classList.remove('show');
  document.getElementById('cards').classList.remove('show');
  state.phase = 'menu';
  clearAllFx();
  startBGM('levelSelect');
  renderLevelSelect();
}

/* ============================================================
   3. 关卡目标弹窗
   ============================================================ */
function openLevelGoal(id) {
  initAudio();
  pendingLevelId = id;
  const level = LEVELS[id - 1];

  document.getElementById('goalLv').textContent = id === 16 ? T('endlessLabel') : T('levelLabel', id);
  document.getElementById('goalName').textContent = getLevelName(id);

  if (id === 16) {
    document.getElementById('goalWaves').textContent = T('goalEndless');
    document.getElementById('goalMult').textContent = T('densityNormal');
    document.getElementById('goalStars').textContent = T('starNone');
  } else {
    document.getElementById('goalWaves').textContent = T('goalWavesN', level.waves);
    document.getElementById('goalMult').textContent = level.mult === 1.5 ? T('densityDense') : T('densityNormal');
    document.getElementById('goalStars').textContent = T('starTimes', level.times[0], level.times[1], level.times[2]);
  }
  document.getElementById('goalReward').textContent = getLevelRewardText(id);
  document.getElementById('levelGoalModal').classList.add('show');
  gpFocusedByContext.delete('levelGoal');
}

/* ============================================================
   4. 暂停 / 恢复
   ============================================================ */
function togglePause() {
  if (state.phase === 'playing') {
    state.phase = 'paused';
    document.getElementById('pauseMenu').classList.add('show');
    updateFullscreenButtons();
    const g = getMusicGain();
    if (g) g.gain.value = state.musicOn ? state.musicVolume * 0.22 * 0.4 : 0;
    panicRumble();
  } else if (state.phase === 'paused') {
    state.phase = 'playing';
    document.getElementById('pauseMenu').classList.remove('show');
    const g = getMusicGain();
    if (g) g.gain.value = state.musicOn ? state.musicVolume * 0.22 : 0;
  }
}

/* ============================================================
   5. 音量 / 引擎 / 语言 / 全屏 / 手柄设置
   ============================================================ */
function bindVolumeSliders() {
  document.querySelectorAll('.vol-slider').forEach(slider => {
    const type = slider.dataset.type;
    if (type === 'sfx')   slider.value = Math.round(state.sfxVolume * 100);
    if (type === 'music') slider.value = Math.round(state.musicVolume * 100);

    slider.addEventListener('input', (e) => {
      const v = parseInt(e.target.value) / 100;
      if (type === 'sfx') {
        state.sfxVolume = v;
        save('myCarSfxVol', v.toString());
      } else {
        state.musicVolume = v;
        save('myCarMusicVol', v.toString());
      }
      refreshVolumes();

      document.querySelectorAll(`.vol-slider[data-type="${type}"]`).forEach(s => {
        s.value = Math.round(v * 100);
      });
      document.querySelectorAll(`.vol-val[data-val="${type}"]`).forEach(el => {
        el.textContent = Math.round(v * 100);
      });
      initAudio();
    });
  });
}

function initEngineToggle() {
  document.querySelectorAll('[data-engine-toggle]').forEach(btn => {
    bindTap(btn, () => {
      initAudio();
      sfxUI();
      setEngineEnabled(!engineEnabled);
      applyEngineToggleUI();
    });
  });
  applyEngineToggleUI();
}

function initGamepadSettings() {
  document.querySelectorAll('[data-rumble-toggle]').forEach(btn => {
    bindTap(btn, () => {
      initAudio();
      sfxUI();
      setRumbleEnabled(!rumbleEnabled);
      applyRumbleToggleUI();
    });
  });
  document.querySelectorAll('[data-invert-y-toggle]').forEach(btn => {
    bindTap(btn, () => {
      initAudio();
      sfxUI();
      setInvertY(!invertY);
      applyInvertYToggleUI();
    });
  });
  applyRumbleToggleUI();
  applyInvertYToggleUI();
}

/* ============================================================
   6. 触摸控制
   ============================================================ */
const JOYSTICK_MAX_OFFSET = 70;
let joystickTouchId = null;
let joystickOriginX = 0, joystickOriginY = 0;
let joystickMouseDown = false;

const joystickBase = document.getElementById('joystickBase');
const joystickKnob = document.getElementById('joystickKnob');

function updateJoystickKnobVisual(dx, dy) {
  joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function resetJoystick() {
  joystickTouchId = null;
  setJoystickSteer(0);
  updateJoystickKnobVisual(0, 0);
  joystickBase.classList.remove('active');
}

function onJoystickMove(cx, cy) {
  const rawDx = cx - joystickOriginX;
  const rawDy = cy - joystickOriginY;
  const { dx: cdx, dy: cdy } = screenDeltaToWrapper(rawDx, rawDy);
  let dx = cdx, dy = cdy;
  const dist = Math.hypot(dx, dy);
  if (dist > JOYSTICK_MAX_OFFSET) {
    dx = dx / dist * JOYSTICK_MAX_OFFSET;
    dy = dy / dist * JOYSTICK_MAX_OFFSET;
  }
  updateJoystickKnobVisual(dx, dy);
  setJoystickSteer(-Math.max(-1, Math.min(1, cdx / JOYSTICK_MAX_OFFSET)));
}

function initJoystick() {
  joystickBase.addEventListener('touchstart', (e) => {
    e.preventDefault(); e.stopPropagation();
    initAudio();
    if (state.phase !== 'playing') return;
    const t = e.changedTouches[0];
    joystickTouchId = t.identifier;
    joystickOriginX = t.clientX;
    joystickOriginY = t.clientY;
    updateJoystickKnobVisual(0, 0);
    setJoystickSteer(0);
    joystickBase.classList.add('active');
  }, { passive: false });

  joystickBase.addEventListener('touchmove', (e) => {
    e.preventDefault(); e.stopPropagation();
    for (const t of e.changedTouches) {
      if (t.identifier === joystickTouchId) { onJoystickMove(t.clientX, t.clientY); break; }
    }
  }, { passive: false });

  joystickBase.addEventListener('touchend', (e) => {
    e.preventDefault(); e.stopPropagation();
    for (const t of e.changedTouches) {
      if (t.identifier === joystickTouchId) { resetJoystick(); break; }
    }
  }, { passive: false });

  joystickBase.addEventListener('touchcancel', (e) => {
    e.preventDefault(); e.stopPropagation();
    resetJoystick();
  }, { passive: false });

  joystickBase.addEventListener('mousedown', (e) => {
    e.preventDefault();
    initAudio();
    if (state.phase !== 'playing') return;
    joystickMouseDown = true;
    joystickOriginX = e.clientX;
    joystickOriginY = e.clientY;
    updateJoystickKnobVisual(0, 0);
    setJoystickSteer(0);
    joystickBase.classList.add('active');
  });

  window.addEventListener('mousemove', (e) => {
    if (joystickMouseDown) onJoystickMove(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', () => {
    if (joystickMouseDown) { joystickMouseDown = false; resetJoystick(); }
  });
}

function initTouchControls() {
  if (platform.isMobile) {
    document.getElementById('pauseBtn').style.display = 'flex';
    document.getElementById('joystickBase').style.display = 'block';
    document.getElementById('touchThrottle').style.display = 'flex';
    document.getElementById('touchBrake').style.display = 'flex';
    document.getElementById('touchJump').style.display = 'flex';
    document.getElementById('touchDodge').style.display = 'flex';
  }

  initJoystick();

  bindTouchButton(document.getElementById('touchThrottle'), {
    onDown: () => { if (state.phase === 'playing') setTouchPedals(true, getTouchBrake()); },
    onUp:   () => setTouchPedals(false, getTouchBrake()),
  });
  bindTouchButton(document.getElementById('touchBrake'), {
    onDown: () => { if (state.phase === 'playing') setTouchPedals(getTouchThrottle(), true); },
    onUp:   () => setTouchPedals(getTouchThrottle(), false),
  });
  bindTouchButton(document.getElementById('touchJump'), {
    onDown: () => { if (state.phase === 'playing') doJump(); },
    onUp:   () => {},
  });
  bindTouchButton(document.getElementById('touchDodge'), {
    onDown: () => { if (state.phase === 'playing') doDodge(); },
    onUp:   () => {},
  });

  bindTap(document.getElementById('pauseBtn'), () => {
    initAudio();
    togglePause();
  });
}

function clearTouchState() {
  setTouchPedals(false, false);
  setJoystickSteer(0);
  resetJoystick();
  const th = document.getElementById('touchThrottle');
  const br = document.getElementById('touchBrake');
  if (th) th.classList.remove('pressed');
  if (br) br.classList.remove('pressed');
}

/* ============================================================
   7. 胜利 / 失败
   ============================================================ */
function showVictory(payload) {
  const lv = payload.level;
  const level = LEVELS[lv - 1];

  let stars = 1;
  if (level.times) {
    if (payload.time <= level.times[0]) stars = 3;
    else if (payload.time <= level.times[1]) stars = 2;
  }
  saveLevelResult(lv, stars, payload.time);

  stopBGM();
  sfxVictory();
  state.screenShake = 18;

  clearTouchState();
  clearFlames();
  panicRumble();
  document.getElementById('dangerVignette').style.opacity = '0';

  const newCars = getNewlyUnlockedCars();
  const unlockEl = document.getElementById('victoryUnlock');
  const rewardParts = [];
  if (newCars.length > 0) {
    const names = newCars.map(id => vehName(id)).join(getLang() === 'zh' ? '、' : ', ');
    rewardParts.push(T('newCarUnlocked', names));
  }
  if (lv === 15) rewardParts.push(T('endlessUnlocked'));

  if (rewardParts.length > 0) {
    unlockEl.style.display = 'block';
    unlockEl.innerHTML = rewardParts.join('<br>');
  } else {
    unlockEl.style.display = 'none';
  }

  document.getElementById('victoryLv').textContent = T('levelWithName', lv, getLevelName(lv));
  const starEls = document.querySelectorAll('#victoryStars .star');
  starEls.forEach((el, i) => el.classList.toggle('filled', i < stars));

  const m = Math.floor(payload.time / 60);
  const s = Math.floor(payload.time % 60);
  document.getElementById('vicTime').textContent = `${m}:${s.toString().padStart(2, '0')}`;
  document.getElementById('vicKills').textContent = payload.kills;
  document.getElementById('vicWaves').textContent = payload.waves;
  document.getElementById('vicPoints').textContent = payload.points;

  const nextBtn = document.getElementById('vicNextBtn');
  if (lv < 15) {
    nextBtn.textContent = T('nextLevel');
    nextBtn.style.display = '';
  } else if (lv === 15) {
    nextBtn.textContent = T('unlockEndlessBtn');
    nextBtn.style.display = '';
  } else {
    nextBtn.style.display = 'none';
  }

  document.getElementById('victoryScreen').classList.add('show');
  gpFocusedByContext.delete('victory');
}

function showGameOver(payload) {
  stopBGM();
  sfxGameOver();
  state.screenShake = 20;

  clearTouchState();
  clearFlames();
  panicRumble();
  document.getElementById('dangerVignette').style.opacity = '0';

  document.getElementById('ovWave').textContent = payload.wave;
  document.getElementById('ovKills').textContent = payload.kills;
  const m = Math.floor(payload.time / 60);
  const s = Math.floor(payload.time % 60);
  document.getElementById('ovTime').textContent = `${m}:${s.toString().padStart(2, '0')}`;
  document.getElementById('ovPoints').textContent = payload.points;
  document.getElementById('overSub').textContent =
    payload.mode === 'infinite' ? T('endlessLabel') : T('levelLabel', payload.level);
  document.getElementById('overScreen').classList.add('show');
  gpFocusedByContext.delete('over');
}

/* ============================================================
   8. 卡牌 UI
   ============================================================ */
function initCardUI() {
  const cardsEl = document.getElementById('cards');
  const row = document.getElementById('cardRow');

  on('cards:show', ({ picks }) => {
    row.innerHTML = '';
    picks.forEach(p => {
      const el = document.createElement('div');
      el.className = 'card';

      let effectHTML = '';
      let lvLineHTML = '';

      if (p.type === 'heal') {
        effectHTML = `<div class="card-effect"><span class="next">${T('cardHealEffect')}</span></div>`;
        lvLineHTML = `<div class="card-lv">${T('cardImmediate')}</div>`;
      } else if (p.type === 'maxhp') {
        effectHTML = `<div class="card-effect"><span class="next">${T('cardMaxHpEffect')}</span></div>`;
        lvLineHTML = `<div class="card-lv">${T('cardInstantPermanent')}</div>`;
      } else {
        const nd = getSkillValueDesc(p.key, p.nextLv);
        if (p.currentLv === 0) {
          effectHTML = `<div class="card-effect"><span class="next">${T('cardActivate')}${nd}</span></div>`;
        } else {
          const cd = getSkillValueDesc(p.key, p.currentLv);
          effectHTML =
            `<div class="card-effect"><span class="cur">Lv.${p.currentLv}: ${cd}</span></div>` +
            `<div class="card-effect"><span class="arrow">▼</span></div>` +
            `<div class="card-effect"><span class="next">Lv.${p.nextLv}: ${nd}</span></div>`;
        }
        lvLineHTML = `<div class="card-lv">Lv.${p.currentLv} → ${p.nextLv}</div>`;
      }

      el.innerHTML =
        `<div class="card-numeral">${p.numeral || ''}</div>` +
        `<div class="card-sigil"><span class="card-icon">${p.icon}</span></div>` +
        `<div class="card-name">${T('card_' + p.key + '_name')}</div>` +
        `<div class="card-divider"></div>` +
        lvLineHTML +
        effectHTML +
        `<div class="card-desc">${T('card_' + p.key + '_desc')}</div>`;

      bindTap(el, () => {
        initAudio();
        pickCard(p);
      });
      row.appendChild(el);
    });
    cardsEl.classList.add('show');
    gpFocusReset();
  });

  on('cards:hide', () => {
    cardsEl.classList.remove('show');
  });
}

/* ============================================================
   9. 键盘辅助
   ============================================================ */
function onGlobalKeydown(e) {
  if (e.code === 'Escape' && (state.phase === 'playing' || state.phase === 'paused')) {
    togglePause();
  }
  if (state.phase === 'card') {
    if (e.code === 'Digit1') { const c = document.querySelectorAll('.card')[0]; if (c) c.click(); }
    if (e.code === 'Digit2') { const c = document.querySelectorAll('.card')[1]; if (c) c.click(); }
    if (e.code === 'Digit3') { const c = document.querySelectorAll('.card')[2]; if (c) c.click(); }
  }
}

/* ============================================================
   10. 手柄菜单导航 —— 坐标锚点式
   · 每个界面手动定义 {el, r, c} 坐标
   · up/down/left/right 按坐标找邻居：主方向权重 10，次方向权重 1
   · 滑条上左右改值；单元素界面上下改为滚动父容器
   ============================================================ */

let gpFocused = null;
let gpMode = false;
let gpLastContext = null;
let gpLastIndex = 0;
const gpFocusedByContext = new Map();

const PERSISTENT_CONTEXTS = new Set([
  'mainMenu', 'pause', 'settings', 'gallery', 'garage', 'bgm', 'levelSelect',
]);

function gpFocusReset() {
  gpFocused = null;
  gpLastIndex = 0;
  document.querySelectorAll('.gp-focus').forEach(el => el.classList.remove('gp-focus'));
}

function gpApplyFocus(el) {
  document.querySelectorAll('.gp-focus').forEach(x => x.classList.remove('gp-focus'));
  gpFocused = el;
  if (el && el.isConnected) {
    el.classList.add('gp-focus');
    try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
  }
}

function gpContextKey() {
  if (document.getElementById('helpScreen').classList.contains('show')) return 'help';
  if (document.getElementById('settingsScreen').classList.contains('show')) return 'settings';
  if (document.getElementById('levelGoalModal').classList.contains('show')) return 'levelGoal';
  if (document.getElementById('victoryScreen').classList.contains('show')) return 'victory';
  if (document.getElementById('overScreen').classList.contains('show')) return 'over';
  if (state.phase === 'paused' && document.getElementById('pauseMenu').classList.contains('show')) return 'pause';
  if (state.phase === 'card') return 'card';
  if (document.getElementById('galleryScreen').classList.contains('show')) {
    return document.getElementById('galleryPaneBgm').classList.contains('active') ? 'bgm' : 'gallery';
  }
  if (document.getElementById('garageScreen').classList.contains('show')) return 'garage';
  if (document.getElementById('levelSelectScreen').classList.contains('show')) return 'levelSelect';
  if (state.phase === 'menu' && document.getElementById('startScreen').style.display !== 'none') return 'mainMenu';
  return null;
}

/* ★ 每个界面手写 {el, r, c} 坐标 */
function gpBuildPoints() {
  const el = (id) => document.getElementById(id);
  const $ = (sel) => [...document.querySelectorAll(sel)];
  const out = [];
  const add = (e, r, c) => { if (e && e.isConnected && !e.disabled) out.push({ el: e, r, c }); };

  /* 帮助页：只有关闭 */
  if (el('helpScreen').classList.contains('show')) {
    add(el('helpCloseBtn'), 0, 0);
    return out;
  }

  /* 设置：单列 */
  if (el('settingsScreen').classList.contains('show')) {
    const items = [
      $('#settingsScreen .vol-slider[data-type="sfx"]')[0],
      $('#settingsScreen .vol-slider[data-type="music"]')[0],
      $('#settingsScreen [data-engine-toggle]')[0],
      $('#settingsScreen [data-rumble-toggle]')[0],
      $('#settingsScreen [data-invert-y-toggle]')[0],
      $('#settingsScreen .fs-btn')[0],
      el('settingsCloseBtn'),
    ];
    items.forEach((e, i) => add(e, i, 0));
    return out;
  }

  /* 暂停：单列 */
  if (state.phase === 'paused' && el('pauseMenu').classList.contains('show')) {
    const items = [
      $('#pauseMenu button[data-act="resume"]')[0],
      $('#pauseMenu button[data-act="menu"]')[0],
      $('#pauseMenu .vol-slider[data-type="sfx"]')[0],
      $('#pauseMenu .vol-slider[data-type="music"]')[0],
      $('#pauseMenu [data-engine-toggle]')[0],
      $('#pauseMenu [data-rumble-toggle]')[0],
      $('#pauseMenu [data-invert-y-toggle]')[0],
      $('#pauseMenu .fs-btn')[0],
      $('#pauseMenu .lang-btn[data-lang="en"]')[0],
      $('#pauseMenu .lang-btn[data-lang="zh"]')[0],
    ];
    items.forEach((e, i) => add(e, i, 0));
    return out;
  }

  /* 主菜单：2 列网格 */
  if (state.phase === 'menu' && el('startScreen').style.display !== 'none') {
    add(el('startBtn'),    0, 0);
    add(el('garageBtn'),   1, 0);
    add(el('galleryBtn'),  1, 1);
    add(el('helpBtn'),     2, 0);
    add(el('settingsBtn'), 2, 1);
    add($('#langSwitch .lang-btn[data-lang="en"]')[0], 3, 0);
    add($('#langSwitch .lang-btn[data-lang="zh"]')[0], 3, 1);
    return out;
  }

  /* 选关：3 列网格 + 翻页 + 返回 */
  if (el('levelSelectScreen').classList.contains('show')) {
    const cards = $('#levelGrid .level-card:not(.locked)');
    cards.forEach((e, i) => add(e, Math.floor(i / 3), i % 3));
    add(el('prevPageBtn'), 2, 0);
    add(el('nextPageBtn'), 2, 2);
    add(el('levelBackBtn'), 3, 1);
    return out;
  }

  /* 关卡目标：2 个按钮上下 */
  if (el('levelGoalModal').classList.contains('show')) {
    add(el('goalConfirmBtn'), 0, 0);
    add(el('goalCancelBtn'),  1, 0);
    return out;
  }

  /* 胜利 */
  if (el('victoryScreen').classList.contains('show')) {
    add(el('vicNextBtn'), 0, 0);
    add(el('vicMenuBtn'), 1, 0);
    return out;
  }

  /* 失败 */
  if (el('overScreen').classList.contains('show')) {
    add(el('restartBtn'), 0, 0);
    add(el('menuBtn'),    1, 0);
    return out;
  }

  /* 卡牌：3 张横排 */
  if (state.phase === 'card') {
    $('.card').forEach((e, i) => add(e, 0, i));
    return out;
  }

  /* 图鉴 */
  if (el('galleryScreen').classList.contains('show')) {
    const isBgm = el('galleryPaneBgm').classList.contains('active');
    const tabs = $('.gtab');
    tabs.forEach((t, i) => add(t, 0, i));
    add(el('galleryCloseBtn'), 0, 2);

    if (isBgm) {
      const items = $('#bgmList .bgm-item');
      items.forEach((it, i) => add(it, 1 + i, 0));
      const transportRow = 1 + items.length + 1;
      add(el('bgmPrev'), transportRow, 0);
      add(el('bgmPlay'), transportRow, 1);
      add(el('bgmNext'), transportRow, 2);
      add(el('bgmStop'), transportRow, 3);
      add($('.bgm-vol .vol-slider')[0], transportRow, 4);
    } else {
      const items = $('#galleryList .gallery-item');
      items.forEach((it, i) => add(it, 1 + i, 0));
    }
    return out;
  }

  /* 车库：左列列表 + 右上 closeBtn + 右下 selectBtn */
  if (el('garageScreen').classList.contains('show')) {
    const items = $('#garageList .garage-item');
    items.forEach((it, i) => add(it, i, 0));
    add(el('garageCloseBtn'), 0, 1);
    add(el('garageSelectBtn'), 1, 1);
    return out;
  }

  return out;
}

/* ★ 坐标锚点找邻居：主方向权重 10，次方向权重 1 */
function gpFindByDir(fromEl, dir, points) {
  const fromPt = points.find(p => p.el === fromEl);
  if (!fromPt) return points[0]?.el || null;

  let best = null, bestScore = Infinity;
  for (const p of points) {
    if (p === fromPt) continue;
    const dr = p.r - fromPt.r;
    const dc = p.c - fromPt.c;

    let primary, secondary;
    if (dir === 'up') {
      if (dr >= 0) continue;
      primary = -dr; secondary = Math.abs(dc);
    } else if (dir === 'down') {
      if (dr <= 0) continue;
      primary = dr; secondary = Math.abs(dc);
    } else if (dir === 'left') {
      if (dc >= 0) continue;
      primary = -dc; secondary = Math.abs(dr);
    } else {
      if (dc <= 0) continue;
      primary = dc; secondary = Math.abs(dr);
    }

    const score = primary * 10 + secondary;
    if (score < bestScore) {
      bestScore = score;
      best = p.el;
    }
  }
  return best;
}

function gpFindScrollable(fromEl) {
  let n = fromEl;
  while (n && n !== document.body) {
    const s = getComputedStyle(n);
    if ((s.overflowY === 'auto' || s.overflowY === 'scroll')
        && n.scrollHeight > n.clientHeight + 2) {
      return n;
    }
    n = n.parentElement;
  }
  return null;
}

function gpMoveFocus(dir, points) {
  if (!points || points.length === 0) return;
  const list = points.map(p => p.el);

  if (!gpFocused || !list.includes(gpFocused)) {
    gpApplyFocus(list[0]);
    return;
  }

  /* 只有一个元素：上下改为滚动父容器 */
  if (list.length === 1) {
    if (dir === 'up' || dir === 'down') {
      const scroller = gpFindScrollable(list[0]);
      if (scroller) {
        scroller.scrollBy({ top: dir === 'up' ? -80 : 80, behavior: 'smooth' });
      }
    }
    return;
  }

  const next = gpFindByDir(gpFocused, dir, points);
  if (next && next !== gpFocused) {
    gpApplyFocus(next);
    sfxUI();
  }
}

function gpCancel() {
  if (state.phase === 'card') return;
  if (document.getElementById('helpScreen').classList.contains('show')) {
    document.getElementById('helpCloseBtn').click(); return;
  }
  if (document.getElementById('settingsScreen').classList.contains('show')) {
    document.getElementById('settingsCloseBtn').click(); return;
  }
  if (document.getElementById('levelGoalModal').classList.contains('show')) {
    document.getElementById('goalCancelBtn').click(); return;
  }
  if (document.getElementById('galleryScreen').classList.contains('show')) {
    document.getElementById('galleryCloseBtn').click(); return;
  }
  if (document.getElementById('garageScreen').classList.contains('show')) {
    document.getElementById('garageCloseBtn').click(); return;
  }
  if (document.getElementById('victoryScreen').classList.contains('show')) {
    document.getElementById('vicMenuBtn').click(); return;
  }
  if (document.getElementById('overScreen').classList.contains('show')) {
    document.getElementById('menuBtn').click(); return;
  }
  if (document.getElementById('levelSelectScreen').classList.contains('show')) {
    document.getElementById('levelBackBtn').click(); return;
  }
  if (state.phase === 'paused') {
    togglePause(); return;
  }
}

function gpIsSlider(el) {
  return el && el.tagName === 'INPUT' && el.type === 'range';
}

function gpTick() {
  if (!pad.connected) {
    if (gpMode) { gpMode = false; gpFocusReset(); gpLastContext = null; }
    return;
  }

  const anyInput = pad.navUp || pad.navDown || pad.navLeft || pad.navRight
                || pad.confirmPressed || pad.cancelPressed
                || pad.navLeftHeld || pad.navRightHeld;
  if (anyInput && !gpMode) gpMode = true;

  if (pad.pausePressed && (state.phase === 'playing' || state.phase === 'paused')) {
    initAudio();
    togglePause();
    return;
  }

  const points = gpBuildPoints();
  if (points.length === 0) {
    gpFocusReset();
    gpLastContext = null;
    return;
  }

  const list = points.map(p => p.el);
  const ctx = gpContextKey();
  const ctxChanged = (ctx !== gpLastContext);

  if (ctxChanged) {
    gpLastContext = ctx;
    gpLastIndex = 0;
    const useMemory = ctx && PERSISTENT_CONTEXTS.has(ctx);
    const remembered = useMemory ? gpFocusedByContext.get(ctx) : null;
    if (remembered && list.includes(remembered)) {
      gpApplyFocus(remembered);
    } else {
      gpApplyFocus(list[0]);
    }
  } else if (!gpFocused || !list.includes(gpFocused)) {
    /* 焦点元素被销毁（列表重建），用索引恢复 */
    if (gpLastIndex >= 0 && gpLastIndex < list.length) {
      gpApplyFocus(list[gpLastIndex]);
    } else {
      gpApplyFocus(list[0]);
    }
  }

  /* 记录索引 */
  const curIdx = list.indexOf(gpFocused);
  if (curIdx >= 0) gpLastIndex = curIdx;
  if (ctx && PERSISTENT_CONTEXTS.has(ctx) && gpFocused) {
    gpFocusedByContext.set(ctx, gpFocused);
  }

  /* 导航 */
  if (gpIsSlider(gpFocused)) {
    /* 滑条上左右改值，上下切焦点 */
    if (pad.navLeftHeld) {
      gpFocused.value = Math.max(0, parseInt(gpFocused.value) - 5);
      gpFocused.dispatchEvent(new Event('input', { bubbles: true }));
      rumbleLight();
    } else if (pad.navRightHeld) {
      gpFocused.value = Math.min(100, parseInt(gpFocused.value) + 5);
      gpFocused.dispatchEvent(new Event('input', { bubbles: true }));
      rumbleLight();
    }
    if (pad.navUp)   gpMoveFocus('up', points);
    if (pad.navDown) gpMoveFocus('down', points);
  } else {
    if (pad.navUp)    gpMoveFocus('up', points);
    if (pad.navDown)  gpMoveFocus('down', points);
    if (pad.navLeft)  gpMoveFocus('left', points);
    if (pad.navRight) gpMoveFocus('right', points);
  }

  /* 确认 */
  if (pad.confirmPressed) {
    if (gpFocused && gpFocused.isConnected && typeof gpFocused.click === 'function') {
      sfxUI();
      rumbleLight();
      gpFocused.click();
    }
  }

  /* 返回 */
  if (pad.cancelPressed) {
    gpCancel();
  }

  /* LB / RB 切图鉴页签 */
  if (pad.lbPressed || pad.rbPressed) {
    const tabs = [...document.querySelectorAll('.gtab')];
    if (tabs.length > 0) {
      const cur = tabs.findIndex(t => t.classList.contains('active'));
      const next = pad.rbPressed
        ? (cur + 1) % tabs.length
        : (cur - 1 + tabs.length) % tabs.length;
      sfxUI();
      tabs[next].click();
      gpFocused = null;
      gpLastIndex = 0;
    }
  }
}

export function tickMenus() {
  gpTick();
}

function injectGamepadFocusStyle() {
  if (document.getElementById('gpFocusStyle')) return;
  const style = document.createElement('style');
  style.id = 'gpFocusStyle';
  style.textContent = `
    @keyframes gpFocusPulse {
      0%, 100% {
        box-shadow:
          0 0 0 3px rgba(79, 221, 192, 0.75),
          0 0 26px 6px rgba(79, 221, 192, 0.9),
          inset 0 0 18px rgba(79, 221, 192, 0.35);
      }
      50% {
        box-shadow:
          0 0 0 4px rgba(79, 221, 192, 1),
          0 0 42px 12px rgba(79, 221, 192, 1),
          inset 0 0 26px rgba(79, 221, 192, 0.55);
      }
    }
    .gp-focus {
      outline: 3px solid #4FDDC0 !important;
      outline-offset: 4px !important;
      filter: brightness(1.20) saturate(1.15) !important;
      position: relative;
      z-index: 50;
      animation: gpFocusPulse 1.1s ease-in-out infinite;
      transition: filter 0.08s ease;
    }
    input[type="range"].gp-focus {
      outline-offset: 6px !important;
      animation: none;
      box-shadow: 0 0 0 3px rgba(79, 221, 192, 0.9), 0 0 22px 4px rgba(79, 221, 192, 0.8) !important;
    }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   11. 初始化
   ============================================================ */
export function initMenus() {
  injectGamepadFocusStyle();
  initBootScreen();
  initEngineToggle();
  initGamepadSettings();
  bindVolumeSliders();
  initCardUI();
  initTouchControls();

  on('victory:show', showVictory);
  on('gameover:show', showGameOver);
  on('keydown', onGlobalKeydown);
  on('fx:clearAll', clearAllFx);

  on('gamepad:connected', () => {
    showUnlockToast(T('gamepadConnected'));
    gpMode = true;
    gpFocusReset();
    gpLastContext = null;
    gpFocusedByContext.clear();
  });
  on('gamepad:disconnected', () => {
    showUnlockToast(T('gamepadDisconnected'));
    gpMode = false;
    gpFocusReset();
    gpLastContext = null;
  });

  document.addEventListener('mousedown', () => { if (gpMode) { gpMode = false; gpFocusReset(); } }, true);
  document.addEventListener('touchstart', () => { if (gpMode) { gpMode = false; gpFocusReset(); } }, true);

  bindTap(document.getElementById('startBtn'), () => { initAudio(); sfxUI(); showLevelSelect(); });
  bindTap(document.getElementById('helpBtn'), () => {
    initAudio(); sfxUI();
    document.getElementById('helpScreen').classList.add('show');
  });
  bindTap(document.getElementById('helpCloseBtn'), () => {
    document.getElementById('helpScreen').classList.remove('show');
  });
  bindTap(document.getElementById('settingsBtn'), () => {
    initAudio(); sfxUI();
    document.getElementById('settingsScreen').classList.add('show');
    updateFullscreenButtons();
  });
  bindTap(document.getElementById('settingsCloseBtn'), () => {
    document.getElementById('settingsScreen').classList.remove('show');
  });
  bindTap(document.getElementById('galleryBtn'), () => { initAudio(); sfxUI(); emit('ui:galleryOpen'); });
  bindTap(document.getElementById('garageBtn'),  () => { initAudio(); sfxUI(); emit('ui:garageOpen'); });

  document.querySelectorAll('.pause-box button[data-act]').forEach(btn => {
    bindTap(btn, () => {
      const act = btn.dataset.act;
      if (act === 'resume') {
        togglePause();
      } else if (act === 'menu') {
        document.getElementById('pauseMenu').classList.remove('show');
        backToLevelSelect();
      }
    });
  });

  document.querySelectorAll('.fs-btn').forEach(btn => {
    bindTap(btn, () => { initAudio(); toggleFullscreen(); });
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    bindTap(btn, () => { initAudio(); sfxUI(); setLang(btn.dataset.lang); });
  });

  bindTap(document.getElementById('prevPageBtn'), () => {
    if (currentPage > 0) { currentPage--; renderLevelSelect(); sfxUI(); }
  });
  bindTap(document.getElementById('nextPageBtn'), () => {
    if (currentPage < TOTAL_PAGES - 1) { currentPage++; renderLevelSelect(); sfxUI(); }
  });
  bindTap(document.getElementById('levelBackBtn'), () => {
    document.getElementById('levelSelectScreen').classList.remove('show');
    document.getElementById('startScreen').style.display = 'flex';
    state.phase = 'menu';
    startBGM('menu');
  });

  bindTap(document.getElementById('goalConfirmBtn'), () => {
    closeAllOverlays();
    const id = pendingLevelId;
    if (shouldPlayFirstStory(id)) {
      emit('story:playOnce', { onDone: () => startLevel(id) });
      return;
    }
    startLevel(id);
  });
  bindTap(document.getElementById('goalCancelBtn'), () => {
    document.getElementById('levelGoalModal').classList.remove('show');
  });

  bindTap(document.getElementById('vicNextBtn'), () => {
    closeAllOverlays();
    const nextId = Math.min(16, state.currentLevel + 1);
    if (nextId <= 16) startLevel(nextId);
  });
  bindTap(document.getElementById('vicMenuBtn'), backToLevelSelect);

  bindTap(document.getElementById('restartBtn'), () => {
    closeAllOverlays();
    restartGame();
  });
  bindTap(document.getElementById('menuBtn'), backToLevelSelect);

  document.addEventListener('lang:change', () => {
    if (document.getElementById('levelSelectScreen').classList.contains('show')) {
      renderLevelSelect();
    }
    updateFullscreenButtons();
  });

  document.addEventListener('fullscreenchange', () => {
    setTimeout(emitResize, 120);
    updateFullscreenButtons();
  });
  document.addEventListener('webkitfullscreenchange', () => {
    setTimeout(emitResize, 120);
    updateFullscreenButtons();
  });
}
