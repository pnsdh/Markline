import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Lang, Loc } from '../src/core/loc';
import { MarkerEvent } from '../src/core/models';
import { LogSession } from '../src/core/logSession';
import { buildSegments } from '../src/core/segmenter';
import { feedText } from '../src/core/dump';
import { buildEventItems } from '../src/ui/eventItems';

const fx = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * 워커 → 메인 직렬화 경계 검증.
 * 워커는 MarkerEvent 인스턴스를 postMessage(structuredClone)로 보내는데, 이때 prototype을
 * 잃고 plain 객체가 된다. 메인에서 setPrototypeOf 로 복원해야 getter(본문/상세)가 살아난다.
 */
describe('워커 직렬화 경계 + 메인 재구성', () => {
  it('structuredClone 후 rehydrate 하면 본문/구간/아이템이 정상', () => {
    Loc.apply(Lang.Ko);
    const s = new LogSession();
    feedText(s, readFileSync(join(fx, 'sample1.log'), 'utf8'));
    expect(s.events.length).toBeGreaterThan(0);

    // --- 워커 postMessage 시뮬레이션 ---
    const wire = structuredClone({
      events: s.events,
      combats: s.combats.map((c) => ({ start: c.start, end: c.end })),
      zones: s.zones.slice(),
    });

    // 경계를 넘으면 prototype을 잃는다 → getter 호출 불가
    expect(typeof (wire.events[0] as { description?: unknown }).description).toBe('undefined');

    // --- 메인 재구성 ---
    for (const ev of wire.events) Object.setPrototypeOf(ev, MarkerEvent.prototype);
    const events = wire.events as MarkerEvent[];
    const segments = buildSegments({ events, combats: wire.combats, zones: wire.zones });

    // rehydrate 후 getter 동작 확인
    const first = events[0];
    expect(Array.isArray(first.description)).toBe(true);
    expect(first.toCopyLine()).toContain('|');
    expect(segments.length).toBeGreaterThan(0);

    const { items, shown } = buildEventItems(segments, {
      selectedKey: 'ALL',
      search: '',
      onlyMine: false,
      eventNewestFirst: false,
    });
    expect(shown).toBe(s.events.length);
    expect(items.some((i) => i.kind === 'header')).toBe(true);
    expect(items.some((i) => i.kind === 'event')).toBe(true);

    // 검색 필터 동작
    const filtered = buildEventItems(segments, {
      selectedKey: 'ALL',
      search: '공격',
      onlyMine: false,
      eventNewestFirst: false,
    });
    expect(filtered.shown).toBeGreaterThan(0);
    expect(filtered.shown).toBeLessThanOrEqual(shown);
  });
});
