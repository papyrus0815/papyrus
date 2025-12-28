import { HistoricalEvent } from './create/events.types'

export const MOCK_HISTORICAL_EVENTS: HistoricalEvent[] = [
  {
    id: 'event-ww2',
    title: '제2차 세계 대전',
    type: 'total-war',
    category: 'military',
    description:
      '1939년부터 1945년까지 전 세계 60여 개 국가가 참전한 총력전으로, 정치·경제·사회 구조를 완전히 재편한 사건입니다.',
    startDate: '1939-09-01',
    endDate: '1945-09-02',
    location: '유럽, 북아프리카, 태평양 전역',
    tags: ['전면전', '연합국 vs 추축국', '세계 질서 재편'],
    background:
      '베르사유 조약 이후의 국제 질서 붕괴, 대공황, 전체주의 확산이 복합적으로 작용하여 유럽과 아시아에서 동시다발적인 군사 충돌이 표면화되었습니다.',
    aftermath:
      '국제연합(UN) 창설, 미·소 냉전 구도 형성, 탈식민화 가속, 독일 분할, 일본의 비무장화 등 20세기 후반 질서를 규정하는 체제가 수립되었습니다.',
    stats: {
      casualties: {
        total: 72000000,
        civilians: 48000000,
        military: 24000000,
      },
      participatingNations: 61,
      theaters: 6,
      durationInYears: 6,
    },
    visuals: {
      heroImageUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1458588543899-ef8147f1b026?auto=format&fit=crop&w=800&q=80',
      gallery: [
        {
          id: 'ww2-gallery-1',
          title: '노르망디 상륙작전',
          url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1600&q=80',
          caption: '연합군 병력이 노르망디 해안에 상륙하는 모습',
          source: 'US National Archives',
        },
        {
          id: 'ww2-gallery-2',
          title: '바르바로사 작전 준비',
          url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
          caption: '동부전선으로 향하는 독일 기갑부대',
          source: 'Bundesarchiv',
        },
        {
          id: 'ww2-gallery-3',
          title: '태평양 항모 전력',
          url: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?auto=format&fit=crop&w=1600&q=80',
          caption: '태평양 전선에 배치된 항공모함 전단',
          source: 'US Navy Photo',
        },
      ],
    },
    hierarchy: {
      id: 'event-ww2',
      title: '제2차 세계 대전 (1939-1945)',
      summary: '유럽·태평양 동시 전개된 전 지구적 전쟁',
      period: {
        start: '1939-09-01',
        end: '1945-09-02',
      },
      importance: 'critical',
      children: [
        {
          id: 'event-ww2-europe',
          title: '유럽 전선',
          summary: '폴란드 침공 → 프랑스 침공 → 노르망디 상륙 → 베를린 함락',
          period: { start: '1939-09-01', end: '1945-05-08' },
          importance: 'critical',
          children: [
            {
              id: 'event-ww2-poland',
              title: '폴란드 침공',
              summary: '전쟁 개전, 독·소 공동 분할',
              period: { start: '1939-09-01', end: '1939-10-06' },
              importance: 'major',
            },
            {
              id: 'event-ww2-france',
              title: '프랑스 전역',
              summary: '마지노선 붕괴, 비시 프랑스 수립',
              period: { start: '1940-05-10', end: '1940-06-25' },
              importance: 'major',
            },
            {
              id: 'event-ww2-barbarossa',
              title: '바르바로사 작전',
              summary: '독소전 개시, 유럽 최대 지상전',
              period: { start: '1941-06-22', end: '1942-02-07' },
              importance: 'critical',
              children: [
                {
                  id: 'event-ww2-stalingrad',
                  title: '스탈린그라드 전투',
                  summary: '추축국 전황 전환점',
                  period: { start: '1942-08-23', end: '1943-02-02' },
                  importance: 'critical',
                },
              ],
            },
          ],
        },
        {
          id: 'event-ww2-pacific',
          title: '태평양 전선',
          summary:
            '진주만 공습 → 미드웨이 해전 → 도쿄 대공습 → 히로시마/나가사키',
          period: { start: '1941-12-07', end: '1945-09-02' },
          importance: 'critical',
          children: [
            {
              id: 'event-ww2-pearl-harbor',
              title: '진주만 공습',
              summary: '미국 참전의 계기',
              period: { start: '1941-12-07' },
              importance: 'major',
            },
            {
              id: 'event-ww2-midway',
              title: '미드웨이 해전',
              summary: '태평양 전쟁 전환점',
              period: { start: '1942-06-04', end: '1942-06-07' },
              importance: 'critical',
            },
            {
              id: 'event-ww2-okinawa',
              title: '오키나와 전투',
              summary: '본토 결전에 앞선 최대 규모 상륙',
              period: { start: '1945-04-01', end: '1945-06-22' },
              importance: 'major',
            },
          ],
        },
        {
          id: 'event-ww2-north-africa',
          title: '북아프리카/지중해 전선',
          summary: '엘알라메인 승리로 지중해 제해권 확보',
          period: { start: '1940-09-13', end: '1943-05-13' },
          importance: 'major',
        },
      ],
    },
    timeline: [
      {
        id: 'timeline-ww2-1',
        occurredAt: '1939-09-01',
        title: '독일의 폴란드 침공',
        description:
          '기동전(Blitzkrieg) 전술로 폴란드 서부 전역을 단기간에 돌파. 영국과 프랑스가 독일에 선전포고.',
        locationName: '폴란드 서부 국경',
        coordinates: { lat: 52.2297, lng: 21.0122 },
        involvedCountries: [
          { id: 'ger', name: '독일', role: 'axis' },
          { id: 'pol', name: '폴란드', role: 'allies' },
        ],
      },
      {
        id: 'timeline-ww2-2',
        occurredAt: '1940-05-10',
        title: '서유럽 공세 개시',
        description:
          '네덜란드·벨기에·프랑스 북부를 동시에 공격하여 6주 만에 파리를 함락. 영국군은 덩케르크로 철수.',
        locationName: '프랑스 북부',
        coordinates: { lat: 50.6326, lng: 3.0586 },
        involvedPersons: [
          {
            id: 'churchill',
            name: '윈스턴 처칠',
            role: '총리',
            nation: '영국',
          },
        ],
      },
      {
        id: 'timeline-ww2-3',
        occurredAt: '1941-06-22',
        title: '바르바로사 작전',
        description:
          '독일이 독·소 불가침 조약을 파기하고 소련을 침공. 전선 길이 2,900km, 300만 병력 투입.',
        locationName: '소련 서부',
        coordinates: { lat: 53.9, lng: 27.5667 },
      },
      {
        id: 'timeline-ww2-4',
        occurredAt: '1942-06-04',
        title: '미드웨이 해전',
        description:
          '암호 해독을 통한 선제 대응으로 일본 항모 4척 격침. 태평양 제해권이 연합국으로 이동.',
        locationName: '미드웨이 환초',
        coordinates: { lat: 28.2008, lng: -177.3788 },
      },
      {
        id: 'timeline-ww2-5',
        occurredAt: '1944-06-06',
        title: '노르망디 상륙작전',
        description:
          '연합군 15만 명이 오마하·유타 등 5개 해변에 상륙하여 서부전선 재개.',
        locationName: '프랑스 노르망디',
        coordinates: { lat: 49.3228, lng: -0.6218 },
      },
      {
        id: 'timeline-ww2-6',
        occurredAt: '1945-08-06',
        title: '히로시마·나가사키 원폭 투하',
        description:
          '핵무기 최초 사용으로 일본의 항복을 가속화. 전후 핵 시대 개막.',
        locationName: '일본 히로시마/나가사키',
        coordinates: { lat: 34.3853, lng: 132.4553 },
      },
    ],
    theaters: [
      {
        id: 'theater-europe',
        name: '유럽 전선',
        description:
          '독일의 전격전과 연합국의 서부전선 재개, 소련과의 동부전이 교차.',
        strategicFocus: '산업자원 확보, 방공 우위 선점, 독일 본토 압박',
        operations: [
          {
            id: 'op-overlord',
            name: '오버로드 작전',
            summary: '노르망디 상륙을 통한 서유럽 본토 재탈환',
            outcome: '연합군 승리, 파리 해방',
            location: '프랑스 노르망디 해안',
          },
          {
            id: 'op-marketgarden',
            name: '마켓가든 작전',
            summary: '네덜란드 교량 확보 시도',
            outcome: '부분 성공, 아른헴에서 저지',
            location: '네덜란드 아른헴',
          },
        ],
      },
      {
        id: 'theater-pacific',
        name: '태평양 전선',
        description: '항공모함 중심 해전과 섬 점령 캠페인이 핵심.',
        strategicFocus: '해상 보급망 차단, 항공 거점 확보, 일본 본토 접근',
        operations: [
          {
            id: 'op-islandhopping',
            name: '도서 점령 작전',
            summary: '필요 섬만 점령하여 본토에 접근하는 전략',
            outcome: '연합군의 점진적 우세 확보',
            location: '솔로몬 제도, 마리아나 제도',
          },
          {
            id: 'op-iceberg',
            name: '아이스버그 작전',
            summary: '오키나와 상륙을 통한 공군 거점 확보',
            outcome: '연합군 승리, 막대한 인명 피해',
            location: '일본 오키나와',
          },
        ],
      },
    ],
    keyFigures: [
      {
        id: 'churchill',
        name: '윈스턴 처칠',
        role: '영국 총리',
        nation: '영국',
        contribution: '영국의 전시 내각 이끌고 렌드리스 법을 미국과 협상.',
      },
      {
        id: 'roosevelt',
        name: '프랭클린 D. 루스벨트',
        role: '미국 대통령',
        nation: '미국',
        contribution: '연합국 전략 조율, 전시 경제 총동원 체제 구축.',
      },
      {
        id: 'zhukov',
        name: '게오르기 주코프',
        role: '소련 원수',
        nation: '소련',
        contribution: '모스크바 방어, 스탈린그라드·베를린 공세 지휘.',
      },
      {
        id: 'yamamoto',
        name: '야마모토 이소로쿠',
        role: '일본 연합함대 사령장관',
        nation: '일본',
        contribution: '진주만 공습 계획, 미드웨이 패배 후 전세 역전.',
      },
    ],
    countries: [
      {
        id: 'country-allies',
        name: '연합국',
        role: 'defensive',
        classification: 'Allies',
        note: '미·영·소 3국 지도, 61개국 참여',
      },
      {
        id: 'country-axis',
        name: '추축국',
        role: 'offensive',
        classification: 'Axis',
        note: '독일·이탈리아·일본 중심',
      },
      {
        id: 'country-vichy',
        name: '비시 프랑스',
        role: 'support',
        classification: 'Colony',
        note: '추축국 협력 정권',
      },
      {
        id: 'country-poland',
        name: '폴란드 망명정부',
        role: 'defensive',
        classification: 'Allies',
        note: '런던에서 정보·공군 지원',
      },
    ],
    influence: [
      {
        label: '세계 질서 재편',
        value: 95,
        description: 'UN 창설, 냉전 구도 확립, 국제법 강화',
      },
      {
        label: '과학/기술 혁신',
        value: 88,
        description: '핵무기, 제트기, 컴퓨팅, 암호 해독 등 첨단 기술 가속',
      },
      {
        label: '탈식민화 촉발',
        value: 76,
        description: '식민지 군대 동원과 경제 부담으로 독립 운동 가속',
      },
    ],
    map: {
      summary:
        '대서양-태평양 양면 전쟁과 주요 전환점의 지리적 분포를 한눈에 조망합니다.',
      markers: [
        {
          id: 'marker-midway',
          label: '미드웨이 해전',
          coordinates: { lat: 28.2008, lng: -177.3788 },
          category: 'battle',
          detail: '항공모함 전력 균형이 역전된 해전',
        },
        {
          id: 'marker-stalingrad',
          label: '스탈린그라드',
          coordinates: { lat: 48.708, lng: 44.513 },
          category: 'turning-point',
          detail: '동부전선 대전환',
        },
        {
          id: 'marker-elalamein',
          label: '엘 알라메인',
          coordinates: { lat: 30.83, lng: 28.95 },
          category: 'battle',
          detail: '북아프리카 제해권 확보',
        },
      ],
    },
    quickFacts: {
      commandStructure: '연합국 합동참모본부(JC), 추축국 삼국 군령부',
      decisiveTechnology: '레이더·암호해독·핵무기·항공모함',
      intelligenceNotes: '엔지그마 해독, ULTRA 작전, 매직 암호',
      logisticalScale: '전 세계 1,000만 톤 이상의 해상 보급선',
    },
  },
  {
    id: 'event-korean-war',
    title: '한국 전쟁',
    type: 'campaign',
    category: 'military',
    description:
      '한반도에서 냉전이 처음으로 전면전에 가까운 형태로 표출된 전쟁으로, 유엔군과 중공군이 맞붙은 국제전입니다.',
    startDate: '1950-06-25',
    endDate: '1953-07-27',
    location: '한반도 전역',
    tags: ['냉전', '분단', '유엔군 파병'],
    background:
      '해방 직후 미·소 공동 점령과 단독 정부 수립으로 분단이 고착화되었고, 상호 체제 경쟁 속에서 군사 충돌이 폭발했습니다.',
    aftermath:
      '정전협정 체결로 전쟁은 중지됐지만 평화협정 부재로 군사적 긴장이 지속되며, 냉전 아시아 전선의 분기점이 되었습니다.',
    stats: {
      casualties: {
        total: 4000000,
        civilians: 2400000,
        military: 1600000,
      },
      participatingNations: 21,
      theaters: 3,
      durationInYears: 3,
    },
    visuals: {
      heroImageUrl:
        'https://images.unsplash.com/photo-1476610182048-b716b8518aae?auto=format&fit=crop&w=1600&q=80',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1473186505569-9c61870c11f9?auto=format&fit=crop&w=800&q=80',
      gallery: [
        {
          id: 'kw-gallery-1',
          title: '낙동강 방어선',
          url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
          caption: '낙동강 방어선에 배치된 포병 전력',
          source: 'ROK MND Archives',
        },
        {
          id: 'kw-gallery-2',
          title: '인천 상륙 준비',
          url: 'https://images.unsplash.com/photo-1500534314210-7b52c68b2e33?auto=format&fit=crop&w=1600&q=80',
          caption: '인천 앞바다에 집결한 상륙 함정',
          source: 'USMC Historical Center',
        },
      ],
    },
    hierarchy: {
      id: 'event-korean-war',
      title: '한국 전쟁 (1950-1953)',
      summary:
        '38선 돌파 → 낙동강 전선 → 인천상륙 → 압록강 진격 → 중공군 개입 → 휴전선 고착',
      period: { start: '1950-06-25', end: '1953-07-27' },
      importance: 'critical',
      children: [
        {
          id: 'kw-invasion',
          title: '북한 남침',
          summary: '서울 함락, 낙동강 교두보 형성',
          period: { start: '1950-06-25', end: '1950-08-31' },
          importance: 'critical',
        },
        {
          id: 'kw-inchon',
          title: '인천 상륙작전',
          summary: '전황 반전, 서울 재탈환',
          period: { start: '1950-09-15', end: '1950-09-28' },
          importance: 'critical',
        },
        {
          id: 'kw-chinese-entry',
          title: '중공군 개입',
          summary: '압록강 진격 후 전선 재차 북상',
          period: { start: '1950-10-25', end: '1951-01-24' },
          importance: 'major',
        },
        {
          id: 'kw-trench',
          title: '고지전/휴전 협상',
          summary: '지구전 양상, 판문점 협상',
          period: { start: '1951-07-10', end: '1953-07-27' },
          importance: 'major',
        },
      ],
    },
    timeline: [
      {
        id: 'timeline-kw-1',
        occurredAt: '1950-06-25',
        title: '38선 전면 돌파',
        description: '북한군 10개 사단이 기습 남하, 서울 사흘 만에 함락.',
        locationName: '한반도 중부',
        coordinates: { lat: 37.5665, lng: 126.978 },
      },
      {
        id: 'timeline-kw-2',
        occurredAt: '1950-09-15',
        title: '인천 상륙',
        description:
          '맥아더 지휘 하에 기상·조수 조건을 활용한 상륙으로 전세 역전.',
        locationName: '인천 앞바다',
        coordinates: { lat: 37.4563, lng: 126.7052 },
      },
      {
        id: 'timeline-kw-3',
        occurredAt: '1950-11-27',
        title: '장진호 전투',
        description: '혹한 속 미 해병대 돌파, 중공군 대공세 첫 격돌.',
        locationName: '함경남도',
        coordinates: { lat: 40.45, lng: 127.3 },
      },
      {
        id: 'timeline-kw-4',
        occurredAt: '1953-07-27',
        title: '정전협정 체결',
        description: '판문점에서 정전협정 서명, 군사분계선(MDL) 확정.',
        locationName: '판문점',
        coordinates: { lat: 37.9613, lng: 126.6819 },
      },
    ],
    theaters: [
      {
        id: 'kw-theater-south',
        name: '남한 방어선',
        description: '낙동강·부산 교두보를 사수한 후 공세 전환 기반 마련.',
        strategicFocus: '보급선 확보, 해군 화력 지원, 공군 우위 회복',
        operations: [
          {
            id: 'kw-op-nakdong',
            name: '낙동강 방어선',
            summary: '다부동·영천·마산 전투 등 방어선 구축',
            outcome: '방어 성공, 반격 기회 확보',
            location: '경상도 내륙',
          },
        ],
      },
      {
        id: 'kw-theater-north',
        name: '38선 이북 고지전',
        description: '중공군·북한군과의 고지 쟁탈전 및 포격전 장기화.',
        strategicFocus: '휴전협상 지렛대 확보, 대규모 포병전',
        operations: [
          {
            id: 'kw-op-heartbreak',
            name: '피의 고지 전투',
            summary: '철의 삼각지대 등 고지 점령전',
            outcome: '국지적 우세, 전략적 교착',
            location: '강원도 철원·금화',
          },
        ],
      },
    ],
    keyFigures: [
      {
        id: 'syngman',
        name: '이승만',
        role: '대한민국 대통령',
        nation: '대한민국',
        contribution: '반공 노선 고수, 전시 정권 유지',
      },
      {
        id: 'macarthur',
        name: '더글러스 맥아더',
        role: '유엔군 사령관',
        nation: '미국',
        contribution: '인천 상륙 및 전략 전환 설계',
      },
      {
        id: 'pengdehuai',
        name: '팽덕회',
        role: '중국인민지원군 사령관',
        nation: '중국',
        contribution: '압록강 남하 작전 지휘',
      },
    ],
    countries: [
      {
        id: 'kw-un',
        name: '유엔군 16개 전투국',
        role: 'defensive',
        classification: 'Allies',
        note: '미국·영국·캐나다·호주 등 파병',
      },
      {
        id: 'kw-prc',
        name: '중국인민지원군',
        role: 'offensive',
        classification: 'Axis',
        note: '10월 말 대규모 개입',
      },
      {
        id: 'kw-dprk',
        name: '조선민주주의인민공화국',
        role: 'offensive',
        classification: 'Axis',
        note: '소련제 장비 지원',
      },
    ],
    influence: [
      {
        label: '냉전 아시아 전선 고착',
        value: 85,
        description: '한반도 DMZ 확립, 미·중 군사 대치 심화',
      },
      {
        label: '군사 동맹 체계',
        value: 70,
        description: '한미상호방위조약, 미·일 안보조약 개정',
      },
    ],
    map: {
      summary:
        '38선을 기준으로 전선이 왕복 이동한 경로를 시각적으로 추적합니다.',
      markers: [
        {
          id: 'marker-inchon',
          label: '인천 상륙',
          coordinates: { lat: 37.4563, lng: 126.7052 },
          category: 'turning-point',
          detail: '전황 반전 계기',
        },
        {
          id: 'marker-panm',
          label: '판문점 협상',
          coordinates: { lat: 37.9613, lng: 126.6819 },
          category: 'occupation',
          detail: '정전 협정 서명',
        },
      ],
    },
    quickFacts: {
      commandStructure: '유엔군 사령부 vs 조선인민군/중국인민지원군 연합사',
      decisiveTechnology: '함정·항공기, 대포병 레이더, MASH 의료체계',
      intelligenceNotes: '신호정보 부족, 현지 정보요원 의존',
      logisticalScale: '부산항·인천항을 통한 월 35만 톤 보급',
    },
  },
  {
    id: 'event-us-china-trade-war',
    title: '미·중 무역전쟁',
    type: 'diplomatic-conflict',
    category: 'economic',
    description:
      '2018년 이후 미국과 중국이 상호 관세 부과, 기술 수출 통제, 공급망 재편으로 맞불을 놓으며 글로벌 교역 질서를 뒤흔든 사건입니다.',
    startDate: '2018-03-22',
    endDate: '2020-01-15',
    location: '워싱턴 D.C., 베이징, 글로벌 공급망',
    tags: ['관세', '공급망', '반도체', '외교분쟁'],
    background:
      '미국은 대규모 무역적자와 지식재산권 침해를 문제 삼았고, 중국은 제조 2025 전략을 통해 첨단 산업 자립을 가속하면서 갈등이 폭발했습니다.',
    aftermath:
      '1단계 합의로 관세 일부가 동결됐지만 기술 패권 경쟁은 반도체·AI·배터리 등 첨단 공급망에서 장기화되며 탈세계화 흐름을 촉발했습니다.',
    stats: {
      casualties: {
        total: 0,
        civilians: 0,
        military: 0,
      },
      participatingNations: 2,
      theaters: 2,
      durationInYears: 2,
    },
    visuals: {
      heroImageUrl:
        'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1600&q=80',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
      gallery: [
        {
          id: 'trade-gallery-1',
          title: '관세 부과 발표',
          url: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1600&q=80',
          caption: '백악관에서 열린 관세 부과 관련 기자회견',
          source: 'White House Photo',
        },
        {
          id: 'trade-gallery-2',
          title: '상무부 조사',
          url: 'https://images.unsplash.com/photo-1474631245212-32dc3c8310c6?auto=format&fit=crop&w=1600&q=80',
          caption: '미 상무부 로비에 전시된 글로벌 교역 데이터 보드',
          source: 'US Department of Commerce',
        },
        {
          id: 'trade-gallery-3',
          title: '상하이 협상장',
          url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1600&q=80',
          caption: '상하이에서 진행된 협상 라운드',
          source: 'Xinhua',
        },
      ],
    },
    hierarchy: {
      id: 'event-us-china-trade-war',
      title: '미·중 무역전쟁 (2018-2020)',
      summary: '섹션 301 조사 → 관세 보복 → 기술 수출 통제 → 1단계 합의',
      period: { start: '2018-03-22', end: '2020-01-15' },
      importance: 'major',
      children: [
        {
          id: 'trade-301',
          title: '섹션 301 보고서',
          summary: '지재권 침해 조사 결과 발표',
          period: { start: '2018-03-22' },
          importance: 'major',
        },
        {
          id: 'trade-tariff-round',
          title: '단계별 관세 부과',
          summary: '미국 2500억달러 + 중국 1100억달러 상호 관세',
          period: { start: '2018-07-06', end: '2019-09-01' },
          importance: 'critical',
        },
        {
          id: 'trade-phase-one',
          title: '1단계 합의',
          summary: '농산물 확대 수입, IP 보호 강화 약속',
          period: { start: '2019-12-13', end: '2020-01-15' },
          importance: 'major',
        },
      ],
    },
    timeline: [
      {
        id: 'trade-tl-1',
        occurredAt: '2018-03-22',
        title: 'USTR 섹션 301 보고서',
        description:
          '미국무역대표부가 중국의 강제 기술 이전·지식재산권 침해를 지적한 보고서를 발표',
        locationName: '워싱턴 D.C.',
        coordinates: { lat: 38.8977, lng: -77.0365 },
      },
      {
        id: 'trade-tl-2',
        occurredAt: '2018-07-06',
        title: '1차 관세 부과',
        description:
          '미국이 340억 달러 규모의 중국산 제품에 25% 관세 부과, 중국이 즉각 보복',
        locationName: '워싱턴 D.C. / 베이징',
        coordinates: { lat: 39.9042, lng: 116.4074 },
      },
      {
        id: 'trade-tl-3',
        occurredAt: '2019-05-15',
        title: '화웨이 수출 통제',
        description:
          '미 상무부가 화웨이를 Entity List에 올리고 첨단 부품 수출을 차단',
        locationName: '워싱턴 D.C.',
        coordinates: { lat: 38.8977, lng: -77.0365 },
      },
      {
        id: 'trade-tl-4',
        occurredAt: '2020-01-15',
        title: '1단계 무역 합의 서명',
        description: '양국이 백악관에서 1단계 합의문에 서명하며 국면이 완화',
        locationName: '워싱턴 D.C.',
        coordinates: { lat: 38.8977, lng: -77.0365 },
      },
    ],
    theaters: [
      {
        id: 'trade-theater-tariff',
        name: '관세 전선',
        description: '재무부·상무부가 주도한 양국 간 관세 공방',
        strategicFocus:
          '제조업 기반 보호, 농산물 시장 확대, 중간재 의존도 조정',
        operations: [
          {
            id: 'tariff-round-a',
            name: 'List A 관세',
            summary: '산업재·기계류 중심 25% 관세',
            outcome: '중국 내 가치사슬 재조정, 미국 제조업 부담 증가',
            location: '미국 관세국경',
          },
          {
            id: 'tariff-round-b',
            name: 'List 4 관세',
            summary: '소비재 관세 위협 후 일부 연기',
            outcome: '소비자 물가 상승 우려로 단계적 시행',
            location: '미국/중국',
          },
        ],
      },
      {
        id: 'trade-theater-tech',
        name: '기술·투자 규제',
        description:
          '반도체, 통신장비, 클라우드, 앱 서비스 등 첨단 산업에서 벌어진 통제 전선',
        strategicFocus:
          '첨단 공급망 자립, 데이터 거버넌스 규범 경쟁, 핵심 부품 탈중국화',
        operations: [
          {
            id: 'trade-op-entity',
            name: 'Entity List 확장',
            summary: '화웨이·SMIC 등 중국 기술기업 제재',
            outcome: '글로벌 반도체 공급망 재편',
            location: '글로벌 파운드리/설계사',
          },
          {
            id: 'trade-op-invest',
            name: '미국 내 중국 투자 심사',
            summary: 'CFIUS 심사 강화, 전략 산업 인수 제한',
            outcome: '중국 자본의 기술 투자 위축',
            location: '미국',
          },
        ],
      },
    ],
    keyFigures: [
      {
        id: 'trump',
        name: '도널드 트럼프',
        role: '미국 대통령',
        nation: '미국',
        contribution: 'America First 공약에 따라 대중 관세 정책을 직접 주도',
      },
      {
        id: 'liu-he',
        name: '류허',
        role: '중국 부총리',
        nation: '중국',
        contribution: '협상단을 이끌며 1단계 합의 서명',
      },
      {
        id: 'robert-lighthizer',
        name: '로버트 라이트하이저',
        role: 'USTR 대표',
        nation: '미국',
        contribution: '섹션 301 조사·협상 전략 수립',
      },
    ],
    countries: [
      {
        id: 'trade-us',
        name: '미국',
        role: 'offensive',
        classification: 'Allies',
        note: '관세·투자 제한 정책 발동',
      },
      {
        id: 'trade-china',
        name: '중국',
        role: 'defensive',
        classification: 'Axis',
        note: '관세 보복 및 기술 자립 가속',
      },
    ],
    influence: [
      {
        label: '공급망 재편',
        value: 82,
        description: '반도체·배터리 등 핵심 부품의 리쇼어링',
      },
      {
        label: '글로벌 무역 안정성',
        value: 45,
        description: '세계 교역 성장 둔화, 보호무역 확산',
      },
      {
        label: '기술 패권 경쟁',
        value: 90,
        description: 'AI·5G·반도체 분야 전략경쟁 고착화',
      },
    ],
    map: {
      summary:
        '워싱턴과 베이징을 중심으로 관세·협상 라운드가 전개되고, 글로벌 공급망 주요 도시가 영향을 받았다.',
      markers: [
        {
          id: 'trade-marker-washington',
          label: '백악관',
          coordinates: { lat: 38.8977, lng: -77.0365 },
          category: 'turning-point',
          detail: '관세 발표 및 1단계 합의 서명',
        },
        {
          id: 'trade-marker-beijing',
          label: '베이징',
          coordinates: { lat: 39.9042, lng: 116.4074 },
          category: 'turning-point',
          detail: '보복 관세·국내 산업 지원책 발표',
        },
      ],
    },
    quickFacts: {
      commandStructure: 'USTR·재무부 vs 중국 국무원 경제팀',
      decisiveTechnology: '반도체, 5G, AI 클라우드 서비스',
      intelligenceNotes: '관세 예고, 기업 제재 리스트 사전 유출 이슈',
      logisticalScale: '글로벌 공급망 재배치, 멀티소싱 전략 확산',
    },
    sources: [
      { label: 'USTR Section 301 Report', url: 'https://ustr.gov' },
      { label: 'Phase One Agreement', url: 'https://ustr.gov/phase-one' },
    ],
  },
  {
    id: 'event-cuban-missile-crisis',
    title: '쿠바 미사일 위기',
    type: 'political-shift',
    category: 'political',
    description:
      '1962년 10월 미·소가 쿠바에 배치된 핵미사일을 둘러싸고 13일간 초강력 대치를 벌이면서 핵전쟁 직전까지 치달았던 사건입니다.',
    startDate: '1962-10-16',
    endDate: '1962-10-28',
    location: '워싱턴 D.C., 모스크바, 하바나',
    tags: ['핵위기', '냉전', '외교협상'],
    background:
      '피그만 침공 이후 미국은 쿠바 정권 전복을 모색했고, 소련은 전략 균형을 맞추기 위해 쿠바에 중거리 핵미사일을 비밀리에 배치했습니다.',
    aftermath:
      '소련이 미사일을 철수하고 미국은 쿠바 불가침과 터키 주피터 미사일 철수를 약속하면서 위기는 해소됐고, 워싱턴-모스크바 직통 전화와 핵통제 체제가 마련됐습니다.',
    stats: {
      casualties: { total: 0, civilians: 0, military: 0 },
      participatingNations: 3,
      theaters: 1,
      durationInYears: 1,
    },
    visuals: {
      heroImageUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1500534314210-7b52c68b2e33?auto=format&fit=crop&w=800&q=80',
      gallery: [
        {
          id: 'cuban-gallery-1',
          title: '백악관 전쟁회의',
          url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1600&q=80',
          caption: 'EXCOMM 회의에서 대응책을 논의하는 케네디 정부',
          source: 'JFK Library',
        },
        {
          id: 'cuban-gallery-2',
          title: '쿠바 미사일 기지 정찰',
          url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1600&q=80',
          caption: 'U-2 정찰기가 촬영한 소련 미사일 발사대',
          source: 'CIA',
        },
      ],
    },
    hierarchy: {
      id: 'event-cuban-missile-crisis',
      title: '쿠바 미사일 위기 (1962)',
      summary: '정찰 사진 → 해상 봉쇄 → 비공개 협상 → 미사일 철거',
      period: { start: '1962-10-16', end: '1962-10-28' },
      importance: 'critical',
      children: [
        {
          id: 'cuban-quarantine',
          title: '해상 검역선포',
          summary: '쿠바 주변 800km 해상 차단',
          period: { start: '1962-10-22', end: '1962-10-28' },
          importance: 'critical',
        },
        {
          id: 'cuban-backchannel',
          title: '백채널 협상',
          summary: '로버트 케네디-도브리닌 비밀 교섭',
          period: { start: '1962-10-26', end: '1962-10-27' },
          importance: 'major',
        },
      ],
    },
    timeline: [
      {
        id: 'cuban-timeline-1',
        occurredAt: '1962-10-16',
        title: '정찰 사진 확인',
        description: 'U-2 정찰기가 쿠바 산크리스토발 지역의 R-12 미사일을 촬영',
        locationName: '쿠바 산크리스토발',
        coordinates: { lat: 22.6, lng: -83.0 },
      },
      {
        id: 'cuban-timeline-2',
        occurredAt: '1962-10-22',
        title: '대국민 연설 및 해상봉쇄',
        description:
          '케네디 대통령이 TV 연설을 통해 위기를 공개하고 해상검역을 선포',
        locationName: '워싱턴 D.C.',
        coordinates: { lat: 38.8977, lng: -77.0365 },
      },
      {
        id: 'cuban-timeline-3',
        occurredAt: '1962-10-28',
        title: '철수 합의 발표',
        description:
          '소련이 공개적으로 미사일 철수를 약속하고 미국은 쿠바 불가침을 재확인',
        locationName: '모스크바',
        coordinates: { lat: 55.7558, lng: 37.6173 },
      },
    ],
    theaters: [
      {
        id: 'cuban-theater-atlantic',
        name: '카리브해 해상 검역선',
        description: '미 해군이 구축한 해상 차단선으로 소련 선박을 감시',
        strategicFocus: '핵탄두 반입 차단, 군사충돌 억제',
        operations: [
          {
            id: 'cuban-op-quarantine',
            name: 'Quarantine Operation',
            summary: '해군 구축함·항공모함이 쿠바 접근 선박을 검문',
            outcome: '소련 화물선 회항, 핵전 확전 방지',
            location: '플로리다 남동부 해역',
          },
        ],
      },
    ],
    keyFigures: [
      {
        id: 'jfk',
        name: '존 F. 케네디',
        role: '미국 대통령',
        nation: '미국',
        contribution: 'EXCOMM 운영, 단계적 해상 봉쇄 전략 승인',
      },
      {
        id: 'khrushchev',
        name: '니키타 흐루쇼프',
        role: '소련 공산당 서기장',
        nation: '소련',
        contribution: '미사일 철수 결정으로 충돌 회피',
      },
      {
        id: 'castro',
        name: '피델 카스트로',
        role: '쿠바 총리',
        nation: '쿠바',
        contribution: '소련 미사일 배치 허용, 방어 태세 강화',
      },
    ],
    countries: [
      {
        id: 'cuban-usa',
        name: '미국',
        role: 'defensive',
        classification: 'Allies',
        note: '쿠바 해상 검역 및 터키 미사일 조정',
      },
      {
        id: 'cuban-ussr',
        name: '소련',
        role: 'offensive',
        classification: 'Axis',
        note: '쿠바에 중거리 핵미사일 배치',
      },
      {
        id: 'cuban-cuba',
        name: '쿠바',
        role: 'support',
        classification: 'Colony',
        note: '미사일 기지 제공 및 방공 강화',
      },
    ],
    influence: [
      {
        label: '핵위기 관리 규범',
        value: 95,
        description: '핵비확산 조약, 직통전화, 위기관리에 대한 교훈 제공',
      },
      {
        label: '냉전 완화',
        value: 70,
        description: '부분적 데탕트 기반 마련',
      },
    ],
    map: {
      summary:
        '쿠바, 워싱턴, 모스크바를 잇는 위기 지점을 시각화해 해상 검역선과 협상 경로를 보여줍니다.',
      markers: [
        {
          id: 'marker-quarantine-line',
          label: '해상 검역선',
          coordinates: { lat: 23.5, lng: -75.0 },
          category: 'turning-point',
          detail: '미 해군이 설정한 800km 검역선',
        },
        {
          id: 'marker-soviet-ships',
          label: '소련 화물선 회항',
          coordinates: { lat: 24.5, lng: -69.0 },
          category: 'turning-point',
          detail: '미국과 충돌 직전 회항',
        },
      ],
    },
    quickFacts: {
      commandStructure: 'EXCOMM(미) vs 소련 정치국',
      decisiveTechnology: 'U-2 정찰기, 위성통신, 해군 레이다',
      intelligenceNotes: 'U-2 격추 사건이 위기 고조',
      logisticalScale: '해군 180척, 항공대 4만 명 출동 대비',
    },
  },
  {
    id: 'event-1973-oil-shock',
    title: '1973년 1차 오일 쇼크',
    type: 'economic-crisis',
    category: 'economic',
    description:
      'OAPEC 산유국이 4차 중동전쟁에 대한 서방의 이스라엘 지원을 이유로 원유 금수 조치를 단행하며 유가가 4배 폭등한 글로벌 경제 위기입니다.',
    startDate: '1973-10-17',
    endDate: '1974-03-18',
    location: '중동 산유국, OECD 주요국',
    tags: ['인플레이션', '에너지위기', '스태그플레이션'],
    background:
      '브레턴우즈 체제 붕괴와 중동 지역 긴장 속에 산유국이 자원 무기화를 선언하면서 에너지 의존도가 높은 선진국이 큰 충격을 받았습니다.',
    aftermath:
      '선진국들은 전략비축유 제도, 에너지 절약 캠페인, 원전·대체에너지 개발을 추진했고 세계 경제는 스태그플레이션 국면에 빠졌습니다.',
    stats: {
      casualties: { total: 0, civilians: 0, military: 0 },
      participatingNations: 13,
      theaters: 2,
      durationInYears: 1,
    },
    visuals: {
      heroImageUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
      gallery: [
        {
          id: 'oil-gallery-1',
          title: '주유소 대기 열',
          url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1600&q=80',
          caption: '미국 전역에서 차량이 주유를 기다리는 장면',
          source: 'Library of Congress',
        },
        {
          id: 'oil-gallery-2',
          title: 'OPEC 회의',
          url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1600&q=80',
          caption: '빈에서 열린 OPEC 각료 회의',
          source: 'AP Archive',
        },
      ],
    },
    hierarchy: {
      id: 'event-1973-oil-shock',
      title: '1차 오일 쇼크 (1973-1974)',
      summary: '금수 조치 → 유가 4배 상승 → 경기침체 · 인플레이션 파급',
      period: { start: '1973-10-17', end: '1974-03-18' },
      importance: 'critical',
      children: [
        {
          id: 'oil-embargo',
          title: '산유국 금수 조치',
          summary: '미·네덜란드 등 우방국에 원유 공급 중단',
          period: { start: '1973-10-17', end: '1974-03-18' },
          importance: 'critical',
        },
        {
          id: 'oil-iea',
          title: 'IEA 창설',
          summary: 'OECD가 국제에너지기구를 창립해 공동 대응 체계 구축',
          period: { start: '1974-11-18' },
          importance: 'major',
        },
      ],
    },
    timeline: [
      {
        id: 'oil-timeline-1',
        occurredAt: '1973-10-17',
        title: 'OAPEC 금수 발표',
        description:
          '산유국이 이스라엘을 지원하는 국가에 대한 원유 수출 중단을 결정',
        locationName: '쿠웨이트 시티',
        coordinates: { lat: 29.3759, lng: 47.9774 },
      },
      {
        id: 'oil-timeline-2',
        occurredAt: '1973-12-01',
        title: '유가 4배 상승',
        description: '배럴당 2.9달러에서 11.6달러로 급등',
        locationName: '국제 원유 시장',
        coordinates: { lat: 25.2048, lng: 55.2708 },
      },
      {
        id: 'oil-timeline-3',
        occurredAt: '1974-03-18',
        title: '금수 조치 해제',
        description: '사우디가 미국에 대한 금수 조치를 철회하며 위기 완화',
        locationName: '리야드',
        coordinates: { lat: 24.7136, lng: 46.6753 },
      },
    ],
    theaters: [
      {
        id: 'oil-theater-energy',
        name: '에너지 공급선',
        description: '산유국의 생산량 조절과 선적 통제가 초점을 이룸',
        strategicFocus: '공급 축소를 통한 가격 영향력 행사',
        operations: [
          {
            id: 'oil-op-production',
            name: '산유량 감축',
            summary: '일일 500만 배럴 감산 발표',
            outcome: '세계 원유 공급의 7% 축소',
            location: '사우디아라비아, 쿠웨이트',
          },
        ],
      },
      {
        id: 'oil-theater-importers',
        name: '수입국 비상 계획',
        description: 'OECD 국가들이 비상배급제와 에너지 절약 캠페인을 시행',
        strategicFocus: '수요 억제, 비축유 활용, 대체에너지 연구',
        operations: [
          {
            id: 'oil-op-car-free',
            name: '차 없는 날',
            summary: '네덜란드·독일 등이 주말 차량 운행 제한',
            outcome: '연료 수요 일시 감소',
            location: '서유럽',
          },
        ],
      },
    ],
    keyFigures: [
      {
        id: 'king-faisal',
        name: '파이살 국왕',
        role: '사우디아라비아 국왕',
        nation: '사우디아라비아',
        contribution: '금수조치 주도 및 석유 무기화 선언',
      },
      {
        id: 'henry-kissinger',
        name: '헨리 키신저',
        role: '미국 국무장관',
        nation: '미국',
        contribution: '셔틀외교로 산유국과 협상, IEA 창설 추진',
      },
    ],
    countries: [
      {
        id: 'oil-oapec',
        name: 'OAPEC',
        role: 'offensive',
        classification: 'Axis',
        note: '사우디, UAE, 쿠웨이트 등 아랍 산유국 연합',
      },
      {
        id: 'oil-oecd',
        name: 'OECD 수입국',
        role: 'defensive',
        classification: 'Allies',
        note: '미국, 일본, 서유럽 주요국',
      },
    ],
    influence: [
      {
        label: '스태그플레이션 촉발',
        value: 88,
        description: '물가와 실업이 동시에 치솟는 거시경제 변곡점',
      },
      {
        label: '에너지 안보 정책',
        value: 80,
        description: '전략비축유 제도와 IEA 체계 탄생',
      },
    ],
    map: {
      summary:
        '산유국 생산지와 OECD 주요 수입항을 연결해 원유 공급망 압박 지점을 보여줍니다.',
      markers: [
        {
          id: 'oil-marker-ras-tanura',
          label: '라스 타누라',
          coordinates: { lat: 26.6407, lng: 50.1558 },
          category: 'turning-point',
          detail: '사우디 최대 원유 수출터미널',
        },
        {
          id: 'oil-marker-rotterdam',
          label: '로테르담 항',
          coordinates: { lat: 51.9244, lng: 4.4777 },
          category: 'turning-point',
          detail: '유럽 원유 수입 허브, 공급 차질 심각',
        },
      ],
    },
    quickFacts: {
      commandStructure: '산유국 석유장관회의 vs OECD 비상경제각료회의',
      decisiveTechnology: '해상 유조선, 원유 정제 네트워크',
      intelligenceNotes: '산유국 감산 계획 유출로 시장 혼란',
      logisticalScale: '일일 500만 배럴 감산, 비축유 방출 200만 배럴',
    },
  },
  {
    id: 'event-arab-spring',
    title: '아랍의 봄',
    type: 'political-shift',
    category: 'social',
    description:
      '2010년 튀니지에서 촉발된 민주화 시위가 중동·북아프리카 전역으로 확산되어 여러 권위주의 정권을 무너뜨린 연쇄 사회운동입니다.',
    startDate: '2010-12-17',
    endDate: '2012-12-31',
    location: '튀니지, 이집트, 리비아, 시리아 등',
    tags: ['민주화', 'SNS', '시민혁명'],
    background:
      '장기 독재, 청년실업, 부패, 식량가격 상승이 누적되었고 스마트폰과 소셜미디어가 시민 동원에 큰 역할을 했습니다.',
    aftermath:
      '튀니지는 민주주의로 이행했지만 시리아 내전, 리비아 붕괴 등 국가별 결과는 엇갈리며 지역 질서가 크게 변했습니다.',
    stats: {
      casualties: { total: 220000, civilians: 210000, military: 10000 },
      participatingNations: 12,
      theaters: 4,
      durationInYears: 2,
    },
    visuals: {
      heroImageUrl:
        'https://images.unsplash.com/photo-1458071103677-4b27de1cd272?auto=format&fit=crop&w=1600&q=80',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',
      gallery: [
        {
          id: 'arab-gallery-1',
          title: '타흐리르 광장',
          url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
          caption: '이집트 타흐리르 광장을 가득 메운 시민들',
          source: 'Reuters',
        },
      ],
    },
    hierarchy: {
      id: 'event-arab-spring',
      title: '아랍의 봄 (2010-2012)',
      summary: '튀니지 분신 → SNS 확산 → 이집트·리비아 정권 교체',
      period: { start: '2010-12-17', end: '2012-12-31' },
      importance: 'major',
      children: [
        {
          id: 'arab-tunisia',
          title: '튀니지 자스민 혁명',
          summary: '벤 알리 정권 붕괴',
          period: { start: '2010-12-17', end: '2011-01-14' },
          importance: 'critical',
        },
        {
          id: 'arab-egypt',
          title: '이집트 타흐리르 시위',
          summary: '무바라크 대통령 사임',
          period: { start: '2011-01-25', end: '2011-02-11' },
          importance: 'critical',
        },
      ],
    },
    timeline: [
      {
        id: 'arab-timeline-1',
        occurredAt: '2010-12-17',
        title: '부아지지 분신',
        description: '노점상 무함마드 부아지지가 분신하며 시위 촉발',
        locationName: '튀니지 시디부지드',
        coordinates: { lat: 35.037, lng: 9.485 },
      },
      {
        id: 'arab-timeline-2',
        occurredAt: '2011-02-11',
        title: '무바라크 사임',
        description: '이집트 군부가 대통령 사임을 발표',
        locationName: '카이로',
        coordinates: { lat: 30.0444, lng: 31.2357 },
      },
      {
        id: 'arab-timeline-3',
        occurredAt: '2011-10-20',
        title: '카다피 축출',
        description: '리비아에서 카다피가 축출되고 내전이 마무리 단계로 진입',
        locationName: '시르테',
        coordinates: { lat: 31.2089, lng: 16.5887 },
      },
    ],
    theaters: [
      {
        id: 'arab-theater-social',
        name: '디지털 동원',
        description: '페이스북·트위터 등 SNS가 시위를 조직',
        strategicFocus: '정보전, 해시태그 캠페인, 국제 여론 압박',
        operations: [
          {
            id: 'arab-op-facebook',
            name: '온라인 타흐리르',
            summary: '"We Are All Khaled Said" 페이지 운영',
            outcome: '수백만 명 동시 동원',
            location: '이집트',
          },
        ],
      },
      {
        id: 'arab-theater-street',
        name: '도심 광장 시위',
        description: '대규모 시위와 시위 진압이 반복',
        strategicFocus: '정권 퇴진 요구, 국제 미디어 노출',
        operations: [
          {
            id: 'arab-op-tahrir',
            name: '타흐리르 점거',
            summary: '18일간 지속된 이집트 광장 점거',
            outcome: '무바라크 사임',
            location: '카이로',
          },
        ],
      },
    ],
    keyFigures: [
      {
        id: 'arab-bouazizi',
        name: '무함마드 부아지지',
        role: '시민',
        nation: '튀니지',
        contribution: '분신 항거로 운동 촉발',
      },
      {
        id: 'arab-wael',
        name: '와엘 곤임',
        role: 'IT 활동가',
        nation: '이집트',
        contribution: '페이스북 페이지 운영, 시위 조직',
      },
    ],
    countries: [
      {
        id: 'arab-tunisia',
        name: '튀니지',
        role: 'defensive',
        classification: 'Allies',
        note: '민주 헌법 제정, 선거 실시',
      },
      {
        id: 'arab-libya',
        name: '리비아',
        role: 'offensive',
        classification: 'Axis',
        note: '카다피 정권 붕괴 후 내전',
      },
    ],
    influence: [
      {
        label: '디지털 시민운동',
        value: 85,
        description: 'SNS 기반 민주화 사례로 기록',
      },
      {
        label: '중동 질서 변화',
        value: 70,
        description: '권위주의 붕괴와 내전 동시 발생',
      },
    ],
    map: {
      summary:
        '타흐리르 광장, 튀니지, 리비아, 시리아 등 시위 확산 경로를 시각화합니다.',
      markers: [
        {
          id: 'arab-marker-tunisia',
          label: '튀니지',
          coordinates: { lat: 36.8, lng: 10.18 },
          category: 'turning-point',
          detail: '운동 발원지',
        },
        {
          id: 'arab-marker-cairo',
          label: '카이로',
          coordinates: { lat: 30.0444, lng: 31.2357 },
          category: 'turning-point',
          detail: '타흐리르 광장 시위',
        },
      ],
    },
    quickFacts: {
      commandStructure: '탈중앙 시민운동 네트워크',
      decisiveTechnology: '스마트폰, 소셜미디어, 위성방송',
      intelligenceNotes: '정권의 인터넷 차단으로 정보전 격화',
      logisticalScale: '국경 간 연대, 난민·이동인구 수백만',
    },
  },
  {
    id: 'event-dotcom-boom',
    title: '닷컴 버블과 붕괴',
    type: 'economic-crisis',
    category: 'technological',
    description:
      '1990년대 후반 인터넷 기업에 과도한 투자가 몰리며 나스닥 지수가 폭등했다가 2000년 거품이 붕괴한 사건입니다.',
    startDate: '1995-08-09',
    endDate: '2002-10-09',
    location: '실리콘밸리, 월스트리트, 글로벌 벤처 생태계',
    tags: ['인터넷', '벤처', '거품'],
    background:
      '웹 브라우저 등장과 벤처캐피탈 붐으로 영업 실적이 없는 스타트업도 높은 기업가치를 인정받았고, 개인 투자자들이 대거 참여했습니다.',
    aftermath:
      '수많은 스타트업이 파산했지만 남은 기업은 클라우드·전자상거래를 기반으로 21세기 디지털 경제를 이끌었습니다.',
    stats: {
      casualties: { total: 0, civilians: 0, military: 0 },
      participatingNations: 5,
      theaters: 2,
      durationInYears: 7,
    },
    visuals: {
      heroImageUrl:
        'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1600&q=80',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=800&q=80',
      gallery: [
        {
          id: 'dotcom-gallery-1',
          title: '나스닥 시세판',
          url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1600&q=80',
          caption: '2000년 3월 사상 최고치를 찍은 나스닥 지수',
          source: 'NASDAQ',
        },
      ],
    },
    hierarchy: {
      id: 'event-dotcom-boom',
      title: '닷컴 버블 (1995-2002)',
      summary: '브라우저 혁명 → IPO 열풍 → 거품 붕괴 → 생존 기업 성장',
      period: { start: '1995-08-09', end: '2002-10-09' },
      importance: 'major',
      children: [
        {
          id: 'dotcom-ipo',
          title: '넷스케이프 상장',
          summary: '인터넷 기업 IPO 붐의 시작',
          period: { start: '1995-08-09' },
          importance: 'major',
        },
        {
          id: 'dotcom-crash',
          title: '버블 붕괴',
          summary: '나스닥 지수 5000→1100으로 폭락',
          period: { start: '2000-03-10', end: '2002-10-09' },
          importance: 'critical',
        },
      ],
    },
    timeline: [
      {
        id: 'dotcom-timeline-1',
        occurredAt: '1995-08-09',
        title: '넷스케이프 IPO',
        description: '첫날 주가가 두 배로 뛰며 벤처 붐 시작',
        locationName: '뉴욕 증권거래소',
        coordinates: { lat: 40.7069, lng: -74.0113 },
      },
      {
        id: 'dotcom-timeline-2',
        occurredAt: '2000-03-10',
        title: '나스닥 정점',
        description: '지수 5048 기록 후 급락 시작',
        locationName: '나스닥',
        coordinates: { lat: 40.757, lng: -73.9867 },
      },
      {
        id: 'dotcom-timeline-3',
        occurredAt: '2001-09-11',
        title: '투자심리 급랭',
        description: '9·11 테러 이후 기술주 매도 가속',
        locationName: '뉴욕',
        coordinates: { lat: 40.7128, lng: -74.006 },
      },
    ],
    theaters: [
      {
        id: 'dotcom-theater-capital',
        name: '벤처 자본 시장',
        description: 'VC와 IPO 시장에서 자금이 폭발적으로 유입',
        strategicFocus: '신규 사용자 확보, 적자 감수',
        operations: [
          {
            id: 'dotcom-op-ipo',
            name: '닷컴 IPO 파이프라인',
            summary: '2000년까지 400개 이상 상장',
            outcome: '과잉공급으로 가치 붕괴',
            location: '미국·유럽 증시',
          },
        ],
      },
      {
        id: 'dotcom-theater-tech',
        name: '실리콘밸리 생태계',
        description: '검색, 포털, 전자상거래 기업이 폭발적 성장을 추구',
        strategicFocus: '사용자 기반 확대, 네트워크 효과 확보',
        operations: [
          {
            id: 'dotcom-op-infra',
            name: '데이터센터 구축',
            summary: '통신 회선·서버 인프라 투자 급증',
            outcome: '과잉설비 발생, 이후 클라우드 기반이 됨',
            location: '미국 서부',
          },
        ],
      },
    ],
    keyFigures: [
      {
        id: 'dotcom-bezos',
        name: '제프 베이조스',
        role: '아마존 CEO',
        nation: '미국',
        contribution: '전자상거래 모델 확립, 위기 후 재도약',
      },
      {
        id: 'dotcom-masayoshi',
        name: '손정의',
        role: '소프트뱅크 회장',
        nation: '일본',
        contribution: '대규모 인터넷 투자로 거품 확대',
      },
    ],
    countries: [
      {
        id: 'dotcom-usa',
        name: '미국',
        role: 'offensive',
        classification: 'Allies',
        note: '실리콘밸리·나스닥 중심',
      },
      {
        id: 'dotcom-eu',
        name: '유럽연합',
        role: 'support',
        classification: 'Allies',
        note: '텔레콤·미디어 기업들이 동참',
      },
    ],
    influence: [
      {
        label: '디지털 경제 토대',
        value: 78,
        description: '클라우드·e커머스 산업의 전환점',
      },
      {
        label: '투자 규제 강화',
        value: 60,
        description: '회계 투명성, 사베인스-옥슬리법 제정으로 이어짐',
      },
    ],
    map: {
      summary:
        '실리콘밸리, 시애틀, 뉴욕 등 벤처·자본 허브와 글로벌 인터넷 백본을 나타냅니다.',
      markers: [
        {
          id: 'dotcom-marker-sv',
          label: '실리콘밸리',
          coordinates: { lat: 37.3875, lng: -122.0575 },
          category: 'turning-point',
          detail: '스타트업 클러스터',
        },
        {
          id: 'dotcom-marker-nasdaq',
          label: '나스닥',
          coordinates: { lat: 40.757, lng: -73.9867 },
          category: 'turning-point',
          detail: '거품 형성 및 붕괴',
        },
      ],
    },
    quickFacts: {
      commandStructure: '벤처캐피털·언더라이터·나스닥 투자자',
      decisiveTechnology: '인터넷 백본, 데이터센터, 웹 브라우저',
      intelligenceNotes: '분석사 보고서와 금융 미디어가 과열 조장',
      logisticalScale: '수천억 달러의 자본이 스타트업으로 유입',
    },
  },
]
