import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

// ── 사보이아 왕조 통치 기록 ────────────────────────────────────────
const DYNASTY_RULES: {
  countryName: string
  startYear: number
  endYear?: number
  endReason?: string
  notes?: string
}[] = [
  { countryName: '사르데냐 왕국', startYear: 1720, endYear: 1861, endReason: '이탈리아 왕국으로 통합' },
  { countryName: '이탈리아 왕국', startYear: 1861, endYear: 1946, endReason: '공화국 수립 국민투표로 군주제 폐지' },
]

// ── 사보이아 왕조 군주 ──────────────────────────────────────────────
const SAVOY_MONARCHS: string[] = [
  'Vittorio Amedeo II of Sardinia',
  'Carlo Emanuele III of Sardinia',
  'Vittorio Amedeo III of Sardinia',
  'Carlo Emanuele IV of Sardinia',
  'Vittorio Emanuele I of Sardinia',
  'Carlo Felice of Sardinia',
  'Carlo Alberto of Sardinia',
  'Vittorio Emanuele II of Italy',
  'Umberto I of Italy',
  'Vittorio Emanuele III of Italy',
  'Umberto II of Italy',
]

// ── 왕비 인물 ──────────────────────────────────────────────────────
interface PersonEntry {
  name: string
  surname: string
  originalName: string
  biography: string
  birthYear: number
  birthMonth: number
  birthDay?: number
  deathYear?: number
  deathMonth?: number
  deathDay?: number
  gender: string
}

const WIVES: PersonEntry[] = [
  // ── 비토리오 아메데오 2세 왕비 ────────────────────────────────────
  {
    name: '안 마리',
    surname: '도를레앙',
    originalName: 'Anne Marie d\'Orléans',
    biography:
      '사르데냐 왕국 왕비. 프랑스 오를레앙 공작 필리프 1세와 앙리에트 단글르테르의 딸로 태어나 1684년 비토리오 아메데오 2세와 결혼했다. 루이 14세의 조카딸로 사보이아 왕가와 프랑스 왕실의 유대를 강화하는 역할을 했다. 남편보다 4년 먼저 사망하였다.',
    birthYear: 1669, birthMonth: 8, birthDay: 27,
    deathYear: 1728, deathMonth: 8, deathDay: 26,
    gender: 'FEMALE',
  },

  // ── 카를로 에마누엘레 3세 왕비 3명 ───────────────────────────────
  {
    name: '안나 크리스티나',
    surname: '줄츠바흐',
    originalName: 'Anna Cristina of Sulzbach',
    biography:
      '사르데냐 왕국 왕비. 팔츠-줄츠바흐 백작의 딸로 태어나 1722년 카를로 에마누엘레 3세와 결혼하였으나 결혼한 지 1년 남짓 만인 1723년에 사망하였다. 자녀 없이 짧은 생을 마쳤다.',
    birthYear: 1704, birthMonth: 4, birthDay: 4,
    deathYear: 1723, deathMonth: 12, deathDay: 12,
    gender: 'FEMALE',
  },
  {
    name: '폴리세나',
    surname: '헤센-라인펠스-로텐부르크',
    originalName: 'Polissena of Hesse-Rheinfels-Rotenburg',
    biography:
      '사르데냐 왕국 왕비. 헤센-라인펠스-로텐부르크 방백 에른스트 레오폴트의 딸로 태어나 1724년 카를로 에마누엘레 3세의 두 번째 왕비가 되었다. 비토리오 아메데오 3세를 비롯한 여러 자녀를 낳았으나 1735년 35세의 나이로 사망하였다.',
    birthYear: 1706, birthMonth: 1, birthDay: 22,
    deathYear: 1735, deathMonth: 1, deathDay: 13,
    gender: 'FEMALE',
  },
  {
    name: '엘리자베트 테레제',
    surname: '로트링겐',
    originalName: 'Elisabeth Therese of Lorraine',
    biography:
      '사르데냐 왕국 왕비. 로트링겐 공작 레오폴트 1세의 딸로 태어나 1737년 카를로 에마누엘레 3세의 세 번째 왕비가 되었다. 훗날 신성로마황제 프란츠 1세의 여동생이기도 하다. 1741년 30세에 사망하여 자녀는 없었다.',
    birthYear: 1711, birthMonth: 10, birthDay: 15,
    deathYear: 1741, deathMonth: 7, deathDay: 4,
    gender: 'FEMALE',
  },

  // ── 비토리오 아메데오 3세 왕비 ────────────────────────────────────
  {
    name: '마리아 안토니에타',
    surname: '부르봉-스파냐',
    originalName: 'Maria Antonietta of Bourbon-Spain',
    biography:
      '사르데냐 왕국 왕비. 스페인 국왕 펠리페 5세와 엘리자베타 파르네제의 딸로 태어나 1750년 비토리오 아메데오 3세와 결혼했다. 카를로 에마누엘레 4세, 비토리오 에마누엘레 1세, 카를로 펠리체 등 여러 자녀를 낳았으며 1785년 사망했다.',
    birthYear: 1729, birthMonth: 11, birthDay: 17,
    deathYear: 1785, deathMonth: 9, deathDay: 19,
    gender: 'FEMALE',
  },

  // ── 카를로 에마누엘레 4세 왕비 ────────────────────────────────────
  {
    name: '마리 클로틸드',
    surname: '프랑스',
    originalName: 'Marie Clotilde of France',
    biography:
      '사르데냐 왕국 왕비이자 복녀(가톨릭 시복). 프랑스 국왕 루이 15세의 손녀이자 루이 16세의 누이로 태어나 1775년 카를로 에마누엘레 4세와 결혼했다. 독실한 신앙과 자선 행위로 유명하였으며 1799년 교황 비오 6세를 도운 것으로 알려져 있다. 1802년 토리노에서 사망하였으며 1984년 교황 요한 바오로 2세에 의해 복녀로 시복되었다.',
    birthYear: 1759, birthMonth: 9, birthDay: 23,
    deathYear: 1802, deathMonth: 3, deathDay: 7,
    gender: 'FEMALE',
  },

  // ── 비토리오 에마누엘레 1세 왕비 ─────────────────────────────────
  {
    name: '마리아 테레사',
    surname: '오스트리아-에스테',
    originalName: 'Maria Teresa of Austria-Este',
    biography:
      '사르데냐 왕국 왕비. 모데나 에스테 공작 에르콜레 3세의 딸로 태어나 1789년 비토리오 에마누엘레 1세와 결혼했다. 나폴레옹 전쟁의 혼란 속에서도 왕실을 지탱한 인물로 평가된다. 남편이 1821년 퇴위한 후 1832년 사망하였다.',
    birthYear: 1773, birthMonth: 11, birthDay: 6,
    deathYear: 1832, deathMonth: 9, deathDay: 29,
    gender: 'FEMALE',
  },

  // ── 카를로 펠리체 왕비 ────────────────────────────────────────────
  {
    name: '마리아 크리스티나',
    surname: '양시칠리아',
    originalName: 'Maria Cristina of the Two Sicilies',
    biography:
      '사르데냐 왕국 왕비. 양시칠리아 국왕 페르디난도 1세의 딸로 태어나 1807년 카를로 펠리체와 결혼했다. 두 사람 사이에는 자녀가 없었다. 남편 사망(1831) 후에도 오래 살아 1849년 사망하였다.',
    birthYear: 1779, birthMonth: 1, birthDay: 17,
    deathYear: 1849, deathMonth: 3, deathDay: 11,
    gender: 'FEMALE',
  },

  // ── 카를로 알베르토 왕비 ──────────────────────────────────────────
  {
    name: '마리아 테레사',
    surname: '오스트리아-토스카나',
    originalName: 'Maria Teresa of Austria-Tuscany',
    biography:
      '사르데냐 왕국 왕비. 토스카나 대공 페르디난도 3세의 딸로 태어나 1817년 카를로 알베르토와 결혼했다. 이탈리아 통일 왕 비토리오 에마누엘레 2세의 어머니이다. 남편이 1849년 퇴위 후 포르투갈로 망명하고 사망하자 큰 충격을 받아 1855년 사망하였다.',
    birthYear: 1801, birthMonth: 7, birthDay: 21,
    deathYear: 1855, deathMonth: 1, deathDay: 12,
    gender: 'FEMALE',
  },

  // ── 비토리오 에마누엘레 2세 왕비 ─────────────────────────────────
  {
    name: '마리아 아델라이데',
    surname: '오스트리아',
    originalName: 'Maria Adelaide of Austria',
    biography:
      '사르데냐 왕국 왕비. 오스트리아 대공 라이너의 딸로 태어나 1842년 비토리오 에마누엘레 2세와 결혼했다. 이탈리아 통일의 영웅 움베르토 1세의 어머니이다. 1848년 제1차 이탈리아 독립 전쟁의 격동기에 왕실을 지탱하였으나 1855년 33세의 나이에 산욕열로 사망하였다. 온화하고 자애로운 성품으로 민중의 사랑을 받았다.',
    birthYear: 1822, birthMonth: 6, birthDay: 3,
    deathYear: 1855, deathMonth: 1, deathDay: 20,
    gender: 'FEMALE',
  },

  // ── 움베르토 1세 왕비 ─────────────────────────────────────────────
  {
    name: '마르게리타',
    surname: '사보이아',
    originalName: 'Margherita of Savoy',
    biography:
      '이탈리아 왕국 왕비. 사보이아 공작 페르디난도의 딸로 비토리오 에마누엘레 2세의 조카이기도 하다. 1868년 움베르토 1세와 결혼했다. 이탈리아의 국민적 왕비로 깊이 사랑받았으며, 그녀를 기리기 위해 1889년 나폴리의 라파엘레 에스포시토가 만든 피자에 "마르게리타"라는 이름이 붙여졌다. 남편 암살(1900) 후에도 26년을 더 살다 1926년 사망하였다.',
    birthYear: 1851, birthMonth: 11, birthDay: 20,
    deathYear: 1926, deathMonth: 1, deathDay: 4,
    gender: 'FEMALE',
  },

  // ── 비토리오 에마누엘레 3세 왕비 ─────────────────────────────────
  {
    name: '엘레나',
    surname: '몬테네그로',
    originalName: 'Elena of Montenegro',
    biography:
      '이탈리아 왕국 왕비. 몬테네그로 국왕 니콜라 1세 페트로비치-녜고시의 딸로 태어나 1896년 비토리오 에마누엘레 3세와 결혼했다. 제1·2차 세계대전 기간에 간호 봉사 활동으로 명성을 쌓았다. 남편이 1946년 퇴위 후 이집트로 망명하자 함께 망명 생활을 하다 1952년 사망하였다. 조르카 카라조르제비치 왕비(페타르 1세의 왕비)의 동생이다.',
    birthYear: 1873, birthMonth: 1, birthDay: 8,
    deathYear: 1952, deathMonth: 11, deathDay: 28,
    gender: 'FEMALE',
  },

  // ── 움베르토 2세 왕비 ─────────────────────────────────────────────
  {
    name: '마리 조제',
    surname: '벨기에',
    originalName: 'Marie José of Belgium',
    biography:
      '이탈리아 왕국의 마지막 왕비(이탈리아의 마리아 조세파). 벨기에 국왕 알베르 1세와 바이에른의 엘리자베트의 딸로 태어나 1930년 움베르토 2세와 결혼했다. 독자적인 정치 성향을 지녔으며 2차 대전 중 연합국과의 접촉을 시도하는 등 독립적으로 행동했다. 1946년 공화국 선언으로 망명 후 남편과 별거하며 스위스에서 주로 거주하다 2001년 사망하였다.',
    birthYear: 1906, birthMonth: 8, birthDay: 4,
    deathYear: 2001, deathMonth: 1, deathDay: 27,
    gender: 'FEMALE',
  },
]

// ── 왕비 출신 가문 ──────────────────────────────────────────────────
const WIFE_DYNASTIES: {
  name: string
  description: string
  startYear: number
  endYear?: number
}[] = [
  {
    name: '오를레앙 가문',
    description: '프랑스 왕가 부르봉 왕조의 분가. 루이 13세의 동생 가스통으로부터 시작되었으나 실질적 왕통으로는 필리프 1세(루이 14세의 동생)가 오를레앙 공작이 되면서 형성되었다. 사르데냐 왕비 안 마리 도를레앙을 배출했으며, 19세기에는 오를레앙 분가가 7월 왕정(1830~1848)을 수립하였다.',
    startYear: 1661, endYear: 1883,
  },
  {
    name: '팔츠-줄츠바흐 가문',
    description: '독일 팔츠 지방의 소영방 가문. 비텔스바흐 가문의 방계로 팔츠-줄츠바흐 백작령을 다스렸다. 사르데냐 왕비 안나 크리스티나를 배출하였다.',
    startYear: 1644, endYear: 1745,
  },
  {
    name: '헤센-라인펠스-로텐부르크 가문',
    description: '독일 헤센 지방의 소영방 가문. 헤센-라인펠스 방백령의 분가로 사르데냐 왕비 폴리세나를 배출하였다.',
    startYear: 1680, endYear: 1834,
  },
  {
    name: '로트링겐 가문',
    description: '로렌(로트링겐) 지방을 지배한 공작 가문. 후에 합스부르크 가문과 결혼하여 합스부르크-로트링겐 왕가를 형성했다. 신성로마황제 프란츠 1세의 가문이며 사르데냐 왕비 엘리자베트 테레제를 배출하였다.',
    startYear: 1048, endYear: 1737,
  },
  {
    name: '부르봉-스파냐 가문',
    description: '스페인 왕가. 루이 14세의 손자 필리프 5세가 스페인 왕위를 계승하며 창설된 부르봉 왕조의 스페인 분가. 사르데냐 왕비 마리아 안토니에타를 배출하였다.',
    startYear: 1700,
  },
  {
    name: '부르봉-프랑스 가문',
    description: '프랑스 왕가. 루이 9세의 후손으로 1589년부터 프랑스 왕위를 차지한 왕조. 사르데냐 왕비 마리 클로틸드(루이 15세의 손녀)를 배출하였다.',
    startYear: 1272, endYear: 1830,
  },
  {
    name: '합스부르크-에스테 가문',
    description: '오스트리아 합스부르크 왕가의 방계 모데나 에스테 분가. 사르데냐 왕비 마리아 테레사(비토리오 에마누엘레 1세의 왕비)를 배출하였다.',
    startYear: 1771, endYear: 1859,
  },
  {
    name: '부르봉-양시칠리아 가문',
    description: '양시칠리아 왕국의 부르봉 왕가. 스페인 부르봉 왕조의 방계로 나폴리·시칠리아를 지배하였다. 사르데냐 왕비 마리아 크리스티나(카를로 펠리체의 왕비)와 이탈리아 왕비 엘레나의 외가를 배출하였다.',
    startYear: 1735, endYear: 1861,
  },
  {
    name: '합스부르크-토스카나 가문',
    description: '오스트리아 합스부르크 왕가의 토스카나 분가. 토스카나 대공국을 지배하였으며 사르데냐 왕비 마리아 테레사(카를로 알베르토의 왕비)를 배출하였다.',
    startYear: 1765, endYear: 1860,
  },
  {
    name: '합스부르크-오스트리아 가문 (라이너 분가)',
    description: '오스트리아 합스부르크 왕가의 라이너 대공 분가. 사르데냐 왕비 마리아 아델라이데를 배출하였다.',
    startYear: 1783, endYear: 1931,
  },
  {
    name: '페트로비치-녜고시 가문 (몬테네그로)',
    description: '몬테네그로를 통치한 왕가(세르비아 시드 참조). 이탈리아 왕비 엘레나(비토리오 에마누엘레 3세의 왕비)를 배출하였다. 세르비아 왕비 조르카의 친정 가문과 동일.',
    startYear: 1696, endYear: 1918,
  },
  {
    name: '벨기에 왕가 (작센-코부르크-고타)',
    description: '1831년 레오폴트 1세가 즉위하면서 창설된 벨기에 왕국의 왕가. 이탈리아의 마지막 왕비 마리 조제(움베르토 2세의 왕비)를 배출하였다.',
    startYear: 1831,
  },
]

// ── 왕비 가문 매핑 ──────────────────────────────────────────────────
const WIFE_DYNASTY_MAP: {
  originalName: string
  dynastyName: string
}[] = [
  { originalName: 'Anne Marie d\'Orléans',         dynastyName: '오를레앙 가문' },
  { originalName: 'Anna Cristina of Sulzbach',      dynastyName: '팔츠-줄츠바흐 가문' },
  { originalName: 'Polissena of Hesse-Rheinfels-Rotenburg', dynastyName: '헤센-라인펠스-로텐부르크 가문' },
  { originalName: 'Elisabeth Therese of Lorraine',  dynastyName: '로트링겐 가문' },
  { originalName: 'Maria Antonietta of Bourbon-Spain', dynastyName: '부르봉-스파냐 가문' },
  { originalName: 'Marie Clotilde of France',       dynastyName: '부르봉-프랑스 가문' },
  { originalName: 'Maria Teresa of Austria-Este',   dynastyName: '합스부르크-에스테 가문' },
  { originalName: 'Maria Cristina of the Two Sicilies', dynastyName: '부르봉-양시칠리아 가문' },
  { originalName: 'Maria Teresa of Austria-Tuscany', dynastyName: '합스부르크-토스카나 가문' },
  { originalName: 'Maria Adelaide of Austria',      dynastyName: '합스부르크-오스트리아 가문 (라이너 분가)' },
  { originalName: 'Margherita of Savoy',            dynastyName: '사보이아 왕조' }, // 사보이아 분가
  { originalName: 'Elena of Montenegro',            dynastyName: '페트로비치-녜고시 가문 (몬테네그로)' },
  { originalName: 'Marie José of Belgium',          dynastyName: '벨기에 왕가 (작센-코부르크-고타)' },
]

// ── 결혼 관계 ──────────────────────────────────────────────────────
const MARRIAGES: {
  personA: string
  personB: string
  startYear: number
  startMonth: number
  startDay?: number
  endYear?: number
  endMonth?: number
  note?: string
}[] = [
  {
    personA: 'Vittorio Amedeo II of Sardinia',
    personB: 'Anne Marie d\'Orléans',
    startYear: 1684, startMonth: 4, startDay: 10,
    endYear: 1728, endMonth: 8,
    note: '안 마리 도를레앙 사망으로 혼인 종료.',
  },
  {
    personA: 'Carlo Emanuele III of Sardinia',
    personB: 'Anna Cristina of Sulzbach',
    startYear: 1722, startMonth: 8, startDay: 4,
    endYear: 1723, endMonth: 12,
    note: '안나 크리스티나 사망으로 혼인 종료.',
  },
  {
    personA: 'Carlo Emanuele III of Sardinia',
    personB: 'Polissena of Hesse-Rheinfels-Rotenburg',
    startYear: 1724, startMonth: 4, startDay: 3,
    endYear: 1735, endMonth: 1,
    note: '폴리세나 사망으로 혼인 종료.',
  },
  {
    personA: 'Carlo Emanuele III of Sardinia',
    personB: 'Elisabeth Therese of Lorraine',
    startYear: 1737, startMonth: 4, startDay: 1,
    endYear: 1741, endMonth: 7,
    note: '엘리자베트 테레제 사망으로 혼인 종료.',
  },
  {
    personA: 'Vittorio Amedeo III of Sardinia',
    personB: 'Maria Antonietta of Bourbon-Spain',
    startYear: 1750, startMonth: 5, startDay: 31,
    endYear: 1785, endMonth: 9,
    note: '마리아 안토니에타 사망으로 혼인 종료.',
  },
  {
    personA: 'Carlo Emanuele IV of Sardinia',
    personB: 'Marie Clotilde of France',
    startYear: 1775, startMonth: 9, startDay: 27,
    endYear: 1802, endMonth: 3,
    note: '마리 클로틸드 사망으로 혼인 종료.',
  },
  {
    personA: 'Vittorio Emanuele I of Sardinia',
    personB: 'Maria Teresa of Austria-Este',
    startYear: 1789, startMonth: 4, startDay: 20,
    endYear: 1824, endMonth: 1,
    note: '비토리오 에마누엘레 1세 사망으로 혼인 종료.',
  },
  {
    personA: 'Carlo Felice of Sardinia',
    personB: 'Maria Cristina of the Two Sicilies',
    startYear: 1807, startMonth: 4, startDay: 6,
    endYear: 1831, endMonth: 4,
    note: '카를로 펠리체 사망으로 혼인 종료.',
  },
  {
    personA: 'Carlo Alberto of Sardinia',
    personB: 'Maria Teresa of Austria-Tuscany',
    startYear: 1817, startMonth: 9, startDay: 30,
    endYear: 1849, endMonth: 7,
    note: '카를로 알베르토 사망으로 혼인 종료.',
  },
  {
    personA: 'Vittorio Emanuele II of Italy',
    personB: 'Maria Adelaide of Austria',
    startYear: 1842, startMonth: 4, startDay: 12,
    endYear: 1855, endMonth: 1,
    note: '마리아 아델라이데 사망으로 혼인 종료.',
  },
  {
    personA: 'Umberto I of Italy',
    personB: 'Margherita of Savoy',
    startYear: 1868, startMonth: 4, startDay: 22,
    endYear: 1900, endMonth: 7,
    note: '움베르토 1세 암살로 혼인 종료.',
  },
  {
    personA: 'Vittorio Emanuele III of Italy',
    personB: 'Elena of Montenegro',
    startYear: 1896, startMonth: 10, startDay: 24,
    endYear: 1947, endMonth: 12,
    note: '비토리오 에마누엘레 3세 사망으로 혼인 종료.',
  },
  {
    personA: 'Umberto II of Italy',
    personB: 'Marie José of Belgium',
    startYear: 1930, startMonth: 1, startDay: 8,
    endYear: 1983, endMonth: 3,
    note: '움베르토 2세 사망으로 혼인 종료.',
  },
]

// ── 부자 관계 ──────────────────────────────────────────────────────
const FATHER_CHILD: { father: string; child: string }[] = [
  { father: 'Vittorio Amedeo II of Sardinia',   child: 'Carlo Emanuele III of Sardinia' },
  { father: 'Carlo Emanuele III of Sardinia',   child: 'Vittorio Amedeo III of Sardinia' },
  { father: 'Vittorio Amedeo III of Sardinia',  child: 'Carlo Emanuele IV of Sardinia' },
  { father: 'Vittorio Amedeo III of Sardinia',  child: 'Vittorio Emanuele I of Sardinia' },
  { father: 'Vittorio Amedeo III of Sardinia',  child: 'Carlo Felice of Sardinia' },
  { father: 'Carlo Alberto of Sardinia',        child: 'Vittorio Emanuele II of Italy' },
  { father: 'Vittorio Emanuele II of Italy',    child: 'Umberto I of Italy' },
  { father: 'Umberto I of Italy',               child: 'Vittorio Emanuele III of Italy' },
  { father: 'Vittorio Emanuele III of Italy',   child: 'Umberto II of Italy' },
]

// ── 모자 관계 ──────────────────────────────────────────────────────
const MOTHER_CHILD: { mother: string; child: string }[] = [
  { mother: 'Anne Marie d\'Orléans',          child: 'Carlo Emanuele III of Sardinia' },
  { mother: 'Polissena of Hesse-Rheinfels-Rotenburg', child: 'Vittorio Amedeo III of Sardinia' },
  { mother: 'Maria Antonietta of Bourbon-Spain', child: 'Carlo Emanuele IV of Sardinia' },
  { mother: 'Maria Antonietta of Bourbon-Spain', child: 'Vittorio Emanuele I of Sardinia' },
  { mother: 'Maria Antonietta of Bourbon-Spain', child: 'Carlo Felice of Sardinia' },
  { mother: 'Maria Teresa of Austria-Tuscany', child: 'Vittorio Emanuele II of Italy' },
  { mother: 'Maria Adelaide of Austria',       child: 'Umberto I of Italy' },
  { mother: 'Margherita of Savoy',             child: 'Vittorio Emanuele III of Italy' },
  { mother: 'Elena of Montenegro',             child: 'Umberto II of Italy' },
]

// ── 인물 소속 국가 ──────────────────────────────────────────────────
const PERSON_AFFILIATION: {
  originalName: string
  historicalCountryName: string
  startYear: number
  endYear?: number
}[] = [
  // 군주
  { originalName: 'Vittorio Amedeo II of Sardinia',  historicalCountryName: '사르데냐 왕국', startYear: 1666, endYear: 1732 },
  { originalName: 'Carlo Emanuele III of Sardinia',  historicalCountryName: '사르데냐 왕국', startYear: 1701, endYear: 1773 },
  { originalName: 'Vittorio Amedeo III of Sardinia', historicalCountryName: '사르데냐 왕국', startYear: 1726, endYear: 1796 },
  { originalName: 'Carlo Emanuele IV of Sardinia',   historicalCountryName: '사르데냐 왕국', startYear: 1751, endYear: 1819 },
  { originalName: 'Vittorio Emanuele I of Sardinia', historicalCountryName: '사르데냐 왕국', startYear: 1759, endYear: 1824 },
  { originalName: 'Carlo Felice of Sardinia',        historicalCountryName: '사르데냐 왕국', startYear: 1765, endYear: 1831 },
  { originalName: 'Carlo Alberto of Sardinia',       historicalCountryName: '사르데냐 왕국', startYear: 1798, endYear: 1849 },
  { originalName: 'Vittorio Emanuele II of Italy',   historicalCountryName: '사르데냐 왕국', startYear: 1820, endYear: 1861 },
  { originalName: 'Vittorio Emanuele II of Italy',   historicalCountryName: '이탈리아 왕국', startYear: 1861, endYear: 1878 },
  { originalName: 'Umberto I of Italy',              historicalCountryName: '이탈리아 왕국', startYear: 1844, endYear: 1900 },
  { originalName: 'Vittorio Emanuele III of Italy',  historicalCountryName: '이탈리아 왕국', startYear: 1869, endYear: 1947 },
  { originalName: 'Umberto II of Italy',             historicalCountryName: '이탈리아 왕국', startYear: 1904, endYear: 1983 },
  // 왕비
  { originalName: 'Anne Marie d\'Orléans',           historicalCountryName: '사르데냐 왕국', startYear: 1684, endYear: 1728 },
  { originalName: 'Anna Cristina of Sulzbach',       historicalCountryName: '사르데냐 왕국', startYear: 1722, endYear: 1723 },
  { originalName: 'Polissena of Hesse-Rheinfels-Rotenburg', historicalCountryName: '사르데냐 왕국', startYear: 1724, endYear: 1735 },
  { originalName: 'Elisabeth Therese of Lorraine',   historicalCountryName: '사르데냐 왕국', startYear: 1737, endYear: 1741 },
  { originalName: 'Maria Antonietta of Bourbon-Spain', historicalCountryName: '사르데냐 왕국', startYear: 1750, endYear: 1785 },
  { originalName: 'Marie Clotilde of France',        historicalCountryName: '사르데냐 왕국', startYear: 1775, endYear: 1802 },
  { originalName: 'Maria Teresa of Austria-Este',    historicalCountryName: '사르데냐 왕국', startYear: 1789, endYear: 1832 },
  { originalName: 'Maria Cristina of the Two Sicilies', historicalCountryName: '사르데냐 왕국', startYear: 1807, endYear: 1831 },
  { originalName: 'Maria Teresa of Austria-Tuscany', historicalCountryName: '사르데냐 왕국', startYear: 1817, endYear: 1855 },
  { originalName: 'Maria Adelaide of Austria',       historicalCountryName: '사르데냐 왕국', startYear: 1842, endYear: 1855 },
  { originalName: 'Margherita of Savoy',             historicalCountryName: '이탈리아 왕국', startYear: 1868, endYear: 1926 },
  { originalName: 'Elena of Montenegro',             historicalCountryName: '이탈리아 왕국', startYear: 1896, endYear: 1952 },
  { originalName: 'Marie José of Belgium',           historicalCountryName: '이탈리아 왕국', startYear: 1930, endYear: 1946 },
]

export async function seedSavoyDynasty(prisma: PrismaService): Promise<void> {
  console.log('\n🏰 사보이아 왕조 시딩 시작...')

  // ── 1. 사보이아 왕조 생성 ────────────────────────────────────────
  let dynasty = await prisma.dynasty.findFirst({ where: { name: '사보이아 왕조' } })
  if (!dynasty) {
    dynasty = await prisma.dynasty.create({
      data: {
        name: '사보이아 왕조',
        description:
          '1003년경 사보이아 백작령에서 시작하여 1946년 이탈리아 공화국 수립으로 막을 내린 유럽에서 가장 오래된 왕가 중 하나. 피에몬테·사르데냐를 기반으로 이탈리아 반도 통일(1861)을 주도하였으며 비토리오 에마누엘레 2세가 초대 이탈리아 국왕이 되었다. 마지막 국왕 움베르토 2세가 1946년 국민투표 결과로 퇴위·망명하면서 군주제가 종식되었다.',
        startDate: new Date(1720, 7, 2),
        endDate: new Date(1946, 5, 12),
      },
    })
    console.log('  ✅ 사보이아 왕조 생성')
  } else {
    console.log('  ♻️  사보이아 왕조 이미 존재')
  }

  // ── 2. 왕조 통치 기록 등록 ──────────────────────────────────────
  console.log('  📋 왕조 통치 기록 등록...')
  for (const rule of DYNASTY_RULES) {
    const hc = await prisma.historicalCountry.findFirst({ where: { name: rule.countryName } })
    if (!hc) { console.warn(`    ⚠️  역사 국가 없음: ${rule.countryName}`); continue }
    const existing = await prisma.dynastyRule.findFirst({
      where: { dynastyId: dynasty.id, historicalCountryId: hc.id, startYear: rule.startYear },
    })
    if (!existing) {
      await prisma.dynastyRule.create({
        data: {
          dynastyId: dynasty.id,
          historicalCountryId: hc.id,
          startEra: 'AD', startYear: rule.startYear,
          endEra: rule.endYear ? 'AD' : undefined,
          endYear: rule.endYear,
          endReason: rule.endReason,
          notes: rule.notes,
        },
      })
      console.log(`    ✅ 사보이아 → ${rule.countryName} (${rule.startYear})`)
    } else {
      console.log(`    ⏭️  사보이아 → ${rule.countryName} (${rule.startYear})`)
    }
  }

  // ── 3. 왕비 인물 생성 ─────────────────────────────────────────────
  console.log('  👩 왕비 인물 생성...')
  for (const w of WIVES) {
    const existing = await prisma.person.findFirst({ where: { originalName: w.originalName } })
    if (existing) {
      console.log(`    ⏭️  ${w.originalName}`)
    } else {
      await prisma.person.create({
        data: {
          name: w.name,
          surname: w.surname,
          originalName: w.originalName,
          biography: w.biography,
          birthDate: new Date(w.birthYear, (w.birthMonth ?? 1) - 1, w.birthDay ?? 1),
          birthEra: 'AD',
          deathDate: w.deathYear
            ? new Date(w.deathYear, (w.deathMonth ?? 1) - 1, w.deathDay ?? 1)
            : undefined,
          deathEra: w.deathYear ? 'AD' : undefined,
          gender: w.gender as any,
          nameDisplayOrder: 'western',
          accountId: ACCOUNT_ID,
        },
      })
      console.log(`    ✅ ${w.originalName}`)
    }
  }

  // ── 4. 군주 → 사보이아 왕조 연결 ────────────────────────────────
  console.log('  🔗 군주-왕조 연결...')
  for (const originalName of SAVOY_MONARCHS) {
    const person = await prisma.person.findFirst({ where: { originalName } })
    if (!person) { console.warn(`    ⚠️  인물 없음: ${originalName}`); continue }
    if (person.dynastyId !== dynasty.id) {
      await prisma.person.update({ where: { id: person.id }, data: { dynastyId: dynasty.id } })
      console.log(`    ✅ ${originalName} → 사보이아 왕조`)
    } else {
      console.log(`    ⏭️  ${originalName}`)
    }
  }

  // ── 5. 왕비 출신 가문 생성 ──────────────────────────────────────
  console.log('  🏛️  왕비 출신 가문 생성...')
  const dynastyIdMap = new Map<string, string>()

  // 사보이아 왕조 자체도 맵에 추가 (마르게리타는 사보이아 분가)
  dynastyIdMap.set('사보이아 왕조', dynasty.id)

  for (const wd of WIFE_DYNASTIES) {
    let d = await prisma.dynasty.findFirst({ where: { name: wd.name } })
    if (!d) {
      d = await prisma.dynasty.create({
        data: {
          name: wd.name,
          description: wd.description,
          startDate: new Date(wd.startYear, 0, 1),
          endDate: wd.endYear ? new Date(wd.endYear, 11, 31) : undefined,
        },
      })
      console.log(`    ✅ ${wd.name}`)
    } else {
      console.log(`    ⏭️  ${wd.name}`)
    }
    dynastyIdMap.set(wd.name, d.id)
  }

  // ── 6. 왕비 → 출신 가문 연결 ────────────────────────────────────
  for (const map of WIFE_DYNASTY_MAP) {
    const person = await prisma.person.findFirst({ where: { originalName: map.originalName } })
    if (!person) { console.warn(`    ⚠️  인물 없음: ${map.originalName}`); continue }
    const dId = dynastyIdMap.get(map.dynastyName)
    if (!dId) { console.warn(`    ⚠️  가문 없음: ${map.dynastyName}`); continue }
    if (person.dynastyId !== dId) {
      await prisma.person.update({ where: { id: person.id }, data: { dynastyId: dId } })
      console.log(`    ✅ ${map.originalName} → ${map.dynastyName}`)
    } else {
      console.log(`    ⏭️  ${map.originalName}`)
    }
  }

  // ── 7. 결혼 관계 등록 ─────────────────────────────────────────────
  console.log('  💍 결혼 관계 등록...')
  for (const m of MARRIAGES) {
    const personA = await prisma.person.findFirst({ where: { originalName: m.personA } })
    const personB = await prisma.person.findFirst({ where: { originalName: m.personB } })
    if (!personA) { console.warn(`    ⚠️  인물 없음: ${m.personA}`); continue }
    if (!personB) { console.warn(`    ⚠️  인물 없음: ${m.personB}`); continue }

    const startDate = new Date(m.startYear, m.startMonth - 1, m.startDay ?? 1)
    const endDate = m.endYear ? new Date(m.endYear, (m.endMonth ?? 1) - 1, 1) : undefined

    const existingAB = await prisma.personSpouse.findFirst({
      where: { personId: personA.id, spouseId: personB.id },
    })
    if (!existingAB) {
      await prisma.personSpouse.create({
        data: { personId: personA.id, spouseId: personB.id, marriageStartDate: startDate, marriageEndDate: endDate, note: m.note },
      })
    }
    const existingBA = await prisma.personSpouse.findFirst({
      where: { personId: personB.id, spouseId: personA.id },
    })
    if (!existingBA) {
      await prisma.personSpouse.create({
        data: { personId: personB.id, spouseId: personA.id, marriageStartDate: startDate, marriageEndDate: endDate, note: m.note },
      })
    }
    if (!existingAB || !existingBA) {
      console.log(`    ✅ ${m.personA} ↔ ${m.personB}`)
    } else {
      console.log(`    ⏭️  ${m.personA} ↔ ${m.personB}`)
    }
  }

  // ── 8. 부자/모자 관계 등록 ────────────────────────────────────────
  console.log('  👨 부자/모자 관계 등록...')
  for (const fc of FATHER_CHILD) {
    const father = await prisma.person.findFirst({ where: { originalName: fc.father } })
    const child = await prisma.person.findFirst({ where: { originalName: fc.child } })
    if (!father) { console.warn(`    ⚠️  인물 없음: ${fc.father}`); continue }
    if (!child) { console.warn(`    ⚠️  인물 없음: ${fc.child}`); continue }
    if (child.fatherId !== father.id) {
      await prisma.person.update({ where: { id: child.id }, data: { fatherId: father.id } })
      console.log(`    ✅ 부: ${fc.father} → ${fc.child}`)
    } else {
      console.log(`    ⏭️  부: ${fc.father} → ${fc.child}`)
    }
  }
  for (const mc of MOTHER_CHILD) {
    const mother = await prisma.person.findFirst({ where: { originalName: mc.mother } })
    const child = await prisma.person.findFirst({ where: { originalName: mc.child } })
    if (!mother) { console.warn(`    ⚠️  인물 없음: ${mc.mother}`); continue }
    if (!child) { console.warn(`    ⚠️  인물 없음: ${mc.child}`); continue }
    if (child.motherId !== mother.id) {
      await prisma.person.update({ where: { id: child.id }, data: { motherId: mother.id } })
      console.log(`    ✅ 모: ${mc.mother} → ${mc.child}`)
    } else {
      console.log(`    ⏭️  모: ${mc.mother} → ${mc.child}`)
    }
  }

  // ── 9. 인물 소속 국가 등록 ──────────────────────────────────────
  console.log('  🗺️  인물 소속 국가 등록...')
  for (const aff of PERSON_AFFILIATION) {
    const person = await prisma.person.findFirst({ where: { originalName: aff.originalName } })
    if (!person) { console.warn(`    ⚠️  인물 없음: ${aff.originalName}`); continue }
    const hc = await prisma.historicalCountry.findFirst({ where: { name: aff.historicalCountryName } })
    if (!hc) { console.warn(`    ⚠️  역사 국가 없음: ${aff.historicalCountryName}`); continue }

    const existing = await prisma.personCountryAffiliation.findFirst({
      where: { personId: person.id, historicalCountryId: hc.id },
    })
    if (!existing) {
      await prisma.personCountryAffiliation.create({
        data: {
          personId: person.id,
          historicalCountryId: hc.id,
          affiliationType: 'CITIZENSHIP',
          startDate: new Date(aff.startYear, 0, 1),
          endDate: aff.endYear ? new Date(aff.endYear, 11, 31) : undefined,
          priority: 0,
        },
      })
      console.log(`    ✅ ${aff.originalName} → ${aff.historicalCountryName}`)
    } else {
      console.log(`    ⏭️  ${aff.originalName} → ${aff.historicalCountryName}`)
    }
  }

  console.log('✅ 사보이아 왕조 시딩 완료\n')
}
