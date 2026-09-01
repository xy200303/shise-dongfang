# colors.json 数据来源（sources）

本数据集共 537 条，色值（hex）全部取自公开流传的中国传统色色值表，未自行编造；每条均可溯源到下列至少一个公开来源。

## 主要来源

1. **郭浩、李健明《中国传统色：故宫里的色彩美学》384 色**（数据镜像：daodaolee/china-color）
   - https://github.com/daodaolee/china-color （`src/global/color.json`，含色名、RGB/HEX、节气、配诗与出处）
   - 交叉核对：色韵 cncolor.art（同为该书 384 色体系），抽查 胭脂水 #b95a89、暮山紫 #a4abd6、天缥 #d5ebe1、桃夭 #f6bec8、凝脂 #f5f2e9 均一致
   - https://cncolor.art/colors （如 https://cncolor.art/color/胭脂水 ）
   - 本集中大部分条目的 poem / poemSource / season 来自该书的配诗与节气归属（繁体已转简体；散文类出处如《说文解字》《天工开物》《尔雅》等的条目 poem 已置空，宁缺毋滥）

2. **经典「中国古典色」161 色表**（流传最广的传统色网络色卡）
   - https://github.com/zerosoul/chinese-colors （`src/assets/colors.json`）
   - 镜像核对：配色网 https://www.color5.com/color-system/zhongguose/ 、logo880 中国传统色彩色值色卡 http://www.logo880.cn/chinacolor/index.html （同名色值一致，如 胭脂 #9d2933、月白 #d6ecf0、蟹壳青 #bbcdc5、艾绿 #a4e2c6、绛紫 #8c4356、朱砂 #ff461f、黛蓝 #425066、藕荷色 #e4c6d0）
   - 同名色与来源 1 冲突时保留来源 1（带节气与配诗），月白例外采用经典表通行值 #d6ecf0

3. **中国色官网 zhongguose.com 单色页**（526 色谱体系）
   - https://zhongguose.com/ai/colors/天青 → 天青 #6c9bca
   - https://zhongguose.com/ai/colors/藤黄 → 藤黄 #ffd111
   - 旁证：nevertoday/zhongguo-traditional-colors `docs/chinese-color-master-list.md`（天青 #6C9BCA、藤黄 #FFD111 一致）https://github.com/nevertoday/zhongguo-traditional-colors

4. **2023 央视春晚《满庭芳·国色》官方色卡**（郭浩团队发布，47 色）
   - 远山黛：官方色卡标注 C85 M70 Y55 K15 / R52 G75 B92 → #344b5c
   - 文字镜像：《满庭芳·国色》最全47种中国传统色高清色卡 https://mp.weixin.qq.com/s/-Nhd1fCEII9ZO3199nrYtg

## 诗词来源说明

- 绝大多数 poem 直接沿用来源 1 所引古籍诗句（含作者与篇名），仅做繁转简与明显讹字修正（如「邺风」→「邶风」、《子夜歌》作者「子夜」→「佚名」）。
- 少数经典表补充色手工配诗，均为高置信度真实出处，例：
  - 胭脂：李煜《相见欢·林花谢了春红》「胭脂泪，相留醉，几时重」
  - 月白：白居易《琵琶行》「东船西舫悄无言，唯见江心秋月白」
  - 远山黛：晏几道《生查子·远山眉黛长》「远山眉黛长，细柳腰肢袅」
  - 桃红 / 柳绿：王维《田园乐七首·其六》「桃红复含宿雨，柳绿更带朝烟」
- 出处不确定的一律留空（poem / poemSource 为空字符串），共 272 条无配诗。

## 已知色值分歧（同名不同值，属各表正常差异）

- 月白：经典表 #d6ecf0 / 郭浩书 #d4e5ef / zhongguose 色谱 #eef7f2 —— 本集取 #d6ecf0
- 群青：经典表 #4c8dae / 郭浩书 #2e59a7 —— 本集取 #2e59a7
- 藤黄：经典表 #ffb61e / zhongguose #ffd111 —— 本集取 #ffd111
