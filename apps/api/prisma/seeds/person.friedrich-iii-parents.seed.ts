/**
 * 프리드리히 3세(Friedrich III, Holy Roman Emperor, 1415~1493)의 부모 시드.
 *
 *   아버지: 에른스트 폰 합스부르크 (Ernest the Iron, 1377-07 ~ 1424-06-10)
 *           합스부르크 가문 레오폴트 분지, 이너 오스트리아 공작(1402~1424)
 *           별칭 "철공(der Eiserne)" — 강건한 체격에서 유래
 *           합스부르크 가문 사상 처음으로 "Archduke(대공)" 칭호를 시도한 인물 중 한 명
 *
 *   어머니: 침바르카 폰 마조비아 (Cymburgis of Masovia, 약 1394 ~ 1429-09-28)
 *           폴란드 피아스트 가문 마조비아 분지 출신
 *           마조비아 공작 시에모비트 4세와 알렉산드라 폰 리투아니아의 딸
 *           폴란드 왕 브와디스와프 2세 야기에우오의 외조카
 *
 *   ⚠️ 이너 오스트리아·마조비아 HC는 미등록 — SovereignReign 생략, biography에 통치 시기 명시
 *   ⚠️ 기존 데이터 보존 모드.
 *
 * 등록 항목:
 *   - Dynasty x1 신규 (피아스트 가문 — 마조비아 분지 포함)
 *   - Person x2 (에른스트·침바르카)
 *   - PersonStats x2
 *   - PersonCountryAffiliation x2 (에른스트 → 신성로마제국 CITIZENSHIP, 침바르카 → 신성로마제국 CITIZENSHIP)
 *   - PersonSpouse x2 (양방향 결혼, 1412-01-25 ~ 1424-06-10 에른스트 사망)
 *   - 부자/모자 관계: 에른스트·침바르카 → 프리드리히 3세
 */
import { DeathType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const PIAST_DYNASTY = {
  name: '피아스트 가문',
  description:
    '9세기 후반 폴란드 부족 연맹에서 출발한 폴란드 최초의 왕조. 시조 미에슈코 1세(약 930~992)가 ' +
    '966년 가톨릭 개종으로 폴란드를 기독교 세계에 편입시켰고, 그의 아들 볼레스와프 1세(992~1025)가 ' +
    '1025년 폴란드 초대 국왕으로 즉위했다. 12세기 분할 통치기를 거쳐 14세기 카지미에시 3세 ' +
    '(대왕, 1310~1370)의 사망으로 본가 왕통이 단절되었으나, 마조비아·실레지아 등 분지는 16세기까지 ' +
    '폴란드 영방 공작 가문으로 존속했다. 마조비아 분지의 시에모비트 4세 공작의 딸 침바르카가 ' +
    '1412년 합스부르크 에른스트와 결혼하면서 후일 신성 로마 황제 프리드리히 3세의 외가가 되었다.',
  startYear: 850,
  endYear: 1670, // 마조비아 분지 단절 후 실레지아 분지 일부 잔존
} as const

const ERNEST_THE_IRON = {
  name: '에른스트',
  surname: '합스부르크',
  originalName: 'Ernest the Iron, Duke of Inner Austria',
  regnalName: '철공',
  birthYear: 1377,
  birthMonth: 7,
  birthDay: 1, // 정확한 일자 미상, 7월로 추정
  deathYear: 1424,
  deathMonth: 6,
  deathDay: 10,
  birthPlaceText: '합스부르크 영지 비너 노이슈타트(Wiener Neustadt)',
  deathPlaceText: '슈타이어 공국 브뤼크 안 데어 무어(Bruck an der Mur)',
  deathType: DeathType.ILLNESS,
  deathCause: '자연사 추정 (향년 46세)',
  deathNote:
    '1424년 6월 10일 슈타이어 공국 브뤼크 안 데어 무어에서 향년 46세에 사망했다. 동시기 기록상 ' +
    '사인은 자연사로 알려져 있으며 구체적 질환은 명시되지 않았다. 평소 강건한 체격과 신체 힘으로 ' +
    '"철공(der Eiserne)"이라 불렸음에도 비교적 이른 나이에 사망했다. 시신은 슈투트가르트 인근 ' +
    '루스트(Rein) 시토회 수도원에 안치되었다. 사망 당시 장남 프리드리히(=후일 황제 프리드리히 3세)는 ' +
    '8세였고, 차남 알브레히트(=후일 알브레히트 6세)는 5세였다. 두 미성년 자녀는 사촌 형제 ' +
    '프리드리히 4세 폰 티롤의 후견으로 자랐으며, 후일 프리드리히 3세가 1440년 신성 로마 황제로 ' +
    '즉위하면서 합스부르크 가문의 황제 계보가 본격적으로 시작된다.',
  biography:
    '합스부르크 가문 레오폴트 분지 출신의 이너 오스트리아 공작. 1377년 7월 합스부르크 가문 영지인 ' +
    '비너 노이슈타트에서 태어났다. 부친은 레오폴트 3세 폰 합스부르크(Leopold III of Austria, ' +
    '1351~1386)로 1386년 스위스 동맹과의 젬파흐 전투에서 전사했으며, 모친은 밀라노 비스콘티 가문 ' +
    '출신의 비리데 비스콘티(Viridis Visconti, 1352~1414)이다. 형제로는 빌헬름(1370~1406), ' +
    '레오폴트 4세(1371~1411), 그리고 막내 프리드리히 4세 폰 티롤(1382~1439)이 있었다.\n\n' +
    '어린 시절 1386년 부친 레오폴트 3세가 젬파흐 전투에서 전사하면서 9세에 부친을 잃었다. 합스부르크 ' +
    '가문은 부친의 사망 직후 1379년 노이베르크 조약(Treaty of Neuberg)으로 알브레히트 분지와 ' +
    '레오폴트 분지로 영지가 분할되어 있던 상태였고, 레오폴트 분지 내에서도 형제들의 추가 분할이 ' +
    '이어졌다. 에른스트는 형 빌헬름·레오폴트 4세와 함께 공동 통치 형식으로 슈타이어·카린티아·' +
    '카르니올라·이스트리아 등 이너 오스트리아 영지를 다스렸다.\n\n' +
    '1402년 큰형 빌헬름이 사망하고 1411년 레오폴트 4세가 사망하면서 약 1411년부터 1424년까지 ' +
    '에른스트가 이너 오스트리아 영지 전체를 단독으로 통치했다. 약 22년의 공동·단독 통치 기간 동안 ' +
    '슈타이어·카린티아·카르니올라 영지의 행정 통합과 영지 내 도시 자치권 확대에 힘썼다. 영지 ' +
    '경제의 핵심이었던 슈타이어 철광 산업 후원과 카르니올라 농업 개발이 동시기 평가에서 우수한 ' +
    '치적으로 기록된다.\n\n' +
    '합스부르크 가문 사상 처음으로 "Archdux Austriae(오스트리아 대공)" 칭호를 적극 사용한 인물 중 ' +
    '한 명이다. 1359년 형뻘 루돌프 4세가 이미 위조 문서 "Privilegium Maius"를 통해 대공 칭호를 ' +
    '주장했으나 신성 로마 황제 카를 4세에게 인정받지 못했고, 에른스트는 1414년 본인의 영지 문서에 ' +
    '"Archdux" 칭호를 정식으로 사용하기 시작했다. 이 칭호는 후일 1453년 프리드리히 3세 본인이 ' +
    '신성 로마 황제 자격으로 "Privilegium Maius"를 정식 인준하면서 합스부르크 가문의 공식 ' +
    '칭호로 굳어진다.\n\n' +
    '결혼은 두 차례였다. 첫 번째 부인은 1392년경 결혼한 포메른 가문의 마르가레테(Margaret of ' +
    'Pomerania, 약 1395~1410)였으나 1410년 사망 시까지 자녀를 두지 못했다. 두 번째 부인은 ' +
    '1412년 1월 25일 비너 노이슈타트에서 결혼한 폴란드 피아스트 가문 마조비아 분지의 침바르카 ' +
    '폰 마조비아(약 1394~1429)이다. 35세 에른스트와 18세 침바르카의 약 17세 차 결혼이었으며, ' +
    '약 12년의 결혼 생활 동안 8명의 자녀를 두었다. 그중 장남 프리드리히(1415~1493)가 후일 신성 ' +
    '로마 황제 프리드리히 3세로 즉위해 약 53년이라는 합스부르크 가문 사상 최장기 재위를 기록한다.\n\n' +
    '1424년 6월 10일 브뤼크 안 데어 무어에서 향년 46세에 자연사로 사망했다. 강건한 체격으로 ' +
    '"철공"이라 불렸음에도 비교적 이른 나이의 사망이었다. 시신은 루스트 시토회 수도원에 안치되었다. ' +
    '사망 당시 장남 프리드리히는 8세에 불과해 미성년 후계자였고, 사촌 프리드리히 4세 폰 티롤의 ' +
    '후견으로 자랐다. 에른스트의 짧은 통치는 후일 합스부르크 가문의 황제 계보가 그의 아들에게서 ' +
    '본격적으로 시작된다는 점에서 결정적 의미를 가진다.',
  influence: 60,
  stats: {
    politics: 65,
    military: 60,
    diplomacy: 60,
    intellect: 55,
    charisma: 70,
    administration: 70,
    notes:
      '약 22년의 공동·단독 통치 기간 동안 이너 오스트리아 영지(슈타이어·카린티아·카르니올라)의 ' +
      '행정 통합과 도시 자치 확대를 추진했다. 정치는 형제들 간의 분할 통치 협상에서 우수한 협상력을 ' +
      '보였다. 행정은 슈타이어 철광 산업 후원과 카르니올라 농업 개발에 집중. 외교는 신성 로마 ' +
      '황제 지기스문트 측과 점차 거리를 두며 합스부르크 가문 자율성을 확보. 1414년 처음으로 ' +
      '"Archdux Austriae" 칭호를 영지 문서에 사용해 후일 합스부르크 대공 지위의 토대를 마련. ' +
      '카리스마는 "철공" 별칭과 함께 동시기 우호적 평가. 학식은 평이.',
  },
} as const

const CYMBURGIS = {
  name: '침바르카',
  surname: '피아스트',
  originalName: 'Cymburgis of Masovia',
  regnalName: '공비',
  birthYear: 1394,
  birthMonth: 1,
  birthDay: 1, // 정확한 출생일 미상
  deathYear: 1429,
  deathMonth: 9,
  deathDay: 28,
  birthPlaceText: '폴란드 마조비아 공국 바르샤바(Warsaw) — 피아스트 가문 영지',
  deathPlaceText: '오스트리아 대공국 토르베크(Türnitz, 니더외스터라이히)',
  deathType: DeathType.ILLNESS,
  deathCause: '전염병 또는 자연사 (향년 35세)',
  deathNote:
    '1429년 9월 28일 토르베크에서 향년 35세에 사망했다. 동시기 기록상 정확한 사인은 명시되지 ' +
    '않았으며 자연사 또는 전염병 가설이 병존한다. 1424년 남편 에른스트가 먼저 사망한 후 약 5년간 ' +
    '미망인으로 자녀들을 양육했고, 큰아들 프리드리히(=후일 황제 프리드리히 3세)는 어머니 사망 당시 ' +
    '14세였다. 시신은 합스부르크 가문 묘소인 루스트 시토회 수도원에 안치되었다. 짧은 35년의 ' +
    '생애였으나 후일 합스부르크 가문의 황제 라인과 폴란드 피아스트 가문을 연결한 결정적 매듭이 ' +
    '되었으며, 그녀의 자녀 프리드리히 3세를 통해 약 500년에 걸친 합스부르크 황제 계보가 시작되었다.',
  biography:
    '폴란드 피아스트 가문 마조비아 분지 출신의 오스트리아 공비. 1394년경 폴란드 마조비아 공국에서 ' +
    '태어났다. 부친은 마조비아 공작 시에모비트 4세(Siemowit IV of Masovia, 1352~1426)로 피아스트 ' +
    '가문 마조비아 분지의 핵심 인물이었고, 모친은 알렉산드라 폰 리투아니아(Alexandra of Lithuania, ' +
    '1370~1434)였다. 모친 알렉산드라는 폴란드 왕 브와디스와프 2세 야기에우오(Władysław II Jagiełło, ' +
    '1352~1434)의 누이로, 침바르카는 폴란드 왕 야기에우오의 외조카에 해당한다. 야기에우오 왕가와 ' +
    '피아스트 마조비아 분지의 결합으로 14세기 후반 폴란드 정치 핵심 가문의 후손이었다.\n\n' +
    '어린 시절 마조비아 공국 영지에서 자랐다. 부친 시에모비트 4세는 1382년 폴란드 왕위 경쟁에서 ' +
    '야드비가 여왕에게 패배한 이후 마조비아 공작으로 사실상 독립적 영지를 통치했고, 이 영지는 ' +
    '폴란드 본가 왕통과는 별개로 16세기 후반 1526년까지 마조비아 피아스트 분지로 존속했다. 침바르카는 ' +
    '이러한 마조비아 영지의 정치 환경 속에서 동유럽 가톨릭 귀족 교육을 받으며 자랐다.\n\n' +
    '1412년 1월 25일 비너 노이슈타트에서 18세 나이로 35세 에른스트 폰 합스부르크(이너 오스트리아 ' +
    '공작)와 결혼했다. 약 17세의 큰 나이 차 결혼이었으며, 에른스트의 첫 부인 마르가레테 폰 포메른이 ' +
    '1410년 사망한 후 약 2년 만의 재혼이었다. 결혼의 정치적 의도는 합스부르크 가문이 동유럽 측의 ' +
    '결혼 동맹을 확보해 폴란드-리투아니아 측과의 관계를 안정화하려는 것이었다.\n\n' +
    '약 12년의 결혼 생활 동안 8명의 자녀를 출산했다. 살아남은 자녀 중 장남 프리드리히(1415-09-21 ' +
    '출생, 후일 신성 로마 황제 프리드리히 3세)와 차남 알브레히트(1418-12-18 출생, 후일 알브레히트 ' +
    '6세 폰 합스부르크)가 가장 중요한 자녀였다. 다른 자녀들은 다수 영아 사망했으나 딸 마르가레테 ' +
    '(1416~1486)는 후일 작센 선제후 프리드리히 2세의 부인이 되어 합스부르크와 베틴 가문의 결혼 ' +
    '동맹을 만들었다.\n\n' +
    '동시기 기록은 침바르카의 특이한 신체적 특징을 여러 차례 언급한다. 비범한 손 힘을 가져 호두를 ' +
    '맨손으로 깰 수 있었고, 굵은 못을 손가락만으로 벽에 박았다는 일화가 전해진다. 또한 매우 큰 ' +
    '하악골(턱뼈)을 가졌다고 알려져 있는데, 현대 유전학 연구에서는 침바르카가 후일 "합스부르크 ' +
    '턱(Habsburg jaw)"이라 불린 하악 전돌증의 유전적 기원 가운데 한 명으로 평가받는다. 그녀의 ' +
    '아들 프리드리히 3세 본인은 비교적 덜 두드러진 턱을 가졌으나, 손자 막시밀리안 1세부터 시작해 ' +
    '카를 5세·펠리페 2세·카를로스 2세에 이르기까지 합스부르크 가문의 대표적 외형 특징이 된 ' +
    '하악 전돌증이 침바르카에게서 유래했다는 가설은 동시기 의학사·유전학 연구에서 정설로 인정된다.\n\n' +
    '1424년 6월 10일 남편 에른스트가 향년 46세에 사망한 후 약 5년간 미망인으로 자녀들을 양육했다. ' +
    '이 시기 큰아들 프리드리히는 9세였고, 사촌 프리드리히 4세 폰 티롤의 후견 아래 자랐다. ' +
    '침바르카 본인은 비너 노이슈타트와 토르베크 등 합스부르크 영지에서 거주했다.\n\n' +
    '1429년 9월 28일 토르베크에서 향년 35세에 사망했다. 사인은 동시기 기록상 자연사 또는 전염병 ' +
    '가설이 병존한다. 시신은 합스부르크 가문 묘소인 루스트 시토회 수도원에 안치되었다. 짧은 35년의 ' +
    '생애였으나 그녀의 큰아들 프리드리히 3세가 1440년 신성 로마 황제로 즉위하면서 합스부르크 가문의 ' +
    '황제 계보가 본격적으로 시작되었고, 후일 카를 5세·펠리페 2세 등 16~17세기 유럽 패권 군주들의 ' +
    '직계 조모가 되어 유럽 왕가 계보의 결정적 매듭으로 평가된다.',
  influence: 50,
  stats: {
    politics: 45,
    military: 30,
    diplomacy: 55,
    intellect: 55,
    charisma: 65,
    administration: 40,
    notes:
      '약 12년의 결혼 생활 동안 8자녀를 출산하고 35세에 요절했다. 정치 활동은 제한적이었으나 ' +
      '폴란드 피아스트 가문과 합스부르크 가문의 결혼 동맹의 핵심 매개자가 되었다. 외교는 친정 ' +
      '야기에우오 왕가와의 정치 인맥을 통한 합스부르크-폴란드 측 관계 안정화에 기여. 카리스마는 ' +
      '동시기 평가에서 우호적이었으며 비범한 신체 힘과 큰 하악골이 자주 언급되었다. 후자는 후일 ' +
      '합스부르크 가문 특유의 하악 전돌증의 유전적 기원으로 추정된다. 큰아들 프리드리히 3세의 ' +
      '53년 황제 재위와 손자 막시밀리안 1세의 합스부르크-부르고뉴 결합을 통해 16세기 합스부르크 ' +
      '유럽 패권의 직계 조모가 되었다.',
  },
} as const

export async function seedFriedrichIIIParents(prisma: PrismaService): Promise<void> {
  console.log('\n👑 프리드리히 3세 부모(에른스트 + 침바르카) 시딩 시작...')

  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  admin 미존재')
    return
  }

  const habsburg = await prisma.dynasty.findFirst({ where: { name: '합스부르크 가문' } })
  if (!habsburg) {
    console.warn('  합스부르크 가문 미존재')
    return
  }

  const hreHC = await prisma.historicalCountry.findFirst({ where: { name: '신성로마제국' } })
  if (!hreHC) {
    console.warn('  신성로마제국 HC 미존재')
    return
  }

  const friedrichIII = await prisma.person.findFirst({
    where: { originalName: 'Friedrich III, Holy Roman Emperor' },
    select: { id: true, fatherId: true, motherId: true },
  })
  if (!friedrichIII) {
    console.warn('  프리드리히 3세 미존재')
    return
  }

  // 1) 피아스트 가문 등록
  let piast = await prisma.dynasty.findFirst({ where: { name: PIAST_DYNASTY.name } })
  if (!piast) {
    piast = await prisma.dynasty.create({
      data: {
        name: PIAST_DYNASTY.name,
        description: PIAST_DYNASTY.description,
        startDate: new Date(PIAST_DYNASTY.startYear, 0, 1),
        endDate: new Date(PIAST_DYNASTY.endYear, 11, 31),
      },
    })
    console.log(`  ✅ 가문 생성: ${PIAST_DYNASTY.name}`)
  } else {
    console.log(`  가문 스킵: ${PIAST_DYNASTY.name}`)
  }

  // 2) Person 등록 helper
  const createPerson = async (
    spec: typeof ERNEST_THE_IRON | typeof CYMBURGIS,
    gender: 'MALE' | 'FEMALE',
    dynastyId: string,
  ): Promise<string> => {
    const existing = await prisma.person.findFirst({ where: { originalName: spec.originalName } })
    if (existing) {
      console.log(`  인물 스킵: ${spec.originalName}`)
      return existing.id
    }
    const created = await prisma.person.create({
      data: {
        name: spec.name,
        surname: spec.surname,
        originalName: spec.originalName,
        regnalName: spec.regnalName,
        biography: spec.biography,
        birthDate: new Date(spec.birthYear, spec.birthMonth - 1, spec.birthDay),
        birthEra: 'AD' as any,
        deathDate: new Date(spec.deathYear, spec.deathMonth - 1, spec.deathDay),
        deathEra: 'AD' as any,
        gender,
        nameDisplayOrder: 'western' as any,
        dynastyId,
        birthPlaceText: spec.birthPlaceText,
        deathPlaceText: spec.deathPlaceText,
        deathType: spec.deathType,
        deathCause: spec.deathCause,
        deathNote: spec.deathNote,
        influence: spec.influence,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${spec.originalName}`)
    return created.id
  }

  const ernestId = await createPerson(ERNEST_THE_IRON, 'MALE', habsburg.id)
  const cymburgisId = await createPerson(CYMBURGIS, 'FEMALE', piast.id)

  // 3) Stats
  for (const [pid, spec, label] of [
    [ernestId, ERNEST_THE_IRON, '에른스트'],
    [cymburgisId, CYMBURGIS, '침바르카'],
  ] as const) {
    const exists = await prisma.personStats.findFirst({
      where: { personId: pid, accountId: admin.id },
    })
    if (exists) {
      console.log(`  ${label} 능력치 스킵`)
      continue
    }
    await prisma.personStats.create({
      data: {
        personId: pid,
        accountId: admin.id,
        politics: spec.stats.politics,
        military: spec.stats.military,
        diplomacy: spec.stats.diplomacy,
        intellect: spec.stats.intellect,
        charisma: spec.stats.charisma,
        administration: spec.stats.administration,
        notes: spec.stats.notes,
      },
    })
    console.log(`  ✅ ${label} 능력치 등록`)
  }

  // 4) 신성로마제국 affiliation
  for (const [pid, label] of [
    [ernestId, '에른스트'],
    [cymburgisId, '침바르카'],
  ] as const) {
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: pid,
        historicalCountryId: hreHC.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (exists) continue
    await prisma.personCountryAffiliation.create({
      data: {
        personId: pid,
        historicalCountryId: hreHC.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    console.log(`  ✅ 소속국가: ${label} → 신성로마제국`)
  }

  // 5) 결혼 양방향
  const mStart = new Date(1412, 0, 25)
  const mEnd = new Date(1424, 5, 10) // 에른스트 사망
  const mNote =
    '1412년 1월 25일 비너 노이슈타트에서 결혼. 에른스트 35세, 침바르카 18세, 약 17세 차의 결혼이었다. ' +
    '에른스트의 첫 부인 마르가레테 폰 포메른이 1410년 사망한 후 약 2년 만의 재혼이었다. 합스부르크 ' +
    '가문이 폴란드-리투아니아 측 결혼 동맹을 확보하려는 정치적 의도였다. 약 12년 결혼 생활 동안 ' +
    '8명의 자녀를 출산했으며 그중 장남 프리드리히가 후일 신성 로마 황제 프리드리히 3세로 즉위해 ' +
    '약 53년이라는 합스부르크 가문 사상 최장기 재위를 기록한다. 1424년 6월 10일 에른스트가 향년 ' +
    '46세에 자연사로 사망하면서 결혼 종결. 침바르카는 약 5년간 미망인으로 자녀들을 양육하다 1429년 ' +
    '9월 28일 토르베크에서 향년 35세에 사망했다.'
  for (const [aId, bId, label] of [
    [ernestId, cymburgisId, '에른스트 → 침바르카'],
    [cymburgisId, ernestId, '침바르카 → 에른스트'],
  ] as const) {
    const exists = await prisma.personSpouse.findFirst({
      where: { personId: aId, spouseId: bId },
    })
    if (exists) {
      console.log(`  결혼 스킵: ${label}`)
      continue
    }
    await prisma.personSpouse.create({
      data: {
        personId: aId,
        spouseId: bId,
        marriageStartDate: mStart,
        marriageEndDate: mEnd,
        note: mNote,
      },
    })
    console.log(`  ✅ 결혼: ${label}`)
  }

  // 6) 부자/모자
  if (friedrichIII.fatherId) {
    console.log(`  부자 스킵 (이미 연결)`)
  } else {
    await prisma.person.update({
      where: { id: friedrichIII.id },
      data: { fatherId: ernestId },
    })
    console.log(`  ✅ 부자: 에른스트 → 프리드리히 3세`)
  }
  if (friedrichIII.motherId) {
    console.log(`  모자 스킵 (이미 연결)`)
  } else {
    await prisma.person.update({
      where: { id: friedrichIII.id },
      data: { motherId: cymburgisId },
    })
    console.log(`  ✅ 모자: 침바르카 → 프리드리히 3세`)
  }

  console.log(`✅ 프리드리히 3세 부모 시딩 완료\n`)
}
