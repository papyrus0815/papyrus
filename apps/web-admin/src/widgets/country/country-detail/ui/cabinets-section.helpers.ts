import { getPersonDisplayName } from '@/shared/lib/person-display-name'

export function getPersonName(person: {
  name?: string | null
  surname?: string | null
  middleName?: string | null
  nameDisplayOrder?: string | null
} | null): string {
  if (!person) return '—'
  return getPersonDisplayName(
    {
      name: person.name ?? '',
      surname: person.surname ?? null,
      middleName: person.middleName ?? null,
      nameDisplayOrder:
        (person.nameDisplayOrder as 'korean' | 'western') ?? 'korean',
    },
    true,
  )
}

/** 퇴임일 기준 나이 계산 (birthDate/birthYear 기반) */
export function calcAgeAtEndTenure(
  person: {
    birthDate?: string | null
    birthYear?: number | null
  } | null,
  tenureEndDate: string | null | undefined,
): number | null {
  if (!person || !tenureEndDate) return null
  const endYear = new Date(tenureEndDate).getFullYear()
  const endMonth = new Date(tenureEndDate).getMonth() + 1
  const endDay = new Date(tenureEndDate).getDate()

  if (person.birthDate) {
    const birth = new Date(person.birthDate)
    let age = endYear - birth.getFullYear()
    if (
      endMonth < birth.getMonth() + 1 ||
      (endMonth === birth.getMonth() + 1 && endDay < birth.getDate())
    )
      age -= 1
    return age >= 0 ? age : null
  }
  if (person.birthYear != null) {
    const age = endYear - person.birthYear
    return age >= 0 ? age : null
  }
  return null
}

export function formatDate(
  value: string | Date | null | undefined,
): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const APPOINTMENT_METHOD_LABEL: Record<string, string> = {
  DIRECT_ELECTION: '직접 선거',
  INDIRECT_ELECTION: '간접 선거',
  PARLIAMENTARY_ELECTION: '의회 선출',
  APPOINTMENT: '임명',
  HEREDITARY: '세습',
  COUP: '쿠데타 / 혁명',
  OTHER: '기타',
}

export const END_REASON_LABEL: Record<string, string> = {
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

/** 두 날짜 사이 재임기간을 "N년 M개월 D일" 형태로 반환 */
export function calcTenureDuration(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string | null {
  if (!startDate) return null
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()

  let years = end.getFullYear() - start.getFullYear()
  let months = end.getMonth() - start.getMonth()
  let days = end.getDate() - start.getDate()

  if (days < 0) {
    months -= 1
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0)
    days += prevMonth.getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  const parts: string[] = []
  if (years > 0) parts.push(`${years}년`)
  if (months > 0) parts.push(`${months}개월`)
  if (days > 0 || parts.length === 0) parts.push(`${days}일`)
  return parts.join(' ')
}
