import { Anonymizer } from './anonymizer';
import { subjectParticle } from './hangul';
import { getJob, jobDisplayName } from './jobs';
import { Lang, Loc } from './loc';
import { Marker, markerName } from './markers';
import { fmtHms, fmtHmsMs, fmtMsOnly, LogTime } from './time';

export type EventKind = 'Add' | 'Remove' | 'SystemRemove' | 'Move' | 'Replace';

/**
 * .NET `ToString("0.00")` / `"0.0"` 와 동일한 반올림으로 고정 소수 문자열을 만든다.
 * .NET Core는 double의 **최단 round-trippable 십진 표현**을 만든 뒤 그 자리에서
 * half-away-from-zero 로 반올림한다. JS `toFixed`는 저장된 이진값(0.845→0.84499…)을
 * 기준으로 반올림해 경계값에서 어긋나므로, 최단 표현(String(x))을 직접 반올림한다.
 */
function roundHalfAway(value: number, digits: number): string {
  if (!Number.isFinite(value)) return String(value);
  const neg = value < 0;
  let s = Math.abs(value).toString(); // JS도 .NET과 같은 최단 표현 알고리즘
  if (s.includes('e')) s = Math.abs(value).toFixed(digits + 4); // 지수표기 방어
  const dot = s.indexOf('.');
  let intStr = dot < 0 ? s : s.slice(0, dot);
  let fracStr = dot < 0 ? '' : s.slice(dot + 1);
  if (fracStr.length <= digits) {
    fracStr = fracStr.padEnd(digits, '0');
    return (neg ? '-' : '') + (digits ? `${intStr}.${fracStr}` : intStr);
  }
  const roundUp = fracStr.charCodeAt(digits) - 48 >= 5;
  const arr = (intStr + fracStr.slice(0, digits)).split('').map((c) => c.charCodeAt(0) - 48);
  if (roundUp) {
    let i = arr.length - 1;
    for (; i >= 0; i--) {
      if (++arr[i] < 10) break;
      arr[i] = 0;
    }
    if (i < 0) arr.unshift(1);
  }
  const all = arr.join('');
  const cut = all.length - digits;
  const ip = all.slice(0, cut) || '0';
  return (neg ? '-' : '') + (digits ? `${ip}.${all.slice(cut)}` : ip);
}

/** 리치 텍스트 조각. job이 있으면 이름 앞에 직업 아이콘, playerId면 비공개 모드에서 "플레이어 N". */
export interface TextPart {
  text: string;
  strong?: boolean;
  mine?: boolean;
  job?: number | null;
  playerId?: string | null;
}

/** 해석된 대상(플레이어/NPC). */
export interface Ref {
  realName: string | null;
  isPlayer: boolean;
  isMe: boolean;
  id: string;
  job: number;
}

/** 표시용 이름(실명 또는 알 수 없는 대상). 익명화는 렌더 시 적용. */
export function refDisplay(r: Ref): string {
  return r.realName ?? Loc.t('unknown_target', r.id);
}

export interface MarkerEventInit {
  time: LogTime;
  kind: EventKind;
  marker: Marker;
  oldMarker?: Marker | null;
  actor?: Ref | null;
  target?: Ref | null;
  from?: Ref | null;
  self?: boolean;
  held?: number | null; // 유지시간(ms)
  placedBy?: Ref | null;
  showPlacer?: boolean;
  involvesMe?: boolean;
}

/** 합성된 마커 이벤트 한 건. 본문·상세는 현재 언어로 계산. */
export class MarkerEvent {
  readonly time: LogTime;
  readonly kind: EventKind;
  readonly marker: Marker;
  readonly oldMarker: Marker | null;
  readonly actor: Ref | null;
  readonly target: Ref | null;
  readonly from: Ref | null;
  readonly self: boolean;
  readonly held: number | null;
  readonly placedBy: Ref | null;
  readonly showPlacer: boolean;
  readonly involvesMe: boolean;

  // 구간화 단계에서 채워지는 상대 시간
  relSpan: number | null = null; // ms
  postCombat = false;

  // 세션 events 배열에서의 인덱스(append-only라 스냅샷 간 안정) → React 안정 key용
  seq = -1;

  constructor(init: MarkerEventInit) {
    this.time = init.time;
    this.kind = init.kind;
    this.marker = init.marker;
    this.oldMarker = init.oldMarker ?? null;
    this.actor = init.actor ?? null;
    this.target = init.target ?? null;
    this.from = init.from ?? null;
    this.self = init.self ?? false;
    this.held = init.held ?? null;
    this.placedBy = init.placedBy ?? null;
    this.showPlacer = init.showPlacer ?? false;
    this.involvesMe = init.involvesMe ?? false;
  }

  /** 전투 시작(또는 종료) 기준 상대 시간 문자열. */
  get relTimeText(): string | null {
    if (this.relSpan == null) return null;
    const totalSec = Math.floor(this.relSpan / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return this.postCombat ? Loc.t('rel_post', min, sec) : `+${min}:${sec.toString().padStart(2, '0')}`;
  }

  // ── 본문(이름 강조 + 직업 아이콘 조각) ──
  get description(): TextPart[] {
    switch (Loc.current) {
      case Lang.En:
        return this.descEn();
      case Lang.Ja:
        return this.descJa();
      default:
        return this.descKo();
    }
  }

  private static name(r: Ref): TextPart {
    return {
      text: refDisplay(r),
      strong: true,
      mine: r.isMe,
      job: r.isPlayer && getJob(r.job) != null ? r.job : null,
      playerId: r.isPlayer ? r.id : null,
    };
  }

  private static anonName(r: Ref): string {
    return Anonymizer.display(refDisplay(r), r.isPlayer ? r.id : null);
  }

  private descKo(): TextPart[] {
    const N = MarkerEvent.name;
    const p: TextPart[] = [];
    if (this.kind === 'SystemRemove') {
      p.push({ text: Loc.t('system_actor') + '이 ' });
      p.push(N(this.target!));
      p.push({ text: '의 표식을 해제' });
      return p;
    }
    const subj = subjectParticle(MarkerEvent.anonName(this.actor!));
    p.push(N(this.actor!));
    switch (this.kind) {
      case 'Add':
        if (this.self) p.push({ text: `${subj} 자신에게 부착` });
        else {
          p.push({ text: `${subj} ` });
          p.push(N(this.target!));
          p.push({ text: '에게 부착' });
        }
        break;
      case 'Remove':
        if (this.self) p.push({ text: `${subj} 자신의 표식을 제거` });
        else {
          p.push({ text: `${subj} ` });
          p.push(N(this.target!));
          p.push({ text: '의 표식을 제거' });
        }
        break;
      case 'Replace':
        if (this.self) p.push({ text: `${subj} 자신의 표식을 교체` });
        else {
          p.push({ text: `${subj} ` });
          p.push(N(this.target!));
          p.push({ text: '의 표식을 교체' });
        }
        break;
      case 'Move':
        p.push({ text: `${subj} ` });
        p.push(N(this.from!));
        if (this.self) p.push({ text: '의 표식을 자신에게 옮김' });
        else {
          p.push({ text: '의 표식을 ' });
          p.push(N(this.target!));
          p.push({ text: '에게 옮김' });
        }
        break;
    }
    return p;
  }

  private descEn(): TextPart[] {
    const N = MarkerEvent.name;
    const p: TextPart[] = [];
    if (this.kind === 'SystemRemove') {
      p.push({ text: 'System cleared ' });
      p.push(N(this.target!));
      p.push({ text: "'s marker" });
      return p;
    }
    p.push(N(this.actor!));
    switch (this.kind) {
      case 'Add':
        if (this.self) p.push({ text: ' marked themselves' });
        else {
          p.push({ text: ' marked ' });
          p.push(N(this.target!));
        }
        break;
      case 'Remove':
        if (this.self) p.push({ text: ' removed their own marker' });
        else {
          p.push({ text: ' removed ' });
          p.push(N(this.target!));
          p.push({ text: "'s marker" });
        }
        break;
      case 'Replace':
        if (this.self) p.push({ text: ' replaced their own marker' });
        else {
          p.push({ text: ' replaced ' });
          p.push(N(this.target!));
          p.push({ text: "'s marker" });
        }
        break;
      case 'Move':
        p.push({ text: ' moved ' });
        p.push(N(this.from!));
        if (this.self) p.push({ text: "'s marker to themselves" });
        else {
          p.push({ text: "'s marker to " });
          p.push(N(this.target!));
        }
        break;
    }
    return p;
  }

  private descJa(): TextPart[] {
    const N = MarkerEvent.name;
    const p: TextPart[] = [];
    if (this.kind === 'SystemRemove') {
      p.push({ text: 'システムが' });
      p.push(N(this.target!));
      p.push({ text: 'の印を解除' });
      return p;
    }
    p.push(N(this.actor!));
    switch (this.kind) {
      case 'Add':
        if (this.self) p.push({ text: 'が自分に設置' });
        else {
          p.push({ text: 'が' });
          p.push(N(this.target!));
          p.push({ text: 'に設置' });
        }
        break;
      case 'Remove':
        if (this.self) p.push({ text: 'が自分の印を解除' });
        else {
          p.push({ text: 'が' });
          p.push(N(this.target!));
          p.push({ text: 'の印を解除' });
        }
        break;
      case 'Replace':
        if (this.self) p.push({ text: 'が自分の印を変更' });
        else {
          p.push({ text: 'が' });
          p.push(N(this.target!));
          p.push({ text: 'の印を変更' });
        }
        break;
      case 'Move':
        p.push({ text: 'が' });
        p.push(N(this.from!));
        if (this.self) p.push({ text: 'の印を自分に移動' });
        else {
          p.push({ text: 'の印を' });
          p.push(N(this.target!));
          p.push({ text: 'に移動' });
        }
        break;
    }
    return p;
  }

  // ── 상세줄(유지 시간·부착자 등) ──
  get detail(): string | null {
    if (this.kind === 'Move') return this.held != null ? Loc.t('det_moved_from', MarkerEvent.formatDuration(this.held)) : null;
    if (this.kind === 'Replace')
      return this.held != null && this.oldMarker != null
        ? Loc.t('det_replaced', markerName(this.oldMarker), MarkerEvent.formatDuration(this.held))
        : null;
    if (this.kind === 'Remove' || this.kind === 'SystemRemove') {
      const segs: string[] = [];
      if (this.held != null) segs.push(Loc.t('det_held', MarkerEvent.formatDuration(this.held)));
      if (this.showPlacer && this.placedBy != null) segs.push(Loc.t('det_placer', MarkerEvent.anonName(this.placedBy)));
      if (this.kind === 'SystemRemove') segs.push(Loc.t('det_auto'));
      return segs.length > 0 ? segs.join(' · ') : null;
    }
    return null;
  }

  get timeText(): string {
    return fmtHmsMs(this.time);
  }
  get timeTextHms(): string {
    return fmtHms(this.time);
  }
  get timeTextMs(): string {
    return fmtMsOnly(this.time);
  }

  get kindText(): string {
    switch (this.kind) {
      case 'Add':
        return Loc.t('kind_add');
      case 'Remove':
        return Loc.t('kind_remove');
      case 'Move':
        return Loc.t('kind_move');
      case 'Replace':
        return Loc.t('kind_replace');
      default:
        return Loc.t('kind_system');
    }
  }

  get chipArrow(): string {
    return this.oldMarker == null ? '' : '▸';
  }

  /** 검색 일치(이름/표식/동작, 비공개 라벨 포함). 대소문자 무시. */
  matches(q: string): boolean {
    const ql = q.toLowerCase();
    const C = (s: string) => s.toLowerCase().includes(ql);
    if (C(this.kindText) || C(markerName(this.marker)) || C(this.marker.enId)) return true;
    if (this.oldMarker != null && (C(markerName(this.oldMarker)) || C(this.oldMarker.enId))) return true;
    for (const r of [this.actor, this.target, this.from, this.placedBy]) {
      if (r == null) continue;
      if (C(refDisplay(r))) return true;
      if (r.isPlayer) {
        const lbl = Anonymizer.labelFor(r.id);
        if (lbl != null && C(lbl)) return true;
      }
    }
    return false;
  }

  toCopyLine(): string {
    const marker = this.oldMarker == null ? markerName(this.marker) : `${markerName(this.oldMarker)}→${markerName(this.marker)}`;
    const det = this.detail;
    const detail = det == null ? '' : ` — ${det}`;
    let body = '';
    for (const p of this.description) {
      if (p.job != null && getJob(p.job) != null) body += jobDisplayName(p.job) + ' ';
      body += Anonymizer.display(p.text, p.playerId);
    }
    return `${this.timeText} | ${marker} | ${this.kindText} | ${body}${detail}`;
  }

  /** 유지시간 포맷. ms 입력. */
  static formatDuration(ms: number): string {
    const totalSeconds = ms / 1000;
    if (totalSeconds < 10) return `${roundHalfAway(totalSeconds, 2)}${Loc.t('dur_sec')}`;
    if (totalSeconds < 60) return `${roundHalfAway(totalSeconds, 1)}${Loc.t('dur_sec')}`;
    if (totalSeconds < 3600) {
      const m = Math.floor(totalSeconds / 60);
      const s = Math.floor(totalSeconds) % 60;
      return s === 0 ? Loc.t('dur_min', m) : Loc.t('dur_minsec', m, s);
    }
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor(totalSeconds / 60) % 60;
    return Loc.t('dur_hourmin', h, m);
  }

}
