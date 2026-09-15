/* ============================================================
   ui/menus.js —— 菜单 / 弹窗 / 结算 / 选关 / 设置 / 帮助 / 卡牌 UI
   触摸控制 + 手柄菜单导航（2D 空间导航 + 滑条调整）
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
  pad, rumbleLight,
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
}

function showGameOver(payload) {
  stopBGM();
  sfxGameOver();
  state.screenShake = 20;

  clearTouchState();
  clearFlames();
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
      if (p.type === 'heal') {
        effectHTML = `<div class="card-effect"><span class="next">${T('cardHealEffect')}</span></div>`;
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
      }

      el.innerHTML =
        `<div class="card-numeral">${p.numeral || ''}</div>` +
        `<div class="card-sigil"><span class="card-icon">${p.icon}</span></div>` +
        `<div class="card-name">${T('card_' + p.key + '_name')}</div>` +
        `<div class="card-divider"></div>` +
        `<div class="card-lv">${p.type === 'heal' ? T('cardImmediate') : `Lv.${p.currentLv} → ${p.nextLv}`}</div>` +
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
   10. ★ 手柄菜单导航系统
   ============================================================ */

let gpFocused = null;
let gpMode = false;

function gpFocusReset() {
  gpFocused = null;
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

/* 判断元素是否可见（在屏幕上，且有非零尺寸） */
function gpVisible(el) {
  if (!el || !el.isConnected) return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  /* 检查祖先链是否 display:none 或 visibility:hidden */
  let n = el;
  while (n && n !== document.body) {
    const s = window.getComputedStyle(n);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    n = n.parentElement;
  }
  return true;
}

/* 过滤候选元素（可见、非 disabled、非 hidden） */
function gpFilter(list) {
  return list.filter(el => el && gpVisible(el) && !el.disabled);
}

/* 按当前 UI 层级返回可聚焦元素数组 */
function gpCollectCandidates() {
  const $ = (sel) => [...document.querySelectorAll(sel)];

  /* 帮助弹窗 */
  if (document.getElementById('helpScreen').classList.contains('show')) {
    return gpFilter([document.getElementById('helpCloseBtn')]);
  }
  /* 设置弹窗 */
  if (document.getElementById('settingsScreen').classList.contains('show')) {
    return gpFilter([
      ...$('#settingsScreen .vol-slider'),
      ...$('#settingsScreen [data-engine-toggle]'),
      ...$('#settingsScreen [data-rumble-toggle]'),
      ...$('#settingsScreen [data-invert-y-toggle]'),
      ...$('#settingsScreen .fs-btn'),
      ...$('#settingsScreen .lang-btn'),
      document.getElementById('settingsCloseBtn'),
    ]);
  }
  /* 关卡目标 */
  if (document.getElementById('levelGoalModal').classList.contains('show')) {
    return gpFilter([document.getElementById('goalConfirmBtn'), document.getElementById('goalCancelBtn')]);
  }
  /* 胜利 */
  if (document.getElementById('victoryScreen').classList.contains('show')) {
    return gpFilter([document.getElementById('vicNextBtn'), document.getElementById('vicMenuBtn')]);
  }
  /* 失败 */
  if (document.getElementById('overScreen').classList.contains('show')) {
    return gpFilter([document.getElementById('restartBtn'), document.getElementById('menuBtn')]);
  }
  /* 暂停菜单 */
  if (state.phase === 'paused' && document.getElementById('pauseMenu').classList.contains('show')) {
    return gpFilter([
      ...$('#pauseMenu button[data-act]'),
      ...$('#pauseMenu .vol-slider'),
      ...$('#pauseMenu [data-engine-toggle]'),
      ...$('#pauseMenu [data-rumble-toggle]'),
      ...$('#pauseMenu [data-invert-y-toggle]'),
      ...$('#pauseMenu .fs-btn'),
      ...$('#pauseMenu .lang-btn'),
    ]);
  }
  /* 抽卡 */
  if (state.phase === 'card') {
    return gpFilter([...document.querySelectorAll('#cardRow .card')]);
  }
  /* 图鉴 */
  if (document.getElementById('galleryScreen').classList.contains('show')) {
    const isBgm = document.getElementById('galleryPaneBgm').classList.contains('active');
    if (isBgm) {
      return gpFilter([
        ...document.querySelectorAll('#bgmList .bgm-item'),
        document.getElementById('bgmPrev'),
        document.getElementById('bgmPlay'),
        document.getElementById('bgmNext'),
        document.getElementById('bgmStop'),
        ...document.querySelectorAll('.bgm-vol .vol-slider'),
        ...document.querySelectorAll('.gtab'),
        document.getElementById('galleryCloseBtn'),
      ]);
    }
    return gpFilter([
      ...document.querySelectorAll('#galleryList .gallery-item'),
      ...document.querySelectorAll('.gtab'),
      document.getElementById('galleryCloseBtn'),
    ]);
  }
  /* 车库 */
  if (document.getElementById('garageScreen').classList.contains('show')) {
    return gpFilter([
      ...document.querySelectorAll('#garageList .garage-item'),
      document.getElementById('garageSelectBtn'),
      document.getElementById('garageCloseBtn'),
    ]);
  }
  /* 选关 */
  if (document.getElementById('levelSelectScreen').classList.contains('show')) {
    const cards = [...document.querySelectorAll('#levelGrid .level-card:not(.locked)')];
    return gpFilter([
      ...cards,
      document.getElementById('prevPageBtn'),
      document.getElementById('nextPageBtn'),
      document.getElementById('levelBackBtn'),
    ]);
  }
  /* 主菜单 */
  if (state.phase === 'menu' && document.getElementById('startScreen').style.display !== 'none') {
    return gpFilter([
      document.getElementById('startBtn'),
      document.getElementById('garageBtn'),
      document.getElementById('galleryBtn'),
      document.getElementById('helpBtn'),
      document.getElementById('settingsBtn'),
      ...document.querySelectorAll('#langSwitch .lang-btn'),
    ]);
  }
  return [];
}

/* 2D 空间导航：在 dir 方向上找最近的邻居 */
function gpSpatialFind(from, dir, list) {
  if (!from || !from.isConnected) return list[0] || null;
  const fr = from.getBoundingClientRect();
  const fcx = fr.left + fr.width / 2;
  const fcy = fr.top + fr.height / 2;

  let best = null, bestScore = Infinity;
  for (const el of list) {
    if (el === from) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = cx - fcx, dy = cy - fcy;

    let primary, secondary;
    if (dir === 'up') {
      if (dy > -6) continue;
      primary = -dy; secondary = Math.abs(dx);
    } else if (dir === 'down') {
      if (dy < 6) continue;
      primary = dy; secondary = Math.abs(dx);
    } else if (dir === 'left') {
      if (dx > -6) continue;
      primary = -dx; secondary = Math.abs(dy);
    } else {
      if (dx < 6) continue;
      primary = dx; secondary = Math.abs(dy);
    }
    /* 主方向为主，次方向惩罚 2.5 倍 */
    const score = primary + secondary * 2.5;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  return best;
}

/* 手柄返回（B 键）的语义 */
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

/* 判断当前焦点是否在滑条上 */
function gpIsSlider(el) {
  return el && el.tagName === 'INPUT' && el.type === 'range';
}

/* 手柄每帧 tick */
function gpTick() {
  if (!pad.connected) {
    if (gpMode) { gpMode = false; gpFocusReset(); }
    return;
  }

  /* 首次手柄操作后进入手柄模式 */
  const anyInput = pad.navUp || pad.navDown || pad.navLeft || pad.navRight
                || pad.confirmPressed || pad.cancelPressed
                || Math.abs(pad.lookX) > 0.1 || Math.abs(pad.lookY) > 0.1
                || pad.navLeftHeld || pad.navRightHeld;
  if (anyInput && !gpMode) gpMode = true;

  /* 暂停：任何阶段都能触发 */
  if (pad.pausePressed && (state.phase === 'playing' || state.phase === 'paused')) {
    initAudio();
    togglePause();
    return;
  }

  const list = gpCollectCandidates();
  if (list.length === 0) {
    gpFocusReset();
    return;
  }

  /* 焦点失效则重置为首项 */
  if (!gpFocused || !list.includes(gpFocused)) {
    gpApplyFocus(list[0]);
  }

  /* ---- 滑条特殊处理：左右调整，上下导航 ---- */
  if (gpIsSlider(gpFocused)) {
    let changed = false;
    if (pad.navLeftHeld) {
      gpFocused.value = Math.max(0, parseInt(gpFocused.value) - 5);
      gpFocused.dispatchEvent(new Event('input', { bubbles: true }));
      changed = true;
    }
    if (pad.navRightHeld) {
      gpFocused.value = Math.min(100, parseInt(gpFocused.value) + 5);
      gpFocused.dispatchEvent(new Event('input', { bubbles: true }));
      changed = true;
    }
    if (changed) rumbleLight();
    /* 上下仍然导航 */
    if (pad.navUp) {
      const next = gpSpatialFind(gpFocused, 'up', list);
      if (next) { gpApplyFocus(next); sfxUI(); }
    } else if (pad.navDown) {
      const next = gpSpatialFind(gpFocused, 'down', list);
      if (next) { gpApplyFocus(next); sfxUI(); }
    }
  } else {
    /* ---- 普通元素：四方向导航 ---- */
    if (pad.navUp)    { const n = gpSpatialFind(gpFocused, 'up',    list); if (n) { gpApplyFocus(n); sfxUI(); } }
    if (pad.navDown)  { const n = gpSpatialFind(gpFocused, 'down',  list); if (n) { gpApplyFocus(n); sfxUI(); } }
    if (pad.navLeft)  { const n = gpSpatialFind(gpFocused, 'left',  list); if (n) { gpApplyFocus(n); sfxUI(); } }
    if (pad.navRight) { const n = gpSpatialFind(gpFocused, 'right', list); if (n) { gpApplyFocus(n); sfxUI(); } }
  }

  /* 确认（A） */
  if (pad.confirmPressed) {
    if (gpFocused && gpFocused.isConnected && typeof gpFocused.click === 'function') {
      sfxUI();
      rumbleLight();
      gpFocused.click();
      /* 点击后清空焦点，下一帧会重新初始化 */
      gpFocused = null;
    }
  }

  /* 返回（B） */
  if (pad.cancelPressed) {
    gpCancel();
    gpFocused = null;
  }

  /* LB / RB：用于图鉴页签切换 */
  if (pad.lbPressed || pad.rbPressed) {
    const tabs = [...document.querySelectorAll('.gtab')];
    if (tabs.length > 0) {
      const visible = tabs.filter(t => gpVisible(t));
      if (visible.length > 0) {
        const curIdx = visible.findIndex(t => t.classList.contains('active'));
        const nextIdx = pad.rbPressed
          ? (curIdx + 1) % visible.length
          : (curIdx - 1 + visible.length) % visible.length;
        sfxUI();
        visible[nextIdx].click();
        gpFocused = null;
      }
    }
  }
}

/** main.js 每帧调用 */
export function tickMenus() {
  gpTick();
}

/* 手柄高亮样式（不改 styles.css，动态注入） */
function injectGamepadFocusStyle() {
  if (document.getElementById('gpFocusStyle')) return;
  const style = document.createElement('style');
  style.id = 'gpFocusStyle';
  style.textContent = `
    .gp-focus {
      outline: 3px solid #4FDDC0 !important;
      outline-offset: 4px;
      box-shadow: 0 0 22px rgba(79, 221, 192, 0.85), inset 0 0 14px rgba(79, 221, 192, 0.22) !important;
      transform: scale(1.03);
      transition: outline-offset 0.08s ease, transform 0.08s ease, box-shadow 0.08s ease;
      position: relative;
      z-index: 20;
    }
    input[type="range"].gp-focus {
      outline-offset: 6px;
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
  });
  on('gamepad:disconnected', () => {
    showUnlockToast(T('gamepadDisconnected'));
    gpMode = false;
    gpFocusReset();
  });

  /* 鼠标/触摸操作 → 退出"手柄模式"，隐去手柄高光 */
  document.addEventListener('mousedown', () => { if (gpMode) { gpMode = false; gpFocusReset(); } }, true);
  document.addEventListener('touchstart', () => { if (gpMode) { gpMode = false; gpFocusReset(); } }, true);

  /* 主菜单按钮 */
  bindTap(document.getElementById('startBtn'), () => { initAudio(); sfxUI(); showLevelSelect(); });
  bindTap(document.getElementById('helpBtn'), () => {
    initAudio(); sfxUI();
    document.getElementById('helpScreen').classList.add('show');
    gpFocusReset();
  });
  bindTap(document.getElementById('helpCloseBtn'), () => {
    document.getElementById('helpScreen').classList.remove('show');
    gpFocusReset();
  });
  bindTap(document.getElementById('settingsBtn'), () => {
    initAudio(); sfxUI();
    document.getElementById('settingsScreen').classList.add('show');
    updateFullscreenButtons();
    gpFocusReset();
  });
  bindTap(document.getElementById('settingsCloseBtn'), () => {
    document.getElementById('settingsScreen').classList.remove('show');
    gpFocusReset();
  });
  bindTap(document.getElementById('galleryBtn'), () => { initAudio(); sfxUI(); emit('ui:galleryOpen'); });
  bindTap(document.getElementById('garageBtn'),  () => { initAudio(); sfxUI(); emit('ui:garageOpen'); });

  /* 暂停菜单 */
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

  /* 全屏按钮 */
  document.querySelectorAll('.fs-btn').forEach(btn => {
    bindTap(btn, () => { initAudio(); toggleFullscreen(); });
  });

  /* 语言按钮 */
  document.querySelectorAll('.lang-btn').forEach(btn => {
    bindTap(btn, () => { initAudio(); sfxUI(); setLang(btn.dataset.lang); });
  });

  /* 选关翻页 */
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

  /* 关卡目标 */
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

  /* 胜利 */
  bindTap(document.getElementById('vicNextBtn'), () => {
    closeAllOverlays();
    const nextId = Math.min(16, state.currentLevel + 1);
    if (nextId <= 16) startLevel(nextId);
  });
  bindTap(document.getElementById('vicMenuBtn'), backToLevelSelect);

  /* 失败 */
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
