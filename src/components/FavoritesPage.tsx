import { MessagePlugin } from 'tdesign-react';
import type { ColorEntry } from '../types';
import { useFavorites } from '../favorites';
import ColorGrid from './ColorGrid';

interface Props {
  colors: ColorEntry[];
  onPick: (c: ColorEntry) => void;
  onGoHome: () => void;
}

export default function FavoritesPage({ colors, onPick, onGoHome }: Props) {
  const favIds = useFavorites();
  const favColors = favIds
    .map((id) => colors.find((c) => c.id === id))
    .filter((c): c is ColorEntry => !!c);

  const exportList = async () => {
    const text = favColors.map((c) => `${c.name} ${c.hex}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    MessagePlugin.success(`已复制 ${favColors.length} 条收藏清单`);
  };

  if (favColors.length === 0) {
    return (
      <main className="wrap favorites-empty">
        <div className="seal-placeholder">
          <span className="seal-char">藏</span>
        </div>
        <p className="favorites-empty-text">把心动的颜色收进囊中</p>
        <button className="load-more-btn" onClick={onGoHome}>
          去逛逛
        </button>
      </main>
    );
  }

  return (
    <main className="wrap favorites-page">
      <div className="favorites-head">
        <p className="favorites-count">
          共收藏 <em>{favColors.length}</em> 色
        </p>
        <button className="load-more-btn" onClick={exportList}>
          导出清单
        </button>
      </div>
      <ColorGrid
        colors={favColors}
        total={favColors.length}
        onPick={onPick}
        onLoadMore={() => {}}
      />
    </main>
  );
}
