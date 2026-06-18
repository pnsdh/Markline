import { Component, ReactNode } from 'react';
import { Loc } from '../core/loc';

/**
 * 최상위 에러 바운더리 — 렌더 중 예기치 못한 예외가 나도 화면이 통째로 백지가 되지 않게
 * 복구 가능한 대체 화면을 보여준다. (파싱은 별도로 라인 단위 보호됨)
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  // 오류 내용에 로그 데이터가 섞일 수 있어 콘솔/외부로 출력하지 않는다.
  componentDidCatch(): void {}

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-mk-window p-6 text-center text-mk-text">
        <div className="text-lg font-bold">{Loc.t('crash_title')}</div>
        <p className="max-w-md text-[13px] leading-relaxed text-mk-text-sub">{Loc.t('crash_desc')}</p>
        <button
          onClick={() => location.reload()}
          className="rounded-xl bg-gradient-to-br from-mk-accent to-mk-accent-btn px-5 py-2.5 text-[14px] font-semibold text-white shadow-md shadow-mk-accent/25 transition-all hover:brightness-110 active:scale-[0.98]"
        >
          {Loc.t('crash_reload')}
        </button>
      </div>
    );
  }
}
