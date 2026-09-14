# 马面裙底板重铸：源 SVG 是「洋葱结构」（满幅灰底 + 带裙形洞的白纸层），
# 去背景后裙门/褶裥失去基色。本脚本渲染源图于品红底上，提取裙影轮廓，
# 生成一条真实底板 path（fill 裙门灰，归入 panel 族），插入 public/templates/mamian.svg 底层。
# 用法：python scripts/fix-mamian-base.py
import re
from playwright.sync_api import sync_playwright
from PIL import Image

SRC = 'docs/task02/miora/衣服/1789370416031-jkr1n9j3bva.svg'
DST = 'public/templates/mamian.svg'
W, H = 687, 1024
BASE_FILL = '#D2D2CD'  # 裙门族底色（与 panel 锚点 #D3D2C9 同族）

svg = open(SRC, encoding='utf8').read()
# 只渲染 path1（满幅白底挖裙形洞的纸层）：裙洞处透出品红底，
# 品红像素即裙影（洞完全封闭于白层内，画面其余品红仅画布外边缘）
paths = re.findall(r'<path\b[^>]*>', svg)
def close(p):
    return p if p.rstrip().endswith('/>') else p.rstrip()[:-1] + '/>'

with sync_playwright() as pw:
    b = pw.chromium.launch()
    page = b.new_page(viewport={'width': W, 'height': H})
    page.set_content(
        '<body style="margin:0;background:#FF00FF">'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
        + close(paths[1]) + '</svg></body>')
    page.screenshot(path='shots/mamian-silhouette-src.png')
    b.close()

im = Image.open('shots/mamian-silhouette-src.png').convert('RGB')
px = im.load()
def is_bg(c):
    return c[0] > 200 and c[1] < 80 and c[2] > 200

# 逐行取裙影（品红=裙洞）左右极值（每 2 行采样），左缘自上而下、右缘自下而上拼多边形
left, right = [], []
for y in range(0, H, 2):
    xs = [x for x in range(W) if is_bg(px[x, y])]
    if xs:
        left.append((xs[0], y))
        right.append((xs[-1], y))
assert left, 'silhouette empty'
poly = left + right[::-1]
d = 'M' + ' L'.join(f'{x} {y}' for x, y in poly) + ' Z'
print('silhouette points:', len(poly), ' rows:', len(left))

out = open(DST, encoding='utf8').read()
# 若已有重铸底板先移除（幂等）
out = re.sub(r'<path data-base="1"[^>]*/>', '', out)
base = f'<path data-base="1" d="{d}" style="fill: {BASE_FILL};"/>'
out = out.replace('<g transform=', '<g transform=', 1)
# 插到 <g ...> 开标签之后（最底层）
m = re.search(r'(<g\b[^>]*>)', out)
out = out[:m.end()] + base + out[m.end():]
open(DST, 'w', encoding='utf8').write(out)
print('base path inserted into', DST)
