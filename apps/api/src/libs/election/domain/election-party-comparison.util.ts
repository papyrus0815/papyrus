import type { Prisma } from '@prisma/client'

type PartyResultRow = Prisma.ElectionPartyResultGetPayload<{
  include: {
    party: {
      select: {
        id: true
        name: true
        shortName: true
        brandColor: true
      }
    }
  }
}>

type ElectionWithPartyResults = {
  id: string
  partyResults: PartyResultRow[]
}

function numFromDecimalLike(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const n = Number(String(v))
  return Number.isFinite(n) ? n : null
}

export function buildPartyResultComparisonVsPrevious(
  current: ElectionWithPartyResults,
  previous: {
    id: string
    name: string
    shortName: string | null
    pollDate: Date
    convocationOrdinal: number | null
    partyResults: PartyResultRow[]
  },
): {
  previousElection: {
    id: string
    name: string
    shortName: string | null
    pollDate: Date
    convocationOrdinal: number | null
  }
  rows: Array<{
    partyId: string
    party: {
      id: string
      name: string
      shortName: string | null
      brandColor: string | null
    } | null
    previousVoteSharePercent: unknown
    currentVoteSharePercent: unknown
    /** 직전 대비 득표율 변화(퍼센트포인트) */
    voteShareDeltaPpt: number | null
    previousSeatsWon: number | null
    currentSeatsWon: number | null
    seatsDelta: number | null
  }>
} {
  const prevMap = new Map(
    previous.partyResults.map((r) => [r.partyId, r]),
  )
  const currMap = new Map(current.partyResults.map((r) => [r.partyId, r]))
  const partyIds = [...new Set([...prevMap.keys(), ...currMap.keys()])]

  const rows = partyIds.map((partyId) => {
    const pr = prevMap.get(partyId)
    const cr = currMap.get(partyId)
    const party = cr?.party ?? pr?.party ?? null

    const prevShare = numFromDecimalLike(pr?.voteSharePercent ?? null)
    const currShare = numFromDecimalLike(cr?.voteSharePercent ?? null)
    const voteShareDeltaPpt =
      prevShare != null && currShare != null
        ? Math.round((currShare - prevShare) * 1e6) / 1e6
        : null

    const prevSeats = pr?.seatsWon ?? null
    const currSeats = cr?.seatsWon ?? null
    let seatsDelta: number | null = null
    if (prevSeats != null || currSeats != null) {
      seatsDelta = (currSeats ?? 0) - (prevSeats ?? 0)
    }

    return {
      partyId,
      party,
      previousVoteSharePercent: pr?.voteSharePercent ?? null,
      currentVoteSharePercent: cr?.voteSharePercent ?? null,
      voteShareDeltaPpt,
      previousSeatsWon: prevSeats,
      currentSeatsWon: currSeats,
      seatsDelta,
    }
  })

  rows.sort((a, b) => {
    const na = a.party?.name ?? a.partyId
    const nb = b.party?.name ?? b.partyId
    return na.localeCompare(nb, 'ko')
  })

  return {
    previousElection: {
      id: previous.id,
      name: previous.name,
      shortName: previous.shortName,
      pollDate: previous.pollDate,
      convocationOrdinal: previous.convocationOrdinal,
    },
    rows,
  }
}
