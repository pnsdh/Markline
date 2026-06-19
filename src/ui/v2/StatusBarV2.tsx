import { Folder } from 'lucide-react';
import { Anonymizer } from '../../core/anonymizer';
import { Loc } from '../../core/loc';
import { fmtHms } from '../../core/time';
import { useStore } from '../store';

export function StatusBarV2() {
  const status = useStore((s) => s.status);
  const live = useStore((s) => s.live);
  const fresh = useStore((s) => s.fresh);
  const fileName = useStore((s) => s.fileName);
  const folderName = useStore((s) => s.folderName);
  const lastLineTime = useStore((s) => s.lastLineTime);
  const myName = useStore((s) => s.myName);
  const myId = useStore((s) => s.myId);
  const error = useStore((s) => s.error);
  useStore((s) => s.renderVersion);

  let dot = '#9aa0aa';
  let text = Loc.t('status_idle');
  if (status === 'error') {
    dot = '#D6464D';
    text = Loc.t('status_error', error ?? '');
  } else if (status === 'ready') {
    if (live) {
      dot = fresh ? '#2E9E5B' : '#D9A40A';
      text = Loc.t(fresh ? 'status_live' : 'status_live_idle');
    } else {
      dot = '#2E9E5B';
      text = Loc.t('status_idle');
    }
  } else if (status === 'loading') {
    dot = '#D9A40A';
    text = Loc.t('loading');
  }

  const lastText = lastLineTime != null ? Loc.t('status_lastrec', fmtHms(lastLineTime)) : Loc.t('status_norec');

  return (
    <footer className="border-t border-mk-border/70 bg-mk-header/40 text-[12px] text-mk-text-sub">
      <div className="mx-auto flex max-w-[1100px] items-center gap-2 px-5 py-2">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {status === 'ready' && live && fresh && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: dot }} />
          )}
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: dot }} />
        </span>
        <span className="shrink-0 font-medium text-mk-text">{text}</span>
        {/* 실시간 추적(폴더) 모드 표시 — 폴더가 있으면 새 로그 자동 전환(롤오버) 대상임을 알린다. */}
        {folderName && (
          <span
            title={Loc.t('tip_live_track')}
            className="hidden shrink-0 items-center gap-1 whitespace-nowrap text-mk-accent sm:inline-flex"
          >
            <Folder size={12} />
            {folderName}
          </span>
        )}
        {fileName && <span className="truncate text-mk-text-faint">· {fileName}</span>}
        {myName && (
          <span className="shrink-0 whitespace-nowrap text-mk-text-faint">
            · {Loc.t('mychar_label')}: <span className="text-mk-text-sub">{Anonymizer.display(myName, myId)}</span>
          </span>
        )}
        {status === 'ready' && <span className="ml-auto shrink-0 truncate text-mk-text-faint">{lastText}</span>}
      </div>
    </footer>
  );
}
