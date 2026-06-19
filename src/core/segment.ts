import { Loc } from './loc';
import { MarkerEvent } from './models';
import { fmtDate, fmtHms, LogTime } from './time';

/** 260 라인 기반 전투 구간. */
export class CombatWindow {
  start: LogTime;
  end: LogTime | null = null;
  constructor(start: LogTime) {
    this.start = start;
  }
}

/** 화면 표시용 구간 (전투 또는 전투 사이의 대기 시간). */
export class Segment {
  isCombat: boolean; // 구간에 전투가 있었는지 — 구간 확정 후 채워짐(아이콘/대기숨김용)
  start: LogTime; // 표시 시작 시각 — 전투가 있으면 전투 시작에 맞춤(구간 확정 후 보정)
  end: LogTime | null;
  combatEnd: LogTime | null = null; // 전투 종료(전멸) 시각 — 미니 타임라인 축 끝(이후 정리는 제외)
  readonly zone: string;
  readonly events: MarkerEvent[] = [];

  constructor(isCombat: boolean, start: LogTime, zone: string, end: LogTime | null = null) {
    this.isCombat = isCombat;
    this.start = start;
    this.zone = zone;
    this.end = end;
  }

  get key(): string {
    return `${this.isCombat ? 1 : 0}|${this.start}`;
  }
  get title(): string {
    return this.zone.length > 0 ? this.zone : Loc.t(this.isCombat ? 'seg_combat' : 'seg_idle');
  }
  get tagText(): string {
    return Loc.t(this.isCombat ? 'seg_combat' : 'seg_idle');
  }
  get count(): number {
    return this.events.length;
  }
  get countText(): string {
    return Loc.t('count_n', this.count);
  }
  get timeRangeText(): string {
    const s = fmtHms(this.start);
    if (this.end == null) return `${s} ~ …`;
    return `${s} ~ ${fmtHms(this.end)} · ${MarkerEvent.formatDuration(this.end - this.start)}`;
  }
  get dateText(): string {
    return fmtDate(this.start, Loc.current);
  }
  get fullTimeText(): string {
    return `${this.dateText} · ${this.timeRangeText}`;
  }
}
