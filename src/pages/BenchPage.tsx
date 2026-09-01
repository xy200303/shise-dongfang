/**
 * BenchPage —— 「工作台」：取色 → 配色 → 应用，三步一流
 *
 * 原本孤立的三个功能（图片拾色 / 配色实验室 / 组件沙盒）由一条
 * 共享基色串成工作流：从图片里拾得一色，携去推演和谐与对比，
 * 再携去让整套 TDesign 组件换装、导出 token。
 * 步进靠 nonce 重挂载传递基色；步骤内部自由改色不回传上一步。
 */
import { useCallback, useState } from 'react';
import type { ColorEntry } from '../types';
import PickerPage from './PickerPage';
import LabPage from './LabPage';
import SandboxPage from './SandboxPage';

export type BenchStep = 'pick' | 'lab' | 'sandbox';

const STEPS: { key: BenchStep; num: string; label: string; desc: string }[] = [
  { key: 'pick', num: '壹', label: '取色', desc: '从一帧光影里拾取' },
  { key: 'lab', num: '贰', label: '配色', desc: '推演和谐 · 校验对比' },
  { key: 'sandbox', num: '叁', label: '应用', desc: '组件换装 · 导出 token' },
];

interface Props {
  colors: ColorEntry[];
  /** 分享链接 ?lab= 深链：直入配色步 */
  initialStep?: BenchStep;
  initialBase?: string;
  onPickColor: (c: ColorEntry) => void;
  onApplyTheme: (hex: string) => void;
}

export default function BenchPage({ colors, initialStep, initialBase, onPickColor, onApplyTheme }: Props) {
  const [step, setStep] = useState<BenchStep>(initialStep ?? 'pick');
  const [baseHex, setBaseHex] = useState(initialBase ?? colors[0]?.hex ?? '#A85858');
  // 重挂载 nonce：把基色带进下一步（步骤内部改色不触发，避免回环）
  const [labNonce, setLabNonce] = useState(0);
  const [sandboxNonce, setSandboxNonce] = useState(0);

  const goLab = useCallback((hex: string) => {
    setBaseHex(hex);
    setLabNonce((n) => n + 1);
    setStep('lab');
  }, []);

  const goSandbox = useCallback(() => {
    setSandboxNonce((n) => n + 1);
    setStep('sandbox');
  }, []);

  const onLabBaseChange = useCallback((hex: string) => {
    setBaseHex(hex);
  }, []);

  const matched = colors.find((c) => c.hex.toLowerCase() === baseHex.toLowerCase()) ?? null;

  return (
    <main className="wrap">
      <header className="page-head">
        <h1 className="page-title">工作台</h1>
        <p className="page-sub">取色 · 配色 · 应用，一气呵成</p>
      </header>

      <hr className="hairline" />

      {/* 三步流指示 + 携色前进 */}
      <div className="bench-steps">
        {STEPS.map((s, i) => (
          <span key={s.key} style={{ display: 'contents' }}>
            {i > 0 && <span className="bench-step-sep" />}
            <button
              className={`bench-step${step === s.key ? ' active' : ''}`}
              onClick={() => setStep(s.key)}
            >
              <span className="bench-step-num">{s.num}</span>
              <span className="bench-step-label">{s.label}</span>
              <span className="bench-step-desc">{s.desc}</span>
            </button>
          </span>
        ))}
        {step === 'lab' && (
          <button className="bench-next" onClick={goSandbox}>
            <span className="bench-next-dot" style={{ background: baseHex }} />
            携「{matched?.name ?? baseHex.toUpperCase()}」去应用 →
          </button>
        )}
      </div>

      <div className="fade-stage" key={step}>
        {step === 'pick' && (
          <PickerPage colors={colors} onPickColor={onPickColor} onUseColor={goLab} />
        )}
        {step === 'lab' && (
          <LabPage
            key={labNonce}
            colors={colors}
            onPickColor={onPickColor}
            initialBase={baseHex}
            onBaseChange={onLabBaseChange}
          />
        )}
        {step === 'sandbox' && (
          <SandboxPage key={sandboxNonce} colors={colors} onApplyTheme={onApplyTheme} initialHex={baseHex} />
        )}
      </div>
    </main>
  );
}
