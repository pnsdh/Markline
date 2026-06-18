import { EventKind } from '../core/models';
import { MarkerKind } from '../core/markers';

// 마커 카테고리별 배지 색 (데스크톱 MarkerPalette 블렌딩 포팅, 테마 대응).
type RGB = [number, number, number];

function base(kind: MarkerKind): RGB {
  switch (kind) {
    case 'Attack':
      return [0xb3, 0x80, 0x1d]; // 금색
    case 'Bind':
      return [0x78, 0x45, 0x90]; // 보라
    case 'Ignore':
      return [0xb6, 0x31, 0x53]; // 진홍
    default:
      return [0x3e, 0xa0, 0xda]; // 파랑(도형)
  }
}

function blend(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const rgb = (c: RGB) => `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;

export interface BadgePalette {
  bg: string;
  border: string;
  fg: string;
}

export function markerPalette(kind: MarkerKind, dark: boolean): BadgePalette {
  const b = base(kind);
  const surface: RGB = dark ? [0x2c, 0x2b, 0x39] : [0xf2, 0xf1, 0xf8];
  const target: RGB = dark ? [255, 255, 255] : [0, 0, 0];
  return {
    bg: rgb(blend(surface, b, dark ? 0.14 : 0.1)),
    border: rgb(blend(surface, b, dark ? 0.55 : 0.4)),
    fg: rgb(blend(b, target, dark ? 0.42 : 0.2)),
  };
}

// 동작 배지 색 (데스크톱 KindBrushConverter 고정값).
export function kindColor(kind: EventKind): string {
  switch (kind) {
    case 'Add':
      return '#2E9E5B';
    case 'Remove':
      return '#D6464D';
    case 'Move':
      return '#DD8210';
    case 'Replace':
      return '#9A4FC0';
    default:
      return '#82838E'; // SystemRemove
  }
}

// 에셋 URL (public/ — base 경로 기준)
const BASE = import.meta.env.BASE_URL;
export const markerIconUrl = (file: string) => `${BASE}markers/${file}.png`;
export const jobIconUrl = (id: number) => `${BASE}jobs/job${id}.png`;
