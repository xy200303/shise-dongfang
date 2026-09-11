/**
 * fitting/stage —— 试穿间与 3D 物件共用的 WebGL 舞台
 *
 * three 在此统一动态 import（不进首屏 bundle）。提供：
 * 透明底渲染（ACES、PMREM 环境光、主方向光）、轨道相机（禁平移/限距离）、
 * 三态场景（宣纸透底 / 墨夜渐变天幕+地板倒影 / 月庭蓝调雾+圆月背光）、
 * 翻面克隆倒影位、径向渐变地影、每帧 onTick 回调、2x 导出 capture、
 * ResizeObserver 自适应、彻底 dispose（外部资源走 onDispose 钩子）。
 */

export type SceneId = 'paper' | 'night' | 'moon';

export interface Stage {
  THREE: typeof import('three');
  scene: import('three').Scene;
  camera: import('three').PerspectiveCamera;
  renderer: import('three').WebGLRenderer;
  controls: import('three/examples/jsm/controls/OrbitControls.js').OrbitControls;
  /** 每帧回调（mixer.update / 自转等），由使用方赋值 */
  onTick: ((dt: number) => void) | null;
  /** 外部资源释放钩子（几何/纹理/材质），在舞台自身资源之前调用 */
  onDispose: (() => void) | null;
  /** 依模型包围盒布置地影/地板/圆月，并设定相机取景与倒影基准面 */
  frame(box: import('three').Box3): void;
  /** 登记翻面倒影根（调用方负责克隆与倒影材质），随场景显隐；传 null 移除 */
  setReflection(root: import('three').Object3D | null): void;
  applyScene(s: SceneId): void;
  capture(): string | null;
  dispose(): void;
}

/** 竖向渐变天幕纹理 */
function makeSkyTexture(
  THREE: typeof import('three'),
  stops: [number, string][],
): import('three').CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    for (const [at, color] of stops) g.addColorStop(at, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 512);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export async function createStage(mount: HTMLElement): Promise<Stage> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');

  /* ---------- 渲染器 / 场景 ---------- */
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(3, 6, 4);
  scene.add(key);
  const moonLight = new THREE.DirectionalLight(0xaebfe8, 0);
  moonLight.position.set(-2.5, 4.5, -3.5);
  scene.add(moonLight);

  /* ---------- 宣纸场景的柔和地面影 ---------- */
  const sc = document.createElement('canvas');
  sc.width = sc.height = 256;
  const sctx = sc.getContext('2d');
  if (sctx) {
    const rg = sctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    rg.addColorStop(0, 'rgba(24,18,12,0.34)');
    rg.addColorStop(0.55, 'rgba(24,18,12,0.15)');
    rg.addColorStop(1, 'rgba(24,18,12,0)');
    sctx.fillStyle = rg;
    sctx.fillRect(0, 0, 256, 256);
  }
  const shadowTex = new THREE.CanvasTexture(sc);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  /* ---------- 墨夜 / 月庭：天幕、地板、圆月 ---------- */
  const nightBg = makeSkyTexture(THREE, [
    [0, '#060505'],
    [0.55, '#14110c'],
    [1, '#251e14'],
  ]);
  const moonBg = makeSkyTexture(THREE, [
    [0, '#0a0f22'],
    [0.6, '#16203c'],
    [1, '#2c3a5e'],
  ]);

  // 地板半透明且不写深度，倒影（翻面克隆）后绘制、叠在地板之上显现
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x171310,
    roughness: 0.35,
    metalness: 0.15,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 48), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.visible = false;
  floor.renderOrder = 1;
  scene.add(floor);

  const moonGroup = new THREE.Group();
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(1, 48),
    new THREE.MeshBasicMaterial({ color: 0xf5eeda, fog: false }),
  );
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = haloCanvas.height = 256;
  const hctx = haloCanvas.getContext('2d');
  if (hctx) {
    const hg = hctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    hg.addColorStop(0, 'rgba(245,238,218,0.5)');
    hg.addColorStop(1, 'rgba(245,238,218,0)');
    hctx.fillStyle = hg;
    hctx.fillRect(0, 0, 256, 256);
  }
  const haloTex = new THREE.CanvasTexture(haloCanvas);
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, fog: false }),
  );
  halo.position.z = -0.05;
  moonGroup.add(halo);
  moonGroup.add(moon);
  moonGroup.visible = false;
  scene.add(moonGroup);

  /* ---------- 相机与轨道 ---------- */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotateSpeed = 0.6;

  /* ---------- 取景与倒影 ---------- */
  let groundY = 0;
  let sizeY = 2;
  let reflRoot: import('three').Object3D | null = null;
  let sceneId: SceneId = 'paper';

  const frame = (box: import('three').Box3) => {
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    groundY = box.min.y;
    sizeY = size.y;

    const shadowRadius = Math.max(size.x, size.z) * 0.72 + 0.3;
    shadow.scale.setScalar(shadowRadius);
    shadow.position.set(center.x, groundY + 0.01, center.z);

    floor.scale.setScalar(size.y * 1.9);
    floor.position.set(center.x, groundY + 0.004, center.z);

    moon.scale.setScalar(size.y * 0.34);
    halo.scale.setScalar(size.y * 1.7);
    moonGroup.position.set(center.x - size.y * 0.9, groundY + size.y * 1.5, center.z - size.y * 2.2);

    const dist = size.y * 2.1;
    camera.position.set(center.x + dist * 0.32, groundY + size.y * 0.74, center.z + dist);
    controls.target.set(center.x, groundY + size.y * 0.52, center.z);
    controls.minDistance = size.y * 1.0;
    controls.maxDistance = size.y * 4;
    controls.update();

    if (reflRoot) reflRoot.position.y = groundY * 2;
    if (sceneId === 'moon') scene.fog = new THREE.Fog(0x141b30, size.y * 2.4, size.y * 6);
  };

  const setReflection = (root: import('three').Object3D | null) => {
    if (reflRoot) {
      scene.remove(reflRoot);
      reflRoot = null;
    }
    reflRoot = root;
    if (root) {
      root.visible = sceneId !== 'paper';
      root.position.y = groundY * 2;
      scene.add(root);
    }
  };

  const applyScene = (s: SceneId) => {
    sceneId = s;
    if (s === 'paper') {
      scene.background = null;
      scene.fog = null;
      scene.environmentIntensity = 1;
      floor.visible = false;
      shadow.visible = true;
      moonGroup.visible = false;
      key.color.set(0xffffff);
      key.intensity = 1.5;
      moonLight.intensity = 0;
    } else if (s === 'night') {
      scene.background = nightBg;
      scene.fog = null;
      scene.environmentIntensity = 0.45;
      floorMat.color.set(0x171310);
      floor.visible = true;
      shadow.visible = false;
      moonGroup.visible = false;
      key.color.set(0xfff2e0);
      key.intensity = 1.7;
      moonLight.intensity = 0;
    } else {
      scene.background = moonBg;
      scene.fog = new THREE.Fog(0x141b30, sizeY * 2.4, sizeY * 6);
      scene.environmentIntensity = 0.35;
      floorMat.color.set(0x1a2138);
      floor.visible = true;
      shadow.visible = false;
      moonGroup.visible = true;
      key.color.set(0xdfe8ff);
      key.intensity = 1.0;
      moonLight.intensity = 1.3; // 圆月方向的背光
    }
    if (reflRoot) reflRoot.visible = s !== 'paper';
  };

  const capture = () => {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    if (!w || !h) return null;
    const prev = renderer.getPixelRatio();
    renderer.setPixelRatio(2);
    renderer.setSize(w, h, false);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    renderer.setPixelRatio(prev);
    renderer.setSize(w, h, false);
    renderer.render(scene, camera);
    return url;
  };

  /* ---------- 循环与尺寸 ---------- */
  const clock = new THREE.Clock();
  let raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    stage.onTick?.(clock.getDelta());
    controls.update();
    renderer.render(scene, camera);
  };
  const resize = () => {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(mount);

  const stage: Stage = {
    THREE,
    scene,
    camera,
    renderer,
    controls,
    onTick: null,
    onDispose: null,
    frame,
    setReflection,
    applyScene,
    capture,
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      stage.onDispose?.();
      shadowTex.dispose();
      shadow.geometry.dispose();
      (shadow.material as import('three').Material).dispose();
      floor.geometry.dispose();
      floorMat.dispose();
      nightBg.dispose();
      moonBg.dispose();
      haloTex.dispose();
      moon.geometry.dispose();
      (moon.material as import('three').Material).dispose();
      halo.geometry.dispose();
      (halo.material as import('three').Material).dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
  tick(); // 首帧在 stage 初始化之后启动
  return stage;
}
