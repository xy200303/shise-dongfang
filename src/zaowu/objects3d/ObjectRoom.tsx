/**
 * ObjectRoom —— 3D 物件（油纸伞 / 灯笼）的展示间
 *
 * 与试穿间共用 fitting/stage.ts 舞台（三态场景、倒影、2x 导出）；
 * 物件由 builders.ts 程序化建模，换色/换纹走 update() 重绘画布纹理。
 * 伞缓慢自转展示；灯笼在墨夜/月庭「点灯」（自发光 + 内部点光）。
 */
import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import Seg from '../../components/Seg';
import type { PatternKind } from '../fitting/patterns';
import { createStage, type SceneId, type Stage } from '../fitting/stage';
import { SCENES } from '../fitting/FittingRoom';
import type { Object3DDef, BuiltObject } from './types';

interface Props {
  def: Object3DDef;
  assignments: Record<string, string>;
  pattern: PatternKind;
  captureRef: MutableRefObject<(() => string | null) | null>;
}

export default function ObjectRoom({ def, assignments, pattern, captureRef }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const builtRef = useRef<BuiltObject | null>(null);
  const stateRef = useRef({ assignments, pattern });
  stateRef.current = { assignments, pattern };
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sceneId, setSceneId] = useState<SceneId>('paper');
  const stageRef = useRef<Stage | null>(null);
  const isUmbrella = def.id === 'san';

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let stage: Stage | null = null;
    setLoading(true);
    setFailed(false);

    (async () => {
      const stage0 = await createStage(mount);
      if (disposed) {
        stage0.dispose();
        return;
      }
      stage = stage0;
      stageRef.current = stage0;
      const { THREE } = stage0;

      const built = def.build(THREE, stateRef.current.assignments, stateRef.current.pattern);
      builtRef.current = built;
      built.update(stateRef.current.assignments, stateRef.current.pattern); // 首次上色
      stage0.scene.add(built.group);
      stage0.frame(new THREE.Box3().setFromObject(built.group));

      /* 倒影：普通克隆 + 逐网格透明材质（非骨骼模型，无需 SkeletonUtils） */
      const refl = built.group.clone(true);
      const reflMats: import('three').Material[] = [];
      refl.traverse((n) => {
        const mesh = n as import('three').Mesh;
        if (!mesh.isMesh) return;
        const m = (mesh.material as import('three').MeshStandardMaterial).clone();
        m.transparent = true;
        m.opacity = 0.26;
        m.depthWrite = false;
        m.side = THREE.BackSide;
        reflMats.push(m);
        mesh.material = m;
        mesh.renderOrder = 2;
      });
      refl.scale.y = -1;
      stage0.setReflection(refl);

      /* 伞缓慢自转展示 */
      if (isUmbrella) {
        stage0.onTick = (dt) => {
          built.group.rotation.y += dt * 0.35;
          refl.rotation.y += dt * 0.35;
        };
      }

      captureRef.current = () => stage0.capture();
      stage0.onDispose = () => {
        built.dispose();
        for (const m of reflMats) m.dispose();
      };
      setLoading(false);
    })().catch((err: unknown) => {
      console.error('[造物 3D] 器物加载失败', err);
      if (!disposed) {
        setFailed(true);
        setLoading(false);
      }
    });

    return () => {
      disposed = true;
      stage?.dispose();
      stageRef.current = null;
      builtRef.current = null;
      captureRef.current = null;
    };
  }, [def, captureRef, isUmbrella]);

  useEffect(() => {
    builtRef.current?.update(assignments, pattern);
  }, [assignments, pattern]);

  useEffect(() => {
    stageRef.current?.applyScene(sceneId);
    builtRef.current?.setLit(sceneId !== 'paper');
  }, [sceneId]);

  return (
    <div className="zaowu-fitting" ref={mountRef}>
      <div className="fitting-toolbar">
        <Seg options={SCENES} value={sceneId} onChange={setSceneId} />
      </div>
      {(loading || failed) && (
        <div className="zaowu-fitting-veil">
          <span>{failed ? '器物备展失败，刷新再试' : '器物备展中…'}</span>
        </div>
      )}
    </div>
  );
}
