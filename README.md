# Beater Goes Rogue · 项目说明

> 一款 3D 肉鸽弹幕跑车游戏（Three.js + 8bit WebAudio）。
> 本文档面向**后续维护者**，详细介绍项目结构、每个文件职责、常见修改任务的处理方式。

---

## 目录

- [一、快速开始](#一快速开始)
- [二、目录结构](#二目录结构)
- [三、文件详解](#三文件详解)
  - [3.1 入口与核心](#31-入口与核心)
  - [3.2 平台兼容层](#32-平台兼容层)
  - [3.3 配置与本地化](#33-配置与本地化)
  - [3.4 内容目录（Content）](#34-内容目录content)
  - [3.5 音频 / 特效 / 世界 / 实体](#35-音频--特效--世界--实体)
  - [3.6 玩法系统](#36-玩法系统)
  - [3.7 UI 层](#37-ui-层)
- [四、架构约定](#四架构约定)
- [五、常见任务手册](#五常见任务手册)
  - [5.1 改数值](#51-改数值)
  - [5.2 加内容](#52-加内容)
  - [5.3 删内容](#53-删内容)
  - [5.4 换 UI 布局](#54-换-ui-布局)
  - [5.5 加新系统](#55-加新系统)
- [六、事件总线速查](#六事件总线速查)
- [七、排查指南](#七排查指南)

---

## 一、快速开始

### 运行方式

**不能用 `file://` 直接打开 `index.html`**——项目使用 ES Modules，浏览器出于安全策略禁止 `file://` 下的模块加载。

任选一种方式起一个本地 HTTP 服务器：

**方式 1：VS Code + Live Server（推荐）**

1. 用 VS Code 打开项目根目录
2. 右键 `index.html` → **Open with Live Server**
3. 浏览器自动打开 `http://127.0.0.1:5500/`

**方式 2：Python**

```bash
cd project
python -m http.server 8000
```

浏览器访问 `http://localhost:8000`。

**方式 3：Node.js**

```bash
npx serve
# 或
npx http-server -p 8000
```

### 依赖

- **three@0.160.0**：通过 `index.html` 里的 `importmap` 从 `unpkg.com` CDN 加载，无需 `npm install`。
- 如需离线运行，把 `three.module.js` 下载到本地并在 `importmap` 里改成相对路径。

---

## 二、目录结构

```
project/
├─ index.html                  ← HTML 骨架（所有 DOM 节点）
├─ styles.css                  ← 全部样式（一个文件）
├─ README.md                   ← 本文档
└─ src/
   ├─ main.js                  ← 入口 + 主循环 + 菜单背景 shader
   │
   ├─ core.js                  ← 事件总线 + 全局状态 + three.js 引擎骨架
   ├─ platform.js              ← 平台兼容层（唯一处理手机/PC 差异的地方）
   ├─ config.js                ← 数值参数 + 关卡数据 + 解锁规则 + 存档
   ├─ i18n.js                  ← 中英双语文案
   │
   ├─ content/                 ← ★ 内容目录：加新内容只碰这里
   │  ├─ vehicles.js           ← 11 辆车（数值 + 建模 + 名字/描述）
   │  ├─ enemies.js            ← 6 种敌人（数值 + 贴图 + InstancedMesh + Boss）
   │  ├─ music.js              ← 13 首 8bit BGM（曲谱 + 元数据）
   │  └─ maps.js               ← 4 张地图（光照参数 + 地面/围墙纹理）
   │
   ├─ audio.js                 ← 音效 + 引擎声浪 + BGM 调度
   ├─ fx.js                    ← 子弹 / 粒子 / 尾焰 / 速度线 / 闪电 / 火球
   ├─ world.js                 ← 地形总装（环境 + 地标 + 道路 + 门 + 植被 + 碎片）
   ├─ entities.js              ← 车辆 mesh + 敌人对象池
   │
   ├─ systems/
   │  ├─ spatial.js            ← 空间哈希（碰撞查询加速）
   │  └─ gameplay.js           ← 波次 / AI / 技能 / 卡牌 / 玩家 / 撞击
   │
   └─ ui/
      ├─ hud.js                ← HP / 积分 / 技能栏 / BOSS 血条 / 伤害数字
      ├─ menus.js              ← 所有菜单 / 弹窗 / 结算 / 选关 / 触屏控制
      ├─ viewers.js            ← 图鉴 viewer + 车库 viewer
      ├─ bgm-player.js         ← BGM 鉴赏播放器
      └─ story.js              ← 剧情动画
```

---

## 三、文件详解

### 3.1 入口与核心

#### `index.html`
- **唯一的 HTML 文件**。
- 包含：所有 DOM 节点（启动页 / 主菜单 / HUD / 选关 / 结算 / 图鉴 / 车库 / 剧情 / 特效层）+ CSS/JS 引入 + `importmap`。
- **不需要修改**，除非加新面板（见 [5.4](#54-换-ui-布局)）。

#### `src/main.js`
- **唯一入口**，浏览器只加载这一个 JS。
- 职责：
  1. 初始化 three.js 渲染器并挂载到 `#gameWrapper`
  2. 装配所有子模块（`initGameplay()`、`initHud()`、`initMenus()` 等）
  3. **主循环 `animate()`**：按 `state.phase` 分派更新
  4. 主菜单背景 shader（`initMenuBg`）
  5. 窗口 resize、键盘事件、全屏按钮文案同步
- **需要修改**：
  - 加一个**全新的、每帧要跑的系统** → 在 `animate()` 里加一行
  - 加一个**新模块** → 顶部 import + 在装配区调 `initXxx()`

#### `src/core.js`
- **三合一核心**：
  1. **EventBus**：`on / off / emit` —— 模块间通信，避免循环依赖
  2. **State**：全局可变状态
     - `state`：`phase / wave / kills / points / mode / currentLevel / …`
     - `player`：`pos / yaw / speed / hp / iframe / …`
     - `engineEnabled` / `selectedCarId`（含持久化）
  3. **Engine**：three.js 渲染器 / 场景 / 相机 / 光照 / 天空装饰（太阳、云）
     - 导出 `renderer / scene / camera / hemi / sun / sunOrb / sunGlow / cloudGroup`
     - `mountRenderer()` 把 canvas 挂到 `#gameWrapper`

- **需要修改**：
  - 加新全局状态字段 → `state` 对象里加
  - 加新光照 / 天空元素 → `Engine` 区加
  - 一般不需要改。

#### `src/platform.js`
- **唯一处理"手机 vs PC"差异的地方**。业务代码里不应再出现 `if (isMobile)`。
- 提供：
  - `platform.{isMobile, isIOS, isAndroid, isTouch}`
  - **存储**：`load / save / loadJSON / saveJSON`（含 iOS 隐私模式兜底）
  - **输入**：`bindTap / bindTouchButton / installKeyboard / keys`
  - **屏幕**：`getRenderSize / isFullscreen / requestFullscreen / exitFullscreen / lockLandscape / enableForceRotate / isForcedRotate / screenDeltaToWrapper / onResize / emitResize`
- **需要修改**：
  - 加新的触摸手势 → 在这里加通用函数
  - 加新的兼容性处理 → 只在这里加

---

### 3.2 平台兼容层

见上文 [`src/platform.js`](#srcplatformjs)。

---

### 3.3 配置与本地化

#### `src/config.js`
- **所有数值集中营**。调整手感、难度、解锁条件只改这个文件。
- 导出：
  - **`Tuning`**（默认导出）：闪冲/跳跃/撞击/积分/波次/AI/物理/粒子/地形/速度感 各组的数值
  - **`LEVELS`**：16 关卡数据（波数、怪物密度、精英混合、三星时间）
  - **`getLevelName(id)`** / **`getLevelRewardText(id)`**
  - **进度存档**：`progress / saveProgress / isLevelUnlocked / getLevelStars / isLevelCleared / saveLevelResult`
  - **车辆解锁**：`CAR_UNLOCK_RULES / isVehicleUnlocked / getNewlyUnlockedCars / recordInfiniteBest`

#### `src/i18n.js`
- 中英文文案 + `T()` 查询 + `setLang()` 切换 + `applyLanguage()` 刷新 DOM。
- 结构：`I18N = { zh: {...}, en: {...} }`，key 是字符串，值可以是字符串或函数（带参数的文案）。
- **需要修改**：
  - 加新 UI 文案 → 在 `I18N.zh` 和 `I18N.en` 里各加一条
  - 加新卡牌 → 加 `card_xxx_name` 和 `card_xxx_desc`

---

### 3.4 内容目录（Content）

> ★ **加新内容只需要碰 `content/` 里的对应文件**。

#### `src/content/vehicles.js`

包含 4 部分：

1. **`VEHICLES`**：11 辆车的数值定义
   ```js
   coupe: {
     id, name, icon, desc,             // 基础
     maxSpeed, accel, brake, friction, // 驾驶
     maxSteer, steerFalloff, steerResponse, yawRateBase, lowSpeedSteerPoint,
     hitRadius, ramBase, ramPerSpeed,  // 撞击
     exhausts, exhaustDir, flame,      // 尾焰排放口
     preview: { dist, height },        // 车库/图鉴相机
   }
   ```

2. **`VEHICLE_I18N`**：中英车辆名称 + 描述

3. **`vehName(id) / vehDesc(id) / V()`**：查询函数
   - `V()` 返回**当前选定**车辆对象，是业务代码里的高频调用

4. **`buildVehicleModel(id)`**：根据 id 返回 three.js Group（车辆 mesh）

#### `src/content/enemies.js`

1. **`ENEMY_DEFS`**：6 种敌人数值
   ```js
   mob: {
     hp, speed, dmg,           // 战斗数值
     cloth, skin,              // 材质颜色
     radius, scale,            // 碰撞半径 / 视觉缩放
     isBoss,                   // 是否 Boss
     range, fireCD,            // 远程僵尸专用
   }
   ```

2. **`MAX_ZOMBIES / ZOMBIE / HEAD_GEO / zombieMeshes / rig`**：普通僵尸的 InstancedMesh + 骨骼
   - `zombieMeshes`：6 件套（躯干、头、左右臂、左右腿）
   - `rig`：只在生成实例矩阵时用的临时骨架

3. **`bossRig / bossAura / bossAura2`**：Boss 模型

4. **`ENEMY_I18N / enemyInfo(type)`**：图鉴文案

5. **`buildViewerZombie / buildViewerBoss`**：图鉴预览专用（独立于 InstancedMesh）

#### `src/content/music.js`

1. **`BGM_TRACKS`**：13 首曲谱
   ```js
   { bpm, melody[64], bass[16], drums: 'jazz' }
   ```
   - `melody`：64 个十六分音符（`null` 表示休止）
   - `bass`：16 个低音（每 4 步换一次）
   - `drums`：鼓点风格字符串（`soft / normal / intense / jazz / blues / rock / electronic / soul / psychedelic / funk / airy`）

2. **`BGM_META`**：曲目元数据 `{ name, genre, scene }`

3. **`BGM_GALLERY_ORDER`**：鉴赏页展示顺序

4. **`GAME_TRACK_ROTATION`**：游戏内随机轮换池

5. **`bgmTitle / bgmLoopSeconds`**：查询辅助

#### `src/content/maps.js`

1. **`MAP_POOL`**：4 张地图 key 列表
2. **`MAP_META`**：每张地图的光照/雾/围墙颜色参数
3. **`makeGroundTexture(type)` / `makeWallTexture(type)`**：Canvas 程序化纹理
4. **`groundTexKeyFor / wallTexKeyFor`**：地图 key → 纹理分支
5. **`pickRandomMap()`**：随机取一张

---

### 3.5 音频 / 特效 / 世界 / 实体

#### `src/audio.js`
- 三合一：
  1. **SFX**：所有 `sfxXxx()` 音效 + `sfxGate` 门控限流
  2. **Engine**：8bit 引擎声浪（`startEngineSound / updateEngineSound / setTouchPedals`）
  3. **BGM**：多曲目调度（`startBGM / stopBGM / pauseBGM / resumeBGM / pickRandomGameTrack`）
- 也导出 `initAudio / refreshVolumes / playTone`。

#### `src/fx.js`
- 全部视觉特效：
  - **子弹**（Points）：`spawnBullet / updateBullets / deactivateBullet`
  - **粒子**（Points）：`spawnBurstParticles / updateParticles / clearParticles`
  - **尾焰**（Points）：`emitExhaustFlames / updateExhaustFlames / clearFlames`
  - **速度线**（Canvas 2D overlay）：`initSpeedLines / drawSpeedOverlay / updateSpeedFx / getSpeedFxIntensity`
  - **闪电 / 环 / 火花**：`spawnLightning / spawnRing / spawnHitSpark / spawnDodgeEffect / updateLightning / updateFx`
  - **敌方火球**（Points）：`spawnEnemyBullet / updateEnemyBullets / clearEnemyBullets`
- **需要修改**：
  - 加新粒子效果 → 参照现有函数加

#### `src/world.js`
- 地形总装。导出：
  - **`terrain`**：`{ destructibles, meshes, fountainRadius }`
  - **`buildTerrain(mapType)` / `clearTerrain()`**
  - **`checkDestructibles(dt)`**：车头撞可破坏物检测（由 `gameplay.js` 每帧调用）
  - **`breakDestructible / updateDestructibles / spawnDebris / updateDebris / clearDebris`**
  - **`buildGrass / clearGrass`**
  - **`setMapType / getMapType`**
- 内部（不导出）：环境、喷泉/熔岩池/雕像/鱼缸、道路、路灯、大门、树木/岩石/仙人掌/水晶生成。

#### `src/entities.js`
- 车辆 mesh 挂载 + 敌人对象池
- 导出：
  - **`carMesh`** 访问器：`getCarMesh / rebuildCarMesh`
  - **`enemies`**：敌人数组（业务层直接遍历）
  - **`spawnEnemy(type, x, z)` / `resetEnemies()` / `getActiveEnemyCount()`**
  - **`attachEnemyMeshes()`**：把 InstancedMesh + `bossRig.root` 加进场景（由 main.js 启动时调一次）
  - **`hideBossRig()`**

---

### 3.6 玩法系统

#### `src/systems/spatial.js`
- **空间哈希**（碰撞加速）。
- 导出：`SpatialHash` 类 + 全局单例 `enemyHash` + 查询缓冲 `queryOut` / `sepOut`。
- **不需要修改**。

#### `src/systems/gameplay.js`
- **最大的系统文件**，包含：
  1. **技能表**：`skills / SKILL_TABLES / getSkillValueDesc`
  2. **伤害结算**：`dealDamageToEnemy / killEnemy / triggerThunder`
  3. **卡牌**：`pickCard / triggerCardSelect / checkPointOverflow`
  4. **波次**：`startWave / updateSpawning`
  5. **敌人 AI**：`updateEnemies`（含 InstancedMesh 矩阵更新 + Boss 视觉）
  6. **玩家**：`updatePlayer / doDodge / doJump`
  7. **撞击**：`checkRam`
  8. **技能主炮**：`updateSkills`
  9. **生命周期**：`resetGame / startLevel / restartGame / triggerVictory / triggerGameOver`
  10. **输入注入**：`setTouchPedals / setJoystickSteer / getTouchThrottle / getTouchBrake`
  11. **事件订阅**：`initGameplay`

- **需要修改**：
  - 加新技能 → 改 `skills / SKILL_TABLES / CARD_POOL_DEFS / getSkillValueDesc`，并在 `i18n.js` 加文案
  - 加新伤害类型 → 在 `dealDamageToEnemy` 里加 `kind` 分支
  - 改 AI 行为 → `updateEnemies` 里改

---

### 3.7 UI 层

#### `src/ui/hud.js`
- HP/积分条、波次/击杀/场上/时间、技能栏、伤害数字池、BOSS 血条、危险红光。
- 导出：`initHud / tickHud / buildSkillBar / refreshSkillBar / updateHUD / spawnDmg / updateDmgNumbers / clearDmgNumbers / updateBossBarPosition / setBossHp / flashWhite / updateDangerVignette / hideDangerVignette`
- **`tickHud()`** 由 `main.js` 每帧调用。

#### `src/ui/menus.js`
- **最大的 UI 文件**，包含：
  1. **启动页 → 主菜单**（`initBootScreen / enterMainMenu`）
  2. **选关**（`renderLevelSelect / showLevelSelect / backToLevelSelect`）
  3. **关卡目标弹窗**（`openLevelGoal`）
  4. **暂停 / 恢复**（`togglePause`）
  5. **音量 / 引擎开关 / 语言 / 全屏**
  6. **触摸控制**（摇杆 + 4 个按钮 + 暂停键 + 移动端 UI 显示）
  7. **胜利 / 失败**（`showVictory / showGameOver`）
  8. **卡牌 UI**（`initCardUI`）
  9. **键盘快捷键**（Esc / 1 / 2 / 3）
- 导出：`initMenus / showUnlockToast`。

#### `src/ui/viewers.js`
- **图鉴 viewer**（座驾 / 僵尸 / BOSS）+ **车库 viewer**（换车）。
- 导出：`initViewers / tickViewers / switchGalleryTab / isGarageOpen`
- `tickViewers(dt)` 由 `main.js` 每帧调用。

#### `src/ui/bgm-player.js`
- **BGM 鉴赏播放器**：曲库列表、唱片旋转、频谱可视化、进度条、传输控制。
- 导出：`initBgmPlayer / tickBgmPlayer`
- `tickBgmPlayer()` 由 `main.js` 每帧调用。

#### `src/ui/story.js`
- **剧情动画**：3D 场景 + 分句文本。
- 导出：`initStory / playStory / storySkip / shouldPlayFirstStory / onStoryResize`
- 有自己的 `requestAnimationFrame` 循环，不占用主循环。

---

## 四、架构约定

### 模块依赖方向

```
main.js
  ↓
ui/*      systems/gameplay.js
  ↓            ↓
audio.js / fx.js / world.js / entities.js
  ↓
content/*
  ↓
config.js → i18n.js → platform.js
  ↓
core.js
```

**规则**：
- **上层可以调下层，下层不能反向 import 上层**（除了事件总线）。
- 跨层通信走 **EventBus**（见 [六](#六事件总线速查)）。
- **例外**：`systems/gameplay.js` 与 `ui/menus.js` 互相 import（`gameplay` 用 `showUnlockToast`，`menus` 用 `startLevel` 等）。这是可接受的，只要不在模块顶层立即求值对方导出。

### 状态管理

- **全局状态**：`core.js` 的 `state`（游戏运行状态）和 `player`（玩家状态）。
- **内容数据**：`content/*.js` 里的常量表（只读）。
- **进度存档**：`config.js` 的 `progress` 对象（读写 localStorage）。
- **UI 状态**：各 `ui/*.js` 模块内部闭包变量。

### 渲染分层

1. **主渲染器**：`core.js` 的 `renderer` → 挂到 `#gameWrapper`，渲染 3D 场景。
2. **辅助渲染器**：
   - `viewers.js`：图鉴 / 车库（独立 canvas）
   - `story.js`：剧情（独立 canvas）
   - `main.js` 的 `menuRenderer`：主菜单背景 shader
3. **Canvas overlay**：`fx.js` 的速度线（`#speedLines`）
4. **DOM overlay**：HUD、伤害数字、BOSS 血条、各种弹窗

---

## 五、常见任务手册

### 5.1 改数值

| 想改什么 | 改哪里 |
|---|---|
| 玩家车速 / 加速 / 转向 | `config.js` 的 `Tuning`（但更常见的是改**每辆车**，见 `content/vehicles.js`） |
| 每种车的极速 / 撞击力 | `content/vehicles.js` 的 `VEHICLES[id]` |
| 每种僵尸的血量 / 伤害 / 速度 | `content/enemies.js` 的 `ENEMY_DEFS` |
| 每波僵尸数量 / 刷新速度 | `config.js` 的 `Tuning.Wave` |
| 关卡波数 / 怪物密度 / 三星时间 | `config.js` 的 `LEVELS` |
| 卡牌数值（伤害/冷却/半径） | `systems/gameplay.js` 的 `SKILL_TABLES` |
| 抽卡积分上限增长 | `config.js` 的 `Tuning.Points.capGrowth` |
| 引擎声浪音量 | `audio.js` 的 `updateEngineSound` 里 `vol = ...` |
| 音效音量 / 音乐音量 | 玩家可在设置里改；默认值在 `ui/menus.js` 的 `bindVolumeSliders` 里 |
| 每张地图的光照 / 雾 | `content/maps.js` 的 `MAP_META` |
| 车尾焰颜色 | `content/vehicles.js` 每辆车的 `flame` 数组 |
| 撞击无敌时间 / 击飞力度 | `config.js` 的 `Tuning.Ram` |
| 闪冲距离 / 冷却 | `config.js` 的 `Tuning.Dodge` |
| 速度感（FOV、速度线阈值） | `config.js` 的 `Tuning.SpeedFx` |

### 5.2 加内容

#### ➕ 加一辆车

1. **`content/vehicles.js`**
   - 在 `buildVehicleModel(id)` 的 switch 里加一个 `case 'xxx': return buildXxxModel();`
   - 加一个 `buildXxxModel()` 函数（可复制 `buildCoupeModel` 改）
   - 在 `VEHICLES` 里加一条：
     ```js
     xxx: {
       id: 'xxx', name: '新车', icon: '🚗',
       desc: '……',
       maxSpeed: 70, accel: 20, brake: 80, friction: 1.2,
       maxSteer: 0.85, steerFalloff: 0.15, steerResponse: 10,
       yawRateBase: 8.0, lowSpeedSteerPoint: 6,
       hitRadius: 3.6, ramBase: 22, ramPerSpeed: 0.32,
       exhausts: [[-0.55, 0.42, -2.20], [0.55, 0.42, -2.20]],
       exhaustDir: [0, 0, -1],
       flame: [[0.70,0.90,1.00],[1.00,0.82,0.34],[1.00,0.42,0.10]],
       preview: { dist: 11, height: 1.4 },
     },
     ```
   - 在 `VEHICLE_I18N` 里加中英文名字 + 描述

2. **`config.js`**
   - 在 `CAR_UNLOCK_RULES` 里加解锁条件：
     ```js
     xxx: { textKey: 'carUnlockXxx', check: () => isLevelCleared(20) },
     ```
   - 在 `i18n.js` 加 `carUnlockXxx` 文案

**完成。** 车库 / 图鉴会自动列出它。

#### ➕ 加一种敌人

1. **`content/enemies.js`**
   - 在 `ENEMY_DEFS` 里加一条：
     ```js
     ghost: {
       hp: 40, speed: 18, dmg: 22,
       cloth: 0x808080, skin: 0xE0E0E0,
       radius: 1.1, scale: { x: 1, y: 1, z: 1 },
       isBoss: false,
     },
     ```
   - 在 `ENEMY_I18N` 里加中英文 `{ name, desc, stats }`

2. **`systems/gameplay.js`**
   - 在 `updateSpawning` 的 `roll` 分支里加入生成概率：
     ```js
     if (state.wave >= 7 && roll < 0.40) type = 'ghost';
     ```

3. **`index.html`**
   - 在 `#galleryList` 里加一条 `<div class="gallery-item" data-type="ghost">👻 幽灵</div>`
   - 在 `i18n.js` 加 `listGhost` 文案

**完成。** 图鉴会自动支持。

#### ➕ 加一首 BGM

1. **`content/music.js`**
   - 在 `BGM_TRACKS` 里加一首：
     ```js
     mySong: {
       bpm: 120,
       melody: [/* 64 个数字或 null */],
       bass: [/* 16 个数字 */],
       drums: 'electronic',   // 用现成的鼓点风格
     },
     ```
   - 在 `BGM_META` 里加 `mySong: { name: 'My Song', genre: 'HOUSE', scene: 'BATTLE' }`
   - 在 `BGM_GALLERY_ORDER` 数组里加 `'mySong'`（否则鉴赏里看不到）
   - 在 `GAME_TRACK_ROTATION` 数组里加 `'mySong'`（否则游戏内不随机播放）

**完成。**

#### ➕ 加一张地图

1. **`content/maps.js`**
   - `MAP_POOL` 加 `'candyland'`
   - `MAP_META` 加参数：
     ```js
     candyland: {
       sky: 0xFFDDFF, hemiSky: 0xFFFFFF, hemiGround: 0xFFAACC, hemiInt: 1.2,
       sunCol: 0xFFF0FF, sunInt: 1.4,
       roofCol: 0xFF88CC, ridgeCol: 0xCC4499,
       grid1: 0xFFAADD, grid2: 0xFF88BB,
       fogNear: 120, fogFar: 400,
     },
     ```
   - 在 `makeGroundTexture` 加一个 `else if (type === 'candy')` 分支画地面纹理
   - 在 `makeWallTexture` 加一个 `else if (type === 'candy')` 分支画围墙
   - 在 `groundTexKeyFor / wallTexKeyFor` 里加映射

2. **（可选）`world.js`**
   - 加一个新地标函数 `buildCandyTower()`，并在 `buildTerrain` 的分支里加：
     ```js
     if (currentMapType === 'candyland') buildCandyTower();
     ```

**完成。**

#### ➕ 加一个新技能

1. **`systems/gameplay.js`**
   - `skills` 加一条：
     ```js
     vamp: { lv: 0, cd: 0, max: 8, active: false, icon: '🩸' },
     ```
   - `CARD_POOL_DEFS` 加一条：
     ```js
     { key: 'vamp', icon: '🩸', numeral: 'XIII' },
     ```
   - `getSkillValueDesc` 加一个 `case 'vamp'`
   - 在 `dealDamageToEnemy` 里加技能触发逻辑

2. **`i18n.js`**
   - 加 `card_vamp_name` / `card_vamp_desc`

**完成。** 技能栏会自动显示。

### 5.3 删内容

#### ➖ 删一张地图

1. **`content/maps.js`**：从 `MAP_POOL` 移除。若该地图的 `MAP_META / 纹理分支 / groundTexKeyFor` 也想删，一并删。
2. **`world.js`**：删对应的 `buildXxx()` 分支调用。
3. **`content/maps.js`** 里的纹理生成函数：删对应分支。

#### ➖ 删一首 BGM

1. **`content/music.js`**：
   - 从 `BGM_TRACKS / BGM_META` 删
   - 从 `BGM_GALLERY_ORDER / GAME_TRACK_ROTATION` 数组移除
2. **完成。**

#### ➖ 删一辆车

1. **`content/vehicles.js`**：
   - 从 `VEHICLES` 删
   - 从 `VEHICLE_I18N` 删
   - 在 `buildVehicleModel` 里删对应的 `case`
   - 删 `buildXxxModel()` 函数
2. **`config.js`**：从 `CAR_UNLOCK_RULES` 删。
3. **`i18n.js`**：删 `carUnlockXxx` 文案。

> ⚠️ **注意**：如果玩家已存档选了该车，游戏启动时 `selectedCarId` 会指向不存在的车。安全做法是在 `core.js` 里加 fallback：
> ```js
> export let selectedCarId = load('myCarSelectedCar', 'coupe');
> // 之后可选加：if (!VEHICLES[selectedCarId]) selectedCarId = 'coupe';
> ```
> （因为 `core.js` 不能 import `content/vehicles.js`，建议在 `main.js` 或 `entities.js` 里加 fallback 检查。）

#### ➖ 删一种敌人

1. **`content/enemies.js`**：从 `ENEMY_DEFS / ENEMY_I18N` 删。
2. **`systems/gameplay.js`**：从 `updateSpawning` 的 roll 分支删。
3. **`index.html`**：从 `#galleryList` 删。
4. **`i18n.js`**：删 `listXxx` 文案。

### 5.4 换 UI 布局

#### 改现有面板

1. **`index.html`**：找到对应 DOM 节点改结构。
2. **`styles.css`**：找到对应 class 改样式。
3. 若涉及 JS 交互，改 `ui/menus.js` 或 `ui/hud.js`。

#### 加一个全新的面板

1. **`index.html`**：加 DOM（在 `#gameWrapper` 里）。
2. **`styles.css`**：加样式。
3. **`ui/`**：新建 `xxx.js`：
   ```js
   import { bindTap } from '@/platform.js';
   import { on, emit } from '@/core.js';
   import { initAudio, sfxUI } from '@/audio.js';

   export function initXxx() {
     bindTap(document.getElementById('xxxCloseBtn'), () => {
       document.getElementById('xxxScreen').classList.remove('show');
     });
     on('ui:xxxOpen', () => {
       document.getElementById('xxxScreen').classList.add('show');
     });
   }
   ```
4. **`main.js`**：import + 调 `initXxx()`。
5. 从其它地方打开：`emit('ui:xxxOpen')`。

### 5.5 加新系统

比如加一个"每日任务"系统：

1. **`systems/daily.js`** 新建，导出 `initDaily / tickDaily / getDailyProgress`。
2. **`main.js`**：
   - import
   - 在装配区 `initDaily()`
   - 在 `animate()` 的游戏阶段调 `tickDaily(dt)`
3. 通过 EventBus 与其它模块通信。

---

## 六、事件总线速查

`core.js` 导出的 `on / off / emit`。以下是当前所有事件：

### 战斗

| 事件 | 载荷 | 触发方 | 订阅方 |
|---|---|---|---|
| `dmg:number` | `{ pos, value, isCrit?, color? }` | `systems/gameplay.js` | `ui/hud.js`（渲染伤害数字） |
| `screen:flash` | `intensity` | `systems/gameplay.js` | `ui/hud.js`（白闪） |
| `skillbar:refresh` | 无 | `systems/gameplay.js` / `resetGame` | `ui/hud.js` |
| `bullet:tick` | `bullet` | `fx.js` | `systems/gameplay.js`（命中检测） |
| `bullet:aoeHit` | `bullet` | `fx.js` | `systems/gameplay.js`（AoE 爆炸） |
| `enemybullet:hitPlayer` | `bullet` | `fx.js` | `systems/gameplay.js`（扣血） |

### Boss

| 事件 | 载荷 | 触发方 | 订阅方 |
|---|---|---|---|
| `boss:spawn` | `enemy` | `entities.js` | `systems/gameplay.js`（转发 `boss:barShow`） |
| `boss:dead` | 无 | `systems/gameplay.js` | `systems/gameplay.js`（转发 `boss:barHide`） |
| `boss:hp` | `ratio` | `systems/gameplay.js` | `ui/hud.js` |
| `boss:barShow` | 无 | `systems/gameplay.js` | `ui/hud.js` |
| `boss:barHide` | 无 | `systems/gameplay.js` | `ui/hud.js` |
| `boss:reset` | 无 | `entities.js` | `ui/hud.js` |

### 卡牌 / 结算

| 事件 | 载荷 | 触发方 | 订阅方 |
|---|---|---|---|
| `cards:show` | `{ picks }` | `systems/gameplay.js` | `ui/menus.js` |
| `cards:hide` | 无 | `systems/gameplay.js` | `ui/menus.js` |
| `victory:show` | `{ level, time, kills, waves, points }` | `systems/gameplay.js` | `ui/menus.js` |
| `gameover:show` | `{ level, wave, kills, time, points, mode }` | `systems/gameplay.js` | `ui/menus.js` |

### UI 导航

| 事件 | 载荷 | 触发方 | 订阅方 |
|---|---|---|---|
| `ui:galleryOpen` | 无 | `ui/menus.js` | `ui/viewers.js` |
| `ui:garageOpen` | 无 | `ui/menus.js` | `ui/viewers.js` |
| `ui:replayStory` | 无 | `ui/viewers.js` | `ui/story.js` |
| `bgm:enterTab` | 无 | `ui/viewers.js` | `ui/bgm-player.js` |
| `bgm:leaveTab` | 无 | `ui/viewers.js` | `ui/bgm-player.js` |
| `bgm:playerDeactivate` | 无 | `ui/viewers.js` | `ui/bgm-player.js` |
| `story:playOnce` | `{ onDone }` | `ui/menus.js` | `ui/story.js` |

### 其它

| 事件 | 载荷 | 触发方 | 订阅方 |
|---|---|---|---|
| `hud:update` | 无 | `systems/gameplay.js` | `ui/hud.js` |
| `hud:dangerVignetteHide` | 无 | `systems/gameplay.js` | `ui/hud.js` |
| `hud:clearDmg` | 无 | `ui/menus.js` | `ui/hud.js` |
| `fx:clearAll` | 无 | `systems/gameplay.js` | `ui/menus.js` |
| `keydown` | `e` | `main.js` | `ui/menus.js`（Esc / 1 / 2 / 3） |

### 加新事件

只要 `emit('xxx', payload)` 和 `on('xxx', fn)` 两边都写就行，**不需要在任何地方注册**。

### 调试提示

想知道一个事件当前谁订阅了？在浏览器 Console 里：

```js
// 直接读 EventBus 内部 map —— 需要临时改一下 core.js 把 _bus 导出
```
或更简单的做法：搜代码 `on('事件名'`。

---

## 七、排查指南

### 常见问题

#### ❌ 打开 `index.html` 白屏，控制台报 `Failed to resolve module specifier`

**原因**：用了 `file://`。
**解决**：起 HTTP 服务器（见 [一、快速开始](#一快速开始)）。

#### ❌ 控制台报 `Failed to resolve module specifier "@/xxx.js"`

**原因**：`index.html` 里的 `importmap` 少了前缀映射。
**解决**：确保 `<script type="importmap">` 里有 `"@/": "./src/"`（注意末尾斜杠）。

#### ❌ 某个 `.js` 报 404

**原因**：文件路径写错，或文件没保存。
**解决**：检查 `Network` 标签页，看哪个 `.js` 404。

#### ❌ 游戏跑得动，但没有声音

1. **首次点击启动页了吗？** 浏览器的自动播放策略要求**一次用户交互**才能启动 `AudioContext`。
2. **引擎声浪没声音？** 确认 `resetGame()` 里调了 `startEngineSound()`。
3. **BGM 没声音？** 确认 `state.musicOn = true`，且 `initAudio()` 已调过。

#### ❌ 进关卡后相机不动

**原因**：`updatePlayer()` 末尾漏了相机跟随代码。
**解决**：确认 `updatePlayer` 里有 `camera.position.lerp(camTarget, ...)` 和 `camera.lookAt(...)`。

#### ❌ 手机按钮/摇杆点不动

**原因**：`initTouchControls()` 没调，或 `platform.isMobile` 判断错。
**解决**：确认 `ui/menus.js` 的 `initMenus()` 里调了 `initTouchControls()`。

#### ❌ 进游戏画面被选关页盖住

**原因**：`startLevel()` 之前没关 `#levelSelectScreen`。
**解决**：确认 `ui/menus.js` 的 `goalConfirmBtn` 里先调 `closeAllOverlays()`。

#### ❌ 僵尸能看见，但 Boss 看不见

**原因**：`entities.js` 的 `attachEnemyMeshes()` 里没 `scene.add(bossRig.root)`。

#### ❌ 可破坏物（树、路灯）撞不坏

**原因**：`checkRam()` 里没调 `checkDestructibles(dt)`。

### 调试开关

- **显示碰撞体**：临时在 `world.js` 里加 `scene.add(new THREE.AxesHelper(100))`。
- **调试模式**：临时在 `main.js` 的 `animate()` 里 `console.log(state.phase, player.hp)`。
- **看帧率**：用 Chrome DevTools 的 Performance 面板录一段。

### 性能优化建议

1. **减少僵尸数量**：`config.js` 的 `Tuning.Wave.onScreenCap`。
2. **降低粒子数量**：`config.js` 的 `Tuning.Particles.count` / `maxFlames`。
3. **降低渲染分辨率**：`core.js` 里 `renderer.setPixelRatio`。
4. **关闭阴影**：`core.js` 里 `renderer.shadowMap.enabled = false`。

---

## 附录：文件大小参考

| 文件 | 大致行数 | 主要复杂度 |
|---|---|---|
| `styles.css` | ~2000 | CSS 全在这一份 |
| `ui/menus.js` | ~550 | 面板交互 + 触摸控制 |
| `systems/gameplay.js` | ~1000 | 玩法核心 |
| `content/vehicles.js` | ~700 | 11 辆车的建模 |
| `content/enemies.js` | ~700 | 僵尸 InstancedMesh + Boss |
| `content/music.js` | ~300 | 13 首曲谱 |
| `content/maps.js` | ~400 | 纹理生成 |
| `fx.js` | ~700 | 所有特效系统 |
| `world.js` | ~900 | 地形生成 |
| 其它 | < 300 | — |

---

**祝维护顺利。** 有任何疑问，先看 [五、常见任务手册](#五常见任务手册)。
