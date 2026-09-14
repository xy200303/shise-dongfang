/**
 * SvgStage —— 矢量插画模板舞台
 *
 * fetch 清理后的 SVG（public/templates/，已抠纸底 + bbox 归一化），
 * 内联进舞台 <svg>（导出 PNG 走 ZaowuPage 现有 XMLSerializer 路径），
 * 按锚点族聚类（svgdye.ts），换色/掷签/换纹样实时重染；描线族永不动。
 */
import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { IllustratedTemplateDef } from './types';
import type { PatternKind } from './fitting/patterns';
import { classifyPaths, recolorPaths, type ClassifiedPath } from './svgdye';

interface Props {
  def: IllustratedTemplateDef;
  assignments: Record<string, string>;
  pattern: PatternKind;
  /** 导出 PNG 用：指向舞台内联 svg */
  svgRef: MutableRefObject<SVGSVGElement | null>;
}

export default function SvgStage({ def, assignments, pattern, svgRef }: Props) {
  const pathsRef = useRef<ClassifiedPath[]>([]);
  const stateRef = useRef({ assignments, pattern });
  stateRef.current = { assignments, pattern };
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let disposed = false;
    setLoading(true);
    setFailed(false);
    fetch(def.svgUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (disposed) return;
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const src = doc.querySelector('svg');
        if (!src) throw new Error('SVG 解析失败');
        svg.setAttribute('viewBox', src.getAttribute('viewBox') ?? '0 0 400 520');
        svg.innerHTML = src.innerHTML;
        pathsRef.current = classifyPaths(svg, def.anchors);
        recolorPaths(
          pathsRef.current,
          stateRef.current.assignments,
          stateRef.current.pattern,
          def.patternDefaultVisible ?? false,
        );
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error('[造物] 插画加载失败', err);
        if (!disposed) {
          setFailed(true);
          setLoading(false);
        }
      });
    return () => {
      disposed = true;
    };
  }, [def, svgRef]);

  // 换色 / 换纹样
  useEffect(() => {
    if (pathsRef.current.length) {
      recolorPaths(pathsRef.current, assignments, pattern, def.patternDefaultVisible ?? false);
    }
  }, [assignments, pattern, def]);

  return (
    <>
      <svg
        ref={svgRef}
        className="zaowu-svg"
        role="img"
        aria-label={`${def.name} 配色设计稿`}
        xmlns="http://www.w3.org/2000/svg"
      />
      {(loading || failed) && (
        <div className="zaowu-fitting-veil">
          <span>{failed ? '插画备展失败，刷新再试' : '插画备展中…'}</span>
        </div>
      )}
    </>
  );
}
