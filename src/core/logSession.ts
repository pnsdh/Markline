import { MarkerEvent, Ref } from './models';
import { CombatWindow } from './segment';
import { getMarker } from './markers';
import { LogTime, parseLogTime } from './time';

interface SignRec {
  index: number;
  time: LogTime;
  tsRaw: string;
  isAdd: boolean;
  waymark: number;
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  zoneEpoch: number;
  sourceJob: number;
  targetJob: number;
}

interface Slot {
  targetId: string;
  targetName: string;
  placedById: string;
  placedByName: string;
  since: LogTime;
  zoneEpoch: number; // 이 징이 찍힌 존 인스턴스(에폭) — 같은 던전 재진입도 구분(필드 이동 판별용)
}

function tryParseInt(s: string): number | null {
  if (!/^[+-]?\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

function tryParseHex(s: string): number | null {
  if (!/^[0-9a-fA-F]+$/.test(s)) return null;
  const n = parseInt(s, 16);
  return Number.isNaN(n) ? null : n;
}

/**
 * 로그 라인을 순서대로 받아 마커 이벤트를 합성한다.
 * 같은 타임스탬프의 Delete+Add 쌍을 스펙 규칙대로 '이동'/'교체'로 묶는다.
 * 데스크톱 LogSession.cs 의 1:1 포팅.
 */
export class LogSession {
  readonly events: MarkerEvent[] = [];
  readonly combats: CombatWindow[] = [];
  readonly zones: { time: LogTime; zone: string }[] = [];
  myId: string | null = null;
  myName: string | null = null;
  lastLineTime: LogTime | null = null;

  private readonly names = new Map<string, string>(); // actor id -> name (03/02 라인)
  private readonly jobs = new Map<string, number>(); // actor id -> ClassJob id (03/261 라인)
  private readonly _playerNumbers = new Map<string, number>(); // player id -> 등장 순번(비공개 모드용)
  private readonly slots = new Map<number, Slot>(); // waymark -> 현재 부착 상태
  private readonly pending: SignRec[] = []; // 같은 타임스탬프 그룹 버퍼
  private pendingTs: string | null = null;
  private pendingWallMs = 0;
  private lineIndex = 0;
  private inCombat = false;
  private currentZone = '';
  private currentZoneEpoch = 0; // 01(존 변경)에서 이름이 바뀔 때마다 증가 — 같은 던전 재진입 구분

  /** 플레이어 ID → 등장 순번. 비공개 모드에서 "플레이어 N" 라벨에 사용. */
  get playerNumbers(): ReadonlyMap<string, number> {
    return this._playerNumbers;
  }

  get hasPending(): boolean {
    return this.pending.length > 0;
  }

  /** 대기 중인 그룹이 얼마나 오래됐는지(ms). */
  get pendingAgeMs(): number {
    return Date.now() - this.pendingWallMs;
  }

  feedLines(lines: readonly string[]): void {
    for (const l of lines) this.feedLine(l);
  }

  feedLine(line: string): void {
    this.lineIndex++;
    if (line.length < 5) return;
    const c0 = line[0];
    const c1 = line[1];

    // 손상된 한 줄이 전체 파싱을 멈추지 않도록 라인 단위로 보호한다.
    try {
      if (c0 === '2' && c1 === '9' && line[2] === '|') {
        this.onSign(line);
        return;
      }
      if (c0 === '0' && line[2] === '|') {
        if (c1 === '1') this.onZone(line);
        else if (c1 === '2') this.onMe(line);
        else if (c1 === '3') this.onCombatant(line);
        return;
      }
      if (c0 === '2' && c1 === '6' && line[2] === '0' && line[3] === '|') {
        this.onInCombat(line);
        return;
      }
      // 261 CombatantMemory — Name 필드가 있는 줄만 가볍게 이름 보강
      if (c0 === '2' && c1 === '6' && line[2] === '1' && line[3] === '|') this.onCombatantMemory(line);
    } catch {
      // 형식이 어긋난 라인은 건너뛴다.
    }
  }

  /** 대기 중인 같은-타임스탬프 그룹을 강제로 확정한다 (파일 끝/유휴 시). */
  flushPending(): void {
    this.flushGroup();
  }

  private onSign(line: string): void {
    const f = line.split('|');
    if (f.length < 8) return;
    const t = parseLogTime(f[1]);
    if (t == null) return;
    const waymark = tryParseInt(f[3]);
    if (waymark == null) return;
    const isAdd = f[2] === 'Add';
    if (!isAdd && f[2] !== 'Delete') return;

    this.lastLineTime = t;
    if (this.pendingTs != null && this.pendingTs !== f[1]) this.flushGroup();
    if (this.pending.length === 0) {
      this.pendingTs = f[1];
      this.pendingWallMs = Date.now();
    }
    // 존·직업은 이 라인을 읽는 시점 기준으로 기록 (그룹 합성은 지연되므로)
    const srcJob = this.jobs.get(f[4]) ?? 0;
    const tgtJob = this.jobs.get(f[6]) ?? 0;
    this.pending.push({
      index: this.lineIndex,
      time: t,
      tsRaw: f[1],
      isAdd,
      waymark,
      sourceId: f[4],
      sourceName: f[5],
      targetId: f[6],
      targetName: f[7],
      zoneEpoch: this.currentZoneEpoch,
      sourceJob: srcJob,
      targetJob: tgtJob,
    });
  }

  private onZone(line: string): void {
    const f = line.split('|');
    if (f.length < 4) return;
    const t = parseLogTime(f[1]);
    if (t == null) return;
    this.lastLineTime = t;
    this.zones.push({ time: t, zone: f[3] });
    // 존 이름이 실제로 바뀌면 새 인스턴스로 간주해 에폭 증가 (같은 던전 재진입도 여기서 구분).
    if (f[3] !== this.currentZone) {
      this.currentZone = f[3];
      this.currentZoneEpoch++;
    }
    // 존 이동 시 전투 구간 안전 종료
    if (this.inCombat && this.combats.length > 0) {
      const last = this.combats[this.combats.length - 1];
      if (last.end == null) last.end = t;
      this.inCombat = false;
    }
  }

  private onMe(line: string): void {
    const f = line.split('|');
    if (f.length < 4 || f[2].length === 0) return;
    this.myId = f[2];
    this.myName = f[3];
    this.names.set(f[2], f[3]);
  }

  private onCombatant(line: string): void {
    // 03|ts|id|name|job(hex)|level(hex)|...
    const f = line.split('|');
    if (f.length < 5 || f[2].length === 0) return;
    if (f[3].length > 0) this.names.set(f[2], f[3]);
    // ClassJob(1~43)만 저장 — NPC의 BNpc 클래스 번호는 제외(플레이어 직업만)
    const job = tryParseHex(f[4]);
    if (job != null && job >= 1 && job <= 43) this.jobs.set(f[2], job);
  }

  // 261|ts|change|id|key|value|...|hash — Name/Job 키가 있을 때만 id→이름·직업 보강.
  private onCombatantMemory(line: string): void {
    if (line.indexOf('|Name|') < 0) return;
    const f = line.split('|');
    if (f.length < 6 || f[3].length === 0) return;
    const ni = f.indexOf('Name');
    if (ni >= 4 && ni + 1 < f.length && f[ni + 1].length > 0) this.names.set(f[3], f[ni + 1]);
    const ji = f.indexOf('Job'); // 261 의 Job 은 10진수
    if (ji >= 4 && ji + 1 < f.length) {
      const job = tryParseInt(f[ji + 1]);
      if (job != null && job >= 1 && job <= 43) this.jobs.set(f[3], job);
    }
  }

  private onInCombat(line: string): void {
    const f = line.split('|');
    if (f.length < 4) return;
    const t = parseLogTime(f[1]);
    if (t == null) return;
    this.lastLineTime = t;
    const active = f[2] === '1' || f[3] === '1';
    if (active && !this.inCombat) {
      this.combats.push(new CombatWindow(t));
      this.inCombat = true;
    } else if (!active && this.inCombat) {
      if (this.combats.length > 0) {
        const last = this.combats[this.combats.length - 1];
        if (last.end == null) last.end = t;
      }
      this.inCombat = false;
    }
  }

  // ---------- 그룹 합성 ----------

  private flushGroup(): void {
    if (this.pending.length === 0) {
      this.pendingTs = null;
      return;
    }

    const dels = this.pending.filter((r) => !r.isAdd);
    const adds = this.pending.filter((r) => r.isAdd);
    const used = new Set<SignRec>();
    const emitted: { order: number; ev: MarkerEvent }[] = [];

    for (const add of adds) {
      // 1) 같은 마커가 같은 순간 다른 대상에서 Delete → '이동'
      const mv = dels.find((d) => !used.has(d) && d.waymark === add.waymark && d.targetId !== add.targetId);
      if (mv) {
        used.add(mv);
        const slot = this.slots.get(add.waymark);
        if (this.isStale(slot, add.zoneEpoch)) emitted.push({ order: add.index, ev: this.createAdd(add) });
        else emitted.push({ order: Math.min(mv.index, add.index), ev: this.createMove(add, mv, slot!) });
        this.setSlot(add);
        continue;
      }

      // 2) 같은 마커·같은 대상 Delete+Add → 단순 재부착으로 간주
      const re = dels.find((d) => !used.has(d) && d.waymark === add.waymark && d.targetId === add.targetId);
      if (re) used.add(re);

      // 3) 같은 대상의 기존 마커가 시스템(0000)에 의해 Delete → '교체'
      if (!re) {
        const rp = dels.find((d) => !used.has(d) && d.targetId === add.targetId && d.sourceId === '0000');
        if (rp) {
          used.add(rp);
          const oldSlot = this.slots.get(rp.waymark);
          if (this.isStale(oldSlot, add.zoneEpoch)) emitted.push({ order: add.index, ev: this.createAdd(add) });
          else emitted.push({ order: Math.min(rp.index, add.index), ev: this.createReplace(add, rp, oldSlot!) });
          this.slots.delete(rp.waymark);
          this.setSlot(add);
          continue;
        }
      }

      emitted.push({ order: add.index, ev: this.createAdd(add) });
      this.setSlot(add);
    }

    for (const del of dels) {
      if (used.has(del)) continue;
      const slot = this.slots.get(del.waymark);
      // 존 이동/재진입으로 사라진 잔여 징을 게임이 뒤늦게 정리하는 Delete는 표시하지 않는다.
      if (slot != null && slot.targetId === del.targetId && slot.zoneEpoch !== del.zoneEpoch) {
        this.slots.delete(del.waymark);
        continue;
      }
      emitted.push({ order: del.index, ev: this.createRemove(del, slot) });
      this.slots.delete(del.waymark);
    }

    emitted.sort((a, b) => a.order - b.order);
    for (const e of emitted) this.events.push(e.ev);
    this.pending.length = 0;
    this.pendingTs = null;
  }

  private setSlot(add: SignRec): void {
    this.slots.set(add.waymark, {
      targetId: add.targetId,
      targetName: add.targetName,
      placedById: add.sourceId,
      placedByName: add.sourceName,
      since: add.time,
      zoneEpoch: add.zoneEpoch,
    });
  }

  /** 이전 징이 지금과 다른 존 인스턴스(에폭)에서 찍힌 잔여 상태인가 — 던전 재진입/필드 이동 판별. */
  private isStale(slot: Slot | undefined | null, nowEpoch: number): boolean {
    return slot == null || slot.zoneEpoch !== nowEpoch;
  }

  // ---------- 이벤트 생성 ----------

  private resolve(id: string, rawName: string, job: number): Ref {
    const isMe = this.myId != null && id === this.myId;
    const isPlayer = id.startsWith('10');
    // 플레이어는 등장 순서대로 번호를 매겨둔다(비공개 모드에서 "플레이어 N").
    if (isPlayer && !this._playerNumbers.has(id)) this._playerNumbers.set(id, this._playerNumbers.size + 1);
    // ID가 신뢰할 식별자다. ID로 알려진 이름을 우선해 이름·직업을 일관되게 맞춘다.
    const known = this.names.get(id);
    if (known != null && known.length > 0) return { realName: known, isPlayer, isMe, id, job };
    if (rawName.length > 0) return { realName: rawName, isPlayer, isMe, id, job };
    // 이름이 없는 대상 = 비-플레이어(목인형/NPC 등)
    return { realName: null, isPlayer: false, isMe, id, job };
  }

  private createAdd(add: SignRec): MarkerEvent {
    const actor = this.resolve(add.sourceId, add.sourceName, add.sourceJob);
    const target = this.resolve(add.targetId, add.targetName, add.targetJob);
    const self = add.sourceId === add.targetId;
    return new MarkerEvent({
      time: add.time,
      kind: 'Add',
      marker: getMarker(add.waymark),
      actor,
      target: self ? null : target,
      self,
      involvesMe: actor.isMe || target.isMe,
    });
  }

  private createMove(add: SignRec, del: SignRec, slot: Slot | null): MarkerEvent {
    const actor = this.resolve(add.sourceId, add.sourceName, add.sourceJob);
    const from = this.resolve(del.targetId, del.targetName, del.targetJob);
    const to = this.resolve(add.targetId, add.targetName, add.targetJob);
    const toSelf = add.sourceId === add.targetId;
    const held = slot != null ? add.time - slot.since : null;
    return new MarkerEvent({
      time: add.time,
      kind: 'Move',
      marker: getMarker(add.waymark),
      actor,
      from,
      target: toSelf ? null : to,
      self: toSelf,
      held,
      involvesMe: actor.isMe || from.isMe || to.isMe,
    });
  }

  private createReplace(add: SignRec, del: SignRec, oldSlot: Slot | null): MarkerEvent {
    const actor = this.resolve(add.sourceId, add.sourceName, add.sourceJob);
    const target = this.resolve(add.targetId, add.targetName, add.targetJob);
    const self = add.sourceId === add.targetId;
    const held = oldSlot != null ? add.time - oldSlot.since : null;
    return new MarkerEvent({
      time: add.time,
      kind: 'Replace',
      marker: getMarker(add.waymark),
      oldMarker: getMarker(del.waymark),
      actor,
      target: self ? null : target,
      self,
      held,
      involvesMe: actor.isMe || target.isMe,
    });
  }

  private createRemove(del: SignRec, slot: Slot | undefined): MarkerEvent {
    const system = del.sourceId === '0000';
    const target = this.resolve(del.targetId, del.targetName, del.targetJob);
    const actor = system ? null : this.resolve(del.sourceId, del.sourceName, del.sourceJob);
    const self = !system && del.sourceId === del.targetId;
    const held = slot != null ? del.time - slot.since : null;

    // 부착자는 (시스템 자동 해제이거나 제거자와 다를 때만) 표기.
    const placedByName = slot != null && slot.placedByName.length > 0 ? slot.placedByName : null;
    const showPlacer = placedByName != null && (system || placedByName !== del.sourceName);
    const placedBy = showPlacer ? this.resolve(slot?.placedById ?? '', placedByName ?? '', 0) : null;

    return new MarkerEvent({
      time: del.time,
      kind: system ? 'SystemRemove' : 'Remove',
      marker: getMarker(del.waymark),
      actor,
      target: !system && self ? null : target,
      self,
      held,
      placedBy,
      showPlacer,
      involvesMe: target.isMe || (actor?.isMe ?? false) || (this.myId != null && slot?.placedById === this.myId),
    });
  }
}
