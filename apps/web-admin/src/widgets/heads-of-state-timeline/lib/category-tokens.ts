import { css } from 'styled-components'

import type { PositionTypeCategory } from './normalize-tenures'

/**
 * 카테고리별 시각 토큰 — 막대·범례·동시대 패널·legend 모두 이 한 파일에서 색을 받아 일관성 유지.
 *
 * `bar` (라이트/다크), `chip` (작은 카드용), `glyph` (텍스트 마커), `label` (한글명).
 * 변경하려면 여기서 한 번만 — 다른 곳은 import 해서 사용한다.
 */
export interface CategoryToken {
  label: string
  glyph: string
  /** 막대용 — flat fill */
  bar: {
    light: { background: string; border: string; color: string }
    dark: { background: string; border: string; color: string }
  }
  /** 작은 칩(범례·동시대 패널 메타)용 */
  chip: {
    light: { background: string; color: string }
    dark: { background: string; color: string }
  }
}

export const CATEGORY_TOKENS: Record<PositionTypeCategory, CategoryToken> = {
  MONARCH: {
    label: '군주·왕족',
    glyph: '♛',
    bar: {
      light: { background: '#fef3c7', border: '#f59e0b', color: '#78350f' },
      dark: {
        background: 'rgba(245, 158, 11, 0.22)',
        border: 'rgba(251, 191, 36, 0.65)',
        color: '#fde68a',
      },
    },
    chip: {
      light: { background: 'rgba(245, 158, 11, 0.18)', color: '#92400e' },
      dark: { background: 'rgba(245, 158, 11, 0.25)', color: '#fde68a' },
    },
  },
  PRESIDENT: {
    label: '대통령',
    glyph: '★',
    bar: {
      light: { background: '#dbeafe', border: '#3b82f6', color: '#1e3a8a' },
      dark: {
        background: 'rgba(59, 130, 246, 0.22)',
        border: 'rgba(96, 165, 250, 0.65)',
        color: '#bfdbfe',
      },
    },
    chip: {
      light: { background: 'rgba(59, 130, 246, 0.18)', color: '#1e40af' },
      dark: { background: 'rgba(59, 130, 246, 0.25)', color: '#bfdbfe' },
    },
  },
  PM: {
    label: '총리·수반',
    glyph: '▣',
    bar: {
      light: { background: '#e5e7eb', border: '#6b7280', color: '#1f2937' },
      dark: {
        background: 'rgba(148, 163, 184, 0.18)',
        border: 'rgba(148, 163, 184, 0.55)',
        color: '#e2e8f0',
      },
    },
    chip: {
      light: { background: 'rgba(156, 163, 175, 0.22)', color: '#374151' },
      dark: { background: 'rgba(148, 163, 184, 0.22)', color: '#e2e8f0' },
    },
  },
  POPE: {
    label: '교황',
    glyph: '✝',
    bar: {
      light: { background: '#ede9fe', border: '#7c3aed', color: '#4c1d95' },
      dark: {
        background: 'rgba(168, 85, 247, 0.22)',
        border: 'rgba(192, 132, 252, 0.7)',
        color: '#e9d5ff',
      },
    },
    chip: {
      light: { background: 'rgba(124, 58, 237, 0.18)', color: '#5b21b6' },
      dark: { background: 'rgba(168, 85, 247, 0.25)', color: '#e9d5ff' },
    },
  },
  OTHER: {
    label: '기타',
    glyph: '◆',
    bar: {
      light: { background: '#e0e7ff', border: '#6366f1', color: '#312e81' },
      dark: {
        background: 'rgba(99, 102, 241, 0.22)',
        border: 'rgba(129, 140, 248, 0.65)',
        color: '#c7d2fe',
      },
    },
    chip: {
      light: { background: 'rgba(99, 102, 241, 0.18)', color: '#3730a3' },
      dark: { background: 'rgba(99, 102, 241, 0.25)', color: '#c7d2fe' },
    },
  },
}

export function categoryBarStyle(c: PositionTypeCategory) {
  const t = CATEGORY_TOKENS[c]
  return {
    light: css`
      background: ${t.bar.light.background};
      border-color: ${t.bar.light.border};
      color: ${t.bar.light.color};
    `,
    dark: css`
      background: ${t.bar.dark.background};
      border-color: ${t.bar.dark.border};
      color: ${t.bar.dark.color};
    `,
  }
}

export function categoryGlyph(c: PositionTypeCategory): string {
  return CATEGORY_TOKENS[c].glyph
}

export function categoryLabel(c: PositionTypeCategory): string {
  return CATEGORY_TOKENS[c].label
}
