import { Loc } from './loc';

export type MarkerKind = 'Attack' | 'Bind' | 'Ignore' | 'Shape';

/** 카테고리 대표색(인게임 아이콘에서 추출) — 복사·범례 등 비테마 용도. */
export function categoryHex(kind: MarkerKind): string {
  switch (kind) {
    case 'Attack':
      return '#B3801D';
    case 'Bind':
      return '#784590';
    case 'Ignore':
      return '#B63153';
    default:
      return '#3EA0DA';
  }
}

/** 사인 마커 정의 (waymark 번호 0~16). */
export interface Marker {
  readonly id: number;
  readonly enId: string;
  readonly kind: MarkerKind;
  readonly iconFile: string; // public/markers/<iconFile>.png
}

/** 현재 언어의 표식 이름. */
export function markerName(m: Marker): string {
  return Loc.markerName(m.enId);
}

const BY_ID: Record<number, Marker> = {
  0: { id: 0, enId: 'attack1', kind: 'Attack', iconFile: 'attack1' },
  1: { id: 1, enId: 'attack2', kind: 'Attack', iconFile: 'attack2' },
  2: { id: 2, enId: 'attack3', kind: 'Attack', iconFile: 'attack3' },
  3: { id: 3, enId: 'attack4', kind: 'Attack', iconFile: 'attack4' },
  4: { id: 4, enId: 'attack5', kind: 'Attack', iconFile: 'attack5' },
  5: { id: 5, enId: 'bind1', kind: 'Bind', iconFile: 'bind1' },
  6: { id: 6, enId: 'bind2', kind: 'Bind', iconFile: 'bind2' },
  7: { id: 7, enId: 'bind3', kind: 'Bind', iconFile: 'bind3' },
  8: { id: 8, enId: 'ignore1', kind: 'Ignore', iconFile: 'ignore1' },
  9: { id: 9, enId: 'ignore2', kind: 'Ignore', iconFile: 'ignore2' },
  10: { id: 10, enId: 'square', kind: 'Shape', iconFile: 'square' },
  11: { id: 11, enId: 'circle', kind: 'Shape', iconFile: 'circle' },
  12: { id: 12, enId: 'cross', kind: 'Shape', iconFile: 'cross' },
  13: { id: 13, enId: 'triangle', kind: 'Shape', iconFile: 'triangle' },
  14: { id: 14, enId: 'attack6', kind: 'Attack', iconFile: 'attack6' },
  15: { id: 15, enId: 'attack7', kind: 'Attack', iconFile: 'attack7' },
  16: { id: 16, enId: 'attack8', kind: 'Attack', iconFile: 'attack8' },
};

export function getMarker(id: number): Marker {
  return BY_ID[id] ?? { id, enId: `waymark${id}`, kind: 'Shape', iconFile: 'square' };
}
