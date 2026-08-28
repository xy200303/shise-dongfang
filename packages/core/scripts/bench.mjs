/**
 * 性能基准：node scripts/bench.mjs（需先 pnpm build）
 * 测量「完整主题生成」（主色阶+暗色色阶+中性色阶+全套 token）与缓存命中两种场景。
 */
import { performance } from 'node:perf_hooks';
import { generatePalette, generateTheme } from '../dist/index.js';

const PRESETS = ['#0052d9', '#ed7b2f', '#f5d90a', '#00a870', '#d54941', '#834ec2', '#f2a6c0', '#0594fa'];

function bench(label, fn, iterations) {
  // 预热
  for (let i = 0; i < 200; i += 1) fn(i);
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) fn(i);
  const ms = performance.now() - start;
  const ops = Math.round((iterations / ms) * 1000).toLocaleString();
  console.log(`${label.padEnd(40)} ${ms.toFixed(1)}ms  ${ops} ops/s`);
}

bench('generatePalette（异色输入，无缓存）', (i) => {
  // 每次生成不同色相，绕过 memoize
  generatePalette(`hsl(${(i * 7) % 360} 70% 50%)`);
}, 5000);

bench('generatePalette（同色输入，缓存命中）', () => {
  generatePalette('#0052d9');
}, 100000);

bench('generateTheme（异色输入，无缓存）', (i) => {
  generateTheme(`hsl(${(i * 11) % 360} 65% 55%)`);
}, 3000);

bench('generateTheme（预设轮换，缓存命中）', (i) => {
  generateTheme(PRESETS[i % PRESETS.length]);
}, 100000);
