/**
 * SpaceCanvas —— 色彩星图 3D 漫游（纯手写 WebGL1，零 3D 库）
 *
 * 空间映射：x = C·cos(H)、z = C·sin(H)、y = L（OKLCH 柱坐标展开）。
 * 内容：537 色点云（gl.POINTS，距离衰减点径 + 圆点软边）、
 * sRGB 色域线框壳（引擎 Cmax(L,H) 包络采样，gl.LINES）、淡明度中轴。
 * 相机/循环/拾取全部复用 glkit；hover 拾取在 JS 侧做 VP 投影（537 次/次事件）。
 */
import { useEffect, useRef, useState } from 'react';
import { converter, maxChroma } from 'shise-engine';
import type { Oklch } from 'shise-engine';
import type { ColorEntry } from '../types';
import {
  createProgram,
  cssColor,
  hexToRgb01,
  mat4LookAt,
  mat4Multiply,
  mat4Perspective,
  OrbitCamera,
  startLoop,
} from '../webgl/glkit';
import type { Mat4 } from '../webgl/glkit';

const RS = 2.2; // 彩度 → 半径缩放
const LS = 1.7; // 明度 → 高度缩放（L∈[0,1] → y∈[-0.85,0.85]）
const FOV = (42 * Math.PI) / 180;
const PICK_RADIUS = 14; // hover 拾取半径（px）

const toOklch = converter('oklch');

const POINT_VS = `
attribute vec3 aPos;
attribute vec3 aColor;
uniform mat4 uVP;
uniform float uBase;
uniform float uDpr;
varying vec3 vColor;
void main() {
  vColor = aColor;
  vec4 clip = uVP * vec4(aPos, 1.0);
  gl_Position = clip;
  gl_PointSize = clamp(uBase / max(clip.w, 0.1), 3.0 * uDpr, 44.0 * uDpr);
}`;

const POINT_FS = `
precision mediump float;
varying vec3 vColor;
void main() {
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5) discard;
  float a = smoothstep(0.5, 0.36, r);
  gl_FragColor = vec4(vColor, a);
}`;

const LINE_VS = `
attribute vec3 aPos;
uniform mat4 uVP;
void main() {
  gl_Position = uVP * vec4(aPos, 1.0);
}`;

const LINE_FS = `
precision mediump float;
uniform vec4 uColor;
void main() {
  gl_FragColor = uColor;
}`;

interface Hover {
  entry: ColorEntry;
  x: number;
  y: number;
}

interface Props {
  colors: ColorEntry[];
  onPickColor: (c: ColorEntry) => void;
}

export default function SpaceCanvas({ colors, onPickColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [failed, setFailed] = useState(false);
  const pickRef = useRef(onPickColor);
  pickRef.current = onPickColor;

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

    // ---- 点云数据：位置 + 颜色 ----
    const n = colors.length;
    const pts = new Float32Array(n * 3);
    const cols = new Float32Array(n * 3);
    colors.forEach((entry, i) => {
      const ok = toOklch(entry.hex) as Oklch;
      const rad = ((ok.h ?? 0) * Math.PI) / 180;
      pts[i * 3] = ok.c * RS * Math.cos(rad);
      pts[i * 3 + 1] = (ok.l - 0.5) * LS;
      pts[i * 3 + 2] = ok.c * RS * Math.sin(rad);
      cols.set(hexToRgb01(entry.hex), i * 3);
    });

    // ---- sRGB 色域壳：maxChroma(l,h) 采样网格 → 线框 ----
    const HN = 60; // h: 0~354° 步长 6°
    const LN = 49; // l: 0.02~0.98 步长 0.02
    const grid = new Float32Array(HN * LN * 3).fill(NaN);
    const gi = (i: number, j: number) => (i * LN + j) * 3;
    for (let i = 0; i < HN; i++) {
      const rad = ((i * 6) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      for (let j = 0; j < LN; j++) {
        const l = 0.02 + j * 0.02;
        const c = maxChroma(l, i * 6);
        if (c > 0.0005) {
          grid.set([c * RS * cos, (l - 0.5) * LS, c * RS * sin], gi(i, j));
        }
      }
    }
    const shell: number[] = [];
    const valid = (i: number, j: number) => !Number.isNaN(grid[gi(i, j)]);
    const pushPt = (i: number, j: number) => {
      const k = gi(i, j);
      shell.push(grid[k], grid[k + 1], grid[k + 2]);
    };
    // 每条 h 列一条纵向线
    for (let i = 0; i < HN; i++) {
      for (let j = 0; j < LN - 1; j++) {
        if (valid(i, j) && valid(i, j + 1)) {
          pushPt(i, j);
          pushPt(i, j + 1);
        }
      }
    }
    // 纬度环：每 4 行一圈（ΔL=0.08），首尾相接
    for (let j = 0; j < LN; j += 4) {
      for (let i = 0; i < HN; i++) {
        const i2 = (i + 1) % HN;
        if (valid(i, j) && valid(i2, j)) {
          pushPt(i, j);
          pushPt(i2, j);
        }
      }
    }
    const shellArr = new Float32Array(shell);
    // 明度中轴：L 从 0 到 1 的竖线
    const axisArr = new Float32Array([0, -0.5 * LS, 0, 0, 0.5 * LS, 0]);

    // ---- GL 资源 ----
    const ptProg = createProgram(gl, POINT_VS, POINT_FS);
    const lnProg = createProgram(gl, LINE_VS, LINE_FS);
    const mkBuf = (arr: Float32Array) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
      return b;
    };
    const buffers = [mkBuf(pts), mkBuf(cols), mkBuf(shellArr), mkBuf(axisArr)];
    const [posBuf, colBuf, shellBuf, axisBuf] = buffers;

    const ptLoc = {
      pos: gl.getAttribLocation(ptProg, 'aPos'),
      color: gl.getAttribLocation(ptProg, 'aColor'),
      vp: gl.getUniformLocation(ptProg, 'uVP'),
      base: gl.getUniformLocation(ptProg, 'uBase'),
      dpr: gl.getUniformLocation(ptProg, 'uDpr'),
    };
    const lnLoc = {
      pos: gl.getAttribLocation(lnProg, 'aPos'),
      vp: gl.getUniformLocation(lnProg, 'uVP'),
      color: gl.getUniformLocation(lnProg, 'uColor'),
    };

    // ---- 相机与循环 ----
    const camera = new OrbitCamera({
      theta: -0.8,
      phi: 1.0, // 斜上方 3/4 视角
      radius: 2.7,
      autoRotateSpeed: 0.1,
      minRadius: 1.5,
      maxRadius: 5,
    });
    camera.attach(canvas);

    const shellRGB = cssColor('--td-text-color-placeholder', [0.6, 0.6, 0.6]);
    let vp: Mat4 = mat4Perspective(FOV, 1, 0.1, 20);
    let hoverIdx = -1;

    /** 把第 i 个点投到 canvas CSS 像素坐标 */
    const project = (i: number): [number, number] | null => {
      const x = pts[i * 3];
      const y = pts[i * 3 + 1];
      const z = pts[i * 3 + 2];
      const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
      const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
      const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
      if (cw <= 0) return null;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      return [((cx / cw) * 0.5 + 0.5) * w, (1 - (cy / cw * 0.5 + 0.5)) * h];
    };

    const loop = startLoop(canvas, gl, (dt) => {
      const eye = camera.update(dt);
      vp = mat4Multiply(
        mat4Perspective(FOV, canvas.width / Math.max(1, canvas.height), 0.1, 20),
        mat4LookAt(eye, camera.target),
      );

      gl.clearColor(0, 0, 0, 0); // 透明底
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(false); // 透明物体不写深度，避免硬边互挡

      // 线框壳 + 中轴
      gl.useProgram(lnProg);
      gl.uniformMatrix4fv(lnLoc.vp, false, vp);
      gl.enableVertexAttribArray(lnLoc.pos);
      gl.bindBuffer(gl.ARRAY_BUFFER, shellBuf);
      gl.vertexAttribPointer(lnLoc.pos, 3, gl.FLOAT, false, 0, 0);
      gl.uniform4f(lnLoc.color, shellRGB[0], shellRGB[1], shellRGB[2], 0.35);
      gl.drawArrays(gl.LINES, 0, shellArr.length / 3);
      gl.bindBuffer(gl.ARRAY_BUFFER, axisBuf);
      gl.vertexAttribPointer(lnLoc.pos, 3, gl.FLOAT, false, 0, 0);
      gl.uniform4f(lnLoc.color, shellRGB[0], shellRGB[1], shellRGB[2], 0.55);
      gl.drawArrays(gl.LINES, 0, 2);
      gl.disableVertexAttribArray(lnLoc.pos);

      // 点云
      gl.useProgram(ptProg);
      gl.uniformMatrix4fv(ptLoc.vp, false, vp);
      gl.uniform1f(ptLoc.base, canvas.height * 0.03);
      gl.uniform1f(ptLoc.dpr, Math.min(window.devicePixelRatio || 1, 2));
      gl.enableVertexAttribArray(ptLoc.pos);
      gl.enableVertexAttribArray(ptLoc.color);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.vertexAttribPointer(ptLoc.pos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
      gl.vertexAttribPointer(ptLoc.color, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, n);
      gl.disableVertexAttribArray(ptLoc.pos);
      gl.disableVertexAttribArray(ptLoc.color);

      // 自转时 tooltip 跟随已悬停的点（仅像素变化时更新 state）
      if (hoverIdx >= 0) {
        const s = project(hoverIdx);
        if (s) {
          const entry = colors[hoverIdx];
          setHover((prev) =>
            prev && Math.round(prev.x) === Math.round(s[0]) && Math.round(prev.y) === Math.round(s[1])
              ? prev
              : { entry, x: s[0], y: s[1] },
          );
        }
      }
    });

    // ---- hover 拾取与点击 ----
    let downX = 0;
    let downY = 0;
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let best = -1;
      let bestD = PICK_RADIUS;
      for (let i = 0; i < n; i++) {
        const s = project(i);
        if (!s) continue;
        const d = Math.hypot(s[0] - mx, s[1] - my);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best !== hoverIdx) {
        hoverIdx = best;
        if (best < 0) {
          setHover(null);
        } else {
          const s = project(best);
          if (s) setHover({ entry: colors[best], x: s[0], y: s[1] });
        }
      }
      canvas.style.cursor = best >= 0 ? 'pointer' : '';
    };
    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onClick = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return; // 拖拽不算点击
      if (hoverIdx >= 0) pickRef.current(colors[hoverIdx]);
    };
    const onLeave = () => {
      hoverIdx = -1;
      setHover(null);
      canvas.style.cursor = '';
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('pointerleave', onLeave);

    return () => {
      loop.stop();
      camera.detach();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('pointerleave', onLeave);
      buffers.forEach((b) => gl.deleteBuffer(b));
      gl.deleteProgram(ptProg);
      gl.deleteProgram(lnProg);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [colors]);

  if (failed) {
    return (
      <div className="starmap-space starmap-space-loading">
        <span>此设备暂不支持 3D 星图</span>
      </div>
    );
  }

  return (
    <div className="starmap-space">
      <canvas ref={canvasRef} className="starmap-space-canvas" />
      {hover && (
        <div className="starmap-tooltip" style={{ left: hover.x + 16, top: hover.y + 16 }}>
          <span className="starmap-tooltip-chip" style={{ backgroundColor: hover.entry.hex }} />
          <div className="starmap-tooltip-body">
            <p className="starmap-tooltip-name">
              {hover.entry.name}
              <em className="font-mono">{hover.entry.hex.toUpperCase()}</em>
            </p>
            {hover.entry.poem && (
              <p className="starmap-tooltip-poem">
                {hover.entry.poem}
                {hover.entry.poemSource && <i>—— {hover.entry.poemSource}</i>}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
