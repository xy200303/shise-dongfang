/**
 * VesselScene —— 「器物馆」多实例 MatCap 场景（纯手写 WebGL1，零依赖）
 *
 * 一个 canvas 渲染 1~10 件同款器物：
 *  - 单器模式：居中一件，轨道相机缓慢自转，可拖拽/缩放；
 *  - 色阶阵列：十件一字排开分别染上色阶 1-10，器体缓速自旋展示釉面光影。
 * 换色时各实例 matcap 逐帧重烘，釉色 400ms 渐变过渡（见 matcap.ts）。
 */
import { useEffect, useRef, useState } from 'react';
import {
  createProgram,
  hexToRgb01,
  mat4LookAt,
  mat4Multiply,
  mat4Perspective,
  mat4RotateY,
  mat4Translation,
  mat4UniformScale,
  OrbitCamera,
  startLoop,
} from './glkit';
import { buildLathe, type LatheGeometry } from './lathe';
import { bakeMatcap, mix3, type V3 } from './matcap';

const RADIAL_SEGMENTS = 64;
const MATCAP_SIZE = 256;
const TRANSITION_MS = 400;
const MAX_INSTANCES = 10;

const VS = `
attribute vec3 aPos;
attribute vec3 aNormal;
uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;
varying vec3 vNormal;
void main() {
  vNormal = mat3(uView * uModel) * aNormal;
  gl_Position = uProj * uView * uModel * vec4(aPos, 1.0);
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

interface SlotTransition {
  from: V3;
  to: V3;
  cur: V3;
  start: number; // 0 = 无过渡
  active: boolean;
}

/** 归一化：最宽维度 ≈ 2.0，高度随器形自然变化，跨器形视觉体量一致 */
function normalize(profile: [number, number][]): { scale: number; height: number } {
  let maxY = 0;
  let maxR = 0;
  for (const [r, y] of profile) {
    if (y > maxY) maxY = y;
    if (r > maxR) maxR = r;
  }
  const scale = 1.6 / Math.max(maxY, maxR * 1.6);
  return { scale, height: maxY * scale };
}

export interface VesselSceneProps {
  profile: [number, number][];
  /** 单器 1 色 / 色阶阵列 10 色 */
  colors: string[];
  arrayMode: boolean;
}

export default function VesselScene({ profile, colors, arrayMode }: VesselSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  const cameraRef = useRef<OrbitCamera | null>(null);
  const slotsRef = useRef<SlotTransition[]>(
    Array.from({ length: MAX_INSTANCES }, () => ({
      from: [0, 0, 0] as V3,
      to: [0, 0, 0] as V3,
      cur: [0, 0, 0] as V3,
      start: 0,
      active: false,
    })),
  );
  const uploadRef = useRef<((i: number, rgb: V3) => void) | null>(null);
  const drawRef = useRef<((dt: number) => void) | null>(null);
  const geoRef = useRef<{ current: LatheGeometry | null }>({ current: null });
  const rebuildGeoRef = useRef<(() => void) | null>(null);
  const normRef = useRef(normalize(profile));
  const spinRef = useRef(0);
  // 渲染循环闭包只创建一次，最新 props 经 ref 透传
  const colorsRef = useRef(colors);
  const arrayModeRef = useRef(arrayMode);
  const profileRef = useRef(profile);
  colorsRef.current = colors;
  arrayModeRef.current = arrayMode;
  profileRef.current = profile;

  // 换釉：登记各实例过渡目标（以当前显示色为起点，支持过渡中再换色）
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const slots = slotsRef.current;
    for (let i = 0; i < MAX_INSTANCES; i++) {
      const hex = colors[i];
      const slot = slots[i];
      if (!hex) {
        slot.active = false;
        continue;
      }
      const to = hexToRgb01(hex);
      if (!slot.active) {
        slot.cur = to;
        slot.from = to;
        slot.to = to;
        slot.start = 0;
        slot.active = true;
        uploadRef.current?.(i, to);
      } else {
        slot.from = slot.cur;
        slot.to = to;
        slot.start = performance.now();
      }
    }
    if (reduced) {
      for (let i = 0; i < MAX_INSTANCES; i++) {
        const slot = slots[i];
        if (!slot.active) continue;
        slot.cur = slot.to;
        slot.from = slot.to;
        slot.start = 0;
        uploadRef.current?.(i, slot.to);
      }
      drawRef.current?.(0);
    }
  }, [colors]);

  // 换器形：重建几何 + 归一化参数，并按模式调整相机
  useEffect(() => {
    normRef.current = normalize(profile);
    rebuildGeoRef.current?.();
    const cam = cameraRef.current;
    if (cam) {
      if (arrayMode) {
        cam.configure({ minRadius: 8, maxRadius: 18, autoRotateSpeed: 0 });
        // 阵列沿 x 轴铺开，相机正对（θ=90°）才能尽收十件
        cam.aim({ theta: Math.PI / 2, phi: 1.22, radius: 15 });
      } else {
        cam.configure({ minRadius: 2.0, maxRadius: 5, autoRotateSpeed: 0.25 });
        cam.aim({ theta: -0.7, phi: 1.15, radius: 3.0 });
      }
    }
    drawRef.current?.(0);
  }, [profile, arrayMode]);

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

    const prog = createProgram(gl, VS, FS);
    gl.useProgram(prog);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    const aNormal = gl.getAttribLocation(prog, 'aNormal');
    const uProj = gl.getUniformLocation(prog, 'uProj');
    const uView = gl.getUniformLocation(prog, 'uView');
    const uModel = gl.getUniformLocation(prog, 'uModel');
    const uMatcap = gl.getUniformLocation(prog, 'uMatcap');
    gl.uniform1i(uMatcap, 0);

    // 几何缓冲（换器形时重建）
    let posBuf: WebGLBuffer | null = null;
    let nrmBuf: WebGLBuffer | null = null;
    let idxBuf: WebGLBuffer | null = null;
    const rebuildGeo = () => {
      const geo = buildLathe(profileRef.current, RADIAL_SEGMENTS);
      geoRef.current.current = geo;
      if (posBuf) gl.deleteBuffer(posBuf);
      if (nrmBuf) gl.deleteBuffer(nrmBuf);
      if (idxBuf) gl.deleteBuffer(idxBuf);
      posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.STATIC_DRAW);
      nrmBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf);
      gl.bufferData(gl.ARRAY_BUFFER, geo.normals, gl.STATIC_DRAW);
      idxBuf = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);
    };
    rebuildGeoRef.current = rebuildGeo;
    rebuildGeo();

    // matcap 贴图槽位（最多 10 件）
    const mcCanvas = document.createElement('canvas');
    mcCanvas.width = MATCAP_SIZE;
    mcCanvas.height = MATCAP_SIZE;
    const mcCtx = mcCanvas.getContext('2d');
    if (!mcCtx) {
      setFailed(true);
      return;
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    const textures = Array.from({ length: MAX_INSTANCES }, () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    });
    uploadRef.current = (i, rgb) => {
      bakeMatcap(mcCtx, MATCAP_SIZE, rgb);
      gl.bindTexture(gl.TEXTURE_2D, textures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mcCanvas);
    };
    // 初始釉色直接落定
    slotsRef.current.forEach((slot, i) => {
      if (slot.active) uploadRef.current?.(i, slot.cur);
    });

    const camera = new OrbitCamera({
      theta: -0.7,
      phi: 1.15,
      radius: 3.0,
      target: [0, normRef.current.height * 0.5, 0],
      autoRotateSpeed: 0.25,
      minRadius: 2.0,
      maxRadius: 5,
      minPhi: 0.5,
      maxPhi: 1.5,
    });
    camera.attach(canvas);
    cameraRef.current = camera;

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE); // 器壁内外两侧都需可见

    const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const draw = (dt: number) => {
      const geo = geoRef.current.current;
      if (!geo) return;
      const slots = slotsRef.current;

      // 换釉过渡：~400ms 内逐帧重烘各实例 matcap
      for (let i = 0; i < MAX_INSTANCES; i++) {
        const slot = slots[i];
        if (!slot.active || slot.start <= 0) continue;
        const p = Math.min(1, (performance.now() - slot.start) / TRANSITION_MS);
        slot.cur = mix3(slot.from, slot.to, easeInOut(p));
        uploadRef.current?.(i, slot.cur);
        if (p >= 1) {
          slot.cur = slot.to;
          slot.from = slot.to;
          slot.start = 0;
        }
      }

      // 阵列模式下器体缓速自旋，展示釉面光影流转
      const isArray = arrayModeRef.current;
      spinRef.current += dt * (isArray ? 0.25 : 0);
      // 器形切换时目标点高度平滑跟随
      const targetY = normRef.current.height * 0.5;
      camera.target[1] += (targetY - camera.target[1]) * Math.min(1, dt * 6);

      const eye = camera.update(dt);
      const w = canvas.width || 1;
      const h = canvas.height || 1;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniformMatrix4fv(uProj, false, mat4Perspective((32 * Math.PI) / 180, w / h, 0.1, 40));
      gl.uniformMatrix4fv(uView, false, mat4LookAt(eye, camera.target));

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf);
      gl.enableVertexAttribArray(aNormal);
      gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);

      const { scale } = normRef.current;
      const sceneColors = colorsRef.current;
      const n = sceneColors.length;
      const spacing = 2.0;
      const spin = mat4RotateY(spinRef.current);
      const scl = mat4UniformScale(scale);
      const local = mat4Multiply(spin, scl);

      for (let i = 0; i < n; i++) {
        if (!slots[i].active) continue;
        const x = isArray ? (i - (n - 1) / 2) * spacing : 0;
        const model = mat4Multiply(mat4Translation(x, 0, 0), local);
        gl.uniformMatrix4fv(uModel, false, model);
        gl.bindTexture(gl.TEXTURE_2D, textures[i]);
        gl.drawElements(gl.TRIANGLES, geo.indices.length, gl.UNSIGNED_SHORT, 0);
      }
    };
    drawRef.current = draw;

    const loop = startLoop(canvas, gl, draw);

    return () => {
      loop.stop();
      camera.detach();
      cameraRef.current = null;
      drawRef.current = null;
      uploadRef.current = null;
      rebuildGeoRef.current = null;
      if (posBuf) gl.deleteBuffer(posBuf);
      if (nrmBuf) gl.deleteBuffer(nrmBuf);
      if (idxBuf) gl.deleteBuffer(idxBuf);
      textures.forEach((t) => gl.deleteTexture(t));
      gl.deleteProgram(prog);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // 场景生命周期只随组件挂载；器形/颜色变化走各自 effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return <div className="vessels-failed">当前环境暂不支持器物展示</div>;
  }
  return (
    <canvas
      ref={canvasRef}
      className="vessels-canvas"
      aria-label={arrayMode ? '色阶阵列 3D 展示' : '器物 3D 展示'}
    />
  );
}
