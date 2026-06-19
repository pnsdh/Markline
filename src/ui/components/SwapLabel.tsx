/**
 * 마우스 오버 시 라벨이 부가설명으로 부드럽게 전환되는 버튼 텍스트.
 * 두 텍스트를 같은 격자 칸에 겹쳐 두고 hover 때 페이드+살짝 위로 슬라이드한다.
 * 사용하는 버튼에 `group` 클래스가 있어야 동작한다. className 으로 표시/반응형 제어(예: 'hidden sm:grid').
 */
export function SwapLabel({ label, hover, className = 'grid' }: { label: string; hover: string; className?: string }) {
  return (
    <span className={`text-center ${className}`}>
      <span className="col-start-1 row-start-1 transition-all duration-200 group-hover:-translate-y-1 group-hover:opacity-0 motion-reduce:transition-none">
        {label}
      </span>
      <span
        aria-hidden
        className="col-start-1 row-start-1 translate-y-1 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:transition-none"
      >
        {hover}
      </span>
    </span>
  );
}
