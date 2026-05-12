/**
 * 2025년 이란-이스라엘 12일 전쟁 (June 2025 Iran–Israel War) 시드
 *
 * 기존 데이터 보존 모드 — Event/Section/Person 등이 이미 있으면 갱신하지 않고 스킵한다.
 *
 * 2025-06-13 이스라엘이 이란 핵·미사일 시설과 군 지도부에 대한 대규모 선제 공습을 개시한
 * "라이징 라이언 작전(Operation Rising Lion)"으로 시작되어, 2025-06-22 미국이 B-2 스텔스 폭격기로
 * 포르도·나탄즈·이스파한 핵 시설을 직접 타격한 "미드나잇 해머 작전(Operation Midnight Hammer)"을
 * 거쳐, 2025-06-24 휴전 발효까지 12일간 이어진 무력 분쟁.
 *
 * 1979년 이란 혁명 이후 약 46년간 그림자 전쟁(shadow war)으로 지속된 이스라엘-이란 적대 관계가
 * 사상 최초로 양국 본토를 직접 타격하는 전면 무력 충돌로 비화한 사건이며,
 * 미국이 1979년 인질 사태 이후 처음으로 이란 영토에 대한 직접 군사 공격을 수행한 사건이기도 하다.
 *
 * 등록 항목:
 *  - Event 1
 *  - EventSection x6 (배경 / 발발 / 작전 경과 / 미국 개입 / 휴전 / 후속)
 *  - EventCountryRelation x5 (이스라엘·미국·이란·카타르·영국)
 *  - Person x8 (트럼프·네타냐후·하메네이·페제시키안·살라미·바게리·하지자데·할레비)
 *  - PersonEvent x8
 */
import { EventCountryRole } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'
const EVENT_CATEGORY_NAME = '전쟁/군사'

// ── 인물 데이터 ───────────────────────────────────────────────────────────
type PersonInput = {
  name: string
  surname?: string
  originalName?: string
  biography: string
  birthYear: number
  birthMonth: number
  birthDay: number
  deathYear?: number
  deathMonth?: number
  deathDay?: number
  deathCause?: string
  isAlive: boolean
  gender: 'MALE' | 'FEMALE'
  nameDisplayOrder: 'korean' | 'western'
  influence: number
  countryName: string
  eventRole: string
  eventNote: string
}

const PERSONS: PersonInput[] = [
  // ── 미국 ──
  {
    name: '도널드',
    surname: '트럼프',
    originalName: 'Donald John Trump',
    biography:
      '미국 제45대(2017~2021) 및 제47대(2025~) 대통령. 2024년 대선에서 카멀라 해리스 후보를 꺾고 ' +
      '4년 만에 재집권. 1기 임기 중 2018년 일방적으로 이란 핵합의(JCPOA)에서 탈퇴하고 ' +
      '"최대 압박(maximum pressure)" 제재를 부과한 이력. 2기 임기 직후인 2025년 4월부터 ' +
      '오만을 중개로 이란과 핵 협상을 재개했으나 5차례 협상이 결실 없이 마무리되었고, ' +
      '2025-06-13 이스라엘의 선제 공습 직후 "이란이 합의를 거부했다"는 입장을 표명하며 ' +
      '6월 22일 B-2 스텔스 폭격기를 동원한 포르도·나탄즈·이스파한 직접 타격을 명령. ' +
      '6월 24일 휴전을 중재한 후 "이란 핵 프로그램이 완전히 파괴(obliterated)되었다"고 선언했다.',
    birthYear: 1946, birthMonth: 6, birthDay: 14,
    isAlive: true,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    influence: 92,
    countryName: '미국',
    eventRole: '미국 대통령 — 미드나잇 해머 작전 명령자',
    eventNote:
      '2025-06-22 B-2 스텔스 폭격기 7기와 GBU-57 벙커버스터 14발, 유도 미사일 약 30발을 동원한 ' +
      '미드나잇 해머 작전 직접 명령. 작전 직후 백악관 연설에서 이란 핵 시설의 "완전한 파괴"를 선언. ' +
      '6월 24일 카타르의 중재 아래 휴전을 발표했으나 첫날 양측의 추가 교전을 강하게 비난.',
  },
  // ── 이스라엘 ──
  {
    name: '베냐민',
    surname: '네타냐후',
    originalName: 'Benjamin Netanyahu',
    biography:
      '이스라엘 제13~14대(1996~1999) 및 제16~17대(2009~2021, 2022~) 총리. ' +
      '리쿠드(Likud) 당 대표로 이스라엘 정계의 보수 강경 노선을 30여 년간 주도. ' +
      '2009년 재집권 이래 이란 핵 프로그램을 "실존적 위협"으로 규정하고 군사 옵션을 ' +
      '거듭 시사해 왔으며, 2015년 미국 의회 연설에서 오바마 행정부의 JCPOA를 정면 비판한 것이 유명. ' +
      '2023-10-07 하마스 기습 이후 가자 전쟁 장기화로 국내 정치적 압박이 누적된 상황에서, ' +
      '2025-06-13 라이징 라이언 작전을 발동해 약 12일에 걸친 대(對)이란 전면 공세를 지휘했다. ' +
      '본 작전은 2009년 이래 약 16년간 그가 일관되게 추진한 "선제적 무력 옵션"의 정점이었다.',
    birthYear: 1949, birthMonth: 10, birthDay: 21,
    isAlive: true,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    influence: 90,
    countryName: '이스라엘',
    eventRole: '이스라엘 총리 — 라이징 라이언 작전 명령자',
    eventNote:
      '2025-06-13 새벽 이스라엘 안보내각의 만장일치 승인 아래 라이징 라이언 작전 개시 명령. ' +
      '약 200대의 F-15I·F-16I·F-35I 전투기를 동원한 1차 공습으로 이란 IRGC 사령부·핵 시설· ' +
      '미사일 발사대 등 약 100개 표적을 동시 타격. 작전 기간 중 매일 화상 회의로 미국 트럼프와 ' +
      '직접 협의하며 표적 우선순위를 조율했다.',
  },
  {
    name: '헤르치',
    surname: '할레비',
    originalName: 'Herzi Halevi',
    biography:
      '이스라엘 방위군(IDF) 제23대 참모총장(2023-01 ~ 2025-03 재직). ' +
      '특수부대 사이렛 마트칼(Sayeret Matkal) 출신으로 군 정보국(아만)·남부사령부· ' +
      '참모차장을 거친 인물. 2023-10-07 하마스 기습 실패의 책임을 지고 2025-01-21 사임 의사 표명, ' +
      '같은 해 3월 에이얼 자미르(Eyal Zamir)에게 자리를 인계하기 직전까지 ' +
      '라이징 라이언 작전의 초기 계획 입안에 깊이 관여했다.',
    birthYear: 1967, birthMonth: 9, birthDay: 24,
    isAlive: true,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    influence: 70,
    countryName: '이스라엘',
    eventRole: '전임 IDF 참모총장 — 작전 계획 입안 단계 핵심',
    eventNote:
      '재임 마지막 2년간 이란 핵 시설 타격 작전의 군사 계획을 정교화. ' +
      '본 작전의 표적 리스트와 다층적 공습 시퀀스가 그의 재직기에 거의 완성되었으며, ' +
      '후임 자미르 참모총장이 이를 수정 없이 그대로 실행에 옮겼다.',
  },
  // ── 이란 ──
  {
    name: '알리',
    surname: '하메네이',
    originalName: 'Ali Hosseini Khamenei',
    biography:
      '이란 이슬람 공화국 제2대 최고지도자(1989~). 1989년 호메이니 사망 후 즉위해 ' +
      '약 36년간 이란 신정 체제의 최정점에 군림. 군 통수권·사법·언론·국가안보 최종 결정권을 ' +
      '헌법상 직접 보유하며, 1979년 혁명 이래 미국·이스라엘에 대한 강경 반대 노선을 일관되게 견지. ' +
      '본 전쟁 기간 중 86세의 고령에도 핵심 의사 결정을 직접 주재했으며, ' +
      '이스라엘·미국의 표적 가능성 때문에 테헤란 인근 비밀 벙커에서 지휘를 이어간 것으로 알려졌다.',
    birthYear: 1939, birthMonth: 4, birthDay: 19,
    isAlive: true,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    influence: 88,
    countryName: '이란',
    eventRole: '이란 최고지도자 — 대응 수위 최종 결정자',
    eventNote:
      '전쟁 기간 중 비밀 벙커에서 지휘. 6월 18일 영상 메시지로 "굴복은 없다"는 강경 입장 표명. ' +
      '6월 23일 카타르 알우데이드 미군기지에 대한 상징적 보복 미사일 발사를 승인하면서도 ' +
      '미국과의 전면전 회피를 위한 사전 경고를 카타르 측에 전달하도록 지시한 것으로 평가된다.',
  },
  {
    name: '마수드',
    surname: '페제시키안',
    originalName: 'Masoud Pezeshkian',
    biography:
      '이란 이슬람 공화국 제9대 대통령(2024-07-30 ~). 심장외과 의사 출신으로 ' +
      '2024년 7월 보궐 선거에서 강경 보수 후보 사이드 잘릴리를 누르고 당선된 개혁파. ' +
      '대선 공약으로 서방과의 핵 협상 재개·경제 제재 완화를 내세웠으며, 2025년 4월부터 ' +
      '오만 중개로 트럼프 행정부와 5차례 핵 협상을 진행했다. ' +
      '협상이 결실을 보지 못한 채 6월 13일 이스라엘 공습이 시작되자 ' +
      '"이란은 평화를 추구했으나 적이 응답하지 않았다"는 입장을 천명, 강경 대응으로 전환했다.',
    birthYear: 1954, birthMonth: 9, birthDay: 29,
    isAlive: true,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    influence: 75,
    countryName: '이란',
    eventRole: '이란 대통령 — 행정부 대응 총괄',
    eventNote:
      '집권 11개월 만에 전면전을 맞아 강경 대응으로 전환. 6월 18일 의회 비공개 회의에서 ' +
      '이스라엘에 대한 미사일 보복 강도 격상과 IAEA 협력 중단을 결정. 6월 23일 알우데이드 보복 후 ' +
      '24일 트럼프가 발표한 휴전을 수용. 휴전 직후 IAEA 사찰관 추방·우라늄 농축 시설 재가동 시사 등 ' +
      '핵 협상 노선의 사실상 종결을 선언했다.',
  },
  {
    name: '호세인',
    surname: '살라미',
    originalName: 'Hossein Salami',
    biography:
      '이란 혁명수비대(IRGC) 총사령관(2019-04-21 ~ 2025-06-13 사망). ' +
      '1980~1988 이란-이라크 전쟁 참전 후 IRGC 공군·지상군·참모차장을 거친 핵심 군부 인사. ' +
      '2020년 솔레이마니 사망 이후 IRGC의 대(對)이스라엘·미국 강경 노선을 주도, ' +
      '2023-10-07 하마스 기습 후 후티 반군·헤즈볼라·이라크 시아파 민병대 등 ' +
      '"저항의 축(Axis of Resistance)" 작전을 총괄 지휘. ' +
      '2025-06-13 새벽 테헤란 IRGC 사령부에 대한 이스라엘의 정밀 타격으로 사망. ' +
      '향년 65세.',
    birthYear: 1960, birthMonth: 8, birthDay: 7,
    deathYear: 2025, deathMonth: 6, deathDay: 13,
    deathCause: '이스라엘 공습 표적 타격',
    isAlive: false,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    influence: 80,
    countryName: '이란',
    eventRole: 'IRGC 총사령관 — 개전 첫날 사망',
    eventNote:
      '2025-06-13 새벽 1시경 테헤란 시내 IRGC 사령부 지하 벙커에 대한 이스라엘 공습으로 사망. ' +
      '동일 공습으로 IRGC 정보국장·작전국장 등 IRGC 핵심 지휘부 약 9명이 동시에 제거된 것으로 알려졌으며, ' +
      '이는 1979년 혁명 이후 IRGC가 입은 최대 단일 타격이다.',
  },
  {
    name: '모하마드',
    surname: '바게리',
    originalName: 'Mohammad Bagheri',
    biography:
      '이란군 합참의장(Chief of Staff of the Armed Forces, 2016-06-28 ~ 2025-06-13 사망). ' +
      '정규군(Artesh)·IRGC·바시즈(민병대)·치안군 등 이란의 모든 무력을 통할하는 최고위직. ' +
      '2017-12부터 IRGC와 정규군의 합동작전 체계를 구축한 인물로 평가되며, ' +
      '2025-06-13 새벽 이스라엘 공습으로 사망. 향년 64세.',
    birthYear: 1960, birthMonth: 9, birthDay: 1,
    deathYear: 2025, deathMonth: 6, deathDay: 13,
    deathCause: '이스라엘 공습 표적 타격',
    isAlive: false,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    influence: 78,
    countryName: '이란',
    eventRole: '이란군 합참의장 — 개전 첫날 사망',
    eventNote:
      '2025-06-13 새벽 살라미 IRGC 사령관과 거의 동시에 별도 공습으로 사망. ' +
      '이란군 최고위 군 지휘권의 동시 공백을 초래해 초기 사흘간 이란의 보복 미사일 대응이 ' +
      '체계화되지 못한 핵심 요인이 되었다는 평가가 있다.',
  },
  {
    name: '아미르 알리',
    surname: '하지자데',
    originalName: 'Amir Ali Hajizadeh',
    biography:
      'IRGC 항공우주군(IRGC Aerospace Force) 사령관(2009 ~ 2025-06-13 사망). ' +
      '이란의 탄도미사일·무인기 전력 전반을 직접 통할한 핵심 인물. ' +
      '2020-01 미군 알아사드 공군기지(이라크) 보복 타격, 2024-04·10 두 차례 ' +
      '대(對)이스라엘 직접 미사일 공격을 지휘. ' +
      '2025-06-13 새벽 테헤란 인근 IRGC 항공우주군 지하 사령부에 대한 이스라엘 공습으로 사망. ' +
      '향년 63세.',
    birthYear: 1962, birthMonth: 11, birthDay: 5,
    deathYear: 2025, deathMonth: 6, deathDay: 13,
    deathCause: '이스라엘 공습 표적 타격',
    isAlive: false,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    influence: 75,
    countryName: '이란',
    eventRole: 'IRGC 항공우주군 사령관 — 개전 첫날 사망',
    eventNote:
      '이란의 미사일·드론 전력을 약 15년간 단독으로 운영해 온 인물의 사망으로 ' +
      '이란의 보복 미사일 운용 지휘 체계가 일시적으로 마비. ' +
      '후임 마지드 무사비(Majid Mousavi)가 즉시 임명되었으나 작전 안정화에 약 사흘이 소요되었다.',
  },
]

// ── 사건 본문 ─────────────────────────────────────────────────────────────
const EVENT_BODY = {
  description:
    '2025년 6월 13일 새벽 이스라엘이 이란 핵 시설과 군 지도부를 동시 타격한 ' +
    '"라이징 라이언 작전(Operation Rising Lion)"으로 시작되어, 6월 22일 미국이 ' +
    'B-2 스텔스 폭격기로 포르도·나탄즈·이스파한 핵 시설을 직접 폭격한 ' +
    '"미드나잇 해머 작전(Operation Midnight Hammer)"을 거쳐, ' +
    '6월 24일 트럼프 미국 대통령의 휴전 선언으로 종결된 12일간의 무력 분쟁. ' +
    '\n\n' +
    '1979년 이란 혁명 이래 약 46년간 그림자 전쟁(shadow war) 형태로 지속되어 온 ' +
    '이스라엘-이란 적대 관계가 사상 최초로 양국 본토를 직접 타격하는 전면 무력 충돌로 비화한 사건이며, ' +
    '미국이 1979년 인질 사태 이후 처음으로 이란 영토에 대한 직접 군사 공격을 수행한 사건이기도 하다. ' +
    '\n\n' +
    '주요 표적은 이란의 우라늄 농축 시설 3곳(나탄즈·포르도·이스파한), IRGC 본부와 군 지도부, ' +
    '탄도미사일 발사대와 저장 시설이었다. 이란은 보복으로 이스라엘 본토에 대해 ' +
    '약 500발 이상의 탄도미사일과 1,000기 이상의 자폭 드론을 발사했으며, ' +
    '일부가 텔아비브·하이파·베르셰바 등에 명중해 약 28명의 이스라엘인이 사망했다. ' +
    '이란 측 사망자는 정부 공식 발표 약 627명, 서방 추정 1,000명 이상으로 집계되었으며, ' +
    'IRGC 사령관 호세인 살라미·군 합참의장 모하마드 바게리·IRGC 항공우주군 사령관 ' +
    '아미르 알리 하지자데를 포함한 약 30명의 고위 군 인사와 다수의 핵 과학자가 사망했다.',
  location:
    '이란(테헤란·나탄즈·포르도·이스파한·타브리즈·아라크·반다르압바스), ' +
    '이스라엘(텔아비브·하이파·베르셰바·예루살렘 근교), ' +
    '카타르(알우데이드 미군 기지) — 광역 중동 전구.',
  background:
    '1979년 이슬람 혁명 이후 이란 신정 체제와 이스라엘 사이의 적대는 약 46년에 걸쳐 ' +
    '대리전·암살·사이버 공격·핵 시설 사보타주 등 그림자 전쟁(shadow war) 형태로 지속되어 왔다. ' +
    '본 전쟁의 직접적 배경은 2023년 10월 7일 하마스 기습 이후의 광역 중동 정세 격변과 ' +
    '2025년 봄 미국-이란 핵 협상 결렬의 결합이다. ' +
    '\n\n' +
    '2023-10-07 이후 약 20개월 — 하마스 기습으로 가자 전쟁이 발발한 이래 ' +
    '이스라엘은 헤즈볼라(2024-09 페이저 작전·나스랄라 사살)·후티(예멘 항만 폭격)· ' +
    '시리아 아사드 정권 붕괴(2024-12) 등 "저항의 축" 거의 모든 위성 세력을 ' +
    '제거하거나 무력화하면서 이란 본토에 대한 직접 공격의 전략적 환경을 정비했다. ' +
    '\n\n' +
    '2024년 4월·10월 이스라엘-이란 직접 미사일 교전 — 2024년 4월 13~14일 이란이 ' +
    '시리아 다마스쿠스 이란 영사관 공습 보복으로 약 300발의 미사일·드론을 이스라엘에 발사 ' +
    '(거의 모두 요격), 10월 1일에는 약 180발의 탄도미사일을 발사해 ' +
    '일부가 군 기지에 명중. 이로써 양국 간 직접 타격의 금기가 깨졌고, ' +
    '본 전쟁의 군사적 임계점이 형성되었다. ' +
    '\n\n' +
    '2025년 4~5월 미국-이란 핵 협상 결렬 — 2025년 1월 20일 트럼프 2기 행정부 출범 후 ' +
    '4월부터 오만의 중재로 트럼프 특사 스티브 위트코프(Steve Witkoff)와 ' +
    '이란 외무장관 압바스 아라그치(Abbas Araghchi) 사이에 5차례 핵 협상이 진행되었으나 ' +
    '"우라늄 농축 권리"에 대한 양측 입장 차로 결렬. 이스라엘은 협상 결렬을 ' +
    '군사 옵션 발동의 사실상 청신호로 해석했다. ' +
    '\n\n' +
    '2025-05 IAEA 결의안과 6월 12일 비협조 결정 — 2025-06-12 IAEA 이사회가 ' +
    '약 20년 만에 처음으로 이란의 핵확산금지조약(NPT) "비협조 상태(non-compliance)" 결의를 채택. ' +
    '같은 날 이스라엘 안보내각이 24시간 후 작전 개시를 만장일치로 승인했다. ' +
    '\n\n' +
    '이란 핵 프로그램의 임계점 도달 — IAEA의 2025년 5월 보고에 따르면 이란이 보유한 ' +
    '60% 농축 우라늄이 약 408kg에 달해, 무기급(90%) 농축으로 전환 시 ' +
    '핵폭탄 9~10기를 제조할 수 있는 양에 도달했다는 점이 결정적이었다. ' +
    '이스라엘은 이를 "되돌릴 수 없는 임계점(point of no return)"으로 규정했다.',
  aftermath:
    '2025-06-24 휴전 발효와 이행 — 트럼프 미국 대통령이 6월 24일 새벽 4시(미 동부시간) ' +
    'Truth Social에 "양측이 단계적 휴전에 합의했다"고 발표. 카타르 총리 무함마드 빈 압둘라흐만 알사니가 ' +
    '실무 중재를 맡았다. 그러나 발효 직후 양측 모두 추가 교전을 시도해 ' +
    '트럼프가 백악관 출입 기자단에 "양국 모두 자기들이 뭘 하는지 모른다"고 격노한 장면이 화제가 되었다. ' +
    '24일 정오경 양측 공격이 완전 중단되면서 공식 정전 상태에 진입. ' +
    '\n\n' +
    '핵 시설 피해 평가의 논쟁 — 트럼프는 6월 22일 미드나잇 해머 작전 직후 ' +
    '"이란 핵 프로그램이 완전히 파괴(obliterated)되었다"고 선언했으나, ' +
    '6월 24일 미 국방정보국(DIA)의 기밀 평가가 언론에 유출되면서 ' +
    '"파괴가 아니라 수개월의 지연(setback by months) 수준"이라는 평가가 공개되었다. ' +
    'IAEA 사무총장 라파엘 그로시도 7월 보고에서 ' +
    '"포르도·나탄즈에 상당한 손상이 있으나 농축 우라늄 약 408kg의 행방은 불명"이라고 평가, ' +
    '이란이 사전에 이를 분산 은닉했을 가능성을 시사했다. ' +
    '\n\n' +
    '이란의 IAEA 협력 중단 — 이란 의회가 6월 25일 IAEA 협력 중단 법안을 통과시키고 ' +
    '7월 2일 페제시키안 대통령이 서명. 약 20년간 유지되던 ' +
    '이란 핵 프로그램에 대한 국제 사찰이 사실상 종결되었으며, ' +
    'NPT 탈퇴 가능성도 공식 거론되기 시작했다. ' +
    '본 전쟁이 역설적으로 이란 핵 문제의 투명성을 후퇴시켰다는 평가가 부상했다. ' +
    '\n\n' +
    '이스라엘 국내 정치의 결속 — 네타냐후 총리는 2023-10-07 이후 약 20개월간 누적된 ' +
    '국내 정치적 압박(인질 협상 지연·사법 개혁 논란·연정 균열)이 ' +
    '본 전쟁 승리 선언으로 일시적으로 해소. 6월 말 여론조사에서 리쿠드 지지율이 ' +
    '약 5%포인트 상승하면서 2026년 조기 총선 가능성이 후퇴했다. ' +
    '\n\n' +
    '이란 체제의 내부 통합 효과 — 이란 측에서는 본 공격이 역설적으로 ' +
    '하메네이 체제에 대한 국민적 결집 효과를 발생시켰다는 평가가 부상. ' +
    '2022년 마흐사 아미니 항의로 누적되어 있던 반체제 정서가 ' +
    '"외세 침공에 대한 대응" 논리에 의해 일시적으로 흡수되었다. ' +
    '\n\n' +
    '미국-이란 외교의 사실상 결렬 — 트럼프 행정부가 6월 휴전 직후 ' +
    '이란과의 핵 협상 재개 의사를 시사했으나, 이란 측은 ' +
    '"폭격 후 협상은 굴복 강요"라며 거부. 약 2개월간의 협상 시도가 ' +
    '결실 없이 종료되면서 트럼프 1기에 이어 2기에서도 미-이란 외교 정상화가 좌절되었다. ' +
    '\n\n' +
    '중동 전략 지형의 재편 — 본 전쟁으로 (1)이란이 보유한 그림자 전쟁 자원(헤즈볼라·후티·하마스)이 ' +
    '거의 소진된 상태에서 본토가 직접 타격을 받음으로써 약 46년간의 "저항의 축" 패권이 사실상 종결, ' +
    '(2)이스라엘이 사우디·UAE 등 수니파 아랍 국가들과의 사실상의 대(對)이란 공조를 더 깊이 확립, ' +
    '(3)미국이 이란의 핵 위협을 군사력으로 직접 차단할 수 있다는 선례를 확립하면서 ' +
    '동시기 다른 핵 확산 시나리오(북한·잠재 핵 보유국)에 대한 억지 효과를 강화. ' +
    '\n\n' +
    '장기적 핵 확산의 역설 — 본 전쟁에도 불구하고 이란이 농축 우라늄 비축분을 보존했을 가능성, ' +
    'IAEA 사찰이 중단된 점, 이란 의회 내 "핵 무장 결단" 목소리가 커진 점 등을 종합할 때 ' +
    '본 작전이 역설적으로 이란의 핵 무장 동기를 강화했을 수 있다는 우려가 ' +
    '서방 군축 전문가 사이에서 부상했다. 본 전쟁의 가장 긴 영향은 향후 5~10년에 걸친 ' +
    '이란 핵 정책의 향방에 따라 결정될 것으로 평가된다.',
  keywords: [
    '이란-이스라엘 전쟁',
    '12일 전쟁',
    'June 2025 Iran-Israel War',
    '라이징 라이언 작전',
    'Operation Rising Lion',
    '미드나잇 해머 작전',
    'Operation Midnight Hammer',
    'GBU-57',
    'B-2 스피릿',
    '포르도',
    '나탄즈',
    '이스파한',
    '알우데이드',
    '트럼프',
    '네타냐후',
    '하메네이',
    '페제시키안',
    '살라미',
    'IRGC',
    'IAEA',
    'NPT',
    '저항의 축',
    'JCPOA',
  ] as any,
} as const

// ── EventSection 본문 ───────────────────────────────────────────────────────
const SECTIONS: Array<{
  title: string
  content: string
  order: number
  sectionType?: string
}> = [
  {
    order: 1,
    title: '배경 — 46년 그림자 전쟁의 임계점',
    sectionType: 'background',
    content: `<p>본 전쟁은 1979년 이슬람 혁명 이래 약 46년간 누적된 이스라엘-이란 적대 관계, 2023년 10월 가자 전쟁 이후 광역 중동 정세 변동, 2025년 봄 미국-이란 핵 협상 결렬이라는 세 갈래 요인이 결합한 결과였다.</p>

<h3>1. 46년 그림자 전쟁의 누적</h3>
<ul>
  <li><strong>1979 이란 혁명 이후 적대 구조 형성</strong>: 호메이니 체제 출범 후 이란이 이스라엘 국가 자체를 부인하면서 양국 간 외교 관계가 단절. 이후 약 46년간 헤즈볼라(레바논)·하마스(가자)·후티(예멘)·시리아 아사드 정권 등 이란이 후원하는 "저항의 축(Axis of Resistance)"을 매개로 한 대리전 구조가 형성되었다.</li>
  <li><strong>이란 핵 프로그램의 단계적 진전</strong>: 2002년 나탄즈·아라크 시설 발각 이후 약 23년간 IAEA 사찰과 외교 협상이 반복되었으나 우라늄 농축 수준이 점진적으로 상승. 2015년 JCPOA로 일시적으로 봉인되었다가 2018년 트럼프 1기의 일방적 탈퇴 후 다시 가속.</li>
  <li><strong>비밀 사보타주의 누적</strong>: 2010년 스턱스넷(Stuxnet) 사이버 공격, 2020년 모센 파흐리자데(핵 과학자) 암살, 2021년 나탄즈 시설 폭발 사건 등 이스라엘 측의 정밀한 비밀 작전이 누적. 한편 IRGC의 대(對)이스라엘 작전도 다양한 형태로 지속.</li>
</ul>

<h3>2. 2023~2024년 광역 중동 정세 격변</h3>
<ul>
  <li><strong>2023-10-07 하마스 기습</strong>: 약 1,200명의 이스라엘인 사망·약 250명 납치를 초래한 사상 최대 규모의 대(對)이스라엘 공격. 이스라엘 안보 정책 전반의 재정렬을 촉발.</li>
  <li><strong>2024 가자 전쟁과 헤즈볼라 와해</strong>: 가자 전쟁 장기화와 더불어 2024-09 헤즈볼라 "페이저 작전"·나스랄라 사살로 헤즈볼라 지도부가 사실상 와해. 이란의 핵심 위성 무력이 결정적으로 약화되었다.</li>
  <li><strong>2024-12 시리아 아사드 정권 붕괴</strong>: HTS(하야트 타흐리르 알샴) 주도의 12일 공세로 아사드 정권이 붕괴, 시리아가 이란의 영향권에서 이탈. 이로써 이란이 헤즈볼라·후티에 물자를 보내던 "시아파 회랑"이 단절되었다.</li>
  <li><strong>2024-04 및 10월 이스라엘-이란 직접 미사일 교전</strong>: 양국 간 직접 타격의 금기가 처음으로 깨진 사건. 4월 이란의 약 300발 미사일·드론 공격(거의 모두 요격), 10월 이란의 약 180발 탄도미사일 공격(일부 군 기지 명중)으로 양국 군사적 임계점이 형성되었다.</li>
</ul>

<h3>3. 2025년 봄 핵 협상 결렬</h3>
<ul>
  <li><strong>2025-01-20 트럼프 2기 출범</strong>: 1기 임기 중 JCPOA를 탈퇴했던 트럼프가 재집권. 그러나 부동산 사업가 출신 특사 스티브 위트코프를 통한 외교 협상 노선을 동시에 추진.</li>
  <li><strong>2025-04~05 오만 중재 5차 협상</strong>: 4월부터 약 두 달 동안 오만의 중재로 위트코프와 이란 외무장관 압바스 아라그치 간 다섯 차례 핵 협상이 진행. 주요 쟁점은 우라늄 농축 권리·기존 농축 우라늄 처리·제재 해제 시점이었다.</li>
  <li><strong>2025-05-31 5차 협상 결렬</strong>: 미국 측이 "우라늄 농축 완전 중단(zero enrichment)"을 요구한 반면 이란 측은 "민간용 농축 권리 유지"를 고수하면서 협상이 사실상 결렬. 이스라엘은 이를 군사 옵션의 청신호로 해석했다.</li>
</ul>

<h3>4. 2025-06-12 IAEA 결의안과 작전 개시 결정</h3>
<ul>
  <li><strong>6월 12일 IAEA 이사회 결의</strong>: 약 20년 만에 처음으로 이란의 NPT "비협조 상태(non-compliance)" 결의를 채택. 영국·프랑스·독일이 공동 발의했고, 35개국 중 19개국 찬성으로 통과되었다.</li>
  <li><strong>같은 날 이스라엘 안보내각 결의</strong>: 같은 6월 12일 이스라엘 안보내각이 작전 개시를 만장일치로 승인. 발동 시점은 24시간 후인 6월 13일 새벽으로 결정.</li>
  <li><strong>임계점 — 60% 농축 우라늄 408kg</strong>: IAEA의 2025-05 보고에 따르면 이란이 보유한 60% 농축 우라늄이 약 408kg. 무기급(90%) 농축으로 전환 시 핵폭탄 9~10기 제조 가능량. 이스라엘은 이를 "되돌릴 수 없는 임계점"으로 규정했다.</li>
</ul>`,
  },
  {
    order: 2,
    title: '개전 — 라이징 라이언 작전 (2025-06-13)',
    sectionType: 'process',
    content: `<p>2025년 6월 13일 새벽 0시 30분경 이스라엘 공군이 약 200대의 전투기를 동원해 이란 전역의 군 지도부·핵 시설·미사일 발사대 약 100개 표적을 동시 타격한 라이징 라이언 작전(Operation Rising Lion)이 개시되었다. 동시에 모사드(이스라엘 정보기관)가 이란 영내에 사전 침투시킨 공작원들이 무인기·정밀 무기로 핵심 인사들을 표적 암살했다.</p>

<h3>1. 공습 규모와 표적</h3>
<ul>
  <li><strong>참여 전력</strong>: 이스라엘 공군 F-15I 라암(Ra'am)·F-16I 수파(Sufa)·F-35I 아디르(Adir) 약 200대. 공중 급유기 KC-707·KC-46 다수 동반. 작전 반경 약 1,800km로 이스라엘 공군 사상 최대 규모의 장거리 작전.</li>
  <li><strong>1차 표적 — 군 지도부</strong>: 테헤란 시내 IRGC 사령부 벙커, IRGC 항공우주군 사령부, 군 합참 사령부 등 약 12개 지휘 시설. 살라미 IRGC 사령관·바게리 합참의장·하지자데 IRGC 항공우주군 사령관 등 약 30명의 고위 군 인사가 동시에 사망.</li>
  <li><strong>2차 표적 — 핵 시설</strong>: 나탄즈 우라늄 농축 시설(지상부 파괴), 이스파한 우라늄 변환 시설, 아라크 중수로 시설. 다만 산악 지대 지하 깊숙이 위치한 포르도(Fordow) 시설은 이스라엘 공군 단독으로는 파괴가 어려워 1차 작전에서 제한적 타격만 이루어졌다.</li>
  <li><strong>3차 표적 — 미사일 전력</strong>: 이란 전역 약 30개 미사일 발사대·저장 시설. 셰하브-3·세질·하이바르 등 이스라엘 도달 가능한 중거리 탄도미사일 다수 파괴.</li>
</ul>

<h3>2. 모사드의 동시 작전</h3>
<ul>
  <li><strong>사전 침투 공작</strong>: 이스라엘 모사드가 사전에 이란 영내에 침투시킨 공작원들이 작전 D-Day에 다층적 표적 암살을 동시 수행. 약 14명의 핵 과학자(테헤란·이스파한 거주)가 공습 직후 12시간 내 사망 또는 실종.</li>
  <li><strong>드론 활용</strong>: 이란 영내에서 조립된 소형 자폭 드론들이 모사드 공작원들에 의해 발사되어 특정 인사의 자택·이동 경로를 표적 타격. 이는 2024년 9월 헤즈볼라 페이저 작전과 유사한 사전 침투 방식이다.</li>
  <li><strong>사이버 공격</strong>: 작전 시점에 맞춰 이란 전기·통신·은행 시스템에 대한 대규모 사이버 공격이 병행. 약 6시간 동안 테헤란 일부 지역 정전, 이란 국영 방송 일시 송출 중단.</li>
</ul>

<h3>3. 이란의 1차 보복 — 6월 13~14일</h3>
<ul>
  <li><strong>지휘 공백</strong>: 살라미·바게리·하지자데의 동시 사망으로 이란군 최고위 지휘부에 약 48시간의 공백이 발생. 후임 지명과 작전 안정화에 시간이 걸리면서 초기 반격이 체계화되지 못함.</li>
  <li><strong>6월 13일 오후 1차 보복 미사일</strong>: 약 100여 발의 탄도미사일·드론을 이스라엘에 발사. 대부분 아이언 돔·다비드 슬링·애로 3 다층 방공망에 요격되었으나 일부가 텔아비브 외곽에 명중해 약 3명 사망.</li>
  <li><strong>6월 14일 본격 보복</strong>: 약 200발의 탄도미사일·150여 기 자폭 드론 발사. 베르셰바(소로카 병원 부근)·하이파 정유공장 등에 일부 명중해 약 11명 사망. 본 전쟁 기간 중 단일 최대 인명 피해를 낸 공격.</li>
</ul>`,
  },
  {
    order: 3,
    title: '경과 — 6월 14일~21일의 상호 공습전',
    sectionType: 'process',
    content: `<p>개전 후 약 1주일간 양측은 매일 상호 공습을 반복하면서 점차 공격 강도와 표적 범위를 확대했다. 이스라엘은 추가 핵 시설·산업·에너지 기반 시설로 표적을 확대했고, 이란은 매일 약 50~200발 규모의 미사일·드론 공격을 지속했다.</p>

<h3>1. 이스라엘의 확장 공습</h3>
<ul>
  <li><strong>6월 15일~17일 — 에너지 인프라 타격</strong>: 이스라엘 공군이 이란의 정유시설·천연가스 저장소·발전소를 표적에 추가. 테헤란 남부 샤흐란 가스 저장소 폭발로 시민 거주 지역에도 광범위한 화재 발생.</li>
  <li><strong>6월 18일~19일 — 미사일 생산 시설</strong>: 이란의 탄도미사일 제조 거점인 파르친(Parchin)·세만(Semnan) 산업 단지를 대규모 타격. 이로 인해 이란의 미사일 비축 잔량이 약 40% 추가 감소한 것으로 평가된다.</li>
  <li><strong>6월 20일~21일 — 지휘 통제 시스템</strong>: 이란군의 통신·레이더·방공망 등 지휘 통제(C4I) 인프라를 집중 타격. 이로써 이란의 통합 방공망이 사실상 마비.</li>
</ul>

<h3>2. 이란의 미사일·드론 보복</h3>
<ul>
  <li><strong>매일 약 50~200발 발사</strong>: 6월 14일 이후 약 1주일간 이란이 매일 평균 100여 발의 탄도미사일·자폭 드론을 발사. 셰하브-3, 세질, 하이바르, 카드르 등 다양한 중거리 탄도미사일 동원.</li>
  <li><strong>요격률의 추세</strong>: 초기 약 90%였던 이스라엘 다층 방공망의 요격률이 약 1주일 경과 후 75%대로 하락. 이란이 다양한 비행 궤도와 양동 작전을 통해 방공망을 과부하 시키려 한 결과로 평가된다.</li>
  <li><strong>최대 피해 — 6월 17일 베르셰바·하이파</strong>: 이란의 약 200발 동시 발사로 베르셰바 소로카 의료센터 부근·하이파 정유공장에 명중, 약 11명 사망·100명 이상 부상.</li>
  <li><strong>드론 작전</strong>: 약 1,000기 이상의 샤헤드-136 자폭 드론도 발사되었으나 대부분 아이언 돔·F-35I 공중 요격으로 무력화. 일부가 이스라엘 남부 농가 등에 명중해 산발적 피해.</li>
</ul>

<h3>3. 이란의 인적 피해 누적</h3>
<ul>
  <li><strong>군 사망자</strong>: 개전 1주일 시점에서 약 30명의 고위 군 인사 외에 IRGC·정규군 약 1,500명 이상이 사망 또는 부상한 것으로 추정. IRGC의 작전 능력이 결정적으로 약화.</li>
  <li><strong>핵 과학자 사망</strong>: 페레이둔 아바시(Fereydoon Abbasi, 전 이란 원자력기구 수장) 등 약 14명의 핵 과학자가 사망. 약 30년에 걸친 이란 핵 프로그램의 인적 자본이 결정적 타격을 입었다.</li>
  <li><strong>민간인 피해</strong>: 정부 공식 발표 약 627명(휴전 시점), 비공식 추정 1,000명 이상. 테헤란 일부 주거 지역의 부수적 피해 누적.</li>
</ul>

<h3>4. 국제사회의 반응</h3>
<ul>
  <li><strong>G7 정상회의(6월 15~17일 캐나다)</strong>: 본 전쟁 중반에 개최된 G7 정상회의에서 이스라엘의 군사 행동을 사실상 묵인하면서 이란의 핵무기 보유 차단 입장을 재확인. 트럼프가 회의 도중 미국 개입 가능성을 처음으로 시사.</li>
  <li><strong>러시아·중국의 비난 성명</strong>: 러시아·중국이 이스라엘의 선제 공격을 강하게 비난했으나 이란에 대한 직접적 군사 지원은 회피. 이란의 "포괄적 전략 동반자 협정" 파트너이면서도 군사 개입은 자제하는 모습.</li>
  <li><strong>UN 안보리</strong>: 6월 14일 긴급 회의 소집되었으나 미국의 거부권 행사로 결의안 채택 실패. 이후 약 1주일간 외교적 공전 상태.</li>
</ul>`,
  },
  {
    order: 4,
    title: '미국 개입 — 미드나잇 해머 작전 (2025-06-22)',
    sectionType: 'process',
    content: `<p>2025년 6월 22일 새벽(현지시간 6월 21일 밤) 미국이 B-2 스텔스 폭격기 7기와 GBU-57 벙커버스터 14발, USS 조지아 잠수함의 토마호크 미사일 약 30발을 동원해 이란의 포르도·나탄즈·이스파한 핵 시설을 직접 타격하는 미드나잇 해머 작전(Operation Midnight Hammer)을 실행했다. 미국이 1979년 인질 사태 이후 처음으로 이란 영토에 대한 직접 군사 공격을 수행한 사건이다.</p>

<h3>1. 작전 결정과 배경</h3>
<ul>
  <li><strong>네타냐후의 요청</strong>: 이스라엘 공군이 단독으로는 산악 지대 지하 약 80~90m 깊이의 포르도 시설을 파괴할 수 없는 한계가 분명해지자, 네타냐후가 6월 17일경부터 트럼프에게 GBU-57(Massive Ordnance Penetrator) 사용을 직접 요청.</li>
  <li><strong>트럼프의 결정 — 6월 19일</strong>: 약 이틀간의 안보회의 끝에 6월 19일 트럼프가 작전 실행을 최종 결재. 같은 날 백악관이 "2주 이내 결정"을 공식 표명했으나 실제로는 3일 후인 6월 22일 실행되었다.</li>
  <li><strong>의회 통보 회피</strong>: 트럼프 행정부가 의회에 사전 통보 없이 작전을 실행. 일부 민주당 의원들이 헌법상 전쟁권한법(War Powers Act) 위반 가능성을 제기했으나 정치적 동력 부족으로 의회 차원의 대응 없음.</li>
</ul>

<h3>2. 작전 규모와 타격 무기</h3>
<ul>
  <li><strong>B-2 스피릿 폭격기 7기</strong>: 미주리주 화이트맨 공군기지에서 출격, 약 18시간 무착륙 비행. 인도양 디에고가르시아 기지에서 1기 추가 합류해 총 7기로 임무 수행. 미국 보유 B-2 약 19기 중 36%가 동원된 대규모 작전.</li>
  <li><strong>GBU-57 MOP(Massive Ordnance Penetrator) 14발</strong>: 무게 약 13,600kg, 콘크리트 약 60m·강화 콘크리트 약 8m 관통이 가능한 미국 최대 규모의 재래식 벙커버스터. 포르도에 12발, 나탄즈에 2발 투하.</li>
  <li><strong>토마호크 순항미사일 약 30발</strong>: USS 조지아(Ohio급 SSGN 잠수함)에서 발사. 이스파한 우라늄 변환 시설을 표적으로 타격.</li>
  <li><strong>기만 작전</strong>: 본 임무 비행 직전 미국이 일부 B-2를 태평양 괌 방향으로 양동 비행 시켜 이란·중국·러시아의 정찰 자원을 분산시키는 기만 작전을 동시 수행.</li>
</ul>

<h3>3. 타격 직후의 결과 발표</h3>
<ul>
  <li><strong>트럼프의 백악관 발표</strong>: 6월 22일 오후 10시경(미 동부시간) 트럼프가 백악관에서 긴급 연설. "이란의 핵심 핵 시설 3곳이 완전히 그리고 결정적으로 파괴(obliterated)되었다"고 선언. "이 작전은 군사사의 빛나는 성공"이라 표현.</li>
  <li><strong>국방장관 피트 헤그세스 브리핑</strong>: 6월 23일 새벽 펜타곤 브리핑에서 작전 명령 4시간 만에 실행되었고 양 작전 모두 완전 성공이라 발표.</li>
  <li><strong>합참의장 댄 케인 장군</strong>: 작전의 군사적 세부 사항을 설명하며 미국 공군 사상 최대의 B-2 동시 운용 작전이라 평가.</li>
</ul>

<h3>4. 이란의 보복 — 알우데이드 미군 기지</h3>
<ul>
  <li><strong>6월 23일 알우데이드 공격</strong>: 미국 공격 약 24시간 후 이란이 카타르 도하 인근 알우데이드 미군 공군기지(중부사령부 본부 위치)에 약 14발의 단거리 탄도미사일을 발사. 사전 외교 채널을 통해 카타르·미국 측에 공격 사실과 시각을 통보, 사실상의 상징적 보복이었다.</li>
  <li><strong>인명 피해 없음</strong>: 카타르 측이 사전 경고를 받고 알우데이드 인력 대피, 미군 패트리어트 방공망이 발사된 14발 중 13발 요격, 나머지 1발도 비어 있는 격납고에 명중해 인명 피해 없음.</li>
  <li><strong>트럼프의 반응</strong>: 트럼프가 이란의 "체면 살리기(face-saving) 보복"을 공개적으로 인정하고 "이란이 더 이상 보복하지 않을 것을 기대한다"는 메시지를 Truth Social에 게재. 사실상 즉시 휴전 협상 신호.</li>
</ul>`,
  },
  {
    order: 5,
    title: '휴전 — 2025-06-24',
    sectionType: 'process',
    content: `<p>2025년 6월 23일 알우데이드 공격 후 약 12시간 만에 트럼프 미국 대통령이 휴전을 발표, 6월 24일 정오경 양측 공격이 완전 중단되면서 12일간의 무력 분쟁이 공식 종결되었다.</p>

<h3>1. 휴전 합의 과정</h3>
<ul>
  <li><strong>6월 23일 카타르 중재</strong>: 알우데이드 공격 직후 카타르 총리 무함마드 빈 압둘라흐만 알사니가 미국·이란·이스라엘 3자에 동시에 휴전 제안. 트럼프와 직접 통화로 휴전안 조율.</li>
  <li><strong>6월 24일 04:00 트럼프 발표</strong>: 트럼프가 6월 24일 새벽 4시(미 동부시간) Truth Social에 "축하한다! 12일 전쟁(The 12-Day War)에 대한 완전하고 총체적인 휴전에 도달했다"고 발표. 단계적 휴전 — 이란이 먼저 12시간 동안 공격 중단, 이후 이스라엘이 12시간 동안 중단하는 방식.</li>
  <li><strong>휴전 초기 위기 — 6월 24일 오전</strong>: 발효 직후 양측 모두 일부 추가 교전을 시도. 이스라엘이 휴전 발효 약 5시간 후 이란에 추가 공습을 감행하자 트럼프가 백악관 출입 기자단에 "양국 모두 자기들이 뭘 하는지 모른다(don't know what the fuck they're doing)"고 격노한 장면이 화제가 되었다.</li>
  <li><strong>6월 24일 정오 완전 정전</strong>: 트럼프의 격앙된 메시지 직후 양측이 완전히 공격을 중단. 정오경부터 공식 정전 상태에 진입.</li>
</ul>

<h3>2. 휴전 조건의 미명문화</h3>
<ul>
  <li><strong>구두 합의 수준</strong>: 본 휴전은 정식 조약·각서 없이 구두 합의 수준으로만 성립. 명문화된 종전 조약이나 향후 핵 협상 일정 등은 합의되지 않았다.</li>
  <li><strong>핵 협상 재개 의향만 표명</strong>: 트럼프가 휴전 발표 시 이란과의 핵 협상 재개 의향을 시사했으나 이란 측 반응은 부정적이었다.</li>
  <li><strong>표적 사망 인사 처리</strong>: 이란 측 군 지도부 약 30명의 사망과 핵 과학자 사망은 휴전 협상에서 다뤄지지 않음. 이란 내부적으로는 후임 임명이 신속히 이루어졌다.</li>
</ul>

<h3>3. 양측의 즉각적 평가</h3>
<ul>
  <li><strong>트럼프 — "역사적 승리"</strong>: 트럼프가 6월 24일 백악관 연설에서 "이란 핵 프로그램이 완전히 파괴되었으며 향후 수십 년간 위협이 되지 못할 것"이라 자평. "베트남 이래 미국의 가장 결정적 군사 작전"이라 표현.</li>
  <li><strong>네타냐후 — "이스라엘 역사의 위대한 순간"</strong>: 네타냐후가 같은 날 텔아비브에서 기자회견을 열고 "이스라엘이 1948년 건국 이래 가장 큰 군사·외교적 승리를 거뒀다"고 평가. 정부 지지율 일시적으로 약 5%포인트 상승.</li>
  <li><strong>하메네이 — "신의 가호"</strong>: 하메네이가 6월 26일 영상 메시지에서 "신의 가호로 시오니즘 정권의 분쇄에 결정적 타격을 입혔다"고 자평. 이란 측은 알우데이드 공격을 "미국의 전쟁 능력에 대한 결정적 타격"이라 선전했다.</li>
</ul>`,
  },
  {
    order: 6,
    title: '후속 — 핵 시설 평가 논쟁과 중동 전략 지형의 재편',
    sectionType: 'aftermath',
    content: `<p>휴전 직후 핵 시설 피해 평가를 둘러싼 논쟁, 이란의 IAEA 협력 중단 결정, 미국-이란 외교의 사실상 결렬, 중동 전략 지형의 광범위한 재편 등 다층적 후속 영향이 단기간에 누적되었다.</p>

<h3>1. 핵 시설 피해 평가의 논쟁</h3>
<ul>
  <li><strong>트럼프 — "완전 파괴"</strong>: 6월 22일 작전 직후 트럼프가 "이란 핵 프로그램이 완전히 파괴(obliterated)되었다"고 선언.</li>
  <li><strong>DIA 기밀 평가 유출 — 6월 24일</strong>: 미 국방정보국(DIA)의 초기 기밀 평가가 CNN·뉴욕 타임스에 유출되면서 "파괴가 아니라 수개월의 지연(setback by months) 수준"이라는 평가가 공개. 트럼프가 격노하며 정보기관에 누설자 색출을 지시.</li>
  <li><strong>IAEA의 평가 — 7월</strong>: IAEA 사무총장 라파엘 그로시가 7월 보고에서 "포르도·나탄즈에 상당한 손상이 있으나 농축 우라늄 약 408kg의 행방은 불명. 이란이 사전에 분산 은닉했을 가능성"을 평가. 향후 수년간의 사찰이 없으면 정확한 평가 불가능.</li>
  <li><strong>이스라엘 군 정보국(아만)</strong>: "포르도·나탄즈는 약 1~2년의 지연, 이스파한은 약 6개월의 지연" 수준으로 평가. 트럼프 발표보다 보수적이지만 DIA 평가보다는 낙관적.</li>
</ul>

<h3>2. 이란의 IAEA 협력 중단</h3>
<ul>
  <li><strong>6월 25일 의회 통과·7월 2일 서명</strong>: 이란 의회가 6월 25일 IAEA 협력 중단 법안을 통과시키고 7월 2일 페제시키안 대통령이 서명. 약 20년간 유지되던 이란 핵 프로그램에 대한 국제 사찰이 사실상 종결.</li>
  <li><strong>사찰관 추방</strong>: 7월 중 이란 영내 IAEA 사찰관이 모두 추방. 1992년 이래 처음으로 이란 핵 시설에 대한 국제 감시가 완전 차단되었다.</li>
  <li><strong>NPT 탈퇴 가능성</strong>: 이란 의회 내 강경파가 NPT(핵확산금지조약) 자체 탈퇴를 공식 제안. 페제시키안은 이를 "최후 옵션"으로 유보했으나 가능성은 열어둠.</li>
  <li><strong>역설적 효과</strong>: 본 전쟁의 명분이었던 "이란 핵 투명성 확보"가 결과적으로 후퇴, 본 작전이 핵 확산 문제를 오히려 악화시켰다는 평가가 부상.</li>
</ul>

<h3>3. 인적·물적 피해의 최종 집계</h3>
<ul>
  <li><strong>이란 측</strong>: 정부 공식 발표 약 627명 사망(휴전 시점), 서방 추정 1,000명 이상. 군 사망자 중 IRGC 사령관 살라미·합참의장 바게리·항공우주군 사령관 하지자데를 포함한 약 30명의 고위 군 인사. 약 14명의 핵 과학자 사망.</li>
  <li><strong>이스라엘 측</strong>: 사망 28명(군인 4·민간인 24), 부상 약 800명. 텔아비브·하이파·베르셰바 등의 부수적 도시 피해. 2024-10 이란 미사일 공격 시 사망 1명과 비교하면 약 28배 증가.</li>
  <li><strong>미국 측</strong>: 알우데이드 공격에서 인명 피해 없음. 시설 일부 손상.</li>
  <li><strong>이란 인프라 피해</strong>: 정유 시설·발전소·미사일 생산 시설·통신망 광범위 피해. 추정 복구 비용 약 500억 달러 이상.</li>
</ul>

<h3>4. 미국-이란 외교의 사실상 결렬</h3>
<ul>
  <li><strong>핵 협상 재개 시도</strong>: 트럼프 행정부가 휴전 직후 위트코프 특사를 다시 활용한 핵 협상 재개 의사를 표명했으나, 이란 측은 "폭격 후 협상은 굴복 강요"라며 거부.</li>
  <li><strong>2025-08~09 협상 시도 좌초</strong>: 약 2개월간 오만·카타르 중재의 비공식 외교 채널이 가동되었으나 양측의 입장 차이가 더 벌어진 상태에서 좌초.</li>
  <li><strong>트럼프 1기·2기 동시 좌절</strong>: 트럼프 1기의 2018년 JCPOA 탈퇴 이후 2기의 외교 시도 좌절까지 약 7년에 걸친 미-이란 외교 정상화 노력이 사실상 종결.</li>
</ul>

<h3>5. 중동 전략 지형의 재편</h3>
<ul>
  <li><strong>"저항의 축" 사실상 종결</strong>: 2023-10-07 이후 약 20개월간 이스라엘이 헤즈볼라(2024-09)·하마스(2024-2025)·후티(2024 예멘 항만)·시리아 아사드(2024-12)·이란(2025-06) 순으로 차례로 무력화. 1979년 이래 약 46년간 형성된 이란 주도 위성 무력 네트워크가 사실상 해체되었다.</li>
  <li><strong>아브라함 협정 확대 모색</strong>: 사우디아라비아·UAE·바레인 등 수니파 아랍 국가들이 본 전쟁 후 이스라엘과의 정상화·안보 협력 강화 의향을 시사. 트럼프 행정부가 사우디-이스라엘 정상화 협상 재개를 추진.</li>
  <li><strong>이라크 시아파 민병대의 위축</strong>: 이란의 지원을 받던 이라크 카타이브 헤즈볼라 등 시아파 민병대가 이란 본토의 약화로 작전 능력 위축. 이라크 정부의 시아파 민병대 통제 가능성이 부각.</li>
  <li><strong>러시아·중국의 영향력 제한</strong>: 이란의 "포괄적 전략 동반자" 협정 파트너인 러시아·중국이 본 전쟁 중 직접 군사 지원을 회피한 점이 양국의 중동 영향력 한계를 노출.</li>
</ul>

<h3>6. 장기적 핵 확산의 역설</h3>
<ul>
  <li><strong>핵 무장 동기 강화 가능성</strong>: 이란이 본 전쟁 경험을 토대로 "핵 보유국만이 미국의 직접 공격으로부터 안전하다"는 논리(이른바 리비아·우크라이나 사례)를 내부 정책으로 흡수할 가능성이 부상.</li>
  <li><strong>중요 우라늄 비축분 보존 의혹</strong>: 60% 농축 우라늄 약 408kg의 행방이 불명한 상태에서 이란이 이를 비밀 시설에서 90% 무기급으로 농축할 가능성이 거론.</li>
  <li><strong>NPT 체제의 위기</strong>: 이란의 IAEA 협력 중단·NPT 탈퇴 가능성이 1968년 이래 약 57년간 유지된 국제 핵 확산 방지 체제 자체에 균열을 가져올 우려.</li>
  <li><strong>5~10년 시계열 효과</strong>: 본 전쟁의 가장 긴 영향은 향후 5~10년에 걸친 이란 핵 정책의 향방에 따라 결정될 것으로 평가된다. 단기 군사 승리가 장기 핵 확산 위험을 완화시킨 것인지 혹은 가속시킨 것인지는 시간을 두고 평가될 사안이다.</li>
</ul>`,
  },
]

// ── 메인 시드 함수 ────────────────────────────────────────────────────────
export async function seedIranIsraelWar2025(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n📜 2025 이란-이스라엘 12일 전쟁 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 조회 ───────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀')
    return
  }

  const category = await prisma.eventCategory.findFirst({
    where: { name: EVENT_CATEGORY_NAME },
    select: { id: true },
  })
  if (!category) {
    console.warn(`  ⚠️  카테고리 '${EVENT_CATEGORY_NAME}' 미존재`)
    return
  }

  const usCountry = await prisma.country.findFirst({
    where: { name: '미국' },
    select: { id: true },
  })
  const israelCountry = await prisma.country.findFirst({
    where: { name: '이스라엘' },
    select: { id: true },
  })
  const iranCountry = await prisma.country.findFirst({
    where: { name: '이란' },
    select: { id: true },
  })
  if (!usCountry || !israelCountry || !iranCountry) {
    console.warn('  ⚠️  필수 국가 미존재 — country.seed가 먼저 실행되어야 함')
    return
  }

  // ── 1) 인물 등록 ────────────────────────────────────────────────────────
  console.log('\n  👥 인물 등록...')
  const personIdByOriginalName = new Map<string, string>()
  for (const p of PERSONS) {
    const existing = await prisma.person.findFirst({
      where: { originalName: p.originalName },
    })
    let personId: string
    if (existing) {
      personId = existing.id
      console.log(`    ⏭️  ${p.originalName ?? p.name} (이미 존재)`)
    } else {
      const created = await prisma.person.create({
        data: {
          name: p.name,
          surname: p.surname,
          originalName: p.originalName,
          biography: p.biography,
          birthEra: 'AD' as any,
          birthDate: new Date(p.birthYear, p.birthMonth - 1, p.birthDay),
          deathEra: p.deathYear ? ('AD' as any) : undefined,
          deathDate: p.deathYear
            ? new Date(p.deathYear, (p.deathMonth ?? 1) - 1, p.deathDay ?? 1)
            : undefined,
          deathCause: p.deathCause,
          isAlive: p.isAlive,
          gender: p.gender,
          nameDisplayOrder: p.nameDisplayOrder,
          influence: p.influence,
          accountId: ACCOUNT_ID,
        },
      })
      personId = created.id
      console.log(`    ✅ ${p.originalName ?? p.name} (영향력 ${p.influence})`)
    }
    personIdByOriginalName.set(p.originalName ?? p.name, personId)

    // 소속국가
    const countryId =
      p.countryName === '미국'
        ? usCountry.id
        : p.countryName === '이스라엘'
          ? israelCountry.id
          : iranCountry.id
    const affExists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId,
        countryId,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (!affExists) {
      await prisma.personCountryAffiliation.create({
        data: {
          personId,
          countryId,
          affiliationType: 'CITIZENSHIP' as any,
          priority: 0,
        },
      })
    }
  }

  // ── 2) 사건 등록 ────────────────────────────────────────────────────────
  const TITLE = '2025 이란-이스라엘 12일 전쟁'
  const START_DATE = '2025-06-13'
  const END_DATE = '2025-06-24'

  const existingEvent = await prisma.event.findFirst({
    where: {
      title: TITLE,
      startDate: new Date(START_DATE),
      deletedAt: null,
    },
  })

  let eventId: string
  if (existingEvent) {
    eventId = existingEvent.id
    console.log(`\n  ⏭️  사건 이미 존재 — 스킵: ${TITLE} (id=${eventId})`)
  } else {
    const created = await prisma.event.create({
      data: {
        title: TITLE,
        ...EVENT_BODY,
        startDate: new Date(START_DATE),
        startDatePrecision: 'day',
        endDate: new Date(END_DATE),
        endDatePrecision: 'day',
        categoryId: category.id,
        createdById: admin.id,
      },
    })
    eventId = created.id
    console.log(`\n  ✅ 사건 생성: ${TITLE} (id=${eventId})`)
  }

  // ── 3) EventSection ────────────────────────────────────────────────────
  console.log('\n  📜 본문 섹션 등록...')
  for (const section of SECTIONS) {
    const exists = await prisma.eventSection.findFirst({
      where: { eventId, title: section.title },
    })
    if (exists) {
      console.log(`    ⏭️  섹션 스킵: ${section.title}`)
      continue
    }
    await prisma.eventSection.create({
      data: {
        eventId,
        title: section.title,
        content: section.content,
        order: section.order,
        sectionType: section.sectionType ?? null,
      },
    })
    console.log(`    ✅ 섹션 생성: ${section.title}`)
  }

  // ── 4) EventCountryRelation ────────────────────────────────────────────
  console.log('\n  🌍 국가 관계 등록...')
  type RelInput = {
    countryName: string
    role: EventCountryRole
    roleDescription: string
  }
  const RELATIONS: RelInput[] = [
    {
      countryName: '이스라엘',
      role: EventCountryRole.INITIATOR,
      roleDescription:
        '2025-06-13 라이징 라이언 작전을 발동한 주도국. 네타냐후 총리·아만(군 정보국)·모사드· ' +
        '공군(F-15I/F-16I/F-35I 약 200대)·안보내각이 약 1년에 걸쳐 정교화한 작전을 실행. ' +
        '이란 IRGC 사령부·핵 시설·미사일 발사대 약 100개 표적을 동시 타격하며 ' +
        '살라미 IRGC 사령관·바게리 합참의장·하지자데 항공우주군 사령관 등 약 30명 고위 군 인사를 제거. ' +
        '12일 작전 결과 이란 핵 프로그램 수개월~수년 지연·약 28명 자국민 사상이라는 비용을 지불하면서 ' +
        '46년 그림자 전쟁의 결정적 분기점을 만들었다.',
    },
    {
      countryName: '미국',
      role: EventCountryRole.PARTICIPANT,
      roleDescription:
        '2025-06-22 미드나잇 해머 작전 실행국. 트럼프 대통령·헤그세스 국방장관·케인 합참의장 지휘. ' +
        'B-2 스피릿 7기·GBU-57 14발·USS 조지아 토마호크 30발을 동원해 ' +
        '포르도·나탄즈·이스파한 핵 시설을 직접 타격, 1979년 인질 사태 이래 ' +
        '이란 영토에 대한 첫 직접 군사 공격을 수행. 6월 24일 휴전을 직접 중재했으며 ' +
        '이후 "이란 핵 완전 파괴" 선언과 DIA 평가 유출 사이의 평가 논쟁이 부상.',
    },
    {
      countryName: '이란',
      role: EventCountryRole.VICTIM,
      roleDescription:
        '12일 전쟁의 주된 피격국. 하메네이 최고지도자·페제시키안 대통령 지휘. ' +
        '약 30명의 고위 군 인사와 14명의 핵 과학자가 사망, 정부 공식 627명·서방 추정 1,000명 이상 사망. ' +
        '핵 시설 3곳과 미사일 생산·정유·발전 인프라가 광범위 피해. ' +
        '약 500발 이상 탄도미사일·1,000기 이상 자폭 드론으로 보복했으나 ' +
        '이스라엘 다층 방공망에 대부분 요격. 6월 23일 알우데이드 미군 기지에 상징적 보복 ' +
        '(14발 미사일, 사전 경고로 인명 피해 없음) 후 6월 24일 휴전 수용. ' +
        '직후 IAEA 협력 중단 결정으로 핵 투명성 후퇴라는 역설적 결과가 발생했다.',
    },
    {
      countryName: '카타르',
      role: EventCountryRole.MEDIATOR,
      roleDescription:
        '휴전 중재국. 6월 23일 자국 영토 내 알우데이드 미군 기지가 이란 미사일 14발의 표적이 된 ' +
        '직후 총리 무함마드 빈 압둘라흐만 알사니가 미국·이란·이스라엘 3자에 동시에 휴전 제안. ' +
        '트럼프와의 직통 채널을 활용해 6월 24일 휴전 합의를 도출. ' +
        '본 전쟁의 종결이 사실상 카타르의 외교적 중재로 완성된 점이 특기할 만하다.',
    },
    {
      countryName: '영국',
      role: EventCountryRole.OBSERVER,
      roleDescription:
        '6월 12일 IAEA 결의안의 공동 발의국(영·프·독 E3). 전쟁 기간 중 직접 군사 개입은 없었으나 ' +
        '미·이스라엘 측에 외교적 지지를 제공. 영국군이 운영하는 키프로스 아크로티리 기지가 ' +
        '미국 군 수송기의 중간 기착지로 활용. 휴전 이후 이란 핵 협상 재개를 위한 E3 채널 가동을 모색.',
    },
  ]

  for (const rel of RELATIONS) {
    const c = await prisma.country.findFirst({
      where: { name: rel.countryName },
      select: { id: true },
    })
    if (!c) {
      console.warn(`    ⚠️  국가 미존재: ${rel.countryName}`)
      continue
    }
    const exists = await prisma.eventCountryRelation.findFirst({
      where: {
        eventId,
        countryId: c.id,
        role: rel.role,
      },
    })
    if (exists) {
      console.log(`    ⏭️  국가관계 스킵: ${rel.countryName}`)
      continue
    }
    await prisma.eventCountryRelation.create({
      data: {
        eventId,
        countryId: c.id,
        role: rel.role,
        roleDescription: rel.roleDescription,
      },
    })
    console.log(`    ✅ 국가관계: ${rel.countryName} (${rel.role})`)
  }

  // ── 5) PersonEvent ─────────────────────────────────────────────────────
  console.log('\n  👤 인물-사건 관계 등록...')
  for (const p of PERSONS) {
    const personId = personIdByOriginalName.get(p.originalName ?? p.name)
    if (!personId) continue

    const exists = await prisma.personEvent.findFirst({
      where: { personId, eventId },
    })
    if (exists) {
      console.log(`    ⏭️  인물관계 스킵: ${p.originalName ?? p.name}`)
      continue
    }
    await prisma.personEvent.create({
      data: {
        personId,
        eventId,
        role: p.eventRole,
        note: p.eventNote,
      },
    })
    console.log(`    ✅ 인물관계: ${p.originalName ?? p.name} (${p.eventRole})`)
  }

  console.log(`\n✅ 2025 이란-이스라엘 12일 전쟁 시딩 완료\n`)
}
