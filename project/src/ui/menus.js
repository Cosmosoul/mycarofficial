/* ============================================================
   ui/menus.js —— 菜单 / 弹窗 / 结算 / 选关 / 设置 / 帮助 / 卡牌 UI
   同时负责：触摸控制（摇杆 + 4 个按钮）的绑定与移动端显示
   ============================================================ */

import {
  on, emit, state,
  engineEnabled, setEngineEnabled,
} from '@/core.js';
import {
  bindTap, bindTouchButton, platform, save, emitResize,
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

/**
 * 关闭所有覆盖层（选关页 / 目标弹窗 / 主菜单 / 结算 / 暂停 / 卡牌）
 */
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

function updateFullscreenButtons() {
  const fs = isFullscreen() || isForcedRotate();   // ★ 用 platform 的 isForcedRotate
  document.querySelectorAll('.fs-btn').forEach(b => {
    b.textContent = fs ? T('exitFullscreen') : T('fullscreen');
  });
}

function toggleFullscreen() {
  sfxUI();
  if (isFullscreen()) {
    exitFullscreen();
    return;
  }
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
      /* ★ 竖屏兜底：延迟检查，若仍未全屏且是竖屏 → 强制旋转 */
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
   5. 音量 / 引擎 / 语言 / 全屏
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

/* ============================================================
   6. 触摸控制 —— 摇杆 + 4 个按钮
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
  /* 移动端显示触控 UI */
  if (platform.isMobile) {
    document.getElementById('pauseBtn').style.display = 'flex';
    document.getElementById('joystickBase').style.display = 'block';
    document.getElementById('touchThrottle').style.display = 'flex';
    document.getElementById('touchBrake').style.display = 'flex';
    document.getElementById('touchJump').style.display = 'flex';
    document.getElementById('touchDodge').style.display = 'flex';
  }

  /* 摇杆 */
  initJoystick();

  /* 触屏按钮 */
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

  /* 暂停键 */
  bindTap(document.getElementById('pauseBtn'), () => {
    initAudio();
    togglePause();
  });
}

/** 清除所有触摸/摇杆状态（victory / gameOver / backToLevelSelect 时调用） */
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

  /* ★ 清理触摸 / FX */
  clearTouchState();
  clearFlames();
  document.getElementById('dangerVignette').style.opacity = '0';

  /* 解锁信息 */
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

  /* ★ 清理触摸 / FX */
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
  });

  on('cards:hide', () => {
    cardsEl.classList.remove('show');
  });
}

/* ============================================================
   9. 键盘辅助事件（由 main.js 转发 keydown）
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
   10. 初始化
   ============================================================ */
export function initMenus() {
  initBootScreen();
  initEngineToggle();
  bindVolumeSliders();
  initCardUI();
  initTouchControls();   // ★ 摇杆 + 触屏按钮 + 暂停键 + 移动端 UI

  /* 事件订阅 */
  on('victory:show', showVictory);
  on('gameover:show', showGameOver);
  on('keydown', onGlobalKeydown);
  on('fx:clearAll', clearAllFx);

  /* 主菜单按钮 */
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

  /* 关卡目标弹窗 */
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

  /* 胜利界面 */
  bindTap(document.getElementById('vicNextBtn'), () => {
    closeAllOverlays();
    const nextId = Math.min(16, state.currentLevel + 1);
    if (nextId <= 16) startLevel(nextId);
  });
  bindTap(document.getElementById('vicMenuBtn'), backToLevelSelect);

  /* 失败界面 */
  bindTap(document.getElementById('restartBtn'), () => {
    closeAllOverlays();
    restartGame();
  });
  bindTap(document.getElementById('menuBtn'), backToLevelSelect);

  /* 语言切换后刷新动态面板 */
  document.addEventListener('lang:change', () => {
    if (document.getElementById('levelSelectScreen').classList.contains('show')) {
      renderLevelSelect();
    }
    updateFullscreenButtons();
  });

  /* 全屏状态变化 */
  document.addEventListener('fullscreenchange', () => {
    setTimeout(emitResize, 120);
    updateFullscreenButtons();
  });
  document.addEventListener('webkitfullscreenchange', () => {
    setTimeout(emitResize, 120);
    updateFullscreenButtons();
  });
}