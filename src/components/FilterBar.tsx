import { type Category, type ColorEntry } from '../types';
import HueRibbon from './HueRibbon';

interface Props {
  colors: ColorEntry[];
  category: Category | 'all';
  onCategoryChange: (c: Category | 'all') => void;
  search: string;
  onSearchChange: (s: string) => void;
}

export default function FilterBar({ colors, category, onCategoryChange, search, onSearchChange }: Props) {
  return (
    <div className="filter-row">
      <HueRibbon colors={colors} value={category} onChange={onCategoryChange} />
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
