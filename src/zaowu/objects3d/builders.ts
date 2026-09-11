/**
 * objects3d/builders —— 油纸伞 / 灯笼的程序化建模
 *
 * 几何全部手写（LatheGeometry / ConeGeometry / Cylinder / Torus），零外部资产。
 * 染色：伞面与灯面是 512 canvas 纹理——引擎 generatePalette 渐变铺底，
 * 伞面可再叠云纹/回纹/缠枝印花（fitting/patterns.ts，纹样最好的载体）；
 * 骨/柄/口/穗为实色材质，roughness/metalness 拉开纸面、竹骨、铜口、丝穗的质感。
 */
import { generatePalette } from 'shise-engine';
import { stampPattern, type PatternKind } from '../fitting/patterns';
import type { BuiltObject } from './types';

type THREE = typeof import('three');

/** 槽位色 → 三段渐变（浅→主→深，保持绸面/纸面的竖向明暗） */
function gradientStops(hex: string): [string, string, string] {
  const palette = generatePalette(hex);
  const mid = palette.primaryIndex;
  const scale = palette.colors;
  return [scale[Math.max(0, mid - 1)], scale[mid], scale[Math.min(9, mid + 1)]];
}

function fillGradient(ctx: CanvasRenderingContext2D, w: number, h: number, hex: string): void {
  const [top, mid, bottom] = gradientStops(hex);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(0.5, mid);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/* ================= 油纸伞 ================= */

export function buildUmbrella(
  T: THREE,
  colors: Record<string, string>,
  pattern: PatternKind,
): BuiltObject {
  const group = new T.Group();

  /* 伞面：微弧锥面（apex 高、檐口缓垂），双面 */
  const canopyPts = [
    new T.Vector2(0.02, 0.52),
    new T.Vector2(0.35, 0.4),
    new T.Vector2(0.7, 0.22),
    new T.Vector2(1.0, 0.02),
  ];
  const canopyGeo = new T.LatheGeometry(canopyPts, 48);
  const canopyCanvas = document.createElement('canvas');
  canopyCanvas.width = canopyCanvas.height = 512;
  const canopyTex = new T.CanvasTexture(canopyCanvas);
  canopyTex.colorSpace = T.SRGBColorSpace;
  canopyTex.wrapS = T.RepeatWrapping;
  const canopyMat = new T.MeshStandardMaterial({
    map: canopyTex,
    side: T.DoubleSide,
    roughness: 0.62, // 桐油纸面：柔光微亮
    metalness: 0,
  });
  const canopy = new T.Mesh(canopyGeo, canopyMat);
  group.add(canopy);

  const repaintCanopy = (c: Record<string, string>, p: PatternKind) => {
    const ctx = canopyCanvas.getContext('2d');
    if (!ctx) return;
    fillGradient(ctx, 512, 512, c.canopy ?? '#A85858');
    // 隔瓣间色：八瓣交替淡罩（u 轴即伞面周向）
    const [, panelMid] = gradientStops(c.panel ?? '#888888');
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = panelMid;
    for (let i = 1; i < 8; i += 2) ctx.fillRect(((i * 512) / 8) | 0, 0, 65, 512);
    ctx.globalAlpha = 1;
    // 纹样印花：同族对比档、低透明度
    if (p !== 'none') {
      const palette = generatePalette(c.canopy ?? '#A85858');
      const mid = palette.primaryIndex;
      const darkFabric = mid >= 5;
      const lineIdx = darkFabric ? Math.max(0, mid - 5) : Math.min(9, mid + 4);
      stampPattern(ctx, p, 0, 0, 512, 512, palette.colors[lineIdx], darkFabric ? 0.4 : 0.35,
        darkFabric ? 'screen' : 'multiply');
    }
    canopyTex.needsUpdate = true;
  };

  /* 伞骨：八根细竹条从伞顶放射到檐口（内侧面） */
  const ribMat = new T.MeshStandardMaterial({ roughness: 0.7, metalness: 0 });
  const ribGeo = new T.CylinderGeometry(0.008, 0.008, 1.04, 6);
  const ribs: import('three').Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const rib = new T.Mesh(ribGeo, ribMat);
    const angle = (i / 8) * Math.PI * 2;
    // 从顶心 (0,0.5) 到檐口 (cos·1.0, sin·1.0, 0.03) 的中点与朝向
    const tip = new T.Vector3(Math.cos(angle) * 0.98, 0.03, Math.sin(angle) * 0.98);
    const apex = new T.Vector3(0, 0.49, 0);
    rib.position.copy(apex.clone().add(tip).multiplyScalar(0.5));
    rib.lookAt(tip.clone().sub(apex).add(rib.position));
    rib.rotateX(Math.PI / 2);
    ribs.push(rib);
    group.add(rib);
  }

  /* 伞缘：檐口细环 + 顶饰 */
  const edgeMat = new T.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 });
  const rim = new T.Mesh(new T.TorusGeometry(1.0, 0.018, 8, 64), edgeMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.02;
  group.add(rim);
  const finial = new T.Mesh(new T.CylinderGeometry(0.02, 0.035, 0.12, 12), edgeMat);
  finial.position.y = 0.56;
  group.add(finial);

  /* 伞柄：竹木长杆 + 伞斗 */
  const handleMat = new T.MeshStandardMaterial({ roughness: 0.58, metalness: 0 });
  const shaft = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 1.5, 12), handleMat);
  shaft.position.y = -0.45;
  group.add(shaft);
  const hub = new T.Mesh(new T.SphereGeometry(0.05, 12, 10), handleMat);
  hub.position.y = 0.08;
  group.add(hub);

  group.position.y = 1.25; // 柄端落地

  return {
    group,
    update(c, p) {
      repaintCanopy(c, p);
      ribMat.color.set(c.rib ?? '#8a6a4a');
      edgeMat.color.set(c.edge ?? '#514343');
      handleMat.color.set(c.handle ?? '#4a3628');
    },
    setLit() {},
    dispose() {
      canopyGeo.dispose();
      canopyTex.dispose();
      canopyMat.dispose();
      ribGeo.dispose();
      ribMat.dispose();
      rim.geometry.dispose();
      finial.geometry.dispose();
      edgeMat.dispose();
      shaft.geometry.dispose();
      hub.geometry.dispose();
      handleMat.dispose();
    },
  };
}

/* ================= 灯笼 ================= */

export function buildLantern(
  T: THREE,
  colors: Record<string, string>,
): BuiltObject {
  const group = new T.Group();

  /* 灯身：扁球罩（收口上下），半透 + 自发光，墨夜点灯 */
  const bodyPts: import('three').Vector2[] = [];
  const H = 0.62;
  const R = 0.58;
  for (let i = 0; i <= 16; i++) {
    const t = i / 16; // 0 下口 → 1 上口
    const y = (t - 0.5) * 2 * H;
    const r = Math.max(0.03, R * Math.sin(Math.PI * (0.08 + t * 0.84)) ** 0.8);
    bodyPts.push(new T.Vector2(r, y));
  }
  const bodyGeo = new T.LatheGeometry(bodyPts, 48);
  const bodyCanvas = document.createElement('canvas');
  bodyCanvas.width = bodyCanvas.height = 512;
  const bodyTex = new T.CanvasTexture(bodyCanvas);
  bodyTex.colorSpace = T.SRGBColorSpace;
  const bodyMat = new T.MeshStandardMaterial({
    map: bodyTex,
    roughness: 0.55, // 绢面
    metalness: 0,
    emissive: new T.Color(0x000000),
    emissiveIntensity: 0.15,
    side: T.DoubleSide, // 旋成轮廓从下到上，双面保证外表面受光正确
  });
  const body = new T.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // 内部灯烛：点灯时亮起
  const glow = new T.PointLight(0xffe2b8, 0, 4, 1.6);
  group.add(glow);

  const repaintBody = (c: Record<string, string>) => {
    const ctx = bodyCanvas.getContext('2d');
    if (!ctx) return;
    fillGradient(ctx, 512, 512, c.body ?? '#A85858');
    // 灯骨：八道明线竖棱（u 轴即周向）
    const [, ribMid] = gradientStops(c.rib ?? '#514343');
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = ribMid;
    for (let i = 0; i < 8; i++) ctx.fillRect(((i * 512) / 8 + 28) | 0, 0, 6, 512);
    ctx.globalAlpha = 1;
    // 灯花：腰腹一周双环 + 中段菱格点
    const [, artMid] = gradientStops(c.art ?? '#c8a04a');
    ctx.strokeStyle = artMid;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 5;
    for (const y of [218, 292]) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    bodyTex.needsUpdate = true;
    bodyMat.emissive.set(c.body ?? '#A85858');
    glow.color.set(c.body ?? '#A85858');
  };

  /* 上下口：铜质收口盖 */
  const capMat = new T.MeshStandardMaterial({ roughness: 0.35, metalness: 0.55 });
  const capGeo = new T.CylinderGeometry(0.16, 0.2, 0.1, 24);
  const capTop = new T.Mesh(capGeo, capMat);
  capTop.position.y = H + 0.03;
  const capBottom = new T.Mesh(capGeo, capMat);
  capBottom.position.y = -H - 0.03;
  group.add(capTop, capBottom);

  /* 提梁：杆 + 顶环 */
  const ribMat = new T.MeshStandardMaterial({ roughness: 0.6, metalness: 0.2 });
  const pole = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 0.5, 8), ribMat);
  pole.position.y = H + 0.36;
  group.add(pole);
  const ring = new T.Mesh(new T.TorusGeometry(0.06, 0.012, 8, 24), ribMat);
  ring.position.y = H + 0.66;
  group.add(ring);

  /* 灯穗：绳 + 珠 + 穗头 */
  const tasselMat = new T.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
  const cord = new T.Mesh(new T.CylinderGeometry(0.01, 0.01, 0.22, 6), tasselMat);
  cord.position.y = -H - 0.2;
  group.add(cord);
  const bead = new T.Mesh(new T.SphereGeometry(0.045, 12, 10), tasselMat);
  bead.position.y = -H - 0.33;
  group.add(bead);
  const tassel = new T.Mesh(new T.ConeGeometry(0.075, 0.3, 16), tasselMat);
  tassel.rotation.x = Math.PI; // 穗尖朝下
  tassel.position.y = -H - 0.52;
  group.add(tassel);

  group.position.y = 1.75; // 悬吊：穗尖离地

  return {
    group,
    update(c) {
      repaintBody(c);
      capMat.color.set(c.cap ?? '#8a6a4a');
      ribMat.color.set(c.rib ?? '#514343');
      tasselMat.color.set(c.tassel ?? '#8a3a3a');
    },
    setLit(lit) {
      bodyMat.emissiveIntensity = lit ? 1.0 : 0.15;
      glow.intensity = lit ? 2.6 : 0;
    },
    dispose() {
      bodyGeo.dispose();
      bodyTex.dispose();
      bodyMat.dispose();
      capGeo.dispose();
      capMat.dispose();
      pole.geometry.dispose();
      ring.geometry.dispose();
      ribMat.dispose();
      cord.geometry.dispose();
      bead.geometry.dispose();
      tassel.geometry.dispose();
      tasselMat.dispose();
      glow.dispose();
    },
  };
}
