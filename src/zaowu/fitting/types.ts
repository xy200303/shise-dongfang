/**
 * fitting/types —— 「试穿间」人台模板定义
 *
 * 与 2D 造物模板（zaowu/types.ts 的 TemplateDef）同构：同一份插槽/角色语义，
 * 多出的字段描述 3D 资产——模型路径、默认隐藏的武器节点、插槽 → 图集格染色清单。
 * 图集格序号的来由见 scripts/inspect-glb.mjs（各网格 UV 顶点在 8×4 图集上的分布）。
 */
import type { SlotDef } from '../types';
import type { CellDye } from './dye';

export interface FittingDef {
  id: string;
  name: string;
  kind: '试穿';
  desc: string;
  /** GLB 路径（public 下） */
  model: string;
  /** 默认隐藏的节点名（武器配件） */
  hidden: string[];
  slots: SlotDef[];
  /** slotId → 图集格染色清单 */
  dye: Record<string, CellDye[]>;
  /** 可印纹样的插槽（主/辅面料格） */
  patternSlots: string[];
}
