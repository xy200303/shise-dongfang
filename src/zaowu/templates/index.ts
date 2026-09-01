/** 造物模板注册表：新增物件只需在此登记 */
import type { TemplateDef } from '../types';
import { mamian, quju, ruqun } from './hanfu';
import { deng, san, tuan } from './objects';

export const TEMPLATES: TemplateDef[] = [quju, ruqun, mamian, tuan, san, deng];
