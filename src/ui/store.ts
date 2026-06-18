import { create } from 'zustand';
import { Anonymizer } from '../core/anonymizer';
import { Lang, Loc } from '../core/loc';
import { MarkerEvent } from '../core/models';
import { Segment } from '../core/segment';
import { LogTime } from '../core/time';
import { loadSettings, type LangSetting, type PersistedSettings, saveSettings, type ThemePref } from './settings';
import { applyThemeClass, applyWithTransition, effectiveDark, prefersDark } from './themeRuntime';
import * as session from './sessionController';

export type { ThemePref, LangSetting } from './settings';
export { supportsFsAccess } from '../io/fileOpen';
export type Status = 'idle' | 'loading' | 'ready' | 'error';

/** 동작(부착/이동/교체/제거) 필터 카테고리. 빈 배열이면 전체. */
export type ActionCat = 'add' | 'move' | 'replace' | 'remove';

export interface StoreState extends PersistedSettings {
  // 파생
  resolvedLang: Lang;
  dark: boolean;

  // 세션
  events: MarkerEvent[];
  segments: Segment[];
  myId: string | null;
  myName: string | null;
  lastLineTime: LogTime | null;
  eventCount: number;

  // UI / 상태
  status: Status;
  progress: number;
  fileName: string | null;
  live: boolean;
  fresh: boolean; // 최근 15초 내 새 데이터
  lastDataMs: number;
  error: string | null;
  selectedKey: string; // 'ALL' 또는 segment.key
  search: string;
  onlyMine: boolean;
  actionFilter: ActionCat[]; // 동작 필터(빈 배열=전체)
  folderName: string | null; // 기억된 폴더 이름(실시간 자동전환 중)
  pendingResume: { kind: 'dir' | 'file'; name: string } | null; // 새로고침 후 권한 재요청 필요
  mobileNav: boolean; // 모바일 구간 드로어 열림

  // 언어/비공개/테마 변경 시 증가 → 계산속성(getter) 재렌더 트리거
  renderVersion: number;

  // 액션 — IO(파일/추적)는 sessionController 에 위임, 나머지는 여기서 상태만 갱신
  openFile: (file: File) => void;
  tailHandle: (handle: FileSystemFileHandle) => void;
  openLatestFromDir: (dir: FileSystemDirectoryHandle) => void;
  resumeWatch: () => void;
  setTheme: (t: ThemePref) => void;
  setLangSetting: (l: LangSetting) => void;
  setPrivacy: (v: boolean) => void;
  setSegNewestFirst: (v: boolean) => void;
  setEventNewestFirst: (v: boolean) => void;
  setFollowing: (v: boolean) => void;
  setAutoOpenLatest: (v: boolean) => void;
  setSelectedKey: (k: string) => void;
  setSearch: (q: string) => void;
  setOnlyMine: (v: boolean) => void;
  toggleAction: (cat: ActionCat) => void;
  setActionFilter: (cats: ActionCat[]) => void;
  clearActionFilter: () => void;
  setCompactRail: (v: boolean) => void;
  setHideIdle: (v: boolean) => void;
  setHidePostCombat: (v: boolean) => void;
  setHighlightMine: (v: boolean) => void;
  setMobileNav: (v: boolean) => void;
  syncSystemTheme: () => void;
}

// 시작 시 저장된 설정으로 테마·언어·비공개를 먼저 적용한다(첫 페인트 깜빡임 방지).
const initial = loadSettings();
const initialLang = Loc.resolve(initial.langSetting);
const initialDark = effectiveDark(initial.theme);
Loc.apply(initialLang);
if (typeof document !== 'undefined') document.documentElement.lang = initialLang;
Anonymizer.enabled = initial.privacy;
applyThemeClass(initialDark);

export const useStore = create<StoreState>((set, get) => {
  const persist = () => {
    const s = get();
    saveSettings({
      theme: s.theme,
      langSetting: s.langSetting,
      privacy: s.privacy,
      segNewestFirst: s.segNewestFirst,
      eventNewestFirst: s.eventNewestFirst,
      following: s.following,
      autoOpenLatest: s.autoOpenLatest,
      compactRail: s.compactRail,
      hideIdle: s.hideIdle,
      hidePostCombat: s.hidePostCombat,
      highlightMine: s.highlightMine,
    });
  };

  return {
    ...initial,
    resolvedLang: initialLang,
    dark: initialDark,

    events: [],
    segments: [],
    myId: null,
    myName: null,
    lastLineTime: null,
    eventCount: 0,

    status: 'idle',
    progress: 0,
    fileName: null,
    live: false,
    fresh: false,
    lastDataMs: 0,
    error: null,
    selectedKey: 'ALL',
    search: '',
    onlyMine: false,
    actionFilter: [],
    folderName: null,
    pendingResume: null,
    mobileNav: false,
    renderVersion: 0,

    // ── IO 위임 (워커/파일 추적은 sessionController 가 상태를 직접 갱신) ──
    openFile: (file) => session.loadFile(file),
    tailHandle: (handle) => session.tailHandle(handle),
    openLatestFromDir: (dir) => session.openLatestFromDir(dir),
    resumeWatch: () => session.resumeWatch(),

    // ── 설정/표시 액션 ──
    setTheme: (theme) => {
      const dark = effectiveDark(theme);
      applyWithTransition(() => {
        applyThemeClass(dark);
        set({ theme, dark, renderVersion: get().renderVersion + 1 });
        persist();
      });
    },
    setLangSetting: (langSetting) => {
      const resolvedLang = Loc.resolve(langSetting);
      Loc.apply(resolvedLang);
      document.documentElement.lang = resolvedLang;
      set({ langSetting, resolvedLang, renderVersion: get().renderVersion + 1 });
      persist();
    },
    setPrivacy: (privacy) => {
      Anonymizer.enabled = privacy;
      set({ privacy, renderVersion: get().renderVersion + 1 });
      persist();
    },
    setSegNewestFirst: (segNewestFirst) => {
      set({ segNewestFirst });
      persist();
    },
    setEventNewestFirst: (eventNewestFirst) => {
      set({ eventNewestFirst });
      persist();
    },
    setFollowing: (following) => {
      set({ following });
      persist();
    },
    setAutoOpenLatest: (autoOpenLatest) => {
      set({ autoOpenLatest });
      persist();
    },
    setSelectedKey: (selectedKey) => set({ selectedKey, mobileNav: false }),
    setSearch: (search) => set({ search }),
    setOnlyMine: (onlyMine) => set({ onlyMine }),
    toggleAction: (cat) => {
      const cur = get().actionFilter;
      set({ actionFilter: cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat] });
    },
    setActionFilter: (actionFilter) => set({ actionFilter }),
    clearActionFilter: () => set({ actionFilter: [] }),
    setCompactRail: (compactRail) => {
      set({ compactRail });
      persist();
    },
    setHideIdle: (hideIdle) => {
      set({ hideIdle });
      persist();
    },
    setHidePostCombat: (hidePostCombat) => {
      set({ hidePostCombat });
      persist();
    },
    setHighlightMine: (highlightMine) => {
      set({ highlightMine });
      persist();
    },
    setMobileNav: (mobileNav) => set({ mobileNav }),
    syncSystemTheme: () => {
      if (get().theme !== 'System') return;
      const dark = prefersDark();
      applyWithTransition(() => {
        applyThemeClass(dark);
        set({ dark, renderVersion: get().renderVersion + 1 });
      });
    },
  };
});

// sessionController 가 워커 메시지로 상태를 갱신할 수 있도록 store 핸들을 주입.
session.attachStore({ getState: useStore.getState, setState: useStore.setState });

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => useStore.getState().syncSystemTheme());
  // 상태바 "fresh" 갱신용 — 15초 지나면 idle 표시
  setInterval(() => {
    const s = useStore.getState();
    if (s.status === 'ready' && s.fresh && Date.now() - s.lastDataMs > 15000) useStore.setState({ fresh: false });
  }, 5000);
  void session.tryStartupResume();
}
