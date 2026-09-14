# 聚类验证：SVG 全部 path fill 按锚点族归类的分布
# 用法：python scripts/cluster-svg.py <file.svg> [锚点名=hex 空格分隔...]
import re, sys
from collections import defaultdict

svg = open(sys.argv[1], encoding='utf8').read()
fills = re.findall(r'style="fill:\s*(#[0-9A-Fa-f]{6})[^"]*"', svg)
print('paths:', len(fills), 'unique fills:', len(set(fills)))

# 纯 python 转 OKLab（Björn Ottosson 公式）
def srgb_to_oklab(hexc):
    r = int(hexc[1:3], 16) / 255
    g = int(hexc[3:5], 16) / 255
    b = int(hexc[5:7], 16) / 255
    def lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = lin(r), lin(g), lin(b)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = l ** (1 / 3), m ** (1 / 3), s ** (1 / 3)
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return L, a, bb

ANCHORS = dict((kv.split('=')[0], kv.split('=')[1]) for kv in sys.argv[2:]) if len(sys.argv) > 2 else {
    'ink 描线': '#1B1A17',
    'body 衣身': '#363531',
    'trim 缘饰': '#783830',
    'tie 腰带': '#F0E8D8',
    'pattern 纹样': '#807860',
    'paper 纸底': '#F7F5EC',
}
A = {k: srgb_to_oklab(v) for k, v in ANCHORS.items()}

def dist(c1, c2):
    return ((c1[0] - c2[0]) ** 2 * 1.0 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2) ** 0.5

hist = defaultdict(list)
for f in set(fills):
    lab = srgb_to_oklab(f)
    fam = min(A, key=lambda k: dist(lab, A[k]))
    hist[fam].append((f, dist(lab, A[fam]), lab[0]))

for k in ANCHORS:
    v = sorted(hist.get(k, []), key=lambda x: x[1])
    n_paths = sum(fills.count(f) for f, _, _ in v)
    sample = ' '.join(f'{f}(d={d:.3f})' for f, d, _ in v[:5])
    far = f' …最远 {v[-1][0]}(d={v[-1][1]:.3f})' if v else ''
    print(f'{k}: 色数={len(v)} 路径数={n_paths}  {sample}{far}')

# 边界探针（可选，第 3 组参数起：probe=hex）
print()
probes = [kv.split('=') for kv in sys.argv[3 + len(ANCHORS):] if '=' in kv] if len(sys.argv) > 2 else []
for name, probe in probes:
    lab = srgb_to_oklab(probe)
    ds = sorted(((dist(lab, A[k]), k) for k in A))
    print(name, probe, '→', ds[0][1], f'(d={ds[0][0]:.3f})', '次近', ds[1][1], f'(d={ds[1][0]:.3f})')
