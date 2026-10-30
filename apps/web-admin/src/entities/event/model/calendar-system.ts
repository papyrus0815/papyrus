/**
 * 역법 — 사료가 날짜를 적은 달력. 사건의 구조화 날짜(startDate…)는 늘 **그레고리력 환산값**이고,
 * 원 사료가 다른 역법이면 그 역법과 원문 표기를 함께 둔다(임진왜란 음력 4월 13일 = 양력 5월 23일).
 */
export type CalendarSystem =
  | 'GREGORIAN'
  | 'JULIAN'
  | 'KOREAN_LUNAR'
  | 'CHINESE_LUNAR'
  | 'JAPANESE_LUNAR'
  | 'ISLAMIC'
  | 'OTHER'

export const CALENDAR_LABEL: Record<CalendarSystem, string> = {
  GREGORIAN: '그레고리력',
  JULIAN: '율리우스력',
  KOREAN_LUNAR: '음력(한국)',
  CHINESE_LUNAR: '음력(중국)',
  JAPANESE_LUNAR: '음력(일본)',
  ISLAMIC: '이슬람력',
  OTHER: '기타 역법',
}

/** 짧은 꼬리표 — 날짜 뒤 괄호에 붙는다: '4월 13일(음)' */
export const CALENDAR_SHORT: Record<CalendarSystem, string> = {
  GREGORIAN: '양',
  JULIAN: '율',
  KOREAN_LUNAR: '음',
  CHINESE_LUNAR: '음',
  JAPANESE_LUNAR: '음',
  ISLAMIC: '히즈라',
  OTHER: '원력',
}

export const CALENDAR_OPTIONS = (Object.keys(CALENDAR_LABEL) as CalendarSystem[]).map((value) => ({
  value,
  label: CALENDAR_LABEL[value],
}))
