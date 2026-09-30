import { HistoricalEntityKind, HistoricalStateType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

interface HistoricalCountryEntry {
  name: string
  enName?: string
  /** 국명 유래 — 이 필드를 도입하기 전 항목들은 비어 있다(선재 행은 덮어쓰지 않음) */
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
  linkToIsoCodes: string[]
}

const ENTRIES: HistoricalCountryEntry[] = [
  // ── 고대 로마 ─────────────────────────────────────────────────────
  {
    name: '로마 왕국',
    enName: 'Kingdom of Rome',
    description: '전설에 따르면 기원전 753년 로물루스가 건국한 로마의 초기 군주정 국가. 7명의 왕이 차례로 통치하였으며 라틴·에트루리아·사비니 등 여러 민족의 영향 아래 로마 문명의 기초를 놓았다. 기원전 509년 에트루리아 계열의 왕 타르퀴니우스 수페르부스가 귀족 세력에 의해 추방되면서 공화정이 수립되었다.',
    startEra: 'BC', startYear: 753,
    endEra: 'BC', endYear: 509,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.9, longitude: 12.5,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '로마 공화국',
    enName: 'Roman Republic',
    description: '기원전 509년 왕정을 타도한 귀족들이 수립한 공화정 국가. 두 명의 집정관이 공동으로 최고 권력을 행사하였으며 원로원이 국정의 중심 기관으로 기능했다. 포에니 전쟁으로 카르타고를 멸망시키고 지중해 전역으로 세력을 확장했다. 기원전 1세기 율리우스 카이사르의 독재와 그 후 옥타비아누스의 집권으로 공화정 체제가 사실상 붕괴되었다.',
    startEra: 'BC', startYear: 509,
    endEra: 'BC', endYear: 27,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.9, longitude: 12.5,
    linkToIsoCodes: ['IT', 'FR', 'DE', 'TR', 'EG'],
  },
  {
    name: '로마 제국',
    enName: 'Roman Empire',
    description: '기원전 27년 옥타비아누스(아우구스투스)가 초대 황제가 되면서 수립된 제국. 오현제 시대(96~180)에 최전성기를 누리며 유럽·북아프리카·서아시아에 걸쳐 약 500만㎢의 영토를 지배했다. 로마법·라틴어·그리스도교 등 서구 문명의 근간을 형성하였으며, 395년 테오도시우스 1세 사후 동서로 분열되었다.',
    startEra: 'BC', startYear: 27,
    endEra: 'AD', endYear: 395,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.9, longitude: 12.5,
    // HR(달마티아·스플리트)·RS(모이시아·싱기두눔=베오그라드)는 기존 10개국과 동급 속주라 보강
    // SI(에모나=류블랴나)는 slovenia 시드 EXTRA_MODERN_LINKS가 담당
    linkToIsoCodes: ['IT', 'FR', 'DE', 'GB', 'TR', 'RO', 'BG', 'HU', 'AT', 'EG', 'HR', 'RS'],
  },
  {
    name: '서로마 제국',
    enName: 'Western Roman Empire',
    description: '395년 테오도시우스 1세 사후 로마 제국이 동서로 분열되면서 성립한 서쪽 절반의 제국. 게르만 민족의 대이동으로 끊임없는 침략을 받았으며 서서히 약화되었다. 476년 게르만 용병대장 오도아케르가 마지막 황제 로물루스 아우구스툴루스를 폐위시키면서 서로마 제국이 멸망하고 서유럽의 고대가 막을 내렸다.',
    startEra: 'AD', startYear: 395,
    endEra: 'AD', endYear: 476,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.9, longitude: 12.5,
    // AT(노리쿰)·HR(달마티아 — 395 분할에서 서방 배속, 네포스의 거점)는 전 기간 서로마령이라 보강.
    // RO는 다키아가 271년(서로마 성립 120년 전) 포기됐고 아우렐리아누스 다키아는 다뉴브 이남
    // (동방 일리리쿰)이라 영토 사실 오류로 제거(적대 검증 판정). SI는 slovenia 시드 EXTRA가 담당
    linkToIsoCodes: ['IT', 'FR', 'DE', 'GB', 'AT', 'HR'],
  },

  // ── 민족 이동기 ───────────────────────────────────────────────────
  // 476~493 — 서로마 멸망과 동고트 사이 17년. 이 행이 없을 땐 서로마→동고트가 바로 이어져 공백이 가려졌다.
  {
    name: '오도아케르 왕국',
    enName: 'Kingdom of Odoacer',
    nameOrigin:
      '왕의 이름 오도아케르(Odoacer, Odovacar)에서 왔다. 스스로는 이탈리아 왕(rex Italiae) 또는 ' +
      '민족들의 왕(rex gentium)을 칭했고, 학계에서는 흔히 "오도아케르의 이탈리아 왕국"이라 부른다.',
    description:
      '476년 게르만 용병대장 오도아케르가 서로마의 마지막 황제 로물루스 아우구스툴루스를 폐위하고 라벤나를 ' +
      '수도로 세운 이탈리아 왕국. 황제의 휘장을 콘스탄티노폴리스로 돌려보내 동로마 황제 제논의 명목상 종주권을 ' +
      '인정하고 파트리키우스 칭호로 다스렸으며, 로마 원로원과 행정 조직을 그대로 두었다. 반달족에게서 시칠리아를 ' +
      '돌려받고(477) 달마티아를 병합했으며(481), 루기족을 쳐 노리쿰을 정리했다(487~488). 그러나 제논의 사주를 받은 ' +
      '동고트 왕 테오도리쿠스가 489년 이탈리아에 침입해 3년에 걸친 라벤나 포위 끝에 493년 화약을 맺었고, 연회에서 ' +
      '오도아케르를 직접 살해하면서 동고트 왕국으로 넘어갔다.',
    startEra: 'AD', startYear: 476, startMonth: 9,
    endEra: 'AD', endYear: 493, endMonth: 3,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.42, longitude: 12.2,
    // 달마티아(481~)·노리쿰은 획득·주변부라 단일 링크(규범 B)
    linkToIsoCodes: ['IT'],
  },
  {
    name: '동고트 왕국',
    enName: 'Ostrogothic Kingdom',
    description: '493년 동고트족 왕 테오도리쿠스 대왕이 오도아케르를 물리치고 이탈리아 반도 전역을 장악하여 세운 왕국. 로마의 행정 체계를 유지하며 로마·고트 문명의 공존을 꾀했으나, 유스티니아누스 1세가 파견한 동로마 장군 벨리사리우스의 원정(535~554)으로 멸망하였다.',
    startEra: 'AD', startYear: 493,
    endEra: 'AD', endYear: 553,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.0, longitude: 12.0,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '랑고바르드 왕국',
    enName: 'Lombard Kingdom',
    description: '568년 게르만계 랑고바르드족이 이탈리아 북부를 침략하여 세운 왕국. 북이탈리아의 롬바르디아 평원(지명 유래)을 중심으로 번영하였으며, 교황령 및 비잔티움 제국과 대립했다. 774년 카롤루스 대제(샤를마뉴)가 침공하여 랑고바르드 왕국을 병합하고 이탈리아의 왕위를 겸하였다.',
    startEra: 'AD', startYear: 568,
    endEra: 'AD', endYear: 774,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.5, longitude: 9.2,
    linkToIsoCodes: ['IT'],
  },
  // 랑고바르드 왕국의 남·중부 두 대공국 — 왕국 본토(북부)와 동로마령 로마·라벤나 회랑에 가로막혀
  // 사실상 독자 세력으로 움직였다. 774년 왕국이 망한 뒤에도 각자 수백 년 존속해 별도 행으로 둔다.
  {
    name: '스폴레토 공국',
    enName: 'Duchy of Spoleto',
    nameOrigin:
      '수도 스폴레토(라틴어 Spoletium)에서 왔다. 움브리아의 옛 도시 이름으로, 공국은 이탈리아어로 Ducato di Spoleto라 한다.',
    description:
      '570년 무렵 랑고바르드 장수 파로알드 1세가 움브리아의 스폴레토를 거점으로 세운 공국. 북부의 왕국 본토와는 ' +
      '로마-라벤나를 잇는 동로마 회랑으로 떨어져 있어, 이름뿐인 왕권 아래 사실상 독자적으로 움브리아·마르케·아브루초 ' +
      '일대를 다스렸다. 774년 카롤루스 대제가 랑고바르드 왕국을 무너뜨린 뒤 776년 프랑크의 공작령으로 편입되었고, ' +
      '9세기에는 귀도 가문(귀데스키)의 공작 귀도 3세·람베르토가 이탈리아 왕과 황제 자리까지 차지했다. 이후 신성로마제국 ' +
      '이탈리아 왕국의 봉토로 이어지다가, 1198년 교황 인노첸시오 3세가 황제파 공작 콘라트 폰 우르슬링겐을 몰아내고 ' +
      '교황령에 병합했다(1201년 오토 4세, 1213년 프리드리히 2세가 확인).',
    startEra: 'AD', startYear: 570,
    endEra: 'AD', endYear: 1198,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.73, longitude: 12.74,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '베네벤토 공국',
    enName: 'Duchy of Benevento',
    nameOrigin:
      '수도 베네벤토(라틴어 Beneventum)에서 왔다. 본래 이름 Maleventum(나쁜 바람)이 불길하다 하여 기원전 268년 ' +
      '로마가 Beneventum(좋은 바람)으로 고쳤다고 전한다. 774년 이후의 군주국(Principality of Benevento)도 이 행에 포함한다.',
    description:
      '571년 무렵 랑고바르드 장수 초토가 캄파니아 내륙의 베네벤토를 거점으로 세운 공국. 왕국 본토에서 멀리 떨어진 ' +
      '남이탈리아 최대의 랑고바르드 세력으로, 동로마령 나폴리·아말피·칼라브리아와 경쟁하며 남부 대부분을 차지했다. ' +
      '774년 랑고바르드 왕국이 프랑크에 멸망하자 공작 아레키스 2세가 스스로 군주(princeps)를 칭해 독립 군주국이 ' +
      '되었고, 787년 카롤루스 대제에게 조공을 약속했으나 실질적 독립을 지켰다. 9세기 내전 끝에 849년 살레르노 ' +
      '군주국이 떨어져 나가고 이후 카푸아도 갈라지면서 약해졌으며, 11세기 노르만의 남하 속에 1077년 마지막 군주 ' +
      '란돌포 6세가 후사 없이 죽자 도시 베네벤토는 교황령이 되고 나머지 영토는 노르만에게 넘어갔다.',
    startEra: 'AD', startYear: 571,
    endEra: 'AD', endYear: 1077,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.13, longitude: 14.78,
    linkToIsoCodes: ['IT'],
  },

  // ── 중세 ──────────────────────────────────────────────────────────
  {
    name: '교황령',
    enName: 'Papal States',
    description: '756년 프랑크 왕 피핀이 이탈리아 중부 땅을 교황 스테파노 2세에게 헌납하면서 시작된 교황의 세속 통치령. 이탈리아 반도의 상당 부분을 영토로 가졌으며 중세 유럽 정치에 막대한 영향력을 행사했다. 1861년 이탈리아 통일 과정에서 영토를 잃다가 1870년 로마가 이탈리아 왕국에 병합되면서 완전히 소멸했다.',
    startEra: 'AD', startYear: 756,
    endEra: 'AD', endYear: 1870,
    stateType: HistoricalStateType.THEOCRACY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.9, longitude: 12.5,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '베네치아 공화국',
    enName: 'Republic of Venice',
    description: '697년 초대 도제(Doge)가 선출되면서 시작된 도시 공화국. "바다의 지배자(Serenissima)"로 불리며 1,100년 이상 지중해 무역을 지배한 불세출의 해양 강국이다. 제4차 십자군(1204) 원정의 최대 수혜자로 동방 무역로를 장악했으나, 오스만 제국의 팽창과 신항로 개척으로 점차 쇠락하여 1797년 나폴레옹에 의해 해체되었다.',
    startEra: 'AD', startYear: 697,
    endEra: 'AD', endYear: 1797,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.4, longitude: 12.3,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '제노바 공화국',
    enName: 'Republic of Genoa',
    description: '1005년경 주교·귀족 중심의 자치 도시로 출발하여 성립한 도시 공화국. 지중해 서부 무역의 거점으로 성장하여 흑해 연안까지 식민지를 확장했다. 베네치아와 경쟁하며 해상 패권을 다퉜으나 1797년 나폴레옹에 의해 폐지되었다가 이후 리구리아 공화국을 거쳐 사르데냐 왕국에 병합되었다.',
    startEra: 'AD', startYear: 1005,
    endEra: 'AD', endYear: 1797,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.4, longitude: 8.9,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '시칠리아 왕국',
    enName: 'Kingdom of Sicily',
    description: '1130년 노르만 계열의 루지에로 2세가 시칠리아·남이탈리아를 통합하여 창건한 왕국. 아랍·비잔티움·노르만 문화가 혼합된 독특한 문명을 꽃피웠다. 13세기 신성로마 황제 프리드리히 2세의 지배 아래 지중해의 강국이 되었으나, 1282년 시칠리아의 만종 사건으로 본토(나폴리 왕국)와 분리되었다. 1816년 나폴리 왕국과 합쳐져 양시칠리아 왕국이 되었다.',
    startEra: 'AD', startYear: 1130,
    endEra: 'AD', endYear: 1816,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.5, longitude: 14.0,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '나폴리 왕국',
    enName: 'Kingdom of Naples',
    description: '1282년 시칠리아의 만종 봉기로 시칠리아 왕국의 본토 영역이 분리되어 성립한 왕국. 앙주 가문·아라곤 가문 등 여러 왕조가 지배했으며 르네상스 시대 문화의 주요 중심지 중 하나였다. 1816년 나폴레옹 전쟁 이후 시칠리아 왕국과 통합하여 양시칠리아 왕국이 되었다.',
    startEra: 'AD', startYear: 1282,
    endEra: 'AD', endYear: 1816,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 40.8, longitude: 14.3,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '피렌체 공화국',
    enName: 'Republic of Florence',
    description: '1115년 피렌체 백작령이 폐지된 후 자치 도시로 성장한 도시 공화국. 메디치 가문의 후원 아래 레오나르도 다 빈치·미켈란젤로·단테 등 르네상스 문화가 꽃을 피웠다. 1494년 메디치 가문이 추방되었다가 1512년 복귀, 1532년 메디치 가문이 공식 통치자가 되어 피렌체 공국으로 전환되었다.',
    startEra: 'AD', startYear: 1115,
    endEra: 'AD', endYear: 1532,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 43.8, longitude: 11.3,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '밀라노 공국',
    enName: 'Duchy of Milan',
    description: '1395년 잔 갈레아초 비스콘티가 황제로부터 공작 칭호를 받아 수립한 공국. 롬바르디아 평원의 풍부한 농업·수공업을 기반으로 이탈리아 북부의 주요 세력이 되었다. 스포르차 가문이 비스콘티 가문을 계승하였으나 1535년 스페인 합스부르크에 넘어갔다가 1797년 나폴레옹의 치살피나 공화국 수립으로 소멸했다.',
    startEra: 'AD', startYear: 1395,
    endEra: 'AD', endYear: 1797,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.5, longitude: 9.2,
    linkToIsoCodes: ['IT'],
  },

  // ── 근세 ──────────────────────────────────────────────────────────
  {
    name: '토스카나 대공국',
    enName: 'Grand Duchy of Tuscany',
    description: '1569년 교황 비오 5세가 코시모 1세 데 메디치에게 대공 칭호를 수여하며 성립한 대공국. 이전 피렌체 공국과 시에나 공화국을 통합하였다. 레오폴도 2세의 개혁 정치로 유럽에서 가장 앞선 자유주의 국가 중 하나로 꼽혔다. 1860년 이탈리아 통일 운동의 물결 속에 주민 투표로 이탈리아 왕국에 합류하였다.',
    startEra: 'AD', startYear: 1569,
    endEra: 'AD', endYear: 1860,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 43.8, longitude: 11.3,
    linkToIsoCodes: ['IT'],
  },

  // ── 근대 ──────────────────────────────────────────────────────────
  {
    name: '양시칠리아 왕국',
    enName: 'Kingdom of the Two Sicilies',
    description: '1816년 나폴리 왕국과 시칠리아 왕국이 합쳐져 수립된 왕국. 부르봉 가문이 지배하였으며 이탈리아 반도 남부 전역과 시칠리아 섬을 영토로 하는 이탈리아 최대의 단일 국가였다. 1860년 가리발디가 이끈 "천인대(I Mille)"의 원정으로 사르데냐 왕국에 합병되어 이탈리아 통일의 중요한 계기가 되었다.',
    startEra: 'AD', startYear: 1816,
    endEra: 'AD', endYear: 1861,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 40.8, longitude: 15.0,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '사르데냐 왕국',
    enName: 'Kingdom of Sardinia',
    description: '1720년 사보이 가문이 사르데냐 섬을 얻으면서 수립한 왕국(피에몬테-사르데냐 왕국이라고도 함). 카보우르 수상의 외교와 가리발디의 군사 원정을 바탕으로 이탈리아 반도 통일의 핵심 주체가 되었다. 1861년 비토리오 에마누엘레 2세가 이탈리아 왕국의 초대 국왕으로 즉위하면서 사르데냐 왕국은 이탈리아 왕국으로 계승되었다.',
    startEra: 'AD', startYear: 1720,
    endEra: 'AD', endYear: 1861,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.1, longitude: 7.7,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '이탈리아 왕국',
    enName: 'Kingdom of Italy',
    description: '1861년 사르데냐 왕국의 비토리오 에마누엘레 2세가 이탈리아 통일을 선포하며 수립한 왕국. 카보우르·가리발디·마치니 등 리소르지멘토 운동의 결실로 탄생하였다. 1870년 교황령을 병합하고 로마를 수도로 정함으로써 통일을 완성했다. 1922년 무솔리니가 집권하여 파시스트 독재 체제로 전환되었으며 1946년 국민투표로 공화국으로 전환되었다.',
    startEra: 'AD', startYear: 1861,
    endEra: 'AD', endYear: 1946,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 42.5, longitude: 12.5,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '파시스트 이탈리아',
    enName: 'Fascist Italy',
    description: '1922년 베니토 무솔리니가 로마 진군을 통해 정권을 장악한 후 수립한 파시스트 독재 체제. 공식적으로는 이탈리아 왕국의 테두리 안에서 국가파시스트당이 일당 독재를 실시했다. 에티오피아 침공(1935), 스페인 내전 개입, 독일·일본과의 추축국 동맹을 맺었다. 1943년 연합군의 시칠리아 상륙 후 무솔리니가 축출되고 정전을 선언하면서 붕괴되었다.',
    startEra: 'AD', startYear: 1922,
    endEra: 'AD', endYear: 1943,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 41.9, longitude: 12.5,
    linkToIsoCodes: ['IT'],
  },
  {
    name: '이탈리아 사회 공화국',
    enName: 'Italian Social Republic',
    description: '1943년 9월 연합군에 의해 실각한 무솔리니가 나치 독일의 지원으로 북이탈리아 살로에 세운 괴뢰 공화국(살로 공화국). 나치 점령 하에서 명목상의 국가로 존속하였으며 이탈리아 레지스탕스와 치열한 내전을 벌였다. 1945년 4월 무솔리니가 파르티잔에게 처형되고 독일군이 항복하면서 소멸했다.',
    startEra: 'AD', startYear: 1943,
    endEra: 'AD', endYear: 1945,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.6, longitude: 10.5,
    linkToIsoCodes: ['IT'],
  },
]

export async function seedItalyHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇮🇹 이탈리아 관련 역사 국가 시딩 시작...')

  const isoToModernId = new Map<string, string>()
  const allIsoCodes = new Set(ENTRIES.flatMap((e) => e.linkToIsoCodes))
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
          startEra: entry.startEra as any,
          startYear: entry.startYear,
          startMonth: entry.startMonth,
          endEra: entry.endEra as any,
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

  console.log(`✅ 이탈리아 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
