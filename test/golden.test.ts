import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Lang, Loc } from '../src/core/loc';
import { dumpText } from '../src/core/dump';

/*
 * 골든 대조 테스트 — 데스크톱 동등성 검증.
 *
 * test/fixtures/<name>.log         : 샘플 ACT 네트워크 로그
 * test/fixtures/<name>.golden.txt  : `Markline.exe --dump <name>.log <name>.golden.txt` 출력
 *
 * 첫 줄("파일: ...")은 절대경로라 서로 다르므로 비교에서 제외한다.
 * 픽스처가 없으면 (아직 샘플 로그를 못 받았으면) 테스트를 건너뛴다.
 */
const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, 'fixtures');

function normalize(s: string): string {
  // BOM 제거 + 개행 통일 + 첫 줄(파일 경로) 제거
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  const body = s.replace(/\r\n/g, '\n').split('\n');
  if (body[0]?.startsWith('파일:')) body.shift();
  return body.join('\n');
}

const logs = existsSync(fixturesDir) ? readdirSync(fixturesDir).filter((f) => f.endsWith('.log')) : [];

describe('골든 대조 (데스크톱 --dump 동등성)', () => {
  if (logs.length === 0) {
    it.skip('픽스처 없음 — test/fixtures/*.log + *.golden.txt 추가 시 활성화', () => {});
    return;
  }
  Loc.apply(Lang.Ko); // DumpTool 은 기본 언어(ko)
  for (const log of logs) {
    const golden = join(fixturesDir, log.replace(/\.log$/, '.golden.txt'));
    it(`${log}`, () => {
      expect(existsSync(golden), `골든 파일 필요: ${golden}`).toBe(true);
      const text = readFileSync(join(fixturesDir, log), 'utf8');
      const expected = readFileSync(golden, 'utf8');
      expect(normalize(dumpText(text, log))).toBe(normalize(expected));
    });
  }
});
