import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownNarrowWide, ArrowUpNarrowWide, ArrowLeft, Check, Copy, Eye, EyeOff, Flag, Highlighter, Lock, Search, ArrowDownToLine, User, X } from 'lucide-react';
import { Loc } from '../../core/loc';
import { useStore, type ActionCat } from '../store';
import { buildEventItems, EventItem, groupSections } from '../eventItems';
import { buildCopyText, segCopyText } from '../copy';
import { kindColor } from '../theme';
import { CopyButton } from '../components/CopyButton';
import { TimelineRow } from './TimelineRow';
import { useTimelineScroll } from './useTimelineScroll';

// 동작 필터 칩 (부착·제거·이동·교체 순).
const ACTION_CHIPS: { cat: ActionCat; key: string; kind: 'Move' | 'Remove' | 'Replace' | 'Add' }[] = [
  { cat: 'add', key: 'kind_add', kind: 'Add' },
  { cat: 'remove', key: 'kind_remove', kind: 'Remove' },
  { cat: 'move', key: 'kind_move', kind: 'Move' },
  { cat: 'replace', key: 'kind_replace', kind: 'Replace' },
];

export function Timeline() {
  const segments = useStore((s) => s.segments);
  const selectedKey = useStore((s) => s.selectedKey);
  const search = useStore((s) => s.search);
  const onlyMine = useStore((s) => s.onlyMine);
  const eventNewestFirst = useStore((s) => s.eventNewestFirst);
  const following = useStore((s) => s.following);
  const totalEvents = useStore((s) => s.eventCount);
  const live = useStore((s) => s.live);
  const actionFilter = useStore((s) => s.actionFilter);
  const hideIdle = useStore((s) => s.hideIdle);
  const hidePostCombat = useStore((s) => s.hidePostCombat);
  const highlightMine = useStore((s) => s.highlightMine);
  const privacy = useStore((s) => s.privacy);
  const setPrivacy = useStore((s) => s.setPrivacy);
  const setHighlightMine = useStore((s) => s.setHighlightMine);
  const setSearch = useStore((s) => s.setSearch);
  const setOnlyMine = useStore((s) => s.setOnlyMine);
  const setEventNewestFirst = useStore((s) => s.setEventNewestFirst);
  const setFollowing = useStore((s) => s.setFollowing);
  const setHidePostCombat = useStore((s) => s.setHidePostCombat);
  const toggleAction = useStore((s) => s.toggleAction);
  const clearActionFilter = useStore((s) => s.clearActionFilter);
  const rv = useStore((s) => s.renderVersion);

  const { items, shown } = useMemo(
    () => buildEventItems(segments, { selectedKey, search, onlyMine, eventNewestFirst, actionFilter, hideIdle, hidePostCombat }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [segments, selectedKey, search, onlyMine, eventNewestFirst, actionFilter, hideIdle, hidePostCombat, rv],
  );

  // 스크롤 위치 관리 + 맥락 보기 바로가기/뒤로가기
  const { scrollRef, goToEvent, goBack, hasBack } = useTimelineScroll({
    items,
    shown,
    selectedKey,
    search,
    onlyMine,
    eventNewestFirst,
    following,
    actionFilter,
  });

  // 검색·칩으로 좁혀진 상태 → 행에서 '맥락 보기' 바로가기 노출
  const filtering = search.trim().length > 0 || actionFilter.length > 0 || onlyMine;
  const chipsActive = onlyMine || actionFilter.length > 0;

  const searchRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false); // 모바일: 포커스 시 검색창 전폭 확장

  const resetChips = () => {
    setOnlyMine(false);
    clearActionFilter();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Escape' && t === searchRef.current) searchRef.current?.blur();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const [copied, setCopied] = useState(0);
  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(buildCopyText(items));
      setCopied(shown);
      setTimeout(() => setCopied(0), 1800);
    } catch {
      /* 무시 */
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col rounded-2xl border border-mk-border bg-mk-panel/40">
      {/* 툴바 */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mk-text-faint" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder={Loc.t('search_ph')}
            aria-label={Loc.t('search_ph')}
            className="w-full rounded-xl border border-mk-border bg-mk-card py-2 pl-9 pr-9 text-[13px] text-mk-text outline-none transition-colors placeholder:text-mk-text-faint focus:border-mk-accent/60"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-mk-border bg-mk-panel px-1.5 py-px text-[10px] font-medium text-mk-text-faint sm:block">
            /
          </kbd>
        </div>
        {/* 토글 묶음 — 좁은 화면(sm 미만)에서 검색 포커스 시 숨겨 검색창을 전폭으로 확장 */}
        <div className={['flex items-center gap-2', searchFocused ? 'max-sm:hidden' : ''].join(' ')}>
          <Pill active={following} onClick={() => setFollowing(!following)} title={Loc.t(following ? 'tip_lock_on' : 'tip_lock_off')}>
            {following ? <ArrowDownToLine size={15} /> : <Lock size={15} />}
          </Pill>
          <Pill active={hidePostCombat} onClick={() => setHidePostCombat(!hidePostCombat)} title={Loc.t('opt_hide_postcombat')}>
            <Flag size={15} />
          </Pill>
          {/* 닉네임 비공개 */}
          <Pill active={privacy} onClick={() => setPrivacy(!privacy)} title={Loc.t(privacy ? 'tip_privacy_on' : 'tip_privacy_off')}>
            {privacy ? <EyeOff size={15} /> : <Eye size={15} />}
          </Pill>
          {/* 내 닉네임 강조 끄기 (켜짐=강조 안 함) */}
          <Pill active={!highlightMine} onClick={() => setHighlightMine(!highlightMine)} title={Loc.t('opt_highlight_off')}>
            <Highlighter size={15} />
          </Pill>
          <button
            onClick={() => setEventNewestFirst(!eventNewestFirst)}
            title={Loc.t(eventNewestFirst ? 'tip_eventsort_on' : 'tip_eventsort_off')}
            className="rounded-xl p-2 text-mk-text-sub transition-colors hover:bg-mk-card-hover hover:text-mk-text"
          >
            {eventNewestFirst ? <ArrowUpNarrowWide size={16} /> : <ArrowDownNarrowWide size={16} />}
          </button>
          {/* 복사 — 다른 아이콘과 동일한 무테 아이콘 버튼 */}
          <button
            onClick={copyAll}
            title={Loc.t('tip_copy')}
            className="rounded-xl p-2 text-mk-text-sub transition-colors hover:bg-mk-card-hover hover:text-mk-text"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* 필터 칩 — 내 캐릭터만 + 동작(부착·제거·이동·교체), 우측 초기화 */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2">
        <button
          onClick={() => setOnlyMine(!onlyMine)}
          title={Loc.t('tip_onlymine')}
          className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors"
          style={
            onlyMine
              ? { color: 'rgb(var(--mk-accent))', borderColor: 'rgb(var(--mk-accent))', background: 'rgb(var(--mk-accent-soft))' }
              : { color: 'rgb(var(--mk-text-sub))', borderColor: 'rgb(var(--mk-border))' }
          }
        >
          <User size={13} />
          {Loc.t('only_mine')}
        </button>
        {ACTION_CHIPS.map(({ cat, key, kind }) => {
          const on = actionFilter.includes(cat);
          const color = kindColor(kind);
          return (
            <button
              key={cat}
              onClick={() => toggleAction(cat)}
              className="rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors"
              style={
                on
                  ? { color, borderColor: color, background: `color-mix(in srgb, ${color} 16%, transparent)` }
                  : { color: 'rgb(var(--mk-text-sub))', borderColor: 'rgb(var(--mk-border))' }
              }
            >
              {Loc.t(key)}
            </button>
          );
        })}
        {chipsActive && (
          <button
            onClick={resetChips}
            title={Loc.t('tip_reset_chips')}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium text-mk-text-faint transition-colors hover:bg-mk-card-hover hover:text-mk-text"
          >
            <X size={13} />
            {Loc.t('reset_chips')}
          </button>
        )}
        {(chipsActive || search.trim().length > 0) && (
          <span className="ml-1 whitespace-nowrap text-[11px] font-medium text-mk-text-faint">{Loc.t('count_shown', shown)}</span>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 pb-8">
        {shown === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-[14px] text-mk-text-faint">
            {/* 필터로 0건 / (정적) 빈 로그 / 실시간 추적 중 빈 새 로그(=롤오버 직후) 를 구분해 안내 */}
            {totalEvents > 0 ? (
              Loc.t('no_events_filtered')
            ) : live ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mk-accent opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mk-accent" />
                </span>
                <span className="max-w-sm leading-relaxed">{Loc.t('empty_live_hint')}</span>
              </>
            ) : (
              Loc.t('no_events_none')
            )}
          </div>
        ) : (
          // 폭 제한은 앱 전체(가운데 정렬 컬럼)에서 처리 — 여기선 박스를 꽉 채운다.
          // 구간별 섹션으로 감싸 헤더를 '자기 섹션 안에서만' sticky → 다음 헤더가 이전 헤더를 밀어낸다(겹침 방지).
          <motion.div key={selectedKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}>
            {groupSections(items).map((sec, si) => (
              <div key={sec.header.key} className={si === 0 ? 'mt-1' : 'mt-4'}>
                <Item item={sec.header} filtering={filtering} onGoTo={goToEvent} highlightMine={highlightMine} />
                <AnimatePresence initial={false}>
                  {sec.body.map((it) => (
                    <Item key={it.key} item={it} filtering={filtering} onGoTo={goToEvent} highlightMine={highlightMine} />
                  ))}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* 바로가기로 점프한 뒤 — 내용을 가리지 않게 패널 하단 중앙에 떠 있는 복귀 버튼 */}
      <AnimatePresence>
        {hasBack && (
          <motion.button
            key="nav-back"
            onClick={goBack}
            title={Loc.t('tip_nav_back')}
            initial={{ opacity: 0, x: '-50%', y: 14 }}
            animate={{ opacity: 1, x: '-50%', y: 0 }}
            exit={{ opacity: 0, x: '-50%', y: 14 }}
            transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-4 left-1/2 z-20 flex items-center gap-1.5 rounded-full border border-mk-accent/40 bg-mk-card/95 px-4 py-2 text-[13px] font-semibold text-mk-accent shadow-xl backdrop-blur transition-[filter] hover:brightness-105"
          >
            <ArrowLeft size={15} />
            {Loc.t('nav_back')}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function Item({
  item,
  filtering,
  onGoTo,
  highlightMine,
}: {
  item: EventItem;
  filtering: boolean;
  onGoTo: (seq: number, segKey: string) => void;
  highlightMine: boolean;
}) {
  if (item.kind === 'header') {
    const seg = item.seg;
    return (
      <div className="group sticky top-0 z-10 -mx-3 mb-2 bg-mk-panel/80 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-mk-accent-soft px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-mk-accent">
            {seg.tagText}
          </span>
          <span className="truncate text-[14px] font-bold text-mk-text">{seg.title}</span>
          <span className="hidden text-[11.5px] text-mk-text-faint sm:inline">
            {seg.dateText} {seg.timeRangeText}
          </span>
          <span className="ml-auto whitespace-nowrap text-[11.5px] font-medium text-mk-text-faint">{Loc.t('count_n', item.count)}</span>
          <CopyButton onCopy={() => segCopyText(seg)} title={Loc.t('ctx_copy_all')} size={12} reveal className="h-[18px] w-[18px]" />
        </div>
      </div>
    );
  }
  if (item.kind === 'divider') {
    return (
      <div className="my-2 flex items-center gap-2 pl-[58px] text-[11px] font-medium text-mk-text-faint">
        <span className="h-px flex-1 bg-mk-border" />
        {item.label}
        <span className="h-px flex-1 bg-mk-border" />
      </div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}>
      <TimelineRow ev={item.ev} highlightMine={highlightMine} onGoTo={filtering ? () => onGoTo(item.ev.seq, item.segKey) : undefined} />
    </motion.div>
  );
}

function Pill({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        'flex items-center gap-1.5 rounded-xl px-2.5 py-2 transition-colors',
        active ? 'bg-mk-accent-soft text-mk-accent' : 'text-mk-text-sub hover:bg-mk-card-hover hover:text-mk-text',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

