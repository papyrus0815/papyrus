import { BadRequestException } from '@nestjs/common'

/**
 * 당원 활동 기간이 인물 생몰 안에 드는지 — 연 단위.
 * 시작·끝은 구조화 칸의 DATETIME 거울(AD 1000~9999)이라 그 밖(기원전 등)은 검사하지 않는다.
 * (ISO 파싱·순서 검사는 party-structured-date.util이 맡는다)
 */
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
