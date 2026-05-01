const SVG_PROPS = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export const IconChart = () => (
  <svg {...SVG_PROPS}>
    <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" />
  </svg>
)

export const IconGlobe = () => (
  <svg {...SVG_PROPS}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

export const IconCity = () => (
  <svg {...SVG_PROPS}>
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
)

export const IconUsers = () => (
  <svg {...SVG_PROPS}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

export const IconArea = () => (
  <svg {...SVG_PROPS}>
    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
  </svg>
)

export const IconPin = () => (
  <svg {...SVG_PROPS}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

export const IconClock = () => (
  <svg {...SVG_PROPS}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)

export const IconCheck = () => (
  <svg {...SVG_PROPS}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

export const IconCalendar = () => (
  <svg {...SVG_PROPS}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

export const IconBriefcase = () => (
  <svg {...SVG_PROPS}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
)

export const IconLandmark = () => (
  <svg {...SVG_PROPS}>
    <line x1="3" y1="22" x2="21" y2="22" />
    <line x1="6" y1="18" x2="6" y2="11" />
    <line x1="10" y1="18" x2="10" y2="11" />
    <line x1="14" y1="18" x2="14" y2="11" />
    <line x1="18" y1="18" x2="18" y2="11" />
    <polygon points="12 2 20 7 4 7" />
  </svg>
)

export const IconUserCheck = () => (
  <svg {...SVG_PROPS}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <polyline points="17 11 19 13 23 9" />
  </svg>
)

export const IconMilitary = () => (
  <svg {...SVG_PROPS}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

export const IconPlus = () => (
  <svg {...SVG_PROPS}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

export const IconVote = () => (
  <svg {...SVG_PROPS}>
    <path d="M9 12l2 2 4-4" />
    <path d="M5 7h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
    <path d="M3 7l9-5 9 5" />
  </svg>
)

export const IconScroll = () => (
  <svg {...SVG_PROPS}>
    <path d="M19 17V5a2 2 0 0 0-2-2H4" />
    <path d="M2 5a2 2 0 0 1 2-2 2 2 0 0 1 2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2H8" />
  </svg>
)

export const IconHistory = () => (
  <svg {...SVG_PROPS}>
    <path d="M3 12a9 9 0 1 0 3-6.708" />
    <polyline points="3 4 3 10 9 10" />
    <path d="M12 7v5l3 2" />
  </svg>
)

export const IconRefresh = () => (
  <svg {...SVG_PROPS}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
    <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
  </svg>
)
