/// <reference lib="webworker" />
import { LogSession } from '../core/logSession';
import { LineSplitter } from './logReader';
import type { FromWorker, Snapshot, ToWorker } from './types';

let session = new LogSession();
let cancelToken = 0;

const post = (m: FromWorker) => (self as DedicatedWorkerGlobalScope).postMessage(m);

function snapshot(live: boolean): Snapshot {
  return {
    type: 'snapshot',
    events: session.events,
    combats: session.combats.map((c) => ({ start: c.start, end: c.end })),
    zones: session.zones.slice(),
    myId: session.myId,
    myName: session.myName,
    lastLineTime: session.lastLineTime,
    playerNumbers: Array.from(session.playerNumbers.entries()),
    live,
  };
}

self.onmessage = async (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'loadFile':
      cancelToken++;
      session = new LogSession();
      await readWhole(msg.file, cancelToken);
      break;
    case 'tailHandle':
      cancelToken++;
      session = new LogSession();
      await tail(msg.handle, cancelToken);
      break;
    case 'stop':
      cancelToken++;
      break;
  }
};

/** 파일 전체를 청크 스트리밍으로 읽어 파싱 (초기 로드). */
async function readWhole(file: Blob, token: number): Promise<void> {
  try {
    const total = file.size;
    let pos = 0;
    let lastPct = -1;
    const splitter = new LineSplitter();
    const reader = file.stream().getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (token !== cancelToken) return;
      if (done) break;
      const chunk = value as Uint8Array;
      const lines = splitter.push(chunk);
      if (lines.length) session.feedLines(lines);
      pos += chunk.length;
      const pct = total ? Math.floor((pos / total) * 50) : 50; // 2%刻み
      if (pct !== lastPct) {
        lastPct = pct;
        post({ type: 'progress', value: total ? pos / total : 1 });
      }
    }
    session.flushPending();
    post({ type: 'initialLoaded' });
    post(snapshot(false));
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
}

/**
 * File System Access 핸들을 주기적으로 다시 읽어 증가분만 따라간다 (실시간 추적).
 * 초기 전체 읽기 → 400ms 폴링. 파일이 줄면(교체/리셋) 세션 리셋 후 재수신.
 */
async function tail(handle: FileSystemFileHandle, token: number): Promise<void> {
  try {
    let file = await handle.getFile();
    const total = file.size;
    let pos = 0;
    let lastPct = -1;
    let splitter = new LineSplitter();

    // ---- 초기 전체 읽기 ----
    const reader = file.stream().getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (token !== cancelToken) return;
      if (done) break;
      const chunk = value as Uint8Array;
      const lines = splitter.push(chunk);
      if (lines.length) session.feedLines(lines);
      pos += chunk.length;
      const pct = total ? Math.floor((pos / total) * 50) : 50;
      if (pct !== lastPct) {
        lastPct = pct;
        post({ type: 'progress', value: total ? pos / total : 1 });
      }
    }
    session.flushPending();
    post({ type: 'initialLoaded' });
    post(snapshot(true));
    let lastEventCount = session.events.length;

    // 마커 이벤트가 늘었으면 전체 스냅샷(세그먼트 재빌드), 아니면 가벼운 heartbeat(상태바만).
    const pushUpdate = () => {
      if (session.events.length !== lastEventCount) {
        lastEventCount = session.events.length;
        post(snapshot(true));
      } else {
        post({ type: 'heartbeat', lastLineTime: session.lastLineTime });
      }
    };

    // ---- 실시간 폴링 ----
    // 폴링 50ms + 보류 50ms (near-real-time 한계). 폴링당 비용은 파일 크기 확인 + 증가분만 읽기라
    // 작고(초당 20회), 전체 스냅샷은 이벤트 변화 시에만 보낸다. 실질 지연 하한은 ACT의 로그 기록 지연.
    let lastIdleFlush = 0;
    let getFileErrors = 0; // getFile 일시 실패(쓰기 중 잠금 등) 허용치
    for (;;) {
      await delay(50);
      if (token !== cancelToken) return;
      // getFile 은 일시적으로 실패할 수 있다 → 몇 번은 건너뛰고 재시도, 지속되면 오류 보고.
      // (읽기 전 단계라 splitter/pos 상태를 건드리지 않아 재시도가 안전하다.)
      try {
        file = await handle.getFile();
        getFileErrors = 0;
      } catch (err) {
        if (token !== cancelToken) return;
        if (++getFileErrors >= 20) throw err; // 약 1초 연속 실패 → 중단
        continue;
      }
      const len = file.size;

      if (len < pos) {
        // 파일이 처음부터 다시 쓰임 → 세션 리셋
        post({ type: 'truncated' });
        session = new LogSession();
        lastEventCount = 0;
        pos = 0;
        splitter = new LineSplitter();
      }

      if (len > pos) {
        const slice = file.slice(pos);
        const r = slice.stream().getReader();
        const batch: string[] = [];
        for (;;) {
          const { done, value } = await r.read();
          if (token !== cancelToken) return;
          if (done) break;
          const chunk = value as Uint8Array;
          batch.push(...splitter.push(chunk));
        }
        pos = len;
        if (batch.length) {
          session.feedLines(batch);
          pushUpdate();
        }
      } else {
        // 새 데이터 없음 — 보류 그룹 확정.
        // 로그 검증 결과 같은-ts 사인 묶음(Delete+Add)은 파일에 원자적으로(바로 옆줄로) 기록되므로
        // 폴링이 묶음을 가를 위험이 없다 → 빈 폴링 한 번이면 곧장 확정해도 안전.
        const now = Date.now();
        if (session.hasPending && session.pendingAgeMs > 50 && now - lastIdleFlush > 50) {
          lastIdleFlush = now;
          session.flushPending();
          if (session.events.length !== lastEventCount) {
            lastEventCount = session.events.length;
            post(snapshot(true));
          }
        }
      }
    }
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
