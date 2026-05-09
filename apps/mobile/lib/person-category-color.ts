import { Tokens, type TokenSet } from '@/constants/theme'
import type { PersonDetail } from './dto'

export type PersonCategory = 'monarch' | 'official' | 'religious' | 'scholar' | 'other'

/**
 * 인물의 1차 분류를 추정.
 * - 군주(monarch): sovereignReigns 보유
 * - 관료(official): governmentPositions 보유
 * - 그 외: other (학자/종교는 아직 데이터 시그널 부족)
 */
export function categorizePerson(detail?: PersonDetail | null): PersonCategory {
  if (!detail) return 'other'
  if ((detail.sovereignReigns?.length ?? 0) > 0) return 'monarch'
  if ((detail.governmentPositions?.length ?? 0) > 0) return 'official'
  return 'other'
}

/** 분류별 액센트 색 — hero border-left, hero bottom indicator 등에 사용 */
export function personCategoryColor(category: PersonCategory, tokens: TokenSet = Tokens): string {
  switch (category) {
    case 'monarch':
      return tokens.accent.amber
    case 'official':
      return tokens.accent.blue
    case 'religious':
      return tokens.accent.purple
    case 'scholar':
      return tokens.accent.green
    default:
      return tokens.text.muted
  }
}

export function personCategoryLabel(category: PersonCategory): string {
  switch (category) {
    case 'monarch':
      return '군주'
    case 'official':
      return '관료'
    case 'religious':
      return '종교'
    case 'scholar':
      return '학자'
    default:
      return ''
  }
}
