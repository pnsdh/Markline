import { Anonymizer } from '../../core/anonymizer';
import { directionParticle, objectParticle, subjectParticle } from '../../core/hangul';
import { Lang, Loc } from '../../core/loc';
import { Marker, markerName } from '../../core/markers';
import { MarkerEvent, Ref, refDisplay } from '../../core/models';

/**
 * v2 표시 전용 — 마커를 문장 안에 인라인으로 녹인 자연 문장.
 * (복사/골든 검증용 toCopyLine/description 은 데스크톱 포맷 그대로 둔다.)
 */
export type RichPart =
  | { t: 'text'; text: string; faint?: boolean }
  | { t: 'name'; ref: Ref }
  | { t: 'marker'; marker: Marker; faded?: boolean };

const txt = (text: string, faint = false): RichPart => ({ t: 'text', text, faint });
const nm = (ref: Ref): RichPart => ({ t: 'name', ref });
const mk = (marker: Marker, faded = false): RichPart => ({ t: 'marker', marker, faded });

// ── 한국어 조사 (공통 로직은 core/hangul) ──
function anon(ref: Ref): string {
  return Anonymizer.display(refDisplay(ref), ref.isPlayer ? ref.id : null);
}
const ga = (ref: Ref): string => subjectParticle(anon(ref)); // 주격 가/이
const ro = directionParticle; // 방향 로/으로
const eul = objectParticle; // 목적격 을/를

// ── 유지시간·자동해제 꼬리말 (부착자 표시는 불필요하여 생략) ──
function suffix(ev: MarkerEvent): RichPart[] {
  const segs: string[] = [];
  const dur = ev.held != null ? MarkerEvent.formatDuration(ev.held) : null;
  const lang = Loc.current;
  if (dur) segs.push(lang === Lang.En ? `held ${dur}` : lang === Lang.Ja ? `${dur} 保持` : `${dur} 유지`);
  if (ev.kind === 'SystemRemove') segs.push(lang === Lang.En ? 'auto' : lang === Lang.Ja ? '自動解除' : '자동 해제');
  if (segs.length === 0) return [];
  return [txt(` (${segs.join(' · ')})`, true)];
}

/** 이벤트 → 인라인 마커 자연 문장 (현재 언어). */
export function buildRich(ev: MarkerEvent): RichPart[] {
  const parts = Loc.current === Lang.En ? ko_en(ev, 'en') : Loc.current === Lang.Ja ? ko_en(ev, 'ja') : descKo(ev);
  return [...parts, ...suffix(ev)];
}

/** 리치 조각을 평문으로 — 마커는 이름, 인물은 (익명화된) 표시명. 복사용. */
export function richToPlain(parts: RichPart[]): string {
  let s = '';
  for (const p of parts) {
    if (p.t === 'text') s += p.text;
    else if (p.t === 'name') s += anon(p.ref);
    else s += markerName(p.marker);
  }
  return s;
}

/** 타임라인에 표시되는 문장과 동일한 평문 (현재 언어). */
export function richSentence(ev: MarkerEvent): string {
  return richToPlain(buildRich(ev));
}

function descKo(ev: MarkerEvent): RichPart[] {
  const p: RichPart[] = [];
  const M = ev.marker;
  const mn = markerName(M);
  if (ev.kind === 'SystemRemove') {
    p.push(txt('시스템이 '), nm(ev.target!), txt('의 '), mk(M), txt(`${eul(mn)} 해제`));
    return p;
  }
  p.push(nm(ev.actor!), txt(`${ga(ev.actor!)} `));
  switch (ev.kind) {
    case 'Add':
      if (ev.self) p.push(txt('자신에게 '), mk(M), txt(`${eul(mn)} 부착`));
      else p.push(nm(ev.target!), txt('에게 '), mk(M), txt(`${eul(mn)} 부착`));
      break;
    case 'Remove':
      if (ev.self) p.push(txt('자신의 '), mk(M), txt(`${eul(mn)} 제거`));
      else p.push(nm(ev.target!), txt('의 '), mk(M), txt(`${eul(mn)} 제거`));
      break;
    case 'Replace': {
      const old = ev.oldMarker!;
      if (ev.self) p.push(txt('자신의 '));
      else p.push(nm(ev.target!), txt('의 '));
      p.push(mk(old, true), txt(`${eul(markerName(old))} `), mk(M), txt(`${ro(mn)} 교체`));
      break;
    }
    case 'Move':
      p.push(nm(ev.from!), txt('의 '), mk(M), txt(`${eul(mn)} `));
      if (ev.self) p.push(txt('자신에게 옮김'));
      else p.push(nm(ev.target!), txt('에게 옮김'));
      break;
  }
  return p;
}

function ko_en(ev: MarkerEvent, lang: 'en' | 'ja'): RichPart[] {
  const p: RichPart[] = [];
  const M = ev.marker;
  if (lang === 'en') {
    if (ev.kind === 'SystemRemove') return [txt('System cleared '), nm(ev.target!), txt("'s "), mk(M)];
    p.push(nm(ev.actor!));
    switch (ev.kind) {
      case 'Add':
        p.push(ev.self ? txt(' marked themselves with ') : txt(' marked '));
        if (!ev.self) p.push(nm(ev.target!), txt(' with '));
        p.push(mk(M));
        break;
      case 'Remove':
        if (ev.self) p.push(txt(' removed their own '), mk(M));
        else p.push(txt(' removed '), nm(ev.target!), txt("'s "), mk(M));
        break;
      case 'Replace':
        if (ev.self) p.push(txt(' replaced their own '));
        else p.push(txt(' replaced '), nm(ev.target!), txt("'s "));
        p.push(mk(ev.oldMarker!, true), txt(' with '), mk(M));
        break;
      case 'Move':
        p.push(txt(' moved '), nm(ev.from!), txt("'s "), mk(M));
        p.push(ev.self ? txt(' to themselves') : txt(' to '));
        if (!ev.self) p.push(nm(ev.target!));
        break;
    }
    return p;
  }
  // ja
  if (ev.kind === 'SystemRemove') return [txt('システムが'), nm(ev.target!), txt('の'), mk(M), txt('を解除')];
  p.push(nm(ev.actor!));
  switch (ev.kind) {
    case 'Add':
      if (ev.self) p.push(txt('が自分に'), mk(M), txt('を設置'));
      else p.push(txt('が'), nm(ev.target!), txt('に'), mk(M), txt('を設置'));
      break;
    case 'Remove':
      if (ev.self) p.push(txt('が自分の'), mk(M), txt('を解除'));
      else p.push(txt('が'), nm(ev.target!), txt('の'), mk(M), txt('を解除'));
      break;
    case 'Replace':
      if (ev.self) p.push(txt('が自分の'));
      else p.push(txt('が'), nm(ev.target!), txt('の'));
      p.push(mk(ev.oldMarker!, true), txt('を'), mk(M), txt('に変更'));
      break;
    case 'Move':
      p.push(txt('が'), nm(ev.from!), txt('の'), mk(M), txt('を'));
      if (ev.self) p.push(txt('自分に移動'));
      else p.push(nm(ev.target!), txt('に移動'));
      break;
  }
  return p;
}
