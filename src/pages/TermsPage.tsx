import { useEffect, useMemo, useRef } from 'react';
import type { ColorEntry } from '../types';
import { SOLAR_TERMS, currentTermIndex, type TermSeason } from '../data/terms';
import './terms.css';

interface Props {
  colors: ColorEntry[];
  onPickColor: (c: ColorEntry) => void;
}

const SEASON_ORDER: TermSeason[] = ['春', '夏', '秋', '冬'];
const SEASON_LABEL: Record<TermSeason, string> = {
  春: '春生',
  夏: '夏长',
  秋: '秋收',
  冬: '冬藏',
};

function formatToday(d: Date): string {
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export default function TermsPage({ colors, onPickColor }: Props) {
  const byId = useMemo(() => new Map(colors.map((c) => [c.id, c])), [colors]);
  const todayIdx = currentTermIndex();
  const todayTerm = SOLAR_TERMS[todayIdx];
  const todayColors = todayTerm.colorIds
    .map((id) => byId.get(id))
    .filter((c): c is ColorEntry => !!c);
  const todayCardRef = useRef<HTMLElement>(null);

  // 加载后平滑滚动到时间轴中的当前节气
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => {
      todayCardRef.current?.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'center',
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="wrap terms-page">
      {/* 今日节气锚点卡 */}
      <header className="terms-today">
        <div className="terms-today-main">
          <p className="terms-today-eyebrow">
            今日节气 · {formatToday(new Date())}
          </p>
          <h1 className="terms-today-name">
            {todayTerm.name}
            <span className="terms-today-pinyin">{todayTerm.pinyin}</span>
          </h1>
          <p className="terms-today-approx">约在 {todayTerm.approx}</p>
          <blockquote className="terms-today-poem">
            {todayTerm.poem}
            <cite className="terms-today-poem-src">
              —— {todayTerm.poemSource}
            </cite>
          </blockquote>
        </div>
        <div className="terms-today-colors">
          {todayColors.map((c) => (
            <button
              key={c.id}
              className="term-chip"
              onClick={() => onPickColor(c)}
            >
              <span
                className="term-chip-swatch"
                style={{ background: c.hex }}
              />
              <span className="term-chip-name">{c.name}</span>
              <span className="term-chip-hex">{c.hex}</span>
            </button>
          ))}
        </div>
      </header>

      <hr className="hairline" />

      {/* 四季时间轴 */}
      {SEASON_ORDER.map((s) => {
        const terms = SOLAR_TERMS.map((t, i) => ({ t, i })).filter(
          ({ t }) => t.season === s,
        );
        return (
          <section className="terms-season" key={s}>
            <header className="terms-season-head">
              <span className="terms-season-char" aria-hidden>
                {s}
              </span>
              <div className="terms-season-head-text">
                <h2 className="terms-season-title">{SEASON_LABEL[s]}</h2>
                <p className="terms-season-names">
                  {terms.map(({ t }) => t.name).join(' · ')}
                </p>
              </div>
            </header>

            <div className="terms-timeline">
              {terms.map(({ t, i }) => {
                const isToday = i === todayIdx;
                const termColors = t.colorIds
                  .map((id) => byId.get(id))
                  .filter((c): c is ColorEntry => !!c);
                return (
                  <article
                    key={t.name}
                    ref={isToday ? todayCardRef : undefined}
                    className={`term-card${isToday ? ' current' : ''}`}
                  >
                    <div className="term-card-poem">
                      <span className="term-card-poem-text">{t.poem}</span>
                      <span className="term-card-poem-src">
                        {t.poemSource}
                      </span>
                    </div>
                    <div className="term-card-body">
                      <div className="term-card-head">
                        <h3 className="term-card-name">{t.name}</h3>
                        <span className="term-card-pinyin">{t.pinyin}</span>
                        <span className="term-card-approx">{t.approx}</span>
                        {isToday && (
                          <span className="term-card-badge">今日</span>
                        )}
                      </div>
                      <div className="term-card-colors">
                        {termColors.map((c) => (
                          <button
                            key={c.id}
                            className="term-chip"
                            onClick={() => onPickColor(c)}
                          >
                            <span
                              className="term-chip-swatch"
                              style={{ background: c.hex }}
                            />
                            <span className="term-chip-name">{c.name}</span>
                            <span className="term-chip-hex">{c.hex}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
