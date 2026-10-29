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

/*
 * 이집트 배치 — 파라오 시대부터 현행 공화국까지.
 *
 * 행 설계 규약(선례):
 *  · 파라오 시대는 이집트학의 표준 시대 구분(고·중·신왕국과 세 중간기)을 행으로 둔다. 같은 나일 국가의
 *    시대이지만 왕도·왕조·영역이 크게 달라 연대표에서 각각 불러 쓰이는 단위다. 분열기인 중간기는
 *    단일 국가가 아니므로 entityKind PERIOD(미케네 문명 판례).
 *  · 연대는 『옥스퍼드 고대 이집트사』(Shaw 2000)의 관례 연대. 초기 왕조·고왕국 연대는 ±100년 오차가 있다.
 *  · 고대·중세 속주기(아케메네스 총독령·로마/동로마 속주)는 별도 행을 두지 않고 계승 엣지로 잇는다
 *    (로마 속주를 별행으로 두지 않은 알바니아 판례). 1798~1801 프랑스 점령도 별행 없음(알바니아 점령기 기각 판례).
 *  · 예외: **오스만령 이집트(1517~1805)는 행을 둔다**(링크 규범 C — 종속 영토는 별도 행). 처음엔 속주기로 묶어
 *    엣지로만 이었으나, 오스만에 EG를 달지 않으니(규범 B) 현대 이집트 연표가 288년 비었다. 알바니아는 산자크·
 *    파샬릭으로 쪼개져 단일 단위가 없어 기각했지만, 이집트는 하나의 에얄레트로 자체 법전(1525 카눈나메)·군단·
 *    정액 공납을 지닌 특권주였다 — 스웨덴령 에스토니아·스페인 부왕령·동루멜리아와 같은 'X령 Y' 행.
 *  · 링크 규범 B: 메트로폴이 이웃을 병합·지배한 국가는 메트로폴 단독 링크 — 신왕국의 누비아·레반트,
 *    맘루크의 시리아, 아케메네스의 이집트는 링크하지 않는다. 동로마·오스만에도 EG를 달지 않는다
 *    (동로마 GR 승인은 '제국 주민 그 자체' 근거라 이집트에 확장되지 않는다).
 *  · 로마 공화국·로마 제국의 EG 링크는 italy 시드 계열이 이미 보유 — 이 시드에서 보강하지 않는다.
 */
const ENTRIES: HistoricalCountryEntry[] = [
  // ── 파라오 시대 ───────────────────────────────────────────────────
  {
    name: '이집트 초기 왕조',
    enName: 'Early Dynastic Egypt',
    nameOrigin:
      '"이집트"는 그리스어 "아이깁토스(Aígyptos)"에서 왔고, 이는 멤피스의 프타 신전 이름 "후트카프타(ḥwt-kꜣ-ptḥ, 프타의 혼의 집)"를 ' +
      '옮긴 말로 여겨진다. 이집트인 스스로는 나라를 "케메트(Kmt, 검은 땅)" — 범람이 남긴 비옥한 흑토 — 라 불렀다. ' +
      '"초기 왕조"는 마네토의 왕조 구분 가운데 제1·2왕조를 묶는 이집트학의 용어다.',
    description:
      '기원전 3150년경 상·하 이집트가 하나의 왕권 아래 통일되며 시작된 제1·2왕조 시대. 전승은 통일 군주를 메네스라 하고, ' +
      '나르메르 팔레트가 상이집트 왕이 하이집트를 굴복시키는 장면을 남겼다. 상·하 이집트의 경계인 멤피스가 왕도가 되었고, ' +
      '아비도스에 왕묘가 조성되었다. 상형문자 기록·관료제·이중 왕관(백관과 적관) 같은 파라오 국가의 기본 틀이 이때 갖춰졌다.',
    startEra: 'BC', startYear: 3150,
    endEra: 'BC', endYear: 2686,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 29.85, longitude: 31.25,
    linkToIsoCodes: ['EG'],
  },
  {
    name: '이집트 고왕국',
    enName: 'Old Kingdom of Egypt',
    nameOrigin:
      '19세기 이집트학이 왕권이 강했던 세 시기를 "고·중·신왕국"으로, 그 사이의 분열기를 "중간기"로 부르며 생긴 이름이다. ' +
      '피라미드가 집중적으로 지어져 "피라미드 시대"라고도 한다.',
    description:
      '제3~6왕조의 이집트(기원전 2686~2181년경). 제3왕조 조세르의 계단식 피라미드(건축가 임호테프)에서 시작해 ' +
      '제4왕조 스네프루·쿠푸·카프레·멘카우레가 기자의 대피라미드를 세운 중앙집권 왕정의 절정기다. ' +
      '왕도는 멤피스였고, 왕은 태양신 라의 아들로 숭배되었다. 제5·6왕조에 들어 지방 장관(노마르크)의 세습화와 ' +
      '페피 2세의 장기 재위 말기 혼란, 기후 건조화로 인한 기근이 겹치며 중앙 왕권이 무너졌다.',
    startEra: 'BC', startYear: 2686,
    endEra: 'BC', endYear: 2181,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 29.85, longitude: 31.25,
    linkToIsoCodes: ['EG'],
  },
  {
    name: '이집트 제1중간기',
    enName: 'First Intermediate Period of Egypt',
    nameOrigin: '고왕국과 중왕국 "사이(intermediate)"의 분열기라는 뜻의 이집트학 용어.',
    description:
      '고왕국 붕괴 뒤 기원전 2181~2055년경의 분열기(제7~11왕조 전반). 멤피스 왕권이 명목만 남은 가운데 ' +
      '북쪽의 헤라클레오폴리스 왕조(제9·10왕조)와 남쪽의 테베 왕조(제11왕조)가 대립했다. ' +
      '단일 국가가 아니라 여러 세력이 병존한 시대이므로 PERIOD로 둔다. ' +
      '테베의 멘투호테프 2세가 헤라클레오폴리스를 꺾고 재통일하면서 중왕국이 열렸다.',
    startEra: 'BC', startYear: 2181,
    endEra: 'BC', endYear: 2055,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.PERIOD,
    latitude: 29.08, longitude: 30.93,
    linkToIsoCodes: ['EG'],
  },
  {
    name: '이집트 중왕국',
    enName: 'Middle Kingdom of Egypt',
    nameOrigin: '고왕국·신왕국 사이의 두 번째 통일 왕정이라 "중왕국"이라 부른다.',
    description:
      '기원전 2055년경 멘투호테프 2세의 재통일로 시작된 제11왕조 후반~제12왕조(일부 연대표는 제13왕조까지). ' +
      '제12왕조의 아메넴헤트 1세는 왕도를 멤피스 남쪽 이티타위로 옮겼고, 세누스레트 3세는 지방 귀족의 권한을 줄이고 ' +
      '누비아로 남진해 제2폭포 일대에 요새선을 쌓았다. 파이윰 개간이 진행되었고, 『시누헤 이야기』 같은 ' +
      '중기 이집트어 고전 문학이 꽃피었다. 제13왕조에 왕권이 약해지자 동부 삼각주에 서아시아계 이주민 세력이 자라났다.',
    startEra: 'BC', startYear: 2055,
    endEra: 'BC', endYear: 1650,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 29.56, longitude: 31.22,
    linkToIsoCodes: ['EG'],
  },
  {
    name: '이집트 제2중간기',
    enName: 'Second Intermediate Period of Egypt',
    nameOrigin:
      '중왕국과 신왕국 사이의 분열기. 이 시기 북부를 지배한 "힉소스"는 이집트어 "헤카우 카수트(ḥqꜣw ḫꜣswt, 이방의 지배자들)"를 ' +
      '그리스어로 옮긴 말이다.',
    description:
      '기원전 1650~1550년경. 동부 삼각주의 아바리스를 도읍으로 한 서아시아계 힉소스(제15왕조)가 북부를 지배하고, ' +
      '테베의 제17왕조가 남부를, 누비아의 쿠시(케르마)가 그 남쪽을 차지한 삼분 시대다. ' +
      '힉소스는 말과 전차, 합성궁을 이집트에 들여왔다. 테베의 세케넨라·카모세가 힉소스와 전쟁을 벌였고, ' +
      '아흐모세 1세가 아바리스를 함락하고 힉소스를 가나안으로 몰아내며 재통일했다. 병존 세력의 시대이므로 PERIOD로 둔다.',
    startEra: 'BC', startYear: 1650,
    endEra: 'BC', endYear: 1550,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.PERIOD,
    latitude: 30.79, longitude: 31.82,
    linkToIsoCodes: ['EG'],
  },
  {
    name: '이집트 신왕국',
    enName: 'New Kingdom of Egypt',
    nameOrigin:
      '세 번째 통일 왕정. 레반트와 누비아에 걸친 대외 팽창 때문에 "이집트 제국"이라고도 불린다. ' +
      '왕을 가리키는 "파라오(pr-ꜥꜣ, 큰 집)"가 왕 개인의 호칭으로 쓰이기 시작한 것도 이 시대다.',
    description:
      '기원전 1550년 아흐모세 1세의 힉소스 축출로 시작된 제18~20왕조. 투트모세 3세가 메기도 전투로 레반트를 제압하고 ' +
      '누비아를 제4폭포까지 병합해 고대 이집트 최대 판도를 이루었다. 하트셉수트, 종교 개혁을 시도한 아크나톤(아마르나 시대), ' +
      '투탕카멘, 카데시 전투 뒤 히타이트와 최초의 성문 평화 조약을 맺은 람세스 2세가 이 시대의 파라오다. ' +
      '테베의 카르나크·룩소르 신전과 왕가의 계곡이 조성되었다. 제20왕조 말 "바다 민족"의 침입과 아문 신관단의 득세로 왕권이 갈라졌다. ' +
      '누비아·레반트는 병합 영토라 링크하지 않는다(규범 B).',
    startEra: 'BC', startYear: 1550,
    endEra: 'BC', endYear: 1069,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 25.70, longitude: 32.64,
    linkToIsoCodes: ['EG'],
  },
  {
    name: '이집트 제3중간기',
    enName: 'Third Intermediate Period of Egypt',
    nameOrigin: '신왕국과 말기 왕조 사이의 분열기라는 뜻의 이집트학 용어.',
    description:
      '기원전 1069~664년. 삼각주의 타니스 왕조(제21왕조)와 테베의 아문 대신관 정권이 나라를 나눠 가진 데서 시작해, ' +
      '리비아계 군사 엘리트의 왕조(제22~24왕조, 부바스티스·레온토폴리스·사이스)가 여럿 병존했다. ' +
      '기원전 744년경부터 누비아의 쿠시 왕들이 북진해 이집트 전역을 지배했고(제25왕조, 피예·타하르카), ' +
      '기원전 671~663년 아시리아의 에사르하돈·아슈르바니팔이 침공해 테베를 약탈했다. ' +
      '아시리아가 세운 사이스의 프삼티크 1세가 쿠시 세력을 몰아내고 재통일하며 끝났다. 병존 세력의 시대이므로 PERIOD로 둔다.',
    startEra: 'BC', startYear: 1069,
    endEra: 'BC', endYear: 664,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.PERIOD,
    latitude: 30.98, longitude: 31.88,
    linkToIsoCodes: ['EG'],
  },
  {
    name: '쿠시 왕국',
    enName: 'Kingdom of Kush',
    nameOrigin:
      '"쿠시(Kš)"는 이집트인이 제2폭포 이남 누비아를 부르던 이름으로, 히브리 성경의 "구스"와 같은 말이다. ' +
      '도읍에 따라 전기를 "나파타 시대", 후기를 "메로에 시대"로 나눈다.',
    description:
      '신왕국의 누비아 지배가 무너진 뒤 나일 중류(오늘날 수단)에서 자라난 왕국. 나파타의 게벨 바르칼 아문 신앙을 중심으로 ' +
      '이집트식 왕권을 받아들였고, 기원전 744년경 피예가 북진해 이집트 전역을 정복하며 제25왕조를 열었다. ' +
      '기원전 663년 아시리아에 밀려 이집트에서 물러난 뒤 기원전 3세기경 도읍을 메로에로 옮겨 철 생산과 ' +
      '독자 문자(메로에 문자)로 번영했다. 4세기 중반 악숨의 침공 무렵 소멸했다. ' +
      '정주핵은 나파타·메로에라 SD 단독 링크(이집트 지배 90년은 병합이라 EG 미링크 — 규범 B).',
    startEra: 'BC', startYear: 1070,
    endEra: 'AD', endYear: 350,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 18.53, longitude: 31.83,
    linkToIsoCodes: ['SD'],
  },
  {
    name: '이집트 사이스 왕조',
    enName: 'Saite Dynasty of Egypt',
    nameOrigin:
      '왕가의 본거지인 서부 삼각주의 도시 사이스(이집트어 Zꜣw)에서 딴 이름. 마네토 구분으로는 제26왕조이며, ' +
      '파라오 이집트가 외세 없이 마지막으로 장기 번영한 시대라 "사이스 르네상스"라고도 한다.',
    description:
      '기원전 664년 프삼티크 1세가 아시리아의 봉신으로 출발해 쿠시 세력을 몰아내고 재통일하며 연 왕조. ' +
      '고왕국 양식을 되살린 복고 예술, 그리스 용병과 나우크라티스 교역 거점 허용, 네코 2세의 나일-홍해 운하 공사와 ' +
      '페니키아 선원의 아프리카 일주 전승이 이 시대의 일이다. 기원전 525년 프삼티크 3세가 펠루시온 전투에서 ' +
      '페르시아의 캄비세스 2세에게 패하며 끝났다.',
    startEra: 'BC', startYear: 664,
    endEra: 'BC', endYear: 525,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 30.96, longitude: 30.77,
    linkToIsoCodes: ['EG'],
  },
  {
    name: '아케메네스 제국',
    enName: 'Achaemenid Empire',
    nameOrigin:
      '왕가의 시조로 전해지는 아카이메네스(고대 페르시아어 Haxāmaniš)에서 딴 이름. "페르시아 제국"이라고도 하며, ' +
      '파르스(페르시스) 지방에서 일어난 페르시아인의 나라라는 뜻이다.',
    description:
      '기원전 550년 키루스 2세가 메디아를 무너뜨리고 세운 제국. 리디아·신바빌로니아를 차례로 병합했고, ' +
      '캄비세스 2세가 기원전 525년 이집트를 정복했다(제27왕조). 다리우스 1세는 사트라프(총독) 제도와 왕의 길, ' +
      '표준 화폐를 정비해 인더스강에서 에게해까지 다스렸다. 이집트는 기원전 404년 아미르타이오스의 반란으로 이탈했다가 ' +
      '기원전 343년 아르타크세르크세스 3세가 재정복했다(제31왕조). 기원전 330년 알렉산드로스 3세에게 멸망했다. ' +
      '정주핵은 파르스(페르세폴리스·파사르가대)라 IR 단독 링크(규범 B). 이집트 배치가 이집트 정복자로서 소유한다.',
    startEra: 'BC', startYear: 550,
    endEra: 'BC', endYear: 330,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 29.93, longitude: 52.89,
    linkToIsoCodes: ['IR'],
  },
  {
    name: '이집트 말기 왕조',
    enName: 'Late Period of Egypt',
    nameOrigin:
      '이집트학의 "말기 왕조 시대(Late Period)"는 넓게는 제26~31왕조(기원전 664~332)를 가리키지만, ' +
      '이 행은 그 가운데 페르시아 지배 사이에 이집트인이 독립을 되찾은 제28~30왕조(기원전 404~343)만 담는다. ' +
      '제26왕조는 「이집트 사이스 왕조」, 제27·31왕조는 「아케메네스 제국」의 지배기다.',
    description:
      '기원전 404년 사이스의 아미르타이오스(제28왕조)가 페르시아에 반기를 들어 독립을 되찾은 뒤, ' +
      '멘데스의 제29왕조와 세벤니토스의 제30왕조가 이어진 마지막 토착 파라오 시대. ' +
      '제30왕조의 넥타네보 1·2세는 그리스 용병과 동맹에 기대 페르시아의 재침을 여러 차례 막고 대규모 신전 건축을 벌였다. ' +
      '기원전 343년 아르타크세르크세스 3세의 재정복으로 넥타네보 2세가 누비아로 달아나며, 토착 이집트인의 왕권은 이후 ' +
      '1952년 혁명까지 다시 서지 않았다.',
    startEra: 'BC', startYear: 404,
    endEra: 'BC', endYear: 343,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 30.97, longitude: 31.17,
    linkToIsoCodes: ['EG'],
  },
  {
    name: '프톨레마이오스 왕국',
    enName: 'Ptolemaic Kingdom',
    nameOrigin:
      '알렉산드로스의 장군이자 창건자인 프톨레마이오스 1세 소테르(Ptolemaios, "전사의")에서 딴 이름. ' +
      '역대 왕이 모두 프톨레마이오스를 칭해 "프톨레마이오스 왕조"라고도 한다.',
    description:
      '기원전 332년 알렉산드로스 3세의 이집트 정복 뒤 총독이 된 프톨레마이오스가 대왕 사후 기원전 305년 왕을 칭하며 세운 ' +
      '헬레니즘 왕국. 도읍 알렉산드리아에는 무세이온과 대도서관, 파로스 등대가 세워져 지중해 학문의 중심이 되었다. ' +
      '마케도니아계 왕가는 파라오로서 이집트 신전을 후원하면서도 그리스어로 통치했고, 로제타석의 3언어 칙령이 그 이중성을 보여준다. ' +
      '키레나이카·키프로스·코일레 시리아를 두고 셀레우코스 왕국과 여섯 차례 시리아 전쟁을 벌였다. ' +
      '기원전 31년 악티움 해전 패배 뒤 이듬해 8월 클레오파트라 7세가 자결하며 로마에 병합되었다.',
    startEra: 'BC', startYear: 305,
    endEra: 'BC', endYear: 30, endMonth: 8,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 31.20, longitude: 29.92,
    linkToIsoCodes: ['EG'],
  },

  // ── 이슬람 칼리파국 ───────────────────────────────────────────────
  {
    name: '라시둔 칼리파국',
    enName: 'Rashidun Caliphate',
    nameOrigin:
      '"라시둔(al-Rāshidūn)"은 아랍어로 "올바르게 인도된 자들"이라는 뜻으로, 무함마드 사후 선출된 ' +
      '아부 바크르·우마르·우스만·알리 네 칼리파를 수니파가 높여 부르는 말이다. ' +
      '"칼리파(khalīfa)"는 "(예언자의) 대리인·후계자"를 뜻한다.',
    description:
      '632년 무함마드 사후 메디나에서 아부 바크르가 칼리파로 추대되며 성립한 초기 이슬람 국가. ' +
      '우마르 시대에 야르무크 전투(636)로 동로마의 시리아를, 카디시야 전투로 사산 왕조의 이라크를 빼앗았고, ' +
      '아므르 이븐 알아스가 639~642년 이집트를 정복해 군영 도시 푸스타트(카이로의 전신)를 세웠다. ' +
      '우스만 암살 뒤 제1차 내전(피트나) 속에 알리가 661년 암살되며 끝났다. 도읍 메디나 기준 SA 단독 링크.',
    startEra: 'AD', startYear: 632, startMonth: 6,
    endEra: 'AD', endYear: 661, endMonth: 1,
    stateType: HistoricalStateType.CALIPHATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 24.47, longitude: 39.61,
    linkToIsoCodes: ['SA'],
  },
  {
    name: '우마이야 칼리파국',
    enName: 'Umayyad Caliphate',
    nameOrigin:
      '쿠라이시 부족 우마이야 가문(Banū Umayya)에서 딴 이름. 칼리파위를 처음으로 세습한 왕조다.',
    description:
      '661년 시리아 총독 무아위야 1세가 칼리파위를 차지하며 다마스쿠스를 도읍으로 연 세습 칼리파국. ' +
      '서쪽으로 북아프리카와 이베리아(711), 동쪽으로 트란스옥시아나와 인더스강까지 판도를 넓혔고, ' +
      '압드 알말리크가 아랍어 행정·디나르 금화를 도입하고 예루살렘에 바위의 돔을 세웠다. ' +
      '이집트는 푸스타트의 총독이 다스리는 속주였다. 750년 자브강 전투에서 아바스 혁명군에 패해 무너졌고, ' +
      '살아남은 압드 알라흐만 1세가 코르도바 토후국을 세웠다. 도읍 다마스쿠스 기준 SY 단독 링크.',
    startEra: 'AD', startYear: 661,
    endEra: 'AD', endYear: 750,
    stateType: HistoricalStateType.CALIPHATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 33.51, longitude: 36.31,
    linkToIsoCodes: ['SY'],
  },
  {
    name: '아바스 칼리파국',
    enName: 'Abbasid Caliphate',
    nameOrigin:
      '예언자 무함마드의 숙부 알아바스 이븐 압드 알무탈리브(al-ʿAbbās)의 후손 가문에서 딴 이름.',
    description:
      '750년 우마이야 왕조를 무너뜨린 아바스 가문의 칼리파국. 762년 알만수르가 바그다드를 건설해 도읍으로 삼았고, ' +
      '하룬 알라시드·알마문 시대에 "지혜의 집"을 중심으로 그리스 학문 번역과 이슬람 황금기를 열었다. ' +
      '9세기 후반부터 지방 총독의 자립(이집트의 툴룬 왕조·이흐시드 왕조)과 부와이 왕조·셀주크 왕조의 실권 장악으로 ' +
      '칼리파는 상징적 권위만 남았다. 1258년 몽골의 훌라구가 바그다드를 함락하며 멸망했다. ' +
      '1261~1517년 카이로의 맘루크 술탄국이 옹립한 "그림자 칼리파"는 별행 없이 이 행의 서술로 갈음한다. 도읍 바그다드 기준 IQ 단독 링크.',
    startEra: 'AD', startYear: 750,
    endEra: 'AD', endYear: 1258, endMonth: 2,
    stateType: HistoricalStateType.CALIPHATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 33.31, longitude: 44.36,
    linkToIsoCodes: ['IQ'],
  },
  {
    name: '툴룬 왕조',
    enName: 'Tulunid Dynasty',
    nameOrigin: '창건자 아흐마드 이븐 툴룬의 아버지, 부하라 출신 튀르크계 노예 군인 툴룬(Ṭūlūn)에서 딴 이름.',
    description:
      '868년 아바스 칼리파가 이집트 대리 총독으로 보낸 아흐마드 이븐 툴룬이 재정권과 군사권을 장악해 세운 ' +
      '이슬람 시대 이집트 최초의 사실상 독립 정권. 아바스 칼리파의 명목 종주권은 인정했으나 세금을 바그다드로 보내지 않았고, ' +
      '시리아까지 판도를 넓혔다. 푸스타트 북쪽에 새 도읍 알카타이와 이븐 툴룬 모스크를 세웠다. ' +
      '905년 아바스 군대가 재정복하며 끝났다. 시리아는 획득 영토라 EG 단독 링크.',
    startEra: 'AD', startYear: 868,
    endEra: 'AD', endYear: 905, endMonth: 1,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 30.03, longitude: 31.25,
    linkToIsoCodes: ['EG'],
  },
  {
    name: '이흐시드 왕조',
    enName: 'Ikhshidid Dynasty',
    nameOrigin:
      '창건자 무함마드 이븐 투그즈가 939년 아바스 칼리파에게서 받은 칭호 "이흐시드(al-Ikhshīd)"에서 딴 이름. ' +
      '페르가나 지방 군주의 옛 칭호로 "왕"을 뜻한다.',
    description:
      '935년 이집트 총독으로 부임한 튀르크계 무함마드 이븐 투그즈가 세운 세습 정권. 툴룬 왕조처럼 아바스 칼리파의 ' +
      '명목 종주권 아래 사실상 독립했고, 북아프리카에서 동진하던 파티마 왕조의 침공을 막았다. ' +
      '창건자 사후에는 흑인 환관 출신 섭정 아부 알미스크 카푸르가 실권을 쥐었다. ' +
      '968년 카푸르가 죽자 이듬해 파티마 장군 자우하르가 푸스타트를 무혈 점령하며 끝났다.',
    startEra: 'AD', startYear: 935,
    endEra: 'AD', endYear: 969, endMonth: 7,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 30.01, longitude: 31.23,
    linkToIsoCodes: ['EG'],
  },
  {
    name: '파티마 칼리파국',
    enName: 'Fatimid Caliphate',
    nameOrigin:
      '예언자 무함마드의 딸이자 알리의 아내인 파티마(Fāṭima)의 후손을 자처한 데서 딴 이름. ' +
      '시아파 이스마일파 이맘이 칼리파를 겸한 나라다.',
    description:
      '909년 이스마일파 이맘 우바이드 알라흐 알마흐디가 이프리키야(오늘날 튀니지)에서 아바스에 맞서 칼리파를 칭하며 세운 나라. ' +
      '969년 장군 자우하르가 이집트를 정복하고 새 도시 "알카히라(승리자, 카이로)"를 건설했으며, 973년 칼리파 알무이즈가 ' +
      '도읍을 카이로로 옮겼다. 알아즈하르 모스크(후의 알아즈하르 대학)를 세우고 홍해·인도양 교역으로 번영했으나, ' +
      '11세기 후반부터 군벌 재상(와지르)이 실권을 쥐었다. 1171년 재상 살라흐 앗딘이 마지막 칼리파 사후 아바스 칼리파의 이름으로 ' +
      '금요 설교를 바꾸게 하며 폐지되었다. 창건기 62년의 도읍 마흐디야가 있는 TN은 미래용 표기(현대 국가 미등록 — 등록 후 재실행하면 활성).',
    startEra: 'AD', startYear: 909,
    endEra: 'AD', endYear: 1171, endMonth: 9,
    stateType: HistoricalStateType.CALIPHATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 30.05, longitude: 31.26,
    linkToIsoCodes: ['EG', 'TN'],
  },

  // ── 술탄국 시대 ───────────────────────────────────────────────────
  {
    name: '아이유브 왕조',
    enName: 'Ayyubid Dynasty',
    nameOrigin:
      '창건자 살라흐 앗딘(살라딘)의 아버지 나즘 앗딘 아이유브(Ayyūb, 욥의 아랍어형)에서 딴 이름. 쿠르드계 가문이다.',
    description:
      '1171년 파티마 칼리파국을 폐지한 재상 살라흐 앗딘이 세운 수니파 술탄국. 1174년 주군 누르 앗딘 사후 다마스쿠스·알레포를 ' +
      '아울렀고, 1187년 하틴 전투에서 십자군을 격파하고 예루살렘을 되찾았다. 살라흐 앗딘이 다마스쿠스에서 죽은 뒤 ' +
      '왕가는 카이로·다마스쿠스·알레포의 분가가 술탄의 종주권 아래 병존하는 연합 체제가 되었다. ' +
      '1250년 제7차 십자군을 막아낸 직후 맘루크 친위대가 술탄 투란샤를 살해하며 이집트 정권이 끝났다(시리아 분가는 1260년까지 잔존). ' +
      '카이로와 다마스쿠스가 모두 왕가의 정주핵이라 EG·SY 이중 링크(규범 A).',
    startEra: 'AD', startYear: 1171, startMonth: 9,
    endEra: 'AD', endYear: 1250, endMonth: 5,
    stateType: HistoricalStateType.SULTANATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 30.03, longitude: 31.26,
    linkToIsoCodes: ['EG', 'SY'],
  },
  {
    name: '맘루크 술탄국',
    enName: 'Mamluk Sultanate',
    nameOrigin:
      '"맘루크(mamlūk)"는 아랍어로 "소유된 자", 곧 노예 출신 군인을 뜻한다. 킵차크 초원·캅카스에서 사 온 소년을 ' +
      '훈련시킨 군인 엘리트가 술탄위를 차지한 나라라 이렇게 부른다.',
    description:
      '1250년 아이유브 술탄의 맘루크 친위대가 정권을 잡아 세운 술탄국. 1260년 바이바르스와 쿠투즈가 아인 잘루트 전투에서 ' +
      '몽골군을 꺾고 시리아를 차지했으며, 1291년 아크레를 함락해 십자군 국가를 끝냈다. ' +
      '바그다드 함락 뒤 아바스 가문의 생존자를 카이로에 칼리파로 옹립해 권위를 세웠다. ' +
      '전기는 킵차크계 바흐리 맘루크(1250~1382), 후기는 체르케스계 부르지 맘루크(1382~1517)가 다스렸다. ' +
      '1516년 마르지 다비크, 1517년 1월 라이다니야 전투에서 오스만 제국에 패해 멸망했다. 시리아는 획득 속주라 EG 단독 링크(규범 B).',
    startEra: 'AD', startYear: 1250, startMonth: 5,
    endEra: 'AD', endYear: 1517, endMonth: 1,
    stateType: HistoricalStateType.SULTANATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 30.03, longitude: 31.26,
    linkToIsoCodes: ['EG'],
  },

  {
    name: '오스만령 이집트',
    enName: 'Ottoman Egypt',
    nameOrigin:
      '오스만 제국의 지배 아래 있던 이집트를 가리키는 통칭. 오스만의 행정 단위로는 "이집트 에얄레트(Eyalet-i Mısır)"이며, ' +
      '총독(파샤, 왈리)이 이스탄불에서 임명되었다. 스웨덴령 에스토니아·베네치아령 알바니아처럼 "지배국령 + 지역" 형식으로 부른다.',
    description:
      '1517년 1월 라이다니야 전투에서 셀림 1세가 맘루크 술탄국을 무너뜨리며 오스만 제국의 주(에얄레트)가 되었다. ' +
      '1525년 술레이만 1세의 이집트 법전(카눈나메)으로 체제가 정비되었고, 티마르 봉토를 두지 않고 매년 정액 공납(이르사리예)을 ' +
      '이스탄불에 보내는 특권주였다. 총독은 자주 교체되었으며, 일곱 군단(오자크)과 살아남은 맘루크 베이층이 실권을 나눠 가졌다. ' +
      '17~18세기에는 맘루크 베이들이 총독을 압도했고, 1760~70년대 알리 베이 알카비르는 술탄에게서 사실상 독립을 꾀하기도 했다. ' +
      '1798년 나폴레옹의 원정군이 피라미드 전투에서 맘루크군을 꺾고 이집트를 점령했으나(별행 없음), 1801년 영국·오스만군에 밀려 철수했다. ' +
      '그 혼란 속에 1805년 5월 카이로 명사들이 알바니아 출신 장교 무함마드 알리를 총독으로 추대하며 이집트 헤디브국 체제로 넘어갔다.',
    startEra: 'AD', startYear: 1517, startMonth: 1,
    endEra: 'AD', endYear: 1805, endMonth: 5,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 30.04, longitude: 31.24,
    linkToIsoCodes: ['EG'],
  },

  // ── 근현대 ────────────────────────────────────────────────────────
  {
    name: '이집트 헤디브국',
    enName: 'Khedivate of Egypt',
    nameOrigin:
      '"헤디브(khedive)"는 페르시아어 "주인·군주"에서 온 칭호로, 1867년 오스만 술탄 압뒬아지즈가 이스마일 파샤에게 ' +
      '세습 칭호로 인정했다. 이 행은 1805년 무함마드 알리의 집권부터 담는다 — 1805~1867년의 총독(왈리) 시기도 ' +
      '같은 왕가·같은 반독립 체제라 칭호 승격만으로 행을 나누지 않는다(베네벤토 공국 판례). ' +
      '"무함마드 알리 왕조 이집트"라고도 부른다.',
    description:
      '1798~1801년 프랑스 원정의 혼란 속에 오스만 원정군 소속 알바니아 출신 장교 무함마드 알리가 1805년 이집트 총독으로 추대되며 시작된 ' +
      '세습 자치국. 1811년 맘루크 지배층을 숙청하고 징병제·면화 단일경작·근대 공장을 도입했으며, 수단을 정복하고 ' +
      '시리아를 두고 술탄과 두 차례 전쟁을 벌였다. 1841년 술탄의 칙령으로 왕가의 세습 총독직이 인정되었다. ' +
      '이스마일 시대 수에즈 운하가 개통(1869)되었으나 외채로 재정이 파탄해 영·프 재정 관리를 받았고, ' +
      '1882년 우라비 혁명 진압을 명분으로 영국이 점령했다. 오스만의 명목 종주권은 1914년 11월 오스만이 독일 편으로 참전하며 끊겼다.',
    startEra: 'AD', startYear: 1805, startMonth: 5,
    endEra: 'AD', endYear: 1914, endMonth: 12,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 30.04, longitude: 31.24,
    linkToIsoCodes: ['EG'],
  },
  {
    name: '이집트 술탄국',
    enName: 'Sultanate of Egypt',
    nameOrigin:
      '영국이 오스만과의 연결을 끊으며 이집트 군주의 칭호를 헤디브에서 오스만 술탄과 대등한 "술탄"으로 올린 데서 온 이름.',
    description:
      '1914년 12월 18일 영국이 오스만의 종주권을 부정하고 이집트를 정식 보호국으로 선포하며 성립했다. ' +
      '친오스만 성향의 헤디브 아바스 2세를 폐위하고 숙부 후세인 카밀을 술탄으로 세웠으며, 이어 푸아드 1세가 즉위했다. ' +
      '제1차 세계대전 중 이집트는 영국군의 중동 작전 기지가 되었다. 1919년 사드 자글룰의 와프드 운동이 이끈 전국 혁명 끝에 ' +
      '1922년 2월 28일 영국이 일방적으로 독립을 선언하며 보호국 체제가 끝났다.',
    startEra: 'AD', startYear: 1914, startMonth: 12,
    endEra: 'AD', endYear: 1922, endMonth: 2,
    stateType: HistoricalStateType.SULTANATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 30.04, longitude: 31.24,
    linkToIsoCodes: ['EG'],
  },
  {
    name: '이집트 왕국',
    enName: 'Kingdom of Egypt',
    nameOrigin: '1922년 3월 술탄 푸아드 1세가 칭호를 "왕(말리크)"으로 바꾸며 붙은 국호.',
    description:
      '1922년 영국의 일방적 독립 선언으로 성립한 입헌군주국. 영국은 수에즈 운하 방위·수단 문제 등 네 가지 사항을 유보했고, ' +
      '1936년 영국-이집트 조약 뒤에도 운하 지대에 군대를 남겼다. 1923년 헌법 아래 와프드당과 왕실이 대립했고, ' +
      '파루크 1세 시대 제2차 세계대전 엘알라메인 전투와 1948년 제1차 중동전쟁 패배로 왕정의 권위가 무너졌다. ' +
      '1952년 7월 23일 나기브·나세르가 이끈 자유장교단 쿠데타로 파루크가 퇴위했고, 1953년 6월 18일 공화국 선포로 끝났다.',
    startEra: 'AD', startYear: 1922, startMonth: 2,
    endEra: 'AD', endYear: 1953, endMonth: 6,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 30.04, longitude: 31.24,
    linkToIsoCodes: ['EG'],
  },
  {
    name: '이집트 공화국',
    enName: 'Republic of Egypt',
    nameOrigin: '1953년 6월 18일 왕정 폐지와 함께 선포된 국호. 1958년 아랍 연합 공화국 결성으로 사라졌다.',
    description:
      '1953년 6월 혁명평의회가 왕정을 폐지하고 선포한 공화국. 초대 대통령 무함마드 나기브가 1954년 나세르와의 권력 투쟁에서 밀려났고, ' +
      '1956년 대통령에 오른 나세르가 수에즈 운하를 국유화해 영국·프랑스·이스라엘의 침공(수에즈 위기)을 정치적 승리로 바꾸었다. ' +
      '1954년 영국과의 협정으로 운하 지대의 영국군이 철수해 1882년 이래의 점령이 끝났다. ' +
      '1958년 2월 시리아와 합쳐 아랍 연합 공화국을 세우며 끝났다.',
    startEra: 'AD', startYear: 1953, startMonth: 6,
    endEra: 'AD', endYear: 1958, endMonth: 2,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 30.04, longitude: 31.24,
    linkToIsoCodes: ['EG'],
  },
  {
    name: '아랍 연합 공화국',
    enName: 'United Arab Republic',
    nameOrigin:
      '범아랍주의에 따라 아랍 국가들의 통합체로 구상된 이름(al-Jumhūriyya al-ʿArabiyya al-Muttaḥida). ' +
      '1961년 시리아 이탈 뒤에도 이집트는 1971년까지 이 국호를 지켰다.',
    description:
      '1958년 2월 1일 이집트와 시리아가 합쳐 세운 단일 국가. 나세르가 대통령이 되고 카이로가 수도였으며, ' +
      '시리아는 "북부 지역"이 되었다. 이집트 주도의 중앙집권과 토지 개혁·국유화에 대한 반발 속에 ' +
      '1961년 9월 다마스쿠스 쿠데타로 시리아가 이탈했으나 이집트는 국호를 유지했다. ' +
      '1967년 제3차 중동전쟁(6일 전쟁)에서 시나이반도를 잃었고, 1970년 나세르 사후 사다트가 1971년 9월 새 헌법과 함께 국호를 바꾸었다. ' +
      '두 구성국 모두 정체성 핵심부라 EG·SY 이중 링크(규범 A).',
    startEra: 'AD', startYear: 1958, startMonth: 2,
    endEra: 'AD', endYear: 1971, endMonth: 9,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 30.04, longitude: 31.24,
    linkToIsoCodes: ['EG', 'SY'],
  },
  {
    name: '이집트 아랍 공화국',
    enName: 'Arab Republic of Egypt',
    nameOrigin:
      '1971년 9월 11일 새 헌법과 함께 채택된 현행 국호(Jumhūriyyat Miṣr al-ʿArabiyya). ' +
      '"미스르(Miṣr)"는 셈어 계열의 오래된 이집트 이름으로, 오늘날 아랍어 국명이다. ' +
      '현행 국가 행은 현대 국가와 이름이 겹치지 않게 정식 국호로 둔다(루마니아 공화국 판례).',
    description:
      '1971년 사다트가 아랍 연합 공화국의 국호를 바꾸며 이어진 현행 공화국. 1973년 제4차 중동전쟁(10월 전쟁)으로 수에즈 운하를 건넜고, ' +
      '1978년 캠프 데이비드 협정과 1979년 이스라엘-이집트 평화 조약으로 1982년 시나이반도를 돌려받았다. ' +
      '1981년 사다트 암살 뒤 무바라크가 30년간 집권했고, 2011년 1월 혁명으로 퇴진했다. ' +
      '2012년 무슬림형제단 출신 무르시가 첫 민선 대통령이 되었으나 2013년 군부가 축출했고, 2014년부터 엘시시가 집권하고 있다.',
    startEra: 'AD', startYear: 1971, startMonth: 9,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 30.04, longitude: 31.24,
    linkToIsoCodes: ['EG'],
  },
]

export async function seedEgyptHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇪🇬 이집트 관련 역사 국가 시딩 시작...')

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

  console.log(`✅ 이집트 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
