import { Switch } from 'tdesign-react';
import { useFavorites } from '../favorites';
import type { ThemeMode } from '../theme';

export type Route =
  | 'home'
  | 'picker'
  | 'lab'
  | 'sandbox'
  | 'terms'
  | 'starmap'
  | 'favorites'
  | 'about';

interface Props {
  route: Route;
  onNavigate: (r: Route) => void;
  mode: ThemeMode;
  onModeChange: (m: ThemeMode) => void;
  themeColor: string;
}

const NAV: { key: Route; label: string }[] = [
  { key: 'home', label: '色谱' },
  { key: 'picker', label: '拾色' },
  { key: 'lab', label: '实验室' },
  { key: 'sandbox', label: '沙盒' },
  { key: 'terms', label: '节气' },
  { key: 'starmap', label: '星图' },
  { key: 'favorites', label: '收藏' },
  { key: 'about', label: '关于' },
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
              {n.key === 'favorites' && favCount > 0 && (
                <span className="nav-badge">{favCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="topbar-controls">
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
