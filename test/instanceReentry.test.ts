import { describe, expect, it } from 'vitest';
import { LogSession } from '../src/core/logSession';

// 합성 로그(29=사인, 01=존변경)를 순서대로 먹여 events 합성 결과를 검증.
function parse(lines: string[]): LogSession {
  const s = new LogSession();
  for (const l of lines) s.feedLine(l);
  s.flushPending();
  return s;
}

const TEN_MIN = 10 * 60 * 1000;

describe('던전 재진입 — 이전 인스턴스 잔여 슬롯 처리', () => {
  it('나갔다 같은 던전(이름 동일) 재진입 후 새 마커는 "이동"이 아니라 새 "부착"', () => {
    const s = parse([
      '01|2026-01-01T10:00:00.000|1|TestZone|',
      '29|2026-01-01T10:00:01.000|Add|0|10000001|Alice|10000001|Alice|', // 인스턴스1: Alice 자신에게 공격1
      '01|2026-01-01T10:30:00.000|2|Overworld|', // 인스턴스 나감(이름 바뀜 → 에폭+1)
      '01|2026-01-01T10:31:00.000|1|TestZone|', // 같은 던전 재진입(이름 동일하지만 새 인스턴스 → 에폭+1)
      '29|2026-01-01T10:31:05.000|Delete|0|10000002|Bob|10000001|Alice|', // 게임이 이전 잔여 공격1 정리
      '29|2026-01-01T10:31:05.000|Add|0|10000002|Bob|10000002|Bob|', // 인스턴스2: Bob 자신에게 공격1
    ]);
    expect(s.events).toHaveLength(2);
    const reentry = s.events[1];
    expect(reentry.kind).toBe('Add'); // 버그였을 땐 'Move'(이전 보유자로부터 옮김)로 인식
    expect(reentry.self).toBe(true);
    expect(reentry.held).toBeNull(); // 버그였을 땐 ~31분(이전 인스턴스 배치 시각부터)
    // 어떤 이벤트도 가짜 장기 유지시간을 갖지 않아야 한다
    expect(s.events.every((e) => e.held == null || e.held < TEN_MIN)).toBe(true);
  });

  it('회귀 방지: 같은 인스턴스 내 재배치는 그대로 "이동"으로 인식', () => {
    const s = parse([
      '01|2026-01-01T10:00:00.000|1|TestZone|',
      '29|2026-01-01T10:00:01.000|Add|0|10000001|Alice|10000001|Alice|',
      '29|2026-01-01T10:00:30.000|Delete|0|10000002|Bob|10000001|Alice|',
      '29|2026-01-01T10:00:30.000|Add|0|10000002|Bob|10000002|Bob|', // 같은 존(에폭 동일) → 정상 이동
    ]);
    expect(s.events).toHaveLength(2);
    const move = s.events[1];
    expect(move.kind).toBe('Move');
    expect(move.held).not.toBeNull();
    expect(move.held!).toBeLessThan(60 * 1000); // ~29초 (정상 유지시간)
  });
});
