// 바이트 청크 스트림에서 완성된 라인만 분리.
// 줄마다 TextDecoder.decode 를 부르면(대용량에서 수백만 번) 매우 느리므로,
// 청크 전체를 한 번에 스트리밍 디코드(멀티바이트 경계는 디코더가 내부 버퍼링)하고
// 문자열을 '\n' 으로 split 한다 → 디코드 호출이 청크 수(수천 번)로 줄어 대폭 빨라진다.
// (이전 byte-carry 방식과 출력 라인은 동일: \r\n·\n 처리, 빈 줄 제외, 선두 BOM 제거.)

export class LineSplitter {
  private decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
  private carry = ''; // 개행 없이 끝난 마지막 부분 라인
  private atStart = true;

  /** 청크를 받아 완성된 라인 배열을 반환 (미완성 끝줄은 내부 carry 에 보관). */
  push(chunk: Uint8Array): string[] {
    let text = this.decoder.decode(chunk, { stream: true });
    if (this.atStart && text.length > 0) {
      this.atStart = false;
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // UTF-8 BOM
    }
    text = this.carry + text;

    const parts = text.split('\n');
    this.carry = parts.pop() ?? ''; // 마지막 조각은 (아직 개행이 안 온) 미완성 라인
    const out: string[] = [];
    for (let p of parts) {
      if (p.endsWith('\r')) p = p.slice(0, -1);
      if (p.length > 0) out.push(p);
    }
    return out;
  }
}
