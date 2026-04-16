import { PoliticalPosition } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const COUNTRY_NAME = '독일 제국'

const PARTIES: {
  name: string
  shortName: string
  localName: string
  ideology: string
  position: PoliticalPosition
  foundedDate: Date
  dissolvedDate?: Date
  description: string
  brandColor?: string
}[] = [
  {
    name: '사회민주당',
    shortName: 'SPD',
    localName: 'Sozialdemokratische Partei Deutschlands',
    ideology: '사회민주주의, 마르크스주의',
    position: PoliticalPosition.LEFT,
    foundedDate: new Date('1875-05-22'),
    description:
      '독일 제국의 주요 사회주의 정당. 1875년 고타 전당대회에서 창당. 반사회주의법(1878–1890) 하에서도 성장을 지속했으며, 1903년 선거에서 역대 최다 득표율(31.7%)을 기록했다.',
    brandColor: '#E3000F',
  },
  {
    name: '중앙당',
    shortName: 'Zentrum',
    localName: 'Deutsche Zentrumspartei',
    ideology: '정치적 가톨릭, 기독교 사회주의',
    position: PoliticalPosition.CENTER,
    foundedDate: new Date('1870-12-13'),
    dissolvedDate: new Date('1933-07-05'),
    description:
      '독일 가톨릭 신자들을 대변한 정당. 비스마르크의 문화투쟁(Kulturkampf)에 맞서 결집했으며, 라이히스탁에서 중간파로 캐스팅보트 역할을 담당.',
  },
  {
    name: '국민자유당',
    shortName: 'NLP',
    localName: 'Nationalliberale Partei',
    ideology: '자유주의, 독일 통일 민족주의',
    position: PoliticalPosition.CENTER_RIGHT,
    foundedDate: new Date('1867-02-12'),
    dissolvedDate: new Date('1918-11-25'),
    description:
      '비스마르크 통일 정책의 핵심 파트너. 경제적 자유주의와 독일 민족주의를 결합. 1860~70년대 전성기를 누렸으나 이후 보수화되며 의석이 감소.',
  },
  {
    name: '독일보수당',
    shortName: 'DKP',
    localName: 'Deutschkonservative Partei',
    ideology: '보수주의, 군주제, 농업 보호주의',
    position: PoliticalPosition.RIGHT,
    foundedDate: new Date('1876-07-08'),
    dissolvedDate: new Date('1918-11-09'),
    description:
      '프로이센 귀족·융커 계층을 대변. 농업 보호관세와 반유대주의적 성향을 지닌 전통 보수 정당. 1892년 티볼리 강령(반유대주의 조항 포함) 채택.',
  },
  {
    name: '자유보수당',
    shortName: 'FKP',
    localName: 'Freie Konservative Partei (Reichspartei)',
    ideology: '온건 보수주의',
    position: PoliticalPosition.CENTER_RIGHT,
    foundedDate: new Date('1866-07-12'),
    dissolvedDate: new Date('1918-11-09'),
    description:
      '라이히스파르테이(Reichspartei)라고도 불린 온건 보수 세력. 비스마르크의 정책을 일관되게 지지한 친정부 우파 정당.',
  },
  {
    name: '자유사상국민당',
    shortName: 'FrVP',
    localName: 'Freisinnige Volkspartei',
    ideology: '자유주의, 민주주의',
    position: PoliticalPosition.CENTER_LEFT,
    foundedDate: new Date('1893-03-05'),
    dissolvedDate: new Date('1910-03-06'),
    description:
      '오이겐 리히터가 이끈 좌파 자유주의 정당. 1893년 자유사상당(Freisinnige Partei) 분열로 탄생. 1910년 자유사상연합·독일국민당과 함께 진보민당(Fortschrittliche Volkspartei)으로 통합.',
  },
  {
    name: '자유사상연합',
    shortName: 'FV',
    localName: 'Freisinnige Vereinigung',
    ideology: '자유주의',
    position: PoliticalPosition.CENTER_LEFT,
    foundedDate: new Date('1893-03-05'),
    dissolvedDate: new Date('1910-03-06'),
    description:
      '1893년 자유사상당 분열로 탄생한 중도 자유주의 분파. 1910년 진보민당으로 통합.',
  },
  {
    name: '독일국민당',
    shortName: 'DVP',
    localName: 'Deutsche Volkspartei (Kaiserreich)',
    ideology: '자유주의, 남독일 연방주의',
    position: PoliticalPosition.CENTER_LEFT,
    foundedDate: new Date('1868-09-16'),
    dissolvedDate: new Date('1910-03-06'),
    description:
      '뷔르템베르크·바덴 등 남독일 자유주의 세력의 정당. 1910년 진보민당으로 통합. 바이마르 공화국의 독일국민당(DVP, 1918–1933)과는 별개 정당.',
  },
  {
    name: '폴란드파',
    shortName: 'PF',
    localName: 'Polnische Fraktion',
    ideology: '폴란드 민족주의, 소수민족 권익',
    position: PoliticalPosition.CENTER,
    foundedDate: new Date('1871-03-21'),
    dissolvedDate: new Date('1918-11-09'),
    description:
      '독일 제국 내 폴란드계 주민을 대변. 포젠(포즈난)·서프로이센·실레지아 선거구 출신 의원들로 구성된 소수민족 원내 그룹.',
  },
  {
    name: '경제연합',
    shortName: 'WV',
    localName: 'Wirtschaftliche Vereinigung',
    ideology: '반유대주의, 민족주의, 농업 보호주의',
    position: PoliticalPosition.FAR_RIGHT,
    foundedDate: new Date('1900-01-01'),
    dissolvedDate: new Date('1914-12-31'),
    description:
      '여러 반유대주의 정당들이 결합한 원내 그룹. 독일사회개혁당(Deutsch-Soziale Reformpartei), 반유대주의국민당(Antisemitische Volkspartei) 등이 포함.',
  },
]

export async function seedGermanyEmpireParties(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🏛️ 독일 제국 정당 시딩 시작...')

  const historicalCountry = await prisma.historicalCountry.findFirst({
    where: { name: COUNTRY_NAME },
    select: { id: true },
  })

  if (!historicalCountry) {
    console.warn(`  ⚠️  역사 국가를 찾을 수 없음: ${COUNTRY_NAME}`)
    return
  }

  for (const party of PARTIES) {
    const existing = await prisma.politicalParty.findFirst({
      where: { historicalCountryId: historicalCountry.id, name: party.name },
    })

    if (existing) {
      console.log(`  ⏭️  이미 존재: ${party.name} (${party.shortName})`)
      continue
    }

    await prisma.politicalParty.create({
      data: {
        historicalCountryId: historicalCountry.id,
        name: party.name,
        shortName: party.shortName,
        localName: party.localName,
        ideology: party.ideology,
        position: party.position,
        foundedDate: party.foundedDate,
        dissolvedDate: party.dissolvedDate ?? null,
        description: party.description,
        brandColor: party.brandColor ?? null,
      },
    })
    console.log(`  ✅ ${party.name} (${party.shortName})`)
  }

  console.log(`✅ 독일 제국 정당 시딩 완료 (${PARTIES.length}건)\n`)
}
