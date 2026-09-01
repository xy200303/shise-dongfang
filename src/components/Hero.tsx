import { useEffect, useMemo, useRef, useState } from 'react';
import rawColors from '../data/colors.json';
import { SEASONS, type ColorEntry, type Season } from '../types';

interface Props {
  season: Season | '全';
  onSelect: (s: Season | '全') => void;
}

const COLORS = rawColors as unknown as ColorEntry[];
const POEM_COUNT = 6;
const ROTATE_MS = 7000;

/** 按真实月份推算当前季节 */
function currentSeasonByMonth(d: Date = new Date()): Season {
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return '春';
  if (m >= 6 && m <= 8) return '夏';
  if (m >= 9 && m <= 11) return '秋';
  return '冬';
}

const SEASON_CAPTION: Record<Season, string> = {
  春: '春生',
  夏: '夏长',
  秋: '秋收',
  冬: '冬藏',
  四季: '四时',
};

export default function Hero({ season, onSelect }: Props) {
  const inkbleed = `${import.meta.env.BASE_URL}logo-inkbleed.png`;
  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // 诗云：取与当前真实季节相符的带诗句颜色，均匀抽样若干条轮播
  const poems = useMemo(() => {
    const pool = COLORS.filter(
      (c) => c.season === currentSeasonByMonth() && c.poem,
    );
    if (pool.length <= POEM_COUNT) return pool;
    const step = Math.floor(pool.length / POEM_COUNT);
    const picked: ColorEntry[] = [];
    for (let i = 0; i < pool.length && picked.length < POEM_COUNT; i += step) {
      picked.push(pool[i]);
    }
    return picked;
  }, []);

  const [poemIdx, setPoemIdx] = useState(0);
  useEffect(() => {
    if (reduced || poems.length < 2) return;
    const timer = window.setInterval(
      () => setPoemIdx((i) => (i + 1) % poems.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(timer);
  }, [reduced, poems.length]);

  // 鼠标视差：rAF 节流，把归一化坐标写入 CSS 变量
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (reduced) return;
    const el = sectionRef.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) / r.width;
        const y = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.setProperty('--px', x.toFixed(3));
        el.style.setProperty('--py', y.toFixed(3));
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const poem = poems[poemIdx];

  return (
    <section className="hero" ref={sectionRef}>
      {/* 晕墨装饰层 */}
      <div className="hero-decor" aria-hidden>
        <div className="hero-ink hero-ink-a">
          <img src={inkbleed} alt="" />
        </div>
        <div className="hero-ink hero-ink-b">
          <img src={inkbleed} alt="" />
        </div>
      </div>

      {/* 诗云：竖排诗句轮播 */}
      {poem && (
        <div className="hero-poem" key={poemIdx}>
          <p className="hero-poem-text">{poem.poem}</p>
          <p className="hero-poem-meta">
            <span
              className="hero-poem-dot"
              style={{ background: poem.hex }}
            />
            {poem.name} · {poem.poemSource}
          </p>
        </div>
      )}

      <p className="hero-eyebrow">中国传统色 · 五百三十七色</p>
      <h1 className="hero-title">拾色 · 东方</h1>
      <p className="hero-sub">从传统色谱中，拾取属于东方的颜色</p>

      <div className="hero-seasons">
        {SEASONS.map((s) => (
          <button
            key={s}
            className={`season-btn${season === s ? ' active' : ''}`}
            onClick={() => onSelect(s)}
          >
            <span className="season-btn-char">{s}</span>
            <span className="season-btn-label">{SEASON_CAPTION[s]}</span>
          </button>
        ))}
        <span className="season-divider" />
        <button
          className={`season-btn${season === '全' ? ' active' : ''}`}
          onClick={() => onSelect('全')}
        >
          <span className="season-btn-char">全</span>
          <span className="season-btn-label">全色谱</span>
        </button>
      </div>
    </section>
  );
}
