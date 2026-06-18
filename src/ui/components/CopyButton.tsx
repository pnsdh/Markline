import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * 클릭하면 텍스트를 클립보드에 복사하고 잠깐 체크 표시. 호버/탭 기반(웹 네이티브).
 * onCopy 는 클릭 시점에 복사할 텍스트를 만든다(렌더마다 toCopyLine 계산 방지).
 */
// 부모(.group)에 호버 시에만 나타나고, 터치 기기(hover 없음)에선 항상 은은하게 보인다.
const REVEAL = 'opacity-70 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 group-focus-within:opacity-100';

export function CopyButton({
  onCopy,
  title,
  size = 14,
  reveal = false,
  className = '',
}: {
  onCopy: () => string;
  title?: string;
  size?: number;
  reveal?: boolean; // 부모 .group 호버 시에만 노출
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(onCopy());
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {
      /* 무시 */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={title}
      aria-label={title}
      className={`grid place-items-center rounded-md border border-mk-border bg-mk-card/90 text-mk-text-sub shadow-sm backdrop-blur transition-colors hover:bg-mk-card-hover hover:text-mk-text ${reveal ? REVEAL : ''} ${className}`}
    >
      {done ? <Check size={size} className="text-green-500" /> : <Copy size={size} />}
    </button>
  );
}
