/**
 * objects3d/templates —— 程序化 3D 物件注册表：油纸伞 / 油纸伞·混元 / 灯笼
 *
 * 槽位语义沿用 2D 模板（zaowu/templates/objects.tsx），渲染换成程序化建模
 * （builders.ts）或混元 GLB（hunyuanSan.ts）。团扇保持 2D，不在此登记。
 */
import type { SlotDef } from '../types';
import { buildLantern, buildUmbrella } from './builders';
import { buildHunYuanSan } from './hunyuanSan';
import type { Object3DDef } from './types';

const PATTERN_SLOT: SlotDef = { id: 'pattern', label: '纹样', role: 'accent' };

export const san3d: Object3DDef = {
  id: 'san',
  name: '油纸伞',
  kind: '物件3D',
  desc: '桐油纸面，竹骨如星，烟雨之用',
  spin: true,
  slots: [
    { id: 'canopy', label: '伞面', role: 'main' },
    { id: 'panel', label: '隔瓣', role: 'secondary' },
    { id: 'edge', label: '伞缘', role: 'trim' },
    { id: 'rib', label: '伞骨', role: 'accent' },
    { id: 'handle', label: '伞柄', role: 'tie' },
    PATTERN_SLOT,
  ],
  build: (T, colors, pattern) => buildUmbrella(T, colors, pattern),
};

/** 混元图生 3D 伞：GLB 模型 + mask 分族染色；自动 UV 太碎不支持纹样（无纹槽） */
export const hunyuanSan: Object3DDef = {
  id: 'san-hy',
  name: '油纸伞·混元',
  kind: '物件3D',
  desc: '混元图生绢伞，竹骨清影，以真入画',
  spin: true,
  slots: [
    { id: 'canopy', label: '伞面', role: 'main' },
    { id: 'rib', label: '伞骨', role: 'tie' },
  ],
  build: (T, colors) => buildHunYuanSan(T, colors),
};

export const deng3d: Object3DDef = {
  id: 'deng',
  name: '灯笼',
  kind: '物件3D',
  desc: '圆腹垂穗，灯花映彩，上元之暖',
  slots: [
    { id: 'body', label: '灯身', role: 'main' },
    { id: 'rib', label: '灯骨', role: 'trim' },
    { id: 'cap', label: '上下口', role: 'secondary' },
    { id: 'tassel', label: '灯穗', role: 'tie' },
    { id: 'art', label: '灯花', role: 'accent' },
  ],
  build: (T, colors) => buildLantern(T, colors),
};

export const OBJECTS_3D: Object3DDef[] = [san3d, hunyuanSan, deng3d];
