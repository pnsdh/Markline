import { Lang } from './loc';

/**
 * LogTime: 정수 epoch-ms이지만 **UTC 기준으로 해석되는 "floating" 시각**.
 *
 * ⚠️ 핵심: 데스크톱은 DateTimeOffset.DateTime 으로 오프셋을 버리고 로그에 적힌
 * 벽시계 시각을 그대로 표시한다. JS의 Date 는 +09:00 오프셋을 런타임 로컬 TZ로
 * 변환해버리므로, 타임스탬프 문자열의 Y-M-D H:M:S.fff 성분만 뽑아 Date.UTC 로
 * 만든 뒤 항상 getUTC* 로 포맷한다 → 어느 지역에서 보든 로그의 시각 그대로.
 */
export type LogTime = number;

const TS_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/;

/** ISO 8601 타임스탬프(오프셋 포함 가능) → LogTime. 실패 시 null. 오프셋은 무시(floating). */
export function parseLogTime(s: string): LogTime | null {
  const m = TS_RE.exec(s);
  if (!m) return null;
  const ms = m[7] ? Number(m[7].slice(0, 3).padEnd(3, '0')) : 0;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], ms);
}

const p2 = (n: number) => (n < 10 ? '0' + n : '' + n);
const p3 = (n: number) => n.toString().padStart(3, '0');

/** "HH:mm:ss" */
export function fmtHms(t: LogTime): string {
  const d = new Date(t);
  return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
}

/** "HH:mm:ss.fff" (복사용 전체) */
export function fmtHmsMs(t: LogTime): string {
  return `${fmtHms(t)}.${p3(new Date(t).getUTCMilliseconds())}`;
}

/** ".fff" */
export function fmtMsOnly(t: LogTime): string {
  return '.' + p3(new Date(t).getUTCMilliseconds());
}

const WD_KO = ['일', '월', '화', '수', '목', '금', '토'];
const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_JA = ['日', '月', '火', '水', '木', '金', '土'];
const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 구간 날짜 표시. ko "M월 d일 (ddd)" / en "MMM d (ddd)" / ja "M月d日(ddd)". */
export function fmtDate(t: LogTime, lang: Lang): string {
  const d = new Date(t);
  const mon = d.getUTCMonth(); // 0-based
  const day = d.getUTCDate();
  const wd = d.getUTCDay();
  switch (lang) {
    case Lang.En:
      return `${MON_EN[mon]} ${day} (${WD_EN[wd]})`;
    case Lang.Ja:
      return `${mon + 1}月${day}日(${WD_JA[wd]})`;
    default:
      return `${mon + 1}월 ${day}일 (${WD_KO[wd]})`;
  }
}

/** 두 시각 차이(밀리초). */
export function diffMs(a: LogTime, b: LogTime): number {
  return a - b;
}
