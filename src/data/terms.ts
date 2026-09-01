/**
 * 二十四节气数据
 * - poem / poemSource 均为与节气强相关的名家名句，出处可考
 * - colorIds 取自 data/colors.json 中真实存在的条目，意象与当季相符
 * - month / day 为公历大致起始日，仅供 currentTermIndex 推算，非天文精确值
 */

export type TermSeason = '春' | '夏' | '秋' | '冬';

export interface SolarTerm {
  name: string;
  pinyin: string;
  season: TermSeason;
  /** 展示用的约日期，如 '2月4日前后' */
  approx: string;
  /** 公历大致起始月（1-12） */
  month: number;
  /** 公历大致起始日 */
  day: number;
  poem: string;
  poemSource: string;
  colorIds: string[];
}

export const SOLAR_TERMS: SolarTerm[] = [
  // ===== 春 =====
  {
    name: '立春',
    pinyin: 'lì chūn',
    season: '春',
    approx: '2月4日前后',
    month: 2,
    day: 4,
    poem: '律回岁晚冰霜少，春到人间草木知',
    poemSource: '张栻《立春偶成》',
    colorIds: ['chun-chen', 'tian-piao', 'huang-li-liu'],
  },
  {
    name: '雨水',
    pinyin: 'yǔ shuǐ',
    season: '春',
    approx: '2月19日前后',
    month: 2,
    day: 19,
    poem: '天街小雨润如酥，草色遥看近却无',
    poemSource: '韩愈《早春呈水部张十八员外》',
    colorIds: ['cang-jia', 'liu-lv', 'tai-gu'],
  },
  {
    name: '惊蛰',
    pinyin: 'jīng zhé',
    season: '春',
    approx: '3月5日前后',
    month: 3,
    day: 5,
    poem: '微雨众卉新，一雷惊蛰始',
    poemSource: '韦应物《观田家》',
    colorIds: ['tao-yao', 'chun-bi', 'xiang-ye'],
  },
  {
    name: '春分',
    pinyin: 'chūn fēn',
    season: '春',
    approx: '3月20日前后',
    month: 3,
    day: 20,
    poem: '雨霁风光，春分天气，千花百卉争明媚',
    poemSource: '欧阳修《踏莎行》',
    colorIds: ['hai-tang-hong', 'cui-wei', 'song-hua'],
  },
  {
    name: '清明',
    pinyin: 'qīng míng',
    season: '春',
    approx: '4月5日前后',
    month: 4,
    day: 5,
    poem: '清明时节雨纷纷，路上行人欲断魂',
    poemSource: '杜牧《清明》',
    colorIds: ['qing-qing', 'cang-lang', 'bi-luo'],
  },
  {
    name: '谷雨',
    pinyin: 'gǔ yǔ',
    season: '春',
    approx: '4月20日前后',
    month: 4,
    day: 20,
    poem: '谷雨春光晓，山川黛色青',
    poemSource: '元稹《咏廿四气诗·谷雨春光晓》',
    colorIds: ['ting-wu-lv', 'zhi-zi', 'bi-shan'],
  },
  // ===== 夏 =====
  {
    name: '立夏',
    pinyin: 'lì xià',
    season: '夏',
    approx: '5月5日前后',
    month: 5,
    day: 5,
    poem: '绿树阴浓夏日长，楼台倒影入池塘',
    poemSource: '高骈《山亭夏日》',
    colorIds: ['ji-he', 'tian-qing', 'e-huang-2'],
  },
  {
    name: '小满',
    pinyin: 'xiǎo mǎn',
    season: '夏',
    approx: '5月21日前后',
    month: 5,
    day: 21,
    poem: '梅子金黄杏子肥，麦花雪白菜花稀',
    poemSource: '范成大《四时田园杂兴》',
    colorIds: ['nen-e-huang', 'guan-lv', 'yun-huang'],
  },
  {
    name: '芒种',
    pinyin: 'máng zhòng',
    season: '夏',
    approx: '6月6日前后',
    month: 6,
    day: 6,
    poem: '时雨及芒种，四野皆插秧',
    poemSource: '陆游《时雨》',
    colorIds: ['ju-yi', 'cong-qing', 'shan-fan'],
  },
  {
    name: '夏至',
    pinyin: 'xià zhì',
    season: '夏',
    approx: '6月21日前后',
    month: 6,
    day: 21,
    poem: '接天莲叶无穷碧，映日荷花别样红',
    poemSource: '杨万里《晓出净慈寺送林子方》',
    colorIds: ['shi-liu-qun', 'cui-piao', 'lu-bo'],
  },
  {
    name: '小暑',
    pinyin: 'xiǎo shǔ',
    season: '夏',
    approx: '7月7日前后',
    month: 7,
    day: 7,
    poem: '荷风送香气，竹露滴清响',
    poemSource: '孟浩然《夏日南亭怀辛大》',
    colorIds: ['lu-zhu', 'rou-lan', 'fu-guang'],
  },
  {
    name: '大暑',
    pinyin: 'dà shǔ',
    season: '夏',
    approx: '7月23日前后',
    month: 7,
    day: 23,
    poem: '赤日几时过，清风无处寻',
    poemSource: '曾几《大暑》',
    colorIds: ['zhu-yan-tuo', 'cheng-xia', 'bi-cheng'],
  },
  // ===== 秋 =====
  {
    name: '立秋',
    pinyin: 'lì qiū',
    season: '秋',
    approx: '8月7日前后',
    month: 8,
    day: 7,
    poem: '云天收夏色，木叶动秋声',
    poemSource: '刘言史《立秋》',
    colorIds: ['luan-hua', 'qiu-xiang', 'qian-yun'],
  },
  {
    name: '处暑',
    pinyin: 'chǔ shǔ',
    season: '秋',
    approx: '8月23日前后',
    month: 8,
    day: 23,
    poem: '离离暑云散，袅袅凉风起',
    poemSource: '白居易《早秋曲江感怀》',
    colorIds: ['qian-shan-cui', 'yun-mu', 'lv-shen'],
  },
  {
    name: '白露',
    pinyin: 'bái lù',
    season: '秋',
    approx: '9月7日前后',
    month: 9,
    day: 7,
    poem: '露从今夜白，月是故乡明',
    poemSource: '杜甫《月夜忆舍弟》',
    colorIds: ['yue-bai', 'ning-zhi', 'dong-fang-ji-bai'],
  },
  {
    name: '秋分',
    pinyin: 'qiū fēn',
    season: '秋',
    approx: '9月23日前后',
    month: 9,
    day: 23,
    poem: '金气秋分，风清露冷秋期半',
    poemSource: '谢逸《点绛唇》',
    colorIds: ['ou-si-qiu-ban', 'cang-yan-luo-zhao', 'zhu-yue'],
  },
  {
    name: '寒露',
    pinyin: 'hán lù',
    season: '秋',
    approx: '10月8日前后',
    month: 10,
    day: 8,
    poem: '袅袅凉风动，凄凄寒露零',
    poemSource: '白居易《池上》',
    colorIds: ['jiu-jin-huang', 'tang-li', 'hua-qing'],
  },
  {
    name: '霜降',
    pinyin: 'shuāng jiàng',
    season: '秋',
    approx: '10月23日前后',
    month: 10,
    day: 23,
    poem: '停车坐爱枫林晚，霜叶红于二月花',
    poemSource: '杜牧《山行》',
    colorIds: ['yin-zhu', 'huang-run', 'yan-mo'],
  },
  // ===== 冬 =====
  {
    name: '立冬',
    pinyin: 'lì dōng',
    season: '冬',
    approx: '11月7日前后',
    month: 11,
    day: 7,
    poem: '细雨生寒未有霜，庭前木叶半青黄',
    poemSource: '仇远《立冬即事二首》',
    colorIds: ['ban-jian', 'rou-hong', 'you-lv'],
  },
  {
    name: '小雪',
    pinyin: 'xiǎo xuě',
    season: '冬',
    approx: '11月22日前后',
    month: 11,
    day: 22,
    poem: '晚来天欲雪，能饮一杯无',
    poemSource: '白居易《问刘十九》',
    colorIds: ['fen-mi', 'pin-yue', 'jing-tian'],
  },
  {
    name: '大雪',
    pinyin: 'dà xuě',
    season: '冬',
    approx: '12月7日前后',
    month: 12,
    day: 7,
    poem: '忽如一夜春风来，千树万树梨花开',
    poemSource: '岑参《白雪歌送武判官归京》',
    colorIds: ['cao-bai', 'ji-lan', 'mo-can'],
  },
  {
    name: '冬至',
    pinyin: 'dōng zhì',
    season: '冬',
    approx: '12月22日前后',
    month: 12,
    day: 22,
    poem: '天时人事日相催，冬至阳生春又来',
    poemSource: '杜甫《小至》',
    colorIds: ['ji-hong', 'su-fang', 'ga-luo'],
  },
  {
    name: '小寒',
    pinyin: 'xiǎo hán',
    season: '冬',
    approx: '1月5日前后',
    month: 1,
    day: 5,
    poem: '墙角数枝梅，凌寒独自开',
    poemSource: '王安石《梅花》',
    colorIds: ['zi-mei', 'xing-lang', 'cha-se'],
  },
  {
    name: '大寒',
    pinyin: 'dà hán',
    season: '冬',
    approx: '1月20日前后',
    month: 1,
    day: 20,
    poem: '旧雪未及消，新雪又拥户',
    poemSource: '邵雍《大寒吟》',
    colorIds: ['jing-yuan', 'mu-shan-zi', 'qing-shan'],
  },
];

/**
 * 根据日期返回当前节气在 SOLAR_TERMS 中的下标。
 * 以各节气公历大致起始日（month/day）换算区间，非天文精确算法；
 * 1 月 1–4 日尚未入小寒，归上一年冬至。
 */
export function currentTermIndex(now: Date = new Date()): number {
  const key = (now.getMonth() + 1) * 100 + now.getDate();
  const chronological = SOLAR_TERMS.map((t, i) => ({
    i,
    key: t.month * 100 + t.day,
  })).sort((a, b) => a.key - b.key);
  // 默认取时序上最后一个节气（冬至），覆盖 1 月初的跨年情形
  let idx = chronological[chronological.length - 1].i;
  for (const { i, key: k } of chronological) {
    if (k <= key) idx = i;
  }
  return idx;
}
