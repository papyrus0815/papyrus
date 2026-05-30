/**
 * 나폴레옹 3세 (Napoléon III / Charles-Louis-Napoléon Bonaparte, 1808~1873) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Dynasty/Reign/Tenure가 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 프랑스 제2공화국 초대·유일 대통령(1848~1852)이자 프랑스 제2제국 황제(1852~1870).
 * 나폴레옹 1세의 동생 루이 보나파르트와, 조제핀의 딸 오르탕스 드 보아르네 사이에서 태어나
 * "보나파르트라는 이름" 하나로 보통선거 대통령 → 친위 쿠데타 → 국민투표 제정(帝政)이라는
 * 19세기 최초의 근대적 포퓰리즘 권력 장악을 완성했다. 오스만의 파리 대개조·철도·신용은행·
 * 1860 자유무역(코브던-슈발리에) 등 프랑스의 산업적 근대화를 주도했으나, 멕시코 원정 실패와
 * 1870 보불전쟁 스당 패전·포로로 제정이 붕괴, 영국 망명지에서 사망했다.
 *
 * 의존: seedFranceHistoricalCountries (프랑스 제1제국·제2공화국·제2제국 HC) +
 *       seedGovernmentPositionDefinitions ('대통령'·'황제' 관직 정의) 가 먼저 실행돼야 한다.
 *
 * 등록 항목:
 *  - 보나파르트 가문 (Dynasty, 인라인 생성)
 *  - Person x5:
 *      나폴레옹 3세(본인) + 아버지 루이 보나파르트 + 어머니 오르탕스 드 보아르네
 *      + 황후 외제니 드 몽티조 + 아들 나폴레옹 외젠(황태자)
 *  - 부모-자식 관계 (fatherId/motherId) x2, 본인→아들 x2
 *  - PersonSpouse x2 (나폴레옹 3세 ↔ 외제니, 양방향)
 *  - GovernmentPositionTenure x1 (프랑스 제2공화국 초대 대통령 1848~1852) + Cabinet x1
 *  - SovereignReign x1 (프랑스 제2제국 황제 나폴레옹 3세 1852~1870, WAR_DEFEAT)
 *  - PersonCountryAffiliation x2 (제1제국 BIRTH_PLACE / 제2제국 CITIZENSHIP)
 *  - PersonNickname x2 (꼬마 나폴레옹 / 바댕게)
 *  - PersonLifeEvent x12 (연보)
 *  - PersonStats x1 (6축 능력치, admin 평가)
 */
import {
  AppointmentMethod,
  DeathType,
  GovernmentPositionType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 보나파르트 가문 ─────────────────────────────────────────────────────────
const BONAPARTE_DYNASTY = {
  name: '보나파르트 가문',
  originPlace: '코르시카 아작시오(Ajaccio)',
  description:
    '18세기 코르시카의 소(小)귀족 가문에서 출발해 프랑스 혁명의 격랑 속에서 나폴레옹 1세(Napoléon Bonaparte)가 ' +
    '1804년 프랑스인의 황제로 즉위하며 유럽 최고의 통치 가문으로 부상한 명문. 나폴레옹 1세는 형제들을 ' +
    '나폴리·스페인·홀란트·베스트팔렌의 국왕으로 앉혀 "보나파르트 체제"를 구축했으나 1814~1815년 ' +
    '제1제국 붕괴로 몰락했다. 이후 나폴레옹 1세의 동생 루이의 아들 루이 나폴레옹이 1848년 보통선거로 ' +
    '프랑스 대통령에, 1852년 나폴레옹 3세로 황제에 즉위해 제2제국(1852~1870)으로 가문의 권력을 부활시켰다. ' +
    '1870년 제2제국 붕괴, 1879년 황태자 나폴레옹 외젠의 전사로 직계 제위 계승은 사실상 단절되었다.',
  startYear: 1804, // 나폴레옹 1세 즉위 — 통치 가문으로서의 시작
  endYear: 1870, // 제2제국 붕괴 (보위 가문으로서의 종결)
} as const

// ── 인물 명세 ───────────────────────────────────────────────────────────────
interface PersonSpec {
  key: string
  name: string
  surname?: string
  originalName: string
  regnalName?: string
  gender: 'MALE' | 'FEMALE'
  birthYear: number
  birthMonth: number
  birthDay: number
  deathYear?: number
  deathMonth?: number
  deathDay?: number
  birthPlaceText?: string
  deathPlaceText?: string
  deathType?: DeathType
  deathCause?: string
  deathNote?: string
  influence?: number
  biography: string
}

const NAPOLEON_III: PersonSpec = {
  key: 'napoleon-iii',
  name: '루이 나폴레옹',
  surname: '보나파르트',
  originalName: 'Napoleon III',
  regnalName: '나폴레옹 3세',
  gender: 'MALE',
  birthYear: 1808, birthMonth: 4, birthDay: 20,
  deathYear: 1873, deathMonth: 1, deathDay: 9,
  birthPlaceText: '프랑스 제1제국 파리 — 셰르슈미디 가(rue Cerutti, 현 라피트 가) 저택',
  deathPlaceText: '영국 켄트주 치즐허스트(Chislehurst) — 캠던 플레이스(Camden Place) 망명 저택',
  deathType: DeathType.ILLNESS,
  deathCause: '방광결석 제거 수술(쇄석술) 합병증 — 요독증(uremia)',
  deathNote:
    '말년 내내 거대 방광결석으로 극심한 통증에 시달렸으며, 1870 스당 전투에서도 안장에 앉기 어려울 만큼 ' +
    '상태가 나빴다. 망명지 영국에서 당대 최고의 비뇨기 외과의 헨리 톰슨 경(Sir Henry Thompson)에게 ' +
    '쇄석술(lithotrity)을 받기로 결정 — (1)1873-01-02 1차 수술 (2)01-06 2차 수술로 결석을 분쇄했으나 ' +
    '요독증·신부전이 진행 (3)01-09 오전 3차 수술을 앞두고 사망(향년 64세). 임종 직전 곁의 의사에게 ' +
    '"스당에서… 비겁하지 않았지?"라고 물었다고 전한다. 시신은 치즐허스트에 안치되었다가 황후 외제니가 ' +
    '영국 햄프셔 판버러(Farnborough)에 세운 성 미카엘 수도원 황실 묘소로 이장되었다.',
  influence: 80,
  biography:
    '보나파르트 가문 — 프랑스 제2공화국 초대·유일 대통령(1848~1852)이자 프랑스 제2제국의 황제(1852~1870). ' +
    '나폴레옹 1세의 동생 루이 보나파르트(홀란트 국왕)와, 나폴레옹 1세의 황후 조제핀의 딸 ' +
    '오르탕스 드 보아르네 사이의 셋째 아들 — 따라서 나폴레옹 1세의 조카이자 의붓 외손자라는 이중 혈연을 가졌다. ' +
    '\n\n' +
    '망명과 음모(1815~1846). 1815 제1제국 붕괴로 보나파르트 일족이 프랑스에서 추방되자 ' +
    '스위스·독일·이탈리아를 전전하며 성장. 청년기 이탈리아 카르보나리(비밀결사) 운동에 가담했고, ' +
    '1832 나폴레옹 1세의 외아들 라이히슈타트 공작(나폴레옹 2세)이 사망하자 보나파르트가의 제위 요구자가 되었다. ' +
    '"보나파르트라는 이름"의 신화에 기대 두 차례 친위 쿠데타를 시도 — (1)1836 스트라스부르 봉기 실패(미국 추방) ' +
    '(2)1840 불로뉴 상륙 실패. 두 번째 실패로 종신형을 선고받아 솜의 함 요새(Fort de Ham)에 약 6년간 ' +
    '유폐되었으며, 이 옥중에서 사회 개혁론 『빈곤의 종식(Extinction du paupérisme)』 등을 집필했다. ' +
    '1846 인부 "바댕게"의 작업복으로 변장해 탈옥, 영국으로 망명했다. ' +
    '\n\n' +
    '대통령 당선(1848). 1848 2월 혁명으로 7월 왕정이 무너지고 제2공화국이 수립되자 귀국. ' +
    '12월 10일 사상 첫 남성 보통선거 대통령 선거에서 라마르틴·카베냐크 등을 압도하고 약 74%를 득표해 당선 ' +
    '— "나폴레옹"이라는 이름이 농민·노동자 대중에게 안정과 영광의 상징으로 작동한 결과였다. ' +
    '\n\n' +
    '친위 쿠데타와 제정(1851~1852). 헌법상 단임(4년)으로 재선이 막히자, 1851-12-02(아우스터리츠 전승 기념일) ' +
    '의회를 해산하는 친위 쿠데타를 단행. 약 2만 명을 체포·추방하며 저항을 진압한 뒤 국민투표로 추인받았다. ' +
    '이듬해 1852-11 또 한 차례 국민투표(약 97% 찬성)를 거쳐 1852-12-02 "프랑스인의 황제 나폴레옹 3세"로 즉위, ' +
    '제2제국을 선포했다. 빅토르 위고는 이를 조롱해 풍자서 『꼬마 나폴레옹(Napoléon le Petit)』을 썼다. ' +
    '\n\n' +
    '제국의 근대화. 권위주의적 제정 아래 프랑스의 산업혁명을 강력히 추진 — (1)조르주외젠 오스만 남작을 ' +
    '세느 지사로 임명해 1853~1870 파리 대개조(대로·상하수도·공원) 단행 (2)철도망 폭발적 확장 ' +
    '(3)크레디 모빌리에·크레디 리요네 등 근대 투자은행 설립 (4)1860 영국과 코브던-슈발리에 자유무역 조약 체결 ' +
    '(5)1855·1867 파리 만국박람회 개최. 1860년대 들어 "자유제정(Empire libéral)"으로 의회 권한을 점진 확대했다. ' +
    '\n\n' +
    '대외 정책 — 영광과 파탄. (1)크림 전쟁(1853~1856)에서 영국과 함께 러시아를 꺾고 파리 조약으로 외교적 정점에 도달 ' +
    '(2)1859 이탈리아 통일 전쟁에 개입해 마젠타·솔페리노에서 오스트리아를 격파, 그 대가로 1860 사보이아·니스를 ' +
    '프랑스에 병합 (3)1862~1867 멕시코 원정 — 합스부르크가의 막시밀리안을 황제로 앉히려다 미국의 압박과 ' +
    '게릴라전으로 완전 실패(막시밀리안 처형)하며 제2제국 최대의 외교적 재앙을 자초 (4)프로이센의 급부상을 ' +
    '견제하지 못한 채 1870 엠스 전보 사건에 말려 보불전쟁을 선포. ' +
    '\n\n' +
    '몰락(1870). 1870-09-01~02 스당 전투에서 마크마옹의 샬롱군이 몰트케에게 포위되어 항복, 황제 본인이 ' +
    '약 10만 군과 함께 포로가 되었다. 9월 4일 파리에서 제정이 폐지되고 제3공화국이 선포되며 제2제국은 붕괴했다. ' +
    '석방 후 영국 켄트주 치즐허스트로 망명, 1873 방광결석 수술 합병증으로 사망했다. ' +
    '\n\n' +
    '평가. 마르크스는 『루이 보나파르트의 브뤼메르 18일』에서 그의 집권을 "비극의 소극(笑劇)적 반복"으로 ' +
    '신랄하게 풍자했고, 오랫동안 "재능 없는 모험가"로 폄하되었다. 그러나 20세기 후반 이후 파리 대개조·산업 ' +
    '근대화·복지 실험을 근거로 "근대 프랑스를 만든 통치자"라는 재평가가 이루어지고 있다. 재위 약 18년은 ' +
    '프랑스 역사상 보통선거로 집권한 첫 권력자가 곧바로 제정으로 회귀한 역설의 대표 사례로 꼽힌다.',
}

const LOUIS_BONAPARTE: PersonSpec = {
  key: 'louis-bonaparte',
  name: '루이',
  surname: '보나파르트',
  originalName: 'Louis Bonaparte',
  gender: 'MALE',
  birthYear: 1778, birthMonth: 9, birthDay: 2,
  deathYear: 1846, deathMonth: 7, deathDay: 25,
  birthPlaceText: '코르시카 아작시오(Ajaccio)',
  deathPlaceText: '토스카나 대공국 리보르노(Livorno)',
  deathType: DeathType.ILLNESS,
  influence: 45,
  biography:
    '보나파르트 가문 — 나폴레옹 1세의 동생이자 홀란트 왕국의 국왕(로데베이크 1세, Lodewijk I, 재위 1806~1810). ' +
    '형 나폴레옹이 동생을 위해 세운 위성 왕국 홀란트의 군주가 되었으나, 네덜란드인의 이익을 옹호하며 ' +
    '대륙봉쇄령을 느슨하게 집행해 형과 갈등했다. 1810 나폴레옹이 홀란트를 프랑스에 직접 병합하자 퇴위, ' +
    '이후 이탈리아에서 은둔하며 저술로 여생을 보냈다. 황후 조제핀의 딸 오르탕스 드 보아르네와 결혼했으며 ' +
    '셋째 아들이 훗날의 나폴레옹 3세다. 부부 사이는 매우 나빠 별거했다.',
}

const HORTENSE: PersonSpec = {
  key: 'hortense',
  name: '오르탕스',
  surname: '드 보아르네',
  originalName: 'Hortense de Beauharnais',
  gender: 'FEMALE',
  birthYear: 1783, birthMonth: 4, birthDay: 10,
  deathYear: 1837, deathMonth: 10, deathDay: 5,
  birthPlaceText: '프랑스 왕국 파리',
  deathPlaceText: '스위스 아레넨베르크성(Schloss Arenenberg, 투르가우주)',
  deathType: DeathType.ILLNESS,
  deathCause: '자궁암(추정)',
  influence: 42,
  biography:
    '나폴레옹 1세의 황후 조제핀 드 보아르네가 첫 남편 알렉상드르 드 보아르네와의 사이에서 낳은 딸 — ' +
    '즉 나폴레옹 1세의 의붓딸. 1802 나폴레옹의 주선으로 그의 동생 루이 보나파르트와 결혼해 홀란트 왕비가 되었다. ' +
    '결혼 생활은 불행했으나 작곡가·아마추어 화가로 재능이 있었고, 보나파르트 왕정복고의 꿈을 셋째 아들 ' +
    '루이 나폴레옹(나폴레옹 3세)에게 깊이 심어 주었다. 제1제국 붕괴 후 스위스 아레넨베르크성에서 망명 생활을 하며 ' +
    '아들을 길렀다.',
}

const EUGENIE: PersonSpec = {
  key: 'eugenie',
  name: '외제니',
  surname: '드 몽티조',
  originalName: 'Eugénie de Montijo',
  gender: 'FEMALE',
  birthYear: 1826, birthMonth: 5, birthDay: 5,
  deathYear: 1920, deathMonth: 7, deathDay: 11,
  birthPlaceText: '스페인 그라나다',
  deathPlaceText: '스페인 마드리드 — 리리아 궁(Palacio de Liria)',
  deathType: DeathType.ILLNESS,
  influence: 55,
  biography:
    '스페인의 백작 가문 출신으로 프랑스 제2제국의 황후(재위 1853~1870). 1853-01-29 나폴레옹 3세와 결혼해 ' +
    '미모와 패션으로 유럽 사교계를 풍미했다. 독실한 가톨릭 신자로 보수·교권 옹호 입장에서 정치에 관여했으며, ' +
    '특히 멕시코 원정을 적극 지지했다. 황제 부재 시 세 차례 섭정을 맡았고, 1870 보불전쟁 개전에도 영향을 끼쳤다. ' +
    '제2제국 붕괴 후 영국으로 망명, 남편(1873)과 외아들 황태자(1879)를 차례로 잃고도 94세까지 장수하며 ' +
    '제2제국의 마지막 산증인으로 남았다.',
}

const PRINCE_IMPERIAL: PersonSpec = {
  key: 'prince-imperial',
  name: '나폴레옹 외젠',
  surname: '보나파르트',
  originalName: 'Napoléon, Prince Imperial',
  gender: 'MALE',
  birthYear: 1856, birthMonth: 3, birthDay: 16,
  deathYear: 1879, deathMonth: 6, deathDay: 1,
  birthPlaceText: '프랑스 제2제국 파리 — 튈르리 궁',
  deathPlaceText: '남아프리카 줄루란드(Zululand) — 이툐토지(Ityotyozi)강 인근',
  deathType: DeathType.BATTLE,
  deathCause: '영국-줄루 전쟁 중 줄루족의 매복 공격으로 전사 (창상 다수)',
  deathNote:
    '제2제국 붕괴 후 영국 울위치 왕립군사학교에서 수학, 영국군 자원장교로 1879 영국-줄루 전쟁에 종군했다. ' +
    '1879-06-01 정찰 중 줄루족의 매복에 걸려 23세로 전사 — 보나파르트 직계 제위 계승의 사실상 단절을 의미했다. ' +
    '보나파르트파(보나파르티스트)는 그를 "나폴레옹 4세"로 칭했다.',
  influence: 30,
  biography:
    '보나파르트 가문 — 나폴레옹 3세와 황후 외제니의 외아들이자 제2제국의 황태자(Prince Impérial). ' +
    '1856 탄생은 제국의 후계 확립으로 대대적으로 경축되었다. 1870 제정 붕괴로 부모와 함께 영국으로 망명, ' +
    '울위치 왕립군사학교를 졸업하고 영국군 포병 장교로 복무했다. 1879 영국-줄루 전쟁에 자원 종군했다가 ' +
    '정찰 중 매복 공격으로 전사, 보나파르트 직계의 황위 계승 노선이 끊겼다.',
}

const ALL_PERSONS = [
  NAPOLEON_III,
  LOUIS_BONAPARTE,
  HORTENSE,
  EUGENIE,
  PRINCE_IMPERIAL,
] as const

// ── 별명 ────────────────────────────────────────────────────────────────────
const NICKNAMES: { nickname: string; type: string; priority: number }[] = [
  { nickname: '꼬마 나폴레옹 (Napoléon le Petit)', type: '조롱', priority: 1 },
  { nickname: '바댕게 (Badinguet)', type: '별명', priority: 2 },
]

// ── 연보 ────────────────────────────────────────────────────────────────────
type LifeEventCategory =
  | 'EDUCATION'
  | 'TRAVEL'
  | 'PUBLICATION'
  | 'EXILE'
  | 'AWARD'
  | 'PERSONAL'
  | 'CAREER'
  | 'MILITARY'
  | 'POLITICAL'
  | 'DIPLOMATIC'
  | 'FAMILY'
  | 'HEALTH'
  | 'OTHER'

interface LifeEventEntry {
  title: string
  category: LifeEventCategory
  startYear: number
  startMonth?: number
  startDay?: number
  endYear?: number
  endMonth?: number
  endDay?: number
  description?: string
}

const LIFE_EVENTS: LifeEventEntry[] = [
  {
    title: '파리 출생',
    category: 'FAMILY',
    startYear: 1808, startMonth: 4, startDay: 20,
    description: '홀란트 국왕 루이 보나파르트와 오르탕스 드 보아르네의 셋째 아들로 파리에서 출생.',
  },
  {
    title: '제1제국 붕괴와 망명',
    category: 'EXILE',
    startYear: 1815,
    description: '워털루 패전 후 보나파르트 일족 추방. 어머니 오르탕스를 따라 스위스·독일을 전전하며 성장.',
  },
  {
    title: '이탈리아 카르보나리 가담',
    category: 'POLITICAL',
    startYear: 1831,
    description: '청년기 이탈리아 통일 비밀결사 카르보나리 봉기에 가담. 형 나폴레옹루이는 이 시기 병사.',
  },
  {
    title: '보나파르트가 제위 요구자가 됨',
    category: 'PERSONAL',
    startYear: 1832, startMonth: 7, startDay: 22,
    description: '나폴레옹 1세의 외아들 라이히슈타트 공작(나폴레옹 2세) 사망으로 보나파르트가의 제위 계승 주장자가 됨.',
  },
  {
    title: '스트라스부르 친위 쿠데타 실패',
    category: 'MILITARY',
    startYear: 1836, startMonth: 10, startDay: 30,
    description: '스트라스부르 수비대를 동원한 첫 봉기 시도 실패. 체포 후 미국으로 추방됨.',
  },
  {
    title: '불로뉴 상륙 실패와 함 요새 유폐',
    category: 'EXILE',
    startYear: 1840, startMonth: 8, startDay: 6,
    endYear: 1846, endMonth: 5, endDay: 25,
    description: '불로뉴 상륙 쿠데타 실패로 종신형. 솜의 함 요새에 약 6년 유폐, 옥중에서 『빈곤의 종식』 집필.',
  },
  {
    title: '함 요새 탈옥·영국 망명',
    category: 'EXILE',
    startYear: 1846, startMonth: 5, startDay: 25,
    description: '인부 "바댕게"의 작업복으로 변장해 탈옥, 영국으로 망명.',
  },
  {
    title: '제2공화국 초대 대통령 당선',
    category: 'POLITICAL',
    startYear: 1848, startMonth: 12, startDay: 10,
    description: '사상 첫 남성 보통선거 대통령 선거에서 약 74% 득표로 압승, 12월 20일 취임.',
  },
  {
    title: '12월 2일 친위 쿠데타',
    category: 'POLITICAL',
    startYear: 1851, startMonth: 12, startDay: 2,
    description: '재선 금지 헌법에 맞서 의회를 해산하는 친위 쿠데타 단행. 국민투표로 추인.',
  },
  {
    title: '나폴레옹 3세 즉위·제2제국 선포',
    category: 'POLITICAL',
    startYear: 1852, startMonth: 12, startDay: 2,
    description: '국민투표(약 97% 찬성)를 거쳐 "프랑스인의 황제 나폴레옹 3세"로 즉위, 제2제국 수립.',
  },
  {
    title: '외제니 드 몽티조와 결혼',
    category: 'FAMILY',
    startYear: 1853, startMonth: 1, startDay: 29,
    description:
      '튈르리궁 민사혼(1/29)·노트르담 대성당 종교혼(1/30)으로 스페인 백작 가문 출신 외제니와 결혼. 1856 외아들 황태자 탄생.',
  },
  {
    title: '스당 패전·포로·제정 붕괴',
    category: 'MILITARY',
    startYear: 1870, startMonth: 9, startDay: 2,
    description: '보불전쟁 스당 전투에서 약 10만 군과 함께 항복·포로. 9월 4일 제정 폐지, 제3공화국 선포.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const NAPOLEON_III_STATS = {
  politics: 74,
  military: 45,
  diplomacy: 60,
  intellect: 70,
  charisma: 66,
  administration: 78,
  notes:
    '"보나파르트라는 이름"의 신화를 보통선거·국민투표라는 근대적 수단과 결합해 권력을 장악한 ' +
    '플레비시트(국민투표) 정치의 선구 — 정치·행정은 19세기 군주 중 상위. 오스만의 파리 대개조, 철도·투자은행, ' +
    '1860 자유무역 조약 등 프랑스 산업 근대화를 강력히 추진(행정). 반면 군사는 친정(親征) 능력이 약해 ' +
    '스당에서 제국째 파국을 맞았고, 외교도 크림·이탈리아의 초기 성공 뒤 멕시코 원정 실패와 프로이센 과소평가로 ' +
    '제국을 자멸로 이끌어 진폭이 매우 컸다. 학식은 저술가(『빈곤의 종식』·『율리우스 카이사르전』) 면모로 평가.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

async function ensurePerson(
  prisma: PrismaService,
  spec: PersonSpec,
  accountId: string,
  extra: { dynastyId?: string } = {},
): Promise<string> {
  const existing = await prisma.person.findFirst({
    where: { originalName: spec.originalName },
  })

  if (existing) {
    const patch: Record<string, unknown> = {}
    if (extra.dynastyId && !existing.dynastyId) patch.dynastyId = extra.dynastyId
    if (!existing.biography) patch.biography = spec.biography
    if (!existing.birthPlaceText && spec.birthPlaceText) patch.birthPlaceText = spec.birthPlaceText
    if (!existing.deathPlaceText && spec.deathPlaceText) patch.deathPlaceText = spec.deathPlaceText
    if (!existing.deathType && spec.deathType) patch.deathType = spec.deathType
    if (!existing.deathCause && spec.deathCause) patch.deathCause = spec.deathCause
    if (!existing.deathNote && spec.deathNote) patch.deathNote = spec.deathNote
    if (existing.influence == null && spec.influence != null) patch.influence = spec.influence
    if (!existing.regnalName && spec.regnalName) patch.regnalName = spec.regnalName
    if (Object.keys(patch).length > 0) {
      await prisma.person.update({ where: { id: existing.id }, data: patch })
      console.log(`  🔧 보강: ${spec.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${spec.originalName}`)
    }
    return existing.id
  }

  const created = await prisma.person.create({
    data: {
      name: spec.name,
      surname: spec.surname,
      originalName: spec.originalName,
      regnalName: spec.regnalName,
      biography: spec.biography,
      birthDate: toDate(spec.birthYear, spec.birthMonth, spec.birthDay),
      birthEra: 'AD' as any,
      deathDate: spec.deathYear ? toDate(spec.deathYear, spec.deathMonth, spec.deathDay) : undefined,
      deathEra: spec.deathYear ? ('AD' as any) : undefined,
      deathType: spec.deathType,
      deathCause: spec.deathCause,
      deathNote: spec.deathNote,
      gender: spec.gender,
      nameDisplayOrder: 'western' as any,
      influence: spec.influence,
      birthPlaceText: spec.birthPlaceText,
      deathPlaceText: spec.deathPlaceText,
      dynastyId: extra.dynastyId,
      accountId,
    },
  })
  console.log(`  ✅ 인물 생성: ${spec.originalName} (id=${created.id})`)
  return created.id
}

async function ensureParentChild(
  prisma: PrismaService,
  childId: string,
  parent: { fatherId?: string; motherId?: string },
): Promise<void> {
  const child = await prisma.person.findUnique({ where: { id: childId } })
  if (!child) return
  const patch: Record<string, unknown> = {}
  if (parent.fatherId && !child.fatherId) patch.fatherId = parent.fatherId
  if (parent.motherId && !child.motherId) patch.motherId = parent.motherId
  if (Object.keys(patch).length > 0) {
    await prisma.person.update({ where: { id: childId }, data: patch })
  }
}

async function ensureSpouse(
  prisma: PrismaService,
  aId: string,
  bId: string,
  startDate: Date,
  endDate: Date | undefined,
  note: string,
): Promise<void> {
  for (const [personId, spouseId] of [
    [aId, bId],
    [bId, aId],
  ]) {
    const exists = await prisma.personSpouse.findFirst({
      where: { personId, spouseId },
    })
    if (!exists) {
      await prisma.personSpouse.create({
        data: { personId, spouseId, marriageStartDate: startDate, marriageEndDate: endDate, note },
      })
    }
  }
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedNapoleonIII(prisma: PrismaService): Promise<void> {
  console.log('\n👑 나폴레옹 3세(Napoléon III) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ──────────────────────────────────────────────────────────
  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const secondRepublic = await prisma.historicalCountry.findFirst({
    where: { name: '프랑스 제2공화국' },
    select: { id: true },
  })
  const secondEmpire = await prisma.historicalCountry.findFirst({
    where: { name: '프랑스 제2제국' },
    select: { id: true },
  })
  const firstEmpire = await prisma.historicalCountry.findFirst({
    where: { name: '프랑스 제1제국' },
    select: { id: true },
  })
  if (!secondRepublic || !secondEmpire) {
    console.warn(
      '  ⚠️  프랑스 제2공화국/제2제국 HC 미존재 — 먼저 seedFranceHistoricalCountries 실행 필요. 시딩 중단.',
    )
    return
  }

  // ── 0) 보나파르트 가문 ─────────────────────────────────────────────────────
  let dynasty = await prisma.dynasty.findFirst({ where: { name: BONAPARTE_DYNASTY.name } })
  if (dynasty) {
    console.log(`  ⏭️  가문 이미 존재: ${BONAPARTE_DYNASTY.name}`)
  } else {
    dynasty = await prisma.dynasty.create({
      data: {
        name: BONAPARTE_DYNASTY.name,
        description: BONAPARTE_DYNASTY.description,
        originPlace: BONAPARTE_DYNASTY.originPlace,
        founderText: '나폴레옹 1세 (Napoléon Bonaparte)',
        startDate: toDate(BONAPARTE_DYNASTY.startYear, 1, 1),
        endDate: toDate(BONAPARTE_DYNASTY.endYear, 12, 31),
      },
    })
    console.log(`  ✅ 가문 생성: ${BONAPARTE_DYNASTY.name} (id=${dynasty.id})`)
  }

  // ── 1) 인물 5인 등록 ───────────────────────────────────────────────────────
  const ids = new Map<string, string>()
  for (const spec of ALL_PERSONS) {
    const id = await ensurePerson(prisma, spec, admin.id, { dynastyId: dynasty.id })
    ids.set(spec.key, id)
  }
  const napoleonId = ids.get('napoleon-iii')!

  // ── 2) 가족 관계 ───────────────────────────────────────────────────────────
  await ensureParentChild(prisma, napoleonId, {
    fatherId: ids.get('louis-bonaparte'),
    motherId: ids.get('hortense'),
  })
  await ensureParentChild(prisma, ids.get('prince-imperial')!, {
    fatherId: napoleonId,
    motherId: ids.get('eugenie'),
  })
  console.log('  🔗 가족 관계: 루이/오르탕스 → 나폴레옹 3세, 나폴레옹 3세/외제니 → 황태자')

  await ensureSpouse(
    prisma,
    napoleonId,
    ids.get('eugenie')!,
    toDate(1853, 1, 29),
    toDate(1873, 1, 9),
    '1853-01-29 민사혼(튈르리궁)·01-30 종교혼(노트르담). 나폴레옹 3세 사망(1873)으로 사별.',
  )
  console.log('  💍 혼인: 나폴레옹 3세 ↔ 외제니 드 몽티조')

  // ── 3) 대통령 재임 (프랑스 제2공화국) + 행정부 ─────────────────────────────
  const presidentDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '대통령' },
    select: { id: true },
  })
  let presidentTenureId: string | null = null
  {
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId: napoleonId,
        historicalCountryId: secondRepublic.id,
        positionType: GovernmentPositionType.HEAD_OF_STATE,
        termNumber: 1,
      },
    })
    if (existing) {
      presidentTenureId = existing.id
      console.log('  ⏭️  재임 스킵 (이미 존재): 제2공화국 초대 대통령')
    } else {
      const created = await prisma.governmentPositionTenure.create({
        data: {
          personId: napoleonId,
          historicalCountryId: secondRepublic.id,
          positionDefinitionId: presidentDef?.id ?? undefined,
          positionType: GovernmentPositionType.HEAD_OF_STATE,
          title: '대통령',
          termNumber: 1,
          startDate: toDate(1848, 12, 20),
          endDate: toDate(1852, 12, 2),
          appointmentMethod: AppointmentMethod.DIRECT_ELECTION,
          endReason: TenureEndReason.OTHER,
          endReasonDetail:
            '1851-12-02 친위 쿠데타로 의회 해산 후 국민투표 추인 → 1852-12-02 제정 선포로 대통령직 종료, 황제로 즉위.',
          notes:
            '프랑스 제2공화국의 초대·유일 대통령. 1848-12-10 사상 첫 남성 보통선거에서 약 74% 득표로 당선, ' +
            '12-20 취임. 헌법상 4년 단임이라 재선이 막히자 1851 친위 쿠데타로 권력을 연장하고 이듬해 제정으로 전환했다.',
          accountId: admin.id,
        },
      })
      presidentTenureId = created.id
      console.log('  ✅ 재임: 프랑스 제2공화국 초대 대통령 (1848-12-20 ~ 1852-12-02)')
    }
  }

  // 행정부(Cabinet) — 수반 재임 1건당 1건 (행정부 뷰 노출용)
  if (presidentTenureId) {
    const cab = await prisma.cabinet.findUnique({ where: { headTenureId: presidentTenureId } })
    if (cab) {
      console.log('  ⏭️  행정부 스킵 (이미 존재)')
    } else {
      await prisma.cabinet.create({
        data: {
          headTenureId: presidentTenureId,
          name: '루이 나폴레옹 대통령부',
          accountId: admin.id,
        },
      })
      console.log('  🏛️  행정부: 루이 나폴레옹 대통령부')
    }
  }

  // ── 4) 황제 재위 (프랑스 제2제국) ──────────────────────────────────────────
  const emperorDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '황제' },
    select: { id: true },
  })
  {
    const existingByPerson = await prisma.sovereignReign.findFirst({
      where: { personId: napoleonId, historicalCountryId: secondEmpire.id },
    })
    if (existingByPerson) {
      console.log('  ⏭️  재위 스킵 (이미 존재): 제2제국 황제 나폴레옹 3세')
    } else {
      const slotConflict = await prisma.sovereignReign.findFirst({
        where: { historicalCountryId: secondEmpire.id, regnalNumber: 1 },
      })
      if (slotConflict) {
        console.warn('  ⚠️  재위 충돌: 제2제국 1대 — 다른 인물 점유 (skip)')
      } else {
        await prisma.sovereignReign.create({
          data: {
            personId: napoleonId,
            historicalCountryId: secondEmpire.id,
            positionDefinitionId: emperorDef?.id ?? undefined,
            regnalNumber: 1,
            regnalName: '나폴레옹 3세',
            startDate: toDate(1852, 12, 2),
            endDate: toDate(1870, 9, 4),
            appointmentMethod: AppointmentMethod.COUP,
            endReason: TenureEndReason.WAR_DEFEAT,
            endReasonDetail:
              '1870-09-02 보불전쟁 스당 전투에서 항복·포로. 09-04 파리에서 제정 폐지·제3공화국 선포로 제2제국 붕괴.',
            notes:
              '프랑스 제2제국의 유일한 황제. 1851 친위 쿠데타 + 1852-11 국민투표(약 97% 찬성)를 거쳐 ' +
              '1852-12-02 즉위. 재위 약 18년간 파리 대개조·철도·투자은행·자유무역(1860)으로 산업 근대화를 ' +
              '주도했고, 크림 전쟁(1853~56)·이탈리아 통일 개입(1859, 사보이아·니스 병합)으로 외교적 정점에 ' +
              '올랐으나, 멕시코 원정 실패(1862~67)와 보불전쟁 스당 패전(1870)으로 제국이 붕괴했다.',
            accountId: admin.id,
          },
        })
        console.log('  ✅ 재위: 프랑스 제2제국 황제 나폴레옹 3세 (1852-12-02 ~ 1870-09-04)')
      }
    }
  }

  // ── 5) 국가 소속 ───────────────────────────────────────────────────────────
  const affiliations: {
    historicalCountryId: string
    type: 'BIRTH_PLACE' | 'CITIZENSHIP'
    label: string
    priority: number
  }[] = []
  if (firstEmpire) {
    affiliations.push({
      historicalCountryId: firstEmpire.id,
      type: 'BIRTH_PLACE',
      label: '프랑스 제1제국 (1808 출생)',
      priority: 1,
    })
  }
  affiliations.push({
    historicalCountryId: secondEmpire.id,
    type: 'CITIZENSHIP',
    label: '프랑스 제2제국 (1852~1870 황제)',
    priority: 0,
  })
  for (const aff of affiliations) {
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: napoleonId,
        historicalCountryId: aff.historicalCountryId,
        affiliationType: aff.type as any,
      },
    })
    if (exists) {
      console.log(`  ⏭️  소속국가 스킵: ${aff.label}`)
    } else {
      await prisma.personCountryAffiliation.create({
        data: {
          personId: napoleonId,
          historicalCountryId: aff.historicalCountryId,
          affiliationType: aff.type as any,
          priority: aff.priority,
        },
      })
      console.log(`  ✅ 소속국가: ${aff.label}`)
    }
  }

  // ── 6) 별명 ─────────────────────────────────────────────────────────────────
  for (const nk of NICKNAMES) {
    const exists = await prisma.personNickname.findFirst({
      where: { personId: napoleonId, nickname: nk.nickname },
    })
    if (!exists) {
      await prisma.personNickname.create({
        data: { personId: napoleonId, nickname: nk.nickname, type: nk.type, priority: nk.priority },
      })
      console.log(`  ✅ 별명: ${nk.nickname}`)
    }
  }

  // ── 7) 연보 ─────────────────────────────────────────────────────────────────
  let lifeEventCount = 0
  for (const e of LIFE_EVENTS) {
    const exists = await prisma.personLifeEvent.findFirst({
      where: { personId: napoleonId, title: e.title },
    })
    if (exists) continue
    const startDate = toDate(e.startYear, e.startMonth, e.startDay)
    const startDatePrecision = e.startDay ? 'day' : e.startMonth ? 'month' : 'year'
    const endDate = e.endYear
      ? new Date(e.endYear, (e.endMonth ?? 12) - 1, e.endDay ?? (e.endMonth ? 28 : 31))
      : null
    const endDatePrecision = e.endYear ? (e.endDay ? 'day' : e.endMonth ? 'month' : 'year') : null
    await prisma.personLifeEvent.create({
      data: {
        personId: napoleonId,
        title: e.title,
        description: e.description,
        category: e.category,
        startDate,
        startDatePrecision,
        endDate,
        endDatePrecision,
        accountId: admin.id,
      },
    })
    lifeEventCount++
  }
  if (lifeEventCount > 0) console.log(`  ✅ 연보 ${lifeEventCount}건 등록`)

  // ── 8) 6축 능력치 ────────────────────────────────────────────────────────────
  const statsExists = await prisma.personStats.findFirst({
    where: { personId: napoleonId, accountId: admin.id },
  })
  if (statsExists) {
    console.log('  ⏭️  능력치 스킵 (이미 존재)')
  } else {
    await prisma.personStats.create({
      data: {
        personId: napoleonId,
        accountId: admin.id,
        politics: NAPOLEON_III_STATS.politics,
        military: NAPOLEON_III_STATS.military,
        diplomacy: NAPOLEON_III_STATS.diplomacy,
        intellect: NAPOLEON_III_STATS.intellect,
        charisma: NAPOLEON_III_STATS.charisma,
        administration: NAPOLEON_III_STATS.administration,
        notes: NAPOLEON_III_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${NAPOLEON_III_STATS.politics}·군사 ${NAPOLEON_III_STATS.military}·` +
        `외교 ${NAPOLEON_III_STATS.diplomacy}·학식 ${NAPOLEON_III_STATS.intellect}·` +
        `카리스마 ${NAPOLEON_III_STATS.charisma}·행정 ${NAPOLEON_III_STATS.administration}`,
    )
  }

  console.log('✅ 나폴레옹 3세 시딩 완료\n')
}
