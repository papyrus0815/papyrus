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
  // ── 고대 흑해 북안 ────────────────────────────────────────────────
  {
    name: '스키타이',
    enName: 'Scythia',
    nameOrigin:
      '그리스인이 흑해 북쪽 초원의 기마 유목민을 부르던 "스키타이(Σκύθαι)"에서 왔다. ' +
      '스스로는 헤로도토스가 전하듯 "스콜로토이(Skolotoi)"라 불렀고, ' +
      '페르시아 기록은 같은 무리를 "사카(Saka)"로 적었다.',
    description:
      '기원전 7세기경 카프카스를 넘어 흑해 북안 초원에 자리 잡은 이란계 기마 유목국가. ' +
      '드니프로강 하류를 중심으로 왕령 스키타이가 있었고, 헤로도토스는 이들을 다뉴브와 돈강 사이의 주인으로 기록했다. ' +
      '기원전 513년 다리우스 1세의 원정을 초토화 전술로 물리친 일이 유명하며, ' +
      '쿠르간(봉분) 무덤에서 나온 황금 세공은 동물 문양 미술의 절정으로 꼽힌다. ' +
      '기원전 3세기 사르마트인에게 초원을 내준 뒤에는 크림반도로 물러나 ' +
      '네아폴리스(오늘날 심페로폴)를 도읍 삼은 이른바 소(小)스키타이로 3세기 중엽까지 이어졌다. ' +
      '대(大)스키타이와 소스키타이를 한 행으로 합쳐 등록한다.',
    startEra: 'BC', startYear: 700,
    endEra: 'AD', endYear: 250,
    stateType: HistoricalStateType.NOMADIC_EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 47.5, longitude: 34.0,
    linkToIsoCodes: ['UA', 'RU'],
  },
  {
    name: '보스포로스 왕국',
    enName: 'Bosporan Kingdom',
    nameOrigin:
      '케르치 해협의 옛 이름 "킴메리아 보스포로스(Bosporus Cimmerius)"에서 딴 이름으로, ' +
      '해협 양안을 함께 다스린 왕국이라는 뜻이다.',
    description:
      '기원전 480년경 케르치 해협 양안의 그리스 식민시들이 판티카파이온(오늘날 케르치)을 중심으로 뭉쳐 세운 왕국. ' +
      '기원전 438년 스파르토코스 왕조가 들어서며 틀을 갖췄고, 흑해 곡물을 아테네에 공급하는 창구로 번성했다. ' +
      '그리스 도시문화와 스키타이·사르마트 초원문화가 뒤섞인 독특한 세계를 이루었다. ' +
      '기원전 2세기 말 스키타이의 압박에 폰토스의 미트리다테스 6세에게 의탁했다가 뒤에 로마의 속국이 되었고, ' +
      '4세기 훈족의 물결 속에 무너졌다. 이후 크림의 옛 영역은 동로마 제국이 거두어들였다. ' +
      '케르치 해협을 낀 왕국이라 오늘날 우크라이나(크림)와 러시아(타만) 양쪽에 걸친다.',
    startEra: 'BC', startYear: 438,
    endEra: 'AD', endYear: 370,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.35, longitude: 36.47,
    linkToIsoCodes: ['UA', 'RU'],
  },
  {
    name: '하자르 칸국',
    enName: 'Khazar Khaganate',
    nameOrigin:
      '튀르크계 부족명 "하자르(Khazar)"에서 왔으며, 어원은 "떠돌다"를 뜻하는 튀르크어 어근 kaz-로 보는 견해가 유력하다. ' +
      '군주 칭호 카간(Khagan)을 그대로 국호에 붙여 칸국이라 옮긴다.',
    description:
      '7세기 중엽 서돌궐이 무너진 자리에서 볼가강 하류와 북카프카스를 장악한 튀르크계 유목 제국. ' +
      '도읍 아틸을 중심으로 볼가·돈·드니프로를 잇는 교역로의 관문을 쥐고 번영했고, ' +
      '아랍의 북상을 카프카스에서 막아 동로마의 방파제 노릇을 했다. ' +
      '8~9세기 지배층이 유대교를 받아들인 일로 널리 알려져 있으며, ' +
      '크림반도와 드니프로 좌안 초원을 직접 다스리고 키이우 일대 슬라브 부족에게 공납을 받았다. ' +
      '965년 키예프 루스의 스뱌토슬라프 1세가 사르켈과 아틸을 무너뜨리며 급속히 힘을 잃었다.',
    startEra: 'AD', startYear: 650,
    endEra: 'AD', endYear: 969,
    stateType: HistoricalStateType.KHANATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 46.35, longitude: 48.05,
    linkToIsoCodes: ['UA', 'RU'],
  },

  // ── 루스 분열기 — 오늘날 우크라이나 땅의 공국들 ───────────────────
  {
    name: '페레야슬라우 공국',
    enName: 'Principality of Pereiaslavl',
    nameOrigin:
      '도읍 페레야슬라우(Переяслав)는 "영예를 이어받은 곳"이라는 뜻으로 풀이되며, ' +
      '993년 블라디미르 1세가 페체네그와의 싸움에서 이긴 자리에 세웠다는 전승이 있다.',
    description:
      '1054년 야로슬라프 현공이 아들 프세볼로드에게 물려주며 갈라져 나온 키예프 루스의 공국. ' +
      '드니프로 좌안에서 초원과 맞닿은 최전선이라 폴로베츠(쿠만)의 침입을 가장 먼저 받아내는 자리였다. ' +
      '키이우·체르니히우와 함께 "루스 삼각"을 이루어 대공위 계승 서열의 한 축을 맡았고, ' +
      '『이고리 원정기』의 무대가 된 초원 원정들이 이 공국에서 출발했다. ' +
      '1239년 몽골의 침입으로 도읍이 무너지며 독자적 정치체로서의 명맥이 끊겼다.',
    startEra: 'AD', startYear: 1054,
    endEra: 'AD', endYear: 1239,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.07, longitude: 31.45,
    linkToIsoCodes: ['UA'],
  },
  {
    name: '키예프 공국',
    enName: 'Principality of Kiev',
    nameOrigin:
      '전설상의 건설자 키(Кий)의 이름에서 온 도읍 키이우(키예프)를 그대로 국호로 삼았다. ' +
      '우크라이나어 표기는 "키이우 공국"이다.',
    description:
      '1132년 므스티슬라프 1세가 죽고 루스가 갈라진 뒤, 옛 수도 키이우와 그 근교만을 다스리게 된 공국. ' +
      '대공위의 상징성은 남아 여러 계보가 이 자리를 두고 다투었으나, ' +
      '1169년 안드레이 보골륩스키의 약탈과 1240년 몽골의 파괴로 실질적인 힘을 잃고 금장 칸국의 속령이 되었다. ' +
      '1362년 시니 보디(청수) 전투 뒤 리투아니아 대공국의 종주권 아래 들어가 올겔도비치 가문이 다스렸고, ' +
      '1471년 카지미에시 4세가 공국을 폐지하고 키이우 현(voivodeship)으로 개편하면서 사라졌다.',
    startEra: 'AD', startYear: 1132,
    endEra: 'AD', endYear: 1471,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.45, longitude: 30.52,
    linkToIsoCodes: ['UA'],
  },

  // ── 초원의 계승자 ─────────────────────────────────────────────────
  {
    name: '금장 칸국',
    enName: 'Golden Horde',
    nameOrigin:
      '몽골어 "알탄 오르도(황금 장막)"에서 온 이름으로, 칸의 황금빛 천막 궁정을 가리킨다. ' +
      '당대에는 "주치 울루스(Ulus Jochi)"라 불렀고, 러시아 사료의 "킵차크 칸국"도 같은 나라다.',
    description:
      '1242년 바투가 서방 원정에서 돌아와 볼가강 하류 사라이에 세운 주치 가문의 울루스. ' +
      '루스의 여러 공국을 공납 체제 아래 두고 대공 임명권을 쥐어 "타타르의 멍에"라 불린 시대를 열었다. ' +
      '다만 흑해 북안 초원과 크림반도는 공납이 아니라 칸이 직접 다스린 영역이었고, ' +
      '카파·솔하트를 거치는 동서 교역이 이 땅을 통해 이어졌다. ' +
      '14세기 후반 내분과 티무르의 원정으로 쪼개져 크림·카잔·아스트라한 칸국 등으로 갈라졌고, ' +
      '1502년 크림 칸 멩글리 1세 기라이가 대오르다를 무너뜨리며 끝났다. ' +
      '우크라이나 쪽 계보(크림 칸국)의 전신이라 이 시드에 함께 둔다.',
    startEra: 'AD', startYear: 1242,
    endEra: 'AD', endYear: 1502,
    stateType: HistoricalStateType.KHANATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 47.22, longitude: 47.55,
    linkToIsoCodes: ['RU', 'UA', 'KZ'],
  },
  {
    name: '크림 칸국',
    enName: 'Crimean Khanate',
    nameOrigin:
      '도읍 크름(Qırım, 오늘날 스타리 크림)의 이름이 반도 전체의 이름이 되었다. ' +
      '스스로는 "위대한 오르다와 킵차크 초원의 나라"를 칭했다.',
    description:
      '1441년 하즈 1세 기라이가 금장 칸국에서 갈라져 나와 세운 기라이 왕조의 칸국. ' +
      '1478년부터 오스만 제국의 종주권을 받아들였으나 자체 칸과 조정을 유지한 자치국이었고, ' +
      '술탄가에 이어 제위 계승권을 인정받을 만큼 높은 격을 누렸다. ' +
      '바흐치사라이를 도읍으로 삼아 300년 넘게 흑해 북안을 호령하며 ' +
      '폴란드-리투아니아와 모스크바를 상대로 원정을 거듭했고, 노예 교역이 재정의 큰 축이었다. ' +
      '1774년 퀴췩카이나르자 조약으로 오스만의 종주권에서 떨어져 나온 뒤 ' +
      '1783년 예카테리나 2세가 병합하며 사라졌다.',
    startEra: 'AD', startYear: 1441,
    endEra: 'AD', endYear: 1783, endMonth: 4,
    stateType: HistoricalStateType.KHANATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.75, longitude: 33.86,
    linkToIsoCodes: ['UA'],
  },

  // ── 카자크의 나라 ─────────────────────────────────────────────────
  {
    name: '자포리자 카자크 시치',
    enName: 'Zaporozhian Sich',
    nameOrigin:
      '"자 포로하미(за порогами)" 곧 "드니프로 급류 너머"라는 뜻이고, ' +
      '시치(Січ)는 통나무를 깎아 두른 목책 요새를 가리킨다. ' +
      '러시아어식 표기를 따른 "자포로제 시치", 영어 표기를 옮긴 "코사크"도 같은 대상을 가리킨다.',
    description:
      '드니프로 급류 아래 호르티차섬 일대에 카자크들이 세운 병영 공동체. ' +
      '1552년경 드미트로 비슈네베츠키가 호르티차에 요새를 쌓은 것을 그 시작으로 본다. ' +
      '전체 회의인 라다에서 코슈 아타만을 뽑고 전리품과 자리를 나눈 군사 민주정으로, ' +
      '도망 농노와 변경민을 받아들여 "카자크의 어머니"라 불렸다. ' +
      '폴란드-리투아니아 연방의 명목상 신민이면서도 독자적으로 흑해 원정에 나섰고, ' +
      '1648년 흐멜니츠키 봉기의 진원이 되어 카자크 수장국을 낳았다. ' +
      '헤트만국이 무너진 뒤에도 남아 있다가 1775년 예카테리나 2세의 군대에 헐리며 해체되었다.',
    startEra: 'AD', startYear: 1552,
    endEra: 'AD', endYear: 1775, endMonth: 6,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 47.84, longitude: 35.08,
    linkToIsoCodes: ['UA'],
  },
  {
    name: '카자크 수장국',
    enName: 'Cossack Hetmanate',
    nameOrigin:
      '당대의 정식 이름은 "자포리자 군단(Військо Запорозьке)"이었고, ' +
      '군주에 해당하는 선출직 수장 헤트만(гетьман, 독일어 Hauptmann에서 유래)의 이름을 따 수장국이라 옮긴다. ' +
      '영어 Cossack을 옮긴 "코사크 헤트만국", 러시아어식 "자포로제 군단"도 같은 나라를 가리키는 표기다.',
    description:
      '1648년 보흐단 흐멜니츠키의 봉기로 폴란드-리투아니아 연방에서 떨어져 나와 ' +
      '1649년 즈보리우 조약으로 자치를 공인받으며 성립한 카자크 국가. ' +
      '연대(폴크)를 그대로 행정 단위로 삼은 군사 조직형 국가였고, ' +
      '헤트만은 카자크 라다에서 뽑았으며 치히린·바투린·흘루히우가 차례로 도읍이 되었다. ' +
      '1654년 페레야슬라프 조약으로 러시아 차르의 보호를 받아들인 뒤 자치권이 단계적으로 깎였고, ' +
      '1709년 헤트만 이반 마제파가 스웨덴 편에 섰다가 폴타바에서 패하며 결정적으로 기울었다. ' +
      '1764년 예카테리나 2세가 헤트만직을 폐지하고 소러시아 참사회를 두면서 끝났다.',
    startEra: 'AD', startYear: 1649, startMonth: 8,
    endEra: 'AD', endYear: 1764, endMonth: 11,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 49.08, longitude: 32.66,
    linkToIsoCodes: ['UA'],
  },

  // ── 합스부르크 치하의 서부 ────────────────────────────────────────
  {
    name: '갈리치아-로도메리아 왕국',
    enName: 'Kingdom of Galicia and Lodomeria',
    nameOrigin:
      '중세 할리치(Halych) 공국과 볼로디미르(Volodymyr) 공국의 라틴식 이름 Galicia·Lodomeria를 붙인 것이다. ' +
      '헝가리 왕이 13세기에 내세웠던 해묵은 권리 주장을 합스부르크가 분할의 명분으로 되살려 붙인 국호다.',
    description:
      '1772년 제1차 폴란드 분할로 합스부르크가 차지한 땅에 세운 왕관령. ' +
      '오스트리아 군주가 "갈리치아와 로도메리아의 왕"을 겸했고 렘베르크(리비우)가 주도였다. ' +
      '동부는 우크라이나(루테니아)인, 서부는 폴란드인이 다수인 이중 구조여서 ' +
      '1848년 이후 두 민족운동이 같은 의회를 무대로 맞섰고, ' +
      '제국 안에서 비교적 넓은 정치적 자유가 허용된 덕에 우크라이나 민족운동의 "피에몬테"라 불렸다. ' +
      '1918년 오스트리아-헝가리가 해체되자 동부는 서우크라이나 인민공화국을 선포했고 ' +
      '서부는 폴란드 제2공화국에 들어가면서 왕관령은 사라졌다.',
    startEra: 'AD', startYear: 1772, startMonth: 8,
    endEra: 'AD', endYear: 1918, endMonth: 11,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 49.84, longitude: 24.03,
    linkToIsoCodes: ['UA', 'PL'],
  },
  {
    name: '부코비나 공국',
    enName: 'Duchy of Bukovina',
    nameOrigin:
      '슬라브어 "부크(bukva, 너도밤나무)"에서 온 이름으로 "너도밤나무 숲의 땅"을 뜻한다.',
    description:
      '1774년 오스만이 합스부르크에 넘긴 몰다비아 북부를 1849년 별도의 왕관령 공국으로 승격시킨 땅. ' +
      '체르니우치(체르노비츠)를 주도로 삼았고, 우크라이나인·루마니아인·독일인·유대인이 뒤섞인 ' +
      '다민족 지역이라 제국 안에서도 손꼽히는 문화 교차로였다. ' +
      '1875년 세워진 체르니우치 대학이 지역 지식인 사회의 중심이 되었다. ' +
      '1918년 제국 해체와 함께 북부는 우크라이나 민족운동이, 남부는 루마니아가 각각 손을 뻗었고, ' +
      '결국 루마니아 왕국에 병합되며 공국은 문을 닫았다. 북부는 1940년 소련에 넘어가 오늘날 우크라이나 땅이다.',
    startEra: 'AD', startYear: 1849, startMonth: 3,
    endEra: 'AD', endYear: 1918, endMonth: 11,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.29, longitude: 25.94,
    linkToIsoCodes: ['UA', 'RO'],
  },

  // ── 1917~1921 독립 시도 ───────────────────────────────────────────
  {
    name: '우크라이나 인민공화국',
    enName: "Ukrainian People's Republic",
    nameOrigin:
      '"우크라이나(Україна)"는 본래 "변경(край)의 땅"을 뜻하는 말에서 왔다는 풀이가 널리 쓰인다. ' +
      '"인민공화국(Народна Республіка)"은 사회주의가 아니라 "국민의 공화국"이라는 당대의 어법이다.',
    description:
      '1917년 2월 혁명 뒤 키이우에 세워진 중앙 라다가 같은 해 11월 제3차 우니베르살로 선포하고, ' +
      '1918년 1월 제4차 우니베르살로 완전 독립을 선언한 우크라이나 최초의 근대 국가. ' +
      '미하일로 흐루셰우스키가 중앙 라다 의장, 볼로디미르 빈니첸코가 총서기를 맡았다. ' +
      '1918년 2월 브레스트-리토프스크 조약으로 열강의 승인을 얻었으나 독일군의 후견 아래 있었고, ' +
      '4월 스코로파츠키의 쿠데타로 우크라이나국에 자리를 내주었다가 12월 디렉토리야가 되찾았다. ' +
      '1919년 1월 서우크라이나 인민공화국과 통일 법령(즐루카)을 맺었으나, ' +
      '볼셰비키·백군·폴란드 사이에서 영토를 잃고 1921년 3월 리가 조약으로 사실상 소멸했다. ' +
      '망명 정부는 1992년까지 이어졌다.',
    startEra: 'AD', startYear: 1917, startMonth: 11,
    endEra: 'AD', endYear: 1921, endMonth: 3,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.45, longitude: 30.52,
    linkToIsoCodes: ['UA'],
  },
  {
    name: '우크라이나국',
    enName: 'Ukrainian State',
    nameOrigin:
      '"데르자바(Держава)"는 공화국도 왕국도 아닌 "나라·국가" 자체를 가리키는 말로, ' +
      '헤트만 정권이 공화정과 거리를 두려고 고른 국호다. "헤트만국(Гетьманат)"이라고도 부른다.',
    description:
      '1918년 4월 29일 독일군의 지원을 업은 파울로 스코로파츠키가 중앙 라다를 해산하고 ' +
      '스스로 "전 우크라이나의 헤트만"을 칭하며 세운 정권. 카자크 수장국의 전통을 내세운 보수 권위주의 체제였다. ' +
      '토지 개혁을 되돌리고 지주·관료층을 기용해 농민의 반발을 샀지만, ' +
      '우크라이나 과학원과 두 곳의 국립대학을 세우는 등 국가 제도를 빠르게 갖춘 시기이기도 했다. ' +
      '1918년 11월 독일이 항복하자 지지 기반을 잃었고, 12월 디렉토리야 봉기로 스코로파츠키가 망명하며 무너졌다. ' +
      '같은 나라의 8개월짜리 체제라 인민공화국 행과 왕복 계승으로 잇는다.',
    startEra: 'AD', startYear: 1918, startMonth: 4,
    endEra: 'AD', endYear: 1918, endMonth: 12,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 50.45, longitude: 30.52,
    linkToIsoCodes: ['UA'],
  },
  {
    name: '서우크라이나 인민공화국',
    enName: "West Ukrainian People's Republic",
    nameOrigin:
      '동갈리치아·부코비나 북부·자카르파탸를 아우르려 한 "서쪽의 우크라이나 인민공화국"이라는 뜻이며, ' +
      '우크라이나어 약칭은 ZUNR(ЗУНР)이다.',
    description:
      '1918년 11월 1일 오스트리아-헝가리가 무너지는 틈에 우크라이나 민족평의회가 리비우를 장악하며 선포한 공화국. ' +
      '예우헨 페트루셰비치가 대통령격인 독재관을 맡았고 갈리치아군(UHA)을 편성했다. ' +
      '같은 땅을 노린 폴란드와 곧바로 전쟁에 들어가 리비우를 내주고 스타니슬라비우로 옮겨갔다. ' +
      '1919년 1월 22일 키이우 성소피아 광장에서 우크라이나 인민공화국과의 통일 법령(즐루카)을 선포해 ' +
      '서부주(ZOUNR)로 편입되었으나 군과 행정은 실질적으로 따로 움직였다. ' +
      '1919년 7월 즈브루치강 너머로 밀려나며 영토를 잃었고, 1923년 열강이 동갈리치아의 폴란드 귀속을 승인했다.',
    startEra: 'AD', startYear: 1918, startMonth: 11,
    endEra: 'AD', endYear: 1919, endMonth: 7,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 49.84, longitude: 24.03,
    linkToIsoCodes: ['UA'],
  },

  // ── 자카르파탸의 하루살이 공화국 ──────────────────────────────────
  {
    name: '카르파토우크라이나',
    enName: 'Carpatho-Ukraine',
    nameOrigin:
      '카르파티아 산맥 남쪽 기슭의 우크라이나라는 뜻. ' +
      '자치 시기의 공식 명칭은 "포드카르파츠카 루스(Підкарпатська Русь, 카르파티아 루테니아)"였고, ' +
      '1938년 12월 카르파토우크라이나로 이름을 바꿨다.',
    description:
      '1938년 뮌헨 협정 뒤 체코슬로바키아가 연방으로 재편되면서 자치를 얻은 자카르파탸 지역. ' +
      '아우구스틴 볼로신이 총리를 맡아 우크라이나어 교육과 행정을 폈고, ' +
      '같은 해 11월 제1차 빈 중재로 우주호로드 등 남부 평지를 헝가리에 빼앗겨 흐스트로 수도를 옮겼다. ' +
      '1939년 3월 15일 독일이 체코슬로바키아를 해체하자 곧바로 독립을 선포하고 볼로신을 대통령으로 뽑았지만, ' +
      '같은 날 진격한 헝가리군에 맞서 카르파티아 시치가 며칠간 저항하다 무너졌다. ' +
      '독립국으로서는 사흘 남짓이었으나 우크라이나 국가 서사에서 자주 호명되는 장면이다.',
    startEra: 'AD', startYear: 1938, startMonth: 10,
    endEra: 'AD', endYear: 1939, endMonth: 3,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.18, longitude: 23.30,
    linkToIsoCodes: ['UA'],
  },

  // ── 독일 점령기 ───────────────────────────────────────────────────
  {
    name: '우크라이나 제국판무관부',
    enName: 'Reichskommissariat Ukraine',
    nameOrigin:
      '독일어 "라이히스코미사리아트(Reichskommissariat)"는 제국판무관이 다스리는 민정 통치구를 뜻한다. ' +
      '동방 점령지에 둔 두 판무관부(오스트란트·우크라이나) 가운데 하나다.',
    description:
      '1941년 9월 독일이 점령한 우크라이나 땅에 세운 민정 통치기구. ' +
      '에리히 코흐가 제국판무관으로 리우네에 본부를 두었고, 갈리치아는 총독부로, ' +
      '동부 전선 인접 지역은 군정으로 따로 떼어져 우크라이나 전역을 포괄하지는 않았다. ' +
      '곡물 수탈과 강제 노동 송출(오스트아르바이터), 유대인 학살이 자행된 가혹한 점령 행정이었고, ' +
      '이에 맞서 소련 빨치산과 우크라이나 봉기군(UPA)이 각각 무장 저항을 폈다. ' +
      '1943~44년 소련군의 진격으로 관할 구역을 잃고 1944년 11월 공식 해체되었다.',
    startEra: 'AD', startYear: 1941, startMonth: 9,
    endEra: 'AD', endYear: 1944, endMonth: 11,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 50.62, longitude: 26.25,
    linkToIsoCodes: ['UA'],
  },

  // ── 현대 ──────────────────────────────────────────────────────────
  {
    name: '우크라이나 공화국',
    enName: 'Republic of Ukraine',
    nameOrigin:
      '정식 국호는 수식어 없는 "우크라이나(Україна)"다. ' +
      '이 표에서는 현대 국가 "우크라이나" 항목과 구분하기 위해 ' +
      '헌법이 규정한 공화정 형태를 붙여 행 이름을 삼았다(루마니아 공화국 전례).',
    description:
      '1991년 8월 24일 최고 라다가 독립을 선언하고 12월 1일 국민투표에서 90%가 넘는 찬성으로 이를 확정한 뒤, ' +
      '같은 달 벨라베자 합의로 소련 해체에 서명하며 출범한 현대 우크라이나. ' +
      '1994년 부다페스트 각서로 세계 3위 규모의 핵무기를 포기하는 대신 영토 보전을 보장받았고, ' +
      '1996년 헌법을 제정했다. 2004년 오렌지 혁명, 2013~14년 유로마이단으로 두 차례 정권이 바뀌었으며, ' +
      '2014년 러시아의 크림반도 병합과 돈바스 전쟁, 2022년 2월 시작된 전면 침공을 겪고 있다. ' +
      '2022년 유럽연합 가입 후보국 지위를 얻었다.',
    startEra: 'AD', startYear: 1991, startMonth: 8,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.45, longitude: 30.52,
    linkToIsoCodes: ['UA'],
  },
]

export async function seedUkraineHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇺🇦 우크라이나 관련 역사 국가 시딩 시작...')

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

  console.log(`✅ 우크라이나 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
