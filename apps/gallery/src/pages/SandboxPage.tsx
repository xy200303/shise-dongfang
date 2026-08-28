import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  Input,
  MessagePlugin,
  Pagination,
  Progress,
  Select,
  Slider,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'tdesign-react';
import {
  accessibleTextLevel,
  bestTextOn,
  toTDesignTokens,
  tokensToCss,
  usageHint,
} from '@palette-studio/core';
import type { ColorEntry } from '../types';
import './sandbox.css';

const { TabPanel } = Tabs;

/** 默认基色：朱砂 */
const DEFAULT_HEX = '#C8473F';
const STYLE_ID = 'sandbox-scope-theme';

function normalizeHex(text: string): string | null {
  const t = text.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(t)) return `#${t.toLowerCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(t)) {
    return `#${t.split('').map((c) => c + c).join('').toLowerCase()}`;
  }
  return null;
}

function stripTones(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  MessagePlugin.success(`已复制：${text}`);
}

/** Token 检视表要列出的关键 token */
const TOKEN_ROWS: { key: string; label: string }[] = [
  { key: '--td-brand-color', label: '主色' },
  { key: '--td-brand-color-hover', label: 'hover' },
  { key: '--td-brand-color-active', label: 'active' },
  { key: '--td-brand-color-focus', label: 'focus' },
  { key: '--td-brand-color-disabled', label: 'disabled' },
  { key: '--td-brand-color-light', label: 'light' },
  ...Array.from({ length: 10 }, (_, i) => ({
    key: `--td-brand-color-${i + 1}`,
    label: `色阶 ${i + 1}`,
  })),
];

const TABLE_DATA = [
  { id: 1, name: '朱砂', hex: '#C8473F', usage: '印泥 · 点画' },
  { id: 2, name: '天青', hex: '#7FB5B5', usage: '瓷器 · 烟雨' },
  { id: 3, name: '藤黄', hex: '#FFB61E', usage: '国画 · 颜料' },
];

const TABLE_COLUMNS = [
  { colKey: 'name', title: '色名' },
  { colKey: 'hex', title: '色值' },
  { colKey: 'usage', title: '用途' },
];

const SELECT_OPTIONS = [
  { label: '朱砂', value: 'cinnabar' },
  { label: '天青', value: 'azure' },
  { label: '藤黄', value: 'gamboge' },
];

interface Props {
  colors: ColorEntry[];
  onApplyTheme: (hex: string) => void;
}

export default function SandboxPage({ colors, onApplyTheme }: Props) {
  const [hex, setHex] = useState(DEFAULT_HEX);
  const [hexText, setHexText] = useState(DEFAULT_HEX);
  const [query, setQuery] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);
  const [sliderVal, setSliderVal] = useState(60);
  const [selectVal, setSelectVal] = useState('cinnabar');

  const byHex = useMemo(
    () => new Map(colors.map((c) => [c.hex.toLowerCase(), c])),
    [colors],
  );
  const entry = byHex.get(hex.toLowerCase()) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return colors.slice(0, 40);
    return colors
      .filter((c) =>
        `${c.name} ${c.hex.toLowerCase()} ${c.pinyin.toLowerCase()} ${stripTones(c.pinyin)}`.includes(q),
      )
      .slice(0, 40);
  }, [colors, query]);

  const tokens = useMemo(() => toTDesignTokens(hex), [hex]);

  // 导出引擎生成的 Design Token：CSS 变量（亮/暗双段）或 JSON，可直接接入项目
  const download = (filename: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    MessagePlugin.success(`已导出 ${filename}`);
  };
  const slug = hex.replace('#', '');
  const exportCss = () =>
    download(
      `tdesign-tokens-${slug}.css`,
      `/* 拾色 · 东方 × @palette-studio/core — 基于 ${hex} 生成的 TDesign Design Token */\n` +
        `${tokensToCss(tokens.light, ':root')}\n\n` +
        `${tokensToCss(tokens.dark, ':root[theme-mode="dark"]')}\n`,
      'text/css',
    );
  const exportJson = () =>
    download(
      `tdesign-tokens-${slug}.json`,
      JSON.stringify({ base: hex, light: tokens.light, dark: tokens.dark }, null, 2),
      'application/json',
    );

  // 作用域换装：token 只注入 .sandbox-scope，卸载时移除 style，不污染全站
  useEffect(() => {
    let tag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement('style');
      tag.id = STYLE_ID;
      document.head.appendChild(tag);
    }
    tag.textContent =
      tokensToCss(tokens.light, '.sandbox-scope') +
      '\n' +
      tokensToCss(tokens.dark, ':root[theme-mode="dark"] .sandbox-scope');
    return () => {
      tag?.remove();
    };
  }, [tokens]);

  const pick = (next: string) => {
    setHex(next);
    setHexText(next);
  };

  const onHexText = (text: string) => {
    setHexText(text);
    const valid = normalizeHex(text);
    if (valid) setHex(valid);
  };
  const hexInvalid = normalizeHex(hexText) === null;

  // 无障碍小结（以亮色容器底为评估基准）
  const a11y = useMemo(() => {
    const scale = Array.from({ length: 10 }, (_, i) => tokens.light[`--td-brand-color-${i + 1}`]);
    const containerBg = tokens.light['--td-bg-color-container'];
    const brand = tokens.light['--td-brand-color'];
    const brand6 = tokens.light['--td-brand-color-6'];
    const level = accessibleTextLevel(scale, containerBg);
    return {
      brand,
      brand6,
      textOnBrand6: bestTextOn(brand6),
      hint: usageHint(brand, containerBg),
      level,
    };
  }, [tokens]);

  return (
    <main className="wrap sandbox-page">
      <header className="sandbox-head">
        <h1 className="sandbox-title">组件沙盒</h1>
        <p className="sandbox-sub">选一色，看整套 TDesign 组件实时换装</p>
      </header>

      <hr className="hairline" />

      <div className="sandbox-body">
        {/* 左：控制区 */}
        <aside className="sandbox-controls">
          <h2 className="sandbox-section-title">基色</h2>
          <div className="sandbox-current">
            <i style={{ backgroundColor: hex }} />
            <div>
              <p className="sandbox-current-name">{entry?.name ?? '自定义色'}</p>
              <p className="sandbox-current-hex">{hex.toUpperCase()}</p>
            </div>
          </div>
          <div className="sandbox-hex-row">
            <input
              className={`sandbox-hex-input${hexInvalid ? ' invalid' : ''}`}
              value={hexText}
              onChange={(e) => onHexText(e.target.value)}
              placeholder="#C8473F"
              spellCheck={false}
            />
            <input
              className="sandbox-color-input"
              type="color"
              value={normalizeHex(hexText) ?? hex}
              onChange={(e) => pick(e.target.value)}
              title="拾色器"
            />
          </div>
          <Button theme="primary" block onClick={() => onApplyTheme(hex)}>
            应用到全站
          </Button>
          <div className="sandbox-export">
            <Button variant="outline" block onClick={exportCss}>
              下载 CSS Token
            </Button>
            <Button variant="outline" block onClick={exportJson}>
              下载 JSON Token
            </Button>
          </div>

          <h2 className="sandbox-section-title sandbox-search-title">传统色</h2>
          <input
            className="sandbox-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索色名 / 拼音 / 色值"
          />
          <ul className="sandbox-color-list">
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  className={`sandbox-color-item${c.hex.toLowerCase() === hex.toLowerCase() ? ' active' : ''}`}
                  onClick={() => pick(c.hex)}
                >
                  <i style={{ backgroundColor: c.hex }} />
                  <span className="sandbox-color-item-name">{c.name}</span>
                  <span className="sandbox-color-item-hex">{c.hex.toUpperCase()}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="sandbox-color-empty">无匹配的传统色</li>}
          </ul>
        </aside>

        {/* 右：作用域预览 */}
        <section className="sandbox-preview-col">
          <div className="sandbox-scope">
            <p className="sandbox-scope-caption">预览 · 仅此容器换装</p>

            <div className="sandbox-demo">
              <p className="sandbox-demo-title">按钮</p>
              <div className="sandbox-demo-row">
                <Button theme="primary">主要按钮</Button>
                <Button variant="outline">描边按钮</Button>
                <Button ghost>幽灵按钮</Button>
                <Button theme="danger">危险按钮</Button>
              </div>
            </div>

            <div className="sandbox-demo">
              <p className="sandbox-demo-title">标签</p>
              <div className="sandbox-demo-row">
                <Tag>默认</Tag>
                <Tag theme="primary">品牌</Tag>
                <Tag theme="success">成功</Tag>
                <Tag theme="warning">警告</Tag>
                <Tag theme="danger">危险</Tag>
              </div>
            </div>

            <div className="sandbox-demo">
              <p className="sandbox-demo-title">表单</p>
              <div className="sandbox-demo-row sandbox-demo-form">
                <Input placeholder="请输入色名" style={{ width: 200 }} />
                <Select
                  value={selectVal}
                  onChange={(v) => setSelectVal(v as string)}
                  options={SELECT_OPTIONS}
                  style={{ width: 160 }}
                />
                <Switch value={switchOn} onChange={(v) => setSwitchOn(v)} />
                <Slider
                  value={sliderVal}
                  onChange={(v) => setSliderVal(v as number)}
                  style={{ width: 200 }}
                />
              </div>
            </div>

            <div className="sandbox-demo">
              <p className="sandbox-demo-title">反馈</p>
              <div className="sandbox-demo-stack">
                <Alert theme="info" message="这是一条信息提示：颜色已就绪。" />
                <Progress percentage={68} />
                <div className="sandbox-demo-row">
                  <Button
                    variant="outline"
                    onClick={() => MessagePlugin.success('沙盒内换色成功')}
                  >
                    全局提示
                  </Button>
                  <Button variant="outline" onClick={() => setDialogVisible(true)}>
                    打开对话框
                  </Button>
                </div>
              </div>
            </div>

            <div className="sandbox-demo">
              <p className="sandbox-demo-title">数据</p>
              <Tabs defaultValue="table">
                <TabPanel value="table" label="表格">
                  <Table
                    rowKey="id"
                    data={TABLE_DATA}
                    columns={TABLE_COLUMNS}
                    bordered={false}
                    hover
                  />
                  <div className="sandbox-pagination">
                    <Pagination total={128} pageSize={10} />
                  </div>
                </TabPanel>
                <TabPanel value="note" label="说明" panel={<p className="sandbox-tab-note">所有组件颜色均由引擎生成的 token 驱动，切换基色即整体换装。</p>} />
              </Tabs>
            </div>

            <Dialog
              visible={dialogVisible}
              attach=".sandbox-scope"
              header="沙盒对话框"
              confirmBtn="好"
              onConfirm={() => setDialogVisible(false)}
              onClose={() => setDialogVisible(false)}
            >
              <p>此对话框挂载在沙盒容器内，随作用域 token 一并换装。</p>
            </Dialog>
          </div>
        </section>
      </div>

      <hr className="hairline" />

      {/* Token 检视表 */}
      <section className="sandbox-section">
        <h2 className="sandbox-section-title">Token 检视 · 亮色表</h2>
        <div className="sandbox-tokens">
          {TOKEN_ROWS.map(({ key, label }) => {
            const value = tokens.light[key];
            return (
              <button
                key={key}
                className="sandbox-token-row"
                onClick={() => copyText(value)}
                title="点击复制"
              >
                <i style={{ backgroundColor: value }} />
                <span className="sandbox-token-name">{key}</span>
                <span className="sandbox-token-label">{label}</span>
                <span className="sandbox-token-value">{value}</span>
              </button>
            );
          })}
        </div>
      </section>

      <hr className="hairline" />

      {/* 无障碍小结 */}
      <section className="sandbox-section">
        <h2 className="sandbox-section-title">无障碍小结</h2>
        <div className="sandbox-a11y">
          <div className="sandbox-a11y-item">
            <p className="sandbox-a11y-label">主色第 6 级文字色</p>
            <p className="sandbox-a11y-value">
              <i style={{ backgroundColor: a11y.brand6 }} />
              {a11y.textOnBrand6 === '#ffffff' ? '白字' : '黑字'}（APCA 取优）
            </p>
          </div>
          <div className="sandbox-a11y-item">
            <p className="sandbox-a11y-label">主色于容器底</p>
            <p className="sandbox-a11y-value">{a11y.hint}</p>
          </div>
          <div className="sandbox-a11y-item">
            <p className="sandbox-a11y-label">容器底正文可用级</p>
            <p className="sandbox-a11y-value">
              {a11y.level === -1
                ? '色阶内无达标级（Lc ≥ 75）'
                : `自第 ${a11y.level + 1} 级起可作正文（Lc ≥ 75）`}
            </p>
          </div>
        </div>
        <p className="sandbox-note">评估基准：亮色容器底（{tokens.light['--td-bg-color-container']}）。</p>
      </section>
    </main>
  );
}
