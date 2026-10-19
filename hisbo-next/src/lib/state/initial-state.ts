import { AppState, Category } from '@/types/state';
import { uid } from './calculations';

export const PAL = [
  '#0f7a58',
  '#f5b301',
  '#2f8cff',
  '#e0529c',
  '#8a5cf6',
  '#ff6b5b',
  '#22b8cf',
  '#7ba11a',
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_food', name: 'Food', limit: 600000 },
  { id: 'cat_trans', name: 'Transport', limit: 200000 },
  { id: 'cat_bills', name: 'Bills', limit: 500000 },
  { id: 'cat_shop', name: 'Shopping', limit: 300000 },
];

export const INITIAL_STATE: AppState = {
  cats: DEFAULT_CATEGORIES,
  exps: [],
  rec: [],
  goals: [],
  alerts: [],
  groups: [],
  fired: {},
  phone: '',
  chan: 'wa',
  theme: 'auto',
  hide: false,
  mailOn: false,
  ct: 'donut',
};
