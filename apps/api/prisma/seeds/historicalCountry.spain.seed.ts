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
  // ── 고대 ──────────────────────────────────────────────────────────
  {
    name: '타르테소스',
    enName: 'Tartessos',
    nameOrigin:
      '그리스인이 과달키비르 하구의 나라를 부르던 "타르테소스(Ταρτησσός)"에서 왔다. ' +
      '구약성서 열왕기의 교역 도시 "다시스(Tarshish)"를 같은 곳으로 보는 견해가 오래전부터 있었다.',
    description:
      '기원전 9세기경 과달키비르강 하구(오늘날 우엘바·세비야 일대)에서 은과 구리를 페니키아 상인에게 넘기며 일어선 이베리아 반도 최초의 국가적 정치체. ' +
      '헤로도토스는 80년을 다스렸다는 아르간토니오스 왕이 포카이아의 그리스인을 후대했다고 적었다. ' +
      '알가르브(오늘날 포르투갈 남부)까지 퍼진 이른바 타르테소스 문자 비문이 남아 있으나 아직 해독되지 않았다. ' +
      '기원전 6세기 중엽 카르타고의 부상과 함께 기록에서 사라졌고, 뒤이어 같은 땅에 투르데타니아인의 세계가 이어졌다. ' +
      '정주핵이 과달키비르 하구라 현대 스페인 단독으로 잇는다.',
    startEra: 'BC', startYear: 900,
    endEra: 'BC', endYear: 550,
    stateType: HistoricalStateType.TRIBAL_STATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.26, longitude: -6.95,
    linkToIsoCodes: ['ES'],
  },

  // ── 게르만 왕국 ───────────────────────────────────────────────────
  {
    name: '수에비 왕국',
    enName: 'Kingdom of the Suebi',
    nameOrigin:
      '라틴어 국호는 레그눔 수에보룸(Regnum Suevorum) — "수에비족의 왕국"이라는 뜻이다. ' +
      '도읍 브라카라 아우구스타(오늘날 브라가)의 이름을 따 브라가 왕국이라고도 부른다.',
    description:
      '409년 라인강을 건넌 게르만 무리와 함께 이베리아로 들어온 수에비족이 411년 갈라이키아(오늘날 갈리시아·포르투갈 북부)를 배정받아 세운 왕국. ' +
      '서로마의 붕괴 속에서 서유럽 최초로 자체 화폐를 찍고 왕국다운 틀을 갖췄으며, ' +
      '5세기 중엽 레키아리우스 왕 때에는 반도 대부분을 넘볼 만큼 뻗어 나갔다. ' +
      '뒤에 아리우스파에서 가톨릭으로 개종했고, 585년 서고트 왕 레오비길도에게 병합되어 176년의 역사를 마쳤다. ' +
      '도읍 브라가는 오늘날 포르투갈, 중심 강역의 절반인 갈리시아는 오늘날 스페인이라 양쪽에 잇는다.',
    startEra: 'AD', startYear: 409,
    endEra: 'AD', endYear: 585,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.55, longitude: -8.42,
    linkToIsoCodes: ['PT', 'ES'],
  },
  {
    name: '서고트 왕국',
    enName: 'Visigothic Kingdom',
    nameOrigin:
      '라틴어 레그눔 비시고토룸(Regnum Visigothorum). ' +
      '"서쪽 고트"라는 뜻의 비시고트는 6세기 카시오도루스가 동고트(오스트로고트)와 짝을 맞춰 붙인 이름이다.',
    description:
      '418년 서로마와 맺은 포에두스(동맹 조약)로 아키타니아 제2주에 정착한 서고트족이 툴루즈를 도읍 삼아 세운 왕국. ' +
      '507년 부이예 전투에서 프랑크에 패해 갈리아를 잃은 뒤 무대를 이베리아로 옮겨 톨레도를 도읍으로 삼았다. ' +
      '589년 제3차 톨레도 공의회에서 레카레도 왕이 가톨릭으로 개종해 고트인과 히스파노로마인의 종교가 하나가 되었고, ' +
      '654년 레케스빈토의 「재판관의 서(Liber Iudiciorum)」로 두 법체계를 통합했다. ' +
      '711년 과달레테 전투에서 로데리크 왕이 전사한 뒤 무너졌고, 720년 셉티마니아의 나르본이 함락되며 완전히 소멸했다. ' +
      '90년간 도읍이 툴루즈였던 전반기를 근거로 프랑스까지 함께 잇는다(수도 소재=정주핵 판례).',
    startEra: 'AD', startYear: 418,
    endEra: 'AD', endYear: 720,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 39.86, longitude: -4.03,
    linkToIsoCodes: ['ES', 'PT', 'FR'],
  },

  // ── 알안달루스 ────────────────────────────────────────────────────
  {
    name: '코르도바 토후국',
    enName: 'Emirate of Cordoba',
    nameOrigin:
      '아랍어 이마라(imāra, 토후국)를 그대로 옮긴 이름이다. ' +
      '군주는 칼리프가 아니라 아미르(amīr)를 칭했고, 나라 이름은 땅 이름 알안달루스(al-Andalus)로 불렸다.',
    description:
      '711년 우마이야의 이베리아 정복 뒤 다마스쿠스가 보낸 총독들이 다스리던 알안달루스에서, ' +
      '756년 아바스 혁명을 피해 달아난 우마이야 왕족 압드 알라흐만 1세가 코르도바에 세운 독립 토후국. ' +
      '바그다드의 칼리프를 인정하지 않고 스스로 아미르를 칭했으며, 785년 착공한 코르도바 대모스크(메스키타)가 이 시대의 상징이다. ' +
      '아랍·베르베르·개종 히스파니아인(무왈라드)·모사라베 기독교도가 뒤섞인 사회를 다스리느라 반란이 끊이지 않았고, ' +
      '929년 압드 알라흐만 3세가 칼리프를 칭하면서 칼리파국으로 격상되었다.',
    startEra: 'AD', startYear: 756,
    endEra: 'AD', endYear: 929,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.88, longitude: -4.78,
    linkToIsoCodes: ['ES', 'PT'],
  },
  {
    name: '코르도바 칼리파국',
    enName: 'Caliphate of Cordoba',
    nameOrigin:
      '아랍어 킬라파(khilāfa, 칼리프위)에서 온 이름으로, ' +
      '929년 압드 알라흐만 3세가 바그다드·카이로와 나란히 칼리프를 칭하며 국호로 삼았다.',
    description:
      '929년 1월 압드 알라흐만 3세가 "신도의 사령관"을 자처하며 선포한 이베리아의 이슬람 칼리프국. ' +
      '코르도바는 인구 수십만의 유럽 최대 도시가 되었고, 알하캄 2세의 도서관과 마디나트 알자흐라 궁성 도시가 전성기를 말해 준다. ' +
      '10세기 말 재상 알만수르가 실권을 쥐고 산티아고데콤포스텔라까지 원정했으나, ' +
      '그의 사후 아랍·베르베르·슬라브 파벌이 갈라진 내전(피트나)이 터졌다. ' +
      '1031년 마지막 칼리프 히샴 3세가 폐위되면서 칼리파국은 수십 개 타이파로 흩어졌다.',
    startEra: 'AD', startYear: 929, startMonth: 1,
    endEra: 'AD', endYear: 1031,
    stateType: HistoricalStateType.CALIPHATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.88, longitude: -4.78,
    linkToIsoCodes: ['ES', 'PT'],
  },
  {
    name: '세비야 타이파',
    enName: 'Taifa of Seville',
    nameOrigin:
      '아랍어 물루크 앗타와이프(mulūk aṭ-ṭawāʾif, 분파 왕들)에서 온 "타이파"는 ' +
      '칼리파국이 쪼개져 생긴 군소 왕국을 가리킨다. 지배 가문의 이름을 따 아바드 왕조라고도 한다.',
    description:
      '1023년 코르도바 칼리파국의 붕괴 속에서 카디(재판관) 아부 알카심 이븐 아바드가 세비야에 세운 타이파. ' +
      '타이파 가운데 가장 강성하여 코르도바·우엘바·알가르브까지 삼켰고, ' +
      '시인왕 알무타미드의 궁정은 안달루스 아랍 문학의 절정으로 꼽힌다. ' +
      '1085년 톨레도가 카스티야에 떨어지자 북아프리카의 무라비트를 불러들였으나, ' +
      '1091년 그 무라비트에게 도리어 나라를 빼앗기고 알무타미드는 모로코 아그마트로 유배되어 죽었다. ' +
      '알가르브(오늘날 포르투갈 남부)를 직접 다스린 시기가 길어 포르투갈에도 함께 잇는다.',
    startEra: 'AD', startYear: 1023,
    endEra: 'AD', endYear: 1091,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.39, longitude: -5.99,
    linkToIsoCodes: ['ES', 'PT'],
  },
  {
    name: '사라고사 타이파',
    enName: 'Taifa of Zaragoza',
    nameOrigin:
      '도읍 사라고사의 이름은 로마 식민시 카이사라우구스타(Caesaraugusta)가 아랍어 사라쿠스타(Saraqusṭa)를 거쳐 굳은 것이다. ' +
      '후드 가문이 다스려 후드 왕조라고도 부른다.',
    description:
      '1018년 에브로강 유역의 변경 사령관 문디르 1세가 세우고 1039년부터 후드 가문이 이어받은 상부 변경의 타이파. ' +
      '알자페리아 궁전을 남긴 알무크타디르 시대가 전성기였고, 북쪽 기독교 왕국들에 조공(파리아)을 바치며 버텼다. ' +
      '엘 시드가 한때 이 타이파를 위해 싸운 것으로도 유명하다. ' +
      '1110년 무라비트에게 넘어갔고, 1118년 아라곤 왕 알폰소 1세가 되찾으면서 아라곤 왕국의 새 도읍이 되었다.',
    startEra: 'AD', startYear: 1018,
    endEra: 'AD', endYear: 1110,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.65, longitude: -0.89,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '톨레도 타이파',
    enName: 'Taifa of Toledo',
    nameOrigin:
      '옛 서고트 왕국의 도읍 톨레툼(Toletum)이 아랍어 툴라이툴라(Ṭulayṭula)로 이어진 이름이다. ' +
      '두 누느 가문이 다스려 둘누니 왕조라고도 한다.',
    description:
      '1031년 칼리파국이 무너지자 베르베르계 두 누느 가문이 옛 서고트 도읍 톨레도를 차지해 세운 중부 변경의 타이파. ' +
      '알마문 시대에 발렌시아와 코르도바까지 넘볼 만큼 컸으나 카스티야에 바치는 파리아로 국고가 말랐다. ' +
      '1085년 5월 카스티야 왕 알폰소 6세가 무혈입성하면서 무너졌고, ' +
      '옛 서고트 도읍의 회복은 레콩키스타 전체의 분수령으로 받아들여졌다. ' +
      '이 충격이 세비야 타이파로 하여금 무라비트를 불러들이게 만들었다.',
    startEra: 'AD', startYear: 1031,
    endEra: 'AD', endYear: 1085, endMonth: 5,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 39.86, longitude: -4.03,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '바다호스 타이파',
    enName: 'Taifa of Badajoz',
    nameOrigin:
      '도읍 바다호스의 아랍어 이름 바탈야우스(Baṭalyaws)에서 왔다. ' +
      '아프타스 가문이 다스려 아프타스 왕조라고도 부른다.',
    description:
      '1009년 하부 변경(알타그르 알아드나)의 사령관 사분 이븐 무함마드가 세우고 아프타스 가문이 이은 서부 타이파. ' +
      '오늘날 에스트레마두라와 포르투갈 중부(리스본·코임브라)에 걸친 넓은 땅을 다스렸고, ' +
      '알무자파르 왕이 엮은 백과전서 「알무자파르의 책」으로 문화사에 이름을 남겼다. ' +
      '카스티야에 파리아를 바치다 1094년 무라비트에게 정복되었으며, 마지막 왕 알무타와킬은 두 아들과 함께 처형되었다. ' +
      '강역의 절반이 오늘날 포르투갈 중부라 양쪽에 잇는다.',
    startEra: 'AD', startYear: 1009,
    endEra: 'AD', endYear: 1094,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 38.88, longitude: -6.97,
    linkToIsoCodes: ['ES', 'PT'],
  },
  {
    name: '무라비트 왕조',
    enName: 'Almoravid Dynasty',
    nameOrigin:
      '아랍어 알무라비툰(al-Murābiṭūn) — "리바트(국경 수도원)에 머무는 자들"이라는 뜻이다. ' +
      '이것이 에스파냐어 알모라비데(almorávide)를 거쳐 한국어 "무라비트"로 굳었다.',
    description:
      '1040년대 사하라의 산하자 베르베르 유목민 사이에서 일어난 개혁 운동이 마라케시를 도읍 삼아 세운 제국. ' +
      '1086년 사그라하스(살라카) 전투에서 카스티야의 알폰소 6세를 꺾어 레콩키스타의 기세를 멈춰 세웠고, ' +
      '이어 1091년 세비야를 시작으로 타이파들을 차례로 병합해 알안달루스를 다시 하나로 묶었다. ' +
      '마그레브와 이베리아 양쪽을 아우른 최초의 제국으로, 금 교역로와 안달루스의 부가 국력의 두 기둥이었다. ' +
      '1147년 같은 베르베르계인 무와히드에게 마라케시를 내주고 멸망했다. ' +
      '중심 도읍은 오늘날 모로코이나(미등록) 정복 뒤 국부의 핵심이자 통치 중심의 절반이 알안달루스였기에 ES·PT에 잇는다.',
    startEra: 'AD', startYear: 1040,
    endEra: 'AD', endYear: 1147,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 31.63, longitude: -7.99,
    linkToIsoCodes: ['ES', 'PT'],
  },
  {
    name: '무와히드 왕조',
    enName: 'Almohad Caliphate',
    nameOrigin:
      '아랍어 알무와히둔(al-Muwaḥḥidūn) — "유일신을 고백하는 자들"이라는 뜻으로, ' +
      '창시자 이븐 투마르트의 엄격한 유일신 교리에서 왔다. 에스파냐어형은 알모아데(almohade)다.',
    description:
      '1121년 마스무다 베르베르의 종교 지도자 이븐 투마르트가 아틀라스 산중에서 일으킨 운동에서 비롯해, ' +
      '압드 알무민이 1147년 마라케시를 함락하며 무라비트를 대신한 칼리파국. ' +
      '세비야를 이베리아 쪽 도읍으로 삼아 히랄다 탑을 세웠고, 이븐 루시드(아베로에스)·이븐 투파일 같은 철학자를 품었다. ' +
      '1195년 알라르코스에서 카스티야를 크게 이겼으나 1212년 라스 나바스 데 톨로사에서 기독교 연합군에 참패해 무너지기 시작했다. ' +
      '1228년 이후 알안달루스에서 철수했고 1269년 마린 왕조에 마라케시를 내주며 소멸했다.',
    startEra: 'AD', startYear: 1121,
    endEra: 'AD', endYear: 1269,
    stateType: HistoricalStateType.CALIPHATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 31.63, longitude: -7.99,
    linkToIsoCodes: ['ES', 'PT'],
  },
  {
    name: '그라나다 토후국',
    enName: 'Emirate of Granada',
    nameOrigin:
      '지배 가문 바누 나스르(Banū Naṣr)를 따 나스르 왕조라고도 한다. ' +
      '도읍 이름 가르나타(Gharnāṭa)가 그라나다로 이어졌다.',
    description:
      '1238년 무함마드 1세 이븐 알아흐마르가 무와히드의 붕괴를 틈타 그라나다에 세운 알안달루스 최후의 이슬람 국가. ' +
      '카스티야에 조공을 바치는 속국의 지위를 받아들이는 대가로 250여 년을 버텼고, ' +
      '그 사이 알람브라 궁전과 헤네랄리페 정원이라는 이슬람 건축의 정점을 남겼다. ' +
      '비단·설탕 교역과 험한 산세, 그리고 기독교 왕국들 사이의 분열이 생존의 조건이었다. ' +
      '1492년 1월 2일 마지막 군주 무함마드 12세(보압딜)가 가톨릭 공동왕에게 열쇠를 넘기며 레콩키스타가 끝났다.',
    startEra: 'AD', startYear: 1238,
    endEra: 'AD', endYear: 1492, endMonth: 1,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.18, longitude: -3.60,
    linkToIsoCodes: ['ES'],
  },

  // ── 북부 기독교 왕국 ──────────────────────────────────────────────
  {
    name: '아스투리아스 왕국',
    enName: 'Kingdom of Asturias',
    nameOrigin:
      '칸타브리아 산맥 북쪽 사면에 살던 부족 아스투레스(Astures)의 땅 이름에서 왔다.',
    description:
      '718년 서고트 귀족 펠라요가 칸타브리아 산중에서 추대되어 세운, 이베리아 최초의 기독교 저항 왕국. ' +
      '722년 코바동가 전투의 승리가 건국 설화의 중심이며, 스스로를 무너진 서고트 왕국의 계승자로 내세웠다. ' +
      '도읍은 칸가스데오니스에서 오비에도로 옮겨졌고, 알폰소 2세 때 산티아고 사도의 무덤이 "발견"되어 순례길이 열렸다. ' +
      '알폰소 3세가 두에로강까지 밀고 내려간 뒤인 910년 궁정이 레온으로 옮겨가면서 레온 왕국으로 이어졌다.',
    startEra: 'AD', startYear: 718,
    endEra: 'AD', endYear: 910,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 43.36, longitude: -5.84,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '레온 왕국',
    enName: 'Kingdom of Leon',
    nameOrigin:
      '도읍 레온의 이름은 짐승 사자가 아니라 로마 제7군단의 주둔지 "레기오 셉티마(Legio VII)"에서 왔다.',
    description:
      '910년 알폰소 3세가 죽고 궁정이 오비에도에서 레온으로 옮겨가면서 성립한, 아스투리아스 왕국의 후신. ' +
      '두에로강 남쪽으로 재정착(레포블라시온)을 밀어붙여 레콩키스타의 주역 노릇을 했고, ' +
      '왕들은 "전 히스파니아의 황제(Imperator totius Hispaniae)"를 칭하며 반도의 종주를 자임했다. ' +
      '1037년부터 카스티야와 갈라졌다 합쳤다를 거듭했고, 1139년에는 남서쪽 포르투갈 백국이 왕국으로 독립해 나갔다. ' +
      '1230년 알폰소 9세가 죽고 그 아들 페르난도 3세가 두 왕관을 함께 쓰면서 카스티야와 영구히 하나가 되었다.',
    startEra: 'AD', startYear: 910,
    endEra: 'AD', endYear: 1230,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.60, longitude: -5.57,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '갈리시아 왕국',
    enName: 'Kingdom of Galicia',
    nameOrigin:
      '로마 속주 갈라이키아(Gallaecia)에서 온 이름으로, 그 뿌리는 켈트계 부족 칼라이키(Callaeci)다.',
    description:
      '910년 알폰소 3세의 유산이 세 아들에게 나뉘며 오르도뇨 2세 몫으로 떨어져 나온 반도 북서쪽 왕국. ' +
      '산티아고데콤포스텔라의 사도 무덤을 품어 유럽 전역에서 순례자가 모여드는 성지를 거느렸다. ' +
      '1065년 페르난도 1세의 분할 상속으로 가르시아 2세의 왕국으로 잠시 되살아났다가 1071년 다시 흡수되었고, ' +
      '이후로는 레온·카스티야 왕이 겸하는 왕호로 남아 고유한 의회와 법 관행을 유지했다. ' +
      '1230년 레온과 함께 카스티야 왕관에 합쳐졌다.',
    startEra: 'AD', startYear: 910,
    endEra: 'AD', endYear: 1230,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.88, longitude: -8.54,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '나바라 왕국',
    enName: 'Kingdom of Navarre',
    nameOrigin:
      '바스크어 나바르(Nafarroa)에서 왔으며 "평원" 또는 "골짜기 사람"으로 풀이한다. ' +
      '824년의 출발점에서는 도읍 이름을 따 팜플로나 왕국이라 불렀다.',
    description:
      '824년 바스크 귀족 이니고 아리스타가 프랑크의 지배를 물리치고 팜플로나에서 왕으로 추대되며 시작된 왕국. ' +
      '11세기 산초 3세 대왕 때 카스티야 백국과 아라곤 백국까지 아우르며 반도 기독교 세계의 맹주가 되었고, ' +
      '1035년 그의 죽음과 분할 상속으로 카스티야 왕국·아라곤 왕국이 갈라져 나왔다. ' +
      '이후 프랑스계 왕조가 잇달아 들어서 프랑스 정치와 얽혔고, ' +
      '1512년 페르난도 2세가 피레네 남쪽(상나바라)을 병합한 뒤에도 산 너머 하나바라는 따로 남았다. ' +
      '1620년 하나바라가 프랑스 왕국에 합쳐지면서 왕국은 끝났다 — 피레네 양쪽에 정체성 핵심부가 걸쳐 ES·FR에 함께 잇는다.',
    startEra: 'AD', startYear: 824,
    endEra: 'AD', endYear: 1620,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.82, longitude: -1.64,
    linkToIsoCodes: ['ES', 'FR'],
  },
  {
    name: '아라곤 백국',
    enName: 'County of Aragon',
    nameOrigin:
      '피레네에서 흘러내리는 아라곤강의 이름에서 왔다.',
    description:
      '809년경 프랑크의 변경 조직 속에서 아스나르 갈린데스 1세가 받은 피레네 산속의 작은 백국. ' +
      '하카를 중심으로 세 골짜기를 다스렸을 뿐이나, 922년 팜플로나 왕국에 편입되어 나바라 왕가의 상속 재산이 되었다. ' +
      '1035년 산초 3세 대왕이 죽으며 서자 라미로 1세에게 남겨졌고, 라미로가 왕을 칭하면서 아라곤 왕국으로 올라섰다.',
    startEra: 'AD', startYear: 809,
    endEra: 'AD', endYear: 1035,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.57, longitude: -0.55,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '카스티야 백국',
    enName: 'County of Castile',
    nameOrigin:
      '라틴어 카스텔라(Castella) — "성채들"이라는 뜻이다. ' +
      '이슬람 세력과 맞댄 변경에 성을 촘촘히 쌓아 올린 땅이라 붙은 이름이다.',
    description:
      '850년경 아스투리아스·레온 왕의 변경 백작령으로 출발해 부르고스를 중심으로 자라난 백국. ' +
      '932년 페르난 곤살레스가 여러 백국을 하나로 묶고 레온 왕에게서 사실상의 자립을 얻어 세습 백국이 되었다. ' +
      '고트계 법전 대신 관습과 판례로 재판하는 독자적 법 전통, 그리고 자유로운 변경 정착민의 기질이 훗날 카스티야의 성격을 만들었다. ' +
      '1029년 백작 가문이 끊기자 나바라 산초 3세의 몫이 되었고, 1065년 왕국으로 올라섰다.',
    startEra: 'AD', startYear: 850,
    endEra: 'AD', endYear: 1065,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.34, longitude: -3.70,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '바르셀로나 백국',
    enName: 'County of Barcelona',
    nameOrigin:
      '도읍 바르셀로나에서 왔다. 프랑크가 이 일대에 둔 변경 조직의 이름 "히스파니아 변경령(Marca Hispanica)"이 ' +
      '카탈루냐라는 지역명의 유래로도 거론된다.',
    description:
      '801년 카롤루스 대제의 아들 루도비쿠스가 바르셀로나를 빼앗아 세운 프랑크의 변경 백국. ' +
      '878년 기프레 1세(털보 기프레) 이후 세습되었고, 985년 알만수르의 바르셀로나 약탈에 프랑크 왕이 구원을 보내지 않자 ' +
      '사실상 종주 관계가 끊겼다(988년 보렐 2세의 신종 거부). ' +
      '지중해 교역과 카탈루냐 관습법(우사트게스)을 기반으로 여러 카탈루냐 백국의 맹주가 되었다. ' +
      '1137년 백작 라몬 베렝게르 4세가 아라곤 여왕 페트로닐라와 약혼하면서 두 나라가 한 군주 아래 묶였고, ' +
      '1162년 그 아들 알폰소 2세가 백국과 왕국을 함께 이으면서 아라곤 연합왕국이 완성되었다.',
    startEra: 'AD', startYear: 801,
    endEra: 'AD', endYear: 1162,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.39, longitude: 2.17,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '카스티야 왕국 (초기)',
    enName: 'Kingdom of Castile (early)',
    nameOrigin:
      '1230년 레온과 영구 통합해 성립한 "카스티야 왕관"과 구분하기 위해 괄호 한정어를 붙였다 ' +
      "(세르비아 왕국 (근대)·크로아티아 왕국 (합스부르크) 판례).",
    description:
      '1065년 페르난도 1세가 죽으며 아들 산초 2세에게 카스티야를 왕국으로 남기면서 성립한 독립 왕국. ' +
      '알폰소 6세가 1085년 톨레도를 되찾아 타호강까지 내려갔고, 그 충격이 무라비트의 개입을 불렀다. ' +
      '엘 시드의 시대이자, 프랑스 수도원 개혁과 산티아고 순례길을 통해 유럽과 이어진 시기이기도 하다. ' +
      '레온과 갈라졌다 합쳤다를 거듭하다가 1230년 페르난도 3세가 두 왕관을 함께 쓰면서 ' +
      '카스티야 왕국(카스티야 왕관)으로 이어졌다.',
    startEra: 'AD', startYear: 1065,
    endEra: 'AD', endYear: 1230,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.34, longitude: -3.70,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '발렌시아 왕국',
    enName: 'Kingdom of Valencia',
    nameOrigin:
      '로마 식민시 발렌티아 에데타노룸(Valentia Edetanorum)에서 온 이름으로, 라틴어로 "용맹"을 뜻한다.',
    description:
      '1238년 10월 아라곤 왕 하이메 1세가 발렌시아를 정복한 뒤 아라곤에 병합하지 않고 따로 세운 왕국. ' +
      '아라곤 연합왕국을 이루는 세 기둥(아라곤·카탈루냐·발렌시아) 가운데 하나로, ' +
      '자체 의회(코르츠)와 「발렌시아 법전(Furs)」을 가졌고 발렌시아어가 공용어였다. ' +
      '15세기에는 지중해 무역과 실크 거래소(론하 데 라 세다)로 연합왕국에서 가장 부유한 지역이 되었다. ' +
      '에스파냐 왕위 계승 전쟁에서 오스트리아 편에 섰다가 1707년 알만사 패전 뒤 누에바 플란타 칙령으로 자치 제도를 모두 잃었다.',
    startEra: 'AD', startYear: 1238, startMonth: 10,
    endEra: 'AD', endYear: 1707,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 39.47, longitude: -0.38,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '마요르카 왕국',
    enName: 'Kingdom of Majorca',
    nameOrigin:
      '라틴어 인술라 마이오르(Insula Maior, 큰 섬)에서 온 섬 이름 마요르카를 그대로 국호로 삼았다.',
    description:
      '1229~1231년 하이메 1세가 발레아레스 제도를 정복한 뒤, 1276년 유언에 따라 둘째 아들 하이메 2세에게 떨어져 나온 왕국. ' +
      '발레아레스 제도와 피레네 북쪽의 루시용·세르다뉴, 그리고 몽펠리에 영지를 함께 다스린 지중해 교역 국가였다. ' +
      '팔마의 대성당과 해도 제작(마요르카 지도학파)이 이 시대의 유산이다. ' +
      '아라곤 본가의 봉신 지위를 강요받다 끝내 충돌했고, 1349년 류크마조르 전투에서 하이메 3세가 전사하며 아라곤에 재병합되었다. ' +
      '루시용·몽펠리에가 정체성의 한 축이라 ES·FR에 함께 잇는다.',
    startEra: 'AD', startYear: 1231,
    endEra: 'AD', endYear: 1349,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 39.57, longitude: 2.65,
    linkToIsoCodes: ['ES', 'FR'],
  },

  // ── 통합 스페인 ───────────────────────────────────────────────────
  {
    name: '스페인 제국',
    enName: 'Spanish Empire',
    nameOrigin:
      '당대의 공식 국호가 아니라 카스티야·아라곤 왕관이 거느린 해외 영토 전체를 가리키는 역사학의 이름이다 ' +
      '(에스파냐어 Imperio español). 당대에는 "스페인 군주국(Monarquía Hispánica)"이라 불렀다.',
    description:
      '1492년 콜럼버스의 항해를 카스티야 왕관이 후원하면서 시작되어 4세기 넘게 이어진 해외 제국. ' +
      '16세기 아메리카의 은과 마닐라 갈레온 항로를 쥐고 "해가 지지 않는 나라"로 불렸고, ' +
      '필리페 2세 시대에 절정에 이르렀다가 1588년 무적함대의 패배와 네덜란드 독립 전쟁으로 기울었다. ' +
      '1810~1820년대 아메리카 식민지가 잇달아 독립했고, 1898년 미서전쟁으로 쿠바·푸에르토리코·필리핀마저 잃었다. ' +
      '마지막 식민지 서사하라에서 1976년 철수하면서 제국의 역사가 닫혔다. ' +
      '본국의 여러 왕국·공화국 행과 겹쳐 등록하는 제국 행이다(대영제국 전례) — 모국 링크만 두고, ' +
      '속령은 규범 (C)대로 별도 행이 각자의 현대 국가를 잇는다.',
    startEra: 'AD', startYear: 1492,
    endEra: 'AD', endYear: 1976, endMonth: 2,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 40.42, longitude: -3.70,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '스페인 왕국 (부르봉)',
    enName: 'Kingdom of Spain (Bourbon)',
    nameOrigin:
      '1700년 프랑스 부르봉 가문이 스페인 왕위를 이어받은 데서 딴 한정어다. ' +
      '1874년 이후의 왕정복고기 및 1975년 이후의 현행 왕국 행과 구분하기 위해 붙였다.',
    description:
      '에스파냐 왕위 계승 전쟁(1701~1714)에서 이긴 펠리페 5세가 누에바 플란타 칙령으로 ' +
      '아라곤 연합왕국의 자치 제도를 없애고 카스티야의 제도로 전국을 통일하면서 성립한 단일 왕국. ' +
      '중앙집권적 관료제와 부르봉 개혁으로 근대 국가의 틀을 갖췄고, 카를로스 3세 시대에 계몽 개혁이 절정에 이르렀다. ' +
      '1808년 나폴레옹의 침입과 독립 전쟁, 1812년 카디스 헌법, 아메리카 식민지의 상실, ' +
      '세 차례 카를로스파 내전을 잇달아 겪으며 19세기를 보냈다. ' +
      '1868년 명예혁명으로 이사벨 2세가 쫓겨나고 1873년 제1공화국이 서면서 막을 내렸다.',
    startEra: 'AD', startYear: 1715,
    endEra: 'AD', endYear: 1873, endMonth: 2,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 40.42, longitude: -3.70,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '스페인 왕국 (보나파르트)',
    enName: 'Kingdom of Spain (Bonaparte)',
    nameOrigin:
      '나폴레옹의 형 조제프 보나파르트(스페인어 호세 1세)가 앉은 왕좌라 붙인 한정어다. ' +
      '스페인인들은 그를 "호세 병(甁)"이라 조롱했다.',
    description:
      '1808년 바욘 회담에서 부르봉 왕가를 퇴위시킨 나폴레옹이 형 조제프를 호세 1세로 앉히고 ' +
      '바욘 헌장을 내리며 세운 프랑스의 위성 왕국. ' +
      '5월 2일 마드리드 봉기로 시작된 독립 전쟁 탓에 실효 지배는 프랑스군이 주둔한 도시에 그쳤고, ' +
      '나머지 땅은 카디스의 섭정평의회와 게릴라가 장악했다. ' +
      '1812년 살라망카, 1813년 비토리아 전투의 패배로 무너졌고 호세 1세는 프랑스로 물러났다. ' +
      '단명한 괴뢰 체제라 entityKind는 REGIME이다(비시 프랑스 판례).',
    startEra: 'AD', startYear: 1808, startMonth: 7,
    endEra: 'AD', endYear: 1813, endMonth: 6,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 40.42, longitude: -3.70,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '스페인 제1공화국',
    enName: 'First Spanish Republic',
    description:
      '1873년 2월 아마데오 1세가 왕위를 내던지자 상하원 합동회의가 선포한 스페인 최초의 공화국. ' +
      '11개월 동안 대통령이 네 번 바뀌었고, 연방주의자들의 칸톤 봉기·제3차 카를로스파 전쟁·쿠바의 10년 전쟁을 동시에 감당해야 했다. ' +
      '연방 헌법 초안은 끝내 통과되지 못했다. ' +
      '1874년 1월 파비아 장군의 쿠데타로 의회가 해산되고, 그해 12월 마르티네스 캄포스의 선언으로 ' +
      '알폰소 12세가 즉위하면서 왕정이 복고되었다.',
    startEra: 'AD', startYear: 1873, startMonth: 2,
    endEra: 'AD', endYear: 1874, endMonth: 12,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 40.42, longitude: -3.70,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '스페인 왕국 (왕정복고)',
    enName: 'Kingdom of Spain (Restoration)',
    nameOrigin:
      '이 시기를 가리키는 역사 용어 "라 레스타우라시온(la Restauración)"에서 딴 한정어다.',
    description:
      '1874년 12월 사군토 선언으로 알폰소 12세가 즉위하며 되살아난 부르봉 왕정. ' +
      '1876년 헌법 아래 보수당과 자유당이 선거를 조작해 번갈아 집권하는 "투르니스모" 체제가 굳었고, ' +
      '지방 유력자(카시케)의 지배가 이를 떠받쳤다. ' +
      '1898년 미서전쟁 패배로 마지막 해외 식민지를 잃은 충격("98년의 재난")이 지식인 세대를 낳았고, ' +
      '이어 카탈루냐·바스크 민족주의와 노동운동이 거세졌다. ' +
      '1923년 프리모 데 리베라의 독재를 거쳐 1931년 4월 지방선거 참패 뒤 알폰소 13세가 망명하면서 끝났다.',
    startEra: 'AD', startYear: 1874, startMonth: 12,
    endEra: 'AD', endYear: 1931, endMonth: 4,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 40.42, longitude: -3.70,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '프리모 데 리베라 독재',
    enName: 'Dictatorship of Primo de Rivera',
    description:
      '1923년 9월 카탈루냐 총사령관 미겔 프리모 데 리베라가 쿠데타를 일으키고 ' +
      '알폰소 13세가 이를 추인하면서 세워진 군사 독재. ' +
      '헌법을 정지하고 의회를 해산했으며 애국연합이라는 단일 정당을 두었다. ' +
      '모로코 리프 전쟁을 알우세이마스 상륙(1925)으로 끝내고 대규모 토목사업을 벌였으나, ' +
      '재정 악화와 군부·대학의 이반으로 1930년 1월 사임했다. ' +
      '왕이 독재를 승인한 대가로 왕정 자체의 정통성이 무너져 이듬해 제2공화국을 불렀다. ' +
      '왕국 행과 겹치는 정권이라 entityKind는 REGIME이다(그리스 군사정권 판례).',
    startEra: 'AD', startYear: 1923, startMonth: 9,
    endEra: 'AD', endYear: 1930, endMonth: 1,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 40.42, longitude: -3.70,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '스페인 제2공화국',
    enName: 'Second Spanish Republic',
    description:
      '1931년 4월 14일 지방선거에서 공화파가 도시를 휩쓸자 알폰소 13세가 스페인을 떠나며 선포된 공화국. ' +
      '여성 참정권·이혼·농지개혁·정교분리를 담은 1931년 헌법을 제정했고, 카탈루냐에 자치를 주었다. ' +
      '좌우가 번갈아 집권하며 충돌이 거세지다 1936년 2월 인민전선의 승리 뒤 7월 군부 반란이 일어나 내전으로 들어갔다. ' +
      '1939년 3월 마드리드 함락과 4월 1일 종전 선언으로 무너졌으며, ' +
      '망명 정부는 1977년까지 이어졌다.',
    startEra: 'AD', startYear: 1931, startMonth: 4,
    endEra: 'AD', endYear: 1939, endMonth: 4,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 40.42, longitude: -3.70,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '스페인국',
    enName: 'Spanish State',
    nameOrigin:
      '프랑코 체제의 공식 국호 에스타도 에스파뇰(Estado Español)을 그대로 옮긴 이름이다. ' +
      '1947년 왕위계승법으로 스스로를 "왕국"으로 규정했으나 왕좌는 비워 두었다.',
    description:
      '1936년 10월 부르고스의 국방평의회가 프란시스코 프랑코를 국가원수 겸 총사령관으로 추대하면서 시작된 독재 체제. ' +
      '1939년 내전 승리로 전국을 장악한 뒤 팔랑헤당 일당 체제와 가톨릭 국교를 축으로 삼았다. ' +
      '2차 대전에서는 공식 중립을 지키며 청색사단만 동부전선에 보냈고, 전후 한동안 국제적으로 고립되었다가 ' +
      '1953년 미국과의 협정·1955년 유엔 가입으로 복귀했다. ' +
      '1959년 안정화 계획 이후의 고도성장을 "스페인의 기적"이라 부른다. ' +
      '1975년 11월 프랑코가 죽고 후안 카를로스 1세가 즉위하면서 민주화 이행이 시작되었다.',
    startEra: 'AD', startYear: 1936, startMonth: 10,
    endEra: 'AD', endYear: 1975, endMonth: 11,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 40.42, longitude: -3.70,
    linkToIsoCodes: ['ES'],
  },
  {
    name: '스페인 왕국',
    enName: 'Kingdom of Spain',
    nameOrigin:
      '정식 국호는 수식어 없는 "에스파냐(España)"이며, 헌법이 규정한 국가 형태가 의회군주제다. ' +
      '현대 국가 "스페인" 항목과 구분하기 위해 국가 형태를 붙여 행 이름으로 삼았다(루마니아 공화국 전례).',
    description:
      '1975년 11월 22일 후안 카를로스 1세가 즉위하면서 출범한 현행 스페인. ' +
      '1977년 첫 자유 총선, 1978년 헌법 제정, 1981년 2월 쿠데타 미수를 거쳐 민주주의를 정착시켰고, ' +
      '17개 자치주로 이루어진 자치 국가 체제를 세웠다. ' +
      '1982년 NATO, 1986년 유럽경제공동체에 가입했고 1992년 바르셀로나 올림픽과 세비야 엑스포를 치렀다. ' +
      '2014년 펠리페 6세가 즉위했으며, 카탈루냐 독립 문제가 오랜 현안으로 남아 있다.',
    startEra: 'AD', startYear: 1975, startMonth: 11,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 40.42, longitude: -3.70,
    linkToIsoCodes: ['ES'],
  },

  // ── 해외 속령 (규범 C — 종속·분리 영토는 별도 행) ─────────────────
  {
    name: '누에바에스파냐 부왕령',
    enName: 'Viceroyalty of New Spain',
    nameOrigin:
      '에스파냐어 비레이나토 데 누에바 에스파냐(Virreinato de Nueva España) — "새로운 스페인"이라는 뜻으로, ' +
      '코르테스가 정복지를 가리켜 쓴 이름이 그대로 굳었다.',
    description:
      '1535년 초대 부왕 안토니오 데 멘도사가 부임하면서 멕시코시티를 수도로 출범한 스페인 최초의 부왕령. ' +
      '오늘날 멕시코와 중앙아메리카, 미국 남서부·플로리다, 카리브해와 필리핀까지 관할했다. ' +
      '사카테카스·과나후아토의 은이 세비야와 마닐라 두 방향으로 흘러 세계 최초의 은 중심 교역망을 만들었다. ' +
      '1810년 이달고 신부의 봉기로 시작된 독립 전쟁 끝에 1821년 코르도바 조약으로 해체되었다. ' +
      '미국 남서부는 부왕령의 북쪽 변경(내부주)이라 US에도 함께 잇는다.',
    startEra: 'AD', startYear: 1535,
    endEra: 'AD', endYear: 1821, endMonth: 9,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 19.43, longitude: -99.13,
    linkToIsoCodes: ['MX', 'US'],
  },
  {
    name: '페루 부왕령',
    enName: 'Viceroyalty of Peru',
    description:
      '1542년 신법(Leyes Nuevas)으로 설치되어 리마를 수도로 남아메리카 대부분을 관할한 부왕령. ' +
      '포토시 은광(오늘날 볼리비아)이 제국 재정의 심장이었고, 미타라 불린 강제 노역이 이를 떠받쳤다. ' +
      '18세기에 누에바그라나다와 리오데라플라타가 떨어져 나가며 영역이 크게 줄었다. ' +
      '1780년 투팍 아마루 2세의 봉기, 1824년 아야쿠초 전투의 패배로 소멸했다. ' +
      '⚠️ 현대 페루·볼리비아·칠레·에콰도르가 아직 등록되지 않아 현대 국가 링크가 비어 있다(등록 시 이 시드 재실행으로 활성).',
    startEra: 'AD', startYear: 1542,
    endEra: 'AD', endYear: 1824, endMonth: 12,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: -12.05, longitude: -77.04,
    linkToIsoCodes: [],
  },
  {
    name: '누에바그라나다 부왕령',
    enName: 'Viceroyalty of New Granada',
    description:
      '1717년 페루 부왕령에서 갈라져 보고타를 수도로 설치된 부왕령. ' +
      '재정난으로 1723년 폐지되었다가 1739년 되살아났으며, 1777년 베네수엘라 도독령이 따로 떨어져 나갔다. ' +
      '1781년 코무네로스 봉기로 조세 저항이 터졌고, 1810년 이후 독립 전쟁의 무대가 되었다. ' +
      '1819년 8월 보야카 전투에서 볼리바르가 승리하면서 사실상 끝났다. ' +
      '중심 강역이 오늘날 콜롬비아라 CO에 잇는다(에콰도르·파나마는 미등록).',
    startEra: 'AD', startYear: 1717,
    endEra: 'AD', endYear: 1819, endMonth: 8,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 4.71, longitude: -74.07,
    linkToIsoCodes: ['CO'],
  },
  {
    name: '리오데라플라타 부왕령',
    enName: 'Viceroyalty of the Rio de la Plata',
    description:
      '1776년 포르투갈의 남대서양 진출을 막고 포토시 은의 유출을 통제하려 부에노스아이레스에 설치한 마지막 부왕령. ' +
      '오늘날 아르헨티나·우루과이·파라과이·볼리비아에 걸친 영역을 관할했다. ' +
      '1806~1807년 영국의 두 차례 침공을 현지 민병대가 스스로 물리치면서 자치 의식이 커졌고, ' +
      '1810년 5월 혁명으로 부왕이 쫓겨났다. 1814년 몬테비데오 함락으로 사실상 소멸했다. ' +
      '⚠️ 현대 아르헨티나·우루과이·파라과이·볼리비아가 아직 등록되지 않아 현대 국가 링크가 비어 있다.',
    startEra: 'AD', startYear: 1776,
    endEra: 'AD', endYear: 1814,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: -34.61, longitude: -58.38,
    linkToIsoCodes: [],
  },
  {
    name: '필리핀 도독령',
    enName: 'Captaincy General of the Philippines',
    nameOrigin:
      '에스파냐어 카피타니아 헤네랄 데 라스 필리피나스(Capitanía General de las Filipinas). ' +
      '군정권을 함께 쥔 총독(capitán general)이 다스리는 관구라 "도독령"으로 옮긴다. ' +
      '지명 필리핀은 황태자 시절의 펠리페 2세에서 왔다.',
    description:
      '1565년 미겔 로페스 데 레가스피의 세부 정착으로 시작해 1571년 마닐라를 수도로 삼은 스페인의 아시아 거점. ' +
      '1821년까지 누에바에스파냐 부왕의 관할 아래 있었고, 마닐라 갈레온이 아카풀코와 마닐라를 250년 동안 이었다. ' +
      '가톨릭 선교와 수도회 장원이 사회의 골격이 되었으며, 1863년 개항 이후 계몽 세대(일루스트라도스)가 자라났다. ' +
      '1896년 필리핀 혁명과 1898년 미서전쟁을 거쳐 그해 파리 조약으로 미국에 넘어갔다.',
    startEra: 'AD', startYear: 1565,
    endEra: 'AD', endYear: 1898, endMonth: 12,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 14.60, longitude: 120.98,
    linkToIsoCodes: ['PH'],
  },
  {
    name: '스페인령 모로코',
    enName: 'Spanish Protectorate in Morocco',
    description:
      '1912년 11월 프랑스와 맺은 협정으로 모로코 북부(리프)와 남부 타르파야 일대를 떼어 받아 세운 보호령. ' +
      '테투안을 수도로 삼았고 명목상으로는 술탄의 주권 아래 있었다. ' +
      '1921년 아누알 참패와 압델크림의 리프 공화국에 맞선 리프 전쟁(1921~1926)이 스페인 정치를 뒤흔들어 ' +
      '프리모 데 리베라 독재와 내전 발발의 배경이 되었다 — 1936년 7월 반란도 이곳 멜리야에서 시작되었다. ' +
      '1956년 4월 모로코 독립과 함께 반환되었다. ' +
      '⚠️ 현대 모로코가 아직 등록되지 않아 현대 국가 링크가 비어 있다.',
    startEra: 'AD', startYear: 1912, startMonth: 11,
    endEra: 'AD', endYear: 1956, endMonth: 4,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 35.57, longitude: -5.37,
    linkToIsoCodes: [],
  },
  {
    name: '스페인령 기니',
    enName: 'Spanish Guinea',
    description:
      '1778년 산일데폰소 조약으로 포르투갈에게서 페르난도 포섬과 아노본섬을 넘겨받은 데서 시작해, ' +
      '1900년 파리 조약으로 대륙 쪽 리오무니의 경계가 확정되며 자리 잡은 서아프리카 식민지. ' +
      '산타이사벨(오늘날 말라보)을 수도로 삼았고 카카오·목재 농원이 경제의 전부였다. ' +
      '1959년 본국의 해외주로 편입되었다가 1963년 자치를 얻었고, 1968년 10월 적도기니로 독립했다. ' +
      '⚠️ 현대 적도기니가 아직 등록되지 않아 현대 국가 링크가 비어 있다.',
    startEra: 'AD', startYear: 1778,
    endEra: 'AD', endYear: 1968, endMonth: 10,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 3.75, longitude: 8.78,
    linkToIsoCodes: [],
  },
  {
    name: '스페인령 사하라',
    enName: 'Spanish Sahara',
    description:
      '1884년 베를린 회담을 앞두고 리오데오로 연안을 보호령으로 선포한 데서 출발해 ' +
      '1958년 사기아엘함라와 합쳐 하나의 해외주가 된 북서아프리카 식민지. ' +
      '엘아이운을 수도로 삼았고 1960년대 부크라 인산염 광산 개발로 가치가 커졌다. ' +
      '1973년부터 폴리사리오 전선의 무장투쟁이 시작되었고, ' +
      '1975년 11월 마드리드 협정으로 모로코·모리타니에 행정권을 넘기고 1976년 2월 철수하면서 ' +
      '스페인 제국의 마지막 장이 닫혔다. 서사하라의 지위는 오늘날까지 미해결로 남아 있다. ' +
      '⚠️ 서사하라·모로코가 아직 등록되지 않아 현대 국가 링크가 비어 있다.',
    startEra: 'AD', startYear: 1884,
    endEra: 'AD', endYear: 1976, endMonth: 2,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 27.15, longitude: -13.20,
    linkToIsoCodes: [],
  },
]

/**
 * 다른 시드가 소유한 HC에 현대 스페인·포르투갈 연결만 보강(크로아티아 시드의 EXTRA_MODERN_LINKS 패턴).
 * - 로마 계열(공화국·제국·서로마)은 liberal 링크 정책 — 기원전 218년 제2차 포에니 전쟁으로 시작된
 *   히스파니아 경영은 기원전 19년 칸타브리아 전쟁으로 완성되어 반도 전역이 로마령이었고,
 *   트라야누스·하드리아누스·세네카·마르티알리스를 낸 제국의 정주 핵심부였다.
 *   그리스 시드의 '제국 주민 그 자체' 판정(규범 A)과 같은 자리다.
 * - 서로마 제국(395~476)도 히스파니아 관구를 그대로 물려받았다 — 409년 게르만 진입 이후에도
 *   타라코넨시스는 460년대까지 서로마 행정 아래 있었다.
 * - 오스만 제국에 ES를 달지 않는 것과 같은 이유로(규범 B) 카르타고 계열은 손대지 않는다.
 */
const EXTRA_MODERN_LINKS: { hcName: string; isoCode: string }[] = [
  { hcName: '로마 공화국', isoCode: 'ES' },
  { hcName: '로마 공화국', isoCode: 'PT' },
  { hcName: '로마 제국', isoCode: 'ES' },
  { hcName: '로마 제국', isoCode: 'PT' },
  { hcName: '서로마 제국', isoCode: 'ES' },
  { hcName: '서로마 제국', isoCode: 'PT' },
]

/**
 * 선재 행 백필 — 인물 시드가 만든 행의 NULL 필드만 채운다(아카이아 공국·알바니아 왕국 선례).
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
    // person.catholic-monarchs 시드 유래. 1230년 레온 통합 이후의 '카스티야 왕관'을 가리키는 행이다
    name: '카스티야 왕국',
    nameOrigin:
      '라틴어 카스텔라(Castella, 성채들)에서 온 이름으로, 변경에 성을 촘촘히 쌓은 땅이라는 뜻이다. ' +
      '1230년 레온과 영구 통합한 뒤의 정식 이름은 "카스티야 왕관(Corona de Castilla)"이며, ' +
      '1065~1230년의 앞선 왕국은 이 표에서 「카스티야 왕국 (초기)」로 따로 둔다.',
  },
  {
    name: '아라곤 왕국',
    nameOrigin:
      '피레네에서 흘러내리는 아라곤강에서 온 이름이다. ' +
      '1137년 바르셀로나 백국과 결합한 뒤의 정식 이름은 "아라곤 왕관(Corona de Aragón)"으로, ' +
      '아라곤 왕국·카탈루냐 공국·발렌시아 왕국·마요르카 왕국이 한 군주 아래 각자의 법과 의회를 유지한 복합 군주국이었다.',
  },
  {
    name: '포르투갈 왕국',
    nameOrigin:
      '도우루강 어귀의 두 도시 포르투스(Portus)와 칼레(Cale)를 합친 포르투칼레(Portucale)에서 왔다. ' +
      '이 항구 일대를 다스리던 포르투칼레 백국이 그대로 왕국의 이름이 되었다.',
  },
]

export async function seedSpainHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇪🇸 스페인 관련 역사 국가 시딩 시작...')

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

  // 타 시드 소유 HC → 현대 ES·PT 연결 보강
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

  console.log(`✅ 스페인 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
