// 자식 지도 그림 — 생성물. scripts/childmaps/art/*.js 를 고친 뒤 `node scripts/childmaps/to_ts.mjs > src/map/childMaps.ts` 로 다시 만든다.
import type { ChildMapArt } from './childMapArt'

export const CHILD_MAP_ART: Record<string, ChildMapArt> = {
  'eye-of-ugin': {
    id: 'eye-of-ugin',
    size: [1400, 1100],
    glyphScale: 4,
    terrain: [
    ],
    parts: [
    ],
    labels: [
    ],
    subjects: {
      'sorin-markov': { at: [420, 660], size: 80 },
      'chandra-ablaze': { at: [760, 650], size: 80, flip: true },
      'eldrazi-monument': { at: [900, 900], size: 80 },
    },
  },
  'jwar-isle': {
    id: 'jwar-isle',
    size: [1360, 940],
    glyphScale: 4,
    terrain: [
    ],
    parts: [
    ],
    labels: [
    ],
    subjects: {
      'mindbreak-trap': { at: [600, 420], size: 80 },
    },
  },
  'makindi-trenches': {
    id: 'makindi-trenches',
    size: [1400, 1000],
    glyphScale: 4,
    terrain: [
    ],
    parts: [
    ],
    labels: [
    ],
    subjects: {
      'warren-instigator': { at: [600, 650], size: 80 },
    },
  },
  'malakir': {
    id: 'malakir',
    size: [1400, 1000],
    glyphScale: 4,
    terrain: [
    ],
    parts: [
    ],
    labels: [
    ],
    subjects: {
      'kalitas-bloodchief-of-ghet': { at: [480, 660], size: 80 },
    },
  },
  'tangled-vales': {
    id: 'tangled-vales',
    size: [1350, 1000],
    glyphScale: 4,
    terrain: [
    ],
    parts: [
    ],
    labels: [
    ],
    subjects: {
      'nissa-revane': { at: [570, 600], size: 80 },
    },
  },
}
