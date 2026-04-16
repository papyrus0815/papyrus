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
  /** 연결할 현대 국가 ISO 코드 목록 */
  linkToIsoCodes: string[]
}

const ENTRIES: HistoricalCountryEntry[] = [
  // ── 중세 세르비아 ─────────────────────────────────────────────────
  {
    name: '라슈카 공국',
    enName: 'Principality of Raška',
    description: '8~9세기 발칸 반도에 정착한 세르비아인들이 세운 초기 국가. 비잔티움 제국의 영향 아래 있었으나 점차 독자적인 세력을 구축하였으며, 네만야 왕조의 스테판 네만야 대공이 12세기에 독립을 이루고 세르비아 중세 왕국의 기반을 닦았다.',
    startEra: 'AD', startYear: 768,
    endEra: 'AD', endYear: 1217,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 43.3, longitude: 20.9,
    linkToIsoCodes: ['RS'],
  },
  {
    name: '세르비아 왕국',
    enName: 'Kingdom of Serbia',
    description: '1217년 스테판 프르보벤차니가 교황으로부터 왕관을 받아 수립한 왕국. 성 사바(성 사바)가 세르비아 정교회를 독립 대주교구로 창설하였으며, 14세기 스테판 두샨 치세에 제국으로 발전하였다.',
    startEra: 'AD', startYear: 1217,
    endEra: 'AD', endYear: 1346,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 43.3, longitude: 21.9,
    linkToIsoCodes: ['RS'],
  },
  {
    name: '세르비아 제국',
    enName: 'Serbian Empire',
    description: '1346년 스테판 두샨이 황제 칭호를 선포하여 수립한 제국. 발칸 반도 최대 세력으로 성장하여 비잔티움 제국을 위협하였으나, 1371년 마리차 전투에서 오스만 제국에 패배하며 급속히 분열되었다.',
    startEra: 'AD', startYear: 1346,
    endEra: 'AD', endYear: 1371,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.7, longitude: 21.2,
    linkToIsoCodes: ['RS'],
  },
  {
    name: '세르비아 전제공국',
    enName: 'Serbian Despotate',
    description: '세르비아 제국 붕괴 후 스테판 라자레비치가 1402년 수립한 국가. 오스만 제국의 압박 속에서도 문화·예술이 번영하였으나, 1459년 스멜데레보 함락으로 오스만에 완전 병합되어 세르비아 중세 국가의 막을 내렸다.',
    startEra: 'AD', startYear: 1402,
    endEra: 'AD', endYear: 1459,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.7, longitude: 20.9,
    linkToIsoCodes: ['RS'],
  },

  // ── 근대 세르비아 ─────────────────────────────────────────────────
  {
    name: '세르비아 공국',
    enName: 'Principality of Serbia',
    description: '1817년 밀로시 오브레노비치가 오스만 제국으로부터 자치권을 획득하여 수립한 공국. 두 차례의 세르비아 봉기(1804, 1815) 결과로 탄생하였으며, 1878년 베를린 조약으로 완전한 독립을 인정받고 1882년 왕국으로 격상되었다.',
    startEra: 'AD', startYear: 1817,
    endEra: 'AD', endYear: 1882,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.0, longitude: 21.0,
    linkToIsoCodes: ['RS'],
  },
  {
    name: '세르비아 왕국 (근대)',
    enName: 'Kingdom of Serbia (Modern)',
    description: '1882년 밀란 오브레노비치가 왕을 칭하며 수립한 근대 왕국. 두 차례의 발칸 전쟁(1912~1913)에서 승리하여 영토를 크게 확장하였으며, 1914년 사라예보 사건이 제1차 세계대전의 도화선이 되었다. 1918년 종전 후 슬라브 민족 통합 왕국 창설에 핵심 역할을 하였다.',
    startEra: 'AD', startYear: 1882,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.8, longitude: 20.5,
    linkToIsoCodes: ['RS'],
  },

  // ── 유고슬라비아 ──────────────────────────────────────────────────
  {
    name: '세르비아-크로아티아-슬로베니아 왕국',
    enName: 'Kingdom of Serbs, Croats and Slovenes',
    description: '1918년 제1차 세계대전 종전 직후 남슬라브 민족이 통합하여 수립한 왕국. 세르비아 왕국, 몬테네그로 왕국, 오스트리아-헝가리 제국 내 남슬라브 지역이 합쳐졌으며, 1929년 유고슬라비아 왕국으로 개칭되었다.',
    startEra: 'AD', startYear: 1918,
    endEra: 'AD', endYear: 1929,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.8, longitude: 20.5,
    linkToIsoCodes: ['RS'],
  },
  {
    name: '유고슬라비아 왕국',
    enName: 'Kingdom of Yugoslavia',
    description: '1929년 알렉산다르 1세가 독재를 선언하며 국명을 유고슬라비아(남슬라브인의 땅)로 개칭한 왕국. 1941년 추축국의 침공으로 분할 점령되었으나, 요시프 브로즈 티토의 파르티잔이 해방 전쟁을 이끌어 1945년 사회주의 연방 국가로 재건되었다.',
    startEra: 'AD', startYear: 1929,
    endEra: 'AD', endYear: 1945,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.8, longitude: 20.5,
    linkToIsoCodes: ['RS'],
  },
  {
    name: '유고슬라비아 사회주의 연방 공화국',
    enName: 'Socialist Federal Republic of Yugoslavia',
    description: '1945년 티토가 수립한 사회주의 연방 국가. 소련의 영향권을 벗어나 독자적인 비동맹 노선을 걸었으며, 6개 공화국(슬로베니아·크로아티아·보스니아·세르비아·몬테네그로·마케도니아)으로 구성되었다. 1991~1992년 각 공화국들의 독립 선언으로 해체되었다.',
    startEra: 'AD', startYear: 1945,
    endEra: 'AD', endYear: 1992,
    stateType: HistoricalStateType.FEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.8, longitude: 20.5,
    linkToIsoCodes: ['RS'],
  },
  {
    name: '유고슬라비아 연방 공화국',
    enName: 'Federal Republic of Yugoslavia',
    description: '1992년 슬로베니아·크로아티아·보스니아·마케도니아가 독립한 후 세르비아와 몬테네그로가 잔류하여 수립한 연방 공화국. 보스니아 내전 개입과 코소보 분쟁으로 국제 제재를 받았으며, 2003년 세르비아 몬테네그로 연합으로 개편되었다.',
    startEra: 'AD', startYear: 1992,
    endEra: 'AD', endYear: 2003,
    stateType: HistoricalStateType.FEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.8, longitude: 20.5,
    linkToIsoCodes: ['RS'],
  },
  {
    name: '세르비아 몬테네그로',
    enName: 'Serbia and Montenegro',
    description: '2003년 유고슬라비아 연방 공화국을 계승하여 세르비아와 몬테네그로가 느슨한 연합체로 재편한 국가. 2006년 몬테네그로가 독립 투표를 통해 분리되면서 세르비아 공화국으로 이어졌다.',
    startEra: 'AD', startYear: 2003,
    endEra: 'AD', endYear: 2006,
    stateType: HistoricalStateType.FEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.0, longitude: 20.9,
    linkToIsoCodes: ['RS'],
  },
]

export async function seedSerbiaHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇷🇸 세르비아 관련 역사 국가 시딩 시작...')

  // ISO 코드 → 현대 국가 ID 캐시
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

    // 현대 국가 연결
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

  console.log(`✅ 세르비아 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
