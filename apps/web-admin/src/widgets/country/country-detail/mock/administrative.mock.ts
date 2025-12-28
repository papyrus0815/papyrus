import type {
  AdministrativeSystem,
  AdministrativeLevel1,
  AdministrativeLevel2,
  CityDetails,
} from './types'

// ============================================
// 국가별 행정구역 체계 정보
// ============================================
export const administrativeSystemByCountry: Record<string, AdministrativeSystem> = {
  KR: {
    countryName: 'South Korea',
    countryNameKo: '대한민국',
    levels: [
      {
        level: 1,
        name: '광역시도',
        nameEn: 'Metropolitan City / Province',
        count: 17,
        examples: ['서울특별시', '경기도', '부산광역시'],
      },
      {
        level: 2,
        name: '시군구',
        nameEn: 'City / County / District',
        count: 226,
        examples: ['수원시', '성남시', '강남구'],
      },
      {
        level: 3,
        name: '읍면동',
        nameEn: 'Town / Township / Neighborhood',
        count: 3482,
        examples: ['삼성동', '종로1가동'],
      },
    ],
  },
  JP: {
    countryName: 'Japan',
    countryNameKo: '일본',
    levels: [
      {
        level: 1,
        name: '都道府県',
        nameEn: 'Prefecture',
        count: 47,
        examples: ['東京都', '大阪府', '北海道'],
      },
      {
        level: 2,
        name: '市区町村',
        nameEn: 'City / Ward / Town / Village',
        count: 1718,
        examples: ['新宿区', '横浜市', '札幌市'],
      },
    ],
  },
  US: {
    countryName: 'United States',
    countryNameKo: '미국',
    levels: [
      {
        level: 1,
        name: 'State',
        nameEn: 'State',
        count: 50,
        examples: ['California', 'Texas', 'New York'],
      },
      {
        level: 2,
        name: 'County',
        nameEn: 'County',
        count: 3143,
        examples: ['Los Angeles County', 'Cook County'],
      },
      {
        level: 3,
        name: 'City',
        nameEn: 'City / Town',
        count: 19495,
        examples: ['New York City', 'Los Angeles', 'Chicago'],
      },
    ],
  },
  CN: {
    countryName: 'China',
    countryNameKo: '중국',
    levels: [
      {
        level: 1,
        name: '省/直辖市',
        nameEn: 'Province / Municipality',
        count: 34,
        examples: ['北京市', '上海市', '广东省'],
      },
      {
        level: 2,
        name: '地级市',
        nameEn: 'Prefecture-level City',
        count: 333,
        examples: ['深圳市', '广州市', '成都市'],
      },
      {
        level: 3,
        name: '县级市/区',
        nameEn: 'County-level City / District',
        count: 2844,
        examples: ['朝阳区', '黄埔区'],
      },
    ],
  },
}

// ============================================
// 국가 코드 매핑 헬퍼
// ============================================
export const getCountryCode = (countryName: string): string => {
  const countryCodeMap: Record<string, string> = {
    대한민국: 'KR',
    'South Korea': 'KR',
    Korea: 'KR',
    일본: 'JP',
    Japan: 'JP',
    미국: 'US',
    'United States': 'US',
    USA: 'US',
    중국: 'CN',
    China: 'CN',
  }
  return countryCodeMap[countryName] || 'KR'
}

// ============================================
// 행정구역 단계별 데이터
// ============================================
export const mockAdministrativeRegions: {
  level1: AdministrativeLevel1[]
  level2: Record<string, AdministrativeLevel2[]>
} = {
  level1: [
    { id: '1', name: '서울특별시', count: 25, type: '특별시' },
    { id: '2', name: '경기도', count: 31, type: '도' },
    { id: '3', name: '인천광역시', count: 10, type: '광역시' },
    { id: '4', name: '부산광역시', count: 16, type: '광역시' },
    { id: '5', name: '대구광역시', count: 8, type: '광역시' },
    { id: '6', name: '대전광역시', count: 5, type: '광역시' },
    { id: '7', name: '광주광역시', count: 5, type: '광역시' },
    { id: '8', name: '울산광역시', count: 5, type: '광역시' },
    { id: '9', name: '세종특별자치시', count: 1, type: '특별자치시' },
    { id: '10', name: '강원특별자치도', count: 18, type: '특별자치도' },
    { id: '11', name: '충청북도', count: 11, type: '도' },
    { id: '12', name: '충청남도', count: 15, type: '도' },
    { id: '13', name: '전북특별자치도', count: 14, type: '특별자치도' },
    { id: '14', name: '전라남도', count: 22, type: '도' },
    { id: '15', name: '경상북도', count: 23, type: '도' },
    { id: '16', name: '경상남도', count: 18, type: '도' },
    { id: '17', name: '제주특별자치도', count: 2, type: '특별자치도' },
  ],
  level2: {
    '2': [
      {
        id: '2-1',
        name: '수원시',
        population: '1,195,000',
        area: '121.1km²',
      },
      {
        id: '2-2',
        name: '성남시',
        population: '925,000',
        area: '141.8km²',
      },
      {
        id: '2-3',
        name: '고양시',
        population: '1,073,000',
        area: '267.3km²',
      },
      {
        id: '2-4',
        name: '용인시',
        population: '1,071,000',
        area: '591.4km²',
      },
      {
        id: '2-5',
        name: '부천시',
        population: '825,000',
        area: '53.4km²',
      },
      {
        id: '2-6',
        name: '안산시',
        population: '665,000',
        area: '149.3km²',
      },
      {
        id: '2-7',
        name: '안양시',
        population: '555,000',
        area: '58.5km²',
      },
      {
        id: '2-8',
        name: '남양주시',
        population: '725,000',
        area: '458.1km²',
      },
    ],
    '1': [
      {
        id: '1-1',
        name: '강남구',
        population: '542,000',
        area: '39.5km²',
      },
      {
        id: '1-2',
        name: '송파구',
        population: '667,000',
        area: '33.9km²',
      },
      {
        id: '1-3',
        name: '강서구',
        population: '596,000',
        area: '41.4km²',
      },
      { id: '1-4', name: '노원구', population: '527,000', area: '35.4km²' },
      { id: '1-5', name: '서초구', population: '423,000', area: '47.0km²' },
      { id: '1-6', name: '관악구', population: '502,000', area: '29.6km²' },
      { id: '1-7', name: '영등포구', population: '378,000', area: '24.6km²' },
      { id: '1-8', name: '마포구', population: '373,000', area: '23.9km²' },
      { id: '1-9', name: '강동구', population: '445,000', area: '24.6km²' },
      { id: '1-10', name: '동작구', population: '398,000', area: '16.4km²' },
      { id: '1-11', name: '양천구', population: '467,000', area: '17.4km²' },
      { id: '1-12', name: '은평구', population: '479,000', area: '29.7km²' },
      { id: '1-13', name: '구로구', population: '412,000', area: '20.1km²' },
      { id: '1-14', name: '종로구', population: '153,000', area: '23.9km²' },
      { id: '1-15', name: '중구', population: '126,000', area: '9.96km²' },
      { id: '1-16', name: '용산구', population: '229,000', area: '21.9km²' },
      { id: '1-17', name: '성동구', population: '295,000', area: '16.9km²' },
      { id: '1-18', name: '광진구', population: '355,000', area: '17.1km²' },
      { id: '1-19', name: '동대문구', population: '346,000', area: '14.2km²' },
      { id: '1-20', name: '중랑구', population: '400,000', area: '18.5km²' },
      { id: '1-21', name: '성북구', population: '443,000', area: '24.6km²' },
      { id: '1-22', name: '강북구', population: '312,000', area: '23.6km²' },
      { id: '1-23', name: '도봉구', population: '330,000', area: '20.7km²' },
      { id: '1-24', name: '서대문구', population: '313,000', area: '17.6km²' },
      { id: '1-25', name: '금천구', population: '236,000', area: '13.0km²' },
    ],
    '4': [
      {
        id: '4-1',
        name: '해운대구',
        population: '413,000',
        area: '51.4km²',
      },
      { id: '4-2', name: '북구', population: '295,000', area: '38.3km²' },
      {
        id: '4-3',
        name: '부산진구',
        population: '366,000',
        area: '29.7km²',
      },
    ],
  },
}

// ============================================
// 도시별 상세 정보
// ============================================
export const mockCityDetails: Record<string, CityDetails> = {
  '1': {
    mayor: '오세훈',
    party: '국민의힘',
    population: '9,720,846명',
    area: '605.2km²',
    gdp: '450조원',
    industry: 'IT/금융',
    districts: [
      { name: '강남구', population: '542,000명', area: '39.5km²' },
      { name: '송파구', population: '667,000명', area: '33.9km²' },
      { name: '강서구', population: '596,000명', area: '41.4km²' },
      { name: '노원구', population: '527,000명', area: '35.4km²' },
      { name: '서초구', population: '423,000명', area: '47.0km²' },
      { name: '관악구', population: '502,000명', area: '29.6km²' },
      { name: '영등포구', population: '378,000명', area: '24.6km²' },
      { name: '마포구', population: '373,000명', area: '23.9km²' },
      { name: '강동구', population: '445,000명', area: '24.6km²' },
      { name: '동작구', population: '398,000명', area: '16.4km²' },
    ],
    universities: [
      { name: '서울대학교', type: '국립', students: '28,000명' },
      { name: '연세대학교', type: '사립', students: '27,000명' },
      { name: '고려대학교', type: '사립', students: '25,000명' },
      { name: '성균관대학교', type: '사립', students: '22,000명' },
      { name: '한양대학교', type: '사립', students: '21,000명' },
    ],
    companies: [
      { name: '삼성전자', sector: 'IT/전자', employees: '120,000명' },
      { name: 'SK하이닉스', sector: '반도체', employees: '35,000명' },
      { name: 'LG전자', sector: '전자', employees: '75,000명' },
      { name: 'NAVER', sector: 'IT/인터넷', employees: '12,000명' },
      { name: '카카오', sector: 'IT/인터넷', employees: '10,000명' },
    ],
    attractions: [
      { name: '경복궁', type: '문화재', visitors: '연 500만명' },
      { name: 'N서울타워', type: '랜드마크', visitors: '연 800만명' },
      { name: '명동', type: '상업지구', visitors: '연 1,000만명' },
      { name: '남산', type: '자연', visitors: '연 600만명' },
      { name: '인사동', type: '문화거리', visitors: '연 400만명' },
    ],
  },
  '2': {
    mayor: '김동연',
    party: '무소속',
    population: '13,638,000명',
    area: '10,189km²',
    gdp: '550조원',
    industry: 'IT/제조',
    districts: [
      { name: '수원시', population: '1,195,000명', area: '121.1km²' },
      { name: '성남시', population: '925,000명', area: '141.8km²' },
      { name: '고양시', population: '1,073,000명', area: '267.3km²' },
      { name: '용인시', population: '1,071,000명', area: '591.4km²' },
      { name: '부천시', population: '825,000명', area: '53.4km²' },
      { name: '안산시', population: '665,000명', area: '149.3km²' },
      { name: '안양시', population: '555,000명', area: '58.5km²' },
      { name: '남양주시', population: '725,000명', area: '458.1km²' },
    ],
    universities: [
      { name: '경기대학교', type: '사립', students: '20,000명' },
      { name: '아주대학교', type: '사립', students: '16,000명' },
      { name: '단국대학교', type: '사립', students: '24,000명' },
      { name: '가톨릭대학교', type: '사립', students: '14,000명' },
    ],
    companies: [
      { name: '삼성전자', sector: 'IT/전자', employees: '120,000명' },
      { name: 'SK하이닉스', sector: '반도체', employees: '35,000명' },
      { name: '현대자동차', sector: '자동차', employees: '95,000명' },
      { name: 'LG디스플레이', sector: '전자', employees: '45,000명' },
    ],
    attractions: [
      { name: '에버랜드', type: '테마파크', visitors: '연 600만명' },
      { name: '한국민속촌', type: '문화', visitors: '연 150만명' },
      { name: '수원화성', type: '문화재', visitors: '연 300만명' },
      { name: '가평 아침고요수목원', type: '자연', visitors: '연 200만명' },
    ],
  },
  '1-1': {
    mayor: '서울시청',
    party: '서울특별시',
    population: '542,000명',
    area: '39.5km²',
    districts: [
      { name: '삼성동', population: '52,000명', area: '3.2km²' },
      { name: '역삼동', population: '48,000명', area: '2.8km²' },
      { name: '대치동', population: '68,000명', area: '4.5km²' },
      { name: '논현동', population: '45,000명', area: '3.1km²' },
    ],
    universities: [
      { name: '성균관대학교', type: '사립', students: '22,000명' },
      { name: '건국대학교', type: '사립', students: '19,000명' },
    ],
    companies: [
      { name: '삼성전자 서초사옥', sector: 'IT', employees: '20,000명' },
      { name: 'NAVER', sector: 'IT', employees: '12,000명' },
    ],
    attractions: [
      { name: 'COEX', type: '복합문화공간', visitors: '연 400만명' },
      { name: '봉은사', type: '문화재', visitors: '연 100만명' },
    ],
  },
  '1-2': {
    mayor: '서울시청',
    party: '서울특별시',
    population: '667,000명',
    area: '33.9km²',
    universities: [
      { name: '한국체육대학교', type: '국립', students: '3,000명' },
    ],
    companies: [
      { name: '롯데월드', sector: '관광/서비스', employees: '5,000명' },
    ],
    attractions: [
      { name: '롯데월드', type: '테마파크', visitors: '연 600만명' },
      { name: '석촌호수', type: '공원', visitors: '연 300만명' },
    ],
  },
  '1-3': {
    mayor: '서울시청',
    party: '서울특별시',
    population: '596,000명',
    area: '41.4km²',
    companies: [
      { name: '서울공항', sector: '교통', employees: '3,000명' },
    ],
    attractions: [
      { name: '마곡중앙공원', type: '공원', visitors: '연 150만명' },
    ],
  },
  '1-5': {
    mayor: '서울시청',
    party: '서울특별시',
    population: '423,000명',
    area: '47.0km²',
    companies: [
      { name: '카카오', sector: 'IT', employees: '10,000명' },
      { name: 'LG전자 서초R&D캠퍼스', sector: '전자', employees: '8,000명' },
    ],
    attractions: [
      { name: '예술의전당', type: '문화시설', visitors: '연 200만명' },
      { name: '서리풀공원', type: '공원', visitors: '연 100만명' },
    ],
  },
  '1-8': {
    mayor: '서울시청',
    party: '서울특별시',
    population: '373,000명',
    area: '23.9km²',
    universities: [
      { name: '홍익대학교', type: '사립', students: '16,000명' },
      { name: '서강대학교', type: '사립', students: '14,000명' },
    ],
    companies: [
      { name: 'CJ ENM', sector: '미디어', employees: '4,000명' },
    ],
    attractions: [
      { name: '홍대거리', type: '문화거리', visitors: '연 500만명' },
      { name: '망원한강공원', type: '공원', visitors: '연 250만명' },
    ],
  },
  '1-14': {
    mayor: '서울시청',
    party: '서울특별시',
    population: '153,000명',
    area: '23.9km²',
    attractions: [
      { name: '경복궁', type: '문화재', visitors: '연 500만명' },
      { name: '북촌한옥마을', type: '문화', visitors: '연 400만명' },
      { name: '인사동', type: '문화거리', visitors: '연 350만명' },
    ],
  },
  '1-15': {
    mayor: '서울시청',
    party: '서울특별시',
    population: '126,000명',
    area: '9.96km²',
    attractions: [
      { name: '명동', type: '상업지구', visitors: '연 1,000만명' },
      { name: '남산', type: '자연', visitors: '연 600만명' },
      { name: 'N서울타워', type: '랜드마크', visitors: '연 800만명' },
    ],
  },
  '2-1': {
    mayor: '이재준',
    party: '더불어민주당',
    population: '1,195,000명',
    area: '121.1km²',
    gdp: '35조원',
    districts: [
      { name: '장안구', population: '295,000명', area: '33.1km²' },
      { name: '권선구', population: '348,000명', area: '47.3km²' },
      { name: '팔달구', population: '196,000명', area: '13.1km²' },
      { name: '영통구', population: '356,000명', area: '27.6km²' },
    ],
    universities: [
      { name: '성균관대학교', type: '사립', students: '22,000명' },
      { name: '경기대학교', type: '사립', students: '20,000명' },
      { name: '아주대학교', type: '사립', students: '16,000명' },
    ],
    companies: [
      { name: '삼성전자 수원사업장', sector: 'IT/전자', employees: '35,000명' },
      { name: 'SK하이닉스', sector: '반도체', employees: '15,000명' },
    ],
    attractions: [
      { name: '수원화성', type: '문화재', visitors: '연 300만명' },
      { name: '화성행궁', type: '문화재', visitors: '연 150만명' },
      { name: '광교호수공원', type: '자연', visitors: '연 200만명' },
    ],
  },
  '3': {
    mayor: '유정복',
    party: '국민의힘',
    population: '2,948,000명',
    area: '1,066km²',
    gdp: '95조원',
    industry: '제조/물류',
    districts: [
      { name: '남동구', population: '520,000명', area: '57.9km²' },
      { name: '부평구', population: '509,000명', area: '32.0km²' },
      { name: '서구', population: '548,000명', area: '111.4km²' },
      { name: '계양구', population: '312,000명', area: '45.6km²' },
      { name: '연수구', population: '336,000명', area: '54.9km²' },
      { name: '미추홀구', population: '408,000명', area: '24.9km²' },
    ],
    universities: [
      { name: '인천대학교', type: '국립', students: '15,000명' },
      { name: '인하대학교', type: '사립', students: '20,000명' },
    ],
    companies: [
      { name: 'SK인천석유화학', sector: '화학', employees: '2,500명' },
      { name: '인천공항공사', sector: '공공', employees: '3,800명' },
    ],
    attractions: [
      { name: '인천대교', type: '랜드마크', visitors: '연 200만명' },
      { name: '차이나타운', type: '문화거리', visitors: '연 350만명' },
    ],
  },
  '4': {
    mayor: '박형준',
    party: '국민의힘',
    population: '3,349,000명',
    area: '770km²',
    gdp: '95조원',
    industry: '제조/물류',
    districts: [
      { name: '해운대구', population: '413,000명', area: '51.4km²' },
      { name: '부산진구', population: '366,000명', area: '29.7km²' },
      { name: '북구', population: '295,000명', area: '38.3km²' },
      { name: '사상구', population: '224,000명', area: '36.0km²' },
      { name: '사하구', population: '318,000명', area: '41.8km²' },
      { name: '금정구', population: '241,000명', area: '65.2km²' },
      { name: '동래구', population: '264,000명', area: '16.7km²' },
      { name: '남구', population: '267,000명', area: '25.9km²' },
    ],
    universities: [
      { name: '부산대학교', type: '국립', students: '26,000명' },
      { name: '동아대학교', type: '사립', students: '18,000명' },
      { name: '부경대학교', type: '국립', students: '17,000명' },
      { name: '경성대학교', type: '사립', students: '16,000명' },
      { name: '동의대학교', type: '사립', students: '15,000명' },
    ],
    companies: [
      { name: '르노삼성자동차', sector: '자동차', employees: '8,000명' },
      { name: '한진중공업', sector: '조선', employees: '3,500명' },
      { name: 'STX조선해양', sector: '조선', employees: '4,200명' },
      { name: '동원F&B', sector: '식품', employees: '2,800명' },
      { name: 'BNK금융지주', sector: '금융', employees: '4,500명' },
    ],
    attractions: [
      { name: '해운대 해수욕장', type: '자연', visitors: '연 1,200만명' },
      { name: '광안리', type: '해변', visitors: '연 800만명' },
      { name: '태종대', type: '자연', visitors: '연 300만명' },
      { name: '감천문화마을', type: '문화', visitors: '연 250만명' },
      { name: '용두산공원', type: '공원', visitors: '연 180만명' },
    ],
  },
  '5': {
    mayor: '홍준표',
    party: '국민의힘',
    population: '2,392,000명',
    area: '883.6km²',
    gdp: '78조원',
    industry: '자동차/철강',
    districts: [
      { name: '수성구', population: '428,000명', area: '76.5km²' },
      { name: '달서구', population: '568,000명', area: '62.3km²' },
      { name: '북구', population: '428,000명', area: '95.5km²' },
      { name: '동구', population: '336,000명', area: '182.3km²' },
    ],
    universities: [
      { name: '경북대학교', type: '국립', students: '25,000명' },
      { name: '계명대학교', type: '사립', students: '18,000명' },
    ],
    companies: [{ name: '삼성전자', sector: '전자', employees: '8,000명' }],
    attractions: [{ name: '팔공산', type: '자연', visitors: '연 250만명' }],
  },
  '6': {
    mayor: '이장우',
    party: '국민의힘',
    population: '1,450,000명',
    area: '539.6km²',
    gdp: '42조원',
    industry: '교육/R&D',
    districts: [
      { name: '유성구', population: '363,000명', area: '177.2km²' },
      { name: '서구', population: '491,000명', area: '95.3km²' },
      { name: '대덕구', population: '208,000명', area: '68.6km²' },
      { name: '중구', population: '234,000명', area: '61.9km²' },
    ],
    universities: [
      { name: 'KAIST', type: '국립', students: '11,000명' },
      { name: '충남대학교', type: '국립', students: '23,000명' },
    ],
    companies: [{ name: 'LG화학', sector: '화학', employees: '5,000명' }],
    attractions: [
      { name: '대전엑스포과학공원', type: '문화', visitors: '연 180만명' },
    ],
  },
  '7': {
    mayor: '강기정',
    party: '더불어민주당',
    population: '1,417,000명',
    area: '501.2km²',
    gdp: '38조원',
    industry: '관광/서비스',
    districts: [
      { name: '북구', population: '438,000명', area: '120.0km²' },
      { name: '광산구', population: '419,000명', area: '222.9km²' },
      { name: '서구', population: '295,000명', area: '48.0km²' },
      { name: '남구', population: '220,000명', area: '60.7km²' },
    ],
    universities: [
      { name: '전남대학교', type: '국립', students: '22,000명' },
      { name: '조선대학교', type: '사립', students: '18,000명' },
    ],
    companies: [
      { name: '기아자동차', sector: '자동차', employees: '12,000명' },
    ],
    attractions: [
      { name: '무등산', type: '자연', visitors: '연 180만명' },
    ],
  },
  '8': {
    mayor: '김두겸',
    party: '국민의힘',
    population: '1,108,000명',
    area: '1,062km²',
    gdp: '72조원',
    industry: '자동차/화학',
    districts: [
      { name: '남구', population: '323,000명', area: '72.2km²' },
      { name: '동구', population: '162,000명', area: '36.0km²' },
      { name: '북구', population: '212,000명', area: '148.0km²' },
      { name: '중구', population: '238,000명', area: '37.0km²' },
    ],
    universities: [
      { name: '울산대학교', type: '사립', students: '14,000명' },
      { name: 'UNIST', type: '국립', students: '4,000명' },
    ],
    companies: [
      { name: '현대자동차', sector: '자동차', employees: '34,000명' },
      { name: 'SK에너지', sector: '에너지', employees: '3,500명' },
    ],
    attractions: [
      { name: '간절곶', type: '자연', visitors: '연 120만명' },
    ],
  },
  '9': {
    mayor: '최민호',
    party: '국민의힘',
    population: '387,000명',
    area: '465.2km²',
    gdp: '28조원',
    industry: '행정/첨단',
  },
  '10': {
    mayor: '김진태',
    party: '국민의힘',
    population: '1,544,000명',
    area: '16,873km²',
    gdp: '52조원',
    industry: '관광/제조',
    districts: [
      { name: '춘천시', population: '284,000명', area: '1,116km²' },
      { name: '원주시', population: '363,000명', area: '867km²' },
      { name: '강릉시', population: '213,000명', area: '1,040km²' },
    ],
    universities: [
      { name: '강원대학교', type: '국립', students: '18,000명' },
    ],
    companies: [
      { name: '한솔제지', sector: '제지', employees: '2,000명' },
    ],
    attractions: [
      { name: '설악산', type: '자연', visitors: '연 350만명' },
    ],
  },
  '11': {
    mayor: '김영환',
    party: '국민의힘',
    population: '1,592,000명',
    area: '7,407km²',
    gdp: '48조원',
    industry: '제조/바이오',
  },
  '12': {
    mayor: '김태흠',
    party: '국민의힘',
    population: '2,120,000명',
    area: '8,204km²',
    gdp: '92조원',
    industry: '제조/농업',
  },
  '13': {
    mayor: '김관영',
    party: '무소속',
    population: '1,783,000명',
    area: '8,067km²',
    gdp: '54조원',
    industry: '농업/제조',
  },
  '14': {
    mayor: '김영록',
    party: '더불어민주당',
    population: '1,816,000명',
    area: '12,247km²',
    gdp: '58조원',
    industry: '농업/관광',
  },
  '15': {
    mayor: '이철우',
    party: '국민의힘',
    population: '2,620,000명',
    area: '19,030km²',
    gdp: '85조원',
    industry: '제조/농업',
  },
  '16': {
    mayor: '박완수',
    party: '국민의힘',
    population: '3,303,000명',
    area: '10,518km²',
    gdp: '115조원',
    industry: '제조/조선',
  },
  '17': {
    mayor: '오영훈',
    party: '더불어민주당',
    population: '677,000명',
    area: '1,849km²',
    gdp: '22조원',
    industry: '관광/농업',
  },
}

