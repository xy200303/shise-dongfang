/**
 * 物件模板三件：团扇 / 油纸伞 / 灯笼
 * 平面剪影插画，插槽色经引擎配色规则着色（见 zaowu/types.ts）。
 */
import PatternDefs, { patternUrl } from '../patterns';
import type { TemplateDef } from '../types';

/* ---------- 团扇：素面团扇，兰草入画 ---------- */
export const tuan: TemplateDef = {
  id: 'tuan',
  name: '团扇',
  kind: '物件',
  desc: '素扇团栾，兰草入画，纨扇之雅',
  viewBox: '0 0 400 500',
  slots: [
    { id: 'face', label: '扇面', role: 'main' },
    { id: 'frame', label: '扇缘', role: 'trim' },
    { id: 'rib', label: '扇柄', role: 'tie' },
    { id: 'tassel', label: '流苏', role: 'secondary' },
    { id: 'art', label: '扇面画', role: 'accent' },
  ],
  render: (c) => (
    <g>
      <PatternDefs id="tuan" bg={c.face} line={c.art} />
      {/* 扇面 */}
      <circle cx="200" cy="180" r="140" fill={c.face} />
      <circle cx="200" cy="180" r="132" fill={patternUrl('tuan', 'chan')} opacity="0.35" />
      {/* 兰草 */}
      <g fill="none" stroke={c.art} strokeLinecap="round">
        <path d="M150 262 C158 224 178 202 208 190" strokeWidth="2.6" />
        <path d="M170 270 C188 244 216 232 248 230" strokeWidth="2.6" />
        <path d="M196 268 C212 250 236 244 258 246" strokeWidth="2" />
        <path d="M142 246 C136 228 138 210 148 196" strokeWidth="2" />
      </g>
      <circle cx="212" cy="186" r="4.5" fill={c.art} />
      <circle cx="228" cy="196" r="3.5" fill={c.art} />
      <circle cx="152" cy="192" r="3.5" fill={c.art} />
      {/* 扇缘 */}
      <circle cx="200" cy="180" r="140" fill="none" stroke={c.frame} strokeWidth="10" />
      <circle cx="200" cy="180" r="127" fill="none" stroke={c.frame} strokeWidth="1.6" opacity="0.6" />
      {/* 柄 */}
      <rect x="188" y="296" width="24" height="18" rx="5" fill={c.frame} />
      <rect x="193" y="310" width="14" height="128" rx="6" fill={c.rib} />
      {/* 流苏 */}
      <line x1="200" y1="438" x2="200" y2="462" stroke={c.tassel} strokeWidth="2.4" />
      <rect x="190" y="462" width="20" height="18" rx="6" fill={c.tassel} />
      {[192, 197, 202, 207].map((x) => (
        <line key={x} x1={x} y1="480" x2={x - 1} y2="520" stroke={c.tassel} strokeWidth="2" strokeLinecap="round" />
      ))}
    </g>
  ),
};

/* ---------- 油纸伞：八瓣伞面，伞骨如星 ---------- */
const SAN_JOINTS = [36, 83, 130, 177, 223, 270, 317, 364];
const SAN_SCALLOP =
  'Q340 258 317 240 Q293 258 270 240 Q246 258 223 240 Q200 258 177 240 Q153 258 130 240 Q106 258 83 240 Q59 258 36 240';

export const san: TemplateDef = {
  id: 'san',
  name: '油纸伞',
  kind: '物件',
  desc: '桐油纸面，竹骨如星，烟雨之用',
  viewBox: '0 0 400 460',
  slots: [
    { id: 'canopy', label: '伞面', role: 'main' },
    { id: 'panel', label: '隔瓣', role: 'secondary' },
    { id: 'edge', label: '伞缘', role: 'trim' },
    { id: 'rib', label: '伞骨', role: 'accent' },
    { id: 'handle', label: '伞柄', role: 'tie' },
  ],
  render: (c) => {
    const apex = { x: 200, y: 76 };
    return (
      <g>
        {/* 伞面主色 */}
        <path d={`M36 240 Q200 30 364 240 ${SAN_SCALLOP} Z`} fill={c.canopy} />
        {/* 隔瓣间色 */}
        {SAN_JOINTS.slice(0, -1).map((x1, i) => {
          if (i % 2 === 0) return null;
          const x2 = SAN_JOINTS[i + 1];
          return (
            <path
              key={x1}
              d={`M${apex.x} ${apex.y} L${x1} 240 L${x2} 240 Z`}
              fill={c.panel}
              opacity="0.9"
            />
          );
        })}
        {/* 伞骨 */}
        {SAN_JOINTS.map((x) => (
          <line key={x} x1={apex.x} y1={apex.y} x2={x} y2="240" stroke={c.rib} strokeWidth="1.8" opacity="0.8" />
        ))}
        {/* 伞缘 */}
        <path d={`M364 240 ${SAN_SCALLOP}`} fill="none" stroke={c.edge} strokeWidth="5" strokeLinecap="round" />
        {/* 伞顶与伞柄 */}
        <rect x="193" y="58" width="14" height="20" rx="4" fill={c.edge} />
        <line x1="200" y1="240" x2="200" y2="404" stroke={c.handle} strokeWidth="6" strokeLinecap="round" />
        <circle cx="200" cy="252" r="7" fill={c.handle} />
      </g>
    );
  },
};

/* ---------- 灯笼：圆腹垂穗，灯花映彩 ---------- */
export const deng: TemplateDef = {
  id: 'deng',
  name: '灯笼',
  kind: '物件',
  desc: '圆腹垂穗，灯花映彩，上元之暖',
  viewBox: '0 0 400 500',
  slots: [
    { id: 'body', label: '灯身', role: 'main' },
    { id: 'rib', label: '灯骨', role: 'trim' },
    { id: 'cap', label: '上下口', role: 'secondary' },
    { id: 'tassel', label: '灯穗', role: 'tie' },
    { id: 'art', label: '灯花', role: 'accent' },
  ],
  render: (c) => (
    <g>
      {/* 提杆 */}
      <line x1="200" y1="20" x2="200" y2="62" stroke={c.rib} strokeWidth="3" />
      {/* 上口 */}
      <rect x="160" y="62" width="80" height="30" rx="6" fill={c.cap} />
      {/* 灯身 */}
      <path d="M160 92 C100 132 100 328 160 368 L240 368 C300 328 300 132 240 92 Z" fill={c.body} />
      {/* 灯骨 */}
      {[-2, -1, 0, 1, 2].map((k) => (
        <path
          key={k}
          d={`M${200 + k * 28} 92 C${200 + k * 46} 150 ${200 + k * 46} 310 ${200 + k * 28} 368`}
          fill="none"
          stroke={c.rib}
          strokeWidth="1.8"
          opacity="0.75"
        />
      ))}
      {/* 灯花 */}
      <circle cx="200" cy="230" r="46" fill="none" stroke={c.art} strokeWidth="3" />
      <path d="M200 198 L232 230 L200 262 L168 230 Z" fill="none" stroke={c.art} strokeWidth="2.6" />
      <circle cx="200" cy="230" r="7" fill={c.art} />
      {/* 下口 */}
      <rect x="160" y="368" width="80" height="30" rx="6" fill={c.cap} />
      {/* 灯穗 */}
      <line x1="200" y1="398" x2="200" y2="424" stroke={c.tassel} strokeWidth="2.6" />
      <circle cx="200" cy="430" r="6" fill={c.tassel} />
      <rect x="186" y="436" width="28" height="14" rx="5" fill={c.tassel} />
      {[188, 194, 200, 206, 212].map((x) => (
        <line key={x} x1={x} y1="450" x2={x - 1} y2="490" stroke={c.tassel} strokeWidth="2.2" strokeLinecap="round" />
      ))}
    </g>
  ),
};
