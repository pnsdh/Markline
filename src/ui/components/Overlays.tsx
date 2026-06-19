import { motion } from 'framer-motion';
import { AlertTriangle, FileUp, Info, MousePointerSquareDashed, PlayCircle, Radar } from 'lucide-react';
import { Loc } from '../../core/loc';
import { useStore, supportsFsAccess } from '../store';
import { useOpenLog } from '../useOpenLog';
import { SwapLabel } from './SwapLabel';

/**
 * 로그 열기 동작 — 의도 기준. 주: 실시간 추적(폴더 → 최신+롤오버), 보조: 로그 파일 하나(분석).
 * 미지원 브라우저는 단일 파일 업로드만 가능하므로 그게 주 동작이 된다.
 * 숨겨진 <input> 도 여기서 렌더해 openLog 의 inputRef 와 짝을 맞춘다.
 */
function OpenActions() {
  const { openLog, openLatest, inputRef, onInputChange } = useOpenLog();
  const primary =
    'group flex items-center gap-2 rounded-xl bg-gradient-to-br from-mk-accent to-mk-accent-btn px-5 py-3 text-[14px] font-semibold text-white shadow-md shadow-mk-accent/25 transition-all hover:brightness-110 active:scale-[0.98]';
  const secondary =
    'group flex items-center gap-2 rounded-xl border border-mk-border bg-mk-card px-5 py-3 text-[14px] font-medium text-mk-text-sub transition-colors hover:bg-mk-card-hover hover:text-mk-text';
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {supportsFsAccess ? (
        <>
          <button onClick={openLatest} title={Loc.t('tip_live_track')} className={primary}>
            <Radar size={18} className="shrink-0" />
            <SwapLabel label={Loc.t('live_track')} hover={Loc.t('live_track_sub')} />
          </button>
          <button onClick={openLog} title={Loc.t('tip_open_file')} className={secondary}>
            <FileUp size={18} className="shrink-0" />
            <SwapLabel label={Loc.t('open_log')} hover={Loc.t('open_log_sub')} />
          </button>
        </>
      ) : (
        <button onClick={openLog} className={primary}>
          <FileUp size={18} />
          {Loc.t('open_log')}
        </button>
      )}
      <input ref={inputRef} type="file" accept=".log,text/plain" className="hidden" onChange={onInputChange} />
    </div>
  );
}

/** 로드 실패(잘못된 폴더·읽기 오류 등) — 상태바뿐 아니라 본문에도 분명히 안내. */
export function ErrorScreen() {
  const error = useStore((s) => s.error);
  useStore((s) => s.renderVersion);

  return (
    <div className="flex h-full items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md text-center"
      >
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/15 text-amber-500">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-xl font-bold text-mk-text">{Loc.t('error_title')}</h1>
        {error && <p className="mx-auto mt-3 max-w-sm whitespace-pre-line text-[13px] leading-relaxed text-mk-text-sub">{error}</p>}

        <div className="mt-6">
          <OpenActions />
        </div>
      </motion.div>
    </div>
  );
}

export function StartScreen() {
  const pendingResume = useStore((s) => s.pendingResume);
  const resumeWatch = useStore((s) => s.resumeWatch);
  useStore((s) => s.renderVersion);

  return (
    <div className="flex h-full items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-lg text-center"
      >
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-mk-accent to-mk-accent-btn text-white shadow-lg shadow-mk-accent/30">
          <span className="text-3xl font-black">M</span>
        </div>
        <h1 className="text-2xl font-bold text-mk-text">{Loc.t('empty_title')}</h1>
        <p className="mx-auto mt-3 max-w-md whitespace-pre-line text-[14px] leading-relaxed text-mk-text-sub">
          {Loc.t('empty_desc')}
        </p>

        <div className="mt-7">
          <OpenActions />
        </div>

        {/* 새로고침 후 권한 재요청이 필요한 경우: 이어서 감시 */}
        {pendingResume && (
          <button
            onClick={() => resumeWatch()}
            className="mx-auto mt-5 flex items-center gap-2 rounded-xl border border-mk-accent/40 bg-mk-accent-soft px-4 py-2.5 text-[13px] font-medium text-mk-accent transition-colors hover:brightness-105"
          >
            <PlayCircle size={17} />
            {Loc.t('resume_watch', pendingResume.name)}
          </button>
        )}

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[12.5px] text-mk-text-faint">
          <MousePointerSquareDashed size={14} />
          {Loc.t('empty_drag')}
        </div>

        {/* 미지원 브라우저: 실시간 추적 불가 안내 */}
        {!supportsFsAccess && (
          <div className="mx-auto mt-5 flex max-w-sm items-start gap-2 rounded-xl border border-mk-border bg-mk-card px-4 py-3 text-left text-[12px] leading-relaxed text-mk-text-sub">
            <Info size={15} className="mt-px shrink-0 text-mk-text-faint" />
            <span>{Loc.t('fs_unsupported')}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function LoadingOverlay() {
  const progress = useStore((s) => s.progress);
  useStore((s) => s.renderVersion);
  const pct = Math.round(progress * 100);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-mk-window/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-72 rounded-2xl border border-mk-border bg-mk-card p-6 shadow-xl"
      >
        <div className="mb-3 text-center text-[14px] font-medium text-mk-text">{Loc.t('loading_pct', pct)}</div>
        <div className="h-2 overflow-hidden rounded-full bg-mk-panel">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-mk-accent to-mk-accent-btn"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </motion.div>
    </div>
  );
}
