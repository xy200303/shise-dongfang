/**
 * 标准向量校验：把引擎依赖的色彩科学实现钉在公开参考值上。
 *
 * - CIEDE2000：Sharma et al. (2005)《The CIEDE2000 Color-Difference Formula》
 *   测试向量第 1 对的标准答案为 2.0425；另与独立实现 delta-e 包交叉验证。
 * - APCA：官方参考实现 apca-w3 的文档锚点——白字黑底 Lc ≈ -107.9。
 */
import deltaE from 'delta-e';
import { describe, expect, it } from 'vitest';
import { apcaContrast } from '../src';
import { converter, differenceCiede2000, parse } from '../src/culori';

const toLab = converter('lab65'); // 注意：culori 默认 lab 是 D50 白点，delta-e 与 Sharma 向量都是 D65
const culoriDE00 = differenceCiede2000();

const labOf = (hex: string) => {
  const lab = toLab(parse(hex)!)!;
  return { L: lab.l, A: lab.a, B: lab.b };
};

describe('CIEDE2000 标准向量', () => {
  it('Sharma 向量第 1 对 = 2.0425（公开参考值）', () => {
    // Lab(50, 2.6772, -79.7751) vs Lab(50, 0, -82.7485)
    const v = deltaE.getDeltaE00({ L: 50, A: 2.6772, B: -79.7751 }, { L: 50, A: 0, B: -82.7485 });
    expect(v).toBeCloseTo(2.0425, 3);
  });

  it('culori 与 delta-e 两个独立实现在 8 组颜色对上一致（±0.01）', () => {
    const pairs: [string, string][] = [
      ['#0052d9', '#1f47d2'],
      ['#ed7b2f', '#cf5148'],
      ['#00a870', '#2a6de8'],
      ['#f5d90a', '#9b8900'],
      ['#f2a6c0', '#834ec2'],
      ['#ffffff', '#f3f3f3'],
      ['#181818', '#000000'],
      ['#ff0000', '#00ff00'],
    ];
    pairs.forEach(([a, b]) => {
      const byCulori = culoriDE00(parse(a)!, parse(b)!);
      const byDeltaE = deltaE.getDeltaE00(labOf(a), labOf(b));
      expect(Math.abs(byCulori - byDeltaE)).toBeLessThan(0.01);
    });
  });
});

describe('APCA 锚点值', () => {
  it('白字黑底 Lc ≈ -107.9（官方参考实现文档锚点）', () => {
    expect(apcaContrast('#ffffff', '#000000')).toBeCloseTo(-107.88, 1);
  });

  it('黑字白底 Lc ≈ +106（极性不对称：浅字深底更严格）', () => {
    const lightOnDark = Math.abs(apcaContrast('#ffffff', '#000000'));
    const darkOnLight = Math.abs(apcaContrast('#000000', '#ffffff'));
    expect(darkOnLight).toBeCloseTo(106.04, 0);
    expect(darkOnLight).toBeLessThan(lightOnDark); // 极性敏感的直接证据
  });
});
