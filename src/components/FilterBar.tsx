import { CATEGORY_TABS, type Category } from '../types';

interface Props {
  category: Category | 'all';
  onCategoryChange: (c: Category | 'all') => void;
  search: string;
  onSearchChange: (s: string) => void;
}

export default function FilterBar({ category, onCategoryChange, search, onSearchChange }: Props) {
  return (
    <div className="filter-row">
      <div className="filter-tabs">
        {CATEGORY_TABS.map((t) => (
          <button
            key={t.key}
            className={`filter-tab${category === t.key ? ' active' : ''}`}
            onClick={() => onCategoryChange(category === t.key ? 'all' : t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="search-box">
        <input
          type="text"
          value={search}
          placeholder="搜索色名 / 拼音 / HEX"
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
