/** 造物模板注册表：新增物件只需在此登记（曲裾/襦裙/马面裙/团扇已升级为矢量插画，见 illustrated.ts） */
import type { TemplateDef, IllustratedTemplateDef } from '../types';
import { deng, san } from './objects';
import { qujuIllus, ruqunIllus, mamianIllus, tuanIllus } from './illustrated';

export const TEMPLATES: (TemplateDef | IllustratedTemplateDef)[] = [
  qujuIllus,
  ruqunIllus,
  mamianIllus,
  tuanIllus,
  san,
  deng,
];
