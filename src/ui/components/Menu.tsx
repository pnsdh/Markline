import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';

export interface MenuItem {
  value: string;
  label: string;
}

export function Menu({
  trigger,
  items,
  value,
  onSelect,
  title,
  align = 'right',
}: {
  trigger: React.ReactNode;
  items: MenuItem[];
  value: string;
  onSelect: (v: string) => void;
  title?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={title}
        className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-mk-text-sub transition-colors hover:bg-mk-card-hover hover:text-mk-text"
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className={[
              'absolute z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-mk-border bg-mk-card p-1 shadow-xl shadow-black/20',
              align === 'right' ? 'right-0' : 'left-0',
            ].join(' ')}
          >
            {items.map((it) => (
              <button
                key={it.value}
                onClick={() => {
                  onSelect(it.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-mk-text transition-colors hover:bg-mk-card-hover"
              >
                <span className="flex w-4 shrink-0 justify-center">
                  {value === it.value && <Check size={14} className="text-mk-accent" />}
                </span>
                {it.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
