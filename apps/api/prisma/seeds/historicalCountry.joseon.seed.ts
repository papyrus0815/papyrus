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
  startDay?: number
  endEra?: Era
  endYear?: number
  endMonth?: number
  endDay?: number
  stateType: HistoricalStateType
  entityKind?: HistoricalEntityKind
  latitude?: number
  longitude?: number
  linkToIsoCodes: string[]
}

/**
 * 조선 왕조 배치
 *
 * ⚠️⚠️ 절대 혼동 금지 ⚠️⚠️
 *   선재 행 '조선민주주의인민공화국'(686c74a4-ec05-44a8-aa64-088dc069f355, AD1948~, REPUBLIC)은
 *   이 배치와 **완전히 무관한 별개 행**이다. 아래 멱등 판정은 전부 name 완전 일치(Prisma equals =)로
 *   이루어지므로 '조선' 조회가 북한 행을 잡을 일은 없다. 훗날 이 파일을 손볼 때도
 *   LIKE '%조선%' 류의 부분 일치 검색을 절대 도입하지 말 것.
 *
 * 행 선정 근거
 * - '조선'이 본 배치의 목적(관직 정의 국가 스코프의 앵커)이지만, 조선만 단독으로 넣으면
 *   존속 종료(1897-10-12)의 후속이 코퍼스에 없어 계승 사슬이 끊긴 고아 행이 된다.
 *   그래서 시간축 직전·직후인 '고려'와 '대한제국'을 같은 배치로 함께 만든다
 *   (고려 → 조선 → 대한제국 → 일본 제국(선재 행, cc7d649d…)으로 사슬이 닫힌다).
 * - 실사 결과 조선·대한제국·고려·신라·백제·고구려·발해 어느 것도 historical_country에 없었다.
 *   이 배치는 그중 조선 사슬 3행만 담당하고 고대(삼국·발해·고조선)는 별도 배치로 미룬다.
 *
 * 기각한 별도 행 후보
 * - '고조선(단군조선)': 국호 '조선'의 어원이지만 존속 연대·국가성 논쟁이 커 별도 배치로 미룬다.
 *   같은 파일에 넣으면 '조선' 행과 이름이 유사해 오배선 위험도 있다.
 * - '대한민국 임시정부'(1919~1945): 망명 정부라 코퍼스의 STATE 판정 기준과 별개 논의가 필요하고,
 *   대한민국(KR)·조선민주주의인민공화국(선재 행) 어느 쪽으로 잇느냐가 제품 결정 사안이다.
 * - '조선총독부 통치기'(1910~1945) PERIOD 행: 오스만 속주를 행으로 만들지 않는 코퍼스 관행과
 *   동형으로 기각. 시간축은 '대한제국 → 일본 제국' CONQUEST 엣지가 잇는다.
 *
 * 날짜 정밀도 규약
 * - 조선 건국(음 1392-07-17 이성계 즉위)·고려 건국(음 918-06)·고려 멸망(음 1392-07)은 전부
 *   음력 날짜라 양력 컬럼에 그대로 넣으면 달력이 뒤섞인다. 그래서 **연도만** 채우고 정확한
 *   날짜는 아래 주석·description에만 남긴다(청나라 선재 행이 start_month NULL인 판례와 동형).
 * - 반대로 대한제국 선포(1897-10-12)와 병합(1910-08-29)은 조선이 1896-01-01부터 태양력을
 *   채택한 뒤의 날짜라 양력으로 확정된다. 이때만 month·day를 채운다.
 */
const ENTRIES: HistoricalCountryEntry[] = [
  {
    name: '고려',
    enName: 'Goryeo',
    nameOrigin:
      "국호 '고려(高麗)'는 고구려의 약칭에서 왔다. 궁예가 901년 세운 후고구려의 국호를 " +
      '왕건이 918년 그대로 이어받아 고구려 계승을 표방한 것이다. ' +
      "송·아랍 상인을 통해 서방에 전해진 이 이름이 'Corea/Korea'의 어원이 되었다.",
    description:
      '918년 왕건이 궁예를 축출하고 즉위해 세운 왕조로, 이듬해 자신의 근거지 송악(개경, 현 개성)으로 도읍을 옮겼다. ' +
      '935년 신라 경순왕의 항복과 936년 후백제 격파로 후삼국을 통일했다. ' +
      '광종의 과거제 도입(958)과 성종의 유교 정치 이념 확립으로 중앙집권 관료제를 갖추었고, ' +
      '대외적으로는 거란·여진과 잇달아 충돌하면서 서희의 담판(993)으로 강동 6주를 확보하고 귀주대첩(1019)으로 거란의 침입을 물리쳤다. ' +
      '1170년 무신정변 이후 최씨 정권의 무신 집권기가 이어졌고, 1231년부터 여섯 차례에 걸친 몽골 침입 끝에 ' +
      '1270년 개경 환도로 원의 부마국 체제에 편입되었으며 삼별초의 항쟁도 1273년 진압되었다. ' +
      '공민왕의 반원 개혁 이후 홍건적·왜구의 침입과 권문세족·신진사대부의 대립이 겹쳤고, ' +
      '1388년 위화도 회군으로 실권을 잡은 이성계가 1392년 공양왕을 폐위하면서 474년 만에 막을 내렸다. ' +
      '초조·재조대장경(팔만대장경)과 금속활자, 상감청자, 벽란도를 통한 개방적 해상 교역이 이 시대를 대표한다.',
    // 음 918-06 왕건 즉위(철원) / 음 1392-07 공양왕 폐위. 음력이라 연도만 채운다.
    startEra: 'AD', startYear: 918,
    endEra: 'AD', endYear: 1392,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    // 개경 만월대(현 개성)
    latitude: 37.9722, longitude: 126.5478,
    // 강역이 한반도 전체이고 수도 개경이 현 북한 소재라 KR·KP 양쪽.
    // (실사 시점 country 테이블에 KP 행이 없어 KP는 경고 후 skip된다 — 아래 주석 참조)
    linkToIsoCodes: ['KR', 'KP'],
  },
  {
    name: '조선',
    enName: 'Joseon',
    nameOrigin:
      "국호 '조선(朝鮮)'은 단군·기자의 고조선을 잇는다는 계승 의식에서 나왔다. " +
      "1392년 즉위 직후에도 국호를 고려로 둔 채 명에 '조선'과 이성계의 본향인 '화령(和寧)' 두 안을 올렸고, " +
      "1393년 명 태조가 '조선'을 낙점하면서 확정되었다. 정식 국호는 조선국(朝鮮國)이며 " +
      "군주의 공식 칭호는 국왕이다. '아침 해가 빛나는 땅'이라는 풀이는 한자 훈에 기댄 후대의 해석이다.",
    description:
      '1392년 위화도 회군으로 실권을 쥔 이성계(태조)가 고려 공양왕을 폐하고 개경 수창궁에서 즉위해 세운 왕조로, ' +
      '1394년 한양(한성)으로 천도해 경복궁을 짓고 1395년 종묘·사직을 갖추며 새 수도를 완성했다. ' +
      '전주 이씨가 27대 519년을 이어간 군주국이며, 성리학을 국시로 삼아 과거제로 충원한 양반 관료제와 ' +
      '의정부·육조 체제를 운영했고 1485년 시행된 경국대전으로 통치 규범을 법전화했다. ' +
      '세종 대에 훈민정음이 창제(1443)·반포(1446)되고 측우기·자격루 등 과학 기술이 융성했다. ' +
      '대외적으로는 명에 사대하고 여진·일본과 교린하는 틀을 유지했으나, ' +
      '1592~1598년 임진왜란과 1627년 정묘호란·1636년 병자호란으로 국토가 황폐해졌고 ' +
      '1637년 삼전도의 항복으로 청과 조공·책봉 관계를 맺었다. ' +
      '영·정조 대의 탕평과 실학을 거쳐 19세기에는 세도정치와 삼정의 문란으로 흔들렸고, ' +
      '1876년 강화도조약으로 개항한 뒤 임오군란·갑신정변·동학농민운동이 잇따랐다. ' +
      '1894년 갑오개혁과 1895년 시모노세키 조약으로 청과의 종속 관계가 끊긴 뒤, ' +
      '1897년 10월 12일 고종이 황제로 즉위하고 국호를 대한으로 고치면서 조선이라는 국호는 505년 만에 막을 내렸다.',
    // 음 1392-07-17 태조 즉위(개경 수창궁). 음력이라 연도만 채운다.
    startEra: 'AD', startYear: 1392,
    // 1897-10-12 환구단 황제 즉위·대한제국 선포(태양력 채택 이후라 양력 확정)
    endEra: 'AD', endYear: 1897, endMonth: 10, endDay: 12,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    // 한성 경복궁
    latitude: 37.5796, longitude: 126.977,
    // 한반도 전체를 강역으로 하므로 남북 양쪽을 계승 국가로 본다.
    linkToIsoCodes: ['KR', 'KP'],
  },
  {
    name: '대한제국',
    enName: 'Korean Empire',
    nameOrigin:
      "'대한(大韓)'의 '한(韓)'은 마한·진한·변한 삼한을 가리킨다. 고종은 우리나라가 곧 삼한의 땅이며 " +
      "국초에 이를 하나로 아울렀으니 '대한'이라 함이 마땅하다는 논의를 받아들여 국호를 정했다. " +
      "'조선'이 기자 책봉에서 유래한 이름으로 여겨져 자주 독립 제국의 국호로 부적당하다는 인식도 함께 작용했다. " +
      '연호는 광무(光武), 영문 국호는 Empire of Korea다.',
    description:
      '1897년 10월 12일 고종이 환구단에서 황제로 즉위하고 국호를 대한, 연호를 광무로 정하면서 성립한 제국이다. ' +
      '1895년 시모노세키 조약으로 청과의 조공·책봉 관계가 끊기고 아관파천에서 환궁한 고종이 ' +
      '자주 독립국의 위상을 대내외에 선포한 것으로, 조선 왕조의 국체를 황제국으로 격상한 것이지 왕조 자체가 바뀐 것은 아니다. ' +
      '광무개혁으로 양전·지계 사업과 근대 상공업 육성, 원수부 중심의 군제 개편을 추진했고 ' +
      '1899년 대한국 국제를 반포해 황제의 전제권을 명문화했다. ' +
      '그러나 1904년 러일전쟁 발발과 한일의정서에 이어 1905년 을사늑약으로 외교권을 잃고 통감부가 설치되었으며, ' +
      '1907년 헤이그 특사 사건을 빌미로 고종이 강제 퇴위당하고 정미조약으로 군대가 해산되었다. ' +
      '1910년 8월 22일 조인되고 8월 29일 공포된 한일병합조약으로 13년 만에 소멸했다.',
    startEra: 'AD', startYear: 1897, startMonth: 10, startDay: 12,
    // 1910-08-29 병합조약 공포·발효일(조인은 8/22)
    endEra: 'AD', endYear: 1910, endMonth: 8, endDay: 29,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    // 황궁 경운궁(현 덕수궁)
    latitude: 37.5658, longitude: 126.9751,
    linkToIsoCodes: ['KR', 'KP'],
  },
]

/**
 * 이 배치는 EXTRA_MODERN_LINKS(타 시드 소유 HC에 현대국가 링크만 보강)와
 * PREEXISTING_BACKFILL(UI 생성 선재 행의 NULL 필드 백필)을 의도적으로 두지 않는다.
 * - 선재 행 '조선민주주의인민공화국'은 account_id·현대국가 링크가 모두 비어 있지만
 *   이 배치의 소관이 아니고(별개 행), 링크 대상인 KP가 country 테이블에 없어 손댈 것이 없다.
 * - 선재 행 '청나라'·'일본 제국'은 각각 CN·JP 링크를 이미 갖고 있어 보강할 것이 없다.
 */

export async function seedJoseonHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇰🇷 조선 왕조 관련 역사 국가 시딩 시작...')

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
      // KP는 실사 시점 country 테이블에 없다. 훗날 북한이 현대 국가로 등록되면
      // 이 시드를 재실행하는 것만으로 링크가 additive하게 채워진다.
      console.warn(`  ⚠️  현대 국가를 찾을 수 없음: ${isoCode}`)
    }
  }

  for (const entry of ENTRIES) {
    // 자연키 = name 완전 일치. '조선'으로 조회해도 '조선민주주의인민공화국'은 잡히지 않는다.
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
          startDay: entry.startDay,
          endEra: entry.endEra,
          endYear: entry.endYear,
          endMonth: entry.endMonth,
          endDay: entry.endDay,
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
        console.log(`  🔗 ${entry.name} ← 현대 ${isoCode} 연결`)
      }
    }
  }

  console.log(`✅ 조선 왕조 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
