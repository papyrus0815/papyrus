/**
 * 에러 핸들러 전용 인라인 아이콘 세트.
 *
 * 기존 이모지(💔💡🔄🌐🧹⚠️🔧)를 글래스 톤과 어울리는 stroke SVG로 통일.
 * 모두 `currentColor`를 사용하며 부모 박스 크기에 맞춰 100%로 채운다.
 */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  width: '100%',
  height: '100%',
}

/** 끊어진 연결 — 일러스트의 💔 대체 */
export function BrokenLinkIcon() {
  return (
    <svg {...base} aria-hidden>
      <path d="M9 17H7a5 5 0 0 1 0-10h2" />
      <path d="M15 7h2a5 5 0 0 1 4 8" />
      <line x1="8" y1="12" x2="11" y2="12" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  )
}

/** 전구 — "해결 방안" */
export function BulbIcon() {
  return (
    <svg {...base} aria-hidden>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
    </svg>
  )
}

/** 새로고침 — "다시 시도해보시게" */
export function RefreshIcon() {
  return (
    <svg {...base} aria-hidden>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

/** 네트워크 — "네트워크 연결을 확인하시게" */
export function WifiIcon() {
  return (
    <svg {...base} aria-hidden>
      <path d="M5 12.55a11 11 0 0 1 14 0" />
      <path d="M8.5 16.05a6 6 0 0 1 7 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
      <path d="M2 8.82a15 15 0 0 1 20 0" />
    </svg>
  )
}

/** 비우기 — "브라우저 기록을 지워보시게" */
export function SparkleIcon() {
  return (
    <svg {...base} aria-hidden>
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="m5.6 5.6 2.1 2.1" />
      <path d="m16.3 16.3 2.1 2.1" />
      <path d="m18.4 5.6-2.1 2.1" />
      <path d="m7.7 16.3-2.1 2.1" />
    </svg>
  )
}

/** 경고 삼각형 — 에러 뱃지 */
export function AlertTriangleIcon() {
  return (
    <svg {...base} aria-hidden>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

/** 터미널 — "기술자를 위한 정보" */
export function TerminalIcon() {
  return (
    <svg {...base} aria-hidden>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  )
}
