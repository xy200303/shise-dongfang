/**
 * VesselsPage —— 「器物馆」：色彩引擎驱动的 3D 釉面器物展
 *
 * 单器模式：一件器物居中，釉色随所选传统色实时换染；
 * 色阶阵列：十件同款器物分别染上色阶 1-10 级（暗色模式下换用引擎
 * 重新生成的暗色色阶），直观验证色阶在立体釉面光影下的均匀连贯。
 * 全部手写 WebGL（VesselScene），零 three 依赖。
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { generatePalette } from 'shise-engine';
import type { ThemeMode } from '../theme';
import type { ColorEntry } from '../types';
import { VESSELS } from '../webgl/vesselProfiles';
import './vessels.css';

const VesselScene = lazy(() => import('../webgl/VesselScene'));

interface Props {
  colors: ColorEntry[];
  mode: ThemeMode;
  onModeChange: (m: ThemeMode) => void;
  /** 从详情抽屉「入馆展陈」跳入时带的色 */
  initialHex?: string;
  onPickColor: (c: ColorEntry) => void;
}

export default function VesselsPage({ colors, mode, onModeChange, initialHex, onPickColor }: Props) {
  const [vesselId, setVesselId] = useState(VESSELS[0].id);
  const [arrayMode, setArrayMode] = useState(false);
  const [hex, setHex] = useState(initialHex ?? colors[0]?.hex ?? '#A85858');

  const vessel = VESSELS.find((v) => v.id === vesselId) ?? VESSELS[0];
  const entry = useMemo(
    () => colors.find((c) => c.hex.toLowerCase() === hex.toLowerCase()) ?? null,
    [colors, hex],
  );

  // 阵列模式的十级釉色：暗色场景用引擎重新生成的暗色色阶（非简单反转）
  const sceneColors = useMemo(() => {
    if (!arrayMode) return [hex];
    const palette = generatePalette(hex);
    return mode === 'dark' ? palette.darkColors : palette.colors;
  }, [arrayMode, hex, mode]);

  const randomColor = () => {
    const next = colors[Math.floor(Math.random() * colors.length)];
    if (next) setHex(next.hex);
  };

  return (
    <div className="vessels-page">
      {/* 控制行：器形 / 展陈模式 / 换色 */}
      <div className="vessels-controls">
        <div className="filter-tabs">
          {VESSELS.map((v) => (
            <button
              key={v.id}
              className={`filter-tab${vesselId === v.id ? ' active' : ''}`}
              onClick={() => setVesselId(v.id)}
            >
              {v.name}
            </button>
          ))}
        </div>
        <div className="filter-tabs">
          <button
            className={`filter-tab${!arrayMode ? ' active' : ''}`}
            onClick={() => setArrayMode(false)}
          >
            单器
          </button>
          <button
            className={`filter-tab${arrayMode ? ' active' : ''}`}
            onClick={() => setArrayMode(true)}
          >
            色阶阵列
          </button>
          <span className="starmap-ctrl-divider" />
          <button className="filter-tab" onClick={randomColor}>
            随机一色
          </button>
          <button
            className="filter-tab"
            onClick={() => onModeChange(mode === 'dark' ? 'light' : 'dark')}
          >
            {mode === 'dark' ? '宣纸场景' : '墨夜场景'}
          </button>
        </div>
      </div>

      {/* 展台 */}
      <div className={`vessels-stage${arrayMode ? ' is-array' : ''}`}>
        <Suspense fallback={<div className="vessels-failed">器物备展中</div>}>
          <VesselScene profile={vessel.profile} colors={sceneColors} arrayMode={arrayMode} />
        </Suspense>
        <div className="vessels-stage-caption">
          <span className="vessels-vessel-name">{vessel.name}</span>
          <span className="vessels-vessel-desc">{vessel.desc}</span>
        </div>
      </div>

      {/* 阵列模式：十级釉色图注 */}
      {arrayMode && (
        <div className="vessels-scale-row">
          {sceneColors.map((c, i) => (
            <div key={i} className="vessels-scale-chip">
              <span className="vessels-scale-dot" style={{ backgroundColor: c }} />
              <span className="vessels-scale-label font-mono">{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      {/* 当前釉色 */}
      <div className="vessels-colorbar">
        <span className="vessels-colorchip" style={{ backgroundColor: hex }} />
        <div className="vessels-colorinfo">
          <p className="vessels-colorname">
            {entry ? entry.name : '自定釉色'}
            <em className="font-mono">{hex.toUpperCase()}</em>
          </p>
          {entry?.poem && (
            <p className="vessels-colorpoem">
              {entry.poem}
              {entry.poemSource && <i>—— {entry.poemSource}</i>}
            </p>
          )}
        </div>
        {entry && (
          <button className="vessels-detail-btn" onClick={() => onPickColor(entry)}>
            查看色详情
          </button>
        )}
      </div>

      <hr className="hairline" />

      {/* 说明 */}
      <section className="starmap-legend">
        <h2 className="starmap-legend-title">读展</h2>
        <div className="starmap-legend-grid">
          <div className="starmap-legend-item">
            <span className="starmap-legend-dot" style={{ opacity: 0.95 }} />
            <p>
              <strong>釉色即引擎输出。</strong>器面釉彩不是贴图素材，而是所选色经程序化
              MatCap 逐帧烘焙的光影分层：暗部、中间调、高光带与瓷釉的锐利莹光，
              全部由色值推算。换色即是换釉，400ms 间窑变完成。
            </p>
          </div>
          <div className="starmap-legend-item">
            <span className="starmap-legend-dot starmap-legend-dot-small" />
            <p>
              <strong>色阶阵列是最严格的试釉。</strong>十件同款器物分别染上色阶 1-10 级，
              在立体的明暗光影下，级与级之间是否依然均匀连贯、暗部是否发灰，
              一目了然——这是平面色卡给不出的检验。
            </p>
          </div>
          <div className="starmap-legend-item">
            <span className="starmap-legend-dot starmap-legend-dot-dim" />
            <p>
              <strong>墨夜场景用另一套色阶。</strong>切到暗色，阵列换用的是引擎为暗色模式
              重新生成的十级（非亮色反转），釉色在深色展台上依然饱满不闷。
            </p>
          </div>
          <div className="starmap-legend-item">
            <span className="starmap-legend-dot starmap-legend-dot-wire" />
            <p>
              <strong>器形皆回转体，手写 WebGL 旋成。</strong>斗笠盏、梅瓶、玉壶春、
              天球瓶、钵、折沿盘——六件器形各是一条轮廓曲线绕轴旋转而成，
              法线解析求得，侧影平滑。零 three.js 依赖，拖拽旋转、滚轮推近。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
