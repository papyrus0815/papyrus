import { CandidacyNominationType, PoliticalPosition } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * 2024년 미국 대통령 선거 — 후보와 정당.
 *
 * 선거 행과 트럼프의 후보 기록은 이미 있었지만 **상대 후보도 정당도 비어 있어**,
 * 국가 대시보드의 선거 카드가 "트럼프 49.8%" 한 줄로만 보였다. 상대가 없었던 게 아니라
 * 넣지 않았을 뿐이다. 두 후보와 두 정당을 채운다.
 *
 * 득표는 공인 집계 기준(트럼프 77,302,580 / 해리스 75,017,613)이며, 이미 들어 있는
 * 트럼프 결과 행의 수치와 같다.
 */
const COUNTRY_NAME = '미국'
const ELECTION_NAME = '2024년 미국 대통령 선거'

const PARTIES = [
  {
    name: '공화당',
    shortName: 'GOP',
    localName: 'Republican Party',
    position: PoliticalPosition.RIGHT,
    brandColor: '#E81B23',
    description:
      '1854년 창당된 미국의 양대 정당 중 하나. 2024년 대선에서 도널드 트럼프를 후보로 지명했다.',
  },
  {
    name: '민주당',
    shortName: 'DEM',
    localName: 'Democratic Party',
    position: PoliticalPosition.CENTER_LEFT,
    brandColor: '#00AEF3',
    description:
      '1828년 창당된 미국의 양대 정당 중 하나. 2024년 대선에서 카멀라 해리스를 후보로 지명했다.',
  },
] as const

/** 후보 — 인물은 이름으로 찾고, 없으면 최소 카드로 만든다 */
const CANDIDATES = [
  {
    personName: '도널드',
    originalName: 'Donald John Trump',
    partyName: '공화당',
    ballotOrder: 1,
    votes: 77302580n,
    voteSharePercent: 49.8,
    resultRank: 1,
    elected: true,
  },
  {
    personName: '카멀라',
    originalName: 'Kamala Devi Harris',
    partyName: '민주당',
    ballotOrder: 2,
    votes: 75017613n,
    voteSharePercent: 48.3,
    resultRank: 2,
    elected: false,
    /** 없으면 만들 때 쓸 최소 정보 */
    create: {
      name: '카멀라',
      surname: '해리스',
      originalName: 'Kamala Devi Harris',
      birthDate: new Date('1964-10-20'),
      /* Person에는 description이 없다 — 전기는 별도 도메인이라 여기서 넣지 않는다 */
      nameDisplayOrder: 'western',
    },
  },
] as const

export async function seedUsa2024Presidential(prisma: PrismaService) {
  console.log('\n🇺🇸 2024년 미국 대통령 선거 후보·정당 시딩')

  const country = await prisma.country.findFirst({
    where: { name: COUNTRY_NAME },
    select: { id: true, accountId: true },
  })
  if (!country) {
    console.warn(`  ⚠️  국가를 찾을 수 없음: ${COUNTRY_NAME}`)
    return
  }

  const election = await prisma.election.findFirst({
    where: { name: ELECTION_NAME },
    select: { id: true },
  })
  if (!election) {
    console.warn(`  ⚠️  선거를 찾을 수 없음: ${ELECTION_NAME}`)
    return
  }

  // ── 정당 ────────────────────────────────────────────────────────────────
  const partyIdByName = new Map<string, string>()
  for (const party of PARTIES) {
    const existing = await prisma.politicalParty.findFirst({
      where: { countryId: country.id, name: party.name },
      select: { id: true },
    })
    if (existing) {
      partyIdByName.set(party.name, existing.id)
      console.log(`  ⏭️  정당 이미 존재: ${party.name}`)
      continue
    }
    const created = await prisma.politicalParty.create({
      data: {
        name: party.name,
        shortName: party.shortName,
        localName: party.localName,
        position: party.position,
        brandColor: party.brandColor,
        description: party.description,
        /* PoliticalParty에는 accountId가 없다 — 국가 스코프만 건다 */
        countryId: country.id,
      },
      select: { id: true },
    })
    partyIdByName.set(party.name, created.id)
    console.log(`  ✅ 정당 생성: ${party.name}`)
  }

  // ── 후보 ────────────────────────────────────────────────────────────────
  for (const candidate of CANDIDATES) {
    let person = await prisma.person.findFirst({
      where: {
        OR: [
          { originalName: candidate.originalName },
          { name: candidate.personName, countryId: country.id },
        ],
      },
      select: { id: true, name: true },
    })

    if (!person && 'create' in candidate) {
      person = await prisma.person.create({
        data: {
          ...candidate.create,
          countryId: country.id,
          accountId: country.accountId,
        },
        select: { id: true, name: true },
      })
      console.log(`  ✅ 인물 생성: ${candidate.create.surname}${person.name}`)
    }
    if (!person) {
      console.warn(`  ⚠️  인물을 찾을 수 없음: ${candidate.personName}`)
      continue
    }

    const partyId = partyIdByName.get(candidate.partyName) ?? null

    /*
     * 후보 기록은 (선거, 인물) 자연키로 본다. 트럼프는 화면에서 정권을 연결할 때
     * 이미 만들어져 있어(정당 없이) — 그 행을 살려 두고 정당만 채운다.
     */
    const existing = await prisma.electionCandidacy.findFirst({
      where: { electionId: election.id, personId: person.id },
      select: { id: true, partyId: true },
    })

    const candidacyId = existing
      ? existing.id
      : (
          await prisma.electionCandidacy.create({
            data: {
              electionId: election.id,
              personId: person.id,
              partyId,
              nominationType: CandidacyNominationType.PARTY_NOMINATION,
              ballotOrder: candidate.ballotOrder,
            },
            select: { id: true },
          })
        ).id

    if (existing) {
      await prisma.electionCandidacy.update({
        where: { id: existing.id },
        data: {
          partyId: existing.partyId ?? partyId,
          nominationType: CandidacyNominationType.PARTY_NOMINATION,
          ballotOrder: candidate.ballotOrder,
        },
      })
      console.log(`  ♻️  후보 보강: ${person.name} (${candidate.partyName})`)
    } else {
      console.log(`  ✅ 후보 생성: ${person.name} (${candidate.partyName})`)
    }

    // ── 결과 ──────────────────────────────────────────────────────────────
    const existingResult = await prisma.electionResult.findFirst({
      where: { candidacyId },
      select: { id: true },
    })
    if (existingResult) {
      console.log(`    ⏭️  결과 이미 존재: ${person.name}`)
      continue
    }
    await prisma.electionResult.create({
      data: {
        candidacyId,
        votes: candidate.votes,
        voteSharePercent: candidate.voteSharePercent,
        resultRank: candidate.resultRank,
        elected: candidate.elected,
      },
    })
    console.log(
      `    ✅ 결과: ${candidate.votes.toLocaleString()}표 (${candidate.voteSharePercent}%)`,
    )
  }

  console.log('✅ 2024년 미국 대통령 선거 시딩 완료\n')
}
