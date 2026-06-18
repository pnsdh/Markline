import { describe, expect, it } from 'vitest';
import { Lang, Loc } from '../src/core/loc';
import { getMarker } from '../src/core/markers';
import { MarkerEvent } from '../src/core/models';
import { dumpText } from '../src/core/dump';
import { LogSession } from '../src/core/logSession';
import { feedText } from '../src/core/dump';
import { buildSegments } from '../src/core/segmenter';

const TS = (hms: string) => `2026-06-07T${hms}.0000000+09:00`;

function lines(...ls: string[]): string {
  return ls.join('\n') + '\n';
}

describe('waymark / 마커 매핑', () => {
  it('공격6~8은 14~16에 있다', () => {
    expect(getMarker(0).enId).toBe('attack1');
    expect(getMarker(14).enId).toBe('attack6');
    expect(getMarker(16).enId).toBe('attack8');
    expect(getMarker(10).enId).toBe('square');
    expect(getMarker(99).enId).toBe('waymark99'); // fallback
  });
});

describe('FormatDuration (ko)', () => {
  it('구간별 포맷', () => {
    Loc.apply(Lang.Ko);
    expect(MarkerEvent.formatDuration(3270)).toBe('3.27초'); // <10s → 0.00
    expect(MarkerEvent.formatDuration(12500)).toBe('12.5초'); // <60s → 0.0
    expect(MarkerEvent.formatDuration(125000)).toBe('2분 5초'); // <60m
    expect(MarkerEvent.formatDuration(120000)).toBe('2분'); // 초=0
    expect(MarkerEvent.formatDuration(3 * 3600_000 + 4 * 60_000)).toBe('3시간 4분');
  });
});

describe('부착(Add) — 본문/조사/직업/상대시간', () => {
  it('Alice(나이트)가 Bob(백마도사)에게 부착, 전투 +0:05', () => {
    Loc.apply(Lang.Ko);
    const log = lines(
      `02|${TS('12:00:00')}|1000AAAA|Alice`,
      `03|${TS('12:00:01')}|1000AAAA|Alice|13|0|0`, // PLD=0x13=19
      `03|${TS('12:00:02')}|1000BBBB|Bob|18|0|0`, // WHM=0x18=24
      `260|${TS('12:00:05')}|1|0`,
      `29|${TS('12:00:10')}|Add|0|1000AAAA|Alice|1000BBBB|Bob|h`,
    );
    const s = new LogSession();
    feedText(s, log);
    expect(s.events.length).toBe(1);
    const ev = s.events[0];
    expect(ev.kind).toBe('Add');
    expect(ev.involvesMe).toBe(true); // Alice == MyId
    expect(ev.toCopyLine()).toBe('12:00:10.000 | 공격1 | 부착 | 나이트 Alice가 백마도사 Bob에게 부착');
    // 전투(12:00:05~) 중 → 상대시간 +0:05
    buildSegments(s);
    expect(ev.relTimeText).toBe('+0:05');
  });
});

describe('이동(Move) — 같은 마커, 다른 대상', () => {
  it('Alice가 Bob의 표식을 Carol에게 옮김, 유지 20.0초', () => {
    Loc.apply(Lang.Ko);
    const log = lines(
      `02|${TS('12:00:00')}|1000AAAA|Alice`,
      `03|${TS('12:00:01')}|1000AAAA|Alice|13|0|0`,
      `29|${TS('12:00:10')}|Add|0|1000AAAA|Alice|1000BBBB|Bob|h`,
      `29|${TS('12:00:30')}|Delete|0|1000AAAA|Alice|1000BBBB|Bob|h`,
      `29|${TS('12:00:30')}|Add|0|1000AAAA|Alice|1000CCCC|Carol|h`,
    );
    const s = new LogSession();
    feedText(s, log);
    expect(s.events.length).toBe(2); // Add, Move
    const mv = s.events[1];
    expect(mv.kind).toBe('Move');
    expect(mv.detail).toBe('이전 대상에게 20.0초 동안 있었음');
    expect(mv.toCopyLine()).toBe(
      '12:00:30.000 | 공격1 | 이동 | 나이트 Alice가 Bob의 표식을 Carol에게 옮김 — 이전 대상에게 20.0초 동안 있었음',
    );
  });
});

describe('교체(Replace) — 같은 대상, 시스템(0000) Delete', () => {
  it('Alice가 Bob의 표식을 교체(공격1→공격2)', () => {
    Loc.apply(Lang.Ko);
    const log = lines(
      `02|${TS('12:00:00')}|1000AAAA|Alice`,
      `03|${TS('12:00:01')}|1000AAAA|Alice|13|0|0`,
      `29|${TS('12:00:10')}|Add|0|1000AAAA|Alice|1000BBBB|Bob|h`,
      `29|${TS('12:00:40')}|Delete|0|0000||1000BBBB|Bob|h`, // 시스템이 옛 attack1 제거
      `29|${TS('12:00:40')}|Add|1|1000AAAA|Alice|1000BBBB|Bob|h`, // attack2 새로
    );
    const s = new LogSession();
    feedText(s, log);
    expect(s.events.length).toBe(2);
    const rp = s.events[1];
    expect(rp.kind).toBe('Replace');
    expect(rp.oldMarker?.enId).toBe('attack1');
    expect(rp.marker.enId).toBe('attack2');
    expect(rp.toCopyLine()).toBe(
      '12:00:40.000 | 공격1→공격2 | 교체 | 나이트 Alice가 Bob의 표식을 교체 — 이전 표식(공격1)은 30.0초 동안 유지됨',
    );
  });
});

describe('제거(Remove) — 남이 단 마커 제거 + 부착자 표시', () => {
  it('Bob가 (Alice가 단) 표식 제거 → 부착자: Alice', () => {
    Loc.apply(Lang.Ko);
    const log = lines(
      `02|${TS('12:00:00')}|1000ZZZZ|Me`,
      `29|${TS('12:00:10')}|Add|0|1000AAAA|Alice|1000BBBB|Bob|h`,
      `29|${TS('12:00:25')}|Delete|0|1000BBBB|Bob|1000BBBB|Bob|h`, // Bob 본인이 제거(self)
    );
    const s = new LogSession();
    feedText(s, log);
    const rm = s.events[1];
    expect(rm.kind).toBe('Remove');
    expect(rm.self).toBe(true);
    expect(rm.detail).toContain('15.0초 동안 유지됨');
    expect(rm.detail).toContain('부착자: Alice'); // 제거자(Bob)≠부착자(Alice)
  });
});

describe('다국어 즉시 전환', () => {
  it('언어를 바꾸면 같은 이벤트의 본문이 바뀐다', () => {
    const log = lines(
      `02|${TS('12:00:00')}|1000AAAA|Alice`,
      `29|${TS('12:00:10')}|Add|0|1000AAAA|Alice|1000BBBB|Bob|h`,
    );
    const s = new LogSession();
    feedText(s, log);
    const ev = s.events[0];
    Loc.apply(Lang.En);
    expect(ev.kindText).toBe('Place');
    expect(ev.description.map((p) => p.text).join('')).toBe('Alice marked Bob');
    Loc.apply(Lang.Ja);
    expect(ev.kindText).toBe('設置');
    Loc.apply(Lang.Ko);
  });
});

describe('덤프 스모크', () => {
  it('헤더 + 구간이 생성된다', () => {
    Loc.apply(Lang.Ko);
    const log = lines(
      `02|${TS('12:00:00')}|1000AAAA|Alice`,
      `01|${TS('12:00:01')}|3|테스트존`,
      `260|${TS('12:00:05')}|1|0`,
      `29|${TS('12:00:10')}|Add|0|1000AAAA|Alice|1000BBBB|Bob|h`,
      `260|${TS('12:00:20')}|0|0`,
    );
    const out = dumpText(log, 'test.log');
    expect(out).toContain('마커 이벤트: 1건');
    expect(out).toContain('테스트존');
    expect(out).toContain('| 부착 |');
  });
});
