// 校验 colors.json：可解析、id 唯一、hex 合法、category 枚举合法、条数 >= 200、season 枚举、排序
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'data', 'colors.json');
let data;
try {
  data = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  console.error('FAIL: JSON 解析失败 -', e.message);
  process.exit(1);
}

const CATS = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'brown', 'neutral'];
const SEASONS = ['春', '夏', '秋', '冬', '四季'];
const errors = [];

if (!Array.isArray(data)) errors.push('顶层不是数组');

const ids = new Set();
const dist = {};
let withPoem = 0;
data.forEach((c, i) => {
  const where = `#${i}(${c.name || '?'})`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.id || '')) errors.push(`${where} id 非法: ${c.id}`);
  if (ids.has(c.id)) errors.push(`${where} id 重复: ${c.id}`);
  ids.add(c.id);
  if (!c.name) errors.push(`${where} name 为空`);
  if (!/^#[0-9a-f]{6}$/.test(c.hex || '')) errors.push(`${where} hex 非法: ${c.hex}`);
  if (!CATS.includes(c.category)) errors.push(`${where} category 非法: ${c.category}`);
  if (!SEASONS.includes(c.season)) errors.push(`${where} season 非法: ${c.season}`);
  if (typeof c.poem !== 'string' || typeof c.poemSource !== 'string') errors.push(`${where} poem 字段类型错误`);
  if (c.poem && !c.poemSource) errors.push(`${where} 有 poem 缺 poemSource`);
  if (c.poem) withPoem++;
  dist[c.category] = (dist[c.category] || 0) + 1;
});

// 排序检查：category 按枚举顺序，组内按拼音(id) 升序
const order = Object.fromEntries(CATS.map((c, i) => [c, i]));
for (let i = 1; i < data.length; i++) {
  const a = data[i - 1], b = data[i];
  if (order[a.category] > order[b.category] ||
      (a.category === b.category && a.id > b.id)) {
    errors.push(`排序错误: #${i - 1}(${a.name}) > #${i}(${b.name})`);
    break;
  }
}

// 知名色必须存在
const must = ['胭脂', '朱砂', '天青', '月白', '黛蓝', '松花', '藤黄', '艾绿', '绛紫', '藕荷', '蟹壳青', '胭脂水', '远山黛'];
for (const m of must) {
  if (!data.some((c) => c.name === m || c.name.startsWith(m))) errors.push(`缺少知名色: ${m}`);
}

if (data.length < 200) errors.push(`条数不足: ${data.length} < 200`);

console.log('校验文件:', file);
console.log('总条数:', data.length);
console.log('含诗词条数:', withPoem);
console.log('category 分布:', JSON.stringify(dist));
console.log('id 唯一数:', ids.size);
if (errors.length) {
  console.log('FAIL, 错误数:', errors.length);
  errors.slice(0, 30).forEach((e) => console.log(' -', e));
  process.exit(1);
}
console.log('PASS: 全部校验通过');
