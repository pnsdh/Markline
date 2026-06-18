import { getString } from './locStrings';

export enum Lang {
  Ko = 'ko',
  En = 'en',
  Ja = 'ja',
}

/**
 * .NET string.Format 호환 합성 포맷.
 * 지원: {0}, {1} … 그리고 숫자 포맷 지정자 {0:0}(반올림 정수), {1:00}(2자리 0채움).
 */
export function format(template: string, args: unknown[]): string {
  return template.replace(/\{(\d+)(?::(0+))?\}/g, (_m, idx: string, spec?: string) => {
    const v = args[Number(idx)];
    if (spec) {
      const n = typeof v === 'number' ? v : Number(v);
      return String(Math.round(n)).padStart(spec.length, '0');
    }
    return String(v);
  });
}

/** 다국어 문자열 관리. current 는 전역 가변 상태(데스크톱 Loc.Current 와 동일 역할). */
class LocClass {
  current: Lang = Lang.Ko;

  /** OS UI 언어로 자동 감지 (한국어/일본어 외엔 영어). */
  detectFromOs(): Lang {
    const two = (typeof navigator !== 'undefined' ? navigator.language : 'ko').slice(0, 2);
    return two === 'ko' ? Lang.Ko : two === 'ja' ? Lang.Ja : Lang.En;
  }

  /** 설정 문자열("Auto"/"ko"/"en"/"ja") → 실제 적용 언어. */
  resolve(setting: string | null | undefined): Lang {
    switch (setting) {
      case 'ko':
        return Lang.Ko;
      case 'en':
        return Lang.En;
      case 'ja':
        return Lang.Ja;
      default:
        return this.detectFromOs();
    }
  }

  apply(lang: Lang): void {
    this.current = lang;
  }

  /** 키 → 현재 언어 문자열(+ 형식 인자). */
  t(key: string, ...args: unknown[]): string {
    const s = getString(key, this.current);
    return args.length ? format(s, args) : s;
  }

  markerName(enId: string): string {
    return this.t('mk.' + enId);
  }

  jobName(id: number): string {
    return this.t('job.' + id);
  }
}

export const Loc = new LocClass();
