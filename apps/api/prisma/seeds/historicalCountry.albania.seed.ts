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

/**
 * 링크 판정 요약(적대 검증 통과분)
 * - 복수 링크는 규범 (A) "정체성 핵심부가 분할된 국가"만: 일리리아 왕국(스코드라/리존)·
 *   에페이로스 왕국·에페이로스 동맹(포이니케/암브라키아)·베네치아령 알바니아(두러스/코토르).
 * - 나머지는 전부 AL 단독. 오스만 제국·동로마 제국·세르비아 제국·베네치아 공화국·이탈리아 왕국
 *   등 "타민족 본향을 오래 병합한 제국"에 AL을 붙이는 안은 규범 (B)로 전량 기각했다
 *   (승인하면 BG·GR·RO·ME가 오스만에 미연결인 기존 판례가 무너진다).
 *
 * 기각한 별도 행 후보
 * - 로마 속주(일리리쿰·에피루스 노바/베투스·프라이발리타나): 코퍼스에 속주 행 선례 0건.
 * - 오스만령 알바니아(1479~1912)·알바니아 산자크: 오스만 속주는 행으로 만들지 않는 관행
 *   (BG·RO·ME·GR 어느 배치도 자국 오스만 지배기 행이 없다). 시간축은
 *   "레저 동맹→오스만 제국" CONQUEST와 "오스만 제국→알바니아 임시 정부" INDEPENDENCE로 이어진다.
 * - 야니나 파샬릭(알리 파샤)·슈코더르 파샬릭(부샤티): 조약 근거 자치 지위가 없는 지방 반란.
 *   동루멜리아·크레타국이 행인 것은 조약으로 창설된 자치체였기 때문이다.
 * - 무자카·아리아니티·두카지니·그로파·제네비시 영주국 개별 행: 항구적 수도·독자 조약 주체성이
 *   약해 "알바니아 공국 (중세)"·"레저 동맹"·"카스트리오티 공국" 세 행이 흡수.
 * - 아르타 전제군주국(스파타 가문): 선재 행 "에페이로스 전제군주국"(1205~1479)과 이중 계상.
 * - 중앙 알바니아(에사드 파샤)·코르처 자치공화국·미르디타 공화국·북에피로스 자치공화국:
 *   점령군 행정 또는 외세 지원 단명 분리체. 북에피로스에 GR을 붙이면 규범 (B) 정면 위배.
 * - 1914~1920 다국 분할 점령 PERIOD 행: "연합군 점령하 독일" 선례는 국가기구 소멸 + 단일
 *   점령 관리기구가 요건인데, 알바니아는 법적 연속성이 유지되고 점령 주체가 5개국이다.
 * - 알바니아 민주정부(1944-11~1946-01): 14개월 임시정부. 유고 DFY 미분할 판례로 갭 단순화.
 * - 인민공화국(1946~1976)/사회주의 인민공화국(1976~1991) 2행 분할: 집권 정당·최고지도자·정체가
 *   연속인 개칭이라 SFRY 단일 행 판례를 적용해 하나로 통합.
 *
 * ⚠️ 훗날 오스트리아 제국의 일리리아 왕국(1816~1849)을 등록한다면 반드시
 *    "일리리아 왕국 (오스트리아)"로 명명할 것 — 시드가 name 기반 findFirst로 행을 찾으므로
 *    무한정어로 들어오면 아래 고대 행에 링크·계승이 오배선된다.
 */
const ENTRIES: HistoricalCountryEntry[] = [
  // ── 고대 ──────────────────────────────────────────────────────────
  {
    // 바르딜리스·타울란티오이·아르디아이 3왕조를 단일 행으로 통합(마케도니아 왕국 단일행 판례)
    name: '일리리아 왕국',
    enName: 'Illyrian Kingdom',
    nameOrigin:
      "'일리리아'는 그리스인이 아드리아해 동안 주민을 부르던 타칭으로, " +
      '카드모스와 하르모니아의 아들 일리리오스(Ἰλλυριός) 전설에서 왔다는 어원 설명이 고대부터 전한다. ' +
      '왕도 스코드라(Scodra)는 현 알바니아 슈코더르, 또 하나의 왕도 리존(Rhizon)은 현 몬테네그로 리산이다.',
    description:
      '기원전 5~4세기 아드리아해 동안의 일리리아 부족들이 왕권을 중심으로 결집하면서 형성된 고대 국가로, ' +
      '기원전 4세기 전반 바르딜리스 왕 대에 마케도니아를 압박할 만큼 성장했다. ' +
      '다만 바르딜리스기의 왕국 중심은 다르다니아·다사레티아(리크니도스 방면)로 보는 설이 유력하며, ' +
      '리존과 스코드라를 왕도로 삼은 것은 기원전 3세기 아르디아이 왕조기부터다. ' +
      '아그론 왕과 그의 아내 테우타 여왕 시대에 전성기를 맞아 네레트바강에서 에페이로스 경계에 이르는 해상 패권을 쥐었으나, ' +
      '일리리아 선단의 약탈을 문제 삼은 로마와 세 차례 전쟁을 치렀고 기원전 228년 강화로 배상금·조공과 항행 제한을 받아들였다. ' +
      '마지막 왕 겐티우스가 마케도니아의 페르세우스와 손잡았다가 기원전 168년 아니키우스 갈루스에게 스코드라에서 항복하면서 왕국은 소멸했고, ' +
      '리비우스에 따르면 로마는 옛 왕령을 세 구역으로 나누어 간접 지배한 뒤 공화정 말에 일리리쿰 속주로 편제했다. ' +
      '알바니아와 몬테네그로 양쪽에서 자국 고대사의 원형으로 여겨진다.',
    startEra: 'BC', startYear: 400,
    endEra: 'BC', endYear: 168,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.0667, longitude: 19.5167,
    // AL=최후·최대 왕도 스코드라(수도 소재=최강의 정주핵 증거, 두클랴 스카다르 판례)
    // ME=아그론·테우타기 왕실 거점 리존(현 리산). 두 왕도가 현 국경으로 갈라진 규범 (A) 사안.
    // HR·BA·MK·RS는 전성기 팽창 주변부라 규범 (B)로 기각.
    linkToIsoCodes: ['AL', 'ME'],
  },
  {
    name: '에페이로스 왕국',
    enName: 'Kingdom of Epirus',
    nameOrigin:
      '그리스어 ἤπειρος(에페이로스)는 "뭍·본토"라는 뜻으로, ' +
      '이오니아 제도에서 바라본 맞은편 육지를 가리키던 말이 그대로 지역명이 되었다. ' +
      '왕가 아이아키다이(Αἰακίδαι)는 아킬레우스의 조부 아이아코스의 후손을 자처한 데서 온 이름이다.',
    description:
      '에페이로스는 북서부의 카오니아인, 중부의 몰로시아인, 남부의 테스프로티아인 세 부족 집단으로 나뉘어 있던 지역으로, ' +
      '몰로시아의 아이아키다이 왕가가 이들을 하나로 묶으면서 기원전 330년 무렵 단일 왕국으로 성립했다. ' +
      '알렉산드로스 대왕의 어머니 올림피아스를 배출한 이 왕가는 기원전 3세기 초 피로스 왕 대에 전성기를 맞아 ' +
      '이탈리아와 시칠리아로 원정해 로마군을 두 차례 격파했으나, 막대한 희생을 치러 "피로스의 승리"라는 말을 남겼다. ' +
      '왕도는 몰로시아의 파사론에서 기원전 295년 암브라키아(현 그리스 아르타)로 옮겨졌고, ' +
      '카오니아의 포이니케·부트린트(현 알바니아 남부)가 왕국의 또 다른 중심축이었다. ' +
      '기원전 231년 왕가의 마지막 인물 데이다메이아가 살해되어 아이아키다이 혈통이 끊기자 ' +
      '왕정이 무너지고 연방 공화정인 에페이로스 동맹으로 대체되었다.',
    startEra: 'BC', startYear: 330,
    endEra: 'BC', endYear: 231,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    // 창건 왕도 파사론(이오안니나 인근) — 선재 행 "에페이로스 전제군주국"(아르타)과 핀 중복 회피
    latitude: 39.72, longitude: 20.78,
    // GR=창건 왕가 몰로시아의 본거·왕도 파사론/암브라키아.
    // AL=카오니아는 정복 병합지가 아니라 왕국을 구성한 창건 3부족의 하나이고 그 중심 도시
    //    포이니케·부트린트·온케스모스가 현 알바니아 남부 — 규범 (A) + "창건기 원년 강역".
    linkToIsoCodes: ['GR', 'AL'],
  },
  {
    // 왕정→연방 공화정 체제전환이라 별도 행(아카이아 동맹 CONFEDERATION+STATE 판례 동형)
    name: '에페이로스 동맹',
    enName: 'Epirote League',
    description:
      '기원전 231년 아이아키다이 왕가가 단절되자 에페이로스의 세 부족 집단은 왕정을 폐하고 코이논(연방)을 세워, ' +
      '각 부족의 자치를 보장하되 국방·외교·주화를 공동 관리하는 시네드리온과 선출직 장군을 둔 공화정으로 전환했다. ' +
      '연맹의 수도는 처음 암브라키아였다가 기원전 224년경 카오니아의 포이니케(현 알바니아 피니크)로 옮겨졌고, ' +
      '포이니케는 기원전 205년 제1차 마케도니아 전쟁을 매듭지은 포이니케 조약이 체결된 곳이기도 하다. ' +
      '아이톨리아 동맹·마케도니아·일리리아·로마 사이에 낀 연맹은 제3차 마케도니아 전쟁에서 ' +
      '몰로시아가 페르세우스 편에, 카오니아·테스프로티아가 로마 편에 서면서 분열했다. ' +
      '기원전 167년 로마 장군 아이밀리우스 파울루스가 몰로시아의 70개 취락을 파괴하고 15만 명을 노예로 팔면서 ' +
      '연맹은 붕괴해 로마의 직접 통제 아래 들어갔고, 기원전 146년 마케도니아 속주 설치와 함께 편입되었다. ' +
      '이후 이 지역은 로마의 에피루스 노바·에피루스 베투스로 재편되어 오늘날 알바니아 남부와 그리스 이피로스로 나뉘어 계승되었다.',
    startEra: 'BC', startYear: 231,
    endEra: 'BC', endYear: 167,
    stateType: HistoricalStateType.CONFEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    // 존속기 대부분의 수도 포이니케(현 피니크)
    latitude: 39.9086, longitude: 20.0503,
    // AL=BC224경~167 수도 포이니케. GR=초기 수도 암브라키아·연방 성소 도도나·몰로시아 인구축.
    linkToIsoCodes: ['AL', 'GR'],
  },

  // ── 중세 ──────────────────────────────────────────────────────────
  {
    // 종료 1255는 ko-wiki(골렘까지 포함) 기준 — en-wiki는 프로고니 단절 1215/16 또는 병합 1256/57
    name: '아르바논 공국',
    enName: 'Principality of Arbanon',
    nameOrigin:
      '그리스어 사료의 아르바논(Ἄρβανον), 라틴어 아르바눔(Arbanum)에서 온 지역명으로 ' +
      '알바니아어로는 아르버르(Arbër)라 불렀다. ' +
      "오늘날 유럽어의 국명 '알바니아'와 알바니아인의 옛 자칭 아르버르가 모두 이 말에서 갈라져 나왔다.",
    description:
      '1190년경 크루여의 아르콘 프로곤이 동로마의 지배가 흔들리는 틈을 타 마트강과 슈쿰빈강 사이 산악 지대에 세운 공국으로, ' +
      '기록으로 확인되는 최초의 알바니아인 국가로 평가된다. ' +
      '1204년 제4차 십자군의 콘스탄티노폴리스 함락으로 동로마가 무너지자 프로곤의 아들 그진과 데메트리우스 대에 ' +
      '사실상 완전한 독립을 누렸고, 데메트리우스는 교황·라구사와 직접 조약을 맺을 만큼 자율적이었다. ' +
      '1216년 프로고니 가문의 대가 끊긴 뒤에는 그레고리 카모나스와 골렘이 ' +
      '에페이로스 전제군주국·불가리아 제2제국·니케아 사이에서 종주를 갈아타며 나라를 이었다. ' +
      '1255년경 니케아가 이 소국을 병합하고 이어 동로마식 민정·군정 행정을 이식하면서 소멸했으며, 마지막 군주 골렘도 기록에서 사라졌다. ' +
      '수도 크루여는 훗날 스컨데르베우의 거점이 되어 알바니아 저항의 상징으로 이어졌다.',
    startEra: 'AD', startYear: 1190,
    endEra: 'AD', endYear: 1255,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.5089, longitude: 19.7928,
    // AL 단독 — 데바르·오흐리드 방면의 간헐적 진출은 규범 (B)라 MK 기각
    linkToIsoCodes: ['AL'],
  },
  {
    // 14세기 영주국 난립기를 대표하는 1행. 무한정 '알바니아 공국'은 1914~1925년 행 몫
    name: '알바니아 공국 (중세)',
    enName: 'Principality of Albania (Medieval)',
    nameOrigin:
      "동시대 라틴어 사료는 통치자를 '알바니아의 군주(princeps Albaniae)'로 불렀고, " +
      '지배 가문을 따 토피아 공국이라고도 한다. ' +
      "1914년 성립한 근대 알바니아 공국과 구별하기 위해 '(중세)' 한정어를 붙였다.",
    description:
      '세르비아 제국이 와해되고 앙주 세력이 물러나던 14세기 후반, 토피아 가문의 카를 토피아가 ' +
      '1359년 아켈로오스 전투를 전후해 부상하며 마트강과 슈쿰빈강 사이 중부 알바니아를 장악해 세운 공국이다. ' +
      '1368년 앙주령 두러스를 빼앗아 알바니아 왕국을 사실상 끝냈고, ' +
      '1376년 루이 드 에브뢰에게 잠시 빼앗겼다가 1383년 최종 탈환해 전성기를 이루었다. ' +
      '같은 시기 알바니아 각지에는 발샤·무자카·아리아니티·두카지니·그로파·제네비시 등 영주 가문이 난립했으며, ' +
      '토피아 공국은 그중 두러스와 크루여를 함께 쥔 최대 세력이었다. ' +
      '1392년 게르지 토피아가 오스만의 압박 속에 두러스를 베네치아에 넘기면서 위축되었고, ' +
      '니케타 토피아가 베네치아의 종주권 아래 크루여 일대를 지키다 1415년 오스만에 함락되어 알바니아 산자크로 편입되며 소멸했다. ' +
      '앙주의 왕관도 슬라브의 지배도 아닌 알바니아인 자신의 지배권이 처음으로 해안 대도시까지 미친 시기로 평가된다.',
    startEra: 'AD', startYear: 1359,
    endEra: 'AD', endYear: 1415,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.3231, longitude: 19.4414,
    linkToIsoCodes: ['AL'],
  },
  {
    // 이 행이 없으면 1415~1444년 29년간 알바니아측 정치체가 0개가 된다(적대검증 지적)
    name: '카스트리오티 공국',
    enName: 'Principality of Kastrioti',
    description:
      '14세기 말 마트강 상류와 디버르 일대에서 카스트리오티 가문이 세운 공국으로, ' +
      '팔 카스트리오티에 이어 죤 카스트리오티가 이슴 방면에서 프리즈렌 경계에 이르는 영역을 다스렸다. ' +
      '1413년 베네치아 시민권과 라구사와의 교역 특권을 얻고 1422년 베네치아와 통상 교섭을 벌이는 등 자기 이름으로 대외 관계를 맺었으나, ' +
      '1417년 이후 오스만의 압박을 받아 아들들을 인질로 보내고 봉신이 되었다. ' +
      '막내아들 게르지(스컨데르베우)는 오스만 궁정에서 자라 지방관을 지내다 1443년 니시 전투에서 이탈해 크루여를 되찾았다. ' +
      '이듬해 레저 회맹으로 알바니아 영주들을 규합하면서 공국은 동맹의 중핵으로 흡수되었고, ' +
      '알바니아 영주국 난립기와 스컨데르베우 항전기를 잇는 고리를 이룬다.',
    startEra: 'AD', startYear: 1389,
    endEra: 'AD', endYear: 1444,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    // 가문 영지의 중심인 마트 계곡(현 부렐 일대)
    latitude: 41.6103, longitude: 20.0089,
    // 프리즈렌 방면 진출은 변경 접촉에 그쳐 XK 근거가 되지 않는다
    linkToIsoCodes: ['AL'],
  },
  {
    // 종료는 1479년 슈코더르가 아니라 1478-06 크루여 함락 — 슈코더르는 베네치아령이라
    // "베네치아령 알바니아" 행 몫(이중 계상 회피). 공식 해산 시점은 사료상 불명.
    name: '레저 동맹',
    enName: 'League of Lezhë',
    nameOrigin:
      '알바니아어 리자 에 레저스(Lidhja e Lezhës), 곧 "레저의 동맹"이라는 뜻으로 ' +
      '1444년 창립 회맹이 열린 도시 레저에서 따왔다.',
    description:
      '1443년 니시 전투에서 오스만군을 이탈해 크루여를 되찾은 게르지 카스트리오티(스컨데르베우)가, ' +
      '1444년 3월 2일 베네치아령 레저에 알바니아 귀족들을 소집해 결성한 군사·외교 동맹이다. ' +
      '카스트리오티·아리아니티·두카지니·무자카·토피아·스파니·자하리아 가문과 제타의 발샤·츠르노예비치가 참여했고, ' +
      '공동 금고와 병력 분담을 갖춘 체제로 오스만의 거듭된 원정을 물리쳤다. ' +
      '1450년 아리아니티가 이탈한 뒤로는 동맹 기구가 처음 구상대로 작동하지 못하고 사실상 카스트리오티 중심의 항전 체제로 축소되었으며, ' +
      '1451년 가에타 조약으로 나폴리의 명목 종주권을 받아들여 교황·나폴리·베네치아의 지원을 끌어냈다. ' +
      '1468년 스컨데르베우가 병사한 뒤에도 항전이 이어졌으나 1478년 6월 크루여가 함락되고 레저도 곧 넘어가면서 소멸했고, ' +
      '뒤이은 대규모 이주로 이탈리아 남부에 아르버레시 공동체가 형성되었다. ' +
      '오늘날 알바니아에서는 여러 영주국을 처음으로 하나로 묶어낸 항전의 상징으로 기려진다.',
    startEra: 'AD', startYear: 1444, startMonth: 3,
    endEra: 'AD', endYear: 1478, endMonth: 6,
    stateType: HistoricalStateType.CONFEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    // 회맹지 레저 — 거점 크루여는 아르바논 공국 핀과 겹쳐 회피
    latitude: 41.7836, longitude: 19.6437,
    // 제타의 츠르노예비치·발샤 참여는 정체성 핵심부 분할(규범 A)이 아니라 동맹 가담이므로
    // ME는 링크가 아니라 소속(레저 동맹 ← 제타 공국 CONFEDERATION_MEMBER)으로 표현
    linkToIsoCodes: ['AL'],
  },
  {
    // stateType=OTHER + entityKind=STATE는 행정구 성격 행의 코퍼스 표준(일리리아 주·동루멜리아·크레타국).
    // 시작 1392는 두러스 양도 기준(명칭 성립을 1420 코토르 귀속으로 보는 이설 있음).
    // ME 시드가 같은 이름 행을 따로 만들지 않도록 소유는 알바니아 시드.
    name: '베네치아령 알바니아',
    enName: 'Venetian Albania',
    nameOrigin:
      '"알바니아 베네타(Albania Veneta)"는 "베네치아령 알바니아"라는 뜻으로, ' +
      '중세 베네치아가 코토르 만에서 두러스에 이르는 아드리아 남동안 전체를 "알바니아"로 부르던 관행에서 왔다. ' +
      '알바니아 쪽 영토를 모두 잃은 1571년 이후에도 명칭은 그대로 유지되어, 오늘날 몬테네그로 연안을 가리키는 역사 용어로 남았다.',
    description:
      '1392년 게르지 토피아가 두러스를 넘긴 것을 시작으로 베네치아 공화국이 아드리아해 동안 남부에 확보한 속령을 통칭한 이름이다. ' +
      '1420년 코토르가 자진 귀속하면서 지배가 굳어졌고, 전성기에는 라구사 공화국 남쪽 경계에서 ' +
      '코토르·바르·울친·슈코더르·레저를 거쳐 두러스까지 이어졌으나 바다에서 멀리 내륙으로 들어가지는 못했다. ' +
      '1479년 슈코더르, 1501년 두러스, 1571년 바르·울친이 차례로 오스만에 넘어가면서 알바니아 쪽 영토를 모두 잃었고, ' +
      '1573년 이후로는 부드바 부근을 남쪽 경계로 하는 코토르 만 일대만 남아 총독(프로베디토레)이 코토르에서 다스렸다. ' +
      '1797년 캄포포르미오 조약으로 베네치아 공화국이 소멸하며 합스부르크에 넘어갔고, 이후 프랑스 지배를 거쳐 나폴레옹의 일리리아 주에 편입되었다. ' +
      '해안은 베네치아, 내륙 산악은 오스만이라는 이중 구도가 알바니아 북부와 몬테네그로 연안에 가톨릭·해양 문화의 층위를 남겼다.',
    startEra: 'AD', startYear: 1392,
    endEra: 'AD', endYear: 1797,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.4247, longitude: 18.7712,
    // 규범 (C) 종속·분리 영토 별도 행 — 본국 베네치아 공화국은 IT 단독을 유지하고 현지 링크는 이 행이 진다.
    // AL+ME는 국호가 가리키는 알바니아(두러스 1392~1501·슈코더르 1396~1479·레저)와
    // 존속 후반 226년의 행정 수부 코토르 만이 현 국경으로 갈라진 규범 (A) 사안.
    linkToIsoCodes: ['AL', 'ME'],
  },

  // ── 독립과 전간기 ─────────────────────────────────────────────────
  {
    // 국체가 미정인 과도 정부라 stateType=OTHER, 독립 선포 주체이므로 entityKind=STATE
    name: '알바니아 임시 정부',
    enName: 'Provisional Government of Albania',
    nameOrigin:
      "알바니아인의 자칭 국명은 'Shqipëria'(슈치퍼리아)로, " +
      '"알아듣게 말하다"라는 뜻의 shqip에서 왔다는 설과 "독수리의 땅"이라는 민간어원이 병존한다. ' +
      "대외 명칭 'Albania'는 프톨레마이오스가 기록한 부족 알바노이(Albanoi)와 그 도시 알바노폴리스에서 유래했다.",
    description:
      '1912년 제1차 발칸 전쟁으로 오스만 제국의 유럽 영토가 무너지자, 이스마일 케말리를 비롯한 각 지역 대표들이 ' +
      '11월 28일 블로러에서 알바니아의 독립을 선포하고 12월 4일 임시정부를 구성했다. ' +
      '1913년 5월 30일 런던 조약과 7월 29일 열강 대사회의 결정으로 알바니아는 열강 보호 아래의 자치 공국이 되기로 확정되었고, ' +
      '같은 해 국경획정위원회 결정으로 코소보가 국경 밖에 남았으며 12월 17일 피렌체 의정서가 남부 국경을 확정하면서 차메리아도 밖에 남았다. ' +
      '1913년 10월 블로러에 국제감독위원회가 설치되어 행정권을 넘겨받았고, 1914년 1월 22일 케말리가 사임하면서 임시정부는 해산했다. ' +
      '실효 지배는 블로러 일대에 그쳤고 중부에는 에사드 파샤 토프타니의 경쟁 정권이 병존했으나, ' +
      '11월 28일 독립 선언은 오늘날 알바니아의 건국 기념일로 남아 있다.',
    startEra: 'AD', startYear: 1912, startMonth: 11,
    endEra: 'AD', endYear: 1914, endMonth: 2,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 40.4661, longitude: 19.4897,
    // 코소보·차메리아는 주장에 그친 채 국경 밖으로 확정된 미실효 영토라 규범 (B)로 배제
    linkToIsoCodes: ['AL'],
  },
  {
    // 1914~1920 다국 분할 점령기는 별도 PERIOD 행으로 쪼개지 않는다 —
    // 국제감독위원회→루슈녀 섭정으로 법적 연속성이 유지되었고 점령 주체가 5개국이라 단일 실체가 없다
    name: '알바니아 공국',
    enName: 'Principality of Albania',
    description:
      '런던 대사회의는 알바니아를 열강 보호 아래 두는 세습 공국으로 정하고, ' +
      '1914년 2월 21일 알바니아 대표단이 독일 귀족 비트의 빌헬름을 공(公)으로 추대했다. ' +
      '빌헬름은 3월 7일 임시 수도 두러스에 상륙했으나 중부의 농민 반란과 남부의 북에피로스 분리운동에 부딪혀 반년 만인 9월 3일 나라를 떠났다. ' +
      '제1차 세계대전 동안 이탈리아·오스트리아-헝가리·프랑스·세르비아·그리스 군이 국토를 분할 점령했고, ' +
      '1917년 6월 이탈리아는 지로카스터르에서 자국 보호 아래의 알바니아 독립을 일방 선포했다. ' +
      '1920년 1~2월 루슈녀 회의가 열강의 분할안을 거부하고 4인 섭정평의회를 세워 수도를 티라나로 옮기면서 국가가 재건되었고, ' +
      '블로러 전쟁으로 이탈리아군을 물러나게 한 뒤 그해 12월 국제연맹에 가입해 독립을 확립했다. ' +
      '1924년 6월 혁명과 12월 아흐메트 조구의 무력 복귀를 거쳐 1925년 1월 공화정이 선포되면서 공국은 소멸했다.',
    startEra: 'AD', startYear: 1914, startMonth: 2,
    endEra: 'AD', endYear: 1925, endMonth: 1,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.3231, longitude: 19.4414,
    // 1914년 북에피로스 자치정권은 코르푸 의정서로 몇 달 만에 소멸한 미실효 분리체라 GR 근거가 못 된다
    linkToIsoCodes: ['AL'],
  },
  {
    // 현존국 행 '알바니아 공화국'과의 충돌을 피해 '그리스 제1공화국' 서수 판례 채택
    // (ko-wiki 표제어는 '알바니아 공화국 (1925년~1928년)')
    name: '알바니아 제1공화국',
    enName: 'First Albanian Republic',
    description:
      '1924년 12월 유고슬라비아의 지원을 받아 티라나를 되찾은 아흐메트 조구는 ' +
      '1925년 1월 21일 제헌의회를 통해 공화국(Republika Shqiptare)을 선포하고, 1월 31일 초대 대통령으로 선출되어 2월 1일 취임했다. ' +
      '1925년 3월 헌법은 대통령이 국가원수와 정부수반을 겸하고 상원 의원 3분의 1을 지명하도록 하여 사실상 1인 지배를 제도화했다. ' +
      '재정난을 메우려 이탈리아 자본의 알바니아 국립은행과 SVEA 차관을 받아들였고, ' +
      '1926년 11월 제1차·1927년 11월 제2차 티라나 조약으로 방위동맹을 맺으면서 이탈리아 영향권에 편입되었다. ' +
      '조구는 대통령직으로는 왕조적 정통성과 대외적 격을 얻을 수 없다고 보아 1928년 9월 1일 제헌의회를 통해 스스로 왕위에 올랐고, ' +
      '공화국은 3년 7개월 만에 왕국으로 대체되었다. ' +
      '알바니아 역사상 최초의 공화정 실험이었으나 실질은 조구 개인의 권력 공고화 단계로 평가된다.',
    startEra: 'AD', startYear: 1925, startMonth: 1,
    endEra: 'AD', endYear: 1928, endMonth: 9,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.3275, longitude: 19.8189,
    linkToIsoCodes: ['AL'],
  },
  {
    // 선재 행 '알바니아 왕국'(1272~1368)과의 동명 충돌을 '세르비아 왕국 (근대)' 판례대로 해소.
    // enName도 'Kingdom of Albania' 선점을 피해 en-wiki 표제어를 하이픈 정규화.
    name: '알바니아 왕국 (근대)',
    enName: 'Albanian Kingdom (1928-1939)',
    nameOrigin:
      "공식 국호는 'Mbretëria Shqiptare'였고, 국왕 칭호가 '알바니아의 왕'이 아니라 " +
      "'알바니아인의 왕(Mbret i Shqiptarëve)'으로 정해진 것은 국경 밖 코소보·차메리아 알바니아인까지 " +
      '아우르려는 민족통일주의 함의를 담은 것으로 유고슬라비아·그리스의 항의를 불렀다.',
    description:
      "1928년 9월 1일 제헌의회가 알바니아를 세습 왕국으로 선포하고 대통령 아흐메트 조구가 '알바니아인의 왕 조구 1세'로 즉위하면서 성립했다. " +
      '형식은 입헌군주정이었으나 왕이 내각과 의회를 장악한 개인 지배 체제였고, ' +
      '1929년 나폴레옹 법전을 본뜬 민법전 제정과 샤리아 법정 폐지, 부족법(카눈) 억제, 토지개혁 시도 등 세속화·중앙집권 개혁이 추진되었다. ' +
      '재정과 군을 이탈리아 차관·군사고문에 의존한 탓에 1934년 조구가 관계 재조정을 시도하자 이탈리아 함대가 두러스에 나타나 압박했고, ' +
      '상륙은 거부되었으나 지원 중단이 부른 재정난 끝에 1935~1936년 새 차관과 양보를 받아들이면서 종속이 깊어졌다. ' +
      '1939년 4월 7일 이탈리아군이 침공해 조구 1세가 그리스로 망명했고, ' +
      '4월 12일 제헌의회가 이탈리아 국왕 비토리오 에마누엘레 3세를 왕으로 추대하면서 왕국은 동군연합 형태로 이탈리아에 종속되었다. ' +
      '조구 왕정은 알바니아 최초의 근대적 법전과 상비 관료제를 남겼으나, 이탈리아 자본 의존이 그대로 1939년 병합의 통로가 되었다는 평가를 받는다.',
    startEra: 'AD', startYear: 1928, startMonth: 9,
    endEra: 'AD', endYear: 1939, endMonth: 4,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.3275, longitude: 19.8189,
    // '알바니아인의 왕' 칭호의 민족통일주의 함의는 명목 주장일 뿐 실효 지배가 아니라 XK·GR 배제
    linkToIsoCodes: ['AL'],
  },

  // ── 2차 대전 부역 정권 ────────────────────────────────────────────
  {
    // stateType=KINGDOM은 '크로아티아 왕국 (헝가리 동군연합)' 판례와 동형 —
    // 동군연합은 stateType이 아니라 이름·소속으로 표현. entityKind=REGIME는 비시 프랑스·그리스국 패턴.
    name: '알바니아 왕국 (이탈리아 보호령)',
    enName: 'Albanian Kingdom (Italian Protectorate)',
    nameOrigin:
      "공식 국호는 'Mbretëria e Shqipërisë'였고 이탈리아 측 문서에서는 'Regno d'Albania'로 불렸다. " +
      "한국어권에서는 '이탈리아령 알바니아'로도 옮기나, " +
      '본 행은 1272년 중세 알바니아 왕국 및 1928년 조구 왕국과의 동명 충돌을 피해 괄호 한정어를 붙였다.',
    description:
      '1939년 4월 7일 이탈리아군이 두러스·블로러 등 항구에 상륙해 조구 1세를 국외로 몰아내면서 성립한 파시스트 이탈리아의 괴뢰 왕국이다. ' +
      '4월 12일 티라나의 제헌의회가 이탈리아 국왕 비토리오 에마누엘레 3세에게 왕관을 바쳐 두 왕국은 동군연합이 되었고, ' +
      '실권은 국왕을 대리한 이탈리아인 총독(초대 프란체스코 자코모니)과 알바니아 파시스트당이 쥐었다. ' +
      '1940년 이곳을 발판으로 그리스 침공이 개시되었고, ' +
      "1941년 유고슬라비아 분할 뒤에는 코소보 대부분과 서마케도니아·몬테네그로 동부가 편입되어 이른바 '대알바니아'가 만들어졌다. " +
      '1943년 9월 8일 이탈리아가 연합국과 휴전하면서 보호령 체제는 무너졌고 독일군이 곧바로 진주했다. ' +
      '알바니아가 처음으로 코소보를 자국 행정에 통합했던 시기여서, 전후 알바니아 민족문제 담론에서 반복적으로 소환된다.',
    startEra: 'AD', startYear: 1939, startMonth: 4,
    endEra: 'AD', endYear: 1943, endMonth: 9,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 41.3275, longitude: 19.8189,
    // 동군연합은 군주 공유일 뿐 규범 (A)의 정체성 핵심부 분할이 아니라 IT는 소속(PROTECTORATE)으로 표현.
    // 코소보·서마케도니아·몬테네그로 동부는 3년짜리 획득 병합 영토라 규범 (B)로 XK·MK·RS·ME 전부 기각.
    linkToIsoCodes: ['AL'],
  },
  {
    // 왕위 공석이지만 국호·헌정 형식이 왕국이고 en-wiki도 'Regent constitutional monarchy'로
    // 분류하므로 KINGDOM 유지(OTHER는 정보 손실)
    name: '알바니아 왕국 (독일 점령기)',
    enName: 'Albanian Kingdom (German Occupation)',
    nameOrigin:
      "국호는 조구 왕국과 같은 'Mbretëria Shqiptare'(독일어 Albanisches Königreich)였고, " +
      '왕위는 공석인 채 섭정위원회가 국가원수를 대행했다. ' +
      "한국어권 표기 '독일 점령하 알바니아'가 흔하나 본 코퍼스는 동명 충돌 한정어 관례를 따랐다.",
    description:
      '1943년 9월 8일 이탈리아 항복 직후 독일군이 진주하면서 세워진 나치 독일의 위성 정권이다. ' +
      "독일은 알바니아를 '독립 중립국'으로 승인한다는 형식을 취해 왕위를 비운 채 " +
      '섭정위원회(의장 메흐디 프라셔리)와 정부·경찰·군대를 조직했고, 반공 민족주의 조직 발리 콤베타르의 일부 인사가 각료로 참여했다. ' +
      '코소보 대부분과 서마케도니아 등 이탈리아 시기에 받은 영역은 그대로 유지되었으나 ' +
      '실질 통치권은 독일 군정과 SS 스칸데르베그 사단 편성에 있었다. ' +
      '엔베르 호자가 이끄는 민족해방전선 빨치산의 공세에 밀려 독일군은 1944년 11월 29일 철수했고 정권도 함께 소멸했다. ' +
      '이 시기의 부역과 빨치산 내전의 기억은 전후 공산 정권이 정통성 서사와 대규모 숙청을 정당화하는 근거가 되었다.',
    startEra: 'AD', startYear: 1943, startMonth: 9,
    endEra: 'AD', endYear: 1944, endMonth: 11,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 41.3275, longitude: 19.8189,
    linkToIsoCodes: ['AL'],
  },

  // ── 사회주의기와 현대 ─────────────────────────────────────────────
  {
    // 1946~1976과 1976~1991을 단일 행으로 통합 — 집권 정당·최고지도자·정체가 연속이며
    // SFRY(1945~1992)가 두 차례 개칭을 단일 행으로 흡수한 판례와 동형
    name: '알바니아 사회주의 인민공화국',
    enName: "People's Socialist Republic of Albania",
    nameOrigin:
      "1946~1976년 국호는 '알바니아 인민공화국'(Republika Popullore e Shqipërisë), " +
      "1976~1991년은 'Republika Popullore Socialiste e Shqipërisë'였다. " +
      "한국어권에서 '알바니아 인민사회주의공화국'으로도 옮기나 한국어 위키백과 표제어는 '알바니아 사회주의 인민공화국'이다.",
    description:
      '1944년 11월 해방 뒤 권력을 장악한 엔베르 호자의 공산당(뒤의 알바니아 노동당)이 ' +
      "1946년 1월 11일 군주제 폐지와 함께 선포한 '알바니아 인민공화국'을 뿌리로 한다. " +
      "1976년 12월 28일 새 헌법이 국호를 '알바니아 사회주의 인민공화국'으로 바꾸면서 " +
      '무신론을 헌법에 명기하고 외채 도입을 금지하는 자립노선을 성문화했다. ' +
      '1948년 유고슬라비아, 1961년 소련, 1978년 중국과 차례로 결별해 유럽에서 가장 고립된 나라가 되었고, ' +
      '침공에 대비해 1983년까지 17만 3천여 기의 콘크리트 벙커를 세운 요새국가로 남았다. ' +
      '1985년 호자 사망 후 라미즈 알리아 체제에서 제한적 개방이 시작되었고, ' +
      "1990~91년 대중시위와 다당제 도입을 거쳐 1991년 4월 29일 '주요 헌법 규정' 법률이 사회주의 국호를 폐기하면서 막을 내렸다. " +
      '45년에 걸친 쇄국과 계획경제의 파탄은 오늘날 알바니아의 저발전과 대규모 해외 이민의 배경으로 꼽힌다.',
    startEra: 'AD', startYear: 1946, startMonth: 1,
    endEra: 'AD', endYear: 1991, endMonth: 4,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.3275, longitude: 19.8189,
    linkToIsoCodes: ['AL'],
  },
  {
    // 현대 국가 country 행 '알바니아'와의 동명 회피(루마니아 공화국·그리스 공화국 관례).
    // 시작 1991-04는 국호·정체를 바꾼 헌법적 행위의 달. 현존국이라 end 3필드 전부 NULL.
    name: '알바니아 공화국',
    enName: 'Republic of Albania',
    nameOrigin:
      "정식 국호는 'Republika e Shqipërisë'. " +
      '자칭 국명 Shqipëri는 흔히 "독수리의 땅"(shqipe=독수리)으로 풀이되어 국기의 쌍두수리와 연결되지만, ' +
      '학계에서는 "또렷이 말하다"(shqipoj)에서 왔다는 설도 유력하다.',
    description:
      '1990년 12월 티라나 대학생 시위로 시작된 민주화 이행의 결과, ' +
      "1991년 4월 29일 인민의회가 '주요 헌법 규정'에 관한 법률을 채택해 사회주의 국호를 버리고 '알바니아 공화국'으로 개칭하면서 성립했다. " +
      '1992년 3월 22일 총선에서 민주당이 압승하고 살리 베리샤가 대통령이 되면서 노동당 계열의 집권이 완전히 끝났다. ' +
      '1997년 피라미드 금융 붕괴로 국가가 사실상 무정부 상태에 빠졌다가 다국적군(알바 작전) 개입으로 수습되었고, ' +
      '1998년 11월 국민투표로 현행 헌법을 확정했다. ' +
      '2009년 NATO에 가입했고 2014년 EU 후보국 지위를 얻었으며, 2022년 7월 19일 제1차 정부간회의로 가입 협상이 개시되었다. ' +
      '무슬림이 최다 종파이면서 종교보다 국민적 정체성이 앞서는 세속 공화국으로, ' +
      '코소보 문제와 알바니아계 디아스포라를 매개로 발칸 정치의 주요 행위자 가운데 하나다.',
    startEra: 'AD', startYear: 1991, startMonth: 4,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.3275, longitude: 19.8189,
    linkToIsoCodes: ['AL'],
  },
]

/**
 * 다른 시드가 소유한 HC에 현대 알바니아 연결만 보강(크로아티아·슬로베니아·몬테네그로 시드 패턴).
 * - 로마 공화국·로마 제국: 규범 (D) 로마 계열 liberal 예외이자 대칭성 복원. BC229 제1차 일리리아
 *   전쟁의 상륙지(아폴로니아·에피담노스=현 두러스)와 BC168 겐티우스의 왕도 스코드라, 이후
 *   에피루스 노바(주도 디라키움)·프라이발리타나(주도 스코드라) 두 속주의 주도가 모두 현 알바니아다.
 *   이미 ME가 승인된 마당에 AL만 빠지는 것이 비대칭. 소유자는 italy 시드라 그 파일은 건드리지 않는다.
 * - 알바니아 왕국(1272~1368): 2026-07-06 UI로 만들어진 선재 행이라 시드 소유자가 없고 현대국가
 *   링크가 0건이며 'AL 미래용' 목록에도 없어, 이 배치가 붙이지 않으면 영구 고아 행이 된다.
 *   앙주 종주를 이유로 IT를 붙이면 나폴리·시칠리아 링크 기각 논거와 자기모순이라 AL 단독
 *   (그 관계는 소속 UNION 2건으로 표현).
 *
 * ⚠️ 두클랴·제타 공국(montenegro 시드)·에페이로스 전제군주국(greece 시드)의 AL 링크는
 *    각 시드가 이미 'AL 미래용' 표기로 소유하고 있다. 여기에 중복 기입하지 말 것(소유권 분산 방지).
 */
const EXTRA_MODERN_LINKS: { hcName: string; isoCode: string }[] = [
  { hcName: '로마 공화국', isoCode: 'AL' },
  { hcName: '로마 제국', isoCode: 'AL' },
  { hcName: '알바니아 왕국', isoCode: 'AL' },
]

/**
 * 선재 행 백필 — 사용자가 UI로 만든 행의 NULL 필드만 채운다(아카이아 공국 선례).
 * description처럼 이미 값이 있는 필드는 절대 덮어쓰지 않는다.
 */
const PREEXISTING_BACKFILL: {
  name: string
  nameOrigin?: string
  latitude?: number
  longitude?: number
  startMonth?: number
}[] = [
  {
    // 앙주의 Regnum Albaniae. 1272-02-21 샤를 1세가 '알바니아 왕'을 칭한 달 + 거점 두러스 좌표
    name: '알바니아 왕국',
    nameOrigin:
      "라틴어 정식 국호는 레그눔 알바니아이(Regnum Albaniae)로, 앙주 가문이 현지 지역명 아르바논/아르버르의 라틴어형 '알바니아'를 그대로 국호로 삼았다. " +
      "유럽 문헌에서 '알바니아'가 한 나라의 이름으로 쓰인 첫 사례다.",
    latitude: 41.3231,
    longitude: 19.4414,
    startMonth: 2,
  },
]

export async function seedAlbaniaHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇦🇱 알바니아 관련 역사 국가 시딩 시작...')

  const isoToModernId = new Map<string, string>()
  const allIsoCodes = new Set([
    ...ENTRIES.flatMap((entry) => entry.linkToIsoCodes),
    ...EXTRA_MODERN_LINKS.map((extra) => extra.isoCode),
  ])
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

  // 선재 행의 NULL 필드만 가드 백필
  for (const backfill of PREEXISTING_BACKFILL) {
    const target = await prisma.historicalCountry.findFirst({
      where: { name: backfill.name },
    })
    if (!target) {
      console.warn(`  ⚠️  백필 대상 없음: ${backfill.name}`)
      continue
    }

    const data: {
      nameOrigin?: string
      latitude?: number
      longitude?: number
      startMonth?: number
    } = {}
    if (backfill.nameOrigin !== undefined && target.nameOrigin === null) {
      data.nameOrigin = backfill.nameOrigin
    }
    if (backfill.latitude !== undefined && target.latitude === null) {
      data.latitude = backfill.latitude
    }
    if (backfill.longitude !== undefined && target.longitude === null) {
      data.longitude = backfill.longitude
    }
    if (backfill.startMonth !== undefined && target.startMonth === null) {
      data.startMonth = backfill.startMonth
    }

    if (Object.keys(data).length > 0) {
      await prisma.historicalCountry.update({ where: { id: target.id }, data })
      console.log(`  🩹 ${backfill.name} 백필: ${Object.keys(data).join(', ')}`)
    }
  }

  // 타 시드 소유 HC → 현대 알바니아 연결 보강
  for (const extra of EXTRA_MODERN_LINKS) {
    const hc = await prisma.historicalCountry.findFirst({
      where: { name: extra.hcName },
    })
    const modernCountryId = isoToModernId.get(extra.isoCode)
    if (!hc || !modernCountryId) {
      if (!hc) console.warn(`  ⚠️  찾을 수 없음: ${extra.hcName}`)
      continue
    }
    const linkExists = await prisma.historicalCountryModernCountry.findFirst({
      where: { historicalCountryId: hc.id, modernCountryId },
    })
    if (!linkExists) {
      await prisma.historicalCountryModernCountry.create({
        data: { historicalCountryId: hc.id, modernCountryId },
      })
      console.log(`  🔗 ${extra.hcName} ← 현대 ${extra.isoCode} 연결`)
    }
  }

  console.log(`✅ 알바니아 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
