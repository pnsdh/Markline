import { useLayoutEffect, useRef, useState } from 'react';
import { useStore, type ActionCat } from '../store';
import type { EventItem } from '../eventItems';

interface SavedView {
  search: string;
  actionFilter: ActionCat[];
  onlyMine: boolean;
  selectedKey: string;
  scrollTop: number;
}

interface ScrollOpts {
  items: EventItem[];
  shown: number;
  selectedKey: string;
  search: string;
  onlyMine: boolean;
  eventNewestFirst: boolean;
  following: boolean;
  actionFilter: ActionCat[];
}

/**
 * 타임라인 스크롤 위치 관리 + '맥락 보기' 바로가기/뒤로가기.
 * - 뷰(구간/검색/정렬)가 바뀌면 맨 위로, 팔로우 중엔 새 기록 쪽으로 따라간다.
 * - goToEvent: 현재 검색상태·스크롤을 저장하고 필터를 모두 해제해 해당 이벤트를 화면 중앙으로(+강조 펄스).
 * - goBack: 저장해 둔 검색상태·스크롤로 복원.
 */
export function useTimelineScroll(o: ScrollOpts) {
  const { items, shown, selectedKey, search, onlyMine, eventNewestFirst, following, actionFilter } = o;
  const setSearch = useStore((s) => s.setSearch);
  const setOnlyMine = useStore((s) => s.setOnlyMine);
  const setSelectedKey = useStore((s) => s.setSelectedKey);
  const setActionFilter = useStore((s) => s.setActionFilter);
  const clearActionFilter = useStore((s) => s.clearActionFilter);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevShown = useRef(0);
  const prevHeight = useRef(0);
  const prevView = useRef('');

  // 바로가기/뒤로가기용 보류 스크롤 + 직전 검색상태
  const savedView = useRef<SavedView | null>(null);
  const pendingCenterSeq = useRef<number | null>(null);
  const pendingScrollTop = useRef<number | null>(null);
  const [hasBack, setHasBack] = useState(false);

  const goToEvent = (seq: number, segKey: string) => {
    savedView.current = { search, actionFilter: [...actionFilter], onlyMine, selectedKey, scrollTop: scrollRef.current?.scrollTop ?? 0 };
    setHasBack(true);
    // 필터 모두 해제 + 해당 전투 선택 → 그 지점을 화면 중앙으로
    setSearch('');
    clearActionFilter();
    setOnlyMine(false);
    setSelectedKey(segKey);
    pendingCenterSeq.current = seq;
  };

  const goBack = () => {
    const v = savedView.current;
    if (!v) return;
    setSearch(v.search);
    setActionFilter(v.actionFilter);
    setOnlyMine(v.onlyMine);
    setSelectedKey(v.selectedKey);
    pendingScrollTop.current = v.scrollTop;
    savedView.current = null;
    setHasBack(false);
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const viewKey = `${selectedKey}|${search}|${onlyMine}|${eventNewestFirst}`;

    // 뒤로가기: 저장된 스크롤 복원
    if (pendingScrollTop.current != null) {
      el.scrollTop = pendingScrollTop.current;
      pendingScrollTop.current = null;
      prevView.current = viewKey;
      prevHeight.current = el.scrollHeight;
      prevShown.current = shown;
      return;
    }
    // 바로가기: 해당 이벤트를 화면 중앙으로 + 잠깐 강조 펄스
    if (pendingCenterSeq.current != null) {
      const target = el.querySelector(`[data-seq="${pendingCenterSeq.current}"]`) as HTMLElement | null;
      if (target) {
        target.scrollIntoView({ block: 'center' });
        target.classList.remove('mk-jump-flash');
        void target.offsetWidth; // 리플로우 → 애니메이션 재시작
        target.classList.add('mk-jump-flash');
      }
      pendingCenterSeq.current = null;
      prevView.current = viewKey;
      prevHeight.current = el.scrollHeight;
      prevShown.current = shown;
      return;
    }

    const viewChanged = viewKey !== prevView.current;
    prevView.current = viewKey;
    if (viewChanged) el.scrollTop = 0;
    else if (following) {
      if (shown > prevShown.current) el.scrollTop = eventNewestFirst ? 0 : el.scrollHeight;
    } else if (eventNewestFirst) {
      const delta = el.scrollHeight - prevHeight.current;
      if (delta > 0) el.scrollTop += delta;
    }
    prevHeight.current = el.scrollHeight;
    prevShown.current = shown;
  }, [shown, items, following, eventNewestFirst, selectedKey, search, onlyMine]);

  return { scrollRef, goToEvent, goBack, hasBack };
}
