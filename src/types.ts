export type Category =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'purple'
  | 'brown'
  | 'neutral';

export type Season = '春' | '夏' | '秋' | '冬' | '四季';

export interface ColorEntry {
  id: string;
  name: string;
  pinyin: string;
  hex: string;
  category: Category;
  poem: string;
  poemSource: string;
  season: Season;
}

export const CATEGORY_TABS: { key: Category; label: string }[] = [
  { key: 'red', label: '红' },
  { key: 'orange', label: '橙' },
  { key: 'yellow', label: '黄' },
  { key: 'green', label: '绿' },
  { key: 'cyan', label: '青' },
  { key: 'blue', label: '蓝' },
  { key: 'purple', label: '紫' },
  { key: 'brown', label: '褐' },
  { key: 'neutral', label: '黑白灰' },
];

export const SEASONS: Season[] = ['春', '夏', '秋', '冬'];
