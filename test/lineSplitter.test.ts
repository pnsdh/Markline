import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Lang, Loc } from '../src/core/loc';
import { LogSession } from '../src/core/logSession';
import { buildSegments } from '../src/core/segmenter';
import { dump, dumpText } from '../src/core/dump';
import { LineSplitter } from '../src/io/logReader';

const fx = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures');

/** LineSplitter(워커 경로)가 feedText(문자열 split 경로)와 동일한 파싱 결과를 내는지 검증. */
function parseViaSplitter(bytes: Uint8Array, chunkSize: number): string {
  const s = new LogSession();
  const sp = new LineSplitter();
  for (let i = 0; i < bytes.length; i += chunkSize) {
    s.feedLines(sp.push(bytes.subarray(i, Math.min(i + chunkSize, bytes.length))));
  }
  s.flushPending();
  // 첫 줄(파일 경로) 무시 위해 dump 사용 후 비교는 호출부에서
  buildSegments(s); // relSpan/postCombat 채움
  return dump(s, 'x');
}

describe('LineSplitter ≡ feedText (워커 파싱 == 문자열 파싱)', () => {
  it('청크 크기 1/3/7/64K/전체 모두 동일 결과', () => {
    Loc.apply(Lang.Ko);
    const text = readFileSync(join(fx, 'sample1.log'), 'utf8');
    const golden = dumpText(text, 'x');
    const bytes = new Uint8Array(readFileSync(join(fx, 'sample1.log')));

    for (const cs of [1, 3, 7, 257, 65536, bytes.length]) {
      expect(parseViaSplitter(bytes, cs), `chunkSize=${cs}`).toBe(golden);
    }
  });
});
