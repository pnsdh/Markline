import { FolderClock, FileUp, Globe, Menu as MenuIcon, Monitor, Moon, Sun, Zap } from 'lucide-react';
import { Loc } from '../../core/loc';
import { useStore, supportsFsAccess } from '../store';
import { useOpenLog } from '../useOpenLog';
import { Menu } from '../components/Menu';

export function TopBarV2() {
  const { openLog, openLatest, inputRef, onInputChange } = useOpenLog();
  const langSetting = useStore((s) => s.langSetting);
  const theme = useStore((s) => s.theme);
  const autoOpenLatest = useStore((s) => s.autoOpenLatest);
  const setAutoOpenLatest = useStore((s) => s.setAutoOpenLatest);
  const setLangSetting = useStore((s) => s.setLangSetting);
  const setTheme = useStore((s) => s.setTheme);
  const setMobileNav = useStore((s) => s.setMobileNav);
  const status = useStore((s) => s.status);
  useStore((s) => s.renderVersion);

  return (
    <header className="sticky top-0 z-20 border-b border-mk-border/70 bg-mk-header/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1100px] items-center gap-2 px-3 py-2.5">
      {status !== 'idle' && (
        <button
          onClick={() => setMobileNav(true)}
          title={Loc.t('combat_sections')}
          className="shrink-0 rounded-xl p-2 text-mk-text-sub transition-colors hover:bg-mk-card-hover hover:text-mk-text md:hidden"
        >
          <MenuIcon size={18} />
        </button>
      )}

      <div className="flex shrink-0 items-center gap-2.5 pl-1 pr-1">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-mk-accent to-mk-accent-btn text-white shadow-md shadow-mk-accent/30">
          <span className="text-[16px] font-black leading-none">M</span>
        </div>
        <div className="hidden leading-none sm:block">
          <div className="text-[15px] font-bold tracking-tight text-mk-text">Markline</div>
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-mk-text-faint">sign timeline</div>
        </div>
      </div>

      <button
        onClick={openLog}
        className="ml-1 flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-br from-mk-accent to-mk-accent-btn px-3.5 py-2 text-[13px] font-semibold text-white shadow-md shadow-mk-accent/25 transition-all hover:brightness-110 active:scale-[0.97]"
      >
        <FileUp size={16} />
        <span className="hidden sm:inline">{Loc.t('open_log')}</span>
      </button>
      {supportsFsAccess && (
        <button
          onClick={openLatest}
          title={Loc.t('tip_pick_folder')}
          className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-mk-border bg-mk-card px-3 py-2 text-[13px] font-medium text-mk-text-sub transition-colors hover:bg-mk-card-hover hover:text-mk-text sm:flex"
        >
          <FolderClock size={16} />
          <span className="hidden lg:inline">{Loc.t('latest_log')}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept=".log,text/plain" className="hidden" onChange={onInputChange} />

      <div className="ml-auto flex items-center gap-0.5 rounded-2xl border border-mk-border/60 bg-mk-card/50 p-0.5">
        <Menu
          title={Loc.t('tip_lang')}
          value={langSetting}
          onSelect={(v) => setLangSetting(v as never)}
          trigger={
            <>
              <Globe size={16} />
              <span className="whitespace-nowrap text-[12px] font-semibold">
                {langSetting === 'ko' ? (
                  '한'
                ) : langSetting === 'en' ? (
                  'EN'
                ) : langSetting === 'ja' ? (
                  '日'
                ) : (
                  <>
                    <span className="hidden sm:inline">Language: </span>AUTO
                  </>
                )}
              </span>
            </>
          }
          items={[
            { value: 'Auto', label: Loc.t('lang_auto') },
            { value: 'ko', label: '한국어' },
            { value: 'en', label: 'English' },
            { value: 'ja', label: '日本語' },
          ]}
        />
        {supportsFsAccess && (
          <button
            onClick={() => setAutoOpenLatest(!autoOpenLatest)}
            title={Loc.t(autoOpenLatest ? 'tip_autoopen_on' : 'tip_autoopen_off')}
            className={[
              'rounded-xl p-2 transition-colors',
              autoOpenLatest ? 'text-amber-400' : 'text-mk-text-sub hover:bg-mk-card-hover hover:text-mk-text',
            ].join(' ')}
          >
            <Zap size={17} fill={autoOpenLatest ? 'currentColor' : 'none'} />
          </button>
        )}
        <Menu
          title={Loc.t('tip_theme')}
          value={theme}
          onSelect={(v) => setTheme(v as never)}
          trigger={theme === 'Light' ? <Sun size={17} /> : theme === 'Dark' ? <Moon size={17} /> : <Monitor size={17} />}
          items={[
            { value: 'System', label: Loc.t('theme_system') },
            { value: 'Light', label: Loc.t('theme_light') },
            { value: 'Dark', label: Loc.t('theme_dark') },
          ]}
        />
      </div>
      </div>
    </header>
  );
}
