import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loc } from '../../core/loc';
import { useStore } from '../store';
import { ErrorScreen, LoadingOverlay, StartScreen } from '../components/Overlays';
import { TopBarV2 } from './TopBarV2';
import { SummaryBar } from './SummaryBar';
import { EncounterRail } from './EncounterRail';
import { Timeline } from './Timeline';
import { StatusBarV2 } from './StatusBarV2';

export default function AppV2() {
  const status = useStore((s) => s.status);
  const eventCount = useStore((s) => s.eventCount);
  const openFile = useStore((s) => s.openFile);
  const mobileNav = useStore((s) => s.mobileNav);
  const setMobileNav = useStore((s) => s.setMobileNav);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    document.title = 'Markline'; // 로그 파일명 표시 없이 고정
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) openFile(f);
    },
    [openFile],
  );

  return (
    <div
      className="flex h-full flex-col bg-mk-window text-mk-text"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepth.current++;
        setDragging(true);
      }}
      onDragLeave={() => {
        if (--dragDepth.current <= 0) setDragging(false);
      }}
      onDrop={onDrop}
    >
      {/* 상단/하단 바는 창 전체 폭(앱 셸), 본문만 가운데 정렬 최대폭 → 넓은 화면에선 본문 좌우로만 여백. */}
      <TopBarV2 />

      <main className="relative min-h-0 flex-1">
        {status === 'idle' ? (
          <StartScreen />
        ) : status === 'error' && eventCount === 0 ? (
          <ErrorScreen />
        ) : (
          <div className="mx-auto flex h-full min-h-0 max-w-[1100px] flex-col">
            <SummaryBar />
            <div className="flex min-h-0 flex-1 gap-3 px-3 pb-3">
              <aside className="hidden w-[300px] shrink-0 md:block">
                <EncounterRail />
              </aside>
              <section className="min-h-0 min-w-0 flex-1">
                <Timeline />
              </section>
            </div>
          </div>
        )}

        {/* 모바일 구간 드로어 */}
        <AnimatePresence>
          {mobileNav && status !== 'idle' && (
            <div className="absolute inset-0 z-30 md:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileNav(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
                className="absolute inset-y-0 left-0 w-[86%] max-w-xs bg-mk-window p-3 shadow-2xl"
              >
                <EncounterRail />
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>{status === 'loading' && <LoadingOverlay />}</AnimatePresence>

        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-50 m-3 grid place-items-center rounded-3xl border-2 border-dashed border-mk-accent/70 bg-mk-accent/10 backdrop-blur-sm">
            <span className="rounded-2xl bg-mk-card px-5 py-3 text-[15px] font-semibold text-mk-accent shadow-xl">
              {Loc.t('empty_drag')}
            </span>
          </div>
        )}
      </main>

      <StatusBarV2 />
    </div>
  );
}
