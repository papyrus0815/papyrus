import {
  ElectionStatus,
  ElectionType,
  LegislatureTermClosureKind,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

const COUNTRY_NAME = '독일 제국'
const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

// ── 선거 데이터 ──────────────────────────────────────────────────────────────
const ELECTIONS: {
  name: string
  shortName: string
  electionType: ElectionType
  status: ElectionStatus
  pollDate: Date
  voterTurnoutPercent: number
  totalSeats: number
  convocationOrdinal: number
  legislatureTermStart: Date
  legislatureTermEnd: Date
  resultingLegislatureClosureKind: LegislatureTermClosureKind
  description: string
  partyResults: {
    partyName: string
    votes: bigint
    voteSharePercent: number
    seatsWon: number
    notes?: string
  }[]
}[] = [
  // ── 1898년 라이히스탁 선거 (제10대) ──────────────────────────────────────
  {
    name: '1898년 독일 제국 라이히스탁 선거',
    shortName: '1898년 라이히스탁 선거',
    electionType: ElectionType.PARLIAMENTARY_CONSTITUENCY,
    status: ElectionStatus.FINALIZED,
    pollDate: new Date('1898-06-16'),
    voterTurnoutPercent: 68.06,
    totalSeats: 397,
    convocationOrdinal: 10,
    legislatureTermStart: new Date('1898-12-03'),
    legislatureTermEnd: new Date('1903-05-05'),
    resultingLegislatureClosureKind: LegislatureTermClosureKind.FULL_TERM,
    description:
      '제10대 라이히스탁 선거. 호엔로에-쉴링스퓌르스트 수상기에 치러졌으며, 빌헬름 2세의 "세계정치(Weltpolitik)"와 티르피츠의 제1차 함대법(1898) 통과를 배경으로 한다. 사회민주당(SPD)이 27.2% 득표로 최다 득표 정당이 되었으나 소선거구 2라운드제의 구조상 56석에 그쳤고, 중앙당이 102석으로 원내 제1당을 유지. 5년 임기 만료에 따라 1903년 5월 5일 카이저의 형식적 해산 조칙으로 차기 선거가 실시됨.',
    partyResults: [
      // 총 의석 397석 중 주요 9개 정당 344석 (나머지 53석: 독일사회개혁당·바이에른농민당·엘자스·구엘프·독일농민연합 등)
      {
        partyName: '사회민주당',
        votes: 2107076n,
        voteSharePercent: 27.18,
        seatsWon: 56,
        notes: '득표 순위 1위이나 소선거구 결선 구조상 의석 수는 제한됨',
      },
      {
        partyName: '중앙당',
        votes: 1454042n,
        voteSharePercent: 18.76,
        seatsWon: 102,
      },
      {
        partyName: '국민자유당',
        votes: 997147n,
        voteSharePercent: 12.86,
        seatsWon: 48,
      },
      {
        partyName: '독일보수당',
        votes: 830341n,
        voteSharePercent: 10.71,
        seatsWon: 53,
      },
      {
        partyName: '자유사상국민당',
        votes: 558314n,
        voteSharePercent: 7.2,
        seatsWon: 29,
      },
      {
        partyName: '자유보수당',
        votes: 337601n,
        voteSharePercent: 4.35,
        seatsWon: 22,
      },
      {
        partyName: '폴란드파',
        votes: 236461n,
        voteSharePercent: 3.05,
        seatsWon: 14,
        notes: '폴란드 독립파(Koło Polskie)와 폴란드 궁정파 원내 통합 기준',
      },
      {
        partyName: '자유사상연합',
        votes: 195682n,
        voteSharePercent: 2.52,
        seatsWon: 12,
      },
      {
        partyName: '독일국민당',
        votes: 106396n,
        voteSharePercent: 1.37,
        seatsWon: 8,
      },
    ],
  },

  // ── 1903년 라이히스탁 선거 (제11대) ──────────────────────────────────────
  {
    name: '1903년 독일 제국 라이히스탁 선거',
    shortName: '1903년 라이히스탁 선거',
    electionType: ElectionType.PARLIAMENTARY_CONSTITUENCY,
    status: ElectionStatus.FINALIZED,
    pollDate: new Date('1903-06-16'),
    voterTurnoutPercent: 75.8,
    totalSeats: 397,
    convocationOrdinal: 11,
    legislatureTermStart: new Date('1903-12-01'),
    legislatureTermEnd: new Date('1906-12-13'),
    resultingLegislatureClosureKind:
      LegislatureTermClosureKind.HEAD_DISSOLUTION_DECREE,
    description:
      '제11대 라이히스탁 선거. 사회민주당(SPD)이 31.7% 득표로 역대 최다 득표를 기록했지만, 소선거구 2라운드제의 특성상 의석은 81석에 그쳤다. 중앙당이 100석으로 원내 제1당을 유지. 1906년 12월 카이저 빌헬름 2세의 의회 해산 조칙으로 임기가 단축됨.',
    partyResults: [
      // 총 의석 397석 중 주요 10개 정당 372석 (나머지 25석: 구엘프당·덴마크파·엘자스 등 소수민족·지역 정당)
      {
        partyName: '사회민주당',
        votes: 3010771n,
        voteSharePercent: 31.69,
        seatsWon: 81,
      },
      {
        partyName: '중앙당',
        votes: 1875300n,
        voteSharePercent: 19.74,
        seatsWon: 100,
      },
      {
        partyName: '국민자유당',
        votes: 1317374n,
        voteSharePercent: 13.87,
        seatsWon: 51,
      },
      {
        partyName: '독일보수당',
        votes: 944551n,
        voteSharePercent: 9.94,
        seatsWon: 54,
      },
      {
        partyName: '자유사상국민당',
        votes: 562783n,
        voteSharePercent: 5.92,
        seatsWon: 21,
      },
      {
        partyName: '자유사상연합',
        votes: 349718n,
        voteSharePercent: 3.68,
        seatsWon: 13,
      },
      {
        partyName: '자유보수당',
        votes: 333920n,
        voteSharePercent: 3.52,
        seatsWon: 21,
      },
      {
        partyName: '폴란드파',
        votes: 346986n,
        voteSharePercent: 3.65,
        seatsWon: 16,
      },
      {
        partyName: '경제연합',
        votes: 244597n,
        voteSharePercent: 2.57,
        seatsWon: 11,
        notes: '독일사회개혁당·반유대주의국민당 등 반유대주의 정당 연합 결과',
      },
      {
        partyName: '독일국민당',
        votes: 195582n,
        voteSharePercent: 2.06,
        seatsWon: 6,
      },
    ],
  },

  // ── 1907년 라이히스탁 선거 (제12대, 호텐토트 선거) ──────────────────────
  {
    name: '1907년 독일 제국 라이히스탁 선거',
    shortName: '1907년 라이히스탁 선거',
    electionType: ElectionType.PARLIAMENTARY_CONSTITUENCY,
    status: ElectionStatus.FINALIZED,
    pollDate: new Date('1907-01-25'),
    voterTurnoutPercent: 84.7,
    totalSeats: 397,
    convocationOrdinal: 12,
    legislatureTermStart: new Date('1907-02-19'),
    legislatureTermEnd: new Date('1911-11-10'),
    resultingLegislatureClosureKind:
      LegislatureTermClosureKind.HEAD_DISSOLUTION_DECREE,
    description:
      '제12대 라이히스탁 선거. "호텐토트 선거(Hottentottenwahl)" 또는 "뷜로 선거"라고도 불림. 뷜로 수상이 독일령 남서아프리카(나미비아) 헤레로·나마콰 반란 진압 예산에 반대한 중앙당·SPD 연합에 맞서 의회를 해산하고 총선을 치렀다. 보수파·자유주의 연합(뷜로 블록)이 과반을 달성. SPD는 득표율이 소폭 하락했음에도 불구하고 소선거구제의 역설로 81석→43석으로 의석이 반감.',
    partyResults: [
      // 총 의석 397석 중 주요 10개 정당 373석 (나머지 24석: 구엘프당·덴마크파·엘자스 등)
      {
        partyName: '사회민주당',
        votes: 3259013n,
        voteSharePercent: 28.87,
        seatsWon: 43,
        notes: '득표 순위 1위이나 소선거구 결선 구조상 의석 급감',
      },
      {
        partyName: '중앙당',
        votes: 2179811n,
        voteSharePercent: 19.33,
        seatsWon: 105,
      },
      {
        partyName: '국민자유당',
        votes: 1630535n,
        voteSharePercent: 14.46,
        seatsWon: 54,
        notes: '뷜로 블록 참여',
      },
      {
        partyName: '독일보수당',
        votes: 1060216n,
        voteSharePercent: 9.40,
        seatsWon: 60,
        notes: '뷜로 블록 참여',
      },
      {
        partyName: '자유사상국민당',
        votes: 506738n,
        voteSharePercent: 4.49,
        seatsWon: 28,
        notes: '뷜로 블록 참여',
      },
      {
        partyName: '자유보수당',
        votes: 472101n,
        voteSharePercent: 4.18,
        seatsWon: 24,
        notes: '뷜로 블록 참여',
      },
      {
        partyName: '폴란드파',
        votes: 456683n,
        voteSharePercent: 4.05,
        seatsWon: 20,
      },
      {
        partyName: '자유사상연합',
        votes: 321565n,
        voteSharePercent: 2.85,
        seatsWon: 14,
        notes: '뷜로 블록 참여',
      },
      {
        partyName: '경제연합',
        votes: 269604n,
        voteSharePercent: 2.39,
        seatsWon: 22,
      },
      {
        partyName: '독일국민당',
        votes: 253647n,
        voteSharePercent: 2.25,
        seatsWon: 7,
        notes: '뷜로 블록 참여',
      },
    ],
  },
]

export async function seedGermanyReichstagElections(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🗳️ 독일 제국 라이히스탁 선거 시딩 시작...')

  const historicalCountry = await prisma.historicalCountry.findFirst({
    where: { name: COUNTRY_NAME },
    select: { id: true },
  })

  if (!historicalCountry) {
    console.warn(`  ⚠️  역사 국가를 찾을 수 없음: ${COUNTRY_NAME}`)
    return
  }

  for (const electionData of ELECTIONS) {
    // ── 선거 등록 ─────────────────────────────────────────────────────────
    const existing = await prisma.election.findFirst({
      where: {
        historicalCountryId: historicalCountry.id,
        electionType: electionData.electionType,
        convocationOrdinal: electionData.convocationOrdinal,
      },
    })

    let electionId: string

    if (existing) {
      console.log(`  ⏭️  이미 존재: ${electionData.name}`)
      electionId = existing.id
    } else {
      const election = await prisma.election.create({
        data: {
          historicalCountryId: historicalCountry.id,
          name: electionData.name,
          shortName: electionData.shortName,
          electionType: electionData.electionType,
          status: electionData.status,
          pollDate: electionData.pollDate,
          voterTurnoutPercent: electionData.voterTurnoutPercent,
          totalSeats: electionData.totalSeats,
          convocationOrdinal: electionData.convocationOrdinal,
          legislatureTermStart: electionData.legislatureTermStart,
          legislatureTermEnd: electionData.legislatureTermEnd,
          resultingLegislatureClosureKind:
            electionData.resultingLegislatureClosureKind,
          description: electionData.description,
          accountId: ACCOUNT_ID,
        },
      })
      console.log(`  ✅ ${electionData.name} 생성`)
      electionId = election.id
    }

    // ── 정당별 결과 등록 ──────────────────────────────────────────────────
    console.log(`  📊 정당 결과 등록 중...`)
    for (const result of electionData.partyResults) {
      const party = await prisma.politicalParty.findFirst({
        where: {
          historicalCountryId: historicalCountry.id,
          name: result.partyName,
        },
      })

      if (!party) {
        console.warn(`    ⚠️  정당을 찾을 수 없음: ${result.partyName}`)
        continue
      }

      const existingResult = await prisma.electionPartyResult.findUnique({
        where: {
          uq_election_party_result_election_party: {
            electionId,
            partyId: party.id,
          },
        },
      })

      if (existingResult) {
        console.log(`    ⏭️  이미 존재: ${result.partyName}`)
        continue
      }

      await prisma.electionPartyResult.create({
        data: {
          electionId,
          partyId: party.id,
          votes: result.votes,
          voteSharePercent: result.voteSharePercent,
          seatsWon: result.seatsWon,
          notes: result.notes ?? null,
        },
      })
      console.log(
        `    ✅ ${result.partyName}: ${result.seatsWon}석 (${result.voteSharePercent}%)`,
      )
    }
  }

  console.log(`✅ 독일 제국 라이히스탁 선거 시딩 완료 (${ELECTIONS.length}건)\n`)
}
