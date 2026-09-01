/**
 * lathe —— 旋成体几何生成（纯手写，零依赖）
 *
 * 器物 profile 控制点 (r, y) 经 Catmull-Rom 样条加密后绕 Y 轴旋转展开，
 * 法线由 profile 切线旋转 90° 解析求得，侧影平滑无折痕。
 * GlazeCanvas（抽屉单件）与 VesselScene（器物馆多实例）共用。
 */

export interface LatheGeometry {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
}

const PROFILE_SUBDIV = 6; // 每段样条细分

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - 3 * p2 - p0 + p3) * t3)
  );
}

/** profile 控制点 → 样条加密折线（钳制端点） */
export function sampleProfile(ctrl: [number, number][], subdiv = PROFILE_SUBDIV): [number, number][] {
  const pts: [number, number][] = [];
  const at = (i: number): [number, number] => ctrl[Math.min(ctrl.length - 1, Math.max(0, i))];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let k = 0; k < subdiv; k++) {
      const t = k / subdiv;
      pts.push([
        Math.max(0, catmull(p0[0], p1[0], p2[0], p3[0], t)),
        catmull(p0[1], p1[1], p2[1], p3[1], t),
      ]);
    }
  }
  pts.push([...ctrl[ctrl.length - 1]]);
  return pts;
}

/** 旋成体：法线由 profile 切线旋转 90° 解析求得（指向外侧），再绕 Y 轴展开 */
export function buildLathe(ctrl: [number, number][], segments: number): LatheGeometry {
  const prof = sampleProfile(ctrl);
  const P = prof.length;
  const positions = new Float32Array(P * segments * 3);
  const normals = new Float32Array(P * segments * 3);

  // profile 各点 (r, y) 与解析法线 (nr, ny) = normalize(ty, -tx)
  const nr = new Float32Array(P);
  const ny = new Float32Array(P);
  for (let i = 0; i < P; i++) {
    const prev = prof[Math.max(0, i - 1)];
    const next = prof[Math.min(P - 1, i + 1)];
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const len = Math.hypot(tx, ty) || 1;
    nr[i] = ty / len;
    ny[i] = -tx / len;
  }

  for (let i = 0; i < P; i++) {
    const [r, y] = prof[i];
    for (let j = 0; j < segments; j++) {
      const th = (j / segments) * Math.PI * 2;
      const cos = Math.cos(th);
      const sin = Math.sin(th);
      const o = (i * segments + j) * 3;
      positions[o] = r * cos;
      positions[o + 1] = y;
      positions[o + 2] = r * sin;
      normals[o] = nr[i] * cos;
      normals[o + 1] = ny[i];
      normals[o + 2] = nr[i] * sin;
    }
  }

  const indices = new Uint16Array((P - 1) * segments * 6);
  let k = 0;
  for (let i = 0; i < P - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const j2 = (j + 1) % segments;
      const a = i * segments + j;
      const b = i * segments + j2;
      const c = (i + 1) * segments + j;
      const d = (i + 1) * segments + j2;
      indices[k++] = a;
      indices[k++] = b;
      indices[k++] = c;
      indices[k++] = b;
      indices[k++] = d;
      indices[k++] = c;
    }
  }
  return { positions, normals, indices };
}
