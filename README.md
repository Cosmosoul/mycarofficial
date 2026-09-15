# Beater Goes Rogue · 项目说明

> 一款 3D 肉鸽弹幕跑车游戏（Three.js + 8bit WebAudio）。
> 本文档面向**后续维护者**，反映**当前版本**的项目结构、每个文件职责、常见修改任务的处理方式。

---

## 目录

- [一、快速开始](#一快速开始)
- [二、目录结构](#二目录结构)
- [三、文件详解](#三文件详解)
- [四、架构约定](#四架构约定)
- [五、常见任务手册](#五常见任务手册)
- [六、事件总线速查](#六事件总线速查)
- [七、手柄适配专项](#七手柄适配专项)
- [八、排查指南](#八排查指南)

---

## 一、快速开始

### 运行方式

**不能用 `file://` 打开 `index.html`**——项目使用 ES Modules，浏览器安全策略禁止 `file://` 下加载模块。

任选一种方式起本地 HTTP 服务器：

```bash
# Python
python -m http.server 8000

# Node.js
npx serve
npx http-server -p 8000
```

VS Code 用户推荐 **Live Server** 插件，右键 `index.html` → Open with Live Server。

**修改后必须强刷**：`Ctrl + Shift + R`（Mac `Cmd + Shift + R`）。ES Module 会被 HTTP 缓存，F5 不够。

### 依赖

- **three@0.160.0**：通过 `index.html` 的 importmap 从 `unpkg.com` CDN 加载，无需 `npm install`。
- **Gamepad API**：原生，无需依赖。震动走 `vibrationActuator.playEffect('dual-rumble', ...)`（Chrome / Edge 支持）。

---

## 二、目录结构

```
project/
├─ index.html                  ← HTML 骨架
├─ styles.css                  ← 全部样式
├─ README.md                   ← 本文档
└─ src/
   ├─ main.js                  ← 入口 + 主循环 + 菜单背景 shader + 视觉层注入
   │
   ├─ core.js                  ← 事件总线 + 全局状态 + three.js 引擎骨架
   ├─ platform.js              ← 平台兼容层（唯一处理手机/PC 差异）
   ├─ gamepad.js               ← ★ 手柄原生适配（连接 / 轮询 / 震动 / 光标 / 摇杆锁）
   ├─ config.js                ← 数值 + 关卡 + 解锁规则 + 存档
   ├─ i18n.js                  ← 中英双语文案
   │
   ├─ content/                 ← ★ 内容目录
   │  ├─ vehicles.js           ← 19 辆车（数值 + 建模 + i18n）
   │  ├─ enemies.js            ← 9 种小怪 + 3 种 BOSS
   │  ├─ music.js              ← 19 首 8bit BGM（曲谱 + 元数据）
   │  └─ maps.js               ← 8 张地图（光照参数 + 纹理）
   │
   ├─ audio.js                 ← 音效 + 引擎声浪 + BGM 调度
   ├─ fx.js                    ← 子弹 / 粒子 / 尾焰 / 速度线 / 闪电 / 火球
   ├─ world.js                 ← 地形总装（环境 + 地标 + 道路 + 门 + 植被 + 碎片）
   ├─ entities.js              ← 车辆 mesh + 敌人对象池
   │
   ├─ systems/
   │  ├─ spatial.js            ← 空间哈希
   │  └─ gameplay.js           ← 波次 / AI / 技能 / 卡牌 / 玩家 / 撞击 / 治疗水晶
   │
   └─ ui/
      ├─ hud.js                ← HP / 积分 / 技能栏 / BOSS 血条 / 伤害数字
      ├─ menus.js              ← 所有菜单 / 弹窗 / 结算 / 选关 / 触屏 / 手柄菜单导航
      ├─ viewers.js            ← 图鉴 viewer + 车库 viewer
      ├─ bgm-player.js         ← BGM 鉴赏播放器
      └─ story.js              ← 剧情动画
```

---

## 三、文件详解

### 3.1 入口与核心

#### `index.html`
- 唯一 HTML 文件。
- 所有 DOM 节点 + `importmap` + `<script type="module" src="./src/main.js">`。
- **加新面板**才需要改（见 [5.4](#54-换-ui-布局)）。

#### `src/main.js`
- 唯一 JS 入口。
- 职责：
  1. 注入视觉层 CSS（`#menuFxCanvas`、`#gameFxLayer`）
  2. 动态创建 `#menuFxCanvas`（插到 `#menuBgCanvas` 后）和 `#gameFxLayer`（插到 `#gameWrapper` 第一个子节点）
  3. 初始化 three.js 渲染器（给 canvas 加 `#gameRenderCanvas` id）
  4. 装配所有子系统
  5. **主循环 `animate()`**：按 `state.phase` 分派更新
  6. 主菜单背景 shader + 故障/扫描线 FX（`drawMenuFx`）
- **需要修改**：
  - 加一个每帧跑的系统 → `animate()` 里加一行
  - 加一个新模块 → 顶部 import + 装配区调 `initXxx()`

#### `src/core.js`
- **三合一**：EventBus（`on / off / emit`）+ State（`state / player / engineEnabled / selectedCarId`）+ Engine（renderer / scene / camera / 光照 / 太阳 / 云）。
- `mountRenderer()` 把 3D canvas 挂到 `#gameWrapper`。
- `player` 初始 `pos / dodgeStartPos / dodgeEndPos` 在 `main.js` 里注入 THREE.Vector3。

#### `src/platform.js`
- **唯一处理"手机 vs PC"差异的地方**。业务代码里不应出现 `if (isMobile)`。
- `platform.{isMobile, isIOS, isAndroid, isTouch}`
- **存储**：`load / save / loadJSON / saveJSON`
- **输入**：`bindTap / bindTouchButton / installKeyboard / keys`
- **屏幕**：`getRenderSize / isFullscreen / requestFullscreen / exitFullscreen / lockLandscape / enableForceRotate / isForcedRotate / screenDeltaToWrapper / onResize / emitResize`

#### `src/gamepad.js` ★ 本次大幅扩充
- 手柄适配全部逻辑。
- **连接检测**：`gamepadconnected` / `gamepaddisconnected` 事件 + 启动时主动扫描 3 次（400ms / 1500ms / 4000ms）。
- **轮询**：`pollGamepad()` 由 `main.js` 每帧调用。暴露 `pad` 对象：
  - 模拟量：`steerX / steerY / lookX / lookY / throttle / brake`
  - 按钮边沿：`jumpPressed / dodgePressed / confirmPressed / cancelPressed / pausePressed / lbPressed / rbPressed`
  - 导航边沿（一次一格）：`navUp / navDown / navLeft / navRight`
  - 导航保持（滑条连按）：`navUpHeld / navDownHeld / navLeftHeld / navRightHeld`
  - **摇杆导航锁**：`stickNavLocked`（`lockStickNav()` 设置，摇杆回中自动解）
- **震动**：
  - 分层封装：`rumbleLight()` 0.18 / `rumbleHit()` 0.78 / `rumbleMedium()` 0.55 / `rumbleHeavy()` 0.95 / `rumbleByDistance(dist, maxDist, ...)`
  - 连续轻震：`startContinuousRumble() / stopContinuousRumble()`（车速 > 70% 时循环轻震）
  - 急停：`panicRumble()`（暂停 / 失焦 / 关震动开关时调用）
  - **节流**：55ms 窗口内，除非新震动强度 +0.15 更高，否则丢弃
- **光标隐藏**：连接手柄立刻 `cursor:none`；鼠标一动显 2s 再隐；断开恢复。
- **设置持久化**：`invertY`（右摇杆 Y 轴翻转）/ `rumbleEnabled`（震动开关），存 localStorage。

---

### 3.2 配置与本地化

#### `src/config.js`
- **所有数值集中营**。
- `Tuning`（默认导出）：Dodge / Jump / Ram / Points / Wave / **AI** / Physics / Particles / Terrain / SpeedFx
- `LEVELS`：16 关数据（波数 / 怪物密度 / 精英混合 / 三星时间）
- `getLevelName(id)` / `getLevelRewardText(id)`
- **进度存档**：`progress / saveProgress / isLevelUnlocked / getLevelStars / isLevelCleared / saveLevelResult`
- **车辆解锁**：`CAR_UNLOCK_RULES / isVehicleUnlocked / getNewlyUnlockedCars / recordInfiniteBest`
  - **`default: true`** 表示开局即解锁，这些车不会被 `getNewlyUnlockedCars` 误报为"新解锁"

**关键数值（现状）**：
- `AI.flankRatio: 0.12`, `rearRatio: 0.08`（侧面怪从 55% 降到 20%）
- `AI.flankAngle: 2.0`

#### `src/i18n.js`
- `I18N = { zh: {...}, en: {...} }` + `T(key, ...args)` + `setLang()` + `applyLanguage()`
- **加新 UI 文案**：在 `I18N.zh` 和 `I18N.en` 里各加一条
- **加新卡牌**：加 `card_xxx_name` 和 `card_xxx_desc`

---

### 3.3 内容目录

#### `src/content/vehicles.js` ★ 19 辆
- `VEHICLES`：19 辆车数值
  - 原有 11 辆：coupe / motorcycle / truck / train / tank / future / hover / phantom / cyber / siege / champion
  - **默认解锁 5 辆**：tractor / tricycle / bullet_train / bumper_car / crystal_rainbow
  - **无限模式解锁 3 辆**：zombie_car (27波) / pirate_ship (29波) / cat_car (30波)
- 字段：`id / name / icon / desc / maxSpeed / accel / brake / friction / maxSteer / steerFalloff / steerResponse / yawRateBase / lowSpeedSteerPoint / hitRadius / ramBase / ramPerSpeed / exhausts / exhaustDir / flame / preview`
- **`flameWeights: [w0, w1, w2]`**（可选）：定制尾焰三色权重，不传则走默认等权/强度逻辑
  - crystal_rainbow: `[0.50, 0.40, 0.10]` → 蓝 50% / 紫 40% / 红 10%
  - cat_car: `[1, 1, 1]` → 红黄蓝等权
- `VEHICLE_I18N`：中英名称 + 描述
- `vehName(id) / vehDesc(id) / V()`（当前选定车）
- `buildVehicleModel(id)`：返回 THREE.Group
- `MAT`：共享材质工厂

#### `src/content/enemies.js` ★ 9 小怪 + 3 BOSS
- `ENEMY_DEFS`：
  - **小怪**：mob / bomber / ranged / shield / elite / runner / dasher / jumper / suicide
  - **BOSS**：boss (zombie) / boss_slam (slam) / boss_ufo (ufo)
  - BOSS 用 `bossKind` 区分渲染方式：`zombie` / `slam` 用 `bossRig`；`ufo` 用 `ufoRig`
- **InstancedMesh 架构**：所有小怪共用一个 6 件套 InstancedMesh，只靠颜色 + scale 区分
- `MAX_ZOMBIES = 400`
- `rig`：只在生成实例矩阵时用的临时骨架
- `bossRig` / `bossAura` / `bossAura2` / `ufoRig`：BOSS 模型
- `ENEMY_I18N / enemyInfo(type)`：图鉴文案
- `buildViewerZombie / buildViewerBoss / buildViewerUfo`：图鉴预览专用

**4 种新小怪数据**：
- runner: HP 22 / speed 26 / dmg 12
- dasher: HP 38 / speed 13 / dmg 16（冷却 3s 瞬移）
- jumper: HP 55 / speed 11 / dmg 18（落地 AOE 7m / 24 伤害）
- suicide: HP 32 / speed 15 / dmg 20（死亡 AOE 7m / 40 伤害，无差别）

#### `src/content/music.js` ★ 19 首
- `BGM_TRACKS`：19 首曲谱
  - menu / levelSelect / game / storyTheme（原有）
  - 10 首游戏内：jazzGroove / bluesyRide / rockNRoll / electronicPulse / soulfulLift / psychedelicDrift / funkyStep / synthwaveNeon / soulJazz / airyPulse
  - **5 首新增**：horror / tribal / rnb / pop / country
- `BGM_META`：元数据
- `BGM_GALLERY_ORDER`：鉴赏页展示顺序（19 首）
- `GAME_TRACK_ROTATION`：游戏内随机池（16 首，排除 menu / levelSelect / storyTheme）
- **`drums` 风格字符串**：soft / normal / intense / jazz / blues / rock / electronic / soul / psychedelic / funk / airy / **horror / tribal / rnb / pop / country**

#### `src/content/maps.js` ★ 8 张
- `MAP_POOL`：park / volcano / desert / aquarium / **dream / heaven / amusement / hell**
- `MAP_META`：光照 / 雾 / 围墙参数
- `makeGroundTexture(type)` / `makeWallTexture(type)`：Canvas 程序化纹理
- `groundTexKeyFor / wallTexKeyFor`：map key → 纹理分支
- `pickRandomMap()`

**尺寸约定**（所有地图共用，新地图必须一致）：
- 地面 400×400，围墙 R=200，路宽 12，路长 11→197，喷泉半径 10.7

#### `src/audio.js`
- SFX（`sfxXxx()` + `sfxGate` 门控限流）
- Engine（8bit 引擎声浪）
- BGM（多曲目调度 + 淡入淡出）
- `scheduleMusicStep` 里的鼓点分支支持全部 16 种 `drums` 字符串

#### `src/fx.js`
- 子弹（Points）/ 粒子（Points）/ 尾焰（Points）/ 速度线（Canvas overlay）/ 闪电 / 环 / 火花 / 闪冲轨迹 / 敌方火球
- **闪电系统**（本次大改）：
  - `addLightningLine(pts, color, life, alphaMul)`：内部辅助
  - `spawnLightning(s, e, color, life=0.55, forks=3)`：主闪电 + 2 条偏移副线（约 3px 视觉宽度）+ 分叉（每条 3 个，带 1 条副线）
  - `updateLightning(dt)`：前 40% 时间满亮，后 60% 淡出
  - **为什么用偏移副线**：WebGL 的 `linewidth` 在绝大多数平台被忽略，永远渲染 1px。叠几条同几何、轻微偏移的 Line 是业界通用做法
- `emitExhaustFlames` 支持 `flameWeights`

#### `src/world.js`
- 地形总装
- `terrain`（destructibles / meshes / fountainRadius）
- `buildTerrain(mapType) / clearTerrain()`
- `checkDestructibles(dt)`：车头撞可破坏物检测（由 `gameplay.js` 每帧调用）
- `breakDestructible / updateDestructibles / spawnDebris / updateDebris / clearDebris`
- `buildGrass / clearGrass`
- 内部（不导出）：环境、8 种中心地标、道路、路灯、大门、散布物生成

**8 种中心地标**：buildFountain（park）/ buildLavaPool（volcano）/ buildStatue（desert）/ buildFishTank（aquarium）/ buildDreamSpire（dream）/ buildHeavenGate（heaven）/ buildCarousel（amusement）/ buildHellThrone（hell）

**8 种散布物**：spawnTree / spawnRock / spawnCactus / spawnCrystal / spawnDreamShard / spawnCloudPillar / spawnBalloon / spawnBone

#### `src/entities.js`
- 车辆 mesh：`getCarMesh / rebuildCarMesh`
- 敌人数组 `enemies`
- `spawnEnemy(type, x, z) / resetEnemies() / getActiveEnemyCount()`
- `attachEnemyMeshes()`：把 InstancedMesh + bossRig.root + ufoRig.root 加进场景

#### `src/systems/spatial.js`
- 空间哈希。导出 `SpatialHash` 类 + `enemyHash` 单例 + `queryOut / sepOut` 缓冲。**不需要修改**。

#### `src/systems/gameplay.js` ★ 最大的系统文件
- 技能表 / 伤害结算 / 卡牌 / 波次 / 敌人 AI / 玩家更新 / 撞击 / 技能主炮 / 生命周期 / 输入注入
- **治疗水晶系统**（本次新增）：
  - 每波次 `40%` 概率刷新 `2-5` 个
  - 从 90~120m 高度**倾斜**下落（倾角 23°~43°），落点只在场地内开车可达区域
  - 落地后浮动，玩家撞碎立即回复 `10% maxHp`
  - 20s 未拾取自动淡出
- **右摇杆视角**（局内）：以相机为原点旋转视线（非移动相机），松手 0.5s 后 1s 内平滑回正
- **技能数值**（当前强度）：
  - basic：`[12,15,18,22,26,30,34,38,44,50,56,64,72,82,95]`（1→15 级）
  - aoe：`{r:12,n:6,d:8,cd:4.0}` → `{r:55,n:16,d:62,cd:2.0}`
  - thunder：`{p:0.12,m:1.5,cd:3.0}` → `{p:0.42,m:5.0,cd:1.5}`（m 已翻倍以上）
  - chain：半径 `[14,16,18,20,22,25,28,32]`，溅射 65%
- **韧体卡**（本次新增）：
  - 卡池常驻（和回复卡一样每次都出现）
  - 无升级，抽到即 `maxHp += Math.max(1, Math.round(maxHp * 0.05))`，同时 `hp += 同值`
  - 每次抽卡时都是整数，血条长度不变（满血时 `hp/maxHp` 恒为 1）
- **敌人 AI**：
  - 8m 内强制追车（不再贴侧面）
  - 裂地尸王：蓄力 0.7s → 高跳 1.5s → 落地 22m 巨型冲击波
  - 幽浮母舰：空中 12m 悬浮，免疫一切伤害，每 1.5s 投 3 发红弹；每 8-12s 落地 4s，落地瞬间放 8 只暴民，落地期间可攻击
- **输入注入**：`setTouchPedals / setJoystickSteer / getTouchThrottle / getTouchBrake`
- **左摇杆反向**：`steerInput -= pad.steerX`（右推 → 车向右转，与键盘 D 键同向）

#### `src/ui/hud.js`
- HP / 积分 / 波次 / 击杀 / 场上 / 时间 / 技能栏 / 伤害数字池 / BOSS 血条 / 危险红光
- `tickHud()` 由 `main.js` 每帧调用

#### `src/ui/menus.js` ★ 本次大改
- 所有菜单 / 弹窗 / 结算 / 选关 / 设置 / 帮助 / 卡牌 UI
- 触摸控制（摇杆 + 4 个按钮）
- **手柄菜单导航**（核心逻辑）：
  - **双模式**：
    - **网格/分栏界面**（mainMenu / levelSelect / garage / gallery）：`gpSpatialFind` 真实坐标找邻居，支持左右切列
    - **其他界面**（pause / settings / card / 弹窗）：DOM 顺序线性前后
  - **候选列表用宽松选择器**：`$('#pauseMenu button, #pauseMenu input[type="range"]')` 直接从 DOM 抓，不手写索引
  - **焦点记忆**：`gpFocusedByContext` Map，只在 `PERSISTENT_CONTEXTS`（持久菜单）里生效
  - **索引恢复**：焦点元素被销毁（列表重建）时用 `gpLastIndex` 恢复
  - **滑条**：左右改值（步长 5），上下切焦点
  - **单元素界面**：上下改为滚动最近 `overflow: auto/scroll` 祖先容器（80px/次）
  - **LB/RB**：
    - 选关页 → 翻页
    - 图鉴页 → 切页签
  - **调试**：Console 里 `window.__gpDebug = true` 打印每帧焦点状态

#### `src/ui/viewers.js` ★ 本次大改
- 图鉴 + 车库 3D 预览
- **鼠标拖拽 / 触摸拖拽 / 手柄右摇杆旋转**（支持 `invertY`）
- **车库交互**（本次重构）：
  - 车列表项**用原生 `addEventListener('click')`**（不用 `bindTap`，因为手柄 `el.click()` 不触发 `bindTap` 的 pointer 事件）
  - 每个 `.garage-item` 加 `dataset.id = id`
  - **点击/手柄 A → 已解锁车直接选用**（不再需要手动聚焦 selectBtn 再按 A）
  - **手柄焦点落到某辆车时，通过 EventBus `garage:focusPreview` 事件 → `garagePreview(id)` 立即打开预览**
  - 左列 active 高亮由 `garagePreview` 同步

#### `src/ui/bgm-player.js`
- 曲库列表 / 唱片旋转 / 频谱可视化 / 传输控制
- 曲目行 `<div class="bgm-item">` 供菜单手柄导航匹配

#### `src/ui/story.js`
- 剧情动画。有独立 raf 循环，不占主循环

---

## 四、架构约定

### 模块依赖方向

```
main.js
  ↓
ui/*      systems/gameplay.js
  ↓            ↓
audio.js / fx.js / world.js / entities.js / gamepad.js
  ↓
content/*
  ↓
config.js → i18n.js → platform.js
  ↓
core.js
```

**规则**：
- 上层可以调下层，下层不能反向 import 上层（除了 EventBus）
- 跨层通信走 EventBus
- **例外**：`gameplay.js` 与 `ui/menus.js` 互相 import（可接受）

### 状态管理

- **全局状态**：`core.js` 的 `state`（游戏运行状态）和 `player`（玩家状态）
- **内容数据**：`content/*.js` 的常量表（只读）
- **存档**：`config.js` 的 `progress` 对象（localStorage）
- **手柄设置**：`gamepad.js` 的 `invertY / rumbleEnabled`（localStorage）
- **UI 状态**：各 `ui/*.js` 内部闭包

### 渲染分层

1. **主渲染器**：`core.js` 的 `renderer` → `#gameWrapper`，id=`#gameRenderCanvas`
2. **辅助渲染器**：`viewers.js` / `story.js` / `main.js` 的 `menuRenderer`
3. **FX 层**：`#menuFxCanvas`（主菜单故障/扫描线）+ `#gameFxLayer`（局内 vignette + noise）
4. **Canvas overlay**：`fx.js` 的速度线（`#speedLines`）
5. **DOM overlay**：HUD、伤害数字、BOSS 血条、各种弹窗

**z-index 顺序（局内）**：
- `#gameFxLayer`: 9
- `#speedLines` / `#speedVignette`: 9
- `#hud`: 10
- `#bossBar`: 11
- `#dmgLayer`: 15
- `#dangerVignette`: 17
- `#whiteFlash`: 18

---

## 五、常见任务手册

### 5.1 改数值

| 想改什么 | 改哪里 |
|---|---|
| 每种车的极速 / 撞击力 | `content/vehicles.js` 的 `VEHICLES[id]` |
| 每种僵尸的血量 / 伤害 / 速度 | `content/enemies.js` 的 `ENEMY_DEFS` |
| 每种 BOSS 的 HP / 属性 | `content/enemies.js` 的 `ENEMY_DEFS.boss_xxx` |
| 每波僵尸数量 / 刷新速度 | `config.js` 的 `Tuning.Wave` |
| 关卡波数 / 怪物密度 / 三星时间 | `config.js` 的 `LEVELS` |
| 技能数值（伤害 / 冷却 / 半径） | `gameplay.js` 的 `SKILL_TABLES` |
| 抽卡积分上限增长 | `config.js` 的 `Tuning.Points.capGrowth` |
| 侧面怪比例 | `config.js` 的 `Tuning.AI.flankRatio` / `rearRatio` |
| 每张地图的光照 / 雾 | `content/maps.js` 的 `MAP_META` |
| 车尾焰颜色 | `content/vehicles.js` 每辆车的 `flame` |
| 车尾焰权重 | `content/vehicles.js` 的 `flameWeights`（可选） |
| 治疗水晶掉落概率 / 数量 | `gameplay.js` 的 `startWave` 里 `Math.random() < 0.40` 和 `2 + Math.floor(Math.random() * 4)` |
| 治疗水晶回复量 | `gameplay.js` 的 `updateHealCrystals` 里 `player.maxHp * 0.10` |
| 治疗水晶下落时长 / 倾角 | `gameplay.js` 的 `spawnHealCrystal` 里 `tiltAngle` 和 `fallDuration` |
| 天雷闪电色 / 时长 / 分叉数 | `gameplay.js` 的 `triggerThunder` 里 `THUNDER_PALETTE` + `spawnLightning(..., col, 0.55, 3)` |
| 闪电厚度 | `fx.js` 的 `spawnLightning` 里 `const d = 0.22` |
| 震动强度 | `gamepad.js` 的 `rumbleLight / rumbleHit / rumbleMedium / rumbleHeavy` |
| 摇杆导航锁的回中阈值 | `gamepad.js` 的 `STICK_CENTER_THRESHOLD` |

### 5.2 加内容

#### ➕ 加一辆车

1. **`content/vehicles.js`**
   - `buildVehicleModel(id)` 的 switch 加 `case 'xxx': return buildXxxModel();`
   - 加 `buildXxxModel()` 函数
   - `VEHICLES` 加一条数值
   - `VEHICLE_I18N` 加中英文名称 + 描述
2. **`config.js`**
   - `CAR_UNLOCK_RULES` 加解锁条件：
     - 默认解锁：`{ textKey: 'carUnlockDefault', default: true }`
     - 通关解锁：`{ textKey: 'carUnlockXxx', check: () => isLevelCleared(N) }`
     - 无限模式：`{ textKey: 'carUnlockXxx', check: () => (progress.infiniteBest || 0) >= N }`
3. **`i18n.js`**：加 `carUnlockXxx` 文案

**完成。** 车库 / 图鉴自动列出它。

#### ➕ 加一种小怪

1. **`content/enemies.js`**
   - `ENEMY_DEFS` 加数值（参考 runner / dasher / jumper / suicide 的写法）
   - `ENEMY_I18N` 加中英文 `{ name, desc, stats }`
2. **`systems/gameplay.js`**
   - `ENEMY_LEVEL_MULT` 加这个类型
   - `updateSpawning` 的 roll 分支加概率
   - 如果有特殊行为，在 `updateEnemies` 里加分支
3. **`index.html`**
   - `#galleryList` 加 `<div class="gallery-item" data-type="xxx" data-i18n="listXxx">…</div>`
4. **`i18n.js`**：加 `listXxx` 文案

#### ➕ 加一种 BOSS

参考 `boss_slam` / `boss_ufo` 的完整流程：

1. **`content/enemies.js`**
   - `ENEMY_DEFS.xxx` 加 `isBoss: true, bossKind: 'xxx'`
   - 加 `ENEMY_I18N`
   - 如果有专属 rig，参考 `ufoRig` 的写法；否则复用 `bossRig`
2. **`systems/gameplay.js`**
   - `startWave` 里 `BOSS_POOL` 加 type
   - `updateEnemies` 加独立 AI 分支（参考 `updateUfoBoss`）
   - `killEnemy` 里加 rig 隐藏分支
3. **`entities.js`**：`spawnEnemy` 里 `bossKind` 分支隐藏对应 rig
4. **`index.html` + `i18n.js`**：图鉴条目

#### ➕ 加一首 BGM

1. **`content/music.js`**
   - `BGM_TRACKS.mySong = { bpm, melody[64], bass[16], drums }`
   - `BGM_META` 加 `{ name, genre, scene }`
   - `BGM_GALLERY_ORDER` 加入 key（否则鉴赏里看不到）
   - `GAME_TRACK_ROTATION` 加入 key（否则游戏内不随机播放）
2. **`audio.js`**：如果 `drums` 是新风格，`scheduleMusicStep` 里加对应分支

**完成。**

#### ➕ 加一张地图

1. **`content/maps.js`**
   - `MAP_POOL` 加 `'xxx'`
   - `MAP_META` 加参数
   - `makeGroundTexture` / `makeWallTexture` 各加分支
   - `groundTexKeyFor / wallTexKeyFor` 加映射
2. **（可选）`world.js`**
   - 加一个新地标函数 `buildXxx()`，并在 `buildTerrain` 的分支里调用
   - 加一个新散布物函数 `spawnXxx()`，并在 `buildScatterObjects` 的分派里加
   - **尺寸必须与其他地图一致**：地面 400×400、围墙 R=200、路宽 12、路长 11→197

#### ➕ 加一张卡片

1. **`systems/gameplay.js`**
   - `skills` 加 `{ lv: 0, cd: 0, max: N, active: false, icon: '❌' }`
   - `CARD_POOL_DEFS` 加 `{ key: 'xxx', icon: '❌', numeral: 'XIII' }`
   - `getSkillValueDesc` 加 `case 'xxx'`
   - 在 `dealDamageToEnemy` 或 `updateSkills` 里加技能触发逻辑
2. **`i18n.js`**：加 `card_xxx_name` / `card_xxx_desc`

**特殊卡片类型**（参考韧体卡 / 回复卡）：
- `isHeal: true` → 立即回血，卡池常驻
- `isMaxHp: true` → 立即提上限，卡池常驻
- 加新类型要在 `buildCardPool` 和 `initCardUI` 的 `p.type === 'xxx'` 分支处理

#### ➕ 加手柄按键

1. **`gamepad.js`** 的 `BTN` 加键码（如 `Y: 3`）
2. 在 `pollGamepad` 里 `pad.yPressed = edge(BTN.Y)`
3. 使用方订阅或轮询

### 5.3 删内容

参考 [5.2](#52-加内容) 的反向流程。**特别注意**：
- 删车 → 玩家存档可能选了这辆车，`selectedCarId` 会指向不存在的车。`V()` 里有 fallback 到 `coupe`，但要检查
- 删 BGM → 从 `BGM_TRACKS / BGM_META / BGM_GALLERY_ORDER / GAME_TRACK_ROTATION` 四处都删
- 删地图 → 从 `MAP_POOL / MAP_META / 纹理生成 / groundTexKeyFor / wallTexKeyFor` 五处都处理

### 5.4 换 UI 布局

#### 改现有面板
1. `index.html`：改 DOM 结构
2. `styles.css`：改样式
3. 若涉及 JS 交互，改 `ui/menus.js` 或 `ui/hud.js`

#### 加一个全新面板
1. `index.html`：加 DOM（在 `#gameWrapper` 里）
2. `styles.css`：加样式
3. `ui/`：新建 `xxx.js`：
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
4. `main.js`：import + 装配区调 `initXxx()`
5. **手柄导航**：在 `menus.js` 的 `gpCollectCandidates` 里加该面板的候选列表，在 `gpContextKey` 里加判断

### 5.5 加新系统

比如加一个"每日任务"系统：

1. **`systems/daily.js`** 新建，导出 `initDaily / tickDaily / getDailyProgress`
2. **`main.js`**：import + 装配区 `initDaily()` + `animate()` 里调 `tickDaily(dt)`
3. 通过 EventBus 与其它模块通信

---

## 六、事件总线速查

`core.js` 导出的 `on / off / emit`。

### 战斗

| 事件 | 载荷 | 触发方 | 订阅方 |
|---|---|---|---|
| `dmg:number` | `{ pos, value, isCrit?, color? }` | `gameplay.js` | `hud.js` |
| `screen:flash` | `intensity` | `gameplay.js` | `hud.js` |
| `skillbar:refresh` | 无 | `gameplay.js` / `resetGame` | `hud.js` |
| `bullet:tick` | `bullet` | `fx.js` | `gameplay.js` |
| `bullet:aoeHit` | `bullet` | `fx.js` | `gameplay.js` |
| `enemybullet:hitPlayer` | `bullet` | `fx.js` | `gameplay.js` |

### Boss

| 事件 | 载荷 | 触发方 | 订阅方 |
|---|---|---|---|
| `boss:spawn` | `enemy` | `entities.js` | `gameplay.js` → `boss:barShow` |
| `boss:dead` | 无 | `gameplay.js` | `gameplay.js` → `boss:barHide` |
| `boss:hp` | `ratio` | `gameplay.js` | `hud.js` |
| `boss:barShow` / `boss:barHide` | 无 | `gameplay.js` | `hud.js` |
| `boss:reset` | 无 | `entities.js` | `hud.js` |

### 卡牌 / 结算

| 事件 | 载荷 | 触发方 | 订阅方 |
|---|---|---|---|
| `cards:show` | `{ picks }` | `gameplay.js` | `menus.js` |
| `cards:hide` | 无 | `gameplay.js` | `menus.js` |
| `victory:show` | `{ level, time, kills, waves, points }` | `gameplay.js` | `menus.js` |
| `gameover:show` | `{ level, wave, kills, time, points, mode }` | `gameplay.js` | `menus.js` |

### 手柄

| 事件 | 载荷 | 触发方 | 订阅方 |
|---|---|---|---|
| `gamepad:connected` | `{ id }` | `gamepad.js` | `menus.js` |
| `gamepad:disconnected` | 无 | `gamepad.js` | `menus.js` |
| `garage:focusPreview` | `{ id }` | `menus.js` (gpApplyFocus) | `viewers.js` |

### UI 导航

| 事件 | 载荷 | 触发方 | 订阅方 |
|---|---|---|---|
| `ui:galleryOpen` / `ui:garageOpen` | 无 | `menus.js` | `viewers.js` |
| `ui:replayStory` | 无 | `viewers.js` | `story.js` |
| `bgm:enterTab` / `bgm:leaveTab` / `bgm:playerDeactivate` | 无 | `viewers.js` | `bgm-player.js` |
| `story:playOnce` | `{ onDone }` | `menus.js` | `story.js` |

### 其它

| 事件 | 载荷 | 触发方 | 订阅方 |
|---|---|---|---|
| `hud:update` | 无 | `gameplay.js` | `hud.js` |
| `hud:dangerVignetteHide` | 无 | `gameplay.js` | `hud.js` |
| `hud:clearDmg` | 无 | `menus.js` | `hud.js` |
| `fx:clearAll` | 无 | `gameplay.js` | `menus.js` |
| `keydown` | `e` | `main.js` | `menus.js` |
| `lang:change` | `{ lang }` | `i18n.js` (DOM 事件) | 各 UI |

**加新事件**：`emit('xxx', payload)` + `on('xxx', fn)` 两边都写即可，不需要注册。

---

## 七、手柄适配专项

### 键位映射（Xbox 布局）

| 操作 | 键位 |
|---|---|
| 油门 | RT（右扳机） |
| 倒车 | LT（左扳机） |
| 转向 | 左摇杆（LS） |
| 视角（局内/图鉴/车库） | 右摇杆（RS） |
| 跳跃 | A（右侧按键的下键） |
| 闪冲 | X（右侧按键的左键） |
| 菜单确认 | A |
| 菜单返回 | B |
| 暂停 | Start（设置键） |
| 切页签 / 翻页 | LB / RB |

### 按钮索引（Xbox 标准）

```
0=A  1=B  2=X  3=Y
4=LB 5=RB 6=LT 7=RT
8=Back 9=Start 10=LS 11=RS
12=DUp 13=DDown 14=DLeft 15=DRight
```

### 菜单导航规则

| 界面 | 导航模式 |
|---|---|
| 主菜单 | 坐标（2 列网格 + 底部 langSwitch） |
| 选关 | 坐标（3×2 网格 + 翻页按钮 + 返回） |
| 车库 | 坐标（左列列表 + 右上关闭） |
| 图鉴（角色） | 坐标（左列列表 + 页签 + 右上关闭） |
| 图鉴（BGM） | 线性（曲库 + 页签 + 传输控制） |
| 暂停 / 设置 | 线性（DOM 顺序） |
| 卡牌三选一 | 线性（3 张卡横向） |
| 结算 / 关卡目标 | 线性 |

### 摇杆导航锁

**问题**：玩家推着左摇杆进游戏时，弹出技能卡那一瞬间摇杆会连续触发导航，导致卡片被快速切换。

**解决**：`cards:show` 事件里调 `lockStickNav()`。锁生效时：
- 左摇杆不产生任何 `nav` 事件
- D-pad **不受影响**，从第一帧就能切卡
- 摇杆回中（`|LX| < 0.30 && |LY| < 0.30`）自动解锁

### 震动分层

| 封装 | 强度（strong/weak/duration） | 用途 |
|---|---|---|
| `rumbleLight()` | 0.18 / 0.30 / 70ms | 菜单确认 / 被啃 |
| `rumbleHit()` | 0.78 / 0.82 / 100ms | 撞僵尸 / 撞碎可破坏物 |
| `rumbleMedium()` | 0.55 / 0.60 / 130ms | 殉爆 / 玩家跳跃落地 / 拾取水晶 |
| `rumbleHeavy()` | 0.95 / 0.90 / 240ms | 击杀 BOSS / 天雷 |
| `rumbleByDistance(dist, maxDist, ...)` | 距离衰减 | 裂地尸王落地冲击波 |
| `startContinuousRumble()` | 0.10 / 0.14 / 每 180ms 一次 70ms | 车速 > 70% 时循环 |

**节流**：55ms 窗口内，除非新震动强度比上次高 0.15，否则丢弃。连撞多只怪时会有颗粒感，但不会震到手麻。

**急停**：`panicRumble()` 在暂停 / 窗口失焦 / visibilitychange(hidden) / 关震动开关时调用。会停掉 continuous 并立即发一个 1ms 静默震动。

### 光标自动隐藏

- 手柄连接瞬间 `cursor: none`
- 鼠标移动 → 显示光标 2s，之后重新隐藏
- 手柄断开 → 恢复光标

### 调试

Console 里：
```js
window.__gpDebug = true;   // 打印每帧 [gp] ctx count idx locked focus
```

---

## 八、排查指南

### 常见问题

#### ❌ 白屏 / `Failed to resolve module specifier`
**原因**：`file://` 打开。
**解决**：起 HTTP 服务器。

#### ❌ `@/xxx.js` 404
**原因**：importmap 少了前缀映射。
**解决**：确认 `<script type="importmap">` 里有 `"@/": "./src/"`。

#### ❌ 游戏跑得动但没声音
1. 首次点击启动页了吗？浏览器要求用户交互后才启动 AudioContext
2. 引擎声浪：确认 `resetGame()` 调了 `startEngineSound()`
3. BGM：确认 `state.musicOn = true` 且 `initAudio()` 已调

#### ❌ 手柄菜单选不到 toggle
**原因**：候选列表用了手写索引，索引里 `!e.disabled` 判断在某些浏览器下把 `<button>` 剔除。
**解决**：用宽松选择器 `$('#pauseMenu button, #pauseMenu input[type="range"]')` 直接从 DOM 抓，**不要手写数组**。

#### ❌ 手柄点击车库条目无反应
**原因**：`bindTap` 用 pointer 事件实现，手柄的 `el.click()` 不触发 pointer。
**解决**：车库条目用 `addEventListener('click', ...)`。

#### ❌ 焦点落到某界面元素后总是跳回第一个
**原因**：`gpApplyFocus` 清空了 `gpFocused`，下一帧 `!list.includes(gpFocused)` 触发回退。
**解决**：确认 `gpTick` 里有 `gpLastIndex` 索引恢复逻辑。

#### ❌ 摇杆在技能卡弹窗里乱切
**解决**：`menus.js` 的 `cards:show` 里调 `lockStickNav()`。

#### ❌ 地狱地图看不清
**原因**：天空 / 光照太暗。
**解决**：`content/maps.js` 的 `MAP_META.hell`：`hemiInt 1.35`、`sunInt 1.60`、`sunCol 0xFFA060`、`fogNear 95`。

#### ❌ 僵尸贴侧面卡住
**原因**：`flankRatio / rearRatio` 太高。
**解决**：`config.js` 的 `Tuning.AI.flankRatio: 0.12, rearRatio: 0.08`，且 `updateEnemies` 里 8m 内强制追车。

#### ❌ 手柄震动一段时间后没了
**原因 90% 是手柄电量不足**（低电时震动会被手柄硬件禁用）。
**排查**：
```js
// 手动定时震动，观察能否持续
setInterval(() => {
  const gp = [...navigator.getGamepads()].find(p => p && p.connected);
  if (gp && gp.vibrationActuator) {
    gp.vibrationActuator.playEffect('dual-rumble', {
      startDelay: 0, duration: 200, weakMagnitude: 0.5, strongMagnitude: 0.5
    });
  }
}, 2500);
```
如果手动震动也停 → 手柄/系统问题，不是代码。
如果手动震动持续但不触发 → 检查 `rumbleEnabled` 开关状态。

#### ❌ 震动"太弱 / 太强"
改 `gamepad.js` 里对应的 `rumbleXxx()` 封装。

#### ❌ 修改后没生效
**原因**：ES Module 缓存。
**解决**：`Ctrl + Shift + R` 强刷。

#### ❌ `lockStickNav` 是 `undefined`
**原因**：`gamepad.js` 是旧版。
**解决**：强刷。Console 里 `import('@/gamepad.js').then(m => console.log(Object.keys(m)))` 验证。

### 调试开关

- **显示碰撞体**：`world.js` 里临时 `scene.add(new THREE.AxesHelper(100))`
- **看状态**：`main.js` 的 `animate()` 里 `console.log(state.phase, player.hp)`
- **手柄调试**：`window.__gpDebug = true`
- **看帧率**：Chrome DevTools 的 Performance 面板

### 性能优化建议

1. **减少僵尸数量**：`config.js` 的 `Tuning.Wave.onScreenCap`
2. **降低粒子数量**：`Tuning.Particles.count` / `maxFlames`
3. **降低渲染分辨率**：`core.js` 里 `renderer.setPixelRatio`
4. **关闭阴影**：`core.js` 里 `renderer.shadowMap.enabled = false`
5. **故障 FX 分辨率**：`main.js` 里 `drawMenuFx` 用的 `menuFxCanvas.width = w * 0.5`（半分辨率），想更省可降到 0.25

---

## 附录：文件大小参考

| 文件 | 大致行数 | 主要复杂度 |
|---|---|---|
| `styles.css` | ~2000 | CSS 全在这一份 |
| `ui/menus.js` | ~1100 | 面板交互 + 触摸 + 手柄导航 |
| `systems/gameplay.js` | ~1400 | 玩法核心 + 治疗水晶 + BOSS AI |
| `content/vehicles.js` | ~1300 | 19 辆车的建模 |
| `content/enemies.js` | ~1000 | 僵尸 InstancedMesh + 3 种 BOSS |
| `content/music.js` | ~400 | 19 首曲谱 |
| `content/maps.js` | ~800 | 8 张地图纹理 |
| `fx.js` | ~800 | 所有特效 |
| `world.js` | ~1300 | 8 种地标 + 8 种散布物 |
| `gamepad.js` | ~350 | 手柄适配全逻辑 |
| `ui/viewers.js` | ~550 | 图鉴 + 车库 |
| `main.js` | ~450 | 主循环 + FX 层 |
| 其它 | < 300 | — |

---

**祝维护顺利。** 有任何疑问，先看 [五、常见任务手册](#五常见任务手册) 和 [七、手柄适配专项](#七手柄适配专项)。
