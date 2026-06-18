// File System Access 기반 파일/폴더 열기 헬퍼. 미지원 브라우저에서는 업로드(<input>)로 강등.

/** File System Access API(실시간 추적·폴더 자동전환) 지원 여부. 미지원이면 단순 업로드만 가능. */
export const supportsFsAccess = typeof window !== 'undefined' && 'showOpenFilePicker' in window;

export async function pickLogFile(): Promise<FileSystemFileHandle | null> {
  if (!window.showOpenFilePicker) return null;
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'ACT network log', accept: { 'text/plain': ['.log'] } }],
      excludeAcceptAllOption: false,
      multiple: false,
    });
    return handle ?? null;
  } catch {
    return null; // 사용자가 취소
  }
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!window.showDirectoryPicker) return null;
  try {
    return await window.showDirectoryPicker({ mode: 'read' });
  } catch {
    return null;
  }
}

/** 폴더에서 가장 최근 수정된 .log 파일 핸들. */
export async function newestLog(dir: FileSystemDirectoryHandle): Promise<FileSystemFileHandle | null> {
  let best: FileSystemFileHandle | null = null;
  let bestTime = -1;
  for await (const entry of dir.values()) {
    if (entry.kind !== 'file') continue;
    if (!entry.name.toLowerCase().endsWith('.log')) continue;
    try {
      const f = await entry.getFile();
      if (f.lastModified > bestTime) {
        bestTime = f.lastModified;
        best = entry;
      }
    } catch {
      /* 권한/잠금 등 무시 */
    }
  }
  return best;
}

export async function ensureReadPermission(handle: FileSystemFileHandle | FileSystemDirectoryHandle): Promise<boolean> {
  const opts = { mode: 'read' as const };
  try {
    if ((await handle.queryPermission?.(opts)) === 'granted') return true;
    return (await handle.requestPermission?.(opts)) === 'granted';
  } catch {
    return true; // 권한 API 미지원이면 통과 시도
  }
}
