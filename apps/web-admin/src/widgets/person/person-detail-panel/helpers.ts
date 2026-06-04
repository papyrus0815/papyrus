/** "YYYY년 M월 D일" 형식 (월·일 없으면 년만) */
export function formatDateKo(
  year: number | null | undefined,
  month?: number | null,
  day?: number | null,
  era?: string | null,
): string {
  if (year == null) return ''
  const prefix = era === 'BC' ? '기원전 ' : ''
  if (month != null && day != null)
    return `${prefix}${year}년 ${month}월 ${day}일`
  if (month != null) return `${prefix}${year}년 ${month}월`
  return `${prefix}${year}년`
}

/** ISO 날짜 문자열 → "YYYY년 M월 D일" */
export function formatIsoDateKo(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    return `${y}년 ${m}월 ${day}일`
  } catch {
    return ''
  }
}

/** 사망 유형 enum → 한국어 라벨 */
export const DEATH_TYPE_LABELS: Record<string, string> = {
  NATURAL: '자연사',
  ILLNESS: '병사',
  ASSASSINATION: '암살',
  EXECUTION: '처형',
  BATTLE: '전사',
  ACCIDENT: '사고사',
  SUICIDE: '자살',
  UNKNOWN: '불명',
  OTHER: '기타',
}

/** 취임(임명) 방식 enum → 한국어 라벨 (AppointmentMethod) */
export const APPOINTMENT_METHOD_LABELS: Record<string, string> = {
  DIRECT_ELECTION: '직접 선거',
  INDIRECT_ELECTION: '간접 선거',
  PARLIAMENTARY_ELECTION: '의회 선출',
  APPOINTMENT: '임명',
  HEREDITARY: '세습',
  COUP: '쿠데타 / 혁명',
  OTHER: '기타',
}

/** 재임 종료 사유 enum → 한국어 라벨 (TenureEndReason) */
export const TENURE_END_REASON_LABELS: Record<string, string> = {
  TERM_COMPLETED: '임기 만료',
  RESIGNATION: '사임 / 사퇴',
  ABDICATION: '자진 퇴위',
  SUCCESSION_TRANSFER: '양위 / 선위',
  REMOVAL: '폐위 / 해임',
  IMPEACHMENT: '탄핵',
  DEATH_IN_OFFICE: '재임 중 사망',
  OVERTHROWN: '쿠데타 / 혁명으로 축출',
  WAR_DEFEAT: '전쟁 패배',
  STATE_DISSOLVED: '국가 멸망',
  OTHER: '기타',
}

/**
 * 특정 시점에 몇 살이었는지 계산 (출생년월일 + 해당 날짜)
 * 출생 정보 없으면 null
 */
export function getAgeAtDate(
  birthYear: number | null | undefined,
  birthMonth?: number | null,
  birthDay?: number | null,
  dateIso?: string | null,
): number | null {
  if (birthYear == null || !dateIso) return null
  try {
    const d = new Date(dateIso)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    let age = y - birthYear
    if (age < 0) return null
    if (birthMonth != null && birthDay != null) {
      if (m < birthMonth || (m === birthMonth && day < birthDay)) age--
    }
    return age
  } catch {
    return null
  }
}

/**
 * 기간 문자열 포맷터. start/end 는 이미 포맷된 문자열(예: formatIsoDateKo 결과)를 받는다.
 * - start & end 모두 있으면 `${start} ~ ${end}`
 * - start 만 있으면 `${start} ~ ${ongoingLabel}` (기본 '현재')
 * - start 가 없으면 null
 */
export function formatPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
  ongoingLabel = '현재',
): string | null {
  if (start && end) return `${start} ~ ${end}`
  if (start) return `${start} ~ ${ongoingLabel}`
  return null
}
