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
  readonly isCombat: boolean;
  readonly start: LogTime;
  end: LogTime | null;
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
