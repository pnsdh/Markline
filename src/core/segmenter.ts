import { MarkerEvent } from './models';
import { Segment } from './segment';
import { LogTime } from './time';

/** 구간화에 필요한 세션 데이터(구조적 타입). LogSession 인스턴스와 워커 스냅샷 모두 만족. */
export interface SessionData {
  events: MarkerEvent[];
  combats: { start: LogTime; end: LogTime | null }[];
  zones: { time: LogTime; zone: string }[];
}

type CombatWin = { start: LogTime; end: LogTime | null };

/**
 * 이벤트를 전투 구간/대기 구간으로 묶는다. 이벤트가 있는 구간만 생성.
 * 전투 종료 후 다음 전투 전에 일어난 정리는 한 트라이의 마무리로 보고 직전 전투에 통합하되,
 * postCombat 플래그로 "전투 종료 후"임을 구분한다. 데스크톱 Segmenter.cs 의 1:1 포팅.
 */
const IDLE_GAP_SPLIT_MS = 20 * 60 * 1000; // 대기 구간을 새로 끊는 유휴 간격
const POST_COMBAT_WINDOW_MS = 12 * 60 * 1000; // 전투 종료 후 이만큼 안의 정리는 직전 전투에 통합

export function buildSegments(s: SessionData): Segment[] {
  const segments: Segment[] = [];
  const combatSeg = new Map<CombatWin, Segment>();
  const combats = s.combats;
  let gap: Segment | null = null;
  let gapLast: LogTime = 0;

  const combatSegFor = (win: CombatWin): Segment => {
    let seg = combatSeg.get(win);
    if (!seg) {
      seg = new Segment(true, win.start, zoneAt(s.zones, win.start), win.end);
      combatSeg.set(win, seg);
      segments.push(seg);
    }
    seg.end = win.end;
    return seg;
  };

  for (const ev of s.events) {
    // 1) 전투 중?
    const inWin = combats.find((w) => ev.time >= w.start && (w.end == null || ev.time <= w.end));
    if (inWin) {
      const seg = combatSegFor(inWin);
      ev.postCombat = false;
      ev.relSpan = ev.time - inWin.start;
      seg.events.push(ev);
      gap = null;
      continue;
    }

    // 2) 전투 종료 후 정리? 직전에 끝난 전투에 통합
    let prev: CombatWin | null = null;
    for (const w of combats) {
      if (w.end != null && w.end < ev.time) prev = w;
      else break;
    }
    const next = combats.find((w) => w.start > ev.time);

    if (
      prev?.end != null &&
      (next == null || ev.time < next.start) &&
      ev.time - prev.end <= POST_COMBAT_WINDOW_MS &&
      zoneAt(s.zones, prev.end) === zoneAt(s.zones, ev.time)
    ) {
      const seg = combatSegFor(prev);
      ev.postCombat = true;
      ev.relSpan = ev.time - prev.end;
      seg.events.push(ev);
      gap = null;
      continue;
    }

    // 3) 전투와 무관한 단독 활동 (연습장 등)
    const zone = zoneAt(s.zones, ev.time);
    if (gap == null || gap.zone !== zone || ev.time - gapLast > IDLE_GAP_SPLIT_MS) {
      gap = new Segment(false, ev.time, zone);
      segments.push(gap);
    }
    gap.end = ev.time;
    gapLast = ev.time;
    ev.postCombat = false;
    ev.relSpan = null;
    gap.events.push(ev);
  }

  return segments;
}

function zoneAt(zones: { time: LogTime; zone: string }[], t: LogTime): string {
  let result = '';
  for (const z of zones) {
    if (z.time > t) break;
    result = z.zone;
  }
  return result;
}
