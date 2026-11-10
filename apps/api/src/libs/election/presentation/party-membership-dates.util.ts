import { BadRequestException } from '@nestjs/common'

/** ISO 문자열 또는 null/빈 값 → Date | null | undefined (필드 미포함은 undefined) */
export function membershipInputToDate(
  value: string | null | undefined,
  wasInBody: boolean,
): Date | null | undefined {
  if (!wasInBody) return undefined
  if (value == null || value === '') return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('날짜 형식이 올바르지 않습니다.')
  }
  return d
}

export function assertMembershipStartBeforeEnd(
  start: Date | null | undefined,
  end: Date | null | undefined,
): void {
  if (start != null && end != null && end.getTime() < start.getTime()) {
    throw new BadRequestException('종료일은 시작일 이후여야 합니다.')
  }
}

export function assertMembershipWithinPersonLifespan(
  start: Date | null | undefined,
  end: Date | null | undefined,
  person: {
    birthDate?: Date | null
    birthEra?: string | null
    isBirthDateUnknown?: boolean | null
    deathDate?: Date | null
    deathEra?: string | null
    isDeathDateUnknown?: boolean | null
    isAlive?: boolean | null
  },
): void {
  const hasKnownBirth =
    !person.isBirthDateUnknown && person.birthDate instanceof Date && !Number.isNaN(person.birthDate.getTime())
  const birthSignedYear = hasKnownBirth
    ? (person.birthEra === 'BC' ? -1 : 1) * person.birthDate!.getUTCFullYear()
    : null

  const hasKnownDeath =
    !person.isAlive &&
    !person.isDeathDateUnknown &&
    person.deathDate instanceof Date &&
    !Number.isNaN(person.deathDate.getTime())
  const deathSignedYear = hasKnownDeath
    ? (person.deathEra === 'BC' ? -1 : 1) * person.deathDate!.getUTCFullYear()
    : null

  for (const d of [start, end]) {
    if (d == null) continue
    const y = d.getUTCFullYear()
    if (birthSignedYear != null && y < birthSignedYear) {
      throw new BadRequestException('당원 활동 기간은 인물의 출생 연도 이후여야 합니다.')
    }
    if (deathSignedYear != null && y > deathSignedYear) {
      throw new BadRequestException('당원 활동 기간은 인물의 사망 연도 이전이어야 합니다.')
    }
  }
}
