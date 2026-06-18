// 테마를 DOM에 적용하는 런타임 헬퍼. (색 토큰 자체는 index.css, 색 유틸은 theme.ts)
import { flushSync } from 'react-dom';
import type { ThemePref } from './settings';

export function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function effectiveDark(theme: ThemePref): boolean {
  return theme === 'Dark' || (theme === 'System' && prefersDark());
}

export function applyThemeClass(dark: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

/**
 * 테마 적용을 View Transitions API로 감싸 화면 전체를 한 장의 스냅샷으로 크로스페이드한다.
 * flushSync 로 React 리렌더(인라인 스타일 배지 등)를 스냅샷 캡처 전에 동기 반영한다.
 * 미지원 브라우저나 reduced-motion 이면 즉시 적용.
 */
export function applyWithTransition(apply: () => void): void {
  const start = document.startViewTransition?.bind(document);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (start && !reduce) start(() => flushSync(apply));
  else apply();
}
