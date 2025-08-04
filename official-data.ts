/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LocateStall } from './types.ts';

/**
 * Defines the starting coordinates for each row/column of stalls on the map.
 * This data acts as a template or reference point. The `stall-processor.ts` file
 * uses these coordinates along with a stall's specific number (e.g., the "01" in "A01")
 * to calculate its precise position on the map image.
 * The 'border' property defines the bounding box for the entire row.
 */
export const locateStalls: LocateStall[] = [
  {
    id: 'A',
    num: 1,
    coords: { top: 87.8, left: 91, width: 1.05, height: 1.4 },
    border: { top: 86.15, left: 52.5, bottom: 89.2, right: 92.05 },
  },
  {
    id: 'B',
    num: 1,
    coords: { top: 83.1, left: 91, width: 1.05, height: 1.4 },
    border: { top: 81.45, left: 52.5, bottom: 84.5, right: 92.05 },
  },
  {
    id: 'C',
    num: 1,
    coords: { top: 78.4, left: 91, width: 1.05, height: 1.4 },
    border: { top: 76.75, left: 52.5, bottom: 79.8, right: 92.05 },
  },
  {
    id: 'D',
    num: 1,
    coords: { top: 73.5, left: 91, width: 1.05, height: 1.4 },
    border: { top: 71.85, left: 52.5, bottom: 74.9, right: 92.05 },
  },
  {
    id: 'E',
    num: 1,
    coords: { top: 68.5, left: 91, width: 1.05, height: 1.4 },
    border: { top: 66.85, left: 52.5, bottom: 69.9, right: 92.05 },
  },
  {
    id: 'F',
    num: 1,
    coords: { top: 63.9, left: 91, width: 1.05, height: 1.4 },
    border: { top: 62.25, left: 52.5, bottom: 65.3, right: 92.05 },
  },
  {
    id: 'G',
    num: 1,
    coords: { top: 59.1, left: 91, width: 1.05, height: 1.4 },
    border: { top: 57.45, left: 52.5, bottom: 60.5, right: 92.05 },
  },
  {
    id: 'H',
    num: 1,
    coords: { top: 54.3, left: 91, width: 1.05, height: 1.4 },
    border: { top: 52.65, left: 52.5, bottom: 55.7, right: 92.05 },
  },
  {
    id: 'I',
    num: 1,
    coords: { top: 49.5, left: 91, width: 1.05, height: 1.4 },
    border: { top: 47.85, left: 52.5, bottom: 50.9, right: 92.05 },
  },
  {
    id: 'J',
    num: 1,
    coords: { top: 44.5, left: 91, width: 1.05, height: 1.4 },
    border: { top: 42.85, left: 52.5, bottom: 45.9, right: 92.05 },
  },
  {
    id: 'K',
    num: 1,
    coords: { top: 39.6, left: 91, width: 1.05, height: 1.4 },
    border: { top: 37.95, left: 52.5, bottom: 41.0, right: 92.05 },
  },
  {
    id: 'L',
    num: 1,
    coords: { top: 34.8, left: 91, width: 1.05, height: 1.4 },
    border: { top: 33.15, left: 52.5, bottom: 36.2, right: 92.05 },
  },
  {
    id: 'M',
    num: 1,
    coords: { top: 30.1, left: 91, width: 1.05, height: 1.4 },
    border: { top: 28.45, left: 52.5, bottom: 31.5, right: 92.05 },
  },
  {
    id: 'N',
    num: 1,
    coords: { top: 25.2, left: 91, width: 1.05, height: 1.4 },
    border: { top: 23.55, left: 52.5, bottom: 26.6, right: 92.05 },
  },
  {
    id: 'O',
    num: 1,
    coords: { top: 20.4, left: 91, width: 1.05, height: 1.4 },
    border: { top: 18.75, left: 52.5, bottom: 21.8, right: 92.05 },
  },
  {
    id: 'P',
    num: 1,
    coords: { top: 15.6, left: 91, width: 1.05, height: 1.4 },
    border: { top: 13.95, left: 52.5, bottom: 17.0, right: 92.05 },
  },
  {
    id: 'Q',
    num: 1,
    coords: { top: 10.8, left: 91, width: 1.05, height: 1.4 },
    border: { top: 9.15, left: 52.5, bottom: 12.2, right: 92.05 },
  },
  {
    id: 'R',
    num: 1,
    coords: { top: 87.8, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 86.15, left: 7.8, bottom: 89.2, right: 47.35 },
  },
  {
    id: 'S',
    num: 1,
    coords: { top: 83.1, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 81.45, left: 7.8, bottom: 84.5, right: 47.35 },
  },
  {
    id: 'T',
    num: 1,
    coords: { top: 78.4, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 76.75, left: 7.8, bottom: 79.8, right: 47.35 },
  },
  {
    id: 'U',
    num: 1,
    coords: { top: 73.5, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 71.85, left: 7.8, bottom: 74.9, right: 47.35 },
  },
  {
    id: 'V',
    num: 1,
    coords: { top: 68.7, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 67.05, left: 7.8, bottom: 70.1, right: 47.35 },
  },
  {
    id: 'W',
    num: 1,
    coords: { top: 63.9, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 62.25, left: 7.8, bottom: 65.3, right: 47.35 },
  },
  {
    id: 'X',
    num: 1,
    coords: { top: 59.1, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 57.45, left: 7.8, bottom: 60.5, right: 47.35 },
  },
  {
    id: 'Y',
    num: 1,
    coords: { top: 54.3, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 52.65, left: 7.8, bottom: 55.7, right: 47.35 },
  },
  {
    id: 'Z',
    num: 1,
    coords: { top: 49.5, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 47.85, left: 7.8, bottom: 50.9, right: 47.35 },
  },
  {
    id: '鼠',
    num: 1,
    coords: { top: 44.5, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 42.85, left: 7.8, bottom: 45.9, right: 47.35 },
  },
  {
    id: '牛',
    num: 1,
    coords: { top: 39.6, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 37.95, left: 7.8, bottom: 41.0, right: 47.35 },
  },
  {
    id: '虎',
    num: 1,
    coords: { top: 34.9, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 33.25, left: 7.8, bottom: 36.3, right: 47.35 },
  },
  {
    id: '兔',
    num: 1,
    coords: { top: 30.1, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 28.45, left: 7.8, bottom: 31.5, right: 47.35 },
  },
  {
    id: '龍',
    num: 1,
    coords: { top: 25.2, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 23.55, left: 7.8, bottom: 26.6, right: 47.35 },
  },
  {
    id: '蛇',
    num: 1,
    coords: { top: 20.4, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 18.75, left: 7.8, bottom: 21.8, right: 47.35 },
  },
  {
    id: '馬',
    num: 1,
    coords: { top: 15.6, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 13.95, left: 7.8, bottom: 17.0, right: 47.35 },
  },
  {
    id: '羊',
    num: 1,
    coords: { top: 10.8, left: 46.3, width: 1.05, height: 1.4 },
    border: { top: 9.15, left: 7.8, bottom: 12.2, right: 47.35 },
  },
  {
    id: '猴',
    num: 1,
    coords: { top: 73.5, left: 4.5, width: 1.1, height: 1.44 },
    border: { top: 52.7, left: 4.5, bottom: 74.9, right: 5.55 },
    isGrouped: true,
  },
  {
    id: '雞',
    num: 1,
    coords: { top: 43.7, left: 4.5, width: 1.1, height: 1.44 },
    border: { top: 23, left: 4.5, bottom: 45.6, right: 5.55 },
    isGrouped: true,
  },
  {
    id: '狗',
    num: 1,
    coords: { top: 18.2, left: 4.5, width: 1.1, height: 1.44 },
    border: { top: 7.5, left: 4.5, bottom: 19.8, right: 5.55 },
    isGrouped: true,
  },
  {
    id: '特',
    num: 1,
    coords: { top: 84.4, left: 4.15, width: 1.8, height: 2.41 },
    border: { top: 77.15, left: 4.15, bottom: 87.2, right: 5.75 },
    isGrouped: true,
  },
  {
    id: '商',
    num: 1,
    coords: { top: 89.5, left: 4.15, width: 1.8, height: 2.41 },
    border: { top: 87.5, left: 4.15, bottom: 91.5, right: 5.75 },
    isGrouped: true,
  },
  {
    id: '範',
    num: 1,
    coords: { top: 0.5, left: 91, width: 5, height: 5 },
    border: { top: 0.5, left: 86, bottom: 5.5, right: 96 },
  },
];
