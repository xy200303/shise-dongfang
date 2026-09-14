/**
 * zaowu/RackIcon —— 器架栏条目的几何小图标
 *
 * 24×24 线性剪影（stroke 取 currentColor，选中态随名称染朱砂）。
 * 2D 模板不复用模板 SVG 本体：模板内 <pattern> id 与舞台实例会冲突，
 * 故各配一笔极简剪影；人台为极简小人形；器物（douli/meiping/…）
 * 为六件器形侧影，供器架栏与器物馆的 .chip-icon 选择器共用。
 */

interface Props {
  /** 器架条目 id（模板 / vessels / fitting-*） */
  id: string;
}

const GLYPHS: Record<string, JSX.Element> = {
  // 曲裾深衣：长衣宽袖
  quju: (
    <path d="M9 4 5 8l2.5 3L9 10l-.5 10h7L15 10l1.5 1L19 8l-4-4q-3 2-6 0Z" />
  ),
  // 齐胸襦裙：短襦 + 高腰长裙 + 披帛
  ruqun: (
    <>
      <path d="M9 3.5h6l1 4.5H8l1-4.5Z" />
      <path d="M8 8 5.5 20.5h13L16 8" />
      <path d="M4.5 6Q12 10.5 19.5 6" />
    </>
  ),
  // 马面裙：梯形裙门 + 褶线
  mamian: (
    <>
      <path d="M8 3.5h8l3 17H5l3-17Z" />
      <path d="M9.8 5.5v13M12 5.5v13M14.2 5.5v13" />
    </>
  ),
  // 团扇：圆面 + 柄
  tuan: (
    <>
      <circle cx="12" cy="9.5" r="6" />
      <path d="M12 15.5V21" />
    </>
  ),
  // 油纸伞：伞面弧 + 伞骨 + 柄（混元伞条目共用此剪影）
  san: (
    <>
      <path d="M3 11.5Q12 3 21 11.5" />
      <path d="M12 4.5v7M6.8 6.8 9.3 11.5M17.2 6.8l-2.5 4.7" />
      <path d="M12 11.5V20q0 1.5 1.5 1.5" />
    </>
  ),
  'san-hy': (
    <>
      <path d="M3 11.5Q12 3 21 11.5" />
      <path d="M12 4.5v7M6.8 6.8 9.3 11.5M17.2 6.8l-2.5 4.7" />
      <path d="M12 11.5V20q0 1.5 1.5 1.5" />
    </>
  ),
  // 灯笼：椭圆身 + 上下箍 + 穗
  deng: (
    <>
      <ellipse cx="12" cy="11" rx="6" ry="7" />
      <path d="M9 4h6M9 18h6M12 18v3.5" />
      <path d="M8.2 4.8Q6.5 11 8.2 17.2M15.8 4.8Q17.5 11 15.8 17.2" />
    </>
  ),
  // 釉色器物：梅瓶侧影
  vessels: (
    <>
      <path d="M10 3h4" />
      <path d="M11 3c-1 3-4 4-4 8 0 4 2 7 5 7s5-3 5-7c0-4-3-5-4-8" />
      <path d="M9.5 21h5" />
    </>
  ),
  // 法师人台：宽檐帽小人
  'fitting-mage': (
    <>
      <path d="M12 1.5 15 6H9l3-4.5Z" />
      <path d="M6.5 6.5h11" />
      <path d="M8 21l1-10q3-2 6 0l1 10h-8Z" />
    </>
  ),
  // 侠客人台：兜帽小人
  'fitting-rogue': (
    <>
      <path d="M8.5 8Q12 2 15.5 8" />
      <path d="M8 21l1-10q3-2 6 0l1 10h-8Z" />
    </>
  ),
  // 铠士人台：护面盔小人
  'fitting-knight': (
    <>
      <path d="M8 7Q8 2.5 12 2.5T16 7" />
      <path d="M8 7h8" />
      <path d="M10.5 4.8v2.2M13.5 4.8v2.2" />
      <path d="M8 21l1-10q3-2 6 0l1 10h-8Z" />
    </>
  ),
  // 游侠人台：毛冠小人
  'fitting-barbarian': (
    <>
      <path d="M8.5 7Q7 4 5.5 4.5M15.5 7Q17 4 18.5 4.5" />
      <path d="M8.5 7Q12 3 15.5 7" />
      <path d="M8 21l1-10q3-2 6 0l1 10h-8Z" />
    </>
  ),
  /* ---------- 器物剪影（与器架栏同一套线性语言） ---------- */
  // 斗笠盏：撇口浅腹，斗笠之形
  douli: (
    <>
      <path d="M3.5 8h17L14 15.5h-4L3.5 8Z" />
      <path d="M10.5 18.5h3" />
    </>
  ),
  // 梅瓶：小口丰肩（同器架栏「釉色器物」的瓶影）
  meiping: (
    <>
      <path d="M10 3h4" />
      <path d="M11 3c-1 3-4 4-4 8 0 4 2 7 5 7s5-3 5-7c0-4-3-5-4-8" />
      <path d="M9.5 21h5" />
    </>
  ),
  // 玉壶春瓶：撇口细颈垂腹
  yuhuchun: (
    <>
      <path d="M9 3h6" />
      <path d="M10 3q-1 3 .8 5Q7.5 10.5 8.5 15q1 4.5 3.5 4.5t3.5-4.5q1-4.5-2.3-7Q15 6 14 3" />
      <path d="M10 21h4" />
    </>
  ),
  // 天球瓶：长颈球腹
  tianqiu: (
    <>
      <path d="M10.5 3h3l-.4 6h-2.2l-.4-6Z" />
      <circle cx="12" cy="14.5" r="5.5" />
      <path d="M9.5 21h5" />
    </>
  ),
  // 钵：敛口深腹
  bo: (
    <>
      <path d="M8 8Q6.5 16 12 16.5Q17.5 16 16 8" />
      <path d="M8 8q4 2 8 0" />
      <path d="M10.5 19.5h3" />
    </>
  ),
  // 折沿盘：浅腹折沿
  zheyan: (
    <>
      <path d="M3 9h18" />
      <path d="M6 9q1.5 5 6 5t6-5" />
      <path d="M10.5 17.5h3" />
    </>
  ),
};

export default function RackIcon({ id }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {GLYPHS[id] ?? <circle cx="12" cy="12" r="7" />}
    </svg>
  );
}
