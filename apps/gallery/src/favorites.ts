import { useSyncExternalStore } from 'react';

const KEY = 'gallery-favorites';

function load(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** 收藏 id 列表（不可变更新，保证 useSyncExternalStore 快照稳定） */
let favorites: string[] = load();
const listeners = new Set<() => void>();

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(favorites));
  } catch {
    /* 隐私模式等场景静默降级 */
  }
  listeners.forEach((l) => l());
}

export function isFavorite(id: string): boolean {
  return favorites.includes(id);
}

/** 切换收藏，返回切换后的状态 */
export function toggleFavorite(id: string): boolean {
  favorites = favorites.includes(id)
    ? favorites.filter((x) => x !== id)
    : [...favorites, id];
  emit();
  return favorites.includes(id);
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot(): string[] {
  return favorites;
}

/** 订阅收藏列表，TopBar 角标 / 抽屉 / 收藏页自动同步 */
export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}
