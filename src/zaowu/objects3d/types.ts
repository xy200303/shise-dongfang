/**
 * objects3d/types —— 程序化 3D 物件（油纸伞 / 灯笼）的模板定义
 *
 * 与 2D 模板（zaowu/types.ts）同构：同一份插槽/角色语义，
 * slots 沿用 2D 版（objects.tsx）的命名；build 由 ObjectRoom 调用。
 */
import type { SlotDef } from '../types';
import type { PatternKind } from '../fitting/patterns';

export interface BuiltObject {
  group: import('three').Group;
  /** 换色/换纹：重绘画布纹理 + 更新实色材质 */
  update(colors: Record<string, string>, pattern: PatternKind): void;
  /** 墨夜/月庭下「点灯」（灯笼内光与自发光；伞为空操作） */
  setLit(lit: boolean): void;
  dispose(): void;
}

export interface Object3DDef {
  id: string;
  name: string;
  kind: '物件3D';
  desc: string;
  slots: SlotDef[];
  build: (
    THREE: typeof import('three'),
    colors: Record<string, string>,
    pattern: PatternKind,
  ) => BuiltObject;
}
