/**
 * zaowu/types —— 造物模板引擎的类型定义
 *
 * 一件衣物/物件 = 一份参数化模板：SVG 部件 + 可着色插槽 + 角色语义。
 * 插槽按角色（主/辅/缘/系/里/纹）由配色规则引擎统一着色（见 solver.ts），
 * 新增物件只需注册新模板，不动框架。
 */
import type { ReactNode } from 'react';

/** 插槽角色：配色规则按角色而非具体部件着色 */
export type SlotRole = 'main' | 'secondary' | 'trim' | 'tie' | 'lining' | 'accent';

export const ROLE_LABEL: Record<SlotRole, string> = {
  main: '主',
  secondary: '辅',
  trim: '缘',
  tie: '系',
  lining: '里',
  accent: '纹',
};

export interface SlotDef {
  id: string;
  /** 部件名：衣身 / 扇面 / 伞骨… */
  label: string;
  role: SlotRole;
}

export interface TemplateDef {
  id: string;
  name: string;
  kind: '服饰' | '物件';
  desc: string;
  slots: SlotDef[];
  viewBox: string;
  /** colors: slotId → hex（含图案插槽），返回完整 SVG 内容 */
  render: (colors: Record<string, string>) => ReactNode;
}

/** 配色规则：顺承 / 对比 / 五色 / 节气 */
export type RuleId = 'cascade' | 'contrast' | 'wuse' | 'solar';

export interface RuleDef {
  id: RuleId;
  name: string;
  desc: string;
}

export const RULES: RuleDef[] = [
  { id: 'cascade', name: '顺承', desc: '类似色自上而下，上浅下深' },
  { id: 'contrast', name: '对比', desc: '主辅互补，缘边取暗级' },
  { id: 'wuse', name: '五色', desc: '青赤黄白黑，相生转位' },
  { id: 'solar', name: '节气', desc: '取今日节气之色造物' },
];
