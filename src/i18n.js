/* ============================================================
   i18n.js —— 中英双语
   · T(key, ...args) 取文案，缺失回退英文
   · setLang(l)      切换语言，派发 lang:change 事件
   · applyLanguage() 刷新 data-i18n / data-i18n-html 节点
   ============================================================ */

import { load, save } from '@/platform.js';

/* ============================================================
   1. 文案表
   ============================================================ */
export const I18N = {
  zh: {
    /* 标题 / 启动 */
    gameTitle: '我的<em>超级</em>二手车',
    gameTitlePlain: '我的超级二手车',
    subtitle: '手动驾驶 × 自动弹幕 × 肉鸽构筑',
    tapToStart: '点 击 屏 幕 开 始',
    initializing: '初始化中…',

    /* HUD */
    wave: '波次', kills: '击杀', field: '场上', timeLbl: '时间',

    /* 触摸按钮 */
    joystickHint: '拖动转向',
    btnThrottle: '油门', btnBrake: '倒车', btnJump: '跳跃', btnDodge: '闪冲',

    /* 暂停 */
    paused: '暂 停', resume: '继续游戏', backToMenu: '返回主菜单',
    volumeTitle: '音 量 调 节', sfx: '音效', music: '音乐',
    soundTitle: '声 音', engineSound: '引擎声浪',
    displayTitle: '显 示', langTitle: '语 言',
    fullscreen: '全 屏', exitFullscreen: '退 出 全 屏',

    /* 主菜单 */
    startGame: '开 始 游 戏', garageBtn: '车 库', galleryBtn: '鉴 赏',
    helpBtn: '游戏说明', settingsBtn: '设 置',

    /* 选关 */
    selectLevel: '选 择 关 卡', backToMainMenu: '返回主菜单',

    /* 关卡目标 */
    levelLabel: (n) => `第 ${n} 关`,
    endlessLabel: '无 限 模 式',
    objective: '通关目标：',
    density: '怪物数量：',
    rewardLbl: '完成奖励：',
    starCriteria: '星级标准：',
    goalWavesN: (n) => `通过 ${n} 波僵尸`,
    goalEndless: '无限波次，尽可能生存',
    densityNormal: '正常',
    densityDense: '×1.5 密集',
    starNone: '无上限挑战',
    starTimes: (a, b, c) => `${a}s内 ★★★ / ${b}s内 ★★ / ${c}s内 ★`,
    startChallenge: '开 始 挑 战',
    cancel: '取 消',

    /* 奖励 */
    unlockNext: '解锁下一关',
    unlockEndless: '解锁「无限模式」',
    unlockMotorcycle: '解锁「摩托车」',
    unlockTruck: '解锁「大卡车」',
    unlockTrain: '解锁「火车头」',
    unlockHover: '突破第 15 波解锁「悬浮导弹车」',
    unlockByWave: '通过波次解锁更多战车',
    carUnlockDefault: '默认拥有',
    carUnlockMotorcycle: '通关第 5 关解锁',
    carUnlockTruck: '通关第 8 关解锁',
    carUnlockTrain: '通关第 15 关解锁',
    carUnlockHover: '无限模式通过第 15 波解锁',
    carUnlockTank: '无限模式通过第 5 波解锁',
    carUnlockFuture: '无限模式通过第 10 波解锁',
    carUnlockPhantom: '无限模式通过第 18 波解锁',
    carUnlockCyber: '无限模式通过第 20 波解锁',
    carUnlockSiege: '无限模式通过第 22 波解锁',
    carUnlockChampion: '无限模式通过第 25 波解锁',
    carUnlockZombieCar: '无限模式通过第 27 波解锁',
    carUnlockPirateShip: '无限模式通过第 29 波解锁',
    carUnlockCatCar: '无限模式通过第 30 波解锁',

    /* 胜利 */
    levelClear: '关 卡 完 成',
    nextLevel: '下 一 关',
    unlockEndlessBtn: '解 锁 无 限',
    backToSelect: '返 回 选 关',
    timeStat: '用时', killsStat: '击杀', wavesStat: '波次', pointsStat: '累计积分',
    newCarUnlocked: (names) => `🔓 解锁新座驾：${names}`,
    endlessUnlocked: '🔓 解锁「无限模式」',
    levelWithName: (n, name) => `第 ${n} 关 · ${name}`,

    /* 失败 */
    gameOver: '战 斗 结 束', survived: '存活', retry: '再 来 一 局',

    /* 设置 / 通用 */
    settingsTitle: '设 置', close: '关 闭',
    gamepadConnected: '🎮 手柄已连接',
    gamepadDisconnected: '🎮 手柄已断开',

    /* 图鉴 */
    galleryTitle: '鉴 赏',
    storyBtn: '▶ 剧 情',
    listCar: '🚗 座驾',
    listMob: '🧟 暴徒僵尸',
    listBomber: '💥 自爆僵尸',
    listRanged: '🎯 远程僵尸',
    listShield: '🛡️ 盾兵僵尸',
    listElite: '💜 精英僵尸',
    listBoss: '👑 僵尸之王',
    listRunner: '🏃 疾行僵尸',
    listDasher: '🌪 瞬闪僵尸',
    listJumper: '🦘 跳击僵尸',
    listSuicide: '🧨 殉爆僵尸',
    listBossSlam: '💥 裂地尸王',
    listBossUfo: '🛸 幽浮母舰',
    dragRotate: '拖 动 旋 转',
    tabModels: '角 色 图 鉴',
    tabBgm: 'BGM 鉴 赏',
    bgmLib: '曲 库',
    nowPlaying: 'N O W  P L A Y I N G',
    bgmVolume: '音量',
    bgmTip: '点 击 曲 目 试 听',
    bgmPlaying: '正 在 播 放',
    bgmPaused: '已 暂 停',
    bgmDemoNote: '试 听 模 式 · 游 戏 内 曲 目 随 机 轮 换',

    /* 车库 */
    garageTitle: '车 库',
    useCar: '选 用 此 车',
    inUse: '使 用 中',
    carLocked: '未 解 锁',
    statSpeed: '极速', statAccel: '加速', statHandling: '操控', statRam: '冲撞',

    /* 剧情 */
    storySkip: '点 击 跳 过',
    rotateHint: '请将手机横过来',

    /* 卡牌 */
    cardActivate: '激活：',
    cardImmediate: '立即回复',
    cardHealEffect: '立即回复 30% HP',
    cardHealDesc: '立即回复 30% 最大 HP',
    skillInactive: '（未激活）',

    card_basic_name: '平A', card_basic_desc: '自动向前方扇形敌人发射能量针',
    card_aoe_name: '群攻', card_aoe_desc: '向锁定目标发射火球，爆炸成环形冲击波',
    card_shock_name: '冲击波', card_shock_desc: '撞击时对周围敌人溅射伤害',
    card_heal_name: '治疗', card_heal_desc: '主动攻击命中时概率回血',
    card_crit_name: '暴击', card_crit_desc: '每次伤害概率暴击',
    card_execute_name: '瞬杀', card_execute_desc: '概率秒杀非Boss（精英减半）',
    card_luck_name: '运气', card_luck_desc: '所有概率被动 +%',
    card_thunder_name: '天雷', card_thunder_desc: '主动命中时概率触发全屏闪电',
    card_chain_name: '连锁', card_chain_desc: '命中后对周围敌人溅射 50% 伤害',
    card_freeze_name: '冻结', card_freeze_desc: '被攻击的敌人减速',
    card_energy_name: '蓄能', card_energy_desc: '击杀积分加成（抽卡更快）',
    card_healcard_name: '回复', card_healcard_desc: '立即回复 30% 最大 HP',

    /* 剧情文本 */
    story: [
      '一觉醒来……',
      '城市已经被丧尸吞没，',
      '只剩下你孤身一人，',
      '与你的破旧二手车。',
      '想要活下去的话，',
      '就油门踩到底，杀出一条生路吧！',
    ],

    /* 帮助 */
    helpBody: `
      <h2>新 手 指 南</h2>

      <h3>① 三十秒上手</h3>
      <ul>
        <li><b>踩油门，撞僵尸。</b>车速越快撞得越疼，这是你最猛的一招。</li>
        <li><b>弹幕全自动。</b>不用按攻击键，技能会自己打出去。</li>
        <li><b>积分条满了就选卡。</b>三选一，越选越强，选完继续冲。</li>
        <li><b>血扣光就结束。</b>躲开红色火球和靠近的僵尸，别硬吃伤害。</li>
      </ul>

      <h3>② 操作 · 电脑</h3>
      <ul>
        <li><span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span> 或方向键 —— 前进 / 倒车 / 左右打方向</li>
        <li><span class="key">空格</span> —— 跳跃（落地砸一圈，过程中短暂无敌）</li>
        <li><span class="key">K</span> —— 闪冲瞬移（无敌位移，可以从怪堆里穿过去）</li>
        <li><span class="key">Esc</span> —— 暂停</li>
      </ul>

      <h3>③ 操作 · 手机横屏</h3>
      <ul>
        <li><b>左侧圆盘</b> —— 按住拖动来转向，松手自动回正</li>
        <li><b>右下大按钮</b> —— 绿色是油门，红色是倒车</li>
        <li><b>右侧小按钮</b> —— 黄色跳跃，紫色闪冲</li>
      </ul>

      <h3>④ 四种僵尸，四种处理方式</h3>
      <ul>
        <li><b>普通僵尸</b> —— 直接撞飞，不用减速。</li>
        <li><b>自爆僵尸</b> —— 身上带红圈，贴近就会炸，提前撞掉或绕开。</li>
        <li><b>远程僵尸</b> —— 躲在远处扔红色火球，优先冲过去撞掉它。</li>
        <li><b>盾兵僵尸</b> —— 正面很硬，绕到背后再撞，伤害翻好几倍。</li>
        <li><b>精英 / BOSS</b> —— 血厚伤害高，撞完就拉远，别贴脸硬刚。</li>
      </ul>

      <h3>⑤ 选卡怎么选</h3>
      <ul>
        <li>每次三选一，<b>没见过的卡优先拿</b>，先把技能栏铺开。</li>
        <li><b>群攻 / 天雷 / 连锁</b> —— 清场最快，僵尸多的时候首选。</li>
        <li><b>蓄能</b> —— 让你更快抽到下一张卡，越早拿越赚。</li>
        <li><b>回复</b> —— 残血时别犹豫，直接拿。</li>
      </ul>

      <h3>⑥ 关卡与解锁</h3>
      <ul>
        <li>打光本关要求的波次就算通关，用时越短星星越多。</li>
        <li>通关第 <b>5</b> 关解锁 <b>摩托车</b>；第 <b>8</b> 关解锁 <b>大卡车</b>；第 <b>15</b> 关解锁 <b>火车头</b>。</li>
        <li>无限模式打到第 <b>5 / 10 / 15 / 18 / 20 / 22 / 25 / 27 / 29 / 30</b> 波，依次解锁 <b>坦克 / 未来战车 / 悬浮导弹车 / 幻影战车 / 赛博战车 / 攻城车 / 冠军战车 / 僵尸车 / 海盗船 / 猫猫车</b>。</li>
        <li>开局即拥有 <b>轿跑车、拖拉机、三轮车、子弹头列车、碰碰车、水晶彩虹车</b> 六辆。</li>
        <li>换车入口：主菜单 → <b>车库</b>，每辆车的手感完全不同。</li>
        <li>车库里的车即使没解锁也能点开看外观，只是暂时不能选用。</li>
        <li>无限模式从一开始就开放，随时可以挑战。</li>
      </ul>

      <h3>⑦ 几个小技巧</h3>
      <ul>
        <li>高速撞击会给你一小段无敌，撞完顺势穿过去，别踩刹车。</li>
        <li>树和路灯可以直接撞碎，不掉血，撞起来很爽。</li>
        <li>车速超过七成会出现速度线和尾焰，这时候撞谁谁飞。</li>
        <li>血量低于 30% 屏幕边缘会闪红光，赶紧找机会回血。</li>
      </ul>
    `,
  },

  en: {
    /* Title / Boot */
    gameTitle: 'Beater <em>Goes</em> Rogue',
    gameTitlePlain: 'Beater Goes Rogue',
    subtitle: 'MANUAL DRIVING × AUTO-FIRE × ROGUELIKE BUILDS',
    tapToStart: 'TAP  TO  START',
    initializing: 'INITIALIZING…',

    /* HUD */
    wave: 'WAVE', kills: 'KILLS', field: 'FIELD', timeLbl: 'TIME',

    /* Touch buttons */
    joystickHint: 'DRAG TO STEER',
    btnThrottle: 'GAS', btnBrake: 'REVERSE', btnJump: 'JUMP', btnDodge: 'DASH',

    /* Pause */
    paused: 'PAUSED', resume: 'RESUME', backToMenu: 'MAIN MENU',
    volumeTitle: 'VOLUME', sfx: 'SFX', music: 'MUSIC',
    soundTitle: 'SOUND', engineSound: 'ENGINE AUDIO',
    displayTitle: 'DISPLAY', langTitle: 'LANGUAGE',
    fullscreen: 'FULLSCREEN', exitFullscreen: 'EXIT FULLSCREEN',

    /* Main menu */
    startGame: 'START GAME', garageBtn: 'GARAGE', galleryBtn: 'GALLERY',
    helpBtn: 'HOW TO PLAY', settingsBtn: 'SETTINGS',

    /* Level select */
    selectLevel: 'SELECT LEVEL', backToMainMenu: 'MAIN MENU',

    /* Level goal */
    levelLabel: (n) => `LEVEL ${n}`,
    endlessLabel: 'ENDLESS MODE',
    objective: 'Objective: ',
    density: 'Enemy density: ',
    rewardLbl: 'Reward: ',
    starCriteria: 'Star rating: ',
    goalWavesN: (n) => `Clear ${n} waves`,
    goalEndless: 'Endless waves — survive as long as you can',
    densityNormal: 'Normal',
    densityDense: '×1.5 Dense',
    starNone: 'No limit — push as far as you can',
    starTimes: (a, b, c) => `★★★ under ${a}s / ★★ under ${b}s / ★ under ${c}s`,
    startChallenge: 'START',
    cancel: 'CANCEL',

    /* Rewards */
    unlockNext: 'Unlock next level',
    unlockEndless: 'Unlock "Endless Mode"',
    unlockMotorcycle: 'Unlock "Motorcycle"',
    unlockTruck: 'Unlock "Big Rig"',
    unlockTrain: 'Unlock "Locomotive"',
    unlockHover: 'Reach wave 15 to unlock "Hover Missile Car"',
    unlockByWave: 'Clear waves to unlock more vehicles',
    carUnlockDefault: 'Owned by default',
    carUnlockMotorcycle: 'Clear Level 5 to unlock',
    carUnlockTruck: 'Clear Level 8 to unlock',
    carUnlockTrain: 'Clear Level 15 to unlock',
    carUnlockHover: 'Reach wave 15 in Endless Mode',
    carUnlockTank: 'Reach wave 5 in Endless Mode',
    carUnlockFuture: 'Reach wave 10 in Endless Mode',
    carUnlockPhantom: 'Reach wave 18 in Endless Mode',
    carUnlockCyber: 'Reach wave 20 in Endless Mode',
    carUnlockSiege: 'Reach wave 22 in Endless Mode',
    carUnlockChampion: 'Reach wave 25 in Endless Mode',
    carUnlockZombieCar: 'Reach wave 27 in Endless Mode',
    carUnlockPirateShip: 'Reach wave 29 in Endless Mode',
    carUnlockCatCar: 'Reach wave 30 in Endless Mode',

    /* Victory */
    levelClear: 'LEVEL CLEAR',
    nextLevel: 'NEXT LEVEL',
    unlockEndlessBtn: 'UNLOCK ENDLESS',
    backToSelect: 'LEVEL SELECT',
    timeStat: 'TIME', killsStat: 'KILLS', wavesStat: 'WAVES', pointsStat: 'TOTAL SCORE',
    newCarUnlocked: (names) => `🔓 New vehicle unlocked: ${names}`,
    endlessUnlocked: '🔓 "Endless Mode" unlocked',
    levelWithName: (n, name) => `Level ${n} · ${name}`,

    /* Game over */
    gameOver: 'GAME OVER', survived: 'SURVIVED', retry: 'RETRY',

    /* Settings / common */
    settingsTitle: 'SETTINGS', close: 'CLOSE',
    gamepadConnected: '🎮 Controller connected',
    gamepadDisconnected: '🎮 Controller disconnected',

    /* Gallery */
    galleryTitle: 'GALLERY',
    storyBtn: '▶ STORY',
    listCar: '🚗 RIDE',
    listMob: '🧟 Thug Zombie',
    listBomber: '💥 Bomber Zombie',
    listRanged: '🎯 Ranged Zombie',
    listShield: '🛡️ Shield Zombie',
    listElite: '💜 Elite Zombie',
    listBoss: '👑 Zombie King',
    listRunner: '🏃 Runner Zombie',
    listDasher: '🌪 Dasher Zombie',
    listJumper: '🦘 Jumper Zombie',
    listSuicide: '🧨 Martyr Zombie',
    listBossSlam: '💥 Rift King',
    listBossUfo: '🛸 UFO Mothership',
    dragRotate: 'DRAG TO ROTATE',
    tabModels: 'UNITS',
    tabBgm: 'BGM GALLERY',
    bgmLib: 'LIBRARY',
    nowPlaying: 'N O W  P L A Y I N G',
    bgmVolume: 'VOL',
    bgmTip: 'TAP A TRACK TO PREVIEW',
    bgmPlaying: 'NOW PLAYING',
    bgmPaused: 'PAUSED',
    bgmDemoNote: 'PREVIEW MODE · IN-GAME TRACKS ROTATE RANDOMLY',

    /* Garage */
    garageTitle: 'GARAGE',
    useCar: 'SELECT THIS CAR',
    inUse: 'IN USE',
    carLocked: 'LOCKED',
    statSpeed: 'TOP SPEED', statAccel: 'ACCEL', statHandling: 'HANDLING', statRam: 'RAM',

    /* Story */
    storySkip: 'TAP TO SKIP',
    rotateHint: 'PLEASE ROTATE YOUR DEVICE',

    /* Cards */
    cardActivate: 'Activate: ',
    cardImmediate: 'Instant heal',
    cardHealEffect: 'Instantly restore 30% HP',
    cardHealDesc: 'Instantly restore 30% max HP',
    skillInactive: '(inactive)',

    card_basic_name: 'Basic Shot', card_basic_desc: 'Auto-fires energy needles at enemies in front',
    card_aoe_name: 'AoE Blast', card_aoe_desc: 'Fires a fireball at the locked target, exploding into a ring shockwave',
    card_shock_name: 'Shockwave', card_shock_desc: 'Ramming splashes damage to nearby enemies',
    card_heal_name: 'Mending', card_heal_desc: 'Chance to heal on hit',
    card_crit_name: 'Crit', card_crit_desc: 'Every hit has a chance to critically strike',
    card_execute_name: 'Execute', card_execute_desc: 'Chance to instantly kill non-bosses (halved vs elites)',
    card_luck_name: 'Luck', card_luck_desc: 'All proc chances +%',
    card_thunder_name: 'Thunder', card_thunder_desc: 'Chance to trigger screen-wide lightning on hit',
    card_chain_name: 'Chain', card_chain_desc: 'Hits splash 50% damage to nearby enemies',
    card_freeze_name: 'Freeze', card_freeze_desc: 'Slows enemies you damage',
    card_energy_name: 'Energy', card_energy_desc: 'Kill score bonus (draw cards faster)',
    card_healcard_name: 'Restore', card_healcard_desc: 'Instantly restore 30% max HP',

    /* Story text */
    story: [
      'You wake up…',
      'The city has been swallowed by the undead.',
      'All that is left is you,',
      'and your beat-up second-hand car.',
      'If you want to live,',
      'floor the gas and carve out a way!',
    ],

    /* Help */
    helpBody: `
      <h2>BEGINNER'S GUIDE</h2>

      <h3>① Get Going in 30 Seconds</h3>
      <ul>
        <li><b>Floor it and ram zombies.</b> The faster you drive, the harder you hit — this is your strongest move.</li>
        <li><b>Your guns fire automatically.</b> No attack button needed — skills trigger on their own.</li>
        <li><b>Fill the score bar to pick a card.</b> Choose 1 of 3, get stronger, then keep charging.</li>
        <li><b>Lose all HP and it's over.</b> Dodge the red fireballs and don't let zombies touch you.</li>
      </ul>

      <h3>② Controls · PC</h3>
      <ul>
        <li><span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span> or arrow keys —— forward / reverse / steer</li>
        <li><span class="key">SPACE</span> —— jump (slam on landing, brief invulnerability)</li>
        <li><span class="key">K</span> —— dash (invulnerable blink, pass right through crowds)</li>
        <li><span class="key">ESC</span> —— pause</li>
      </ul>

      <h3>③ Controls · Mobile (Landscape)</h3>
      <ul>
        <li><b>Left joystick</b> —— hold and drag to steer, auto-centers when released</li>
        <li><b>Big bottom-right buttons</b> —— green is gas, red is reverse</li>
        <li><b>Small right-side buttons</b> —— yellow jumps, purple dashes</li>
      </ul>

      <h3>④ Four Zombies, Four Answers</h3>
      <ul>
        <li><b>Thug</b> —— just ram them, no need to slow down.</li>
        <li><b>Bomber</b> —— wears a red ring and explodes when close. Ram it early or dodge.</li>
        <li><b>Ranged</b> —— lobs red fireballs from a distance. Charge it down first.</li>
        <li><b>Shield</b> —— tough from the front. Circle behind and ram for several times the damage.</li>
        <li><b>Elite / BOSS</b> —— tanky and hard-hitting. Ram, then back off. Don't hug them.</li>
      </ul>

      <h3>⑤ How to Pick Cards</h3>
      <ul>
        <li>You always choose 1 of 3. <b>Grab unseen cards first</b> to fill out your skill bar.</li>
        <li><b>AoE / Thunder / Chain</b> —— fastest clear, the top pick when the map is swarmed.</li>
        <li><b>Energy</b> —— draws your next card faster. The earlier you take it, the more it pays off.</li>
        <li><b>Restore</b> —— don't hesitate when you're low. Just take it.</li>
      </ul>

      <h3>⑥ Levels &amp; Unlocks</h3>
      <ul>
        <li>Clear the required waves to finish a level. Faster times earn more stars.</li>
        <li>Clear Level <b>5</b> to unlock the <b>Motorcycle</b>; Level <b>8</b> for the <b>Big Rig</b>; Level <b>15</b> for the <b>Locomotive</b>.</li>
        <li>In Endless Mode, reaching waves <b>5 / 10 / 15 / 18 / 20 / 22 / 25 / 27 / 29 / 30</b> unlocks the <b>Tank / Future Car / Hover Missile Car / Phantom Car / Cyber Car / Siege Engine / Champion Car / Zombie Car / Pirate Ship / Cat Car</b>.</li>
        <li>You start with the <b>Coupe, Tractor, Tricycle, Bullet Train, Bumper Car, and Crystal Rainbow</b>.</li>
        <li>Switch cars via Main Menu → <b>Garage</b>. Every car handles completely differently.</li>
        <li>Locked cars can still be previewed in the Garage — you just can't select them yet.</li>
        <li>Endless Mode is unlocked from the very start — challenge it any time.</li>
      </ul>

      <h3>⑦ A Few Tips</h3>
      <ul>
        <li>High-speed rams grant brief invulnerability — keep going through, don't brake.</li>
        <li>Trees and lamps shatter on impact with no damage taken. Very satisfying.</li>
        <li>Above 70% top speed you get speed lines and exhaust flames — anything you hit goes flying.</li>
        <li>Below 30% HP the screen edges pulse red — find a way to heal, fast.</li>
      </ul>
    `,
  },
};

/* ============================================================
   2. 语言状态
   ============================================================ */
let _lang = 'en';
{
  const s = load('myCarLang', null);
  if (s === 'zh' || s === 'en') _lang = s;
}

export function getLang() { return _lang; }

/* 取文案，缺失回退英文 */
export function T(key, ...args) {
  const pack = I18N[_lang] || I18N.en;
  let v = pack[key];
  if (v === undefined) v = I18N.en[key];
  if (typeof v === 'function') return v(...args);
  return v === undefined ? key : v;
}

/* 取整包（备用） */
export function TL() { return I18N[_lang] || I18N.en; }

/* ============================================================
   3. 切换语言 + 应用 DOM 文本
   ============================================================ */

/** 遍历所有 [data-i18n] / [data-i18n-html] 节点并刷新 */
export function applyLanguage() {
  document.documentElement.lang = (_lang === 'zh') ? 'zh-CN' : 'en';
  document.title = T('gameTitlePlain');

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = T(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    if (el.id === 'helpBody') return;
    el.innerHTML = T(el.dataset.i18nHtml);
  });

  /* 帮助文本单独渲染（原始 HTML 需要注入） */
  const helpBody = document.getElementById('helpBody');
  if (helpBody) helpBody.innerHTML = T('helpBody');

  /* 语言按钮激活状态 */
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === _lang);
  });

  /* 通过 DOM 事件通知各 UI 模块（避免 import 循环） */
  document.dispatchEvent(new CustomEvent('lang:change', { detail: { lang: _lang } }));
}

export function setLang(l) {
  if (l !== 'zh' && l !== 'en') return;
  if (_lang === l) return;
  _lang = l;
  save('myCarLang', l);
  applyLanguage();
}
