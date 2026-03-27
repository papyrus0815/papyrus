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
  >,
): Promise<Election | null> {
  const scopeWhere: Prisma.ElectionWhereInput = {
    electionType: current.electionType,
    NOT: { id: current.id },
  }

  if (current.countryId) {
    scopeWhere.countryId = current.countryId
    scopeWhere.historicalCountryId = null
  } else if (current.historicalCountryId) {
    scopeWhere.historicalCountryId = current.historicalCountryId
    scopeWhere.countryId = null
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
