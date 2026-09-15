/* ============================================================
   content/maps.js —— 地图内容目录
   ┌─────────────────────────────────────────────────────────┐
   │ 加一张新地图：                                          │
   │  ① 在 MAP_POOL 里加 key                                 │
   │  ② 在 MAP_META 里加参数                                 │
   │  ③ 在 makeGroundTexture / makeWallTexture 里加纹理分支  │
   │  ④ 若要加地标/装饰物，world.js 里按 mapType 分发         │
   └─────────────────────────────────────────────────────────┘
   ============================================================ */

import * as THREE from 'three';

/* ============================================================
   1. 地图池 & 参数
   ============================================================ */
export const MAP_POOL = [
  'park', 'volcano', 'desert', 'aquarium',
  'dream', 'heaven', 'amusement', 'hell',
];

export const MAP_META = {
  park: {
    sky: 0x7FB4DE, hemiSky: 0xC8E8FF, hemiGround: 0x5A6A72, hemiInt: 1.0,
    sunCol: 0xFFF4E0, sunInt: 1.3,
    roofCol: 0x2D5A20, ridgeCol: 0x1A3A0A,
    grid1: 0xA8E088, grid2: 0x88C068,
    fogNear: 120, fogFar: 400,
  },
  volcano: {
    sky: 0x3A1E18, hemiSky: 0xB86A52, hemiGround: 0x3E2E26, hemiInt: 1.05,
    sunCol: 0xFF9A58, sunInt: 1.30,
    roofCol: 0x3A1410, ridgeCol: 0x1A0808,
    grid1: 0xC05838, grid2: 0x703020,
    fogNear: 95, fogFar: 330,
  },
  desert: {
    sky: 0xC8A870, hemiSky: 0xFFF0C0, hemiGround: 0x8A7040, hemiInt: 1.1,
    sunCol: 0xFFF4D0, sunInt: 1.55,
    roofCol: 0x8A7A5A, ridgeCol: 0x5A4A30,
    grid1: 0xE0C888, grid2: 0xA89060,
    fogNear: 130, fogFar: 420,
  },
  aquarium: {
    sky: 0x1C5478, hemiSky: 0x80D0F0, hemiGround: 0x103050, hemiInt: 1.05,
    sunCol: 0xA0E0FF, sunInt: 1.05,
    roofCol: 0x1A4A6A, ridgeCol: 0x0A2A44,
    grid1: 0x60C8E8, grid2: 0x307898,
    fogNear: 80, fogFar: 300,
  },

  /* ==================== 新增 4 张 ==================== */

  /* 🌙 梦境世界 —— 紫粉夜空 + 漂浮感 */
  dream: {
    sky: 0x2A1840, hemiSky: 0xE0B8FF, hemiGround: 0x4A2860, hemiInt: 1.10,
    sunCol: 0xFFC8F0, sunInt: 1.05,
    roofCol: 0x4A2870, ridgeCol: 0x2A1850,
    grid1: 0xFF80E0, grid2: 0xA060E0,
    fogNear: 85, fogFar: 340,
  },

  /* ☁️ 天堂 —— 金白强光 + 朦胧 */
  heaven: {
    sky: 0xFFF4D8, hemiSky: 0xFFFFFF, hemiGround: 0xF0E4C0, hemiInt: 1.45,
    sunCol: 0xFFF8D8, sunInt: 1.85,
    roofCol: 0xFFF0C0, ridgeCol: 0xE8C870,
    grid1: 0xFFFFFF, grid2: 0xFFE8A0,
    fogNear: 150, fogFar: 500,
  },

  /* 🎡 游乐园 —— 高饱和嘉年华 */
  amusement: {
    sky: 0x60C8F0, hemiSky: 0xFFE0F0, hemiGround: 0xFFB060, hemiInt: 1.30,
    sunCol: 0xFFF4C0, sunInt: 1.45,
    roofCol: 0xFF4080, ridgeCol: 0xC02060,
    grid1: 0xFF80C0, grid2: 0x60C0FF,
    fogNear: 130, fogFar: 420,
  },

  /* 🔥 地狱 —— 暗红 + 熔岩（已调亮：天空/雾/光照/主光颜色） */
  hell: {
    sky: 0x3A1018, hemiSky: 0xC87878, hemiGround: 0x5A3020, hemiInt: 1.35,
    sunCol: 0xFFA060, sunInt: 1.60,
    roofCol: 0x4A1810, ridgeCol: 0x2A0C08,
    grid1: 0xE06040, grid2: 0x803020,
    fogNear: 95, fogFar: 420,
  },
};

/* 随机取一张地图 */
export function pickRandomMap() {
  return MAP_POOL[Math.floor(Math.random() * MAP_POOL.length)];
}

/* ============================================================
   2. 地面纹理
   ============================================================ */
export function makeGroundTexture(type) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (type === 'sand') {
    ctx.fillStyle = '#D9BE86'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 240; i++) {
      const x = Math.random() * size, y = Math.random() * size, r = 6 + Math.random() * 34;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      if (Math.random() < 0.5) { g.addColorStop(0, 'rgba(196,164,102,0.5)'); g.addColorStop(1, 'rgba(196,164,102,0)'); }
      else { g.addColorStop(0, 'rgba(238,214,164,0.45)'); g.addColorStop(1, 'rgba(238,214,164,0)'); }
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(180,150,96,0.28)'; ctx.lineCap = 'round';
    for (let i = 0; i < 90; i++) {
      const y = Math.random() * size, x = Math.random() * size, w = 20 + Math.random() * 50;
      ctx.lineWidth = 0.8 + Math.random() * 1.6;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + w * 0.5, y + (Math.random() - 0.5) * 10, x + w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(${150 + Math.random() * 60 | 0},${120 + Math.random() * 60 | 0},${70 + Math.random() * 60 | 0},${0.1 + Math.random() * 0.3})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5);
    }

  } else if (type === 'volcanic') {
    ctx.fillStyle = '#8E8A82'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * size, y = Math.random() * size, r = 5 + Math.random() * 28;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      if (Math.random() < 0.5) {
        g.addColorStop(0, 'rgba(198,192,182,0.55)'); g.addColorStop(1, 'rgba(198,192,182,0)');
      } else {
        g.addColorStop(0, 'rgba(88,78,70,0.42)'); g.addColorStop(1, 'rgba(88,78,70,0)');
      }
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      ctx.strokeStyle = `rgba(255,${150 + Math.random() * 70 | 0},${30 + Math.random() * 40 | 0},${0.50 + Math.random() * 0.45})`;
      ctx.lineWidth = 0.9 + Math.random() * 2.6;
      let x = Math.random() * size, y = Math.random() * size;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) { x += (Math.random() - 0.5) * 36; y += (Math.random() - 0.5) * 36; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    for (let i = 0; i < 600; i++) {
      const v = Math.random();
      ctx.fillStyle = v < 0.62
        ? `rgba(104,94,84,${0.08 + Math.random() * 0.20})`
        : `rgba(255,164,54,${0.16 + Math.random() * 0.32})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }

  } else if (type === 'marble') {
    ctx.fillStyle = '#E6F2F8'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * size, y = Math.random() * size, r = 20 + Math.random() * 60;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(140,190,225,${0.15 + Math.random() * 0.25})`);
      g.addColorStop(1, 'rgba(140,190,225,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = `rgba(${90 + Math.random() * 60 | 0},${140 + Math.random() * 60 | 0},${180 + Math.random() * 50 | 0},${0.18 + Math.random() * 0.3})`;
      ctx.lineWidth = 0.8 + Math.random() * 2.6;
      let x = Math.random() * size, y = Math.random() * size;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 6; j++) { x += (Math.random() - 0.5) * 50; y += (Math.random() - 0.5) * 50; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    for (let i = 0; i < 350; i++) {
      ctx.fillStyle = `rgba(${180 + Math.random() * 60 | 0},${215 + Math.random() * 40 | 0},${235 + Math.random() * 20 | 0},${0.06 + Math.random() * 0.14})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }

  /* ==================== 新增 4 张 ==================== */

  } else if (type === 'dream') {
    /* 紫粉梦境：柔和光斑 + 星光点 */
    ctx.fillStyle = '#3A2258'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * size, y = Math.random() * size, r = 8 + Math.random() * 40;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const pick = Math.random();
      if (pick < 0.34) { g.addColorStop(0, `rgba(255,160,240,${0.18 + Math.random() * 0.22})`); g.addColorStop(1, 'rgba(255,160,240,0)'); }
      else if (pick < 0.68) { g.addColorStop(0, `rgba(160,120,255,${0.18 + Math.random() * 0.22})`); g.addColorStop(1, 'rgba(160,120,255,0)'); }
      else { g.addColorStop(0, `rgba(100,80,180,${0.15 + Math.random() * 0.18})`); g.addColorStop(1, 'rgba(100,80,180,0)'); }
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      ctx.strokeStyle = `rgba(${200 + Math.random() * 55 | 0},${140 + Math.random() * 80 | 0},${240 + Math.random() * 15 | 0},${0.10 + Math.random() * 0.16})`;
      ctx.lineWidth = 0.6 + Math.random() * 1.8;
      let x = Math.random() * size, y = Math.random() * size;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 6; j++) {
        x += (Math.random() - 0.5) * 40;
        y += (Math.random() - 0.5) * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 260; i++) {
      const a = 0.3 + Math.random() * 0.6;
      ctx.fillStyle = `rgba(255,240,255,${a})`;
      const s = 1 + Math.random() * 2.2;
      ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
    }

  } else if (type === 'heaven') {
    /* 金白大理石：亮底 + 浅金纹 */
    ctx.fillStyle = '#FBF4E0'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * size, y = Math.random() * size, r = 24 + Math.random() * 60;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,240,200,${0.30 + Math.random() * 0.30})`);
      g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = `rgba(${200 + Math.random() * 55 | 0},${160 + Math.random() * 60 | 0},${80 + Math.random() * 60 | 0},${0.22 + Math.random() * 0.32})`;
      ctx.lineWidth = 0.6 + Math.random() * 2.2;
      let x = Math.random() * size, y = Math.random() * size;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (Math.random() - 0.5) * 60;
        y += (Math.random() - 0.5) * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(255,255,250,${0.20 + Math.random() * 0.40})`;
      const s = 1 + Math.random() * 2.5;
      ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
    }

  } else if (type === 'amusement') {
    /* 游乐园：高饱和菱形拼贴 */
    ctx.fillStyle = '#FFE0A0'; ctx.fillRect(0, 0, size, size);
    const diamondSize = 32;
    const colors = ['#FF6AA8', '#FFD040', '#60D0FF', '#80FF80', '#C080FF', '#FF8060'];
    for (let y = -diamondSize; y < size + diamondSize; y += diamondSize) {
      for (let x = -diamondSize; x < size + diamondSize; x += diamondSize) {
        const cx = x + ((y / diamondSize) % 2) * (diamondSize / 2);
        const c = colors[(Math.abs(cx * 7 + y * 13) / diamondSize | 0) % colors.length];
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(cx + diamondSize / 2, y + diamondSize / 2);
        ctx.lineTo(cx, y + diamondSize);
        ctx.lineTo(cx - diamondSize / 2, y + diamondSize / 2);
        ctx.closePath();
        ctx.fill();
      }
    }
    for (let i = 0; i < 180; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.35})`;
      const s = 1 + Math.random() * 3;
      ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
    }
    const vg = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, size, size);

  } else if (type === 'hell') {
    /* 地狱：暗红岩 + 红色裂纹 + 灰烬（调亮：底色/斑点/灰烬） */
    ctx.fillStyle = '#5A2018'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 240; i++) {
      const x = Math.random() * size, y = Math.random() * size, r = 6 + Math.random() * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const pick = Math.random();
      if (pick < 0.5) { g.addColorStop(0, `rgba(140,50,35,${0.4 + Math.random() * 0.3})`); g.addColorStop(1, 'rgba(140,50,35,0)'); }
      else { g.addColorStop(0, `rgba(70,25,18,${0.5 + Math.random() * 0.3})`); g.addColorStop(1, 'rgba(70,25,18,0)'); }
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 42; i++) {
      ctx.strokeStyle = `rgba(255,${40 + Math.random() * 90 | 0},${10 + Math.random() * 30 | 0},${0.55 + Math.random() * 0.40})`;
      ctx.lineWidth = 0.9 + Math.random() * 2.8;
      let x = Math.random() * size, y = Math.random() * size;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 6; j++) {
        x += (Math.random() - 0.5) * 32;
        y += (Math.random() - 0.5) * 32;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 500; i++) {
      const v = Math.random();
      ctx.fillStyle = v < 0.6
        ? `rgba(100,60,40,${0.10 + Math.random() * 0.22})`
        : `rgba(255,${100 + Math.random() * 80 | 0},${30 + Math.random() * 40 | 0},${0.18 + Math.random() * 0.32})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }

  } else {
    /* grass（park 默认） */
    ctx.fillStyle = '#6FA84F'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * size, y = Math.random() * size, r = 8 + Math.random() * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      if (Math.random() < 0.5) { g.addColorStop(0, 'rgba(74,122,52,0.50)'); g.addColorStop(1, 'rgba(74,122,52,0)'); }
      else { g.addColorStop(0, 'rgba(158,200,110,0.45)'); g.addColorStop(1, 'rgba(158,200,110,0)'); }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 3200; i++) {
      const x = Math.random() * size, y = Math.random() * size;
      const len = 2 + Math.random() * 4.5;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const rr = 62 + Math.random() * 74;
      const gg = 128 + Math.random() * 86;
      const bb = 46 + Math.random() * 62;
      ctx.strokeStyle = `rgba(${rr | 0},${gg | 0},${bb | 0},${(0.26 + Math.random() * 0.40).toFixed(2)})`;
      ctx.lineWidth = 0.7 + Math.random() * 1.0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(50, 50);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ============================================================
   3. 围墙纹理
   ============================================================ */
export function makeWallTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (type === 'volcanic') {
    ctx.fillStyle = '#3A2620'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * 256, y = Math.random() * 256;
      const w = 18 + Math.random() * 46, h = 12 + Math.random() * 32;
      const v = 0.7 + Math.random() * 0.6;
      ctx.fillStyle = `rgb(${Math.min(255, 86 * v) | 0},${Math.min(255, 52 * v) | 0},${Math.min(255, 42 * v) | 0})`;
      ctx.fillRect(x, y, w, h);
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(${220 + Math.random() * 35 | 0},${80 + Math.random() * 80 | 0},${16 + Math.random() * 34 | 0},${0.30 + Math.random() * 0.5})`;
      ctx.lineWidth = 0.8 + Math.random() * 2.6;
      let x = Math.random() * 256, y = Math.random() * 256;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(${30 + Math.random() * 70 | 0},${18 + Math.random() * 50 | 0},${14 + Math.random() * 40 | 0},${0.08 + Math.random() * 0.22})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 4, 1 + Math.random() * 4);
    }

  } else if (type === 'stone') {
    ctx.fillStyle = '#8A8A88'; ctx.fillRect(0, 0, 256, 256);
    const rowH = 26, brickW = 52;
    ctx.fillStyle = '#5A5A58';
    for (let row = 0; row <= 256 / rowH; row++) {
      const y = row * rowH; ctx.fillRect(0, y, 256, 3);
      const offset = (row % 2) * (brickW / 2);
      for (let col = -1; col <= 256 / brickW; col++) ctx.fillRect(col * brickW + offset, y, 3, rowH);
    }
    for (let row = 0; row < 256 / rowH; row++) {
      for (let col = 0; col < 256 / brickW + 1; col++) {
        const offset = (row % 2) * (brickW / 2);
        const x = col * brickW + offset + 3, y = row * rowH + 3;
        const v = 128 + Math.random() * 40;
        ctx.fillStyle = `rgb(${v | 0},${(v * 0.99) | 0},${(v * 0.96) | 0})`;
        ctx.fillRect(x, y, brickW - 3, rowH - 3);
      }
    }
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(${60 + Math.random() * 60 | 0},${60 + Math.random() * 60 | 0},${60 + Math.random() * 60 | 0},${0.05 + Math.random() * 0.13})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 4, 1 + Math.random() * 4);
    }

  } else if (type === 'aquarium') {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1A5A88');
    grad.addColorStop(0.5, '#0E3C60');
    grad.addColorStop(1, '#082438');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(120,220,255,0.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      const p = (i / 4) * 256;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(256, p); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(180,240,255,0.55)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const p = (i / 4) * 256;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(256, p); ctx.stroke();
    }
    for (let i = 0; i < 44; i++) {
      const x = Math.random() * 256, y = Math.random() * 256, r = 6 + Math.random() * 34;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(160,240,255,${0.08 + Math.random() * 0.2})`);
      g.addColorStop(1, 'rgba(160,240,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * 256, y = Math.random() * 256, r = 1 + Math.random() * 4;
      ctx.strokeStyle = `rgba(200,245,255,${0.18 + Math.random() * 0.32})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * 256, y = Math.random() * 256;
      const s = 0.6 + Math.random() * 1.2;
      ctx.fillStyle = `rgba(160,240,255,${0.08 + Math.random() * 0.14})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 10 * s, 4.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 10 * s, y);
      ctx.lineTo(x + 17 * s, y - 4 * s);
      ctx.lineTo(x + 17 * s, y + 4 * s);
      ctx.closePath(); ctx.fill();
    }

  /* ==================== 新增 4 张 ==================== */

  } else if (type === 'dream') {
    /* 梦境墙：紫粉渐变 + 浮光 */
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#3A2058');
    grad.addColorStop(0.5, '#2A1648');
    grad.addColorStop(1, '#180A30');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 256, y = Math.random() * 256, r = 8 + Math.random() * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,160,240,${0.12 + Math.random() * 0.22})`);
      g.addColorStop(1, 'rgba(255,160,240,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = `rgba(200,140,255,${0.25 + Math.random() * 0.35})`;
      ctx.lineWidth = 0.6 + Math.random() * 1.8;
      let x = Math.random() * 256, y = Math.random() * 256;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) { x += (Math.random() - 0.5) * 50; y += (Math.random() - 0.5) * 50; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(255,220,255,${0.30 + Math.random() * 0.45})`;
      const s = 1 + Math.random() * 2;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, s, s);
    }

  } else if (type === 'heaven') {
    /* 天堂墙：金白拱券 */
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#FFF8E0');
    grad.addColorStop(0.5, '#F0E0B0');
    grad.addColorStop(1, '#D8C088');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(200,160,80,0.55)';
    ctx.lineWidth = 6;
    for (let i = 0; i < 2; i++) {
      const ax = 64 + i * 128;
      ctx.beginPath();
      ctx.arc(ax, 256, 56, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(200,160,80,0.30)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const x = i * 64;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
    }
    for (let i = 0; i < 320; i++) {
      ctx.fillStyle = `rgba(255,255,240,${0.25 + Math.random() * 0.45})`;
      const s = 1 + Math.random() * 3;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, s, s);
    }

  } else if (type === 'amusement') {
    /* 游乐园墙：彩色条纹 + 圆点 */
    const bands = ['#FF4080', '#FFD040', '#60D0FF', '#80FF80', '#C080FF'];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = bands[i];
      ctx.fillRect(0, i * 52, 256, 52);
    }
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 256, y = Math.random() * 256;
      const r = 2 + Math.random() * 4;
      ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.random() * 0.4})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    const vg = ctx.createRadialGradient(128, 128, 20, 128, 128, 200);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.20)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, 256, 256);

  } else if (type === 'hell') {
    /* 地狱墙：暗红石 + 骨白 + 熔岩脉（调亮：底色/石块色） */
    ctx.fillStyle = '#3A1010'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 256, y = Math.random() * 256;
      const w = 20 + Math.random() * 44, h = 14 + Math.random() * 30;
      const v = 0.6 + Math.random() * 0.5;
      ctx.fillStyle = `rgb(${Math.min(255, 140 * v) | 0},${Math.min(255, 55 * v) | 0},${Math.min(255, 42 * v) | 0})`;
      ctx.fillRect(x, y, w, h);
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 44; i++) {
      ctx.strokeStyle = `rgba(255,${40 + Math.random() * 90 | 0},${12 + Math.random() * 30 | 0},${0.50 + Math.random() * 0.45})`;
      ctx.lineWidth = 0.8 + Math.random() * 2.8;
      let x = Math.random() * 256, y = Math.random() * 256;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) { x += (Math.random() - 0.5) * 55; y += (Math.random() - 0.5) * 55; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(220,210,180,${0.20 + Math.random() * 0.30})`;
      const s = 1 + Math.random() * 3;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, s, s);
    }

  } else {
    /* brick（park 默认） */
    ctx.fillStyle = '#6E2C1E'; ctx.fillRect(0, 0, 256, 256);
    const rowH = 24, brickW = 48;
    ctx.fillStyle = '#301A12';
    for (let row = 0; row <= 256 / rowH; row++) {
      const y = row * rowH; ctx.fillRect(0, y, 256, 3);
      const offset = (row % 2) * (brickW / 2);
      for (let col = -1; col <= 256 / brickW; col++) ctx.fillRect(col * brickW + offset, y, 3, rowH);
    }
    for (let row = 0; row < 256 / rowH; row++) {
      for (let col = 0; col < 256 / brickW + 1; col++) {
        const offset = (row % 2) * (brickW / 2);
        const x = col * brickW + offset + 3; const y = row * rowH + 3;
        const r = 100 + Math.random() * 45; const g = 38 + Math.random() * 25; const b = 28 + Math.random() * 20;
        ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`; ctx.fillRect(x, y, brickW - 3, rowH - 3);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(80, 3); tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4;
  return tex;
}

/* ============================================================
   4. 便捷：把 map key 映射到纹理分支
   ============================================================ */
export function groundTexKeyFor(mapType) {
  return mapType === 'volcano' ? 'volcanic'
       : mapType === 'desert'  ? 'sand'
       : mapType === 'aquarium'? 'marble'
       : mapType === 'dream'   ? 'dream'
       : mapType === 'heaven'  ? 'heaven'
       : mapType === 'amusement'? 'amusement'
       : mapType === 'hell'    ? 'hell'
       : 'grass';
}
export function wallTexKeyFor(mapType) {
  return mapType === 'volcano' ? 'volcanic'
       : mapType === 'desert'  ? 'stone'
       : mapType === 'aquarium'? 'aquarium'
       : mapType === 'dream'   ? 'dream'
       : mapType === 'heaven'  ? 'heaven'
       : mapType === 'amusement'? 'amusement'
       : mapType === 'hell'    ? 'hell'
       : 'brick';
}
