/**
 * 이름 첫 글자(가나다/ABC) 그룹 — 자연스러운 축(대륙·시대·유형)이 없는 도메인에서 쓴다.
 *
 * 한글 초성 14개 + 영문 + 기타. 초성 추출은 유니코드 완성형 범위 계산이라 사전이 필요 없다.
 */
import type { EntitySidebarGroup } from '@/widgets/entity-list-sidebar'

const CHOSUNG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
  'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const

/** 된소리는 예사소리 그룹으로 합친다 — 'ㄲ' 그룹에 한 항목만 떨어지는 것을 막는다. */
const MERGE: Record<string, string> = {
  'ㄲ': 'ㄱ',
  'ㄸ': 'ㄷ',
  'ㅃ': 'ㅂ',
  'ㅆ': 'ㅅ',
  'ㅉ': 'ㅈ',
}

const BASE_CHOSUNG = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

const PALETTE = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
]

/** 이름 → 그룹 id (초성 한 글자, 영문은 'A-Z', 그 외 '기타') */
export function initialGroupOf(name: string): string {
  const first = name.trim().charAt(0)
  if (!first) return '기타'
  const code = first.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const chosung = CHOSUNG[Math.floor((code - 0xac00) / 588)]
    return MERGE[chosung] ?? chosung
  }
  if (/[A-Za-z]/.test(first)) return 'A-Z'
  return '기타'
}

export const INITIAL_GROUPS: EntitySidebarGroup[] = [
  ...BASE_CHOSUNG.map((chosung, index) => ({
    id: chosung,
    name: chosung,
    accent: PALETTE[index % PALETTE.length],
  })),
  { id: 'A-Z', name: 'A–Z', accent: '#64748b' },
  { id: '기타', name: '기타', accent: '#a1a1aa' },
]
