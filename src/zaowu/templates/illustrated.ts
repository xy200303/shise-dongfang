/**
 * templates/illustrated —— 矢量插画模板登记（Miora 生成，描摹 SVG）
 *
 * 锚点采样自源图（scripts/cluster-svg.py 验证聚类无误判）；
 * 新增插画（襦裙/马面裙/团扇）只需：scripts/preprocess-svg.py 清理出
 * public/templates/<id>.svg，再按此格式加一条配置。
 */
import type { IllustratedTemplateDef } from '../types';

export const qujuIllus: IllustratedTemplateDef = {
  id: 'quju',
  name: '曲裾深衣',
  kind: '服饰',
  desc: '长衣绕襟，宽袖收袂，汉风之正',
  svgUrl: `${import.meta.env.BASE_URL}templates/quju.svg`,
  slots: [
    { id: 'body', label: '衣身', role: 'main' },
    { id: 'trim', label: '衣缘', role: 'trim' },
    { id: 'tie', label: '腰带', role: 'tie' },
    { id: 'pattern', label: '衣纹', role: 'accent' },
  ],
  anchors: {
    body: '#363531',
    trim: '#783830',
    tie: '#F0E8D8',
    pattern: '#807860',
    ink: '#1B1A17',
  },
};

/**
 * 团扇五槽：扇面绢底（浅米白族，主）、框柄（系；扇框与梅枝同为近黑描线族分不开，
 * 框保持墨色不染，柄染系色）、梅花（纹，浅花瓣 #DA939A + 深花芯 #6A3B3F 同族）、
 * 水波（缘：规则默认取主色暗级 scale[8]，绢上水影）、竹叶（纹族第二位：
 * solver 同角色第二槽自动色相 +14°，与梅花邻近共生）。
 * 梅花槽位 id 叫 blossom 而非 pattern：避开纹样选择器「无纹即隐去」的语义。
 * 扇面族曾因与纸底距离 0.031 < 旧容差 0.05 被误抠——preprocess 容差已收紧 0.018。
 */
export const tuanIllus: IllustratedTemplateDef = {
  id: 'tuan',
  name: '团扇',
  kind: '物件',
  desc: '素扇团栾，梅花入画，纨扇之雅',
  svgUrl: `${import.meta.env.BASE_URL}templates/tuan.svg`,
  slots: [
    { id: 'face', label: '扇面', role: 'main' },
    { id: 'rib', label: '框柄', role: 'tie' },
    { id: 'blossom', label: '梅花', role: 'accent' },
    { id: 'wave', label: '水波', role: 'trim' },
    { id: 'bamboo', label: '竹叶', role: 'accent' },
  ],
  anchors: {
    face: '#ECECE7',
    rib: '#D9C093',
    blossom: ['#DA939A', '#6A3B3F'],
    wave: '#AFBEC3',
    bamboo: '#667766',
    ink: '#1B1A16',
  },
};

/**
 * 齐胸襦裙（白描风）：无彩色，纯灰阶分族——裙身米白、上襦/裙头/垂带浅灰
 * （色相全中性，仅凭明度分不开裙头与上襦，故并入辅）、褶裥阴影中灰作「缘」、
 * 裙头深带为描线族不染。无独立纹样色层，省纹槽。
 */
export const ruqunIllus: IllustratedTemplateDef = {
  id: 'ruqun',
  name: '齐胸襦裙',
  kind: '服饰',
  desc: '短襦高腰，披帛绕肩，唐制之明艳',
  svgUrl: `${import.meta.env.BASE_URL}templates/ruqun.svg`,
  slots: [
    { id: 'skirt', label: '裙身', role: 'main' },
    { id: 'ru', label: '上襦', role: 'secondary' },
    { id: 'folds', label: '褶缘', role: 'trim' },
  ],
  anchors: {
    skirt: '#EEEADF',
    ru: '#D9D8D3',
    folds: '#6B6A64',
    ink: '#141411',
  },
};

/**
 * 马面裙（白描风）：与襦裙同为灰阶分族——裙门光面浅灰（主）、两侧褶裥
 * 中灰（辅，深色褶线 #848480~#9C9C96 同族，明度偏移染色后褶裥立体）、
 * 裙腰/系带/裙摆缘边米白（系，源图三者同色拆不开，腰缘同染亦合古制）。
 * 无近黑描线族（最深 #848480 是褶影），故无 ink 锚点。
 */
export const mamianIllus: IllustratedTemplateDef = {
  id: 'mamian',
  name: '马面裙',
  kind: '服饰',
  desc: '裙门光整，四涧打褶，明制之端丽',
  svgUrl: `${import.meta.env.BASE_URL}templates/mamian.svg`,
  slots: [
    { id: 'panel', label: '裙门', role: 'main' },
    { id: 'pleat', label: '褶裥', role: 'secondary' },
    { id: 'waist', label: '裙腰系带', role: 'tie' },
  ],
  anchors: {
    panel: '#D3D2C9',
    pleat: '#AEAEA8',
    waist: '#EFF0E4',
  },
};

