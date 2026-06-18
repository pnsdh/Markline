import { useMemo } from 'react';
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Hourglass, LayoutGrid, Rows2, Rows3, Swords } from 'lucide-react';
import { Loc } from '../../core/loc';
import { EventKind } from '../../core/models';
import { Segment } from '../../core/segment';
import { useStore } from '../store';
import { effectiveTotal, segCount } from '../eventItems';
import { kindColor } from '../theme';

// 미니 타임라인 눈금 겹침 우선순위 (높을수록 위에). 이동 > 제거 > 교체 > 부착.
const TICK_PRIORITY: Record<EventKind, number> = {
  Move: 4,
  Remove: 3,
  SystemRemove: 3,
  Replace: 2,
  Add: 1,
};

export function EncounterRail() {
  const segments = useStore((s) => s.segments);
  const selectedKey = useStore((s) => s.selectedKey);
  const segNewestFirst = useStore((s) => s.segNewestFirst);
  const compact = useStore((s) => s.compactRail);
  const hideIdle = useStore((s) => s.hideIdle);
  const hidePostCombat = useStore((s) => s.hidePostCombat);
  const setSelectedKey = useStore((s) => s.setSelectedKey);
  const setSegNewestFirst = useStore((s) => s.setSegNewestFirst);
  const setCompactRail = useStore((s) => s.setCompactRail);
  const setHideIdle = useStore((s) => s.setHideIdle);
  useStore((s) => s.renderVersion);

  const shownSegs = useMemo(() => {
    const list = hideIdle ? segments.filter((s) => s.isCombat) : segments;
    return segNewestFirst ? list.slice().reverse() : list;
  }, [segments, hideIdle, segNewestFirst]);

  const combatCount = segments.filter((s) => s.isCombat).length;
  const idleCount = segments.length - combatCount;
  const total = effectiveTotal(segments, hideIdle, hidePostCombat);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-mk-border bg-mk-panel/50">
      <div className="flex items-center justify-between px-3 py-2.5">
        <h2 className="text-[12px] font-bold uppercase tracking-wider text-mk-text-faint">
          {hideIdle || idleCount === 0 ? (
            <>
              {Loc.t('combat_sections')} <span className="text-mk-text-faint/70">· {combatCount}</span>
            </>
          ) : (
            <>
              {Loc.t('seg_combat')} <span className="text-mk-text-faint/70">{combatCount}</span>
              <span className="text-mk-text-faint/50"> · {Loc.t('seg_idle')} </span>
              <span className="text-mk-text-faint/70">{idleCount}</span>
            </>
          )}
        </h2>
        <div className="flex items-center gap-0.5">
          <IconToggle
            on={segNewestFirst}
            onClick={() => setSegNewestFirst(!segNewestFirst)}
            title={Loc.t(segNewestFirst ? 'tip_segsort_on' : 'tip_segsort_off')}
          >
            {segNewestFirst ? <ArrowUpNarrowWide size={15} /> : <ArrowDownNarrowWide size={15} />}
          </IconToggle>
          <IconToggle on={compact} onClick={() => setCompactRail(!compact)} title={Loc.t(compact ? 'rail_comfortable' : 'rail_compact')}>
            {compact ? <Rows2 size={15} /> : <Rows3 size={15} />}
          </IconToggle>
          <IconToggle on={hideIdle} onClick={() => setHideIdle(!hideIdle)} title={Loc.t('opt_hide_idle')}>
            <Hourglass size={14} />
          </IconToggle>
        </div>
      </div>

      <div className={['min-h-0 flex-1 overflow-y-auto px-2 pb-2', compact ? 'space-y-0.5' : 'space-y-1.5'].join(' ')}>
        <button
          onClick={() => setSelectedKey('ALL')}
          className={[
            'flex w-full items-center gap-2.5 rounded-xl border px-3 text-left transition-all',
            compact ? 'py-1.5' : 'py-2.5',
            selectedKey === 'ALL' ? 'border-mk-accent/40 bg-mk-accent-soft' : 'border-transparent bg-mk-card hover:bg-mk-card-hover',
          ].join(' ')}
        >
          <LayoutGrid size={15} className="shrink-0 text-mk-accent" />
          <span className="text-[14px] font-semibold text-mk-text">{Loc.t('all_view')}</span>
          <span className="ml-auto rounded-full bg-mk-panel px-2 py-px text-[11px] font-semibold text-mk-text-sub">
            {Loc.t('count_n', total)}
          </span>
        </button>

        {shownSegs.map((seg) =>
          compact ? (
            <RailRowCompact key={seg.key} seg={seg} count={segCount(seg, hidePostCombat)} active={selectedKey === seg.key} onClick={() => setSelectedKey(seg.key)} />
          ) : (
            <RailCard key={seg.key} seg={seg} count={segCount(seg, hidePostCombat)} hidePostCombat={hidePostCombat} active={selectedKey === seg.key} onClick={() => setSelectedKey(seg.key)} />
          ),
        )}
      </div>
    </div>
  );
}

function IconToggle({ on, onClick, title, children }: { on: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={['rounded-lg p-1 transition-colors hover:bg-mk-card-hover', on ? 'text-mk-accent' : 'text-mk-text-sub hover:text-mk-text'].join(' ')}
    >
      {children}
    </button>
  );
}

function RailRowCompact({ seg, count, active, onClick }: { seg: Segment; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      data-testid="seg-card"
      onClick={onClick}
      className={[
        'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors',
        active ? 'border-mk-accent/40 bg-mk-accent-soft' : 'border-transparent hover:bg-mk-card-hover',
      ].join(' ')}
    >
      {seg.isCombat ? (
        <Swords size={13} className="shrink-0 text-mk-accent" />
      ) : (
        <Hourglass size={13} className="shrink-0 text-mk-text-faint" />
      )}
      <span className="truncate text-[12.5px] font-medium text-mk-text">{seg.title}</span>
      <span className="ml-auto shrink-0 font-mono text-[10.5px] text-mk-text-faint">{seg.timeRangeText.split(' ~ ')[0]}</span>
      <span className="shrink-0 tabular-nums text-[11px] font-semibold text-mk-text-sub">{count}</span>
    </button>
  );
}

function RailCard({
  seg,
  count,
  hidePostCombat,
  active,
  onClick,
}: {
  seg: Segment;
  count: number;
  hidePostCombat: boolean;
  active: boolean;
  onClick: () => void;
}) {
  // 미니 타임라인 — 각 조작이 전투 중 '언제' 일어났는지 시간 축에 눈금으로. 색은 동작.
  // 겹칠 때 우선순위 낮은 것부터 그려(아래) 이동/제거가 위에 보이게 정렬.
  const ticks = useMemo(() => {
    const shown = hidePostCombat ? seg.events.filter((e) => !e.postCombat) : seg.events;
    if (shown.length === 0) return [];
    const start = seg.start;
    let end = seg.end ?? start;
    for (const e of shown) if (e.time > end) end = e.time;
    const span = Math.max(1, end - start);
    return shown
      .map((e) => ({ pct: ((e.time - start) / span) * 100, color: kindColor(e.kind), rank: TICK_PRIORITY[e.kind] }))
      .sort((a, b) => a.rank - b.rank);
  }, [seg, hidePostCombat]);

  return (
    <button
      data-testid="seg-card"
      onClick={onClick}
      className={[
        'block w-full rounded-xl border px-3 py-2.5 text-left transition-all',
        active ? 'border-mk-accent/40 bg-mk-accent-soft' : 'border-transparent bg-mk-card hover:bg-mk-card-hover',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        {seg.isCombat ? (
          <Swords size={14} className="shrink-0 text-mk-accent" />
        ) : (
          <Hourglass size={14} className="shrink-0 text-mk-text-faint" />
        )}
        <span className="truncate text-[13.5px] font-semibold text-mk-text">{seg.title}</span>
        <span className="ml-auto shrink-0 rounded-full bg-mk-panel px-2 py-px text-[11px] font-semibold text-mk-text-sub">{count}</span>
      </div>
      <div className="mt-1 truncate text-[11px] text-mk-text-faint">{seg.timeRangeText}</div>
      {/* 미니 타임라인 — 시간 축 위 동작 눈금 (직사각형) */}
      <div className="relative mt-2 h-2.5 overflow-hidden bg-mk-panel">
        {ticks.map((t, i) => (
          <span key={i} className="absolute top-0 h-full w-[3px] -translate-x-1/2" style={{ left: `${t.pct}%`, background: t.color }} />
        ))}
      </div>
    </button>
  );
}
