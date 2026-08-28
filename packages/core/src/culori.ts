/**
 * culori 按需引入封装。
 *
 * `culori/fn` 是可 tree-shake 的函数树，但色彩空间需要显式注册；
 * `culori/css` 引导模块注册全部 CSS 色彩空间（rgb / oklch / lab / hsl…）。
 * 集中到本模块保证注册先于使用，且业务代码只引用用到的函数。
 */
import 'culori/css';

export {
  clampChroma,
  converter,
  differenceCiede2000,
  formatHex,
  inGamut,
  parse,
  wcagContrast,
} from 'culori/fn';
export type { Oklch } from 'culori/fn';
