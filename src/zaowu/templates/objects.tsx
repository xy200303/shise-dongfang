/**
 * 物件模板两件（手绘 2D 版留存底稿）：油纸伞 / 灯笼
 * 团扇已升级为 Miora 矢量插画模板（templates/illustrated.ts）；
 * 油纸伞/灯笼在器架中由程序化 3D 版（objects3d/）呈现。
 */
import type { TemplateDef } from '../types';

/* ---------- 油纸伞：八瓣伞面，伞骨如星 ---------- */

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
