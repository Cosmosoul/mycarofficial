/* ============================================================
   systems/spatial.js —— 空间哈希
   用于敌人查询：子弹命中、分离力、AoE、连锁等
   ============================================================ */

export class SpatialHash {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  clear() {
    this.cells.clear();
  }

  hash(x, z) {
    return ((x / this.cellSize) | 0) + ',' + ((z / this.cellSize) | 0);
  }

  insert(obj, x, z) {
    const k = this.hash(x, z);
    let cell = this.cells.get(k);
    if (!cell) { cell = []; this.cells.set(k, cell); }
    cell.push(obj);
  }

  /**
   * 查询以 (x,z) 为中心、radius 半径内的所有对象。
   * 结果写入 out 数组（会先清空 out），并返回 out。
   *
   * ⚠️ out 由调用方提供，避免每次分配新数组。
   *    但要注意：**不要在嵌套查询里复用同一个 out**（会相互覆盖）。
   *    系统层为每种用途分别准备独立数组。
   */
  query(x, z, radius, out) {
    out.length = 0;
    const r = Math.ceil(radius / this.cellSize);
    const cx = (x / this.cellSize) | 0;
    const cz = (z / this.cellSize) | 0;
    for (let i = -r; i <= r; i++) {
      for (let j = -r; j <= r; j++) {
        const cell = this.cells.get((cx + i) + ',' + (cz + j));
        if (cell) for (const o of cell) out.push(o);
      }
    }
    return out;
  }
}

/* 全局敌人哈希（由 gameplay 层每帧重建） */
export const enemyHash = new SpatialHash(6);

/* 通用查询结果缓冲（默认用途，谨慎嵌套使用） */
export const queryOut = [];

/* 分离力专用缓冲，避免与命中查询互相覆盖 */
export const sepOut = [];