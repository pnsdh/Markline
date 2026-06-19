import { describe, expect, it } from 'vitest';
import { LogSession } from '../src/core/logSession';

// 합성 로그(29=사인, 25=사망)를 순서대로 먹여 events 합성 결과를 검증.
function parse(lines: string[]): LogSession {
  const s = new LogSession();
  for (const l of lines) s.feedLine(l);
  s.flushPending();
  return s;
}

const ME = '10000001';
const BOB = '10000002';
const MOB = '40000001'; // 40… = 몹/NPC

describe('대상 사망 — 징이 몹과 함께 사라진 뒤 재배치', () => {
  it('몹에 부착 → 몹 사망 → 같은 마커를 자신에게 = "이동"이 아니라 새 "부착"(+사망 자동해제)', () => {
    const s = parse([
      '01|2026-01-01T10:00:00.000|1|TestZone|',
      `29|2026-01-01T10:00:01.000|Add|0|${ME}|곰쥬|${MOB}|꼬마 만드라고라|`, // 몹에 공격1 부착
      `25|2026-01-01T10:00:10.000|${MOB}|꼬마 만드라고라|${ME}|곰쥬|`, // 몹 사망 → 징 사라짐
      // 13초 뒤 같은 마커를 자신에게: 게임이 죽은 몹의 잔여 징을 정리(Delete)하며 재배치(Add)
      `29|2026-01-01T10:00:23.000|Delete|0|${ME}|곰쥬|${MOB}||`,
      `29|2026-01-01T10:00:23.000|Add|0|${ME}|곰쥬|${ME}|곰쥬|`,
    ]);
    expect(s.events).toHaveLength(3);
    expect(s.events[0].kind).toBe('Add'); // 몹에 부착
    // 사망 시점에 '대상 처치' 자동 해제 합성
    const death = s.events[1];
    expect(death.kind).toBe('SystemRemove');
    expect(death.reason).toBe('death');
    expect(death.target?.realName).toBe('꼬마 만드라고라');
    expect(death.held).toBeGreaterThan(8000); // ~9초 유지
    expect(death.held!).toBeLessThan(10000);
    // 재배치는 새 '부착'(이전엔 'Move'로 오인)
    const replace = s.events[2];
    expect(replace.kind).toBe('Add');
    expect(replace.self).toBe(true);
    expect(replace.held).toBeNull();
  });

  it('몹 사망 후 같은 마커를 다른 몹에게도 새 "부착"', () => {
    const MOB2 = '40000002';
    const s = parse([
      '01|2026-01-01T10:00:00.000|1|TestZone|',
      `29|2026-01-01T10:00:01.000|Add|0|${ME}|곰쥬|${MOB}|꼬마 만드라고라|`,
      `25|2026-01-01T10:00:10.000|${MOB}|꼬마 만드라고라|${ME}|곰쥬|`,
      `29|2026-01-01T10:00:20.000|Delete|0|${ME}|곰쥬|${MOB}||`,
      `29|2026-01-01T10:00:20.000|Add|0|${ME}|곰쥬|${MOB2}|어린 푸크|`,
    ]);
    expect(s.events).toHaveLength(3);
    expect(s.events[1].kind).toBe('SystemRemove'); // 대상 처치 자동 해제
    expect(s.events[2].kind).toBe('Add'); // 다른 몹에 새 부착
  });

  it('회귀 방지: 살아있는 몹에서 옮기면 그대로 "이동"', () => {
    const s = parse([
      '01|2026-01-01T10:00:00.000|1|TestZone|',
      `29|2026-01-01T10:00:01.000|Add|0|${ME}|곰쥬|${MOB}|꼬마 만드라고라|`,
      `29|2026-01-01T10:00:30.000|Delete|0|${ME}|곰쥬|${MOB}|꼬마 만드라고라|`,
      `29|2026-01-01T10:00:30.000|Add|0|${ME}|곰쥬|${ME}|곰쥬|`, // 사망 없음 → 정상 이동
    ]);
    expect(s.events).toHaveLength(2);
    expect(s.events[1].kind).toBe('Move');
    expect(s.events[1].held).not.toBeNull();
  });

  it('플레이어 시체에는 징이 남으므로, 플레이어 사망은 슬롯을 비우지 않음(이동 유지)', () => {
    const s = parse([
      '01|2026-01-01T10:00:00.000|1|TestZone|',
      `29|2026-01-01T10:00:01.000|Add|0|${ME}|곰쥬|${BOB}|Bob|`, // 다른 플레이어에 부착
      `25|2026-01-01T10:00:10.000|${BOB}|Bob|${MOB}|꼬마 만드라고라|`, // 플레이어 사망(시체엔 징 유지)
      `29|2026-01-01T10:00:20.000|Delete|0|${ME}|곰쥬|${BOB}|Bob|`,
      `29|2026-01-01T10:00:20.000|Add|0|${ME}|곰쥬|${ME}|곰쥬|`,
    ]);
    expect(s.events).toHaveLength(2);
    expect(s.events[1].kind).toBe('Move'); // 플레이어는 제외 → 정상 이동
  });
});
