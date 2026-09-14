/* ============================================================
   content/music.js —— BGM 内容目录
   ┌─────────────────────────────────────────────────────────┐
   │ 加一首新 BGM：                                          │
   │  ① 在 BGM_TRACKS 里加一首：{ bpm, melody[64], bass[16], │
   │     drums }                                             │
   │  ② 在 BGM_META 里加 { name, genre, scene }              │
   │  ③ 若要出现在鉴赏播放器里，把 key 加进                  │
   │     BGM_GALLERY_ORDER                                    │
   │  ④ 若要作为游戏内随机 BGM，把 key 加进                  │
   │     GAME_TRACK_ROTATION                                  │
   └─────────────────────────────────────────────────────────┘
   ============================================================ */

/* ============================================================
   1. 曲目数据
   melody：64 个十六分音符为一循环，null 表示休止
   bass：  16 个低音音符（每 4 步换一次）
   drums： 鼓点风格字符串
   ============================================================ */
export const BGM_TRACKS = {
  /* === 原菜单曲 === */
  menu: {
    bpm: 100,
    melody: [
      523,null,659,null, 523,null,587,null, 523,null,659,null, 784,null,659,null,
      440,null,523,null, 440,null,494,null, 440,null,523,null, 659,null,523,null,
      349,null,440,null, 349,null,392,null, 349,null,440,null, 523,null,440,null,
      392,null,494,null, 392,null,440,null, 494,null,587,null, 659,null,587,null,
    ],
    bass: [130.81,130.81,130.81,130.81, 110,110,110,110, 87.31,87.31,87.31,87.31, 98,98,98,98],
    drums: 'soft',
  },
  levelSelect: {
    bpm: 112,
    melody: [
      440,null,523,null, 659,null,523,null, 440,null,587,null, 523,null,392,null,
      349,null,440,null, 523,null,440,null, 349,null,494,null, 440,null,329,null,
      523,null,659,null, 784,null,659,null, 523,null,698,null, 659,null,523,null,
      392,null,494,null, 587,null,494,null, 440,null,523,null, 587,null,659,null,
    ],
    bass: [110,110,110,110, 87.31,87.31,87.31,87.31, 130.81,130.81,130.81,130.81, 98,98,98,98],
    drums: 'normal',
  },
  game: {
    bpm: 140,
    melody: [
      440,null,523,null, 440,null,392,null, 523,null,440,null, 392,null,349,null,
      349,null,440,null, 349,null,329,null, 440,null,349,null, 329,null,294,null,
      523,null,659,null, 523,null,440,null, 659,null,523,null, 440,null,392,null,
      392,null,493,null, 587,null,493,null, 440,null,392,null, 349,null,392,null,
    ],
    bass: [110,110,165,165, 87.31,87.31,130.81,130.81, 130.81,130.81,196,196, 98,98,146.83,146.83],
    drums: 'intense',
  },

  /* ============================================================
     🌟 10 首新游戏内 BGM —— 风格各异、偏轻灵灵动
     ============================================================ */

  /* 1. 爵士 —— 切分、跳跃、明亮 */
  jazzGroove: {
    bpm: 122,
    melody: [
      587,null,659,523, 698,null,659,587, 784,null,698,659, 880,null,784,698,
      659,null,523,587, 698,null,587,523, 784,null,659,587, 698,null,659,587,
      784,null,880,1047, 880,null,784,698, 659,null,784,880, 1047,null,880,784,
      698,null,659,587, 523,null,587,659, 523,null,440,523, 587,null,659,784,
    ],
    bass: [146.83,146.83,196,196, 174.61,174.61,130.81,130.81, 196,196,233.08,233.08, 164.81,164.81,196,196],
    drums: 'jazz',
  },

  /* 2. 布鲁斯 —— 拖曳、忧郁但带劲 */
  bluesyRide: {
    bpm: 96,
    melody: [
      440,null,523,null, 587,null,523,440, 392,null,440,null, 523,null,440,null,
      349,null,440,null, 523,null,494,440, 392,null,349,null, 330,null,349,null,
      440,null,523,587, 659,null,587,523, 440,null,392,440, 523,null,440,392,
      349,null,330,349, 392,null,440,523, 494,null,440,392, 349,null,330,294,
    ],
    bass: [110,110,130.81,130.81, 87.31,87.31,110,110, 98,98,116.54,116.54, 87.31,87.31,98,98],
    drums: 'blues',
  },

  /* 3. 摇滚 —— 强力和弦、推着走 */
  rockNRoll: {
    bpm: 158,
    melody: [
      659,784,659,523, 784,880,784,659, 659,523,440,523, 659,784,880,1047,
      880,784,659,523, 587,659,784,880, 659,523,440,392, 523,659,784,659,
      784,880,1047,880, 659,784,880,784, 523,587,659,587, 440,523,659,784,
      1047,880,784,659, 880,784,659,587, 784,659,523,440, 523,587,659,784,
    ],
    bass: [82.41,82.41,82.41,82.41, 98,98,98,98, 110,110,110,110, 73.42,73.42,73.42,73.42],
    drums: 'rock',
  },

  /* 4. 电子乐 —— 脉冲、序列、冷调跳跃 */
  electronicPulse: {
    bpm: 128,
    melody: [
      880,null,880,987, 880,null,659,null, 880,null,880,1047, 880,null,784,null,
      987,null,987,880, 987,null,784,null, 987,null,987,1175, 987,null,880,null,
      1047,null,1047,1175, 1047,null,880,null, 1047,null,1047,1319, 1047,null,987,null,
      1175,null,1175,1319, 1175,null,1047,null, 880,null,784,698, 659,null,587,null,
    ],
    bass: [110,110,165,165, 110,110,165,165, 146.83,146.83,220,220, 130.81,130.81,196,196],
    drums: 'electronic',
  },

  /* 5. 灵魂乐 —— 温暖、富有律动 */
  soulfulLift: {
    bpm: 104,
    melody: [
      523,null,587,659, 698,null,659,587, 523,null,587,null, 659,null,698,784,
      880,null,784,698, 659,null,587,523, 587,null,659,null, 523,null,587,523,
      440,null,523,587, 659,null,587,523, 494,null,523,null, 587,null,659,698,
      784,null,698,659, 587,null,523,494, 523,null,587,523, 440,null,392,440,
    ],
    bass: [130.81,130.81,164.81,164.81, 146.83,146.83,196,196, 110,110,138.59,138.59, 146.83,146.83,196,196],
    drums: 'soul',
  },

  /* 6. 迷幻 —— 飘浮、微光、慢旋 */
  psychedelicDrift: {
    bpm: 88,
    melody: [
      659,null,null,784, null,880,784,null, 698,null,659,null, 523,null,587,659,
      784,null,880,null, 987,null,880,784, 698,null,659,587, 523,null,494,null,
      440,null,null,523, null,659,587,null, 523,null,440,null, 392,null,349,392,
      440,null,523,null, 587,null,523,440, 392,null,349,330, 294,null,330,null,
    ],
    bass: [110,110,110,110, 130.81,130.81,130.81,130.81, 98,98,98,98, 87.31,87.31,87.31,87.31],
    drums: 'psychedelic',
  },

  /* 7. 放克 —— 切分、弹性贝斯、轻盈 */
  funkyStep: {
    bpm: 116,
    melody: [
      659,523,null,659, null,587,523,null, 587,523,null,587, null,659,784,null,
      698,587,null,698, null,659,587,null, 659,587,null,659, null,784,880,null,
      784,659,null,784, null,880,784,null, 880,784,null,880, null,1047,880,null,
      987,784,null,987, null,880,784,null, 880,784,659,587, 523,null,587,null,
    ],
    bass: [110,110,110,164.81, 110,110,110,164.81, 146.83,146.83,146.83,220, 130.81,130.81,130.81,196],
    drums: 'funk',
  },

  /* 8. 合成器浪潮 —— 复古、跃动、霓虹感 */
  synthwaveNeon: {
    bpm: 118,
    melody: [
      523,null,659,null, 784,null,1047,880, 784,null,659,null, 784,null,880,659,
      587,null,698,null, 880,null,1047,880, 784,null,698,null, 880,null,1047,880,
      659,null,880,null, 1047,null,1319,1047, 880,null,784,null, 659,null,523,null,
      587,null,698,null, 880,null,1047,880, 1047,null,880,null, 784,null,659,523,
    ],
    bass: [130.81,130.81,196,196, 146.83,146.83,220,220, 164.81,164.81,246.94,246.94, 146.83,146.83,220,220],
    drums: 'electronic',
  },

  /* 9. 灵魂爵士 —— 城市夜景、慢慢摇 */
  soulJazz: {
    bpm: 100,
    melody: [
      523,null,587,null, 659,null,698,659, 587,null,523,587, 659,null,587,523,
      440,null,523,587, 659,null,698,659, 784,null,698,null, 659,null,587,523,
      659,null,784,null, 880,null,784,698, 659,null,523,587, 698,null,659,587,
      523,null,440,523, 587,null,659,698, 659,null,587,null, 523,null,440,392,
    ],
    bass: [130.81,130.81,164.81,164.81, 110,110,146.83,146.83, 146.83,146.83,196,196, 130.81,130.81,164.81,164.81],
    drums: 'jazz',
  },

  /* 10. 轻灵电子 —— 极简、飘、空灵 */
  airyPulse: {
    bpm: 110,
    melody: [
      880,null,null,1047, null,1175,null,1047, 880,null,null,784, null,698,null,784,
      1047,null,null,1175, null,1319,null,1175, 1047,null,null,880, null,784,null,880,
      1175,null,1047,880, 784,null,880,1047, 1175,null,1047,880, 784,null,698,659,
      587,null,659,784, 880,null,784,659, 587,null,523,587, 659,null,784,null,
    ],
    bass: [110,110,146.83,146.83, 130.81,130.81,164.81,164.81, 146.83,146.83,196,196, 130.81,130.81,174.61,174.61],
    drums: 'airy',
  },

  /* ============================================================
     🎬 剧情专属 BGM —— 神秘、低沉、带一丝希望
     ============================================================ */
  storyTheme: {
    bpm: 70,
    melody: [
      330,null,null,null, 392,null,null,null, 349,null,null,null, 294,null,null,null,
      262,null,null,null, 294,null,null,null, 330,null,349,392, 440,null,null,null,
      523,null,null,null, 466,null,null,null, 415,null,null,null, 349,null,null,null,
      330,null,294,null, 262,null,294,330, 349,null,392,349, 330,null,null,null,
    ],
    bass: [82.41,82.41,82.41,82.41, 73.42,73.42,73.42,73.42, 87.31,87.31,87.31,87.31, 98,98,98,98],
    drums: 'soft',
    sparse: true,   /* 剧情曲：特殊稀疏鼓点 */
  },
};

/* ============================================================
   2. BGM 元数据 —— 鉴赏播放器用
   ============================================================ */
export const BGM_META = {
  menu:             { name: 'Neon Idle',       genre: 'SYNTHPOP',   scene: 'MENU' },
  levelSelect:      { name: 'Route Select',    genre: 'ELECTRO',    scene: 'SELECT' },
  game:             { name: 'Full Throttle',   genre: 'DRIVE',      scene: 'BATTLE' },
  jazzGroove:       { name: 'Chrome Jazz',     genre: 'JAZZ',       scene: 'BATTLE' },
  bluesyRide:       { name: 'Midnight Blues',  genre: 'BLUES',      scene: 'BATTLE' },
  rockNRoll:        { name: 'Rust and Roll',   genre: 'ROCK',       scene: 'BATTLE' },
  electronicPulse:  { name: 'Voltage Pulse',   genre: 'ELECTRONIC', scene: 'BATTLE' },
  soulfulLift:      { name: 'Soul Circuit',    genre: 'SOUL',       scene: 'BATTLE' },
  psychedelicDrift: { name: 'Drift Haze',      genre: 'PSYCH',      scene: 'BATTLE' },
  funkyStep:        { name: 'Funk Protocol',   genre: 'FUNK',       scene: 'BATTLE' },
  synthwaveNeon:    { name: 'Neon Highway',    genre: 'SYNTHWAVE',  scene: 'BATTLE' },
  soulJazz:         { name: 'City Afterglow',  genre: 'SOUL JAZZ',  scene: 'BATTLE' },
  airyPulse:        { name: 'Aether Wave',     genre: 'AMBIENT',    scene: 'BATTLE' },
  storyTheme:       { name: 'Last Light',      genre: 'CINEMATIC',  scene: 'STORY' },
};

/* 鉴赏页签展示顺序（与游戏内实际使用顺序一致） */
export const BGM_GALLERY_ORDER = [
  'menu', 'levelSelect', 'game',
  'jazzGroove', 'bluesyRide', 'rockNRoll', 'electronicPulse', 'soulfulLift',
  'psychedelicDrift', 'funkyStep', 'synthwaveNeon', 'soulJazz', 'airyPulse',
  'storyTheme',
];

/* 游戏内随机 BGM 池（不含菜单/选关/剧情/初始曲） */
export const GAME_TRACK_ROTATION = [
  'game', 'jazzGroove', 'bluesyRide', 'rockNRoll', 'electronicPulse', 'soulfulLift',
  'psychedelicDrift', 'funkyStep', 'synthwaveNeon', 'soulJazz', 'airyPulse',
];

/* ============================================================
   3. 查询辅助
   ============================================================ */
export function bgmTitle(key) {
  const m = BGM_META[key];
  return m ? m.name : key;
}

/* 单次循环时长（64 个十六分音符） */
export function bgmLoopSeconds(key) {
  const t = BGM_TRACKS[key];
  if (!t) return 10;
  return (60 / t.bpm / 4) * 64;
}