// 한국어 조사 선택 — 마지막 글자의 받침(종성) 유무로 결정.
// 데스크톱 포맷(models.ts)과 v2 표시(descRich.ts) 양쪽에서 공용으로 쓴다.

/** 마지막 글자에 받침이 있는가. 한글·영문(자음)·숫자(발음) 모두 처리. */
export function hasFinalConsonant(s: string): boolean {
  if (!s) return false;
  const c = s.charCodeAt(s.length - 1);
  if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 !== 0;
  const ch = s[s.length - 1].toLowerCase();
  if (ch >= 'a' && ch <= 'z') return !'aeiouy'.includes(ch);
  if (ch >= '0' && ch <= '9') return '013678'.includes(ch);
  return false;
}

/** 주격 조사 — 받침 있으면 '이', 없으면 '가'. */
export function subjectParticle(name: string): string {
  return hasFinalConsonant(name) ? '이' : '가';
}

/** 목적격 조사 — 받침 있으면 '을', 없으면 '를'. */
export function objectParticle(s: string): string {
  return hasFinalConsonant(s) ? '을' : '를';
}

/** 방향 조사 '로/으로' — 받침 없음·ㄹ(8) 받침이면 '로', 그 외 '으로'. */
export function directionParticle(s: string): string {
  if (!s) return '로';
  const c = s[s.length - 1];
  if (c >= '가' && c <= '힣') {
    const jong = (c.charCodeAt(0) - 0xac00) % 28;
    return jong === 0 || jong === 8 ? '로' : '으로';
  }
  if (c >= '0' && c <= '9') return '36'.includes(c) ? '으로' : '로';
  return '로';
}
