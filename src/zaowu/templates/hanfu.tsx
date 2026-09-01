/**
 * 服饰模板三件：曲裾深衣 / 齐胸襦裙 / 明制马面裙
 * 平面剪影插画，插槽色经引擎配色规则着色（见 zaowu/types.ts）。
 */
import PatternDefs, { patternUrl } from '../patterns';
import type { TemplateDef } from '../types';

/* ---------- 曲裾深衣：长衣绕襟，宽袖收袂 ---------- */
const QUJU_BODY =
  'M140 84 L100 108 L52 280 L96 292 L124 210 L116 490 L284 490 L276 210 L304 292 L348 280 L300 108 L260 84 Q200 102 140 84 Z';

export const quju: TemplateDef = {
  id: 'quju',
  name: '曲裾深衣',
  kind: '服饰',
  desc: '长衣绕襟，宽袖收袂，汉风之正',
  viewBox: '0 0 400 520',
  slots: [
    { id: 'body', label: '衣身', role: 'main' },
    { id: 'trim', label: '衣缘', role: 'trim' },
    { id: 'tie', label: '腰带', role: 'tie' },
    { id: 'lining', label: '中衣', role: 'lining' },
    { id: 'pattern', label: '衣纹', role: 'accent' },
  ],
  render: (c) => (
    <g>
      <PatternDefs id="quju" bg={c.body} line={c.pattern} />
      {/* 衣身（云纹提花） */}
      <path d={QUJU_BODY} fill={patternUrl('quju', 'yun')} />
      {/* 中衣交领 */}
      <path d="M168 88 L200 168 L232 88 Q200 100 168 88 Z" fill={c.lining} />
      {/* 绕襟曲裾 */}
      <path d="M250 88 L150 302 L182 324 L282 102 Z" fill={c.trim} />
      <path d="M168 88 L200 168 L232 88" fill="none" stroke={c.trim} strokeWidth="6" />
      {/* 袖缘 */}
      <path d="M52 280 L96 292 L98 268 L58 256 Z" fill={c.trim} />
      <path d="M348 280 L304 292 L302 268 L342 256 Z" fill={c.trim} />
      {/* 裾缘 */}
      <path d="M116 452 L284 452 L284 490 L116 490 Z" fill={c.trim} />
      {/* 腰带 */}
      <path d="M132 266 L268 266 L272 296 L128 296 Z" fill={c.tie} />
      <rect x="188" y="270" width="24" height="22" rx="4" fill={c.trim} />
    </g>
  ),
};

/* ---------- 齐胸襦裙：短襦高腰，披帛绕肩 ---------- */
export const ruqun: TemplateDef = {
  id: 'ruqun',
  name: '齐胸襦裙',
  kind: '服饰',
  desc: '短襦高腰，披帛绕肩，唐制之明艳',
  viewBox: '0 0 400 520',
  slots: [
    { id: 'top', label: '上襦', role: 'main' },
    { id: 'collar', label: '襦领', role: 'trim' },
    { id: 'skirt', label: '下裙', role: 'secondary' },
    { id: 'tie', label: '裙头带', role: 'tie' },
    { id: 'shawl', label: '披帛', role: 'accent' },
    { id: 'pattern', label: '裙纹', role: 'accent' },
  ],
  render: (c) => (
    <g>
      <PatternDefs id="ruqun" bg={c.skirt} line={c.pattern} />
      {/* 下裙（缠枝提花） */}
      <path d="M134 200 L266 200 L312 490 L88 490 Z" fill={patternUrl('ruqun', 'chan')} />
      {/* 上襦 */}
      <path
        d="M150 84 L118 104 L96 196 L124 204 L136 150 L134 214 L266 214 L264 150 L276 204 L304 196 L282 104 L250 84 Q200 100 150 84 Z"
        fill={c.top}
      />
      {/* 交领 */}
      <path d="M168 88 L200 152 L232 88" fill="none" stroke={c.collar} strokeWidth="6" />
      <path d="M150 84 Q200 100 250 84 L250 98 Q200 114 150 98 Z" fill={c.collar} />
      {/* 袖缘 */}
      <path d="M96 196 L124 204 L126 186 L100 178 Z" fill={c.collar} />
      <path d="M304 196 L276 204 L274 186 L300 178 Z" fill={c.collar} />
      {/* 裙头带 */}
      <path d="M134 196 L266 196 L268 216 L132 216 Z" fill={c.tie} />
      {/* 披帛：窄幅绕肩，飘然而下 */}
      <path d="M150 84 C126 132 114 226 120 332 L133 337 C127 238 139 146 161 92 Z" fill={c.shawl} opacity="0.88" />
      <path d="M250 84 C274 132 286 226 280 332 L267 337 C273 238 261 146 239 92 Z" fill={c.shawl} opacity="0.88" />
    </g>
  ),
};

/* ---------- 明制马面裙：立领袄 + 马面裙 ---------- */
export const mamian: TemplateDef = {
  id: 'mamian',
  name: '马面裙',
  kind: '服饰',
  desc: '立领对襟，马面平展，明制之端丽',
  viewBox: '0 0 400 520',
  slots: [
    { id: 'ao', label: '袄身', role: 'main' },
    { id: 'collar', label: '立领', role: 'trim' },
    { id: 'panel', label: '马面', role: 'secondary' },
    { id: 'pleat', label: '裙褶', role: 'secondary' },
    { id: 'border', label: '底襕', role: 'trim' },
    { id: 'tie', label: '系带', role: 'tie' },
    { id: 'pattern', label: '袄纹', role: 'accent' },
  ],
  render: (c) => (
    <g>
      <PatternDefs id="mamian" bg={c.ao} line={c.pattern} />
      {/* 裙褶底 */}
      <path d="M136 268 L264 268 L300 490 L100 490 Z" fill={c.pleat} />
      {[128, 152, 248, 272].map((x) => (
        <line key={x} x1={x} y1={272} x2={x - (x - 200) * 0.12} y2={486} stroke={c.border} strokeWidth="1.4" opacity="0.55" />
      ))}
      {/* 马面平幅 */}
      <path d="M164 268 L236 268 L248 490 L152 490 Z" fill={c.panel} />
      {/* 底襕 */}
      <path d="M104 446 L296 446 L300 470 L100 470 Z" fill={c.border} />
      <path d="M152 446 L248 446 L248 470 L152 470 Z" fill={c.border} />
      {/* 袄身（云纹提花） */}
      <path
        d="M148 84 L116 106 L100 220 L128 228 L138 170 L136 270 L264 270 L262 170 L272 228 L300 220 L284 106 L252 84 Q200 100 148 84 Z"
        fill={patternUrl('mamian', 'yun')}
      />
      {/* 立领 */}
      <path d="M168 84 Q200 96 232 84 L232 102 Q200 114 168 102 Z" fill={c.collar} />
      {/* 袖缘 */}
      <path d="M100 220 L128 228 L130 208 L104 200 Z" fill={c.collar} />
      <path d="M300 220 L272 228 L270 208 L296 200 Z" fill={c.collar} />
      {/* 系带双环 */}
      <path d="M200 268 C184 252 166 256 168 268 C170 280 188 282 200 268 Z" fill={c.tie} />
      <path d="M200 268 C216 252 234 256 232 268 C230 280 212 282 200 268 Z" fill={c.tie} />
      <path d="M196 272 L188 322 L200 324 L205 274 Z" fill={c.tie} />
      <path d="M204 272 L212 322 L200 324 L195 274 Z" fill={c.tie} />
    </g>
  ),
};
