/**
 * ZaowuPage —— 「造物」：传统造物配色设计
 *
 * 模板引擎（zaowu/templates）+ 配色规则引擎（zaowu/solver）：
 * 选一件衣物或物件，挑一条配色规则，引擎即把基色推演成整案
 * （主/辅/缘/系/里/纹各安其位）；每个部件还可再手调，
 * 候选色全部来自引擎色阶与和谐推演。设计稿可导出 PNG。
 */
import { useMemo, useRef, useState } from 'react';
import { MessagePlugin } from 'tdesign-react';
import type { ColorEntry } from '../types';
import { RULES, ROLE_LABEL, type RuleId, type SlotDef } from '../zaowu/types';
import { solveScheme, slotSuggestions } from '../zaowu/solver';
import { TEMPLATES } from '../zaowu/templates';
import './zaowu.css';

interface Props {
  colors: ColorEntry[];
  /** 从详情抽屉「携此色入造物」跳入时带的色 */
  initialHex?: string;
}

export default function ZaowuPage({ colors, initialHex }: Props) {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [ruleId, setRuleId] = useState<RuleId>('cascade');
  const [baseHex, setBaseHex] = useState(initialHex ?? colors[0]?.hex ?? '#A85858');
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [selSlot, setSelSlot] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  const scheme = useMemo(() => solveScheme(ruleId, baseHex, colors), [ruleId, baseHex, colors]);

  // 插槽 → 实际色：手调优先，否则按规则解算（同角色多插槽顺位取色变体）
  const assignments = useMemo(() => {
    const out: Record<string, string> = {};
    const roleCount: Record<string, number> = {};
    template.slots.forEach((slot) => {
      const i = roleCount[slot.role] ?? 0;
      roleCount[slot.role] = i + 1;
      const group = scheme[slot.role];
      out[slot.id] = custom[slot.id] ?? group[i % group.length];
    });
    return out;
  }, [template, scheme, custom]);

  const entry = useMemo(
    () => colors.find((c) => c.hex.toLowerCase() === baseHex.toLowerCase()) ?? null,
    [colors, baseHex],
  );

  const reroll = () => {
    const next = colors[Math.floor(Math.random() * colors.length)];
    if (!next) return;
    setBaseHex(next.hex);
    setCustom({});
    MessagePlugin.success(`掷得「${next.name}」，已依「${RULES.find((r) => r.id === ruleId)?.name}」承色`);
  };

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    setCustom({});
    setSelSlot(null);
  };

  const pickRule = (id: RuleId) => {
    setRuleId(id);
    setCustom({});
  };

  const assignSlot = (slotId: string, hex: string) => {
    setCustom((prev) => ({ ...prev, [slotId]: hex }));
  };

  const suggestions = useMemo(() => slotSuggestions(baseHex), [baseHex]);

  const exportPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth * 2;
      canvas.height = img.naturalHeight * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `拾色造物-${template.name}.png`;
      a.click();
      MessagePlugin.success(`已导出设计稿：拾色造物-${template.name}.png`);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      MessagePlugin.error('导出失败，请重试');
    };
    img.src = url;
  };

  const copyScheme = () => {
    const lines = template.slots.map(
      (s) => `${s.label}（${ROLE_LABEL[s.role]}）${assignments[s.id].toUpperCase()}`,
    );
    const rule = RULES.find((r) => r.id === ruleId)?.name;
    const text = `拾色造物 · ${template.name}｜${rule}之法｜基色 ${baseHex.toUpperCase()}\n${lines.join('\n')}`;
    void navigator.clipboard.writeText(text).then(
      () => MessagePlugin.success('配色方案已复制'),
      () => MessagePlugin.warning('复制失败'),
    );
  };

  const selSlotDef: SlotDef | null = template.slots.find((s) => s.id === selSlot) ?? null;

  return (
    <main className="wrap">
      <header className="page-head">
        <h1 className="page-title">造物</h1>
        <p className="page-sub">以色造物，以物载色</p>
      </header>

      <hr className="hairline" />

      {/* 控制行：器物模板 / 配色规则 */}
      <div className="zaowu-controls">
        <div className="filter-tabs">
          <span className="zaowu-group-label">服饰</span>
          {TEMPLATES.filter((t) => t.kind === '服饰').map((t) => (
            <button
              key={t.id}
              className={`filter-tab${templateId === t.id ? ' active' : ''}`}
              onClick={() => pickTemplate(t.id)}
            >
              {t.name}
            </button>
          ))}
          <span className="starmap-ctrl-divider" />
          <span className="zaowu-group-label">物件</span>
          {TEMPLATES.filter((t) => t.kind === '物件').map((t) => (
            <button
              key={t.id}
              className={`filter-tab${templateId === t.id ? ' active' : ''}`}
              onClick={() => pickTemplate(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="filter-tabs">
          {RULES.map((r) => (
            <button
              key={r.id}
              className={`filter-tab${ruleId === r.id ? ' active' : ''}`}
              title={r.desc}
              onClick={() => pickRule(r.id)}
            >
              {r.name}
            </button>
          ))}
          <span className="starmap-ctrl-divider" />
          <button className="filter-tab" onClick={reroll}>
            掷签
          </button>
        </div>
      </div>

      <div className="zaowu-body">
        {/* 左：设计稿 */}
        <div className="zaowu-stage">
          <svg
            ref={svgRef}
            viewBox={template.viewBox}
            className="zaowu-svg"
            role="img"
            aria-label={`${template.name} 配色设计稿`}
            xmlns="http://www.w3.org/2000/svg"
          >
            {template.render(assignments)}
          </svg>
          <div className="zaowu-stage-caption">
            <span className="zaowu-vessel-name">{template.name}</span>
            <span className="zaowu-vessel-desc">{template.desc}</span>
          </div>
        </div>

        {/* 右：基色与部件 */}
        <aside className="zaowu-panel">
          <h2 className="zaowu-section-title">基色</h2>
          <div className="zaowu-base">
            <span className="zaowu-base-chip" style={{ backgroundColor: baseHex }} />
            <div className="zaowu-base-info">
              <p className="zaowu-base-name">{entry?.name ?? '自定义色'}</p>
              <p className="zaowu-base-hex font-mono">{baseHex.toUpperCase()}</p>
            </div>
            <button className="zaowu-mini-btn" onClick={reroll}>
              随机一色
            </button>
          </div>

          <h2 className="zaowu-section-title">部件 · 点选换色</h2>
          <ul className="zaowu-slots">
            {template.slots.map((slot) => (
              <li key={slot.id}>
                <button
                  className={`zaowu-slot${selSlot === slot.id ? ' active' : ''}`}
                  onClick={() => setSelSlot(selSlot === slot.id ? null : slot.id)}
                >
                  <span className="zaowu-slot-chip" style={{ backgroundColor: assignments[slot.id] }} />
                  <span className="zaowu-slot-label">
                    {slot.label}
                    <em className="zaowu-slot-role">{ROLE_LABEL[slot.role]}</em>
                  </span>
                  <span className="zaowu-slot-hex font-mono">{assignments[slot.id].toUpperCase()}</span>
                </button>
              </li>
            ))}
          </ul>

          {selSlotDef && (
            <div className="zaowu-suggest">
              <p className="zaowu-suggest-title">
                为「{selSlotDef.label}」择色
                <span className="zaowu-suggest-sub">候选皆出引擎色阶与和谐推演</span>
              </p>
              <div className="zaowu-suggest-grid">
                {suggestions.map((hex, i) => (
                  <button
                    key={`${hex}-${i}`}
                    className={`zaowu-suggest-chip${assignments[selSlotDef.id].toLowerCase() === hex.toLowerCase() ? ' active' : ''}`}
                    style={{ backgroundColor: hex }}
                    title={hex.toUpperCase()}
                    onClick={() => assignSlot(selSlotDef.id, hex)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="zaowu-actions">
            <button className="zaowu-action-btn primary" onClick={exportPng}>
              导出设计稿 PNG
            </button>
            <button className="zaowu-action-btn" onClick={copyScheme}>
              复制配色方案
            </button>
          </div>
        </aside>
      </div>

      <hr className="hairline" />

      {/* 说明 */}
      <section className="starmap-legend">
        <h2 className="starmap-legend-title">读造物</h2>
        <div className="starmap-legend-grid">
          <div className="starmap-legend-item">
            <span className="starmap-legend-dot" style={{ opacity: 0.95 }} />
            <p>
              <strong>色从引擎来，落到造物上。</strong>每件衣物物件都是一份参数化模板，
              部件按角色（主/辅/缘/系/里/纹）登记；配色不手调，由引擎把基色
              推演成整案，角色各安其位。
            </p>
          </div>
          <div className="starmap-legend-item">
            <span className="starmap-legend-dot starmap-legend-dot-small" />
            <p>
              <strong>四条配色之法。</strong>「顺承」取类似色上浅下深；「对比」主辅互补；
              「五色」按青赤黄白黑相生转位；「节气」直接取用今日节气之色——
              传统色彩学的规则，译成了引擎的调用。
            </p>
          </div>
          <div className="starmap-legend-item">
            <span className="starmap-legend-dot starmap-legend-dot-dim" />
            <p>
              <strong>衣料有纹。</strong>云纹、回纹、缠枝三式提花并非贴图，
              纹底走主色、纹线走同色系浅级，全部由色阶自动推导，
              换色即换锦。
            </p>
          </div>
          <div className="starmap-legend-item">
            <span className="starmap-legend-dot starmap-legend-dot-wire" />
            <p>
              <strong>整案可交付。</strong>设计稿一键导出 PNG，配色方案（部件、角色、
              色值、所依之法）一键复制——从一抹基色到一套造物色谱，
              就是一次掷签的距离。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
