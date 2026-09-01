import { toggleFavorite, useFavorites } from '../favorites';
import type { ColorEntry } from '../types';

interface Props {
  colors: ColorEntry[];
  total: number;
  onPick: (c: ColorEntry) => void;
  onLoadMore: () => void;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden>
      <path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 1 1 12 6.1a5 5 0 1 1 7.5 6.5Z" />
    </svg>
  );
}

export default function ColorGrid({ colors, total, onPick, onLoadMore }: Props) {
  const favIds = useFavorites();
  return (
    <>
      <div className="color-grid">
        {colors.map((c) => {
          const fav = favIds.includes(c.id);
          return (
            <div key={c.id} className="color-card" onClick={() => onPick(c)}>
              <div className="color-swatch" style={{ backgroundColor: c.hex }}>
                <button
                  className={`fav-btn${fav ? ' faved' : ''}`}
                  title={fav ? '取消收藏' : '收藏'}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(c.id);
                  }}
                >
                  <HeartIcon filled={fav} />
                </button>
              </div>
              <p className="color-name">{c.name}</p>
              <p className="color-pinyin">{c.pinyin}</p>
            </div>
          );
        })}
        {colors.length === 0 && (
          <div className="grid-empty">未找到匹配的颜色，换个关键词试试</div>
        )}
      </div>
      {colors.length < total && (
        <div className="load-more-row">
          <button className="load-more-btn" onClick={onLoadMore}>
            加载更多（{colors.length} / {total}）
          </button>
        </div>
      )}
    </>
  );
}
