/**
 * zaowu/patterns —— 可着色传统纹样（SVG pattern）
 *
 * 云纹 / 回纹 / 缠枝三式，底色与纹线皆由插槽色注入：
 * 衣料 = 主色暗级铺底 + 主色浅级走纹，全部从引擎色阶推导。
 * 模板在自身 <svg> 内嵌 <PatternDefs>，按 url(#<id>-yun) 引用。
 */

interface Props {
  /** 模板内唯一前缀（避免多模板同页时 pattern id 冲突） */
  id: string;
  /** 纹样底色（一般为插槽主色） */
  bg: string;
  /** 纹线色（一般为同色系浅级或纹色） */
  line: string;
}

export function patternUrl(id: string, name: 'yun' | 'hui' | 'chan'): string {
  return `url(#${id}-${name})`;
}

export default function PatternDefs({ id, bg, line }: Props) {
  return (
    <defs>
      {/* 云纹：卷云流转 */}
      <pattern id={`${id}-yun`} width="56" height="56" patternUnits="userSpaceOnUse">
        <rect width="56" height="56" fill={bg} />
        <g fill="none" stroke={line} strokeWidth="1.6" strokeLinecap="round">
          <path d="M14 40c-5-2-7-9-4-14 3-6 11-8 17-5 5 3 7 10 4 15-3 4-10 5-13 1" />
          <path d="M16 44h22" />
          <path d="M40 18c-3-1-4-5-2-8 2-3 6-4 9-2 3 2 4 6 2 8-2 2-5 3-7 1" />
        </g>
      </pattern>

      {/* 回纹：方折连绵，富贵不断头 */}
      <pattern id={`${id}-hui`} width="26" height="26" patternUnits="userSpaceOnUse">
        <rect width="26" height="26" fill={bg} />
        <path
          d="M3 23V7h16v12H9v-6h6"
          fill="none"
          stroke={line}
          strokeWidth="1.8"
          strokeLinecap="square"
        />
      </pattern>

      {/* 缠枝：枝蔓相缠，生生不息 */}
      <pattern id={`${id}-chan`} width="72" height="48" patternUnits="userSpaceOnUse">
        <rect width="72" height="48" fill={bg} />
        <g fill="none" stroke={line} strokeWidth="1.5" strokeLinecap="round">
          <path d="M-4 30C10 14 26 44 40 28S66 12 76 28" />
          <path d="M18 30c2-6 8-8 12-6-2 5-8 8-12 6Z" fill={line} stroke="none" />
          <path d="M50 22c2-6 8-8 12-6-2 5-8 8-12 6Z" fill={line} stroke="none" />
          <circle cx="34" cy="38" r="2.4" fill={line} stroke="none" />
          <circle cx="66" cy="34" r="2.4" fill={line} stroke="none" />
        </g>
      </pattern>
    </defs>
  );
}
