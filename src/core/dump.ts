import { LogSession } from './logSession';
import { buildSegments } from './segmenter';

/**
 * 텍스트 전체를 세션에 먹인다 (BOM 제거, \r\n / \n / \r 모두 처리).
 * 데스크톱 DumpTool 의 StreamReader.ReadLine 경로와 동등 — 라인 길이>0만 처리.
 */
export function feedText(session: LogSession, text: string): void {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // UTF-8 BOM
  for (const line of text.split(/\r\n|\n|\r/)) if (line.length > 0) session.feedLine(line);
  session.flushPending();
}

/**
 * 파싱 결과를 텍스트로 덤프 (데스크톱 DumpTool.cs 와 동일 포맷).
 * 데스크톱 `Markline.exe --dump` 출력과 줄 단위로 대조해 동등성을 검증한다.
 */
export function dump(session: LogSession, logPath: string): string {
  const out: string[] = [];
  out.push(`파일: ${logPath}`);
  out.push(`내 캐릭터: ${session.myName ?? ''} (${session.myId ?? ''})`);
  out.push(`마커 이벤트: ${session.events.length}건, 전투 구간: ${session.combats.length}개, 존 변경: ${session.zones.length}회`);
  out.push('');

  for (const seg of buildSegments(session)) {
    out.push(`===== [${seg.tagText}] ${seg.title} · ${seg.dateText} ${seg.timeRangeText} · ${seg.count}건 =====`);
    for (const ev of seg.events) {
      const rel = ev.relTimeText == null ? '' : ` (${ev.relTimeText})`;
      out.push(`${ev.toCopyLine()}${rel}`);
    }
    out.push('');
  }
  return out.join('\n') + '\n';
}

/** 편의: 텍스트 → 덤프 문자열. */
export function dumpText(text: string, logPath = ''): string {
  const session = new LogSession();
  feedText(session, text);
  return dump(session, logPath);
}
