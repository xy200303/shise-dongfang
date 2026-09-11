/**
 * GalleryPage —— 「星图」：色彩空间的三种读法
 *
 * 原「观色」页曾并置星图与釉色器物两签；器物已并入「造物」页的器架
 * （釉色即造物之一种），此页只余星图，保留统一页面骨架。
 */
import type { ColorEntry } from '../types';
import StarMapPage from './StarMapPage';

interface Props {
  colors: ColorEntry[];
  onPickColor: (c: ColorEntry) => void;
}

export default function GalleryPage({ colors, onPickColor }: Props) {
  return (
    <main className="wrap">
      <header className="page-head">
        <h1 className="page-title">星图</h1>
        <p className="page-sub">星垂平野</p>
      </header>

      <hr className="hairline" />

      <StarMapPage colors={colors} onPickColor={onPickColor} />
    </main>
  );
}
