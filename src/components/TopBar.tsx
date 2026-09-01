import { Switch } from 'tdesign-react';
import { useFavorites } from '../favorites';
import type { ThemeMode } from '../theme';

export type Route =
  | 'home'
  | 'terms'
  | 'gallery'
  | 'zaowu'
  | 'bench'
  | 'favorites'
  | 'about';

interface Props {
  route: Route;
  onNavigate: (r: Route) => void;
  mode: ThemeMode;
  onModeChange: (m: ThemeMode) => void;
  themeColor: string;
}

/** 主导航：两条叙事线——看色（色谱/节气/观色）与用色（工作台） */
const NAV: { key: Route; label: string }[] = [
  { key: 'home', label: '色谱' },
  { key: 'terms', label: '节气' },
  { key: 'gallery', label: '观色' },
  { key: 'zaowu', label: '造物' },
  { key: 'bench', label: '工作台' },
];

export default function TopBar({ route, onNavigate, mode, onModeChange, themeColor }: Props) {
  const favCount = useFavorites().length;
  const logo = `${import.meta.env.BASE_URL}${mode === 'dark' ? 'logo-icon-dark.png' : 'logo-icon.png'}`;
  return (
    <header className="topbar">
      <div className="wrap topbar-inner">
        <div className="topbar-brand" onClick={() => onNavigate('home')}>
          <img className="topbar-logo" src={logo} alt="拾色 · 东方" />
          <span className="topbar-title">拾色 · 东方</span>
        </div>
        <nav className="topbar-nav">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`nav-link${route === n.key ? ' active' : ''}`}
              onClick={() => onNavigate(n.key)}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="topbar-controls">
          <button
            className={`nav-link nav-util${route === 'favorites' ? ' active' : ''}`}
            onClick={() => onNavigate('favorites')}
          >
            收藏
            {favCount > 0 && <span className="nav-badge">{favCount}</span>}
          </button>
          <button
            className={`nav-link nav-util${route === 'about' ? ' active' : ''}`}
            onClick={() => onNavigate('about')}
          >
            关于
          </button>
          <Switch
            value={mode === 'dark'}
            onChange={(v) => onModeChange(v ? 'dark' : 'light')}
            size="small"
          />
          <span className="accent-dot" style={{ background: themeColor }} title={`当前主题色 ${themeColor}`} />
        </div>
      </div>
    </header>
  );
}
