/**
 * glkit —— 极简 WebGL 工具集（零依赖，WebGL1 兼容）
 *
 * 为「拾色 · 东方」的两个 3D 特性服务：星图 3D 漫游（点云+线框）与釉色器物（MatCap）。
 * 只提供两个场景共同需要的最小集合：mat4、着色器编译、轨道相机、渲染循环。
 */

export type Mat4 = Float32Array;

export function mat4Identity(): Mat4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  }
  return o;
}

export function mat4Perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}

export function mat4RotateY(rad: number): Mat4 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const m = mat4Identity();
  m[0] = c;
  m[2] = s;
  m[8] = -s;
  m[10] = c;
  return m;
}

/** 相机观察矩阵（eye 绕原点，看向 target，上方向恒为 +Y） */
export function mat4LookAt(eye: [number, number, number], target: [number, number, number]): Mat4 {
  const zx = eye[0] - target[0];
  const zy = eye[1] - target[1];
  const zz = eye[2] - target[2];
  const zl = Math.hypot(zx, zy, zz) || 1;
  const z: [number, number, number] = [zx / zl, zy / zl, zz / zl];
  // x = normalize(cross(up, z))
  const xl = Math.hypot(z[2], z[0]) || 1;
  const x: [number, number, number] = [z[2] / xl, 0, -z[0] / xl];
  // y = cross(z, x)
  const y: [number, number, number] = [
    z[1] * x[2] - z[2] * x[1],
    z[2] * x[0] - z[0] * x[2],
    z[0] * x[1] - z[1] * x[0],
  ];
  const m = mat4Identity();
  m[0] = x[0]; m[4] = x[1]; m[8] = x[2];
  m[1] = y[0]; m[5] = y[1]; m[9] = y[2];
  m[2] = z[0]; m[6] = z[1]; m[10] = z[2];
  m[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
  m[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
  m[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
  return m;
}

/** 编译 + 链接着色器程序，失败抛错带日志 */
export function createProgram(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string): WebGLProgram {
  const compile = (type: number, src: string): WebGLShader => {
    const sh = gl.createShader(type);
    if (!sh) throw new Error('createShader failed');
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(`shader compile: ${gl.getShaderInfoLog(sh) ?? ''}`);
    }
    return sh;
  };
  const prog = gl.createProgram();
  if (!prog) throw new Error('createProgram failed');
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(`program link: ${gl.getProgramInfoLog(prog) ?? ''}`);
  }
  return prog;
}

export interface OrbitOptions {
  /** 初始方位角/极角/半径与目标点 */
  theta?: number;
  phi?: number;
  radius?: number;
  target?: [number, number, number];
  autoRotateSpeed?: number; // 弧度/秒，0 关闭
  zoomable?: boolean;
  minRadius?: number;
  maxRadius?: number;
  minPhi?: number;
  maxPhi?: number;
}

/**
 * 轨道相机：拖拽旋转（带阻尼）、可选滚轮缩放、缓慢自转。
 * 每帧调 update(dt) 取 eye 坐标；attach/detach 管理指针事件。
 */
export class OrbitCamera {
  theta: number;
  phi: number;
  radius: number;
  target: [number, number, number];
  private tTheta: number;
  private tPhi: number;
  private tRadius: number;
  private opts: Required<OrbitOptions>;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private el: HTMLElement | null = null;
  private disposers: (() => void)[] = [];

  constructor(opts: OrbitOptions = {}) {
    this.opts = {
      theta: opts.theta ?? -0.6,
      phi: opts.phi ?? 1.1,
      radius: opts.radius ?? 2.2,
      target: opts.target ?? [0, 0, 0],
      autoRotateSpeed: opts.autoRotateSpeed ?? 0.12,
      zoomable: opts.zoomable ?? true,
      minRadius: opts.minRadius ?? 1.2,
      maxRadius: opts.maxRadius ?? 5,
      minPhi: opts.minPhi ?? 0.15,
      maxPhi: opts.maxPhi ?? Math.PI - 0.15,
    };
    this.theta = this.tTheta = this.opts.theta;
    this.phi = this.tPhi = this.opts.phi;
    this.radius = this.tRadius = this.opts.radius;
    this.target = [...this.opts.target];
  }

  attach(el: HTMLElement): void {
    this.el = el;
    const onDown = (e: PointerEvent) => {
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.tTheta -= dx * 0.005;
      this.tPhi = clamp(this.tPhi - dy * 0.005, this.opts.minPhi, this.opts.maxPhi);
    };
    const onUp = () => {
      this.dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (!this.opts.zoomable) return;
      e.preventDefault();
      this.tRadius = clamp(
        this.tRadius * (1 + Math.sign(e.deltaY) * 0.08),
        this.opts.minRadius,
        this.opts.maxRadius,
      );
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    this.disposers = [
      () => el.removeEventListener('pointerdown', onDown),
      () => el.removeEventListener('pointermove', onMove),
      () => el.removeEventListener('pointerup', onUp),
      () => el.removeEventListener('pointercancel', onUp),
      () => el.removeEventListener('wheel', onWheel),
    ];
  }

  /** dt 单位秒；返回相机 eye 坐标 */
  update(dt: number): [number, number, number] {
    if (!this.dragging && this.opts.autoRotateSpeed) this.tTheta += this.opts.autoRotateSpeed * dt;
    const k = 1 - Math.pow(0.001, dt); // 指数阻尼
    this.theta += (this.tTheta - this.theta) * k;
    this.phi += (this.tPhi - this.phi) * k;
    this.radius += (this.tRadius - this.radius) * k;
    const sp = Math.sin(this.phi);
    return [
      this.target[0] + this.radius * sp * Math.cos(this.theta),
      this.target[1] + this.radius * Math.cos(this.phi),
      this.target[2] + this.radius * sp * Math.sin(this.theta),
    ];
  }

  detach(): void {
    this.disposers.forEach((d) => d());
    this.disposers = [];
    this.el = null;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export interface LoopHandle {
  stop: () => void;
}

/**
 * 渲染循环：自动处理 canvas 尺寸/DPR、离屏暂停（IntersectionObserver）、
 * reduced-motion（仅渲一帧）。frame(dt) 返回 false 可跳过一次绘制。
 */
export function startLoop(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext,
  frame: (dt: number) => void,
): LoopHandle {
  let raf = 0;
  let running = true;
  let visible = true;
  let last = performance.now();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };
  const ro = new ResizeObserver(() => {
    resize();
    if (reduced) frame(0);
  });
  ro.observe(canvas);

  const io = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
  });
  io.observe(canvas);

  const tick = (now: number) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (visible) frame(dt);
    raf = requestAnimationFrame(tick);
  };

  resize();
  if (reduced) {
    frame(0); // reduced-motion：只渲一帧静态画面
  } else {
    raf = requestAnimationFrame(tick);
  }

  return {
    stop: () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    },
  };
}

/** 取 TDesign token 的当前计算色（rgb 分量 0-1），主题切换后重建场景时调用 */
export function cssColor(name: string, fallback: [number, number, number]): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = raw.match(/#([0-9a-f]{6})/i);
  if (m) {
    const v = parseInt(m[1], 16);
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  }
  return fallback;
}

export function hexToRgb01(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}
