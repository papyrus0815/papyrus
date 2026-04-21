import { HistoricalEntityKind, HistoricalStateType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

interface HistoricalCountryEntry {
  name: string
  enName?: string
  description?: string
  startEra?: 'BC' | 'AD'
  startYear?: number
  startMonth?: number
  endEra?: 'BC' | 'AD'
  endYear?: number
  endMonth?: number
  stateType: HistoricalStateType
  entityKind?: HistoricalEntityKind
  latitude?: number
  longitude?: number
  linkToIsoCodes: string[]
}

const ENTRIES: HistoricalCountryEntry[] = [
  // ── 중세 봉건 영방 ─────────────────────────────────────────────────
  {
    name: '플랑드르 백국',
    enName: 'County of Flanders',
    description: '862년 볼드윈 1세(철완공)가 서프랑크 왕국의 변경 백작령으로 수립한 봉건 국가. 모직물 산업과 북해 무역을 기반으로 중세 유럽에서 가장 부유한 지역 중 하나로 성장하였으며, 브뤼헤·겐트·이프르 등이 상업·수공업 중심지로 번영했다. 14세기 부르고뉴 공작 가문에 상속되면서 부르고뉴령 네덜란드의 핵심 구성 영토가 되었고, 1795년 프랑스 혁명군에 의해 공식 소멸될 때까지 다양한 종주권 아래 존속했다.',
    startEra: 'AD', startYear: 862,
    endEra: 'AD', endYear: 1795,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.05, longitude: 3.73,
    linkToIsoCodes: ['BE', 'NL', 'FR'],
  },
  {
    name: '홀란트 백국',
    enName: 'County of Holland',
    description: '1022년 서프리지아 백작 디르크 3세가 홀란트 백작을 칭하면서 실질적으로 성립한 북해 연안의 봉건 국가. 간척·어업·해운을 통해 빠르게 성장하였으며 암스테르담·레이덴·하를럼 등 도시가 번영했다. 1433년 부르고뉴 공작 필리프 3세가 홀란트를 상속하면서 부르고뉴령 네덜란드에 편입되었고, 이후 네덜란드 공화국의 주도 지방이 되어 네덜란드라는 명칭의 기원이 되었다.',
    startEra: 'AD', startYear: 1022,
    endEra: 'AD', endYear: 1795,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.37, longitude: 4.89,
    linkToIsoCodes: ['NL'],
  },
  {
    name: '브라반트 공국',
    enName: 'Duchy of Brabant',
    description: '1183년 신성로마황제 프리드리히 1세(바르바로사)가 뢰번 백작 앙리 1세를 브라반트 공작으로 책봉하여 수립한 공국. 루뱅·브뤼셀·안트베르펜을 중심으로 상공업이 발달하여 중세 저지대 최대의 경제권을 형성했다. 1430년 부르고뉴 공작 필리프 3세(선공)가 상속하여 부르고뉴령 네덜란드의 핵심이 되었으며, 이후 합스부르크 가문을 거쳐 1795년 프랑스에 의해 병합될 때까지 존속했다.',
    startEra: 'AD', startYear: 1183,
    endEra: 'AD', endYear: 1795,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.85, longitude: 4.35,
    linkToIsoCodes: ['BE', 'NL'],
  },
  {
    name: '리에주 주교후국',
    enName: 'Prince-Bishopric of Liège',
    description: '985년 오토 3세의 특허장으로 수립된 신성로마제국 내 교회 제후국. 리에주 주교가 세속 영주를 겸하며 뫼즈강 유역을 지배했으며 중세·근세 저지대에서 독립적인 정치 단위로 존속했다. 무기·철강 산업과 대학(1817년 이전까지 유명한 신학·법학 교육)으로 유명하였고, 주변 부르고뉴·합스부르크 네덜란드와는 별개의 정체성을 유지하다가 1795년 프랑스 혁명군에 의해 세속화·병합되었다.',
    startEra: 'AD', startYear: 985,
    endEra: 'AD', endYear: 1795,
    stateType: HistoricalStateType.THEOCRACY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.63, longitude: 5.57,
    linkToIsoCodes: ['BE'],
  },
  {
    name: '룩셈부르크 공국',
    enName: 'Duchy of Luxembourg',
    description: '963년 아르덴 백작 지크프리트가 루셀링겐 성을 매입하며 시작된 봉건 가문 영지. 1354년 신성로마황제 카를 4세가 룩셈부르크를 공국으로 승격시켰고, 한때 룩셈부르크 왕가가 신성로마제국 황제위를 배출하기도 했다. 1443년 부르고뉴령에 병합된 이후 합스부르크·스페인·오스트리아를 거쳐 저지대 17주의 구성 영방으로 존속하였으며, 1815년 빈 회의에서 대공국으로 재편되었다.',
    startEra: 'AD', startYear: 1354,
    endEra: 'AD', endYear: 1795,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 49.61, longitude: 6.13,
    linkToIsoCodes: ['BE'],
  },

  // ── 통합 저지대 ───────────────────────────────────────────────────
  {
    name: '부르고뉴령 네덜란드',
    enName: 'Burgundian Netherlands',
    description: '1384년 부르고뉴 공작 필리프 2세(대담공)가 플랑드르 백작령을 상속하면서 저지대 봉건 영방들을 점진적으로 하나의 지배 체제로 통합하여 형성한 복합 국가. 필리프 3세(선공)·샤를(용담공) 치세에 브라반트·홀란트·제일란트·뤽상부르·나무르·에노 등을 차례로 획득하여 저지대 17개 주의 원형을 완성하였다. 1482년 부르고뉴 공작 마리아가 합스부르크의 막시밀리안 1세와 결혼한 뒤 사망하면서 상속을 통해 합스부르크 가문에 넘어갔다.',
    startEra: 'AD', startYear: 1384,
    endEra: 'AD', endYear: 1482,
    stateType: HistoricalStateType.PERSONAL_UNION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.85, longitude: 4.35,
    linkToIsoCodes: ['BE', 'NL'],
  },
  {
    name: '합스부르크령 네덜란드',
    enName: 'Habsburg Netherlands (Seventeen Provinces)',
    description: '1482년 부르고뉴의 상속녀 마리아가 막시밀리안 1세와의 결혼을 통해 저지대 영지를 합스부르크 가문으로 이전하면서 성립한 저지대 통합 체제. 카를 5세가 1549년 "국본 칙령"으로 17개 주를 한 덩어리로 묶어 합스부르크 영지의 독자적 단위로 규정하였고, 같은 군주 아래 신성로마제국과 별도로 운영되었다. 1556년 합스부르크 가문의 분할 상속으로 스페인 합스부르크로 넘어갔으며, 1568년 네덜란드 독립 전쟁으로 사실상 분열이 시작되었다.',
    startEra: 'AD', startYear: 1482,
    endEra: 'AD', endYear: 1581,
    stateType: HistoricalStateType.PERSONAL_UNION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.85, longitude: 4.35,
    linkToIsoCodes: ['BE', 'NL'],
  },

  // ── 독립 전쟁 이후 남북 분열 ──────────────────────────────────────
  {
    name: '네덜란드 공화국',
    enName: 'Dutch Republic (United Provinces)',
    description: '1581년 "면직 선언"을 통해 스페인 왕 펠리페 2세의 주권을 부인하고 독립을 선언한 북부 7개 주(홀란트·제일란트·위트레흐트·프리슬란트·흐로닝언·오버레이셀·헬더를란트)의 연합 공화국. 오라녀 가문의 총독(스타트하우더)과 주 의회가 공동으로 통치하는 독특한 연방 공화국 체제를 수립했다. 17세기 "황금시대"에는 동인도회사(VOC)와 해운업을 기반으로 세계 최강의 해양·상업 강국이 되었고, 1795년 프랑스 혁명군의 침공으로 해체되었다.',
    startEra: 'AD', startYear: 1581,
    endEra: 'AD', endYear: 1795,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.08, longitude: 4.31,
    linkToIsoCodes: ['NL'],
  },
  {
    name: '스페인령 네덜란드',
    enName: 'Spanish Netherlands',
    description: '네덜란드 독립 전쟁(1568~1648) 중 스페인 편에 남은 남부 10개 주(플랑드르·브라반트·뤽상부르·에노·나무르 등)를 가리키는 합스부르크 스페인의 속령. 1585년 파르마 공작 알레산드로 파르네세의 안트베르펜 재정복으로 남부의 가톨릭 정체성이 확립되었으며, 1648년 베스트팔렌 조약으로 스페인 왕권 아래 공식 인정되었다. 스페인 왕위계승전쟁의 결과 1713년 위트레흐트 조약으로 오스트리아 합스부르크에게 이양될 때까지 남부 저지대의 정치적 핵심이었다.',
    startEra: 'AD', startYear: 1581,
    endEra: 'AD', endYear: 1714,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.85, longitude: 4.35,
    linkToIsoCodes: ['BE'],
  },
  {
    name: '오스트리아령 네덜란드',
    enName: 'Austrian Netherlands',
    description: '1714년 라슈타트 조약으로 스페인령 남부 네덜란드가 오스트리아 합스부르크에 이양되면서 성립한 속령. 카를 6세·마리아 테레지아·요제프 2세가 차례로 군주로 통치하였으며, 계몽군주 요제프 2세의 급진 개혁 정책은 브라반트 혁명(1789~1790)을 촉발시키기도 했다. 1795년 프랑스 혁명전쟁 중 캠포 포르미오 조약으로 프랑스에 공식 병합되어 소멸하였다.',
    startEra: 'AD', startYear: 1714,
    endEra: 'AD', endYear: 1795,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.85, longitude: 4.35,
    linkToIsoCodes: ['BE'],
  },

  // ── 혁명·나폴레옹기 ───────────────────────────────────────────────
  {
    name: '바타비아 공화국',
    enName: 'Batavian Republic',
    description: '1795년 프랑스 혁명군이 네덜란드 공화국을 점령한 뒤 애국파(Patriotten)가 수립한 프랑스 혁명 사상을 모방한 단일 공화국. 연방제를 폐지하고 중앙집권적 헌법(1798)을 채택하였으며, 프랑스의 자매 공화국으로서 군사·재정적으로 프랑스에 종속되었다. 1806년 나폴레옹이 동생 루이 보나파르트를 국왕으로 앉혀 홀란트 왕국으로 개편하면서 해체되었다.',
    startEra: 'AD', startYear: 1795,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.08, longitude: 4.31,
    linkToIsoCodes: ['NL'],
  },
  {
    name: '홀란트 왕국',
    enName: 'Kingdom of Holland',
    description: '1806년 나폴레옹이 바타비아 공화국을 폐지하고 동생 루이 보나파르트를 국왕으로 앉혀 수립한 괴뢰 왕국. 루이 1세는 네덜란드인의 이익을 옹호하려 나폴레옹의 대륙봉쇄령을 느슨하게 집행하였고, 이에 불만을 품은 나폴레옹은 1810년 왕국을 해체하고 네덜란드를 프랑스 제국에 직접 병합하였다. 1813년 프랑스가 패퇴하면서 네덜란드는 오라녀 가문의 왕실 아래 재건되었다.',
    startEra: 'AD', startYear: 1806,
    endEra: 'AD', endYear: 1810,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.08, longitude: 4.31,
    linkToIsoCodes: ['NL'],
  },

  // ── 빈 체제: 네덜란드 연합왕국 ─────────────────────────────────────
  {
    name: '네덜란드 연합왕국',
    enName: 'United Kingdom of the Netherlands',
    description: '1815년 빈 회의 결의로 프랑스의 재발흥을 견제하기 위해 옛 네덜란드 공화국·남부 네덜란드(구 오스트리아령)·룩셈부르크를 하나로 묶어 수립된 왕국. 오라녀-나사우 가문의 빌럼 1세가 초대 국왕으로 즉위했으며, 단일 헌법·의회·화폐를 갖춘 입헌군주국으로 운영되었다. 그러나 개신교 북부와 가톨릭 남부의 종교·언어·경제적 이질성이 심화되어 1830년 벨기에 혁명으로 분열, 1839년 런던 조약으로 공식적으로 해체되었다.',
    startEra: 'AD', startYear: 1815,
    endEra: 'AD', endYear: 1839,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.08, longitude: 4.31,
    linkToIsoCodes: ['BE', 'NL'],
  },

  // ── 현대로 이어지는 왕국 ──────────────────────────────────────────
  {
    name: '벨기에 왕국',
    enName: 'Kingdom of Belgium',
    description: '1830년 8월 브뤼셀 혁명으로 네덜란드 연합왕국에서 분리 독립을 선언하고, 1831년 작센-코부르크 고타 가문의 레오폴드 1세를 초대 국왕으로 즉위시켜 수립된 입헌군주국. 열강의 조정을 거쳐 1839년 런던 조약으로 영세 중립국 지위와 국경이 국제적으로 보장되었다. 제1·2차 세계대전 당시 독일의 침공을 받았으며, 전후 베네룩스·유럽연합·북대서양조약기구의 창립 회원국으로서 유럽 통합의 중심지가 되었다.',
    startEra: 'AD', startYear: 1830,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.85, longitude: 4.35,
    linkToIsoCodes: ['BE'],
  },
  {
    name: '네덜란드 왕국',
    enName: 'Kingdom of the Netherlands',
    description: '1839년 런던 조약으로 벨기에의 분리가 공식화되면서 북부 지역만을 영토로 하여 재정립된 입헌군주국. 오라녀-나사우 가문이 왕위를 계승하며, 1848년 토르베커가 주도한 자유주의 헌법 개정으로 근대적 의회 민주주의를 확립했다. 20세기 들어 식민지(인도네시아 등)의 독립을 경험하였고, 오늘날까지 카리브해의 아루바·퀴라소·신트마르턴과 함께 복합적 왕국(Koninkrijk der Nederlanden)을 구성한다.',
    startEra: 'AD', startYear: 1839,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.08, longitude: 4.31,
    linkToIsoCodes: ['NL'],
  },
]

export async function seedBeneluxHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇳🇱🇧🇪 베네룩스 관련 역사 국가 시딩 시작...')

  const isoToModernId = new Map<string, string>()
  const allIsoCodes = new Set(ENTRIES.flatMap((e) => e.linkToIsoCodes))
  for (const isoCode of allIsoCodes) {
    const country = await prisma.country.findFirst({
      where: { isoCode },
      select: { id: true },
    })
    if (country) {
      isoToModernId.set(isoCode, country.id)
    } else {
      console.warn(`  ⚠️  현대 국가를 찾을 수 없음: ${isoCode}`)
    }
  }

  for (const entry of ENTRIES) {
    const existing = await prisma.historicalCountry.findFirst({
      where: { name: entry.name },
    })

    let id: string

    if (existing) {
      id = existing.id
      console.log(`  ⏭️  ${entry.name}`)
    } else {
      const created = await prisma.historicalCountry.create({
        data: {
          name: entry.name,
          enName: entry.enName,
          description: entry.description,
          startEra: entry.startEra as any,
          startYear: entry.startYear,
          startMonth: entry.startMonth,
          endEra: entry.endEra as any,
          endYear: entry.endYear,
          endMonth: entry.endMonth,
          stateType: entry.stateType,
          entityKind: entry.entityKind,
          latitude: entry.latitude,
          longitude: entry.longitude,
          accountId: ACCOUNT_ID,
        },
      })
      id = created.id
      console.log(`  ✅ ${entry.name}`)
    }

    for (const isoCode of entry.linkToIsoCodes) {
      const modernCountryId = isoToModernId.get(isoCode)
      if (!modernCountryId) continue

      const linkExists = await prisma.historicalCountryModernCountry.findFirst({
        where: { historicalCountryId: id, modernCountryId },
      })
      if (!linkExists) {
        await prisma.historicalCountryModernCountry.create({
          data: { historicalCountryId: id, modernCountryId },
        })
      }
    }
  }

  console.log(`✅ 베네룩스 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
