import type { MarkerEvent } from '../core/models';
import type { LogTime } from '../core/time';

/** 메인 → 워커 */
export type ToWorker =
  | { type: 'loadFile'; file: File }
  | { type: 'tailHandle'; handle: FileSystemFileHandle } // Phase 5 실시간 추적
  | { type: 'stop' };

/**
 * 워커 → 메인 스냅샷.
 * events 는 postMessage(structured clone) 시 prototype을 잃은 plain 객체가 된다.
 * 메인 스레드에서 MarkerEvent.prototype 으로 rehydrate 해 getter(본문/상세 등)를 되살린다.
 */
export interface Snapshot {
  type: 'snapshot';
  events: MarkerEvent[];
  combats: { start: LogTime; end: LogTime | null }[];
  zones: { time: LogTime; zone: string; cf?: boolean }[];
  wipes: LogTime[]; // 전멸 시각 — 구간(트라이) 경계
  myId: string | null;
  myName: string | null;
  lastLineTime: LogTime | null;
  playerNumbers: [string, number][];
  live: boolean; // 실시간 추적 중 갱신인가
}

export type FromWorker =
  | { type: 'progress'; value: number }
  | { type: 'initialLoaded' }
  | { type: 'truncated' }
  | { type: 'error'; message: string }
  // 새 데이터는 들어왔지만 마커 이벤트 변화는 없을 때(전투 중 잡다한 라인) — 상태바만 갱신.
  | { type: 'heartbeat'; lastLineTime: LogTime | null }
  | Snapshot;
