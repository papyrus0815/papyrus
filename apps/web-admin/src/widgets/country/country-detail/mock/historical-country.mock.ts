/**
 * 역사적 국가 목업 데이터
 */

export interface HistoricalEvent {
  id: string
  year: number
  month?: number
  day?: number
  title: string
  description: string
  type: 'war' | 'reform' | 'culture' | 'diplomacy' | 'disaster' | 'achievement'
  importance: 'high' | 'medium' | 'low'
}

export interface HistoricalFigure {
  id: string
  name: string
  enName?: string
  birthYear?: number
  deathYear?: number
  role: string
  description: string
  imageUrl?: string
  achievements: string[]
}

export interface TerritoryChange {
  year: number
  description: string
  type: 'expansion' | 'reduction' | 'stable'
  area?: string
}

export interface CulturalHeritage {
  id: string
  name: string
  year?: number
  category: '건축' | '예술' | '과학' | '문학' | '종교' | '기타'
  description: string
  imageUrl?: string
  significance: string
}

// ============================================
// 조선 왕조 목업 데이터
// ============================================

export const joseonEvents: HistoricalEvent[] = [
  {
    id: 'joseon-founding',
    year: 1392,
    month: 7,
    day: 17,
    title: '조선 건국',
    description: '이성계가 위화도 회군 후 고려를 무너뜨리고 조선을 건국했습니다.',
    type: 'achievement',
    importance: 'high',
  },
  {
    id: 'hangeul-creation',
    year: 1443,
    title: '훈민정음 창제',
    description: '세종대왕이 한글을 창제하여 백성들이 쉽게 배우고 사용할 수 있는 문자를 만들었습니다.',
    type: 'culture',
    importance: 'high',
  },
  {
    id: 'imjin-war',
    year: 1592,
    title: '임진왜란',
    description: '일본의 침략으로 7년간 전쟁이 벌어졌으며, 이순신 장군의 활약으로 승리했습니다.',
    type: 'war',
    importance: 'high',
  },
  {
    id: 'byeongjahoran',
    year: 1636,
    title: '병자호란',
    description: '청나라의 침략으로 인조가 삼전도에서 항복했습니다.',
    type: 'war',
    importance: 'high',
  },
  {
    id: 'catholic-persecution',
    year: 1801,
    title: '신유박해',
    description: '천주교 박해 사건으로 많은 신자들이 순교했습니다.',
    type: 'disaster',
    importance: 'medium',
  },
  {
    id: 'donghak-movement',
    year: 1894,
    title: '동학농민운동',
    description: '전봉준을 중심으로 한 농민들의 봉기로 사회 개혁을 요구했습니다.',
    type: 'reform',
    importance: 'high',
  },
  {
    id: 'ganghwa-treaty',
    year: 1876,
    title: '강화도 조약',
    description: '일본과 최초로 맺은 근대적 조약으로 개항의 시작이었습니다.',
    type: 'diplomacy',
    importance: 'high',
  },
  {
    id: 'gabo-reform',
    year: 1894,
    title: '갑오개혁',
    description: '신분제 폐지 등 근대적 개혁을 단행했습니다.',
    type: 'reform',
    importance: 'high',
  },
]

export const joseonFigures: HistoricalFigure[] = [
  {
    id: 'taejo',
    name: '태조 이성계',
    enName: 'Yi Seong-gye',
    birthYear: 1335,
    deathYear: 1408,
    role: '조선 건국자, 초대 국왕',
    description: '고려 말 무장으로 위화도 회군을 통해 정권을 장악하고 조선을 건국했습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=400',
    achievements: [
      '조선 왕조 건국 (1392년)',
      '한양 천도',
      '경국대전 편찬 기초 마련',
    ],
  },
  {
    id: 'sejong',
    name: '세종대왕',
    enName: 'King Sejong the Great',
    birthYear: 1397,
    deathYear: 1450,
    role: '제4대 국왕',
    description: '조선 최고의 성군으로 한글을 창제하고 과학 기술과 문화를 크게 발전시켰습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1604357209793-fca5dca89f97?w=400',
    achievements: [
      '훈민정음 창제 (1443년)',
      '측우기, 해시계 등 과학 기구 발명',
      '4군 6진 개척',
      '집현전 운영',
    ],
  },
  {
    id: 'yi-sun-sin',
    name: '이순신',
    enName: 'Admiral Yi Sun-sin',
    birthYear: 1545,
    deathYear: 1598,
    role: '조선 수군 통제사',
    description: '임진왜란 당시 뛰어난 전략과 거북선으로 일본 수군을 크게 격파한 명장입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400',
    achievements: [
      '한산도 대첩 (1592년)',
      '명량 해전 승리 (1597년)',
      '거북선 개발 및 운용',
      '23전 23승의 불패 기록',
    ],
  },
  {
    id: 'jeong-yak-yong',
    name: '정약용',
    enName: 'Jeong Yak-yong',
    birthYear: 1762,
    deathYear: 1836,
    role: '실학자, 문신',
    description: '조선 후기 대표적인 실학자로 많은 저서를 남기고 개혁 사상을 전파했습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    achievements: [
      '목민심서, 경세유표 저술',
      '수원 화성 설계 참여',
      '500여 권의 저서 집필',
      '실학 사상 집대성',
    ],
  },
  {
    id: 'queen-seondeok',
    name: '명성황후',
    enName: 'Empress Myeongseong',
    birthYear: 1851,
    deathYear: 1895,
    role: '고종의 왕비',
    description: '조선 말기 개화 정책을 추진했으나 일본 자객에 의해 시해당했습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400',
    achievements: [
      '개화 정책 추진',
      '러시아와의 외교 관계 강화',
      '일본 세력 견제',
    ],
  },
]

export const joseonTerritory: TerritoryChange[] = [
  {
    year: 1392,
    description: '건국 초기 영토는 고려의 영토를 그대로 계승',
    type: 'stable',
    area: '약 220,000 km²',
  },
  {
    year: 1433,
    description: '세종대왕의 4군 6진 개척으로 북방 영토 확장',
    type: 'expansion',
    area: '약 240,000 km²',
  },
  {
    year: 1592,
    description: '임진왜란으로 국토 황폐화, 실질적 지배 영역 감소',
    type: 'reduction',
  },
  {
    year: 1627,
    description: '정묘호란 이후 영토 변화 없음',
    type: 'stable',
  },
  {
    year: 1636,
    description: '병자호란 이후 청나라의 영향력 확대',
    type: 'stable',
  },
  {
    year: 1897,
    description: '대한제국 선포, 영토는 조선 말기와 동일',
    type: 'stable',
    area: '약 220,000 km²',
  },
]

export const joseonCulture: CulturalHeritage[] = [
  {
    id: 'hunminjeongeum',
    name: '훈민정음',
    year: 1443,
    category: '문학',
    description: '세종대왕이 창제한 한글의 원본으로 유네스코 세계기록유산입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400',
    significance: '독창적인 문자 체계로 세계적으로 인정받는 문화유산',
  },
  {
    id: 'gyeongbokgung',
    name: '경복궁',
    year: 1395,
    category: '건축',
    description: '조선 왕조의 법궁으로 서울의 대표적인 궁궐입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=400',
    significance: '조선 왕조의 정궁으로 건축미와 역사적 가치가 뛰어남',
  },
  {
    id: 'jikji',
    name: '직지심체요절',
    year: 1377,
    category: '과학',
    description: '세계에서 가장 오래된 금속활자본으로 유네스코 세계기록유산입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
    significance: '구텐베르크보다 78년 앞선 금속활자 인쇄술',
  },
  {
    id: 'turtle-ship',
    name: '거북선',
    year: 1592,
    category: '과학',
    description: '이순신 장군이 임진왜란에서 사용한 철갑 전투선입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400',
    significance: '세계 최초의 철갑선으로 해전사의 획기적인 발명',
  },
  {
    id: 'joseon-baekja',
    name: '조선백자',
    category: '예술',
    description: '순백의 아름다움을 지닌 조선시대 대표 도자기입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=400',
    significance: '절제미와 순수함으로 조선 미학을 대표',
  },
  {
    id: 'tripitaka-koreana',
    name: '팔만대장경',
    year: 1251,
    category: '종교',
    description: '고려시대 제작되어 조선시대까지 보존된 불교 경전의 집대성입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1545420333-23a22f34d8f5?w=400',
    significance: '현존하는 가장 완벽한 대장경판으로 유네스코 세계기록유산',
  },
]

// ============================================
// 고려 왕조 목업 데이터
// ============================================

export const goryeoEvents: HistoricalEvent[] = [
  {
    id: 'goryeo-founding',
    year: 918,
    title: '고려 건국',
    description: '왕건이 후고구려를 기반으로 고려를 건국했습니다.',
    type: 'achievement',
    importance: 'high',
  },
  {
    id: 'unification',
    year: 936,
    title: '후삼국 통일',
    description: '신라를 흡수하여 후삼국을 통일했습니다.',
    type: 'achievement',
    importance: 'high',
  },
  {
    id: 'mongol-invasions',
    year: 1231,
    title: '몽골 침략',
    description: '몽골의 침략으로 강화도로 천도하여 30년간 항전했습니다.',
    type: 'war',
    importance: 'high',
  },
  {
    id: 'tripitaka-creation',
    year: 1251,
    title: '팔만대장경 완성',
    description: '몽골 침략을 극복하고자 부처의 힘을 빌려 대장경을 제작했습니다.',
    type: 'culture',
    importance: 'high',
  },
  {
    id: 'metal-type',
    year: 1234,
    title: '금속활자 발명',
    description: '세계 최초로 금속활자를 발명하여 인쇄술을 혁신했습니다.',
    type: 'achievement',
    importance: 'high',
  },
]

export const goryeoFigures: HistoricalFigure[] = [
  {
    id: 'wang-geon',
    name: '왕건',
    enName: 'Wang Geon',
    birthYear: 877,
    deathYear: 943,
    role: '고려 태조, 건국자',
    description: '후삼국을 통일하고 고려를 건국한 왕입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=400',
    achievements: [
      '고려 건국 (918년)',
      '후삼국 통일 (936년)',
      '북진 정책 추진',
      '훈요십조 제정',
    ],
  },
  {
    id: 'gwangjong',
    name: '광종',
    enName: 'King Gwangjong',
    birthYear: 925,
    deathYear: 975,
    role: '제4대 국왕',
    description: '노비안검법과 과거제를 실시하여 왕권을 강화했습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1604357209793-fca5dca89f97?w=400',
    achievements: [
      '노비안검법 실시',
      '과거제도 도입 (958년)',
      '왕권 강화 정책',
      '호족 세력 약화',
    ],
  },
  {
    id: 'seo-hui',
    name: '서희',
    enName: 'Seo Hui',
    birthYear: 942,
    deathYear: 998,
    role: '문신, 외교관',
    description: '거란과의 외교 담판으로 강동 6주를 확보한 명외교관입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    achievements: [
      '거란과의 외교 담판 (993년)',
      '강동 6주 확보',
      '전쟁 없이 영토 확장',
    ],
  },
]

export const goryeoCulture: CulturalHeritage[] = [
  {
    id: 'goryeo-celadon',
    name: '고려청자',
    category: '예술',
    description: '비색으로 유명한 고려시대의 청자로 세계적인 명성을 얻었습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=400',
    significance: '신비로운 비색으로 세계 도자기 역사상 최고 수준',
  },
  {
    id: 'goryeo-daejanggyeong',
    name: '팔만대장경',
    year: 1251,
    category: '종교',
    description: '현존하는 가장 완벽한 대장경으로 유네스코 세계기록유산입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1545420333-23a22f34d8f5?w=400',
    significance: '8만여 장의 목판에 새긴 불교 경전의 집대성',
  },
  {
    id: 'metal-movable-type',
    name: '금속활자',
    year: 1234,
    category: '과학',
    description: '세계 최초의 금속활자로 인쇄술의 혁명을 가져왔습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
    significance: '구텐베르크보다 200년 앞선 혁신적 인쇄 기술',
  },
]

// ============================================
// Mock 데이터 export
// ============================================

export const historicalCountryMockData = {
  joseon: {
    events: joseonEvents,
    figures: joseonFigures,
    territory: joseonTerritory,
    culture: joseonCulture,
  },
  goryeo: {
    events: goryeoEvents,
    figures: goryeoFigures,
    territory: [],
    culture: goryeoCulture,
  },
}

