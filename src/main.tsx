import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/noto-sans-jp/index.css'; // 일본어(한자·가나) 번들 — 유니코드 범위별 동적 로딩
import App from './ui/v2/AppV2.tsx';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { useStore } from './ui/store';
import './index.css';

// 개발/테스트용 store 핸들 (디버깅·e2e 상태 주입). 프로덕션 번들엔 포함되지 않음.
if (import.meta.env.DEV) (window as unknown as { mkStore: typeof useStore }).mkStore = useStore;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
