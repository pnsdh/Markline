// 사용자 설정 — localStorage 영속화와 기본값. (휘발성 UI/세션 상태는 store.ts 에서 관리)

export type ThemePref = 'System' | 'Light' | 'Dark';
export type LangSetting = 'Auto' | 'ko' | 'en' | 'ja';

const LS_KEY = 'markline.settings.v1';

export interface PersistedSettings {
  theme: ThemePref;
  langSetting: LangSetting;
  privacy: boolean;
  segNewestFirst: boolean;
  eventNewestFirst: boolean;
  following: boolean;
  autoOpenLatest: boolean;
  compactRail: boolean; // 구간 레일 압축 모드(전투 많은 로그용)
  hideIdle: boolean; // 대기(비전투) 구간 숨김
  hidePostCombat: boolean; // 전투 종료 후 정리 숨김(집계 제외)
  highlightMine: boolean; // 내가 관련된 행 색 강조
}

export const DEFAULT_SETTINGS: PersistedSettings = {
  theme: 'System',
  langSetting: 'Auto',
  privacy: false,
  segNewestFirst: false,
  eventNewestFirst: false,
  following: false,
  autoOpenLatest: false,
  compactRail: false,
  hideIdle: false,
  hidePostCombat: false,
  highlightMine: true,
};

export function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* 손상 시 기본값 */
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: PersistedSettings): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* 무시 */
  }
}
