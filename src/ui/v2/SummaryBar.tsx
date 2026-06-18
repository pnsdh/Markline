import { useMemo } from 'react';
import { Loc } from '../../core/loc';
import { categoryHex, MarkerKind } from '../../core/markers';
import { EventKind } from '../../core/models';
import { useStore } from '../store';
import { actionCatOf } from '../eventItems';
import { kindColor } from '../theme';

type ActionCat = 'move' | 'remove' | 'replace' | 'add';

const MARKER_KINDS: { kind: MarkerKind; key: string }[] = [
  { kind: 'Attack', key: 'cat_attack' },
  { kind: 'Bind', key: 'cat_bind' },
  { kind: 'Ignore', key: 'cat_ignore' },
  { kind: 'Shape', key: 'cat_shape' },
];
// 배치 순서 — 동작칩과 동일 (부착·제거·이동·교체)
const ACTIONS: { cat: ActionCat; kind: EventKind; key: string }[] = [
  { cat: 'add', kind: 'Add', key: 'kind_add' },
  { cat: 'remove', kind: 'Remove', key: 'kind_remove' },
  { cat: 'move', kind: 'Move', key: 'kind_move' },
  { cat: 'replace', kind: 'Replace', key: 'kind_replace' },
];

export function SummaryBar() {
  const segments = useStore((s) => s.segments);
  const hideIdle = useStore((s) => s.hideIdle);
  const hidePostCombat = useStore((s) => s.hidePostCombat);
  useStore((s) => s.renderVersion);

  const { byKind, byAction } = useMemo(() => {
    const mk: Record<MarkerKind, number> = { Attack: 0, Bind: 0, Ignore: 0, Shape: 0 };
    const ac: Record<ActionCat, number> = { move: 0, remove: 0, replace: 0, add: 0 };
    for (const seg of segments) {
      if (hideIdle && !seg.isCombat) continue;
      for (const e of seg.events) {
        if (hidePostCombat && e.postCombat) continue;
        mk[e.marker.kind]++;
        ac[actionCatOf[e.kind]]++;
      }
    }
    return { byKind: mk, byAction: ac };
  }, [segments, hideIdle, hidePostCombat]);

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2.5 md:flex-row">
      <DistGroup
        label={Loc.t('lbl_actions')}
        items={ACTIONS.map((a) => ({ color: kindColor(a.kind), count: byAction[a.cat], title: Loc.t(a.key) }))}
      />
      <DistGroup
        label={Loc.t('lbl_markers')}
        items={MARKER_KINDS.map((m) => ({ color: categoryHex(m.kind), count: byKind[m.kind], title: Loc.t(m.key) }))}
      />
    </div>
  );
}

function DistGroup({ label, items }: { label: string; items: { color: string; count: number; title: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="flex flex-1 items-center gap-4 rounded-2xl border border-mk-border bg-mk-card px-4 py-2.5">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-mk-text-faint">{label}</span>
      <div className="flex flex-1 items-center gap-4">
        {items.map((it, i) => (
          // 숫자를 자기 색 점 바로 옆에 같은 색으로 → 어느 항목 수치인지 한눈에. 막대는 뒤에서 비율만.
          <div key={i} className="flex flex-1 items-center gap-1.5" title={`${it.title}: ${it.count}`}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: it.color }} />
            <span className="w-5 shrink-0 text-right text-[12.5px] font-bold tabular-nums" style={{ color: it.color }}>{it.count}</span>
            <div className="ml-0.5 h-1.5 min-w-[16px] flex-1 overflow-hidden rounded-full bg-mk-panel">
              <div className="h-full rounded-full" style={{ width: `${(it.count / max) * 100}%`, background: it.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
