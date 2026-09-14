/**
 * FittingRoom —— 「试穿间」3D 人台
 *
 * 把配色方案实时染到 KayKit 角色衣装上：模型是单材质 8×4 调色板图集，
 * 运行时克隆底图为 512 canvas（控显存），按插槽映射把命中格重绘为目标色
 * 竖向渐变（dye.ts），可纹格再叠云纹/回纹/缠枝印花（patterns.ts）。
 * 舞台（渲染器/相机/三态场景/倒影位/导出）复用 fitting/stage.ts。
 *
 * 动画三态：静立 Idle / 走秀 Walking_A（相机缓绕）/ 亮相 Cheer，crossFade 0.3s；
 * 倒影为 SkeletonUtils 翻面克隆，共享染色图集，独立 mixer 同帧同步。
 */
import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import Seg from '../../components/Seg';
import { repaintAtlas } from './dye';
import type { PatternKind } from './patterns';
import { createStage, type SceneId, type Stage } from './stage';
import type { FittingDef } from './types';

type AnimId = 'Idle' | 'Walking_A' | 'Cheer';

export const SCENES: { key: SceneId; label: string }[] = [
  { key: 'paper', label: '宣纸' },
  { key: 'night', label: '墨夜' },
  { key: 'moon', label: '月庭' },
];
const ANIMS: { key: AnimId; label: string }[] = [
  { key: 'Idle', label: '静立' },
  { key: 'Walking_A', label: '走秀' },
  { key: 'Cheer', label: '亮相' },
];

/** 染色图集边长（原图 1024，压到 512 控显存） */
const ATLAS_SIZE = 512;

interface Props {
  def: FittingDef;
  /** slotId → hex（与 2D 模板同一套 assignments） */
  assignments: Record<string, string>;
  /** 纹样选择：无纹 / 云纹 / 回纹 / 缠枝 */
  pattern: PatternKind;
  /** 导出 PNG 用：挂上 capture() → dataURL（2x 像素） */
  captureRef: MutableRefObject<(() => string | null) | null>;
}

export default function FittingRoom({ def, assignments, pattern, captureRef }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{
    applyDye: (a: Record<string, string>, p: PatternKind) => void;
    applyAnim: (a: AnimId) => void;
  } | null>(null);
  const stateRef = useRef({ assignments, pattern });
  stateRef.current = { assignments, pattern };
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sceneId, setSceneId] = useState<SceneId>('paper');
  const [animId, setAnimId] = useState<AnimId>('Idle');
  const stageRef = useRef<Stage | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let stage: Stage | null = null;
    setLoading(true);
    setFailed(false);

    (async () => {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const SkeletonUtils = await import('three/examples/jsm/utils/SkeletonUtils.js');
      const [stage0, gltf] = await Promise.all([
        createStage(mount),
        new GLTFLoader().loadAsync(def.model),
      ]);
      if (disposed) {
        stage0.dispose();
        return;
      }
      stage = stage0;
      stageRef.current = stage0;
      const { THREE } = stage0;

      /* ---------- 模型：隐藏武器、克隆材质换染色图集 ---------- */
      const root = gltf.scene;
      root.traverse((n) => {
        if (def.hidden.includes(n.name)) n.visible = false;
      });

      const meshes: import('three').Mesh[] = [];
      root.traverse((n) => {
        const mesh = n as import('three').Mesh;
        if (mesh.isMesh && mesh.visible) meshes.push(mesh);
      });
      const baseMat = meshes
        .map((m) => m.material as import('three').MeshStandardMaterial)
        .find((m) => m?.map?.image);
      if (!baseMat?.map?.image) throw new Error('模型缺少图集纹理');

      const srcImg = baseMat.map.image as CanvasImageSource & { width: number; height: number };
      const canvas = document.createElement('canvas');
      canvas.width = ATLAS_SIZE;
      canvas.height = ATLAS_SIZE;
      const atlasTex = new THREE.CanvasTexture(canvas);
      atlasTex.flipY = false; // GLTF 约定：v=0 在图顶
      atlasTex.colorSpace = THREE.SRGBColorSpace;

      const dyedMat = baseMat.clone();
      dyedMat.map = atlasTex;
      for (const mesh of meshes) mesh.material = dyedMat;
      stage0.scene.add(root);
      stage0.frame(new THREE.Box3().setFromObject(root));

      /* ---------- 倒影：翻面克隆（保持骨骼绑定），共享染色图集 ---------- */
      const reflRoot = SkeletonUtils.clone(root);
      const reflMat = dyedMat.clone();
      reflMat.transparent = true;
      reflMat.opacity = 0.28;
      reflMat.depthWrite = false;
      reflMat.side = THREE.BackSide; // scale.y=-1 翻面和绕序
      reflRoot.traverse((n) => {
        const mesh = n as import('three').Mesh;
        if (mesh.isMesh) {
          mesh.material = reflMat;
          mesh.renderOrder = 2; // 地板之后
        }
      });
      reflRoot.scale.y = -1;
      stage0.setReflection(reflRoot);

      /* ---------- 动画：主体与倒影各一台 mixer，同步切换 ---------- */
      const mixers = [new THREE.AnimationMixer(root), new THREE.AnimationMixer(reflRoot)];
      const actions = mixers.map((mx) => {
        const find = (name: AnimId) =>
          gltf.animations.find((c) => c.name === name) ??
          gltf.animations.find((c) => c.name === 'Idle') ??
          gltf.animations[0];
        const map = {} as Record<AnimId, import('three').AnimationAction | null>;
        for (const a of ANIMS) {
          const clip = find(a.key);
          map[a.key] = clip ? mx.clipAction(clip) : null;
        }
        return map;
      });
      let currentAnim: AnimId = 'Idle';
      for (const map of actions) map.Idle?.play();

      const applyAnim = (a: AnimId) => {
        if (a === currentAnim) return;
        currentAnim = a;
        for (const map of actions) {
          const next = map[a];
          if (!next) continue;
          next.reset().fadeIn(0.3).play();
          for (const other of ANIMS) {
            if (other.key !== a) map[other.key]?.fadeOut(0.3);
          }
        }
        stage0.controls.autoRotate = a === 'Walking_A';
      };
      stage0.onTick = (dt) => {
        for (const mx of mixers) mx.update(dt);
      };

      /* ---------- 染色与导出 ---------- */
      const applyDye = (a: Record<string, string>, p: PatternKind) => {
        repaintAtlas(canvas, srcImg, def.dye, a, p, def.patternSlots);
        atlasTex.needsUpdate = true;
      };
      applyDye(stateRef.current.assignments, stateRef.current.pattern);
      apiRef.current = { applyDye, applyAnim };
      captureRef.current = () => stage0.capture();

      stage0.onDispose = () => {
        root.traverse((n) => {
          const mesh = n as import('three').Mesh;
          if (mesh.isMesh) mesh.geometry.dispose(); // 倒影与主体共享几何，此处一并释放
        });
        dyedMat.map = null;
        dyedMat.dispose();
        reflMat.map = null;
        reflMat.dispose();
        atlasTex.dispose();
      };

      setLoading(false);
    })().catch((err: unknown) => {
      console.error('[试穿间] 人台加载失败', err);
      if (!disposed) {
        setFailed(true);
        setLoading(false);
      }
    });

    return () => {
      disposed = true;
      stage?.dispose();
      stageRef.current = null;
      apiRef.current = null;
      captureRef.current = null;
    };
  }, [def, captureRef]);

  // 换色 / 换纹样
  useEffect(() => {
    apiRef.current?.applyDye(assignments, pattern);
  }, [assignments, pattern]);

  useEffect(() => {
    stageRef.current?.applyScene(sceneId);
  }, [sceneId]);

  useEffect(() => {
    apiRef.current?.applyAnim(animId);
  }, [animId]);

  return (
    <div className="zaowu-fitting" ref={mountRef}>
      <div className={`fitting-toolbar${sceneId !== 'paper' ? ' on-dark' : ''}`}>
        <Seg options={SCENES} value={sceneId} onChange={setSceneId} />
        <Seg options={ANIMS} value={animId} onChange={setAnimId} />
      </div>
      {(loading || failed) && (
        <div className="zaowu-fitting-veil">
          <span>{failed ? '人台请不动，刷新再试' : '人台更衣中…'}</span>
        </div>
      )}
    </div>
  );
}
