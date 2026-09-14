# 预处理：去纸底 path + 纸纹残渣 + bbox 归一化 → public/templates/<id>.svg
# 用法：python scripts/preprocess-svg.py <src.svg> <id> [paperHex]
# 流程：python 按纸底锚点距离剔除 → playwright 求衣核/残渣（getBoundingClientRect）→ 包 g 归一化到 400x520
import re, sys
from playwright.sync_api import sync_playwright

SRC = sys.argv[1]
TID = sys.argv[2]
PAPER = sys.argv[3] if len(sys.argv) > 3 else '#F7F5EC'
DST = f'public/templates/{TID}.svg'

def srgb_to_oklab(hexc):
    r, g, b = (int(hexc[i:i+2], 16) / 255 for i in (1, 3, 5))
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = lin(r), lin(g), lin(b)
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1/3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1/3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1/3)
    return (0.2104542553*l + 0.7936177850*m - 0.0040720468*s,
            1.9779984951*l - 2.4285922050*m + 0.4505937099*s,
            0.0259040371*l + 0.7827717662*m - 0.8086757660*s)

PAPER_LAB = srgb_to_oklab(PAPER)
def near_paper(hexc, tol=0.018):
    # 容差须 < 绢面/裙身等浅色系与纸底的距离（实测：纸底变体 ≤0.011，
    # 最近的非纸底浅色 ≥0.025），0.018 居中，防止扇面绢底被误抠
    c = srgb_to_oklab(hexc)
    return sum((a-b)**2 for a, b in zip(c, PAPER_LAB)) ** 0.5 < tol

svg = open(SRC, encoding='utf8').read()
# 逐 path 剔除纸底
paths = re.findall(r'<path\b[^>]*>', svg)
kept, dropped = [], 0
for p in paths:
    m = re.search(r'style="fill:\s*(#[0-9A-Fa-f]{6})', p)
    if m and near_paper(m.group(1)):
        dropped += 1
        continue
    # 原文档用 <path></path> 成对标签；只取开标签会吞掉后续兄弟，自闭合之
    kept.append(p if p.rstrip().endswith('/>') else p.rstrip()[:-1] + '/>')
print(f'paths: {len(paths)} kept {len(kept)} dropped {dropped}（纸底）')

with sync_playwright() as pw:
    b = pw.chromium.launch()
    page = b.new_page()
    page.set_content(
        '<svg xmlns="http://www.w3.org/2000/svg" id="r" width="1024" height="1024">'
        + ''.join(kept) + '</svg>')
    # 衣核与残渣判定用 getBoundingClientRect（含 path 自身 transform 的视口坐标）；
    # 归一化 bbox 仍用根 getBBox（已验证与视觉一致）。
    # 另：覆盖 ≥85% 画布的 path 必是矢量器补的背景矩形（与颜色无关，马面裙源图
    # 曾带出 #D2D2CD/#FEFEFE 两张满幅画布 path），一律剔除
    box = page.evaluate('''() => {
      const r = document.getElementById('r');
      const ps = [...r.querySelectorAll('path')];
      const full = [];
      const bb0 = r.getBBox();
      const area0 = bb0.width * bb0.height;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = 0; i < ps.length; i++) {
        const b = ps[i].getBoundingClientRect();
        if (b.width * b.height >= area0 * 0.85) { full.push(i); ps[i].remove(); continue; }
        if (b.width * b.height > area0 * 0.01) {
          x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
          x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
        }
      }
      return { core: [x0, y0, x1, y1], full };
    }''')
    # 剔除「小而亮且整体在衣核外」的纸纹残渣（飘点）：返回索引，python 侧过滤 kept
    M = 30
    cx0, cy0, cx1, cy1 = box['core']
    box2 = page.evaluate(f'''() => {{
      const r = document.getElementById('r');
      const ps = [...r.querySelectorAll('path')];
      const drop = [];
      for (let i = 0; i < ps.length; i++) {{
        const b = ps[i].getBoundingClientRect();
        const m = /#([0-9A-Fa-f]{{6}})/.exec(ps[i].getAttribute('style') || '');
        if (!m) continue;
        const v = parseInt(m[1], 16);
        const lum = ((v >> 16) & 255) * 0.299 + ((v >> 8) & 255) * 0.587 + (v & 255) * 0.114;
        const outside = b.x + b.width < {cx0 - M} || b.x > {cx1 + M} || b.y + b.height < {cy0 - M} || b.y > {cy1 + M};
        if (outside && lum > 200 && b.width * b.height < 1024 * 1024 * 0.005) drop.push(i);
      }}
      for (const i of drop) ps[i].remove();
      const bb = r.getBBox();
      return {{ drop, bbox: [bb.x, bb.y, bb.width, bb.height] }};
    }}''')
    b.close()
drop_set = set(box2['drop'])
full_set = set(box['full'])
kept = [p for i, p in enumerate(kept) if i not in full_set]
kept = [p for i, p in enumerate(kept) if i not in drop_set]
print('衣核:', [round(v) for v in box['core']], ' 剔除满幅背景:', len(full_set), ' 剔除残渣:', len(box2['drop']), ' 剩余 path:', len(kept))
x, y, w, h = box2['bbox']
print('bbox:', [round(v, 1) for v in (x, y, w, h)])
VW, VH, M = 400, 520, 26
s = min((VW - 2 * M) / w, (VH - 2 * M) / h)
tx = (VW - w * s) / 2 - x * s
ty = (VH - h * s) / 2 - y * s
print(f'normalize: scale={s:.4f} translate=({tx:.1f},{ty:.1f})')

out = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VW} {VH}">'
    f'<g transform="translate({tx:.2f},{ty:.2f}) scale({s:.4f})">'
    + ''.join(kept) +
    '</g></svg>'
)
open(DST, 'w', encoding='utf8').write(out)
print('written', DST, len(out), 'bytes')
