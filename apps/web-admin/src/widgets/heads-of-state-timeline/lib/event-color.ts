/**
 * 사건 카테고리별 색 분기. 카테고리 이름이 한글 키워드 매칭이라 정확도는 perfect는 아니지만,
 * 색은 보조 정보(타임라인 위 컨텍스트)이므로 fuzzy 매칭으로 충분.
 *
 * 카테고리 미상이면 기본 회색.
 */
export interface EventColorTone {
  background: string
  border: string
  color: string
}

const PALETTE: { test: RegExp; tone: { light: EventColorTone; dark: EventColorTone } }[] = [
  {
    test: /전쟁|침공|침입|혁명|반란/,
    tone: {
      light: {
        background: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(220, 38, 38, 0.55)',
        color: '#7f1d1d',
      },
      dark: {
        background: 'rgba(239, 68, 68, 0.18)',
        border: 'rgba(248, 113, 113, 0.55)',
        color: '#fecaca',
      },
    },
  },
  {
    test: /외교|조약|회담|동맹|협정/,
    tone: {
      light: {
        background: 'rgba(59, 130, 246, 0.12)',
        border: 'rgba(37, 99, 235, 0.55)',
        color: '#1e3a8a',
      },
      dark: {
        background: 'rgba(59, 130, 246, 0.18)',
        border: 'rgba(96, 165, 250, 0.55)',
        color: '#bfdbfe',
      },
    },
  },
  {
    test: /선거|투표|취임|즉위|대관/,
    tone: {
      light: {
        background: 'rgba(34, 197, 94, 0.12)',
        border: 'rgba(22, 163, 74, 0.55)',
        color: '#14532d',
      },
      dark: {
        background: 'rgba(34, 197, 94, 0.18)',
        border: 'rgba(74, 222, 128, 0.55)',
        color: '#bbf7d0',
      },
    },
  },
  {
    test: /경제|금융|공황|화폐|무역/,
    tone: {
      light: {
        background: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(217, 119, 6, 0.55)',
        color: '#78350f',
      },
      dark: {
        background: 'rgba(245, 158, 11, 0.18)',
        border: 'rgba(251, 191, 36, 0.55)',
        color: '#fde68a',
      },
    },
  },
  {
    test: /문화|예술|발견|발명|연구|종교/,
    tone: {
      light: {
        background: 'rgba(168, 85, 247, 0.12)',
        border: 'rgba(147, 51, 234, 0.55)',
        color: '#581c87',
      },
      dark: {
        background: 'rgba(168, 85, 247, 0.18)',
        border: 'rgba(192, 132, 252, 0.55)',
        color: '#e9d5ff',
      },
    },
  },
]

const FALLBACK = {
  light: {
    background: 'rgba(107, 114, 128, 0.14)',
    border: 'rgba(75, 85, 99, 0.5)',
    color: '#1f2937',
  },
  dark: {
    background: 'rgba(148, 163, 184, 0.16)',
    border: 'rgba(148, 163, 184, 0.5)',
    color: '#e2e8f0',
  },
}

export function eventToneFor(
  categoryName: string | null,
  isDark: boolean,
): EventColorTone {
  if (categoryName) {
    for (const p of PALETTE) {
      if (p.test.test(categoryName)) return isDark ? p.tone.dark : p.tone.light
    }
  }
  return isDark ? FALLBACK.dark : FALLBACK.light
}
