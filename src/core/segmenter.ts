import { MarkerEvent } from './models';
import { Segment } from './segment';
import { LogTime } from './time';

/** 구간화에 필요한 세션 데이터(구조적 타입). LogSession 인스턴스와 워커 스냅샷 모두 만족. */
export interface SessionData {
  events: MarkerEvent[];
  combats: { start: LogTime; end: LogTime | null }[];
  zones: { time: LogTime; zone: string; cf?: boolean }[]; // cf=인스턴스 듀티 여부
  wipes?: readonly LogTime[]; // 전멸 시각 — 구간(트라이) 경계
}

type CombatWin = { start: LogTime; end: LogTime | null };

const POST_COMBAT_WINDOW_MS = 12 * 60 * 1000; // 전투 종료 후 이만큼 안의 마커는 '전투 후 정리'

/**
 * 이벤트를 구간으로 묶는다. 경계 = **존 변경 + 전멸 직후 재교전**(전멸 다음의 첫 전투 시작).
 *  - 레이드·토벌·절: 트라이마다 전멸 → 트라이별로 나뉜다. 전멸 시점이 아니라 '다음 풀'에서 끊어,
 *    전멸 후 정리가 직전(전멸한) 트라이의 '전투 후 정리'로 남는다.
 *  - 던전·필드: 전멸이 (거의) 없으니 인스턴스(존) 단위 한 덩어리.
 * 구간 안에서 상대시간/전투후정리/전투여부는 기존(전투 윈도우 260) 규칙 그대로 계산한다.
 */
export function buildSegments(s: SessionData): Segment[] {
  const events = s.events;
  if (events.length === 0) return [];
  const combats = s.combats;
  const wipes = s.wipes ?? [];

  // 전멸 직후 첫 전투 시작 = 재교전 = 새 구간 시작. (전멸 자체는 경계가 아니다.)
  const rePulls = wipes.map((w) => combats.find((c) => c.start > w)?.start).filter((t): t is LogTime => t != null);
  const bounds = [...s.zones.map((z) => z.time), ...rePulls].sort((a, b) => a - b).filter((t, i, a) => i === 0 || t !== a[i - 1]);

  const segments: Segment[] = [];
  let cur: Segment | null = null;
  let bi = 0; // 다음으로 비교할 경계 인덱스 (이벤트가 시간순이라 단조 전진)

  for (const ev of events) {
    let crossed = false;
    while (bi < bounds.length && bounds[bi] <= ev.time) {
      crossed = true;
      bi++;
    }
    if (cur == null || crossed) {
      cur = new Segment(false, ev.time, zoneAt(s.zones, ev.time));
      segments.push(cur);
    }
    cur.end = ev.time;
    cur.events.push(ev);
  }

  for (const seg of segments) setSegmentTiming(seg, combats, cfAt(s.zones, seg.start) !== false);
  return segments;
}

/**
 * 구간 내 각 이벤트의 상대시간·전투후정리(postCombat)·구간 전투여부를 채운다.
 *  - 전투 중: 그 전투 시작 기준 (+m:ss)
 *  - 마지막 전투가 끝난 뒤 12분 내(정리): 전투 종료 기준 (종료 +m:ss), postCombat=true
 *  - 그 외(전투 사이·전투 이전·전투 없음): 상대시간 없음(null)
 * postCombat 을 '마지막 전투 종료 이후'로만 잡으므로, 한 덩어리(던전)여도 정리는 늘 맨 끝이라
 * 시간순이 깨지지 않는다. 단일 전투(레이드 트라이)에선 싸움 뒤 정리가 자연스럽게 구분된다.
 */
function setSegmentTiming(seg: Segment, combats: CombatWin[], isDuty: boolean): void {
  // 필드/야외(비듀티): 전투 프레이밍 없이 평범한 시간순 묶음 — 상대시간·전투후정리·전투표시 생략.
  if (!isDuty) {
    for (const ev of seg.events) {
      ev.postCombat = false;
      ev.relSpan = null;
    }
    return; // isCombat=false 유지, seg.start=첫 마커 유지
  }
  const end = seg.end ?? seg.start;
  const inSeg = combats.filter((w) => w.start <= end && (w.end == null || w.end >= seg.start));
  if (inSeg.length > 0) {
    seg.isCombat = true;
    // 표시 시작을 '전투 시작'에 맞춘다(눈금·시간 표시 기준). 단, 풀 전 준비 마커가 더 빠르면 그대로 둬 안 잘리게.
    const firstCombat = Math.min(...inSeg.map((w) => w.start));
    if (firstCombat < seg.start) seg.start = firstCombat;
  }
  let lastEnd: LogTime | null = null;
  for (const w of inSeg) if (w.end != null && (lastEnd == null || w.end > lastEnd)) lastEnd = w.end;
  seg.combatEnd = lastEnd; // 미니 타임라인 축 끝(전투 종료/전멸)

  for (const ev of seg.events) {
    const mine = inSeg.find((w) => ev.time >= w.start && (w.end == null || ev.time <= w.end));
    if (mine) {
      ev.postCombat = false;
      ev.relSpan = ev.time - mine.start;
    } else if (lastEnd != null && ev.time > lastEnd && ev.time - lastEnd <= POST_COMBAT_WINDOW_MS) {
      ev.postCombat = true;
      ev.relSpan = ev.time - lastEnd;
    } else {
      ev.postCombat = false;
      ev.relSpan = null;
    }
  }
}

function zoneAt(zones: { time: LogTime; zone: string }[], t: LogTime): string {
  let result = '';
  for (const z of zones) {
    if (z.time > t) break;
    result = z.zone;
  }
  return result;
}

/** t 시점 존의 인스턴스 듀티 여부(265). 정보가 없으면 undefined(듀티로 간주해 프레이밍 유지). */
function cfAt(zones: { time: LogTime; cf?: boolean }[], t: LogTime): boolean | undefined {
  let cf: boolean | undefined;
  for (const z of zones) {
    if (z.time > t) break;
    cf = z.cf;
  }
  return cf;
}
