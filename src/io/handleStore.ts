// File System Access 핸들을 IndexedDB에 보관 (핸들은 structured-clone 가능 → 새로고침 후에도 복원).
// "폴더 기억 / 시작 시 자동 열기"에 사용. 권한은 별도로 재요청(사용자 제스처 필요).

const DB_NAME = 'markline';
const STORE = 'handles';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  try {
    const db = await openDb();
    return await new Promise<T | undefined>((resolve, reject) => {
      const store = db.transaction(STORE, mode).objectStore(STORE);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

type AnyHandle = FileSystemFileHandle | FileSystemDirectoryHandle;

export const saveHandle = (key: string, handle: AnyHandle) => tx<void>('readwrite', (s) => s.put(handle, key));
export const loadHandle = <T extends AnyHandle>(key: string) => tx<T>('readonly', (s) => s.get(key));
export const deleteHandle = (key: string) => tx<void>('readwrite', (s) => s.delete(key));
