/**
 * 카를 5세 (Charles V, Holy Roman Emperor, 1500~1558) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Dynasty/HistoricalCountry/Reign이 이미 있으면
 *    갱신하지 않고 스킵한다. (사용자 편집 보호)
 *
 * 합스부르크 가문의 정점에 도달한 16세기 유럽의 결정적 군주.
 * "해가 지지 않는 제국(empire on which the sun never sets)"이라는 표현이
 * 그의 영토를 가리켜 처음으로 사용된 인물.
 *
 * 인라인 생성:
 *  - 합스부르크 가문 (Dynasty)
 *  - 신성로마제국 (HistoricalCountry, 962~1806, 현대 독일 DE 연결)
 *
 * 등록 항목:
 *  - 합스부르크 가문 (Dynasty)
 *  - 신성로마제국 (HistoricalCountry)
 *  - DynastyRule x2 (합스부르크 → 신성로마제국, 합스부르크 → 합스부르크령 네덜란드)
 *  - 카를 5세 (Person — 합스부르크 가문 소속, 사망 정보 포함)
 *  - SovereignReign x3:
 *      ① 신성로마제국 신성로마황제 20대 카를 5세 (1519-06-28 ~ 1556-02-25, ABDICATION)
 *      ② 합스부르크령 네덜란드 공작 2대 카를 5세 (1506-09-25 ~ 1555-10-25, ABDICATION)
 *      ③ 카스티야 왕국 국왕 15대 카를로스 1세 (1516-01-23 ~ 1556-01-16, ABDICATION)
 *  - PersonCountryAffiliation x1 (합스부르크령 네덜란드 CITIZENSHIP)
 *  - PersonStats x1 (6축 능력치 — admin 평가)
 *
 * ⚠️ ③ 카스티야 왕국 HC는 person.charles-v-parents.seed에서 인라인 생성하므로
 *    parents 시드를 먼저 실행해야 ③이 등록된다.
 */
import {
  AppointmentMethod,
  DeathType,
  HistoricalEntityKind,
  HistoricalStateType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 카를 5세 인물 본문 ─────────────────────────────────────────────────────
const PERSON = {
  name: '카를',
  surname: '합스부르크',
  originalName: 'Charles V, Holy Roman Emperor',
  regnalName: '5세',
  birthYear: 1500,
  birthMonth: 2,
  birthDay: 24,
  deathYear: 1558,
  deathMonth: 9,
  deathDay: 21,
  birthPlaceText: '합스부르크령 네덜란드 헨트(Ghent) — 부르고뉴 백작의 궁(Prinsenhof)',
  deathPlaceText: '스페인 카스티야 유스테(Yuste) — 산 헤로니모 수도원',
  deathType: DeathType.ILLNESS,
  deathCause: '말라리아 발열 + 만성 통풍(podagra) 합병증',
  deathNote:
    '1556-09 유스테 산 헤로니모 수도원 은퇴 후 약 2년간 시계 수집·기도·신학 토론으로 시간을 보냄. ' +
    '1558-08 경 말라리아 발열 + 평생 시달린 통풍의 급격한 악화로 8월 말부터 사실상 거동 불능. ' +
    '의식 혼탁 상태에서도 간헐적으로 정신을 차려 유언장 보완 + 어머니 후아나·부인 이사벨라의 영혼을 위한 미사 봉헌. ' +
    '1558-09-21 새벽 약 2시 30분 사망(향년 58세). 임종 시 옆에 있던 톨레도 대주교 바르톨로메 카란사가 ' +
    '"십자가" 글자가 새겨진 양초를 손에 쥐어줌. 마지막 말은 "Ay, Jesús!"로 알려져 있다. ' +
    '\n\n' +
    '【부검·매장】 사망 직후 부검은 시행되지 않음. 시신은 처음 유스테 수도원 부속 성당 임시 안치, ' +
    '1574-01 아들 펠리페 2세가 새로 건립한 엘 에스코리알(El Escorial) 왕립 능묘로 이장. ' +
    '21세기 현재까지 엘 에스코리알 〈왕들의 판테온(Panteón de los Reyes)〉에 안치. ' +
    '\n\n' +
    '【사인 학술 평가】 21세기 의학사 연구(Pedraza et al., 2009 등)는 ' +
    '①말년 말라리아(이베리아 반도 풍토병 — 4가지 열대열원충 중 P. malariae 추정) ' +
    '②만성 통풍(podagra — 합스부르크 가문 유전 경향) ' +
    '③전립선 비대증 합병증 ' +
    '④말년 약 2년간의 우울증 + 식욕 부진으로 인한 영양실조를 ' +
    '복합적 사인으로 평가. 단일 사인보다 다중 합병증으로 보는 것이 정확.',
  biography:
    '합스부르크 가문 — 스페인 합스부르크의 시조. 16세기 전반 유럽 정치의 결정적 인물. ' +
    '①신성로마황제 카를 5세(재위 1519~1556) ②스페인 왕 카를로스 1세(재위 1516~1556 — 카스티야·아라곤·나폴리·시칠리아·사르데냐 합산) ' +
    '③합스부르크령 네덜란드 군주(1506~1555) ④오스트리아 대공(1519~1521 후 동생 페르디난트에게 양도) ' +
    '⑤신대륙(아메리카) 군주(1516~1556 — 카스티야 왕관 하)를 동시 보유한 사상 최대 영토의 군주. ' +
    '동시기 표현 "해가 지지 않는 제국(empire on which the sun never sets)"의 원형. ' +
    '\n\n' +
    '【출생과 상속】 1500-02-24 합스부르크령 네덜란드 헨트(현 벨기에 헨트) 출생. ' +
    '아버지 미남공 필리프(Philip the Handsome — 합스부르크 막시밀리안 1세 황제의 아들), ' +
    '어머니 후아나(Joanna of Castile — 카스티야 이사벨 1세·아라곤 페르난도 2세의 딸, 일명 "광녀 후아나"). ' +
    '부계로 합스부르크령 네덜란드·오스트리아·신성로마, 모계로 카스티야·아라곤·나폴리·신대륙을 상속. ' +
    '4중 상속으로 사상 유례없는 영토 집중 — 약 200만 km² + 신대륙 식민지 추가. ' +
    '\n\n' +
    '【1506 합스부르크령 네덜란드 군주(6세)】 1506-09-25 아버지 미남공 필리프가 28세에 장티푸스로 급사. ' +
    '6세의 카를이 합스부르크령 네덜란드 17개 주의 군주로 즉위(이모 마르가레타 섭정). ' +
    '메헬렌(Mechelen)에서 약 9년간 양육, 라틴어·프랑스어·네덜란드어 4개 언어 + 인문 교육. ' +
    '【1516 스페인 왕(16세)】 1516-01-23 외할아버지 아라곤 페르난도 2세 사망. ' +
    '카스티야·아라곤·나폴리·시칠리아·사르데냐 + 신대륙(1492 콜럼버스 발견 후 카스티야 왕관 영토)의 ' +
    '왕(카를로스 1세)으로 즉위. 1517-09 첫 스페인 방문, 어머니 후아나는 토르데시야스 수녀원에 사실상 유폐 상태로 ' +
    '아들과 공동 군주 명목 유지. ' +
    '【1519 신성로마황제(19세)】 1519-01-12 친할아버지 막시밀리안 1세 사망. ' +
    '신성로마제국 황제 선거에서 7명 선제후 만장일치로 카를을 선출(1519-06-28). ' +
    '약 85만 굴덴(약 200만 두카토)을 푸거(Fugger)·벨저(Welser) 가문에서 차입해 선제후 매수. ' +
    '경쟁자는 프랑수아 1세(프랑스)·헨리 8세(잉글랜드). 선거 자금 차입은 후일 카를의 만성 재정난의 출발점. ' +
    '\n\n' +
    '【종교개혁과의 충돌(1517~1555)】 1517-10-31 비텐베르크 95개 조항(루터)으로 종교개혁 발발. ' +
    '카를은 광적 가톨릭 신봉자로 종교개혁 전체에 적대. ' +
    '①1521 보름스 의회(Diet of Worms) — 루터를 이단으로 단죄, 보름스 칙령(Edict of Worms) 발포 ' +
    '②1530 아우크스부르크 의회 — 신교 측 〈아우크스부르크 신앙고백〉 거부 ' +
    '③1546~1547 슈말칼덴 전쟁 — 신교 제후 동맹(Schmalkaldic League) 격파, 1547-04-24 뮐베르크 전투 결정적 승리 ' +
    '④1555-09-25 아우크스부르크 종교화의(Peace of Augsburg) — "각 영주가 자기 영지의 종교를 결정한다(cuius regio, eius religio)"를 ' +
    '마지못해 인정. 카를의 종교적 통일 시도는 결국 실패. ' +
    '\n\n' +
    '【프랑스와의 4차 이탈리아 전쟁(1521~1544)】 프랑스 발루아 가문(프랑수아 1세·앙리 2세)과 약 30년에 걸친 ' +
    '이탈리아 패권 다툼. ①1525-02-24 파비아 전투(Battle of Pavia) — 프랑수아 1세를 직접 생포한 결정적 승리 ' +
    '②1527-05-06 로마 약탈(Sack of Rome) — 카를의 미지급 용병이 로마 약탈, 교황 클레멘스 7세를 포로로 ' +
    '③1529 캄브레 조약 ④1544 크레피 조약. 결과는 카를의 이탈리아 패권 확립. ' +
    '\n\n' +
    '【오스만 제국·바르바리 해적 대응】 ①1529 빈 1차 포위 — 술레이만 1세의 침공을 격퇴 ' +
    '②1535 튀니스 정복 — 바르바리 해적 거점 해체 ③1541 알제 원정 실패. ' +
    '\n\n' +
    '【신대륙 식민지】 카를 재위 중 ①1519~1521 코르테스의 아즈텍 정복 ②1532~1533 피사로의 잉카 정복 ' +
    '③1519~1522 마젤란-엘카노 함대 세계 일주(카를이 후원). 신대륙에서 약 16,000톤의 은이 본국으로 유입, ' +
    '카를의 군사 자금원이 되었으나 동시에 16세기 유럽 가격 혁명(price revolution)의 직접 원인. ' +
    '\n\n' +
    '【1556 분할 양위와 은퇴】 1555-10-25 브뤼셀에서 합스부르크령 네덜란드 양위(아들 펠리페 2세에게), ' +
    '1556-01-16 스페인·이탈리아·신대륙 양위(펠리페 2세에게), ' +
    '1556-02-25 신성로마제국 양위(동생 페르디난트 1세에게 — 1558 정식 인정). ' +
    '합스부르크 가문이 ①스페인 합스부르크(펠리페 2세 — 스페인·네덜란드·이탈리아·신대륙) ' +
    '②오스트리아 합스부르크(페르디난트 1세 — 신성로마·오스트리아·헝가리)로 분할. ' +
    '\n\n' +
    '【1556~1558 유스테 은퇴】 1556-09 스페인 카스티야 유스테(Yuste) 산 헤로니모 수도원에 은퇴. ' +
    '약 2년간 시계 수집·기도·신학 토론으로 시간을 보냄. 통풍·말라리아로 1558-09-21 사망. ' +
    '\n\n' +
    '【장기 유산】 ①스페인 합스부르크 시대(1556~1700)의 출발 ②네덜란드 독립 전쟁(1568~1648)의 직접 도화선 — ' +
    '아들 펠리페 2세의 강경 가톨릭·과세 정책 ③신대륙 식민지 약 320년 스페인 통치(1492~1898) 토대 ' +
    '④아우크스부르크 종교화의(1555)의 "영주 결정 종교" 원칙 — 베스트팔렌 조약(1648)·근대 국제법 토대 ' +
    '⑤"해가 지지 않는 제국" 개념 — 후일 대영제국 등에 차용.',
  influence: 95,
} as const

// ── 신성로마제국 HC 명세 ───────────────────────────────────────────────────
const HRE_HC_SPEC = {
  name: '신성로마제국',
  enName: 'Holy Roman Empire',
  description:
    '962년 작센 공작 오토 1세가 교황 요한 12세로부터 황제 대관을 받으면서 사실적으로 시작된 ' +
    '중세·근세 유럽의 다민족 봉건 제국. 정식 명칭 〈Heiliges Römisches Reich(독일)·Sacrum Imperium Romanum(라틴)〉. ' +
    '1512년부터는 〈독일 민족의 신성로마제국(Heiliges Römisches Reich Deutscher Nation)〉으로 표기. ' +
    '독일·오스트리아·체코·이탈리아 북부·스위스·저지대(부분) 등 약 300여 영방의 느슨한 연방. ' +
    '7명 선제후가 황제를 선출하는 비세습 제도였으나 1438년 알브레히트 2세 이래 약 300년간 ' +
    '합스부르크 가문이 사실상 세습 황제 지위를 독점했다. ' +
    '1517 종교개혁으로 신·구교 갈등이 심화, 1555 아우크스부르크 종교화의·1648 베스트팔렌 조약을 거치며 ' +
    '제국의 통합력이 약화되었고, 1806-08-06 나폴레옹의 라인 동맹 결성에 직면해 ' +
    '프란츠 2세가 황제 칭호 포기 선언으로 약 844년 만에 정식 해체되었다. ' +
    '"신성도 아니고 로마도 아니며 제국도 아니다(볼테르)"라는 풍자가 18세기 후반 황제권의 형해화를 상징한다.',
  startYear: 962,
  endYear: 1806,
  stateType: HistoricalStateType.EMPIRE,
  latitude: 50.1109,
  longitude: 8.6821, // 프랑크푸르트(황제 선거지)
} as const

// ── 합스부르크 가문 명세 ───────────────────────────────────────────────────
const HABSBURG_DYNASTY = {
  name: '합스부르크 가문',
  description:
    '11세기 스위스 알자스의 합스부르크 성(Habichtsburg)에서 출발한 유럽 최대의 왕가 중 하나. ' +
    '1273년 루돌프 1세가 신성로마황제로 선출되면서 황실 지위로 도약했고, ' +
    '1438년 알브레히트 2세 이래 1740년 카를 6세 사망까지 약 300년간 신성로마황제 지위를 사실상 세습. ' +
    '1496년 미남공 필리프와 카스티야 후아나의 결혼·1516년 카를 5세의 스페인 왕위 즉위로 ' +
    '스페인·이탈리아·신대륙·네덜란드까지 영토를 확대, 16세기 전반 사상 최대 유럽 왕가로 부상. ' +
    '1556년 카를 5세 분할 양위로 ①스페인 합스부르크(1556~1700, 펠리페 2세 계열) ' +
    '②오스트리아 합스부르크(1556~1740, 페르디난트 1세 계열)로 분할. ' +
    '1740년 마지막 합스부르크 남계 카를 6세 사망 후 마리아 테레지아가 ' +
    '합스부르크-로트링겐 가문을 새로 출발시켜 1918년 1차 세계대전 종결까지 ' +
    '약 645년간(1273~1918) 유럽사 최장기 왕가 중 하나로 군림했다.',
  startYear: 1273, // 루돌프 1세 신성로마황제 선출
  endYear: undefined, // 합스부르크-로트링겐으로 계승
} as const

export async function seedCharlesV(prisma: PrismaService): Promise<void> {
  console.log('\n👑 카를 5세(Charles V) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성: admin 계정 ──────────────────────────────────────────────
  const admin = await prisma.account.findUnique({
    where: { username: 'admin' },
  })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  // ── 0) 합스부르크 가문 등록 ──────────────────────────────────────────────
  let dynasty = await prisma.dynasty.findFirst({
    where: { name: HABSBURG_DYNASTY.name },
  })
  if (dynasty) {
    console.log(`  ⏭️  가문 이미 존재: ${HABSBURG_DYNASTY.name}`)
  } else {
    dynasty = await prisma.dynasty.create({
      data: {
        name: HABSBURG_DYNASTY.name,
        description: HABSBURG_DYNASTY.description,
        startDate: new Date(HABSBURG_DYNASTY.startYear, 0, 1),
        endDate: HABSBURG_DYNASTY.endYear
          ? new Date(HABSBURG_DYNASTY.endYear, 11, 31)
          : undefined,
      },
    })
    console.log(`  ✅ 가문 생성: ${HABSBURG_DYNASTY.name} (id=${dynasty.id})`)
  }

  // ── 1) 신성로마제국 HC 인라인 생성 ───────────────────────────────────────
  let hreHC = await prisma.historicalCountry.findFirst({
    where: { name: HRE_HC_SPEC.name },
    select: { id: true },
  })
  if (hreHC) {
    console.log(`  ⏭️  역사 국가 이미 존재: ${HRE_HC_SPEC.name}`)
  } else {
    const created = await prisma.historicalCountry.create({
      data: {
        name: HRE_HC_SPEC.name,
        enName: HRE_HC_SPEC.enName,
        description: HRE_HC_SPEC.description,
        startEra: 'AD' as any,
        startYear: HRE_HC_SPEC.startYear,
        endEra: 'AD' as any,
        endYear: HRE_HC_SPEC.endYear,
        stateType: HRE_HC_SPEC.stateType,
        entityKind: HistoricalEntityKind.STATE,
        latitude: HRE_HC_SPEC.latitude,
        longitude: HRE_HC_SPEC.longitude,
        accountId: admin.id,
      },
    })
    hreHC = { id: created.id }
    console.log(`  ✅ 역사 국가 생성: ${HRE_HC_SPEC.name} (id=${created.id})`)

    // 현대 독일(DE) 연결
    const modernDE = await prisma.country.findFirst({
      where: { isoCode: 'DE' },
      select: { id: true },
    })
    if (modernDE) {
      const linkExists = await prisma.historicalCountryModernCountry.findFirst({
        where: { historicalCountryId: hreHC.id, modernCountryId: modernDE.id },
      })
      if (!linkExists) {
        await prisma.historicalCountryModernCountry.create({
          data: { historicalCountryId: hreHC.id, modernCountryId: modernDE.id },
        })
        console.log(`    🔗 현대 독일(DE) 연결`)
      }
    }
  }

  // ── 2) 합스부르크령 네덜란드 HC 조회 ─────────────────────────────────────
  const habsburgNetherlandsHC = await prisma.historicalCountry.findFirst({
    where: { name: '합스부르크령 네덜란드' },
    select: { id: true },
  })
  if (!habsburgNetherlandsHC) {
    console.warn('  ⚠️  합스부르크령 네덜란드 HC 미존재 — Affiliation 등록 건너뜀')
  }

  // ── 3) DynastyRule 등록 (합스부르크 → 신성로마제국, 합스부르크령 네덜란드) ─
  const DYNASTY_RULES: Array<{
    historicalCountryId: string
    countryName: string
    startYear: number
    endYear?: number
  }> = [
    {
      historicalCountryId: hreHC.id,
      countryName: '신성로마제국',
      startYear: 1438, // 알브레히트 2세 이래 사실상 세습
      endYear: 1740, // 카를 6세 사망 — 합스부르크 남계 단절
    },
  ]
  if (habsburgNetherlandsHC) {
    DYNASTY_RULES.push({
      historicalCountryId: habsburgNetherlandsHC.id,
      countryName: '합스부르크령 네덜란드',
      startYear: 1482, // 마리 부르고뉴 사망 — 합스부르크 상속
      endYear: 1581, // 단념 선언으로 종결
    })
  }

  for (const rule of DYNASTY_RULES) {
    const exists = await prisma.dynastyRule.findFirst({
      where: { dynastyId: dynasty.id, historicalCountryId: rule.historicalCountryId },
    })
    if (exists) {
      console.log(`  ⏭️  가문 통치 스킵: ${rule.countryName}`)
      continue
    }
    await prisma.dynastyRule.create({
      data: {
        dynastyId: dynasty.id,
        historicalCountryId: rule.historicalCountryId,
        startEra: 'AD' as any,
        startYear: rule.startYear,
        endEra: 'AD' as any,
        endYear: rule.endYear,
      },
    })
    console.log(
      `  ✅ 가문 통치: ${rule.countryName} (${rule.startYear}-${rule.endYear ?? '현재'})`,
    )
  }

  // ── 4) 카를 5세 인물 등록 ────────────────────────────────────────────────
  const existingPerson = await prisma.person.findFirst({
    where: { originalName: PERSON.originalName },
  })

  let personId: string
  if (existingPerson) {
    personId = existingPerson.id
    console.log(`  ⏭️  인물 이미 존재 — 스킵: ${PERSON.originalName} (id=${personId})`)
    // 가문 미연결 시 보강
    if (!existingPerson.dynastyId) {
      await prisma.person.update({
        where: { id: personId },
        data: { dynastyId: dynasty.id },
      })
      console.log(`    🔗 가문 연결 보강: ${HABSBURG_DYNASTY.name}`)
    }
    // 사망 관련 필드 보강 (누락된 것만 채움)
    const deathPatch: {
      deathType?: DeathType
      deathCause?: string
      deathNote?: string
    } = {}
    if (!existingPerson.deathType) deathPatch.deathType = PERSON.deathType
    if (!existingPerson.deathCause) deathPatch.deathCause = PERSON.deathCause
    if (!existingPerson.deathNote) deathPatch.deathNote = PERSON.deathNote
    if (Object.keys(deathPatch).length > 0) {
      await prisma.person.update({ where: { id: personId }, data: deathPatch })
      console.log(`    💀 사망 정보 보강: ${Object.keys(deathPatch).join(', ')}`)
    }
  } else {
    const created = await prisma.person.create({
      data: {
        name: PERSON.name,
        surname: PERSON.surname,
        originalName: PERSON.originalName,
        regnalName: PERSON.regnalName,
        biography: PERSON.biography,
        birthDate: new Date(PERSON.birthYear, PERSON.birthMonth - 1, PERSON.birthDay),
        birthEra: 'AD' as any,
        deathDate: new Date(PERSON.deathYear, PERSON.deathMonth - 1, PERSON.deathDay),
        deathEra: 'AD' as any,
        gender: 'MALE',
        nameDisplayOrder: 'western' as any,
        dynastyId: dynasty.id,
        birthPlaceText: PERSON.birthPlaceText,
        deathPlaceText: PERSON.deathPlaceText,
        deathType: PERSON.deathType,
        deathCause: PERSON.deathCause,
        deathNote: PERSON.deathNote,
        influence: PERSON.influence,
        accountId: admin.id,
      },
    })
    personId = created.id
    console.log(`  ✅ 인물 생성: ${PERSON.originalName} (id=${personId})`)
  }

  // ── 5) SovereignReign 등록 — 카를 5세의 3대 재임 ─────────────────────────
  // ⚠️ regnalNumber는 "n대" — HC startYear부터 즉위 순서. 이름 서수와 무관.
  //  ① 신성로마제국(HC start=962): 카를 5세는 962 오토 1세부터 20번째 황제 → 20대
  //  ② 합스부르크령 네덜란드(HC start=1482): 부친 펠리페 1세(1대) 다음 → 2대
  //  ③ 카스티야 왕국(HC start=1230): 13대 후아나 1세 → 14대 펠리페 1세 → 15대 카를로스 1세
  //
  // regnalName은 국가별 표기 — HRE는 "카를 5세"(Karl V), 카스티야는 "카를로스 1세"(Carlos I).
  // 합스부르크령 네덜란드는 자신의 사용 명칭 따라 "카를 5세"(Karel V) 그대로.
  const hrePos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '신성로마황제' },
    select: { id: true },
  })
  const dukePos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '공작' },
    select: { id: true },
  })
  const kingPos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '국왕' },
    select: { id: true },
  })
  const castileHC = await prisma.historicalCountry.findFirst({
    where: { name: '카스티야 왕국' },
    select: { id: true },
  })

  type ReignSpec = {
    historicalCountryId: string
    historicalCountryName: string
    positionDefinitionId: string
    positionTitle: string
    regnalNumber: number
    regnalName: string
    startDate: Date
    endDate: Date
    appointmentMethod: AppointmentMethod
    endReason: TenureEndReason
    endReasonDetail?: string
    notes?: string
  }

  const REIGNS: ReignSpec[] = []
  if (hrePos) {
    REIGNS.push({
      historicalCountryId: hreHC.id,
      historicalCountryName: '신성로마제국',
      positionDefinitionId: hrePos.id,
      positionTitle: '신성로마황제',
      regnalNumber: 20,
      regnalName: '카를 5세',
      startDate: new Date(1519, 5, 28),
      endDate: new Date(1556, 1, 25),
      appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
      endReason: TenureEndReason.ABDICATION,
      endReasonDetail:
        '1556-02-25 동생 페르디난트 1세에게 양위 (1558 정식 인정). 종교개혁 통제 실패·재정난·통풍 악화 등 복합 요인.',
      notes:
        '1519-06-28 프랑크푸르트에서 7 선제후 만장일치로 황제 선출. 1520-10-23 아헨 대성당에서 대관식. ' +
        '1530-02-24 볼로냐에서 교황 클레멘스 7세에게 정식 황제 대관(역사상 마지막 교황 대관 황제). ' +
        '재위 37년간 종교개혁(1517~)·이탈리아 전쟁(프랑수아 1세)·오스만 제국(1529 빈 1차 포위)·' +
        '신대륙 정복(코르테스 아즈텍·피사로 잉카) 등 16세기 유럽 정치의 거의 모든 결정적 사건의 중심.',
    })
  } else {
    console.warn('  ⚠️  관직 정의 \'신성로마황제\' 미존재 — 재임 스킵')
  }
  if (habsburgNetherlandsHC && dukePos) {
    REIGNS.push({
      historicalCountryId: habsburgNetherlandsHC.id,
      historicalCountryName: '합스부르크령 네덜란드',
      positionDefinitionId: dukePos.id,
      positionTitle: '공작',
      regnalNumber: 2,
      regnalName: '카를 5세',
      startDate: new Date(1506, 8, 25), // 1506-09-25 부친 펠리페 1세 사망
      endDate: new Date(1555, 9, 25), // 1555-10-25 브뤼셀 양위 (아들 펠리페 2세에게)
      appointmentMethod: AppointmentMethod.HEREDITARY,
      endReason: TenureEndReason.ABDICATION,
      endReasonDetail:
        '1555-10-25 브뤼셀에서 아들 펠리페 2세에게 합스부르크령 네덜란드 양위. 분할 양위의 첫 단계.',
      notes:
        '6세에 부친 펠리페 1세 급사로 즉위. 약 1515년까지 이모 마르가레타 섭정. ' +
        '1515 친정 개시 후 약 40년간 합스부르크령 네덜란드를 사실상 제국 운영의 본거지로 활용. ' +
        '1549 〈국본 칙령(Pragmatic Sanction)〉으로 17개 주를 합스부르크 영지의 독자적 단위로 묶어 ' +
        '같은 군주 아래 신성로마제국과 별도 운영의 법적 토대 마련. ' +
        '1555-10-25 브뤼셀 회의장에서 직접 양위 — 아들 펠리페 2세가 3대 군주로 즉위.',
    })
  } else {
    if (!habsburgNetherlandsHC) console.warn('  ⚠️  합스부르크령 네덜란드 HC 미존재 — 재임 스킵')
    if (!dukePos) console.warn('  ⚠️  관직 정의 \'공작\' 미존재 — 재임 스킵')
  }
  if (castileHC && kingPos) {
    REIGNS.push({
      historicalCountryId: castileHC.id,
      historicalCountryName: '카스티야 왕국',
      positionDefinitionId: kingPos.id,
      positionTitle: '국왕',
      regnalNumber: 15,
      regnalName: '카를로스 1세',
      startDate: new Date(1516, 0, 23), // 1516-01-23 외조부 페르난도 2세 사망
      endDate: new Date(1556, 0, 16), // 1556-01-16 아들 펠리페 2세에게 스페인 양위
      appointmentMethod: AppointmentMethod.HEREDITARY,
      endReason: TenureEndReason.ABDICATION,
      endReasonDetail:
        '1556-01-16 아들 펠리페 2세에게 카스티야·아라곤·이탈리아·신대륙 양위. 분할 양위의 두 번째 단계.',
      notes:
        '1516-01-23 외조부 페르난도 2세 사망으로 카스티야·아라곤·나폴리·시칠리아·사르데냐·신대륙 ' +
        '왕(스페인어 표기 카를로스 1세 — Carlos I) 즉위. ' +
        '단 어머니 후아나 1세(13대)가 1555 사망 시까지 명목상 공동 군주. ' +
        '실제 통치는 카를 5세가 1516~1556 약 40년간 단독 행사. ' +
        '재위 중 1519~1521 코르테스의 아즈텍 정복·1532~1533 피사로의 잉카 정복으로 신대륙 영토 폭증, ' +
        '연간 약 16,000톤 은 본국 유입으로 카를의 황제 활동 자금원. ' +
        '1556-01-16 아들 펠리페 2세에게 카스티야·아라곤 등 스페인 모든 영토 양위 — 16대 펠리페 2세 즉위.',
    })
  } else {
    if (!castileHC) console.warn('  ⚠️  카스티야 왕국 HC 미존재 — 재임 스킵 (parents 시드 먼저 실행 필요)')
    if (!kingPos) console.warn('  ⚠️  관직 정의 \'국왕\' 미존재 — 재임 스킵')
  }

  for (const r of REIGNS) {
    // 기존 재위 레코드 조회 — personId + historicalCountryId 기준
    // (잘못된 regnalNumber 레코드도 잡아내기 위함)
    const existingByPerson = await prisma.sovereignReign.findFirst({
      where: { personId, historicalCountryId: r.historicalCountryId },
    })
    if (existingByPerson) {
      const needsUpdate =
        existingByPerson.regnalNumber !== r.regnalNumber ||
        existingByPerson.regnalName !== r.regnalName
      if (needsUpdate) {
        await prisma.sovereignReign.update({
          where: { id: existingByPerson.id },
          data: { regnalNumber: r.regnalNumber, regnalName: r.regnalName },
        })
        console.log(
          `  🔧 재임 정정: ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대 ` +
            `(이전: ${existingByPerson.regnalNumber ?? 'null'}대 / ${existingByPerson.regnalName ?? 'null'})`,
        )
      } else {
        console.log(
          `  ⏭️  재임 스킵 (이미 정확): ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대`,
        )
      }
      continue
    }
    // 신규 생성 — 동일 regnalNumber 슬롯 점유 검사
    const slotConflict = await prisma.sovereignReign.findFirst({
      where: {
        historicalCountryId: r.historicalCountryId,
        regnalNumber: r.regnalNumber,
      },
    })
    if (slotConflict) {
      console.warn(
        `  ⚠️  재임 충돌: ${r.historicalCountryName} ${r.regnalNumber}대 — 다른 인물 점유 (skip)`,
      )
      continue
    }
    await prisma.sovereignReign.create({
      data: {
        personId,
        historicalCountryId: r.historicalCountryId,
        positionDefinitionId: r.positionDefinitionId,
        regnalNumber: r.regnalNumber,
        regnalName: r.regnalName,
        startDate: r.startDate,
        endDate: r.endDate,
        appointmentMethod: r.appointmentMethod,
        endReason: r.endReason,
        endReasonDetail: r.endReasonDetail,
        notes: r.notes,
        accountId: admin.id,
      },
    })
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    console.log(
      `  ✅ 재임: ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대 (${fmt(r.startDate)} ~ ${fmt(r.endDate)})`,
    )
  }

  // ── 6) PersonCountryAffiliation (합스부르크령 네덜란드) ──────────────────
  if (habsburgNetherlandsHC) {
    const affExists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId,
        historicalCountryId: habsburgNetherlandsHC.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (affExists) {
      console.log(`  ⏭️  소속국가 스킵 (이미 존재): 합스부르크령 네덜란드`)
    } else {
      await prisma.personCountryAffiliation.create({
        data: {
          personId,
          historicalCountryId: habsburgNetherlandsHC.id,
          affiliationType: 'CITIZENSHIP' as any,
          priority: 0,
        },
      })
      console.log(`  ✅ 소속국가: 합스부르크령 네덜란드 (출생지 + 1506~1555 군주)`)
    }
  }

  // ── 7) PersonStats (6축 능력치 — admin 평가) ─────────────────────────────
  const statsExists = await prisma.personStats.findFirst({
    where: { personId, accountId: admin.id },
  })
  if (statsExists) {
    console.log(`  ⏭️  능력치 스킵 (이미 존재)`)
  } else {
    await prisma.personStats.create({
      data: {
        personId,
        accountId: admin.id,
        politics: 88,
        military: 82,
        diplomacy: 90,
        intellect: 75,
        charisma: 78,
        administration: 82,
        notes:
          '4중 상속(합스부르크령 네덜란드·카스티야·아라곤·신성로마)으로 사상 최대 영토 군주. ' +
          '외교(7 선제후 매수·1525 파비아·1530 교황 대관·1555 아우크스부르크)에서 정점. ' +
          '군사는 직접 지휘보다 알바 공작·페르난도 알바레스 등 부장에 의존했으나 ' +
          '1525 파비아·1547 뮐베르크 등 친정 전투에서도 결정적 승리. ' +
          '행정은 부왕(viceroy) 제도로 유럽·신대륙 동시 통치 기반을 구축했지만 ' +
          '재정난·푸거 가문 누적 부채는 끝내 해결 못함. ' +
          '학식은 4~5개 언어 구사·예술 후원이지만 본인 저술은 없어 학자로서는 평가 보류. ' +
          '카리스마는 합스부르크 턱(prognathism)·언어 장애·우울 기질의 한계에도 ' +
          '37년 재위·1556 자발적 양위로 도덕적 권위는 확립.',
      },
    })
    console.log(`  ✅ 능력치: 정치 88·군사 82·외교 90·학식 75·카리스마 78·행정 82`)
  }

  console.log(`✅ 카를 5세 시딩 완료\n`)
}
