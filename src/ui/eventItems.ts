import { Loc } from '../core/loc';
import { EventKind, MarkerEvent } from '../core/models';
import { Segment } from '../core/segment';
import type { ActionCat } from './store';

export type EventItem =
  | { kind: 'header'; seg: Segment; count: number; key: string }
  | { kind: 'divider'; label: string; key: string }
  | { kind: 'event'; ev: MarkerEvent; segKey: string; key: string };

export interface FilterOpts {
  selectedKey: string; // 'ALL' 또는 segment.key
  search: string;
  onlyMine: boolean;
  eventNewestFirst: boolean;
  actionFilter?: ActionCat[]; // 빈/없음 = 전체
  hideIdle?: boolean; // 대기(비전투) 구간 제외
  hidePostCombat?: boolean; // 전투 종료 후 정리 이벤트 제외
}

/** 구간의 표시 이벤트 수 (종료후정리 숨김이면 제외). */
export function segCount(seg: Segment, hidePostCombat: boolean): number {
  return hidePostCombat ? seg.events.reduce((n, e) => n + (e.postCombat ? 0 : 1), 0) : seg.events.length;
}

/** 표시 옵션(대기 숨김·종료후정리 숨김)을 반영한 전체 마커 총합. */
export function effectiveTotal(segments: Segment[], hideIdle: boolean, hidePostCombat: boolean): number {
  let n = 0;
  for (const s of segments) {
    if (hideIdle && !s.isCombat) continue;
    n += segCount(s, hidePostCombat);
  }
  return n;
}

/** EventKind → 동작 필터 카테고리 (제거+자동해제는 'remove'로 묶음). */
export const actionCatOf: Record<EventKind, ActionCat> = {
  Add: 'add',
  Move: 'move',
  Replace: 'replace',
  Remove: 'remove',
  SystemRemove: 'remove',
};

function passes(ev: MarkerEvent, opts: FilterOpts): boolean {
  if (opts.hidePostCombat && ev.postCombat) return false;
  if (opts.onlyMine && !ev.involvesMe) return false;
  if (opts.actionFilter && opts.actionFilter.length > 0 && !opts.actionFilter.includes(actionCatOf[ev.kind])) return false;
  const q = opts.search.trim();
  return q.length === 0 || ev.matches(q);
}

/** 좌측 선택/필터/정렬을 반영해 우측 이벤트 행 목록(머리글·구분선 포함)을 만든다. */
export function buildEventItems(segments: Segment[], opts: FilterOpts): { items: EventItem[]; shown: number } {
  const items: EventItem[] = [];
  let shown = 0;
  let source = opts.selectedKey === 'ALL' ? segments.slice() : segments.filter((s) => s.key === opts.selectedKey);
  if (opts.hideIdle) source = source.filter((s) => s.isCombat); // 임무 외(필드) 구간 제외
  if (opts.eventNewestFirst) source = source.slice().reverse();

  for (const seg of source) {
    const evs = seg.events.filter((e) => passes(e, opts));
    if (evs.length === 0) continue;
    items.push({ kind: 'header', seg, count: evs.length, key: `h|${seg.key}` });

    const inCombat = evs.filter((e) => !e.postCombat);
    const postCombat = evs.filter((e) => e.postCombat);
    const hasDivider = seg.isCombat && postCombat.length > 0;

    if (opts.eventNewestFirst) {
      // 최신 먼저: 전투 종료 후(나중) → 구분선 → 전투 중, 각 그룹 역순
      for (let i = postCombat.length - 1; i >= 0; i--) {
        items.push({ kind: 'event', ev: postCombat[i], segKey: seg.key, key: evKey(postCombat[i]) });
        shown++;
      }
      if (hasDivider) items.push({ kind: 'divider', label: Loc.t('post_combat'), key: `d|${seg.key}` });
      for (let i = inCombat.length - 1; i >= 0; i--) {
        items.push({ kind: 'event', ev: inCombat[i], segKey: seg.key, key: evKey(inCombat[i]) });
        shown++;
      }
    } else {
      for (const ev of inCombat) {
        items.push({ kind: 'event', ev, segKey: seg.key, key: evKey(ev) });
        shown++;
      }
      if (hasDivider) items.push({ kind: 'divider', label: Loc.t('post_combat'), key: `d|${seg.key}` });
      for (const ev of postCombat) {
        items.push({ kind: 'event', ev, segKey: seg.key, key: evKey(ev) });
        shown++;
      }
    }
  }
  return { items, shown };
}

// 세션 events 인덱스(seq)는 append-only라 스냅샷 간 안정 → 실시간 갱신 시 기존 행 유지,
// 새 행만 추가되어 전체 재마운트(깜빡임)가 없다.
function evKey(ev: MarkerEvent): string {
  return `e|${ev.seq}`;
}

/** 평탄한 items 를 구간 섹션으로 묶는다 (헤더 + 그 뒤 이벤트/구분선). sticky 헤더를 섹션별로 가두는 데 쓴다. */
export function groupSections(items: EventItem[]): { header: Extract<EventItem, { kind: 'header' }>; body: EventItem[] }[] {
  const sections: { header: Extract<EventItem, { kind: 'header' }>; body: EventItem[] }[] = [];
  for (const it of items) {
    if (it.kind === 'header') sections.push({ header: it, body: [] });
    else if (sections.length) sections[sections.length - 1].body.push(it);
  }
  return sections;
}
