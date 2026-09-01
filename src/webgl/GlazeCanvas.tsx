/**
 * GlazeCanvas —— 「釉色 · 器物」MatCap 3D 展示（纯手写 WebGL1，零依赖）
 *
 * 宋式斗笠盏旋成体：profile 控制点经 Catmull-Rom 样条加密后绕 Y 轴旋转，
 * 法线由 profile 切线旋转 90° 解析求得，侧影平滑无折痕。
 * 釉面为程序化烘焙的 256×256 matcap：暗部(明度≈35%) / 中间调(本色) /
 * 高光带(近白) + 左上锐利高光点 + 边缘 rim 提亮。换色时 400ms RAF
 * 逐帧重烘贴图，釉色渐变过渡而非瞬跳。
 */
import { useEffect, useRef, useState } from 'react';
import {
  createProgram,
  hexToRgb01,
  mat4LookAt,
  mat4Perspective,
  OrbitCamera,
  startLoop,
} from './glkit';

/* ---------- 斗笠盏 profile（r, y）：撇口、浅腹、小圈足 ---------- */
const PROFILE: [number, number][] = [
  [0.0, 0.0], // 底心（封闭圈足端面）
  [0.2, 0.0],
  [0.26, 0.015],
  [0.27, 0.06],
  [0.26, 0.11], // 圈足外壁
  [0.3, 0.15], // 足端起腹
  [0.42, 0.24],
  [0.58, 0.36],
  [0.76, 0.5],
  [0.94, 0.66],
  [1.1, 0.82],
  [1.2, 0.95],
  [1.26, 1.05], // 撇口外放
  [1.28, 1.1], // 口沿
  [1.24, 1.115], // 唇
  [1.16, 1.06], // 内壁下行，给出盏壁厚度
  [1.06, 0.96],
  [0.97, 0.85],
];

const RADIAL_SEGMENTS = 64;
const PROFILE_SUBDIV = 6; // 每段样条细分
const MATCAP_SIZE = 256;
const TRANSITION_MS = 400;

type V3 = [number, number, number];

/* ---------- 色彩工具 ---------- */

function rgbToHsl(r: number, g: number, b: number): V3 {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): V3 {
  if (s === 0) return [l, l, l];
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

function mix3(a: V3, b: V3, t: number): V3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function css(c: V3, alpha = 1): string {
  const r = Math.round(Math.min(1, Math.max(0, c[0])) * 255);
  const g = Math.round(Math.min(1, Math.max(0, c[1])) * 255);
  const b = Math.round(Math.min(1, Math.max(0, c[2])) * 255);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ---------- MatCap 烘焙：暗部 / 中间调 / 高光带 / 锐利高光点 / rim ---------- */

function bakeMatcap(ctx: CanvasRenderingContext2D, size: number, base: V3): void {
  const [h, s, l] = rgbToHsl(base[0], base[1], base[2]);
  const shadow = hslToRgb(h, Math.min(1, s * 1.05), Math.max(0.07, l * 0.35));
  const mid = base;
  const hi = mix3(base, [1, 1, 1], 0.85);
  const rim = mix3(base, [1, 1, 1], 0.6);
  const c = size / 2;
  const TAU = Math.PI * 2;

  // 底：暗部铺底
  ctx.fillStyle = css(shadow);
  ctx.fillRect(0, 0, size, size);

  // 球体主体：中间调 → 暗部的径向衰减
  let g = ctx.createRadialGradient(c, c, size * 0.08, c, c, c);
  g.addColorStop(0, css(mid));
  g.addColorStop(0.62, css(mix3(mid, shadow, 0.35)));
  g.addColorStop(0.9, css(mix3(mid, shadow, 0.8)));
  g.addColorStop(1, css(shadow));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, TAU);
  ctx.fill();

  // 大面积柔光（高光带，左上偏移）
  g = ctx.createRadialGradient(size * 0.44, size * 0.4, 0, size * 0.44, size * 0.4, size * 0.32);
  g.addColorStop(0, css(hi, 0.32));
  g.addColorStop(1, css(hi, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size * 0.44, size * 0.4, size * 0.32, 0, TAU);
  ctx.fill();

  // 锐利高光点（小半径白色 radialGradient，瓷釉的莹润来源）
  const sx = size * 0.36;
  const sy = size * 0.3;
  g = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 0.09);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, sy, size * 0.09, 0, TAU);
  ctx.fill();

  // 边缘一圈轻微 rim 提亮，收边处回落到暗部
  g = ctx.createRadialGradient(c, c, size * 0.36, c, c, c);
  g.addColorStop(0, css(rim, 0));
  g.addColorStop(0.82, css(rim, 0));
  g.addColorStop(0.95, css(rim, 0.32));
  g.addColorStop(1, css(shadow, 0.6));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, TAU);
  ctx.fill();
}

/* ---------- 几何：Catmull-Rom 加密 profile + 旋成体 ---------- */

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - 3 * p2 - p0 + p3) * t3)
  );
}

/** profile 控制点 → 样条加密折线（钳制端点） */
function sampleProfile(ctrl: [number, number][], subdiv: number): [number, number][] {
  const pts: [number, number][] = [];
  const at = (i: number): [number, number] =>
    ctrl[Math.min(ctrl.length - 1, Math.max(0, i))];
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

interface LatheGeometry {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
}

/** 旋成体：法线由 profile 切线旋转 90° 解析求得（指向外侧），再绕 Y 轴展开 */
function buildLathe(ctrl: [number, number][], segments: number): LatheGeometry {
  const prof = sampleProfile(ctrl, PROFILE_SUBDIV);
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

/* ---------- 着色器 ---------- */

const VS = `
attribute vec3 aPos;
attribute vec3 aNormal;
uniform mat4 uProj;
uniform mat4 uView;
varying vec3 vNormal;
void main() {
  vNormal = mat3(uView) * aNormal;
  gl_Position = uProj * uView * vec4(aPos, 1.0);
}
`;

const FS = `
precision mediump float;
varying vec3 vNormal;
uniform sampler2D uMatcap;
void main() {
  vec3 n = normalize(vNormal);
  vec2 uv = n.xy * 0.5 + 0.5;
  vec3 col = texture2D(uMatcap, uv).rgb;
  float fres = pow(1.0 - max(n.z, 0.0), 3.0);
  col += fres * 0.08;
  gl_FragColor = vec4(col, 1.0);
}
`;

/* ---------- 组件 ---------- */

interface Transition {
  from: V3;
  to: V3;
  cur: V3; // 上一帧实际显示的颜色，供过渡中再次换色时作新起点
  start: number; // performance.now() 时间戳，0 表示无过渡
}

export default function GlazeCanvas({ hex }: { hex: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const forceSettleRef = useRef<(() => void) | null>(null);
  const [failed, setFailed] = useState(false);
  const transitionRef = useRef<Transition>({
    from: hexToRgb01(hex),
    to: hexToRgb01(hex),
    cur: hexToRgb01(hex),
    start: 0,
  });

  // hex 变化：以当前显示色为起点登记过渡目标，插值与重烘在渲染循环里做
  useEffect(() => {
    const tr = transitionRef.current;
    tr.from = tr.cur;
    tr.to = hexToRgb01(hex);
    tr.start = performance.now();
    // reduced-motion 下 startLoop 只渲一帧，过渡不会推进，直接落定
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      forceSettleRef.current?.();
    }
  }, [hex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });
    if (!gl) {
      setFailed(true);
      return;
    }

    // 几何
    const geo = buildLathe(PROFILE, RADIAL_SEGMENTS);
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.STATIC_DRAW);
    const nrmBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf);
    gl.bufferData(gl.ARRAY_BUFFER, geo.normals, gl.STATIC_DRAW);
    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);

    // 程序
    const prog = createProgram(gl, VS, FS);
    gl.useProgram(prog);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    const aNormal = gl.getAttribLocation(prog, 'aNormal');
    const uProj = gl.getUniformLocation(prog, 'uProj');
    const uView = gl.getUniformLocation(prog, 'uView');
    const uMatcap = gl.getUniformLocation(prog, 'uMatcap');

    // matcap 贴图
    const mcCanvas = document.createElement('canvas');
    mcCanvas.width = MATCAP_SIZE;
    mcCanvas.height = MATCAP_SIZE;
    const mcCtx = mcCanvas.getContext('2d');
    if (!mcCtx) {
      setFailed(true);
      return;
    }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.uniform1i(uMatcap, 0);
    const upload = (rgb: V3) => {
      bakeMatcap(mcCtx, MATCAP_SIZE, rgb);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mcCanvas);
    };
    upload(transitionRef.current.to);

    // 相机：窄缩放范围，缓慢自转
    const camera = new OrbitCamera({
      theta: -0.7,
      phi: 1.18,
      radius: 2.6,
      target: [0, 0.53, 0],
      autoRotateSpeed: 0.3,
      minRadius: 2.4,
      maxRadius: 3.0,
      minPhi: 0.6,
      maxPhi: 1.45,
    });
    camera.attach(canvas);

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE); // 盏壁内外两侧都需可见

    const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const draw = (dt: number) => {
      // 换釉过渡：~400ms 内逐帧重烘 matcap 并 reupload，结束停烘
      const tr = transitionRef.current;
      if (tr.start > 0) {
        const p = Math.min(1, (performance.now() - tr.start) / TRANSITION_MS);
        tr.cur = mix3(tr.from, tr.to, easeInOut(p));
        upload(tr.cur);
        if (p >= 1) {
          tr.cur = tr.to;
          tr.from = tr.to;
          tr.start = 0;
        }
      }

      const eye = camera.update(dt);
      const w = canvas.width || 1;
      const h = canvas.height || 1;
      gl.clearColor(0, 0, 0, 0); // 透明底
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniformMatrix4fv(uProj, false, mat4Perspective((32 * Math.PI) / 180, w / h, 0.1, 20));
      gl.uniformMatrix4fv(uView, false, mat4LookAt(eye, camera.target));

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf);
      gl.enableVertexAttribArray(aNormal);
      gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.drawElements(gl.TRIANGLES, geo.indices.length, gl.UNSIGNED_SHORT, 0);
    };

    // 无动画环境：直接落定到目标釉色并补渲一帧
    forceSettleRef.current = () => {
      const tr = transitionRef.current;
      tr.cur = tr.to;
      tr.from = tr.to;
      tr.start = 0;
      upload(tr.to);
      draw(0);
    };

    const loop = startLoop(canvas, gl, draw);

    return () => {
      loop.stop();
      camera.detach();
      forceSettleRef.current = null;
      gl.deleteBuffer(posBuf);
      gl.deleteBuffer(nrmBuf);
      gl.deleteBuffer(idxBuf);
      gl.deleteTexture(tex);
      gl.deleteProgram(prog);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  if (failed) {
    return <div className="glaze-loading">当前环境暂不支持器物展示</div>;
  }
  return (
    <div className="glaze-stage">
      <canvas ref={canvasRef} className="glaze-canvas" aria-label="釉色器物 3D 展示" />
    </div>
  );
}
