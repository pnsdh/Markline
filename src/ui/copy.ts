import { MarkerEvent } from '../core/models';
import { Segment } from '../core/segment';
import type { EventItem } from './eventItems';
import { richSentence } from './v2/descRich';

// 복사 텍스트 생성 — 행/구간/전체에서 공용으로 쓴다.
// 형식: "시각(ms) (상대시간) | 동작 | 문장(인라인 마커)" — 상대시간은 시각 바로 뒤, 필드 구분은 | .
// (CLI --dump / 골든 검증은 core 의 toCopyLine() 을 따로 사용하므로 영향 없음.)

/** 이벤트 한 줄 — 화면에 보이는 행과 같은 내용. */
export function eventCopyLine(ev: MarkerEvent): string {
  const rel = ev.relTimeText ? ` (${ev.relTimeText})` : '';
  return `${ev.timeText}${rel} | ${ev.kindText} | ${richSentence(ev)}`;
}

/** 구간 머리글 줄. */
export function segHeaderLine(seg: Segment): string {
  return `===== [${seg.tagText}] ${seg.title} · ${seg.dateText} ${seg.timeRangeText} · ${seg.countText} =====`;
}

/** 구간 전체(머리글 + 모든 이벤트). */
export function segCopyText(seg: Segment): string {
  return [segHeaderLine(seg), ...seg.events.map(eventCopyLine)].join('\n');
}

/** 화면에 표시된 목록 전체(머리글 + 이벤트)를 복사 텍스트로. */
export function buildCopyText(items: EventItem[]): string {
  const out: string[] = [];
  for (const it of items) {
    if (it.kind === 'header') out.push(segHeaderLine(it.seg));
    else if (it.kind === 'event') out.push(eventCopyLine(it.ev));
  }
  return out.join('\n');
}
