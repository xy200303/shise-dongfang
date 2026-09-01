/**
 * GalleryPage —— 「观色」：色彩的可视化展陈馆
 *
 * 星图（色彩空间的三种读法）与器物馆（引擎釉色的 3D 展陈）
 * 同属"看见色彩"，收进同一页以页签切换，共享统一的页面骨架。
 */
import type { ThemeMode } from '../theme';
import type { ColorEntry } from '../types';
import StarMapPage from './StarMapPage';
import VesselsPage from './VesselsPage';

export type GalleryTab = 'starmap' | 'vessels';

interface Props {
  colors: ColorEntry[];
  mode: ThemeMode;
  onModeChange: (m: ThemeMode) => void;
  onPickColor: (c: ColorEntry) => void;
  tab: GalleryTab;
  onTabChange: (t: GalleryTab) => void;
  /** 从详情抽屉「携此色入器物馆」跳入时带的色 */
  vesselHex?: string;
}

export default function GalleryPage({
  colors,
  mode,
  onModeChange,
  onPickColor,
  tab,
  onTabChange,
  vesselHex,
}: Props) {
  return (
    <main className="wrap">
      <header className="page-head">
        <h1 className="page-title">观色</h1>
        <p className="page-sub">星垂平野，器藏釉光</p>
      </header>

      <hr className="hairline" />

      <div className="filter-tabs gallery-tabs">
        <button
          className={`filter-tab${tab === 'starmap' ? ' active' : ''}`}
          onClick={() => onTabChange('starmap')}
        >
          色彩星图
        </button>
        <button
          className={`filter-tab${tab === 'vessels' ? ' active' : ''}`}
          onClick={() => onTabChange('vessels')}
        >
          釉色器物
        </button>
      </div>

      <div className="fade-stage" key={tab}>
        {tab === 'starmap' ? (
          <StarMapPage colors={colors} onPickColor={onPickColor} />
        ) : (
          <VesselsPage
            colors={colors}
            mode={mode}
            onModeChange={onModeChange}
            initialHex={vesselHex}
            onPickColor={onPickColor}
          />
        )}
      </div>
    </main>
  );
}
