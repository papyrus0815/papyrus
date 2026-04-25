/**
 * 관직(positionType) 타입별 컬러 매핑.
 * 인물 리스트 카드·국가 상세 사이드바·배지 등에서 공통 사용.
 *
 * getPositionColor() → 강조(accent) 색 (아이콘·테두리·progress fill)
 * getPositionBg()    → 배경 색 (배지 배경) — 다크모드 분기 포함
 */

export type PositionType =
  | 'HEAD_OF_STATE'
  | 'HEAD_OF_GOVERNMENT'
  | 'CABINET_MINISTER'
  | 'LEGISLATOR'
  | 'MILITARY_COMMANDER'
  | 'JUDICIARY'
  | (string & {}) // 확장용

/** accent color — 테마 독립(전경·아이콘 용도) */
export function getPositionColor(
  positionType: string | null | undefined,
): string {
  switch (positionType) {
    case 'HEAD_OF_STATE':
      return '#d97706' // amber — 군주/대통령
    case 'HEAD_OF_GOVERNMENT':
      return '#4f46e5' // indigo — 총리/수상
    case 'CABINET_MINISTER':
      return '#0891b2' // cyan — 각료
    case 'LEGISLATOR':
      return '#059669' // emerald — 의원
    case 'MILITARY_COMMANDER':
      return '#dc2626' // red — 군 지휘관
    case 'JUDICIARY':
      return '#7c3aed' // violet — 사법
    default:
      return '#64748b' // slate — 기타
  }
}

/** 배지 배경 — 다크모드에서는 accent alpha 오버레이로 가독성 확보 */
export function getPositionBg(
  positionType: string | null | undefined,
  dark = false,
): string {
  const pair: Record<string, [light: string, dark: string]> = {
    HEAD_OF_STATE: ['#fef3c7', 'rgba(217,119,6,0.18)'],
    HEAD_OF_GOVERNMENT: ['#eef2ff', 'rgba(79,70,229,0.18)'],
    CABINET_MINISTER: ['#ecfeff', 'rgba(8,145,178,0.18)'],
    LEGISLATOR: ['#d1fae5', 'rgba(5,150,105,0.18)'],
    MILITARY_COMMANDER: ['#fee2e2', 'rgba(220,38,38,0.18)'],
    JUDICIARY: ['#ede9fe', 'rgba(124,58,237,0.18)'],
  }
  const fallback: [string, string] = ['#f1f5f9', 'rgba(100,116,139,0.15)']
  const [light, darkBg] = pair[positionType ?? ''] ?? fallback
  return dark ? darkBg : light
}
