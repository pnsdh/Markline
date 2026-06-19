// 파싱 워커의 수명주기 + 파일/폴더 실시간 추적을 담당하는 IO 오케스트레이션.
// store 는 reactive 상태를, 여기서는 워커·파일 핸들 같은 React 밖 명령형 자원을 다룬다.
// store 가 attachStore(api) 로 setState/getState 핸들을 주입하면 그걸로 상태를 갱신한다.
import { Anonymizer } from '../core/anonymizer';
import { Loc } from '../core/loc';
import { MarkerEvent } from '../core/models';
import { buildSegments } from '../core/segmenter';
import { newestLog, supportsFsAccess } from '../io/fileOpen';
import { loadHandle, saveHandle } from '../io/handleStore';
import type { FromWorker, Snapshot, ToWorker } from '../io/types';
import type { StoreState } from './store';

interface StoreApi {
  getState: () => StoreState;
  setState: (partial: Partial<StoreState> | ((s: StoreState) => Partial<StoreState>)) => void;
}

let api: StoreApi;
/** store 생성 후 setState/getState 핸들을 주입한다. */
export function attachStore(a: StoreApi): void {
  api = a;
}

// React state 밖의 명령형 자원 (워커·폴링 타이머·핸들)
let worker: Worker | null = null;
let currentDir: FileSystemDirectoryHandle | null = null;
let currentTailName: string | null = null;
let dirPollTimer = 0;
let pendingHandle: FileSystemFileHandle | FileSystemDirectoryHandle | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../io/parser.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<FromWorker>) => handleWorkerMessage(e.data);
  }
  return worker;
}

function post(msg: ToWorker, transfer?: Transferable[]): void {
  getWorker().postMessage(msg, transfer ?? []);
}

function applySnapshot(snap: Snapshot): void {
  // prototype 복원 — 워커에서 온 plain 객체를 MarkerEvent 인스턴스로 되살린다.
  // seq = events 배열 인덱스(append-only라 스냅샷 간 안정) → React 안정 key.
  const events = snap.events;
  events.forEach((ev, i) => {
    Object.setPrototypeOf(ev, MarkerEvent.prototype);
    ev.seq = i;
  });
  Anonymizer.setNumbers(new Map(snap.playerNumbers));
  const segments = buildSegments({ events, combats: snap.combats, zones: snap.zones, wipes: snap.wipes });
  api.setState({
    events,
    segments,
    myId: snap.myId,
    myName: snap.myName,
    lastLineTime: snap.lastLineTime,
    eventCount: events.length,
    status: 'ready',
    live: snap.live,
    fresh: true,
    lastDataMs: Date.now(),
  });
}

function handleWorkerMessage(msg: FromWorker): void {
  switch (msg.type) {
    case 'progress':
      api.setState({ progress: msg.value });
      break;
    case 'initialLoaded':
      api.setState({ progress: 1 });
      break;
    case 'truncated':
      break;
    case 'error':
      api.setState({ status: 'error', error: msg.message });
      break;
    case 'heartbeat':
      // 마커 변화 없이 데이터만 들어옴 — 상태바(라이브 점·마지막 기록)만 갱신, 목록은 그대로.
      api.setState({ lastLineTime: msg.lastLineTime, fresh: true, lastDataMs: Date.now() });
      break;
    case 'snapshot':
      applySnapshot(msg);
      break;
  }
}

/**
 * 핸들을 실시간 추적 시작. silent=true(롤오버 자동 전환)면 로딩 오버레이를 띄우지 않고
 * 조용히 교체한다 — 새 파일은 보통 거의 비어 있어 즉시 새 스냅샷으로 채워지므로 깜빡임만 생긴다.
 */
function doTail(handle: FileSystemFileHandle, silent = false): void {
  currentTailName = handle.name;
  void saveHandle('lastFile', handle);
  const base = { fileName: handle.name, error: null, selectedKey: 'ALL', live: true } as const;
  api.setState(silent ? base : { ...base, status: 'loading', progress: 0 });
  post({ type: 'tailHandle', handle });
}

function stopDirWatch(): void {
  if (dirPollTimer) {
    clearInterval(dirPollTimer);
    dirPollTimer = 0;
  }
}

/** 폴더를 5초마다 확인해 더 최근 .log가 생기면 자동 전환 (데스크톱 CheckNewerFile 대응). */
function startDirWatch(dir: FileSystemDirectoryHandle): void {
  stopDirWatch();
  dirPollTimer = window.setInterval(async () => {
    if (currentDir !== dir) return;
    const h = await newestLog(dir);
    if (h && h.name !== currentTailName) doTail(h, true); // 롤오버 — 조용히 전환(로딩 오버레이 없이)
  }, 5000);
}

// ───── store 액션이 위임하는 IO 진입점 ─────

/** 업로드/드롭한 정적 파일 1회 분석 (실시간 추적 없음). */
export function loadFile(file: File): void {
  stopDirWatch();
  currentDir = null;
  api.setState({ status: 'loading', progress: 0, fileName: file.name, error: null, selectedKey: 'ALL', live: false, folderName: null });
  post({ type: 'loadFile', file });
}

/**
 * 파일 핸들 1회 정적 분석 — 실시간 추적·롤오버 없음(과거 전투 리뷰용).
 * 핸들의 현재 내용을 한 번 읽고 끝내므로 폴링도 하지 않는다. 실시간이 필요하면
 * 폴더 기반 openLatestFromDir 를 쓴다. (정적 경로라 lastFile 로 기억하지도 않아
 * "시작 시 최신 로그 자동 열기"(폴더 기반)를 오염시키지 않는다.)
 */
export async function openFileHandle(handle: FileSystemFileHandle): Promise<void> {
  try {
    loadFile(await handle.getFile());
  } catch (err) {
    api.setState({ status: 'error', error: err instanceof Error ? err.message : String(err) });
  }
}

/** 폴더의 최신 로그를 열고, 새 로그가 생기면 자동 전환하며 추적. */
export async function openLatestFromDir(dir: FileSystemDirectoryHandle): Promise<void> {
  stopDirWatch();
  currentDir = dir;
  void saveHandle('lastDir', dir);
  api.setState({ folderName: dir.name, pendingResume: null });
  const h = await newestLog(dir);
  if (!h) {
    api.setState({ status: 'error', error: Loc.t('dlg_no_log_in_folder', dir.name) });
    return;
  }
  doTail(h);
  startDirWatch(dir);
}

/** 새로고침 후 권한 재요청이 필요할 때(사용자 제스처) 기억된 핸들로 감시 재개. */
export async function resumeWatch(): Promise<void> {
  const h = pendingHandle;
  if (!h) return;
  const ok = h.requestPermission ? (await h.requestPermission({ mode: 'read' })) === 'granted' : true;
  if (!ok) return;
  pendingHandle = null;
  api.setState({ pendingResume: null });
  if (h.kind === 'directory') openLatestFromDir(h);
  else openFileHandle(h);
}

/**
 * 시작 시 자동 열기(⚡). 기억된 폴더/파일 핸들을 IndexedDB에서 복원.
 * 권한이 이미 granted면 바로 열고, 아니면(새로고침 후 보통 prompt) 제스처가 필요하므로
 * pendingResume 로 시작 화면에 "이어서 감시" 버튼을 띄운다.
 */
export async function tryStartupResume(): Promise<void> {
  const s = api.getState();
  if (!s.autoOpenLatest || !supportsFsAccess) return;
  const dir = await loadHandle<FileSystemDirectoryHandle>('lastDir');
  const file = dir ? null : await loadHandle<FileSystemFileHandle>('lastFile');
  const handle = dir ?? file;
  if (!handle) return;
  const perm = handle.queryPermission ? await handle.queryPermission({ mode: 'read' }) : 'granted';
  if (perm === 'granted') {
    if (dir) openLatestFromDir(dir);
    else if (file) openFileHandle(file);
  } else {
    pendingHandle = handle;
    api.setState({ pendingResume: { kind: dir ? 'dir' : 'file', name: handle.name } });
  }
}
