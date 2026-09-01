/**
 * GlazeCanvas —— 「釉色 · 器物」MatCap 3D 展示（纯手写 WebGL1，零依赖）
 *
 * 宋式斗笠盏旋成体（几何见 lathe.ts，器形数据见 vesselProfiles.ts），
 * 釉面为程序化烘焙的 256×256 matcap（见 matcap.ts）。换色时 400ms RAF
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
import { buildLathe } from './lathe';
import { bakeMatcap, mix3, type V3 } from './matcap';
import { VESSELS } from './vesselProfiles';

const PROFILE = VESSELS[0].profile; // 斗笠盏
const RADIAL_SEGMENTS = 64;
const MATCAP_SIZE = 256;
const TRANSITION_MS = 400;

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
