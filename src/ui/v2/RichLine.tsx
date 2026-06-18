import { Anonymizer } from '../../core/anonymizer';
import { getJob, jobDisplayName } from '../../core/jobs';
import { categoryHex, markerName } from '../../core/markers';
import { refDisplay } from '../../core/models';
import { jobIconUrl, markerIconUrl } from '../theme';
import { RichPart } from './descRich';

/** 인라인 마커가 녹아든 자연 문장 렌더. */
export function RichLine({ parts }: { parts: RichPart[] }) {
  return (
    <span className="leading-relaxed">
      {parts.map((p, i) => {
        if (p.t === 'text') return <span key={i} className={p.faint ? 'text-mk-text-faint' : 'text-mk-text-sub'}>{p.text}</span>;

        if (p.t === 'name') {
          const r = p.ref;
          const hasJob = r.isPlayer && getJob(r.job) != null;
          const text = Anonymizer.display(refDisplay(r), r.isPlayer ? r.id : null);
          return (
            <span key={i} className="whitespace-nowrap">
              {hasJob && (
                <img
                  src={jobIconUrl(r.job)}
                  alt=""
                  title={jobDisplayName(r.job)}
                  width={19}
                  height={19}
                  draggable={false}
                  className="mb-[-4px] mr-[3px] inline-block select-none"
                />
              )}
              <span className={r.isMe ? 'font-semibold text-mk-accent' : 'font-semibold text-mk-text'}>{text}</span>
            </span>
          );
        }

        // marker — 아이콘 또렷하게 인라인, 이름은 카테고리색
        const c = categoryHex(p.marker.kind);
        return (
          <span
            key={i}
            className={`inline-flex items-center gap-1 rounded-md py-0.5 pl-1.5 pr-1 align-middle ${p.faded ? 'opacity-55' : ''}`}
            style={{ background: `color-mix(in srgb, ${c} 14%, transparent)` }}
          >
            <img src={markerIconUrl(p.marker.iconFile)} alt="" width={24} height={24} draggable={false} className="select-none" />
            <span className="text-[13px] font-semibold" style={{ color: c }}>
              {markerName(p.marker)}
            </span>
          </span>
        );
      })}
    </span>
  );
}
