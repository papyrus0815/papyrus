import type { Election, Prisma } from '@prisma/client'

type PrismaElectionClient = {
  election: {
    findFirst(args: {
      where: Prisma.ElectionWhereInput
      orderBy?: Prisma.ElectionOrderByWithRelationInput
    }): Promise<Election | null>
  }
}

/**
 * 동일 국가(현대/역사)·동일 선거 유형·동일 행정 범위에서,
 * 직전 회차(회차 번호 - 1) 또는 직전 투표일(회차 미입력 시) 선거 1건을 찾는다.
 */
export async function findPreviousComparableElection(
  prisma: PrismaElectionClient,
  current: Pick<
    Election,
    | 'id'
    | 'countryId'
    | 'historicalCountryId'
    | 'electionType'
    | 'scopeAdministrativeDivisionId'
    | 'convocationOrdinal'
    | 'pollDate'
  > & {
    accountId?: string | null
    status?: string | null
  },
): Promise<Election | null> {
  if (current.status === 'CANCELLED') {
    return null
  }

  const scopeWhere: Prisma.ElectionWhereInput = {
    electionType: current.electionType,
    NOT: { id: current.id },
    status: { not: 'CANCELLED' },
  }

  if (current.accountId !== undefined) {
    scopeWhere.accountId = current.accountId
  }

  // 역사적 국가가 지정된 경우(단일 현대국과 매핑되어 countryId가 dual-fill된 경우 포함)
  // 해당 역사적 국가 범위에서 직전 선거를 찾는다.
  if (current.historicalCountryId) {
    scopeWhere.historicalCountryId = current.historicalCountryId
  } else if (current.countryId) {
    scopeWhere.countryId = current.countryId
    scopeWhere.historicalCountryId = null
  } else {
    return null
  }

  if (current.scopeAdministrativeDivisionId) {
    scopeWhere.scopeAdministrativeDivisionId =
      current.scopeAdministrativeDivisionId
  } else {
    scopeWhere.scopeAdministrativeDivisionId = null
  }

  if (current.convocationOrdinal != null) {
    if (current.convocationOrdinal === 1) {
      return null
    }
    if (current.convocationOrdinal >= 2) {
      const byOrdinal = await prisma.election.findFirst({
        where: {
          ...scopeWhere,
          convocationOrdinal: current.convocationOrdinal - 1,
        },
      })
      if (byOrdinal) return byOrdinal
    }
  }

  return prisma.election.findFirst({
    where: {
      ...scopeWhere,
      pollDate: { lt: current.pollDate },
    },
    orderBy: { pollDate: 'desc' },
  })
}
