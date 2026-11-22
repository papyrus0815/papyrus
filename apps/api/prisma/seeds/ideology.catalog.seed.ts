/**
 * 이념 카탈로그 시드 + 정당 이념 문자열 이관(B2, docs/political-party-model-review.md §4.3).
 *
 * 1) 카탈로그: 기존 정당 39곳의 이념 태그 62종 + 나무위키 국가 파시스트당 인포박스의 빠진 4종(조합주의·자급자족주의·
 *    제3의 위치·군주주의)을 한 개념 한 행으로. 표기 변형은 별칭(표퓰리즘 → 포퓰리즘, '파시즘 (이탈리아 파시즘)').
 *    범주: 사상 / 정책 노선(자유무역·보통선거) / 이익 대변(참전군인 권익). 상위 개념은 분명한 것만(파시즘 ⊃ 이탈리아 파시즘).
 * 2) 이관: 이념 연결이 아직 없는 정당만, 문자열을 쪼개(쉼표 → 통째로 모르는 조각만 가운뎃점) 카탈로그에 잇는다.
 *    '선거연합'은 이념이 아니라 정당 종류(공동 명부)라 kind로 옮긴다.
 * 3) 캐시: 연결 순서대로 ideology 문자열을 다시 쓴다(정본은 연결).
 *
 * 멱등 — 다시 돌려도 같은 결과. 카탈로그 행은 이름으로 upsert, 이미 연결이 있는 정당은 건드리지 않는다(국가 파시스트당
 * 보강분만 빠진 것을 더한다).
 */
import type { IdeologyCategory } from '@prisma/client'

import {
  refreshPartyIdeologyCache,
  resolveIdeologyIdByLabel,
  splitIdeologyText,
  syncPartyIdeologies,
} from '../../src/libs/election/domain/party-ideology.util'
import type { PrismaService } from '../prisma.service'

interface IdeologySpec {
  name: string
  englishName?: string
  category?: IdeologyCategory
  parent?: string
  aliases?: string[]
}

/** 상위 개념이 먼저 오도록 적는다 */
const CATALOG: IdeologySpec[] = [
  // ── 자유주의 계열
  { name: '자유주의', englishName: 'Liberalism' },
  { name: '고전적 자유주의', englishName: 'Classical liberalism', parent: '자유주의' },
  { name: '사회자유주의', englishName: 'Social liberalism', parent: '자유주의' },
  { name: '보수자유주의', englishName: 'Conservative liberalism', parent: '자유주의' },
  { name: '경제적 자유주의', englishName: 'Economic liberalism', parent: '자유주의' },
  { name: '급진주의', englishName: 'Radicalism' },
  { name: '의회주의', englishName: 'Parliamentarism' },
  { name: '입헌주의', englishName: 'Constitutionalism' },
  { name: '민주주의', englishName: 'Democracy' },
  { name: '세속주의', englishName: 'Secularism' },
  { name: '개혁주의', englishName: 'Reformism' },
  // ── 보수주의 계열
  { name: '보수주의', englishName: 'Conservatism' },
  { name: '온건 보수주의', englishName: 'Moderate conservatism', parent: '보수주의' },
  { name: '국민보수주의', englishName: 'National conservatism', parent: '보수주의' },
  // ── 사회주의·공산주의 계열
  { name: '사회주의', englishName: 'Socialism' },
  { name: '민주사회주의', englishName: 'Democratic socialism', parent: '사회주의' },
  { name: '혁명적 사회주의', englishName: 'Revolutionary socialism', parent: '사회주의' },
  { name: '개혁사회주의', englishName: 'Reformist socialism', parent: '사회주의' },
  { name: '사회민주주의', englishName: 'Social democracy' },
  { name: '좌익 사회민주주의', englishName: 'Left-wing social democracy', parent: '사회민주주의' },
  { name: '마르크스주의', englishName: 'Marxism' },
  { name: '공산주의', englishName: 'Communism' },
  { name: '협동조합주의', englishName: 'Cooperativism' },
  // ── 종교·기독교 정치
  { name: '기독교 민주주의', englishName: 'Christian democracy' },
  { name: '기독교 사회주의', englishName: 'Christian socialism' },
  { name: '정치적 가톨릭', englishName: 'Political Catholicism' },
  { name: '가톨릭 사회교리', englishName: 'Catholic social teaching' },
  { name: '인민주의', englishName: 'Popolarismo' },
  // ── 민족·국가
  { name: '민족주의', englishName: 'Nationalism' },
  { name: '국수주의', englishName: 'Ultranationalism', parent: '민족주의' },
  { name: '폴란드 민족주의', englishName: 'Polish nationalism', parent: '민족주의' },
  { name: '독일 통일 민족주의', englishName: 'German nationalism', parent: '민족주의' },
  { name: '제국주의', englishName: 'Imperialism' },
  { name: '군국주의', englishName: 'Militarism' },
  { name: '반유대주의', englishName: 'Antisemitism' },
  // ── 파시즘·극우
  { name: '파시즘', englishName: 'Fascism' },
  { name: '이탈리아 파시즘', englishName: 'Italian fascism', parent: '파시즘', aliases: ['파시즘 (이탈리아 파시즘)'] },
  { name: '국가사회주의', englishName: 'National socialism' },
  { name: '조합주의', englishName: 'Corporatism' },
  { name: '자급자족주의', englishName: 'Autarky' },
  { name: '제3의 위치', englishName: 'Third Position' },
  { name: '포퓰리즘', englishName: 'Populism', aliases: ['표퓰리즘'] },
  // ── 반(反)-
  { name: '반자본주의', englishName: 'Anti-capitalism' },
  { name: '반공주의', englishName: 'Anti-communism' },
  { name: '반사회주의', englishName: 'Anti-socialism' },
  { name: '반파시즘', englishName: 'Anti-fascism' },
  { name: '반전주의', englishName: 'Anti-war' },
  { name: '반교권주의', englishName: 'Anticlericalism' },
  { name: '반기득권', englishName: 'Anti-establishment' },
  { name: '반절대주의', englishName: 'Anti-absolutism', aliases: ['반(反)절대왕권'] },
  // ── 정체(政體)·국가 구조
  { name: '군주제', englishName: 'Monarchism', aliases: ['군주주의'] },
  { name: '입헌군주제', englishName: 'Constitutional monarchism', parent: '군주제' },
  { name: '공화주의', englishName: 'Republicanism' },
  { name: '마치니주의', englishName: 'Mazzinianism', parent: '공화주의' },
  { name: '반군주제', englishName: 'Anti-monarchism' },
  { name: '연방주의', englishName: 'Federalism' },
  { name: '남독일 연방주의', englishName: 'South German federalism', parent: '연방주의' },
  { name: '중도주의', englishName: 'Centrism' },
  // ── 정책 노선
  { name: '자유무역', englishName: 'Free trade', category: 'POLICY' },
  { name: '농업 보호주의', englishName: 'Agrarian protectionism', category: 'POLICY' },
  { name: '보통선거', englishName: 'Universal suffrage', category: 'POLICY' },
  { name: '사회개혁', englishName: 'Social reform', category: 'POLICY' },
  { name: '농지개혁', englishName: 'Land reform', category: 'POLICY' },
  { name: '의회개혁', englishName: 'Parliamentary reform', category: 'POLICY' },
  { name: '점진적 개혁', englishName: 'Gradualism', category: 'POLICY' },
  { name: '헌법 개정주의', englishName: 'Constitutional revisionism', category: 'POLICY' },
  { name: '자주외교', englishName: 'Independent diplomacy', category: 'POLICY' },
  { name: '미일동맹', englishName: 'Japan–US alliance', category: 'POLICY' },
  { name: '비무장 중립주의', englishName: 'Unarmed neutrality', category: 'POLICY', aliases: ['비무장중립주의(좌파)'] },
  // ── 이익 대변
  { name: '상공인 권익', englishName: 'Business interests', category: 'INTEREST', aliases: ['기업·상공인 대변'] },
  { name: '참전군인 권익', englishName: "Veterans' interests", category: 'INTEREST' },
  { name: '소수민족 권익', englishName: 'Minority rights', category: 'INTEREST' },
]

/** 이념이 아니라 정당 종류인 태그 */
const KIND_TAGS: Record<string, 'ELECTORAL_LIST'> = { 선거연합: 'ELECTORAL_LIST' }

/** 나무위키 국가 파시스트당 인포박스에 있는데 우리 문자열에 빠졌던 것 — 인수 기준 데이터 */
const PNF_ID = '78a4368c-1fed-4f77-a203-28012ef207c4'
const PNF_ADDITIONS = ['조합주의', '자급자족주의', '제3의 위치', '군주주의']

export async function seedIdeologyCatalog(prisma: PrismaService): Promise<void> {
  console.log('\n🧭 이념 카탈로그 시딩·이관 시작...')

  // 1) 카탈로그
  const idByName = new Map<string, string>()
  for (const spec of CATALOG) {
    const parentId = spec.parent ? idByName.get(spec.parent) : undefined
    if (spec.parent && !parentId) throw new Error(`상위 개념이 먼저 와야 합니다: ${spec.name} ⊂ ${spec.parent}`)
    const row = await prisma.ideology.upsert({
      where: { name: spec.name },
      create: {
        name: spec.name,
        englishName: spec.englishName ?? null,
        category: spec.category ?? 'IDEOLOGY',
        parentId: parentId ?? null,
      },
      update: {},
    })
    idByName.set(spec.name, row.id)
    for (const alias of spec.aliases ?? []) {
      await prisma.ideologyAlias.upsert({
        where: { name: alias },
        create: { name: alias, ideologyId: row.id, languageCode: 'ko' },
        update: {},
      })
    }
  }
  console.log(`  카탈로그 ${CATALOG.length}개 · 별칭 ${CATALOG.reduce((sum, spec) => sum + (spec.aliases?.length ?? 0), 0)}개`)

  // 2) 이관 — 연결이 아직 없는 정당만
  const parties = await prisma.politicalParty.findMany({
    select: { id: true, name: true, ideology: true, kind: true, _count: { select: { ideologyLinks: true } } },
  })
  const knownLabels = new Set<string>([
    ...CATALOG.map((spec) => spec.name),
    ...CATALOG.flatMap((spec) => spec.aliases ?? []),
    ...Object.keys(KIND_TAGS),
  ])
  let migrated = 0
  const unknown = new Set<string>()
  for (const party of parties) {
    if (party._count.ideologyLinks > 0 || !party.ideology) continue
    const pieces = splitIdeologyText(party.ideology, (piece) => knownLabels.has(piece))
    const ideologyIds: string[] = []
    for (const piece of pieces) {
      const kindTag = KIND_TAGS[piece]
      if (kindTag) {
        if (party.kind === 'PARTY') {
          await prisma.politicalParty.update({ where: { id: party.id }, data: { kind: kindTag } })
          console.log(`  · ${party.name}: '${piece}' → 종류 ${kindTag}`)
        }
        continue
      }
      let ideologyId = await resolveIdeologyIdByLabel(prisma, piece)
      if (!ideologyId) {
        unknown.add(piece)
        ideologyId = (await prisma.ideology.create({ data: { name: piece } })).id
      }
      ideologyIds.push(ideologyId)
    }
    await syncPartyIdeologies(prisma, party.id, ideologyIds)
    migrated += 1
  }
  console.log(`  이관 ${migrated}개 정당`)
  if (unknown.size > 0) console.warn(`  ⚠ 카탈로그에 없어 새로 만든 표기: ${[...unknown].join(', ')}`)

  // 3) 국가 파시스트당 보강 — 나무위키 인포박스 이념 13종 완비
  const pnf = await prisma.politicalParty.findUnique({ where: { id: PNF_ID }, select: { id: true } })
  if (pnf) {
    const links = await prisma.politicalPartyIdeology.findMany({
      where: { partyId: PNF_ID },
      orderBy: { sortOrder: 'asc' },
      select: { ideologyId: true },
    })
    const ids = links.map((link) => link.ideologyId)
    for (const label of PNF_ADDITIONS) {
      const ideologyId = await resolveIdeologyIdByLabel(prisma, label)
      if (ideologyId && !ids.includes(ideologyId)) ids.push(ideologyId)
    }
    await syncPartyIdeologies(prisma, PNF_ID, ids)
    console.log(`  국가 파시스트당 이념 ${ids.length}종`)
  }

  // 4) 캐시 — 연결이 있는 모든 정당
  const withLinks = await prisma.politicalParty.findMany({
    where: { ideologyLinks: { some: {} } },
    select: { id: true },
  })
  for (const party of withLinks) await refreshPartyIdeologyCache(prisma, party.id)
}
