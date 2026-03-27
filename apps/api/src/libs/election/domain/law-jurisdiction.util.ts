import { BadRequestException } from '@nestjs/common'

/** `Law`의 `countryId` / `historicalCountryId` 스냅샷 */
export type LawJurisdiction = {
  countryId: string | null
  historicalCountryId: string | null
}

/**
 * 선거·투표 또는 정당과 법령을 연결할 때, 법령의 관할이 대상과 맞는지 검사합니다.
 *
 * - 법에 현대·역사 국가가 모두 비어 있으면(국제 공법·일반 원칙 등) 연결을 허용합니다.
 * - 대상이 **현대 국가** 선거/정당이면 `law.countryId`가 같아야 합니다.
 * - 대상이 **역사 국가**이면 `law.historicalCountryId`가 같아야 합니다.
 * - 대상에 국가가 없으면, 법에 관할이 있으면 거부합니다.
 */
export function assertLawMatchesElectionJurisdiction(
  law: LawJurisdiction,
  election: LawJurisdiction,
): void {
  if (!lawJurisdictionMatchesSubject(law, election)) {
    throw new BadRequestException(
      '법령의 국가(현대·역사)가 이 선거의 소속 국가와 일치하지 않습니다.',
    )
  }
}

export function assertLawMatchesPoliticalPartyJurisdiction(
  law: LawJurisdiction,
  party: LawJurisdiction,
): void {
  if (!lawJurisdictionMatchesSubject(law, party)) {
    throw new BadRequestException(
      '법령의 국가(현대·역사)가 이 정당의 소속 국가와 일치하지 않습니다.',
    )
  }
}

function lawJurisdictionMatchesSubject(
  law: LawJurisdiction,
  subject: LawJurisdiction,
): boolean {
  const lawUnscoped =
    law.countryId == null && law.historicalCountryId == null
  if (lawUnscoped) return true

  if (subject.countryId != null) {
    return law.countryId === subject.countryId
  }
  if (subject.historicalCountryId != null) {
    return law.historicalCountryId === subject.historicalCountryId
  }
  return false
}
