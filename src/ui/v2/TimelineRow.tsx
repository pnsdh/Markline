import { Crosshair } from 'lucide-react';
import { Loc } from '../../core/loc';
import { EventKind, MarkerEvent } from '../../core/models';
import { eventCopyLine } from '../copy';
import { kindColor } from '../theme';
import { CopyButton } from '../components/CopyButton';
import { buildRich } from './descRich';
import { RichLine } from './RichLine';

const kindKey: Record<EventKind, string> = {
  Add: 'kind_add',
  Remove: 'kind_remove',
  Move: 'kind_move',
  Replace: 'kind_replace',
  SystemRemove: 'kind_system',
};

/** 맨 앞 동작 태그 — 무엇이 일어났는지 한눈에 (노드 점과 같은 색). */
function ActionTag({ kind }: { kind: EventKind }) {
  const color = kindColor(kind);
  return (
    <span
      className="mr-2 inline-flex items-center rounded-md px-2 py-0.5 align-middle text-[11.5px] font-bold"
      style={{ color, background: `color-mix(in srgb, ${color} 18%, transparent)` }}
    >
      {Loc.t(kindKey[kind])}
    </span>
  );
}

// 복사 버튼과 동일한 노출 규칙 (호버 시 나타나고 터치기기에선 은은히 보임)
const REVEAL = 'opacity-70 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 group-focus-within:opacity-100';

export function TimelineRow({ ev, onGoTo, highlightMine = true }: { ev: MarkerEvent; onGoTo?: () => void; highlightMine?: boolean }) {
  const mine = ev.involvesMe && highlightMine;
  const actionColor = kindColor(ev.kind); // 노드·태그 동일 색 — 동작으로 스캔

  return (
    <div data-testid="event-row" data-seq={ev.seq} className="group relative flex gap-2.5">
      {/* 시간 거터 — HH:MM:SS.fff (ms 는 살짝 연하게) */}
      <div className="w-[82px] shrink-0 pt-[11px] text-right">
        <div className="whitespace-nowrap font-mono text-[11.5px] leading-none tabular-nums text-mk-text-sub">
          {ev.timeTextHms}
          <span className="text-mk-text-faint">{ev.timeTextMs}</span>
        </div>
        {ev.relTimeText && <div className="mt-0.5 font-mono text-[10px] leading-none text-mk-accent">{ev.relTimeText}</div>}
      </div>

      {/* 레일 + 노드(동작 색, 내 관련 여부와 무관) */}
      <div className="relative flex w-2.5 shrink-0 justify-center">
        <span className="absolute inset-y-0 w-px bg-mk-border" />
        <span
          className="absolute top-[15px] h-2.5 w-2.5 rounded-full ring-4 ring-mk-window"
          style={{ background: actionColor }}
        />
      </div>

      {/* 동작 태그 + 자연 문장 한 줄 (마커 인라인) */}
      <div
        className={[
          'mb-1.5 min-w-0 flex-1 rounded-lg border px-3 py-2 pr-8 text-[14px] leading-relaxed transition-colors',
          mine ? 'border-mk-accent/35 bg-mk-row-mine' : 'border-transparent hover:border-mk-border hover:bg-mk-card/60',
        ].join(' ')}
      >
        <ActionTag kind={ev.kind} />
        <RichLine parts={buildRich(ev)} />
      </div>

      {/* 필터 중일 때만 — 이 지점을 전체 타임라인에서 전후 맥락과 함께 보기 (복사 버튼과 동일 서식) */}
      {onGoTo && (
        <button
          onClick={onGoTo}
          title={Loc.t('tip_goto')}
          className={`absolute right-9 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md border border-mk-border bg-mk-card/90 text-mk-text-sub shadow-sm backdrop-blur transition-colors hover:bg-mk-card-hover hover:text-mk-text ${REVEAL}`}
        >
          <Crosshair size={13} />
        </button>
      )}
      <CopyButton onCopy={() => eventCopyLine(ev)} title={Loc.t('ctx_copy_selected')} size={13} reveal className="absolute right-1.5 top-1/2 h-6 w-6 -translate-y-1/2" />
    </div>
  );
}
