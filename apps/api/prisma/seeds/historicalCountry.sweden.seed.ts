import { Era, HistoricalEntityKind, HistoricalStateType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

interface HistoricalCountryEntry {
  name: string
  enName?: string
  nameOrigin?: string
  description?: string
  startEra?: Era
  startYear?: number
  startMonth?: number
  endEra?: Era
  endYear?: number
  endMonth?: number
  stateType: HistoricalStateType
  entityKind?: HistoricalEntityKind
  latitude?: number
  longitude?: number
  linkToIsoCodes: string[]
}

const ENTRIES: HistoricalCountryEntry[] = [
  // ── 본체: 끊이지 않은 왕국 ────────────────────────────────────────
  {
    name: '스웨덴 왕국',
    enName: 'Kingdom of Sweden',
    nameOrigin:
      '스웨덴어 "스베리예(Sverige)"는 고대 노르드어 "스베아 리케(Svea rike)" 곧 "스베아인(Svear)의 나라"에서 왔다. ' +
      '멜라렌 호 일대에 살던 스베아인이 남쪽의 예타인(Götar)을 아우르며 왕국의 핵을 이루었고, ' +
      '오늘날 국왕의 정식 칭호에 남은 "스베아인과 예타인의 왕"이라는 표현이 그 이중 기원을 보여준다.',
    description:
      '970년경 에리크 세게르셀이 멜라렌 호 일대의 스베아인을 규합하고, 그 아들 올로프 셰트코눙이 ' +
      '스베아인과 예타인 양쪽의 왕으로 인정받으며(1000년경) 틀을 갖춘 북유럽 왕국. 웁살라가 오랜 제사·왕권의 중심이었다. ' +
      '1397년 칼마르 동맹에 들어갔다가 1523년 구스타브 바사가 국왕으로 선출되며 이탈해 독자 노선을 걸었고, ' +
      '17세기에는 발트해를 "스웨덴의 호수"로 만든 대국 시대(스웨덴 제국)를 누렸다. ' +
      '1721년 니스타드 조약으로 발트 속령을, 1809년 프레드릭스함 조약으로 핀란드를 잃었으나, ' +
      '1814~1905년 노르웨이와의 동군연합을 거쳐 왕조가 끊이지 않고 오늘날까지 존속하는 입헌군주국이다.',
    startEra: 'AD', startYear: 970,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 59.33, longitude: 18.07,
    linkToIsoCodes: ['SE'],
  },

  // ── 대국 시대(스토르마크츠티덴) ───────────────────────────────────
  {
    name: '스웨덴 제국',
    enName: 'Swedish Empire',
    nameOrigin:
      '스웨덴어로는 "대국 시대(Stormaktstiden)"라 부르며, 발트해 연안을 두른 영역 국가로서의 스웨덴을 가리킨다. ' +
      '황제를 둔 적은 없고 국왕이 다스린 왕국이지만, 발트해 제해권을 쥔 광역 지배를 가리켜 관례적으로 제국이라 옮긴다.',
    description:
      '1611년 구스타브 2세 아돌프의 즉위로 열린 스웨덴의 전성기. 30년 전쟁에 신교 진영의 맹주로 뛰어들어 ' +
      '뤼첸·브라이텐펠트에서 이름을 떨쳤고, 1648년 베스트팔렌 조약으로 포메라니아를 얻어 신성로마제국의 제후 지위까지 겸했다. ' +
      '핀란드·에스토니아·리보니아·잉그리아·포메라니아를 아울러 발트해를 내해로 삼았으며, ' +
      '크리스티나 여왕·칼 10세 구스타브·칼 12세로 이어지는 군사 왕정이 이 시대를 대표한다. ' +
      '1700년 시작된 대북방전쟁에서 폴타바 패전(1709)으로 기세가 꺾였고, ' +
      '1721년 니스타드 조약으로 발트 속령 대부분을 러시아에 넘기며 대국 시대는 막을 내렸다. ' +
      '같은 스웨덴 왕국의 한 시대이므로 왕국 행과 겹쳐 등록한다(대영제국 전례).',
    startEra: 'AD', startYear: 1611,
    endEra: 'AD', endYear: 1721, endMonth: 9,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 59.33, longitude: 18.07,
    linkToIsoCodes: ['SE'],
  },

  // ── 노르웨이와의 동군연합 ─────────────────────────────────────────
  {
    name: '스웨덴-노르웨이 연합',
    enName: 'United Kingdoms of Sweden and Norway',
    nameOrigin:
      '두 왕국이 각자의 헌법과 의회를 유지한 채 국왕만 공유했으므로 "연합 왕국들(Förenade konungarikena)"이라 복수로 불렸다.',
    description:
      '1814년 킬 조약으로 덴마크가 노르웨이를 스웨덴에 할양하자, 독립을 선언한 노르웨이가 ' +
      '모스 협약을 거쳐 같은 해 11월 스웨덴 국왕 칼 13세를 자국 국왕으로 선출하며 성립한 동군연합. ' +
      '노르웨이는 에이스볼 헌법과 스토르팅(의회)을 유지했고 외교권만 스웨덴이 대표했다. ' +
      '19세기 후반 노르웨이의 영사권 요구를 둘러싼 갈등이 커져 1905년 6월 스토르팅이 연합 해체를 선언했고, ' +
      '같은 해 10월 카를스타드 협약으로 스웨덴이 이를 승인하면서 평화적으로 해체되었다.',
    startEra: 'AD', startYear: 1814, startMonth: 11,
    endEra: 'AD', endYear: 1905, endMonth: 10,
    stateType: HistoricalStateType.PERSONAL_UNION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 59.33, longitude: 18.07,
    linkToIsoCodes: ['SE', 'NO'],
  },

  // ── 발트해 건너편 속령 ────────────────────────────────────────────
  {
    name: '스웨덴령 에스토니아',
    enName: 'Swedish Estonia',
    nameOrigin:
      '스웨덴어 "에스틀란드 공국(Hertigdömet Estland)". 리보니아 전쟁 중 스웨덴 왕관에 복속한 에스토니아 북부를 가리킨다.',
    description:
      '1561년 리보니아 검의 형제 기사단이 무너지는 와중에 레발(탈린)과 에스토니아 북부 귀족이 ' +
      '스웨덴 국왕 에리크 14세에게 복속하며 성립한 스웨덴 왕관령 공국. ' +
      '스웨덴은 귀족의 자치와 루터파 교회 조직을 인정하는 대신 발트해 교역로를 장악했고, ' +
      '1632년 구스타브 2세 아돌프가 타르투 대학(아카데미아 구스타비아나)을 세워 후대 에스토니아인이 ' +
      '이 시기를 "좋은 스웨덴 시절"로 기억하게 했다. 대북방전쟁에서 러시아군에 넘어가 ' +
      '1721년 니스타드 조약으로 러시아 제국에 정식 이양되었다.',
    startEra: 'AD', startYear: 1561,
    endEra: 'AD', endYear: 1721, endMonth: 9,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 59.44, longitude: 24.75,
    linkToIsoCodes: ['EE'],
  },
  {
    name: '스웨덴령 리보니아',
    enName: 'Swedish Livonia',
    nameOrigin:
      '리보니아(Livonia)는 리가 만 연안에 살던 핀우그리아계 리브인(Līvi)에서 딴 이름으로, ' +
      '오늘날 라트비아 북부와 에스토니아 남부에 걸친 옛 기사단령 일대를 가리켰다.',
    description:
      '1629년 알트마르크 휴전으로 스웨덴이 폴란드-리투아니아 연방에게서 빼앗아 다스린 리가 이북의 리보니아. ' +
      '1621년 구스타브 2세 아돌프가 리가를 함락한 것이 시작이었고, 1660년 올리바 조약으로 영유가 확정되었다. ' +
      '칼 11세의 영지 환수(리덕치온)로 발트 독일계 귀족의 대농장을 왕령으로 거둬들이면서 귀족의 반발을 샀고, ' +
      '이때 망명한 요한 파트쿨이 대북방전쟁의 반스웨덴 동맹을 부추겼다. ' +
      '1710년 리가 항복에 이어 1721년 니스타드 조약으로 러시아 제국에 이양되었다.',
    startEra: 'AD', startYear: 1629,
    endEra: 'AD', endYear: 1721, endMonth: 9,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 56.95, longitude: 24.11,
    linkToIsoCodes: ['LV', 'EE'],
  },
  {
    name: '스웨덴령 포메라니아',
    enName: 'Swedish Pomerania',
    nameOrigin:
      '포메라니아(Pommern)는 슬라브어 "포 모제(po morze)" 곧 "바다 곁의 땅"에서 유래했다.',
    description:
      '1630년 구스타브 2세 아돌프가 30년 전쟁에 개입하며 상륙한 발트해 남안의 영토로, ' +
      '슈테틴 조약과 1648년 베스트팔렌 조약을 거쳐 스웨덴 국왕이 포메라니아 공작으로서 다스렸다. ' +
      '스웨덴 국왕은 이 영지 덕분에 신성로마제국의 제후로서 제국의회에 자리를 얻었다. ' +
      '1720년 스톡홀름 조약으로 오데르강 동쪽(전포메른)을 프로이센에 넘겼고, ' +
      '나폴레옹 전쟁 뒤 1815년 빈 회의에서 남은 서포메른마저 프로이센에 양도되면서 소멸했다. ' +
      '스웨덴 본국보다 앞서 농노제를 폐지한 곳이자, 대륙에 남은 스웨덴의 마지막 발판이었다.',
    startEra: 'AD', startYear: 1630,
    endEra: 'AD', endYear: 1815,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 54.31, longitude: 13.09,
    linkToIsoCodes: ['DE', 'PL'],
  },

  // ── 신대륙 식민지 ─────────────────────────────────────────────────
  {
    name: '신스웨덴',
    enName: 'New Sweden',
    nameOrigin:
      '스웨덴어 "뉘아 스베리예(Nya Sverige)" — 본국의 이름을 그대로 옮겨 붙인 신대륙 식민지라는 뜻이다.',
    description:
      '1638년 신스웨덴 회사가 델라웨어강 어귀에 크리스티나 요새(오늘날 윌밍턴)를 세우며 시작된 북아메리카 식민지. ' +
      '초대 총독은 네덜란드 서인도회사를 떠난 페터르 미노이트였고, 스웨덴인과 핀란드인이 이주해 ' +
      '통나무집(log cabin) 건축을 북아메리카에 전한 것으로 알려져 있다. ' +
      '모피 교역과 담배를 노렸으나 규모가 작아 오래 버티지 못했고, ' +
      '1655년 뉴네덜란드 총독 페터르 스토이베산트의 원정에 항복해 네덜란드 공화국에 병합되었다.',
    startEra: 'AD', startYear: 1638, startMonth: 3,
    endEra: 'AD', endYear: 1655, endMonth: 9,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 39.74, longitude: -75.55,
    linkToIsoCodes: ['US'],
  },

  // ── 스웨덴이 잃은 동쪽 절반 ───────────────────────────────────────
  {
    name: '핀란드 대공국',
    enName: 'Grand Duchy of Finland',
    nameOrigin:
      '스웨덴 시대부터 쓰이던 명목 칭호 "핀란드 대공(Storfurstendömet Finland)"을 러시아 황제가 이어받아 실제 국호로 삼았다.',
    description:
      '1809년 핀란드 전쟁에서 스웨덴이 패해 프레드릭스함 조약으로 핀란드를 러시아에 넘기면서 세워진 자치국. ' +
      '알렉산드르 1세는 포르보 의회에서 스웨덴 시대의 법률과 루터파 교회, 신분제 의회를 그대로 인정했고, ' +
      '러시아 황제가 핀란드 대공을 겸하는 형태로 통치했다. 수도는 투르쿠에서 헬싱키로 옮겨졌다. ' +
      '600여 년 이어진 스웨덴 통치에서 떨어져 나온 이 시기에 핀란드어 문어와 민족 서사시 『칼레발라』가 정비되며 ' +
      '핀란드 민족의식이 자라났고, 19세기 말 러시아화 정책에 맞선 저항을 거쳐 ' +
      '1917년 러시아 혁명의 혼란 속에 독립을 선언했다.',
    startEra: 'AD', startYear: 1809, startMonth: 3,
    endEra: 'AD', endYear: 1917, endMonth: 12,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 60.17, longitude: 24.94,
    linkToIsoCodes: ['FI'],
  },
]

export async function seedSwedenHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇸🇪 스웨덴 관련 역사 국가 시딩 시작...')

  const isoToModernId = new Map<string, string>()
  const allIsoCodes = new Set(ENTRIES.flatMap((entry) => entry.linkToIsoCodes))
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
          nameOrigin: entry.nameOrigin,
          description: entry.description,
          startEra: entry.startEra,
          startYear: entry.startYear,
          startMonth: entry.startMonth,
          endEra: entry.endEra,
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

  console.log(`✅ 스웨덴 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
