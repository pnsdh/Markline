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
    wipes: session.wipes.slice(),
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
 * 핸들에서 [from, to) 바이트를 청크로 읽어 splitter→세션에 먹인다.
 * ⚠️ ACT가 동시에 로그를 append하면 직전에 뜬 File 스냅샷이 무효화돼 읽기가 DOMException
 * (NetworkError 등)으로 터진다. 그래서 청크마다 **그때그때 새 스냅샷**을 떠서 원자적으로(arrayBuffer)
 * 읽고, 실패하면 잠깐 쉬고 **같은 위치부터 재시도**한다. 성공한 청크만 splitter에 먹이고 위치를
 * 전진시키므로 중복/유실이 없다. 반환값 = 실제로 전진한 위치(취소되면 중간값).
 */
async function feedRange(
  handle: FileSystemFileHandle,
  from: number,
  to: number,
  splitter: LineSplitter,
  token: number,
  onPos?: (p: number) => void,
): Promise<number> {
  const CHUNK = 4 * 1024 * 1024;
  let p = from;
  let errs = 0;
  while (p < to) {
    if (token !== cancelToken) return p;
    const end = Math.min(p + CHUNK, to);
    let buf: ArrayBuffer;
    try {
      buf = await (await handle.getFile()).slice(p, end).arrayBuffer();
    } catch (err) {
      if (token !== cancelToken) return p;
      if (++errs >= 40) throw err; // 약 2초 연속 실패만 오류로 보고
      await delay(50);
      continue; // 동시 기록으로 스냅샷 무효화 → 같은 위치부터 재시도
    }
    errs = 0;
    const lines = splitter.push(new Uint8Array(buf));
    if (lines.length) session.feedLines(lines);
    p = end;
    onPos?.(p);
  }
  return p;
}

/**
 * File System Access 핸들을 주기적으로 다시 읽어 증가분만 따라간다 (실시간 추적).
 * 초기 전체 읽기 → 50ms 폴링. 파일이 줄면(교체/리셋) 세션 리셋 후 재수신.
 * 동시 기록 중 읽기 실패는 feedRange가 재시도로 흡수 — 폴링 루프는 죽지 않는다.
 */
async function tail(handle: FileSystemFileHandle, token: number): Promise<void> {
  try {
    let splitter = new LineSplitter();

    // ---- 초기 전체 읽기 ----
    const total = (await handle.getFile()).size;
    let pos = await feedRange(handle, 0, total, splitter, token, (p) => post({ type: 'progress', value: total ? p / total : 1 }));
    if (token !== cancelToken) return;
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
    let lastIdleFlush = 0;
    let getFileErrors = 0; // getFile(크기 확인) 일시 실패 허용치
    for (;;) {
      await delay(50);
      if (token !== cancelToken) return;
      let len: number;
      try {
        len = (await handle.getFile()).size;
        getFileErrors = 0;
      } catch (err) {
        if (token !== cancelToken) return;
        if (++getFileErrors >= 20) throw err; // 약 1초 연속 실패 → 중단
        continue;
      }

      if (len < pos) {
        // 파일이 처음부터 다시 쓰임 → 세션 리셋
        post({ type: 'truncated' });
        session = new LogSession();
        lastEventCount = 0;
        pos = 0;
        splitter = new LineSplitter();
      }

      if (len > pos) {
        const before = pos;
        pos = await feedRange(handle, pos, len, splitter, token);
        if (token !== cancelToken) return;
        if (pos > before) pushUpdate();
      } else {
        // 새 데이터 없음 — 보류 그룹 확정.
        // 같은-ts 사인 묶음(Delete+Add)은 파일에 원자적으로(바로 옆줄로) 기록되므로 폴링이 가를 위험이 없다.
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
