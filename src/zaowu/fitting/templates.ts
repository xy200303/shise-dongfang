/**
 * fitting/templates —— 「试穿间」人台注册表（KayKit Adventurers，CC0）
 *
 * 四台人台，染色格的来由见 scripts/inspect-glb.mjs（各网格 UV 顶点在 8×4 图集的分布）：
 *  - 法师 Mage：长袍大袖。手臂 UV 横跨皮肤格（cell23 占两成），染臂必串手色，
 *    故袖身随袍身格（cell8）走，不单独设槽；
 *  - 侠客 Rogue_Hooded：斗篷兜帽。手臂无皮肤格（缠手/革护臂），
 *    缠手/护臂格（cell5、cell21）单独设「缘」槽；兜帽与斗篷共用 cell9，染一格三者同染；
 *  - 铠士 Knight：银铠红袍。铠甲格（cell3/7/9 银灰）设「主」，罩袍与披风共用
 *    cell8（红）设「辅」；手臂腿部全甲无皮肤格，关节暗格（cell4/15）设「里」；
 *  - 游侠 Barbarian：赤膊毛皮。躯干 cell6 疑为晒色皮肤，不染（零串色硬指标）；
 *    裙甲 cell8 设「主」，毛披风 cell7 设「辅」，绒缘 cell10 设「缘」。
 * 皮肤格（#F6C09C 系：cell0/23/30/31 等）一律不进染色清单。
 * 「纹」槽无染色格，仅作纹样选择器入口（见 FittingRoom 的纹样层）。
 */
import type { FittingDef } from './types';

const PATTERN_SLOT = { id: 'pattern', label: '纹样', role: 'accent' } as const;

const mage: FittingDef = {
  id: 'fitting-mage',
  name: '法师',
  kind: '试穿',
  desc: '长袍大袖人台，宜观顺承层次',
  model: `${import.meta.env.BASE_URL}models/Mage.glb`,
  hidden: ['Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff'],
  slots: [
    { id: 'robe', label: '袍身', role: 'main' },
    { id: 'cape', label: '披风', role: 'secondary' },
    { id: 'hat', label: '法帽与领缘', role: 'trim' },
    { id: 'belt', label: '腰带', role: 'tie' },
    { id: 'boots', label: '裤靴', role: 'lining' },
    PATTERN_SLOT,
  ],
  dye: {
    robe: [{ cell: 8 }, { cell: 15, shade: 2 }],
    cape: [{ cell: 10 }],
    hat: [{ cell: 9 }, { cell: 3, shade: -1 }, { cell: 4, shade: -1 }],
    belt: [{ cell: 5 }],
    boots: [{ cell: 19 }, { cell: 18, shade: -1 }],
  },
  patternSlots: ['robe', 'cape'],
};

const rogue: FittingDef = {
  id: 'fitting-rogue',
  name: '侠客',
  kind: '试穿',
  desc: '斗篷劲装人台，宜观对比章法',
  model: `${import.meta.env.BASE_URL}models/Rogue_Hooded.glb`,
  hidden: ['Knife', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Throwable'],
  slots: [
    { id: 'tunic', label: '劲装', role: 'main' },
    { id: 'cloak', label: '斗篷兜帽', role: 'secondary' },
    { id: 'wraps', label: '缠手', role: 'trim' },
    { id: 'belt', label: '腰带', role: 'tie' },
    { id: 'pants', label: '裤靴', role: 'lining' },
    PATTERN_SLOT,
  ],
  dye: {
    tunic: [{ cell: 8 }],
    cloak: [{ cell: 9 }],
    wraps: [{ cell: 5 }, { cell: 21 }],
    belt: [{ cell: 6 }, { cell: 15, shade: 1 }],
    pants: [{ cell: 19 }],
  },
  patternSlots: ['tunic', 'cloak'],
};

const knight: FittingDef = {
  id: 'fitting-knight',
  name: '铠士',
  kind: '试穿',
  desc: '银铠罩袍人台，宜观金革之序',
  model: `${import.meta.env.BASE_URL}models/Knight.glb`,
  hidden: [
    '1H_Sword',
    '1H_Sword_Offhand',
    '2H_Sword',
    'Badge_Shield',
    'Rectangle_Shield',
    'Round_Shield',
    'Spike_Shield',
  ],
  slots: [
    { id: 'armor', label: '铠身', role: 'main' },
    { id: 'tabard', label: '罩袍披风', role: 'secondary' },
    { id: 'trim', label: '肩甲缘', role: 'trim' },
    { id: 'belt', label: '皮带', role: 'tie' },
    { id: 'greaves', label: '胫甲关节', role: 'lining' },
    PATTERN_SLOT,
  ],
  dye: {
    armor: [{ cell: 3 }, { cell: 7 }, { cell: 9, shade: -1 }],
    tabard: [{ cell: 8 }],
    trim: [{ cell: 10, shade: -1 }],
    belt: [{ cell: 6 }],
    greaves: [{ cell: 15 }, { cell: 4, shade: 1 }],
  },
  patternSlots: ['tabard'],
};

const barbarian: FittingDef = {
  id: 'fitting-barbarian',
  name: '游侠',
  kind: '试穿',
  desc: '赤膊毛皮人台，宜观山野之气',
  model: `${import.meta.env.BASE_URL}models/Barbarian.glb`,
  hidden: ['1H_Axe', '1H_Axe_Offhand', '2H_Axe', 'Barbarian_Round_Shield', 'Mug'],
  slots: [
    { id: 'kilt', label: '裙甲', role: 'main' },
    { id: 'cape', label: '毛披风', role: 'secondary' },
    { id: 'fur', label: '绒缘', role: 'trim' },
    { id: 'bands', label: '腕带', role: 'tie' },
    { id: 'boots', label: '裤靴', role: 'lining' },
    PATTERN_SLOT,
  ],
  dye: {
    kilt: [{ cell: 8 }],
    cape: [{ cell: 7 }],
    fur: [{ cell: 10, shade: -1 }],
    bands: [{ cell: 9 }],
    boots: [{ cell: 19 }],
  },
  patternSlots: ['kilt', 'cape'],
};

export const FITTINGS: FittingDef[] = [mage, rogue, knight, barbarian];
