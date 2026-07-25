import { HistoricalEntityKind, HistoricalStateType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

interface HistoricalCountryEntry {
  name: string
  enName?: string
  nameOrigin?: string
  description?: string
  startEra?: 'BC' | 'AD'
  startYear?: number
  startMonth?: number
  endEra?: 'BC' | 'AD'
  endYear?: number
  endMonth?: number
  stateType: HistoricalStateType
  entityKind?: HistoricalEntityKind
  latitude?: number
  longitude?: number
  linkToGermany: boolean
}

const ENTRIES: HistoricalCountryEntry[] = [
  // ── 게르만 고대 ───────────────────────────────────────────────────
  {
    name: '게르마니아',
    enName: 'Germania',
    description: '로마 문헌에서 기록된 라인강 동쪽 게르만족 거주 지역의 총칭. 단일 국가가 아닌 부족 연합체로 존재했다.',
    startEra: 'BC', startYear: 100,
    endEra: 'AD', endYear: 500,
    stateType: HistoricalStateType.TRIBAL_STATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.0, longitude: 10.0,
    linkToGermany: true,
  },
  {
    name: '프랑크 왕국',
    enName: 'Kingdom of the Franks',
    description: '클로비스 1세가 세운 게르만 왕국. 메로빙거·카롤링거 두 왕조를 거치며 서유럽 대부분을 지배, 훗날 프랑스·독일·이탈리아로 분열된다.',
    startEra: 'AD', startYear: 481,
    endEra: 'AD', endYear: 843,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 49.0, longitude: 7.0,
    linkToGermany: true,
  },
  {
    name: '동프랑크 왕국',
    enName: 'East Francia',
    description: '843년 베르됭 조약으로 프랑크 왕국에서 분리된 동부 영역. 독일의 직접적 전신이며 루트비히 2세(독일왕)가 초대 왕이다.',
    startEra: 'AD', startYear: 843,
    endEra: 'AD', endYear: 962,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.5, longitude: 10.5,
    linkToGermany: true,
  },

  // ── 신성로마제국 계열 ─────────────────────────────────────────────
  {
    name: '신성로마제국',
    enName: 'Holy Roman Empire',
    description: '962년 오토 1세 대관식으로 시작된 중세 유럽의 복합 제국. 독일 국민의 신성 로마 제국이라고도 불리며, 1806년 나폴레옹의 압박으로 해체되었다.',
    startEra: 'AD', startYear: 962,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.0, longitude: 10.0,
    linkToGermany: true,
  },
  {
    name: '독일 왕국',
    enName: 'Kingdom of Germany',
    description: '신성로마제국 내 독일 지역의 왕국. 동프랑크 왕국의 후신으로 황제는 동시에 독일왕을 겸임했다.',
    startEra: 'AD', startYear: 962,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.0, longitude: 10.0,
    linkToGermany: true,
  },
  {
    name: '작센 공국',
    enName: 'Duchy of Saxony',
    nameOrigin:
      '게르만계 작센족(Sachsen)의 이름에서 유래했으며, 이들이 쓰던 외날 검 "작스(sahs/seax)"에서 나온 것으로 본다.',
    description:
      '804년 카롤루스 대제의 작센 정복으로 프랑크 왕국에 편입된 작센족 지역이 843년 베르됭 조약 이후 동프랑크의 부족공국(Stammesherzogtum)으로 자리 잡으며 성립. ' +
      '리우돌프 가문에서 하인리히 1세가 919년 독일 왕으로 선출되어 오토 왕조의 모태가 되었고, 이후 빌룽 가문(961~1106)·주플린부르크 가문을 거쳤다. ' +
      '벨프 가문의 하인리히 사자공이 바이에른까지 겸해 최대 판도를 이뤘으나 1180년 황제 프리드리히 1세에게 제국추방형을 받고 몰락하면서 공국이 해체되었다. ' +
      '이때 서부는 쾰른 대주교의 베스트팔렌 공국 등으로 쪼개졌고, 공작 칭호와 엘베강 유역 동부는 아스카니아 가문의 베른하르트가 이어받았다. ' +
      '1296년 아스카니아 영지가 작센-비텐베르크와 작센-라우엔부르크로 분할되며 통일 공국은 소멸했고, ' +
      '작센-비텐베르크가 1356년 금인칙서로 선제후 지위를 얻어 작센 선제후국이 되었다.',
    startEra: 'AD', startYear: 804,
    endEra: 'AD', endYear: 1296,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.27, longitude: 10.52,
    linkToGermany: true,
  },
  {
    name: '프랑켄 공국',
    enName: 'Duchy of Franconia',
    nameOrigin:
      '이 지역에 정착한 프랑크족(Franken)의 이름에서 유래했으며, 라틴어 "프랑코니아(Franconia)"는 "(동)프랑크인의 땅"을 뜻한다. ' +
      '서프랑크(프랑스)와 구분되는 프랑크족 본향으로, 오늘날 독일 바이에른 북부(오버·미텔·운터프랑켄)에 그 이름이 남아 있다.',
    description:
      '906년 콘라딘 가문 아래 마인강 유역에 성립한 신성로마제국의 부족공국(Stammesherzogtum). ' +
      '911년 공작 콘라트 1세가 카롤링거 왕조 단절 후 동프랑크(독일) 국왕으로 선출될 만큼 왕국의 심장부였다. ' +
      '939년 공작 에버하르트가 오토 1세에 맞선 반란에서 전사한 뒤 국왕이 새 공작을 임명하지 않아 여러 백작령·주교령으로 분열해 국왕 직속령이 되었다. ' +
      '1168년 황제 프리드리히 1세(바르바로사)가 뷔르츠부르크 주교에게 프랑켄 공작 칭호를 수여했고, 주교들은 1803년 세속화까지 이를 유지했다. 뷔르츠부르크가 중심지였다.',
    startEra: 'AD', startYear: 906,
    endEra: 'AD', endYear: 1168,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 49.79, longitude: 9.93,
    linkToGermany: true,
  },
  {
    name: '슈바벤 공국',
    enName: 'Duchy of Swabia',
    nameOrigin:
      '이 지역에 정착한 게르만계 슈바벤족(Schwaben)의 이름에서 유래했다. 초기에는 같은 지역을 아우르던 부족 이름을 따 "알레마니아(Alemannia)"로도 불렸으며, ' +
      '오늘날 여러 로망스어에서 독일을 가리키는 말(프랑스어 Allemagne 등)의 어원이 되었다.',
    description:
      '알레만니아 부족 영역에서 성장한 신성로마제국의 부족공국(Stammesherzogtum). 915년 팔츠 백작 에르칸거가 공작을 칭했다가 처형된 뒤 ' +
      '917년경 부르하르트 2세가 안정적 통치를 확립했다. 1079년부터 1268년까지 (짧은 중단을 빼고) 호엔슈타우펜 가문이 다스렸으며, ' +
      '이 시기 다수의 신성로마황제(프리드리히 1세 바르바로사, 프리드리히 2세 등)를 배출한 제국의 심장부였다. ' +
      '1268년 마지막 호엔슈타우펜 공작 콘라딘이 처형되면서 공국은 실질적으로 소멸해 뷔르템베르크·바덴 등 수많은 백작령·자유도시로 분열했고, ' +
      '루돌프 1세가 1289년 아들에게 작위를 주어 잠시 부활을 시도했으나 1313년경 완전히 사라졌다. 고정된 수도는 없었다.',
    startEra: 'AD', startYear: 915,
    endEra: 'AD', endYear: 1268,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.52, longitude: 9.06,
    linkToGermany: true,
  },
  {
    name: '브란덴부르크 선제후국',
    enName: 'Margraviate of Brandenburg',
    description: '신성로마제국의 선제후국 중 하나. 호엔촐레른 가문이 지배하며 훗날 프로이센 왕국으로 발전하는 핵심 영토.',
    startEra: 'AD', startYear: 1157,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.ELECTORATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },
  {
    name: '마이센 변경백령',
    enName: 'Margraviate of Meissen',
    description:
      '965년 오토 1세가 엘베강 동쪽 소르브인 지역에 세운 신성로마제국의 동방 변경백령. ' +
      '1089년부터 베틴 가문이 지배하며 작센 지역의 핵심 세력으로 성장했고, ' +
      '1423년 변경백 프리드리히 4세(호전공)가 작센-비텐베르크 공국과 선제후 지위를 받으면서 작센 선제후국으로 통합되었다.',
    startEra: 'AD', startYear: 965,
    endEra: 'AD', endYear: 1423,
    stateType: HistoricalStateType.MARGRAVIATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.16, longitude: 13.47,
    linkToGermany: true,
  },
  {
    name: '작센 선제후국',
    enName: 'Electorate of Saxony',
    description: '신성로마제국의 선제후국. 마르틴 루터의 종교개혁을 지원한 프리드리히 3세(현명공)가 통치했으며, 독일 문화·음악의 중심지.',
    startEra: 'AD', startYear: 1356,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.ELECTORATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.0, longitude: 13.7,
    linkToGermany: true,
  },
  {
    name: '팔츠 선제후국',
    enName: 'Electorate of the Palatinate',
    description: '라인 팔츠 지역의 신성로마제국 선제후국. 30년 전쟁의 발단이 된 프리드리히 5세가 통치했다.',
    startEra: 'AD', startYear: 1356,
    endEra: 'AD', endYear: 1803,
    stateType: HistoricalStateType.ELECTORATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 49.5, longitude: 8.4,
    linkToGermany: true,
  },
  {
    name: '바이에른 공국',
    enName: 'Duchy of Bavaria',
    description:
      '중세 독일의 대표적 부족 공국(슈탐 공국). 6세기 중엽 아길롤핑 가문 아래 성립해 프랑크 왕국의 종주권 아래 있었고, ' +
      '카롤링거 직할기를 거쳐 907년 부족 공국으로 재건되었다. 1180년부터 비텔스바흐 가문이 지배했으며, ' +
      '30년 전쟁 중이던 1623년 막시밀리안 1세가 선제후 지위를 획득하며 바이에른 선제후국으로 승격되었다.',
    startEra: 'AD', startYear: 555,
    endEra: 'AD', endYear: 1623,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.1, longitude: 11.6,
    linkToGermany: true,
  },
  {
    name: '바이에른 선제후국',
    enName: 'Electorate of Bavaria',
    description: '비텔스바흐 가문이 지배한 신성로마제국의 선제후국. 30년 전쟁에서 가톨릭 동맹의 주축이었다.',
    startEra: 'AD', startYear: 1623,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.ELECTORATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.1, longitude: 11.6,
    linkToGermany: true,
  },
  {
    name: '하노버 선제후국',
    enName: 'Electorate of Hanover',
    description: '벨펜 가문이 지배한 신성로마제국 선제후국. 1714년 게오르크 1세가 영국 왕을 겸하며 영국 하노버 왕조의 기원이 되었다.',
    startEra: 'AD', startYear: 1692,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.ELECTORATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.4, longitude: 9.7,
    linkToGermany: true,
  },
  {
    name: '헤센-카셀 방백령',
    enName: 'Landgraviate of Hesse-Kassel',
    description: '헤센 지역에 위치한 신성로마제국의 방백령. 용병 수출로 유명했으며, 미국 독립전쟁 당시 영국에 헤센 용병을 파견했다.',
    startEra: 'AD', startYear: 1567,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.3, longitude: 9.5,
    linkToGermany: true,
  },
  {
    name: '헤센-다름슈타트 방백령',
    enName: 'Landgraviate of Hesse-Darmstadt',
    description: '헤센 지역 남부의 방백령. 나폴레옹 전쟁 후 대공국으로 승격되어 헤센 대공국이 된다.',
    startEra: 'AD', startYear: 1567,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 49.9, longitude: 8.7,
    linkToGermany: true,
  },
  {
    name: '뷔르템베르크 공국',
    enName: 'Duchy of Württemberg',
    description: '슈바벤 지역의 공국. 종교개혁의 영향을 받아 루터교를 채택했으며 나중에 왕국으로 승격된다.',
    startEra: 'AD', startYear: 1495,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.7, longitude: 9.2,
    linkToGermany: true,
  },
  {
    name: '바덴 변경백령',
    enName: 'Margraviate of Baden',
    description: '라인강 동쪽 바덴 지역의 변경백령. 여러 차례 분할·통합을 거쳐 나폴레옹 시기 대공국으로 승격된다.',
    startEra: 'AD', startYear: 1112,
    endEra: 'AD', endYear: 1806,
    stateType: HistoricalStateType.MARGRAVIATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.5, longitude: 8.0,
    linkToGermany: true,
  },
  {
    name: '뮌스터 주교령',
    enName: 'Prince-Bishopric of Münster',
    description: '베스트팔렌 지역의 교회 영주국. 1648년 베스트팔렌 조약이 이 도시에서 체결되었다.',
    startEra: 'AD', startYear: 1180,
    endEra: 'AD', endYear: 1803,
    stateType: HistoricalStateType.THEOCRACY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.9, longitude: 7.6,
    linkToGermany: true,
  },

  // ── 프로이센 계열 ─────────────────────────────────────────────────
  {
    name: '프로이센 공국',
    enName: 'Duchy of Prussia',
    description: '튜턴 기사단의 세속화로 탄생한 공국. 호엔촐레른 가문이 브란덴부르크와 동군연합을 이루며 성장했다.',
    startEra: 'AD', startYear: 1525,
    endEra: 'AD', endYear: 1618,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 54.7, longitude: 20.5,
    linkToGermany: true,
  },
  {
    name: '브란덴부르크-프로이센',
    enName: 'Brandenburg-Prussia',
    description: '브란덴부르크 선제후국과 프로이센 공국의 동군연합. 17세기 급속히 팽창하여 프로이센 왕국의 전신이 된다.',
    startEra: 'AD', startYear: 1618,
    endEra: 'AD', endYear: 1701,
    stateType: HistoricalStateType.PERSONAL_UNION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },
  {
    name: '프로이센 왕국',
    enName: 'Kingdom of Prussia',
    description: '1701년 프리드리히 1세가 선포한 왕국. 프리드리히 대왕 시기 오스트리아와 패권을 다투며 강국으로 부상했고, 1871년 독일 통일을 주도했다.',
    startEra: 'AD', startYear: 1701,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },

  // ── 나폴레옹 시기 ─────────────────────────────────────────────────
  {
    name: '라인 연방',
    enName: 'Confederation of the Rhine',
    description: '나폴레옹이 신성로마제국 해체 후 1806년 창설한 독일 서부 제후국 연합. 나폴레옹의 보호국으로 프랑스 제국의 위성 국가들로 구성되었다.',
    startEra: 'AD', startYear: 1806,
    endEra: 'AD', endYear: 1813,
    stateType: HistoricalStateType.CONFEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.0, longitude: 8.0,
    linkToGermany: true,
  },
  {
    name: '베스트팔렌 왕국',
    enName: 'Kingdom of Westphalia',
    description: '나폴레옹이 동생 제롬 보나파르트를 위해 세운 위성 왕국. 1807~1813년 존속했다.',
    startEra: 'AD', startYear: 1807,
    endEra: 'AD', endYear: 1813,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.5, longitude: 9.5,
    linkToGermany: true,
  },
  {
    name: '바이에른 왕국',
    enName: 'Kingdom of Bavaria',
    description: '나폴레옹의 지원으로 1806년 왕국으로 승격된 바이에른. 1871년 독일 제국에 합류했으나 왕국 지위를 유지하다가 1918년 혁명으로 폐지되었다.',
    startEra: 'AD', startYear: 1806,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.1, longitude: 11.6,
    linkToGermany: true,
  },
  {
    name: '뷔르템베르크 왕국',
    enName: 'Kingdom of Württemberg',
    description: '나폴레옹의 지원으로 1806년 왕국으로 승격. 1871년 독일 제국 합류, 1918년 혁명으로 소멸.',
    startEra: 'AD', startYear: 1806,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.7, longitude: 9.2,
    linkToGermany: true,
  },
  {
    name: '작센 왕국',
    enName: 'Kingdom of Saxony',
    description: '1806년 왕국으로 승격된 작센. 1813년 라이프치히 전투 후 프로이센에 영토를 잃었으나 왕국을 유지하다 1918년 소멸.',
    startEra: 'AD', startYear: 1806,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.0, longitude: 13.7,
    linkToGermany: true,
  },
  {
    name: '하노버 왕국',
    enName: 'Kingdom of Hanover',
    description: '1814년 하노버 선제후국에서 왕국으로 승격. 1866년 프로이센-오스트리아 전쟁 후 프로이센에 병합되었다.',
    startEra: 'AD', startYear: 1814,
    endEra: 'AD', endYear: 1866,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.4, longitude: 9.7,
    linkToGermany: true,
  },
  {
    name: '헤센 선제후국',
    enName: 'Electorate of Hesse',
    description: '헤센-카셀이 1803년 선제후국으로 승격된 국가. 1866년 프로이센에 병합되었다.',
    startEra: 'AD', startYear: 1803,
    endEra: 'AD', endYear: 1866,
    stateType: HistoricalStateType.ELECTORATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.3, longitude: 9.5,
    linkToGermany: true,
  },
  {
    name: '헤센 대공국',
    enName: 'Grand Duchy of Hesse',
    description: '헤센-다름슈타트가 1806년 대공국으로 승격된 국가. 1918년 혁명으로 소멸.',
    startEra: 'AD', startYear: 1806,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 49.9, longitude: 8.7,
    linkToGermany: true,
  },
  {
    name: '바덴 대공국',
    enName: 'Grand Duchy of Baden',
    description: '1806년 바덴 변경백령에서 대공국으로 승격. 독일 제국의 구성국으로 1918년까지 존속.',
    startEra: 'AD', startYear: 1806,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 48.5, longitude: 8.0,
    linkToGermany: true,
  },

  // ── 작센 소공국 ─────────────────────────────────────────────────────
  {
    name: '작센코부르크잘펠트 공국',
    enName: 'Duchy of Saxe-Coburg-Saalfeld',
    description: '에른스트 왕조의 작센 소공국. 1699년 분립하여 작센코부르크와 잘펠트 지역을 통치했다. 1826년 영토 재편을 통해 작센코부르크고타 공국으로 전환되었다. 빅토리아 여왕의 어머니 빅토리아 공녀의 친정이다.',
    startEra: 'AD', startYear: 1699,
    endEra: 'AD', endYear: 1826,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.26, longitude: 10.96,
    linkToGermany: true,
  },
  {
    name: '작센코부르크고타 공국',
    enName: 'Duchy of Saxe-Coburg and Gotha',
    description: '1826년 작센코부르크잘펠트 공국의 재편으로 성립된 소공국. 에른스트 1세가 초대 공작이다. 앨버트 공의 출신지로, 빅토리아 여왕과의 결혼으로 영국 왕실에 작센코부르크고타 왕가 이름을 남겼다. 1918년까지 존속했다.',
    startEra: 'AD', startYear: 1826,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.26, longitude: 10.96,
    linkToGermany: true,
  },

  // ── 독일 연방 ─────────────────────────────────────────────────────
  {
    name: '독일 연방',
    enName: 'German Confederation',
    description: '1815년 빈 회의 결과 설립된 39개 독일어권 국가의 느슨한 연합체. 오스트리아와 프로이센의 패권 다툼 속에 1866년 해체되었다.',
    startEra: 'AD', startYear: 1815,
    endEra: 'AD', endYear: 1866,
    stateType: HistoricalStateType.CONFEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 51.0, longitude: 10.0,
    linkToGermany: true,
  },
  {
    name: '북독일 연방',
    enName: 'North German Confederation',
    description: '1866년 프로이센이 오스트리아를 누르고 주도한 북독일 국가 연합. 독일 제국의 직접적 전신이다.',
    startEra: 'AD', startYear: 1867,
    endEra: 'AD', endYear: 1871,
    stateType: HistoricalStateType.FEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.0, longitude: 11.0,
    linkToGermany: true,
  },

  // ── 독일 제국 및 이후 ──────────────────────────────────────────────
  {
    name: '독일 제국',
    enName: 'German Empire',
    description: '1871년 프로이센의 주도로 통일된 독일 국민국가. 빌헬름 1세가 베르사유 궁전에서 황제로 선포되었으며, 1차 세계대전 패전 후 1918년 붕괴했다.',
    startEra: 'AD', startYear: 1871,
    endEra: 'AD', endYear: 1918,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },
  {
    name: '바이마르 공화국',
    enName: 'Weimar Republic',
    description: '1918년 독일 혁명 후 수립된 민주 공화국. 초인플레이션, 대공황, 정치적 불안정을 거쳐 1933년 나치에 의해 사실상 종식되었다.',
    startEra: 'AD', startYear: 1919,
    endEra: 'AD', endYear: 1933,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },
  {
    name: '나치 독일 (제3제국)',
    enName: 'Nazi Germany (Third Reich)',
    description: '아돌프 히틀러의 국가사회주의 독일 노동자당이 지배한 전체주의 국가. 2차 세계대전을 일으켰으며 1945년 패전으로 붕괴했다.',
    startEra: 'AD', startYear: 1933,
    endEra: 'AD', endYear: 1945,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },
  {
    name: '연합군 점령하 독일',
    enName: 'Allied-Occupied Germany',
    description: '1945년 2차 세계대전 종전 후 미국·영국·프랑스·소련 4개국이 독일을 분할 점령한 시기.',
    startEra: 'AD', startYear: 1945,
    endEra: 'AD', endYear: 1949,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.PERIOD,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },
  {
    name: '독일 민주 공화국 (동독)',
    enName: 'German Democratic Republic',
    description: '소련 점령 지역에 수립된 사회주의 국가. 베를린 장벽 건설로 상징되는 냉전의 최전선으로, 1990년 독일 재통일로 서독에 편입되었다.',
    startEra: 'AD', startYear: 1949,
    endEra: 'AD', endYear: 1990,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 52.5, longitude: 13.4,
    linkToGermany: true,
  },
  {
    name: '독일 연방 공화국 (서독)',
    enName: 'Federal Republic of Germany (West Germany)',
    description: '미국·영국·프랑스 점령 지역에 수립된 자유민주주의 국가. 라인강의 기적으로 경제 부흥을 이루었으며, 1990년 동독을 흡수하여 현재의 독일로 재통일되었다.',
    startEra: 'AD', startYear: 1949,
    endEra: 'AD', endYear: 1990,
    stateType: HistoricalStateType.FEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.5, longitude: 8.0,
    linkToGermany: true,
  },
]

export async function seedGermanyHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🏰 독일 관련 역사 국가 시딩 시작...')

  const modernGermany = await prisma.country.findFirst({
    where: { isoCode: 'DE' },
    select: { id: true },
  })
  if (!modernGermany) {
    console.warn('  ⚠️  현대 독일(DE) 국가를 찾을 수 없습니다.')
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
          startEra: entry.startEra as any,
          startYear: entry.startYear,
          endEra: entry.endEra as any,
          endYear: entry.endYear,
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

    // 독일 현대 국가와 연결
    if (entry.linkToGermany && modernGermany) {
      const linkExists = await prisma.historicalCountryModernCountry.findFirst({
        where: { historicalCountryId: id, modernCountryId: modernGermany.id },
      })
      if (!linkExists) {
        await prisma.historicalCountryModernCountry.create({
          data: { historicalCountryId: id, modernCountryId: modernGermany.id },
        })
      }
    }
  }

  console.log(`✅ 독일 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
