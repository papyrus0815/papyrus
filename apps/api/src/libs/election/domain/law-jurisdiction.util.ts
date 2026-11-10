import { BadRequestException } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'

/** `Law`의 `countryId` / `historicalCountryId` 스냅샷 */
export type LawJurisdiction = {
  countryId: string | null
  historicalCountryId: string | null
}

/**
 * 두 엔티티(선거·정당·법령·선거구 등)의 국가(현대·역사) 관할이 서로 호환되는지 검사합니다.
 * - 어느 한쪽이라도 국가가 지정되지 않은 경우(무소속/공통) 호환으로 봅니다.
 * - 양쪽 모두 `historicalCountryId`가 지정된 경우, 같은 현대국으로 dual-fill 되어 있더라도
 *   시대(역사적 국가)가 일치해야 호환으로 봅니다.
 * - 한쪽은 역사적 국가만, 다른 한쪽은 현대 국가만 지정된 경우 `historicalCountryModernCountry`
 *   브리지가 연결되어 있으면 호환으로 봅니다.
 */
export async function areJurisdictionsCompatible(
  prisma: PrismaService | null | undefined,
  a: LawJurisdiction,
  b: LawJurisdiction,
): Promise<boolean> {
  const aUnscoped = a.countryId == null && a.historicalCountryId == null
  const bUnscoped = b.countryId == null && b.historicalCountryId == null
  if (aUnscoped || bUnscoped) return true

  if (a.historicalCountryId != null && b.historicalCountryId != null) {
    return a.historicalCountryId === b.historicalCountryId
  }

  if (a.countryId != null && b.countryId != null && a.countryId === b.countryId) {
    return true
  }

  if (prisma?.historicalCountryModernCountry?.findFirst) {
    if (a.historicalCountryId != null && b.countryId != null) {
      const link = await prisma.historicalCountryModernCountry.findFirst({
        where: {
          historicalCountryId: a.historicalCountryId,
          modernCountryId: b.countryId,
        },
        select: { historicalCountryId: true },
      })
      return Boolean(link)
    }
    if (b.historicalCountryId != null && a.countryId != null) {
      const link = await prisma.historicalCountryModernCountry.findFirst({
        where: {
          historicalCountryId: b.historicalCountryId,
          modernCountryId: a.countryId,
        },
        select: { historicalCountryId: true },
      })
      return Boolean(link)
    }
  }

  return false
}

/**
 * 선거·투표 또는 정당과 법령을 연결할 때, 법령의 관할이 대상과 맞는지 검사합니다.
 *
 * - 법에 현대·역사 국가가 모두 비어 있으면(국제 공법·일반 원칙 등) 연결을 허용합니다.
 * - 양쪽 모두 **역사 국가**가 있으면 `historicalCountryId`가 같아야 합니다.
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

export async function assertLawMatchesPoliticalPartyJurisdictionAsync(
  prisma: PrismaService | null | undefined,
  law: LawJurisdiction,
  party: LawJurisdiction,
): Promise<void> {
  if (lawJurisdictionMatchesSubject(law, party)) return
  const subjectScoped =
    party.countryId != null || party.historicalCountryId != null
  if (
    subjectScoped &&
    (await areJurisdictionsCompatible(prisma, law, party))
  ) {
    return
  }
  throw new BadRequestException(
    '법령의 국가(현대·역사)가 이 정당의 소속 국가와 일치하지 않습니다.',
  )
}

export function lawJurisdictionMatchesSubject(
  law: LawJurisdiction,
  subject: LawJurisdiction,
): boolean {
  const lawUnscoped =
    law.countryId == null && law.historicalCountryId == null
  if (lawUnscoped) return true

  // 양쪽 모두 역사적 국가가 있으면 동일한 역사적 국가여야 한다 (동일 현대국 dual-fill된 타 시대 오매칭 방지)
  if (law.historicalCountryId != null && subject.historicalCountryId != null) {
    return law.historicalCountryId === subject.historicalCountryId
  }

  if (subject.countryId != null && law.countryId != null) {
    return law.countryId === subject.countryId
  }
  if (subject.historicalCountryId != null && law.historicalCountryId != null) {
    return law.historicalCountryId === subject.historicalCountryId
  }
  return false
}
