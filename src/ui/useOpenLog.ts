import { useRef } from 'react';
import { pickDirectory, pickLogFile } from '../io/fileOpen';
import { supportsFsAccess, useStore } from './store';

/**
 * 로그 열기 로직(TopBar·StartScreen 공용).
 *  - openLog: 파일 하나 선택→정적 1회 분석(실시간 추적 없음). 미지원 시 숨겨진 input 업로드.
 *  - openLatest: 폴더 선택→최신 로그 + 자동 전환(실시간)
 * inputRef/onInputChange 는 미지원 브라우저용 숨겨진 <input> 에 연결한다.
 */
export function useOpenLog() {
  const inputRef = useRef<HTMLInputElement>(null);
  const openFile = useStore((s) => s.openFile);
  const openFileHandle = useStore((s) => s.openFileHandle);
  const openLatestFromDir = useStore((s) => s.openLatestFromDir);

  const openLog = async () => {
    if (supportsFsAccess) {
      const handle = await pickLogFile();
      if (handle) openFileHandle(handle);
    } else {
      inputRef.current?.click();
    }
  };

  const openLatest = async () => {
    const dir = await pickDirectory();
    if (dir) openLatestFromDir(dir);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) openFile(f);
    e.target.value = '';
  };

  return { openLog, openLatest, inputRef, onInputChange };
}
