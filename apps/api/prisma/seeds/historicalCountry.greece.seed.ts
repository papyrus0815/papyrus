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
  // ── 청동기 ────────────────────────────────────────────────────────
  {
    name: '미케네 문명',
    enName: 'Mycenaean Greece',
    nameOrigin:
      '펠로폰네소스 북동부의 중심 성채 도시 미케나이(Μυκῆναι)에서 딴 이름으로, ' +
      '하인리히 슐리만의 발굴 이후 이 시기 그리스 본토 청동기 문화 전체를 가리키는 말이 되었다.',
    description:
      '기원전 16세기부터 그리스 본토에 나타난 최초의 그리스어 사용 고도 문명. ' +
      '미케나이·티린스·필로스·테바이 등 성채 궁전을 중심으로 한 개별 왕국들의 집합이었고, ' +
      '선형문자 B 점토판이 왕(와낙스)을 정점으로 한 관료제적 궁전 경제를 보여준다. ' +
      '크레타의 미노스 문명을 흡수해 크노소스를 장악했고, 트로이 전쟁 서사시의 역사적 배경으로 여겨진다. ' +
      '기원전 1200년경 동지중해 전역을 덮친 청동기 붕괴로 궁전 체계가 차례로 불타 사라졌고, ' +
      '문자마저 잊힌 이른바 그리스 암흑기를 거쳐 폴리스 세계로 이어졌다. ' +
      '단일 국가가 아니라 같은 문화를 공유한 왕국군이었으므로 시대·문화 단위로 등록한다.',
    startEra: 'BC', startYear: 1600,
    endEra: 'BC', endYear: 1100,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.PERIOD,
    latitude: 37.7307, longitude: 22.7564,
    linkToIsoCodes: ['GR'],
  },

  // ── 고전기 폴리스 ─────────────────────────────────────────────────
  {
    name: '아테네',
    enName: 'Ancient Athens',
    nameOrigin:
      '수호 여신 아테나의 이름에서 왔다. 고전기 그리스어로는 복수형 아테나이(Ἀθῆναι)로 불렸으며, ' +
      '전승은 아테나와 포세이돈이 이 땅의 수호신 자리를 두고 겨루어 올리브를 준 아테나가 이겼다고 전한다.',
    description:
      '아티카 반도의 폴리스로, 전승상 테세우스의 통합(시노이키스모스)으로 성립해 기원전 8세기경 도시국가의 꼴을 갖추었다. ' +
      '기원전 594년 솔론의 개혁과 기원전 508년 클레이스테네스의 개혁으로 세계 최초의 민주정을 확립했고, ' +
      '기원전 490년 마라톤·기원전 480년 살라미스에서 페르시아를 물리친 뒤 델로스 동맹의 맹주로서 해상 제국을 이루었다. ' +
      '페리클레스 시대에 파르테논 신전과 비극·철학·역사 서술이 꽃피어 서양 고전 문화의 원형이 되었으나, ' +
      '기원전 431~404년 펠로폰네소스 전쟁 패배로 패권을 잃었다. ' +
      '기원전 338년 카이로네이아 패전 이후 마케도니아의 패권 아래 들어갔고 기원전 322년 라미아 전쟁 패배로 민주정이 폐지되었으며, ' +
      '기원전 146년 로마가 그리스를 병합하면서 자치 도시로 남아 독립 정치체로서는 막을 내렸다.',
    startEra: 'BC', startYear: 800,
    endEra: 'BC', endYear: 146,
    stateType: HistoricalStateType.CITY_STATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.9755, longitude: 23.7348,
    linkToIsoCodes: ['GR'],
  },
  {
    name: '스파르타',
    enName: 'Sparta',
    nameOrigin:
      '에우로타스 강가의 도시 이름에서 왔으며, 국가의 공식 명칭은 그 지역명을 딴 라케다이몬(Λακεδαίμων)이었다. ' +
      '방패에 새긴 람다(Λ)도 여기서 나왔다.',
    description:
      '기원전 10세기경 도리스계 주민이 라코니아에 정착해 세운 폴리스로, 두 왕가가 공존하는 이중 왕정과 ' +
      '원로원(게루시아)·감독관(에포로스)이 결합된 독특한 국제를 유지했다. ' +
      '리쿠르고스의 것으로 전해지는 법제 아래 시민을 평생 군사 공동체로 편성했고, ' +
      '정복한 메세니아 주민을 헤일로타이(국가 노예)로 삼아 그 체제를 떠받쳤다. ' +
      '기원전 480년 테르모필레의 결사 항전과 기원전 404년 펠로폰네소스 전쟁 승리로 그리스의 패권을 잡았으나, ' +
      '기원전 371년 레욱트라에서 테바이에 패해 메세니아를 잃고 급격히 쇠퇴했다. ' +
      '헬레니즘기에 클레오메네스 3세·나비스가 개혁으로 부흥을 시도했지만 실패했고, ' +
      '기원전 192년 아카이아 동맹에 강제 편입되며 독립을 잃었다.',
    startEra: 'BC', startYear: 900,
    endEra: 'BC', endYear: 192,
    stateType: HistoricalStateType.CITY_STATE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.0811, longitude: 22.4239,
    linkToIsoCodes: ['GR'],
  },

  // ── 마케도니아와 헬레니즘 ─────────────────────────────────────────
  {
    name: '마케도니아 왕국',
    enName: 'Kingdom of Macedon',
    nameOrigin:
      '"키 큰 사람들"을 뜻하는 그리스어 마케드노스(μακεδνός)에서 유래한 부족명 마케도네스에서 왔다.',
    description:
      '그리스 북부에 자리한 아르게아스 왕조의 왕국으로, 전승은 기원전 808년경 카라노스가 아이가이(오늘날 베르기나)에 ' +
      '나라를 세웠다고 전하며 사료로 확인되는 계보는 기원전 7세기 페르디카스 1세부터 이어진다. ' +
      '기원전 359년 즉위한 필리포스 2세가 팔랑크스 개혁과 외교로 국력을 키워 기원전 338년 카이로네이아에서 ' +
      '아테네·테바이 연합군을 격파하고 코린토스 동맹을 통해 그리스 전역의 패권을 잡았다. ' +
      '아들 알렉산드로스 3세(대왕)는 기원전 334년 동방 원정에 나서 페르시아 제국을 무너뜨리고 인더스 강까지 이르렀고, ' +
      '그의 죽음 뒤 제국은 디아도코이 전쟁을 거쳐 안티고노스·셀레우코스·프톨레마이오스 왕조로 갈라졌다. ' +
      '본국은 안티고노스 왕조가 이었으나 기원전 168년 피드나에서 로마에 패해 왕정이 폐지되었고, ' +
      '기원전 146년 로마의 마케도니아 속주로 편입되었다.',
    startEra: 'BC', startYear: 808,
    endEra: 'BC', endYear: 168,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 40.7606, longitude: 22.5245,
    // 창건기 심장부(아이가이·펠라)와 왕릉이 모두 현대 그리스령이고, 파이오니아(오늘날 북마케도니아 남부)는
    // 필리포스 2세 이후의 획득 병합이라 '창건기 원년 강역' 기준(몰다비아 UA 승인 논거)에서 벗어난다.
    // 2018년 프레스파 협정도 북마케도니아의 유산이 고대 헬레니즘 마케도니아와 별개임을 명시 — GR 단일 링크
    linkToIsoCodes: ['GR'],
  },
  {
    name: '아카이아 동맹',
    enName: 'Achaean League',
    nameOrigin:
      '펠로폰네소스 북부 아카이아 지방의 12개 도시가 맺은 동맹이라는 뜻이다.',
    description:
      '기원전 280년 아카이아 지방 도시들이 마케도니아의 지배에 맞서 재결성한 도시 연맹으로, ' +
      '연방 의회와 매년 선출되는 스트라테고스를 둔 고대 세계에서 가장 발달한 연방 국가로 평가된다. ' +
      '기원전 251년 시키온의 아라토스가 합류시키며 세력을 키웠고 코린토스를 되찾아 펠로폰네소스 대부분을 아울렀다. ' +
      '기원전 192년 필로포이멘이 스파르타마저 강제 편입해 반도를 통일했으나, ' +
      '로마의 개입이 거듭되며 갈등이 깊어졌다. ' +
      '기원전 146년 아카이아 전쟁에서 패해 코린토스가 파괴되고 동맹이 해체되면서 그리스의 독립은 끝났다.',
    startEra: 'BC', startYear: 280,
    endEra: 'BC', endYear: 146,
    stateType: HistoricalStateType.CONFEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 38.2517, longitude: 22.0817,
    linkToIsoCodes: ['GR'],
  },

  // ── 1204년 분할 이후의 계승 국가들 ────────────────────────────────
  {
    name: '라틴 제국',
    enName: 'Latin Empire',
    nameOrigin:
      '서방 가톨릭(라틴) 세력이 세운 제국이라는 뜻으로, 스스로는 동로마의 국호를 그대로 이어 ' +
      '"로마니아 제국(Imperium Romaniae)"이라 칭했다.',
    description:
      '1204년 제4차 십자군이 콘스탄티노플을 함락하고 동로마 영역을 분할(로마니아 분할 협정)해 세운 나라. ' +
      '플랑드르 백작 보두앵이 초대 황제로 즉위했고, 그리스 본토와 에게해에는 테살로니키 왕국·아테네 공국· ' +
      '아카이아 공국 등 봉신국이 들어서 서유럽식 봉건제가 이식되었다. ' +
      '그러나 불가리아 제2제국과 니케아·에페이로스 등 그리스인 계승국의 압박으로 영토가 계속 줄었고, ' +
      '1261년 니케아의 미하일 8세 팔레올로고스가 콘스탄티노플을 되찾으면서 소멸했다.',
    startEra: 'AD', startYear: 1204,
    endEra: 'AD', endYear: 1261,
    stateType: HistoricalStateType.EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 41.0086, longitude: 28.9802,
    // 수도·직할령이 콘스탄티노플과 트라키아 동부라 TR 단일 링크(수도 소재=최강의 정주핵 증거).
    // 그리스 본토와의 관계는 아테네 공국·아카이아 공국 속국 소속 관계로 표현한다
    linkToIsoCodes: ['TR'],
  },
  {
    name: '에페이로스 전제군주국',
    enName: 'Despotate of Epirus',
    nameOrigin:
      '"본토"를 뜻하는 그리스어 에페이로스(Ἤπειρος)에서 온 지명이며, ' +
      '통치자가 동로마의 고위 작위인 전제공(데스포테스)을 칭한 데서 국호가 굳었다.',
    description:
      '1204년 콘스탄티노플 함락 직후 미하일 1세 콤네노스 두카스가 그리스 서북부에 세운 동로마 계승 국가로, ' +
      '아르타와 이오안니나를 중심으로 삼았다. ' +
      '1224년 테오도로스가 테살로니키를 되찾아 스스로 황제를 칭하며 제국 재건을 다투었으나 ' +
      '1230년 클로코트니차에서 불가리아에, 1259년 펠라고니아에서 니케아에 패해 주도권을 잃었다. ' +
      '이후 서방 세력과 세르비아의 간섭 속에 축소를 거듭했고, ' +
      '1430년 이오안니나·1449년 아르타에 이어 1479년 보니차가 함락되며 오스만 제국에 완전히 병합되었다.',
    startEra: 'AD', startYear: 1205,
    endEra: 'AD', endYear: 1479,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 39.1600, longitude: 20.9850,
    // AL(창건기 강역인 두러스·알바니아 남부)은 현대 국가 미등록 — 등록 후 재실행 시 링크(덴마크·MK 전례)
    linkToIsoCodes: ['GR', 'AL'],
  },
  {
    name: '아테네 공국',
    enName: 'Duchy of Athens',
    nameOrigin:
      '통치자가 프랑스어권에서 "아테네 공(duc d\'Athènes)"으로 불린 데서 왔으며, ' +
      '그리스인들은 "메가스 퀴르"(대영주)라 불렀다.',
    description:
      '1205년 부르고뉴 기사 오토 드 라 로슈가 아티카와 보이오티아에 세운 십자군 국가로, ' +
      '파르테논 신전이 성모 마리아 대성당으로 쓰이고 아크로폴리스가 공작의 성채가 되었다. ' +
      '1311년 할미로스 전투에서 프랑크 기사단이 카탈루냐 용병단(카탈루냐 회사)에게 전멸해 지배 가문이 바뀌었고, ' +
      '1388년부터는 피렌체의 아차이우올리 가문이 다스렸다. ' +
      '1456년 오스만군이 아테네에 들어오고 1458년 아크로폴리스가 항복하면서 소멸했다.',
    startEra: 'AD', startYear: 1205,
    endEra: 'AD', endYear: 1458,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.9715, longitude: 23.7257,
    linkToIsoCodes: ['GR'],
  },
  {
    name: '아카이아 공국',
    enName: 'Principality of Achaea',
    nameOrigin:
      '펠로폰네소스를 가리키던 고대 지명 아카이아에서 왔다. ' +
      '서방에서는 반도의 중세 이름을 따 "모레아 공국"으로도 불렸다.',
    description:
      '1205년 기욤 드 샹플리트와 조프루아 드 빌라르두앵이 펠로폰네소스를 정복해 세운 십자군 국가로, ' +
      '안드라비다를 수도로 삼고 12개 남작령으로 나뉜 전형적인 프랑크 봉건 국가였다. ' +
      '13세기 중엽 기욤 2세 치세에 전성기를 누렸으나 1259년 펠라고니아에서 사로잡혀 ' +
      '몸값으로 미스트라스 등 요새를 동로마에 넘기면서 쇠퇴가 시작되었다. ' +
      '앙주 가문·나바라 용병단 등이 차례로 지배권을 다투다가, ' +
      '1432년 마지막 공 켄투리오네 2세가 죽은 뒤 동로마의 모레아 전제공국에 완전히 흡수되었다.',
    startEra: 'AD', startYear: 1205,
    endEra: 'AD', endYear: 1432,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.6558, longitude: 21.2694,
    linkToIsoCodes: ['GR'],
  },
  {
    name: '모레아 전제공국',
    enName: 'Despotate of the Morea',
    nameOrigin:
      '중세에 펠로폰네소스를 부르던 이름 모레아(Μορέας)에서 왔으며, ' +
      '뽕나무(무리아) 또는 반도의 모양에서 유래했다는 설이 있다.',
    description:
      '1262년 미스트라스를 되찾은 동로마가 펠로폰네소스에 세운 속령으로, ' +
      '1349년부터 황족이 전제공(데스포테스)으로 부임하는 분국 체제가 자리 잡았다. ' +
      '팔레올로고스 왕조 아래 프랑크 세력을 몰아내고 1432년 아카이아 공국을 흡수해 반도를 거의 통일했으며, ' +
      '미스트라스는 게미스토스 플레톤을 비롯한 학자들이 모인 동로마 마지막 문예 부흥의 중심이 되었다. ' +
      '1453년 콘스탄티노플 함락 뒤에도 마지막 동로마 영토로 남았으나 ' +
      '1460년 메흐메트 2세의 원정으로 정복되었다.',
    startEra: 'AD', startYear: 1349,
    endEra: 'AD', endYear: 1460,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.0728, longitude: 22.3672,
    linkToIsoCodes: ['GR'],
  },

  // ── 오스만 지배기의 자치체 ────────────────────────────────────────
  {
    name: '이오니아 제도 합중국',
    enName: 'United States of the Ionian Islands',
    nameOrigin:
      '이오니아 해에 흩어진 일곱 개 섬(코르푸·케팔로니아·자킨토스 등)의 연합체라는 뜻으로, ' +
      '그리스어로는 "칠도 합중국"이라 불렸다.',
    description:
      '1815년 파리 조약으로 성립한 영국 보호령 하의 연방 국가로, 수도는 코르푸였다. ' +
      '1797년 베네치아 공화국이 무너진 뒤 프랑스령·셉틴술라 공화국(1800~1807)·다시 프랑스령을 거쳐 ' +
      '나폴레옹 전쟁 후 영국의 보호 아래 놓인 결과였다. ' +
      '영국 고등판무관이 실권을 쥐었지만 자체 의회와 헌법을 가졌고 이오니아 아카데미가 세워져 ' +
      '오스만 지배 밖의 그리스어권 근대 교육 거점이 되었다. ' +
      '주민의 그리스 합병(에노시스) 요구가 커지자 영국은 1864년 런던 조약으로 제도를 그리스 왕국에 넘겼다.',
    startEra: 'AD', startYear: 1815,
    endEra: 'AD', endYear: 1864,
    stateType: HistoricalStateType.FEDERATION,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 39.6243, longitude: 19.9217,
    linkToIsoCodes: ['GR'],
  },
  {
    name: '크레타국',
    enName: 'Cretan State',
    description:
      '1898년 열강의 개입으로 오스만군이 철수하면서 크레타섬에 세워진 자치국. ' +
      '명목상 술탄의 종주권 아래 있었으나 영국·프랑스·러시아·이탈리아의 보호를 받았고, ' +
      '그리스 왕자 게오르기오스가 초대 고등판무관으로 부임해 하니아를 수도로 삼았다. ' +
      '1905년 엘레프테리오스 베니젤로스가 테리소 봉기를 이끌며 통합을 압박했고 ' +
      '1908년 의회가 그리스와의 합병(에노시스)을 일방 선언했다. ' +
      '발칸 전쟁을 거쳐 1913년 부쿠레슈티·런던 조약으로 그리스 왕국 편입이 국제적으로 확정되며 소멸했다.',
    startEra: 'AD', startYear: 1898,
    endEra: 'AD', endYear: 1913,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 35.5138, longitude: 24.0180,
    linkToIsoCodes: ['GR'],
  },

  // ── 근대 국민국가 ─────────────────────────────────────────────────
  {
    name: '그리스 제1공화국',
    enName: 'First Hellenic Republic',
    nameOrigin:
      '독립 전쟁 중 수립된 첫 공화정이라는 뜻으로, 당시 공식 국호는 "그리스국(Ελληνική Πολιτεία)"이었다.',
    description:
      '1821년 시작된 그리스 독립 전쟁 중 1822년 1월 에피다브로스 제1차 국민의회가 독립을 선언하며 세운 혁명 정부. ' +
      '거듭된 내분과 이집트군의 개입으로 위기에 몰렸으나 1827년 나바리노 해전에서 영국·프랑스·러시아 함대가 ' +
      '오스만-이집트 함대를 격파하면서 존립을 굳혔다. ' +
      '같은 해 러시아 외무장관 출신 이오아니스 카포디스트리아스가 초대 총재로 선출돼 나프플리오를 수도로 국가 체제를 세웠으나 ' +
      '1831년 암살되었고, 1832년 5월 런던 회의에서 열강이 바이에른의 오톤을 왕으로 세우기로 하면서 왕국으로 넘어갔다.',
    startEra: 'AD', startYear: 1822, startMonth: 1,
    endEra: 'AD', endYear: 1832, endMonth: 5,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.5675, longitude: 22.8000,
    linkToIsoCodes: ['GR'],
  },
  {
    name: '그리스 왕국',
    enName: 'Kingdom of Greece',
    description:
      '1832년 5월 런던 회의로 열강의 보증 아래 성립한 그리스의 첫 근대 주권 국가. ' +
      '바이에른 비텔스바흐 가문의 오톤이 초대 국왕이 되었고 1834년 수도를 아테네로 옮겼으며, ' +
      '1862년 그가 폐위된 뒤에는 덴마크 출신 예오르요스 1세의 글뤽스부르크 왕조가 이었다. ' +
      '1864년 이오니아 제도, 1881년 테살리아, 1913년 마케도니아·크레타·에게해 도서를 차례로 합치며 ' +
      '"메갈리 이데아"(대이상)를 좇았으나 1922년 소아시아 참사로 그 꿈이 무너지고 인구 교환이 뒤따랐다. ' +
      '1924~1935년에는 제2공화국으로 왕정이 중단되었고, 1941~1944년 추축국 점령기에는 국왕이 망명 정부를 이끌었다. ' +
      '1967년 군사 쿠데타로 실권을 잃은 뒤 1973년 6월 군사정권이 공화국을 선포하며 왕정이 폐지되었고, ' +
      '1974년 12월 국민투표로 폐지가 확정되었다.',
    startEra: 'AD', startYear: 1832, startMonth: 5,
    endEra: 'AD', endYear: 1973, endMonth: 6,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.9838, longitude: 23.7275,
    linkToIsoCodes: ['GR'],
  },
  {
    name: '그리스 제2공화국',
    enName: 'Second Hellenic Republic',
    description:
      '1922년 소아시아 참사의 책임을 물어 군부가 왕정을 무너뜨린 뒤 ' +
      '1924년 3월 국민의회가 선포하고 4월 국민투표로 승인된 공화정. ' +
      '엘레프테리오스 베니젤로스가 이끄는 자유주의 세력과 왕당파의 "국민 분열"이 이어져 ' +
      '11년 동안 20차례가 넘는 정부 교체와 여러 차례의 쿠데타를 겪었다. ' +
      '1930년 앙카라 협정으로 튀르키예와 화해했으나 대공황과 1935년 3월 베니젤로스파 쿠데타 실패로 무너졌고, ' +
      '그해 10월 콘딜리스의 쿠데타와 11월 국민투표를 거쳐 예오르요스 2세가 돌아오며 왕정이 복고되었다.',
    startEra: 'AD', startYear: 1924, startMonth: 3,
    endEra: 'AD', endYear: 1935, endMonth: 11,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.9838, longitude: 23.7275,
    linkToIsoCodes: ['GR'],
  },
  {
    name: '그리스국',
    enName: 'Hellenic State',
    nameOrigin:
      '점령 당국이 세운 정부가 쓴 공식 국호(Ελληνική Πολιτεία)로, ' +
      '왕정을 뜻하는 "왕국"을 피해 중립적인 "국"을 택한 이름이다.',
    description:
      '1941년 4월 독일·이탈리아·불가리아가 그리스를 점령하고 세운 부역 정부. ' +
      '예오르요스 촐라코글루를 시작으로 세 명의 총리가 이름을 올렸으나 실권은 점령 당국에 있었고, ' +
      '국토는 세 나라의 점령 지구로 갈라졌다. ' +
      '통화 붕괴와 식량 징발로 1941~42년 대기근이 일어나 수십만 명이 굶어 죽었으며, ' +
      '그 사이 EAM/ELAS·EDES 등 저항 조직이 산악 지대를 장악했다. ' +
      '1944년 10월 독일군 철수와 함께 소멸했고, 곧이어 저항 세력 간 대립이 그리스 내전으로 번졌다.',
    startEra: 'AD', startYear: 1941, startMonth: 4,
    endEra: 'AD', endYear: 1944, endMonth: 10,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 37.9838, longitude: 23.7275,
    linkToIsoCodes: ['GR'],
  },
  {
    name: '그리스 군사정권',
    enName: 'Greek Military Junta',
    nameOrigin:
      '쿠데타를 주도한 중견 장교들의 계급에서 "대령들의 정권(Καθεστώς των Συνταγματαρχών)"으로도 불린다.',
    description:
      '1967년 4월 21일 요르요스 파파도풀로스 등 육군 장교들이 일으킨 쿠데타로 들어선 군사 독재 정권. ' +
      '헌법을 정지하고 정당을 해산했으며 반대파를 투옥·유배하고 검열을 실시했다. ' +
      '같은 해 12월 콘스탄티노스 2세의 반쿠데타가 실패해 국왕이 망명했고, ' +
      '1973년 6월 국민투표로 왕정을 폐지하고 공화국을 선포했다. ' +
      '1973년 11월 아테네 공과대학(폴리테크니오) 학생 봉기를 유혈 진압한 뒤 강경파 이오아니디스가 실권을 쥐었으나, ' +
      '1974년 7월 키프로스 쿠데타를 사주했다가 튀르키예의 침공을 부르면서 붕괴했다.',
    startEra: 'AD', startYear: 1967, startMonth: 4,
    endEra: 'AD', endYear: 1974, endMonth: 7,
    stateType: HistoricalStateType.OTHER,
    entityKind: HistoricalEntityKind.REGIME,
    latitude: 37.9838, longitude: 23.7275,
    linkToIsoCodes: ['GR'],
  },
  {
    name: '그리스 공화국',
    enName: 'Hellenic Republic',
    description:
      '1974년 7월 군사정권 붕괴 후 콘스탄티노스 카라만리스가 귀국해 민정을 회복(메타폴리테프시)하며 시작된 현대 그리스. ' +
      '1974년 12월 국민투표로 왕정 폐지를 확정하고 1975년 새 헌법을 채택해 제3공화국 체제를 세웠다. ' +
      '1981년 유럽 공동체(EC)에 가입하고 2001년 유로를 도입했으며 2004년 아테네 올림픽을 열었다. ' +
      '2009년 재정 위기로 세 차례 구제금융과 긴축을 겪었고 2018년 프로그램을 졸업했다.',
    startEra: 'AD', startYear: 1974, startMonth: 7,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 37.9838, longitude: 23.7275,
    linkToIsoCodes: ['GR'],
  },
]

/**
 * 다른 시드가 소유한 HC에 현대 그리스 연결만 보강(크로아티아 시드의 EXTRA_MODERN_LINKS 패턴).
 * - 로마 계열(공화국·제국)은 liberal 링크 정책 — 기원전 146년 아카이아·마케도니아 속주 편입 이후 전역이 로마령
 * - 동로마 제국: 그리스어가 공용어가 된 제국의 정주 핵심부(헬라스·펠로폰네소스 테마, 제2도시 테살로니키)이며
 *   말기 잔존 영토가 모레아였다. 불가리아 제1제국 RS 기각의 '이웃 변경 병합' 사례와 달리
 *   그리스는 병합된 별도 국가가 아니라 제국 주민 그 자체라 복수 링크 규범 (A)에 해당
 * - 오스만 제국은 GR 미연결(단일 링크 유지) — 독일 제국=DE만·헝가리=HU만과 같은 규범 (B),
 *   불가리아·루마니아·몬테네그로 배치도 오스만에 자국을 잇지 않았다
 * - 베네치아 공화국(크레타 1211~1669·이오니아 제도)도 '해양 속령은 단일 링크' 판정으로 제외(슬로베니아 전례)
 * - 서로마 제국은 그리스가 동방 관구라 해당 없음
 */
const EXTRA_MODERN_LINKS: { hcName: string; isoCode: string }[] = [
  { hcName: '로마 공화국', isoCode: 'GR' },
  { hcName: '로마 제국', isoCode: 'GR' },
  { hcName: '동로마 제국', isoCode: 'GR' },
]

export async function seedGreeceHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇬🇷 그리스 관련 역사 국가 시딩 시작...')

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

  // 타 시드 소유 HC → 현대 그리스 연결 보강
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

  console.log(`✅ 그리스 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
