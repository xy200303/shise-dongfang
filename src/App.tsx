import { useEffect, useMemo, useRef, useState } from 'react';
import { MessagePlugin } from 'tdesign-react';
import rawColors from './data/colors.json';
import {
  applyMode,
  applyTheme,
  initialColor,
  initialMode,
  type ThemeMode,
} from './theme';
import type { Category, ColorEntry, Season } from './types';
import TopBar, { type Route } from './components/TopBar';
import Hero from './components/Hero';
import FilterBar from './components/FilterBar';
import ColorGrid from './components/ColorGrid';
import Footer from './components/Footer';
import FavoritesPage from './components/FavoritesPage';
import AboutPage from './components/AboutPage';
import ColorDrawer from './components/ColorDrawer';
import PickerPage from './pages/PickerPage';
import LabPage from './pages/LabPage';
import SandboxPage from './pages/SandboxPage';
import TermsPage from './pages/TermsPage';
import StarMapPage from './pages/StarMapPage';

const COLORS = rawColors as unknown as ColorEntry[];
const COLORS_BY_HEX = new Map(COLORS.map((c) => [c.hex.toLowerCase(), c]));
const PAGE_SIZE = 120;

/** 拼音去声调，便于模糊搜索 */
function stripTones(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const SEARCH_INDEX = new Map(
  COLORS.map((c) => [
    c.id,
    `${c.name} ${c.hex.toLowerCase()} ${c.pinyin.toLowerCase()} ${stripTones(c.pinyin)}`,
  ]),
);

function colorFromUrl(): ColorEntry | null {
  try {
    const id = new URLSearchParams(window.location.search).get('color');
    return COLORS.find((c) => c.id === id) ?? null;
  } catch {
    return null;
  }
}

/** 分享链接 ?lab=rrggbb → 实验室初始基色 */
function labBaseFromUrl(): string | null {
  try {
    const v = new URLSearchParams(window.location.search).get('lab');
    return v && /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v.trim()) ? v : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const [themeColor, setThemeColor] = useState(initialColor);
  const [labBase] = useState(labBaseFromUrl);
  const [route, setRoute] = useState<Route>(labBase ? 'lab' : 'home');

  const [season, setSeason] = useState<Season | '全'>('全');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<ColorEntry | null>(colorFromUrl);

  const wallRef = useRef<HTMLElement>(null);

  // 主题注入 + 深浅模式
  useEffect(() => {
    applyTheme(themeColor);
  }, [themeColor]);
  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  // URL 同步：?color=<id>，关闭抽屉清参数
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected) url.searchParams.set('color', selected.id);
    else url.searchParams.delete('color');
    window.history.replaceState(null, '', url);
  }, [selected]);

  // 筛选条件变化时重置分页
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [season, category, search]);

  // 切换路由回到页首（节气页自身的定位滚动在 500ms 后执行，不受影响）
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return COLORS.filter((c) => {
      if (category !== 'all' && c.category !== category) return false;
      if (season !== '全' && c.season !== season && c.season !== '四季') return false;
      if (q && !(SEARCH_INDEX.get(c.id) ?? '').includes(q)) return false;
      return true;
    });
  }, [season, category, search]);

  const pickSeason = (s: Season | '全') => {
    setSeason(s);
    setRoute('home');
    requestAnimationFrame(() =>
      wallRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

  const handleSetTheme = (hex: string) => {
    setThemeColor(hex);
    setSelected(null);
    const entry = COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
    MessagePlugin.success(`已将「${entry?.name ?? hex}」设为全站主题`);
  };

  return (
    <>
      <TopBar
        route={route}
        onNavigate={setRoute}
        mode={mode}
        onModeChange={setMode}
        themeColor={themeColor}
      />

      {route === 'home' && (
        <main>
          <div className="wrap">
            <Hero season={season} onSelect={pickSeason} />
          </div>
          <div className="wrap">
            <hr className="hairline" />
          </div>
          <section className="wrap wall" ref={wallRef}>
            <FilterBar
              category={category}
              onCategoryChange={setCategory}
              search={search}
              onSearchChange={setSearch}
            />
            <ColorGrid
              colors={filtered.slice(0, limit)}
              total={filtered.length}
              onPick={setSelected}
              onLoadMore={() => setLimit((n) => n + PAGE_SIZE)}
            />
          </section>
        </main>
      )}

      {route === 'picker' && (
        <PickerPage colors={COLORS} onPickColor={setSelected} />
      )}
      {route === 'lab' && (
        <LabPage colors={COLORS} onPickColor={setSelected} initialBase={labBase ?? undefined} />
      )}
      {route === 'sandbox' && (
        <SandboxPage colors={COLORS} onApplyTheme={handleSetTheme} />
      )}
      {route === 'terms' && <TermsPage colors={COLORS} onPickColor={setSelected} />}
      {route === 'starmap' && (
        <StarMapPage colors={COLORS} onPickColor={setSelected} />
      )}

      {route === 'favorites' && (
        <FavoritesPage
          colors={COLORS}
          onPick={setSelected}
          onGoHome={() => setRoute('home')}
        />
      )}
      {route === 'about' && <AboutPage />}

      <Footer />

      <ColorDrawer
        color={selected}
        mode={mode}
        byHex={COLORS_BY_HEX}
        onClose={() => setSelected(null)}
        onSetTheme={handleSetTheme}
        onPickColor={setSelected}
      />
    </>
  );
}
