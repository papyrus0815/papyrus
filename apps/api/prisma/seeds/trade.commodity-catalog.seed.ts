/**
 * 교역 품목 카탈로그 시드 — 분류(대>중) + 품목 마스터.
 *
 * 이 카탈로그가 있어야 "1913년에 강철을 수출한 나라"를 가로로 물을 수 있다.
 * 품목을 나라·연도마다 문자열로 다시 치면 표기가 갈려(석유/원유/crude oil) 같은 물건이
 * 여러 행으로 흩어지고, 그 질문 자체가 성립하지 않는다.
 *
 * 시대 범위(firstYearSigned/lastYearSigned)는 **부호 있는 연도**다 — 음수가 기원전.
 * 폼에서 "자동차를 1700년 수출"로 적는 실수를 잡는 데 쓴다. 모르면 null로 두며,
 * null은 "제한 없음"이지 "없다"가 아니다.
 *
 * 멱등: 분류는 slug, 품목은 name 기준 upsert. 재실행해도 중복이 생기지 않는다.
 */
import { PrismaService } from '../prisma.service'

interface CategorySeed {
  slug: string
  name: string
  enName: string
  parentSlug: string | null
  hsSection?: number
  colorKey?: string
  emoji?: string
  description?: string
}

interface CommoditySeed {
  name: string
  enName?: string
  categorySlug: string
  aliases?: string[]
  hsCode?: string
  defaultUnit?: string
  /** 부호 있는 연도 — 음수는 기원전 */
  firstYearSigned?: number
  lastYearSigned?: number
  isService?: boolean
  description?: string
}

/* ── 분류 ─────────────────────────────────────────────────── */

const CATEGORIES: CategorySeed[] = [
  // 대분류
  { slug: 'agriculture', name: '농산물', enName: 'Agricultural products', parentSlug: null, hsSection: 2, colorKey: 'lime', emoji: '🌾' },
  { slug: 'fishery', name: '수산물', enName: 'Fishery products', parentSlug: null, hsSection: 1, colorKey: 'cyan', emoji: '🐟' },
  { slug: 'energy-minerals', name: '에너지·광물', enName: 'Energy & minerals', parentSlug: null, hsSection: 5, colorKey: 'amber', emoji: '⛽' },
  { slug: 'metals', name: '금속·소재', enName: 'Metals & materials', parentSlug: null, hsSection: 15, colorKey: 'slate', emoji: '🔩' },
  { slug: 'chemicals', name: '화학·의약', enName: 'Chemicals & pharmaceuticals', parentSlug: null, hsSection: 6, colorKey: 'violet', emoji: '⚗️' },
  { slug: 'textiles', name: '섬유·의류', enName: 'Textiles & apparel', parentSlug: null, hsSection: 11, colorKey: 'rose', emoji: '🧵' },
  { slug: 'machinery', name: '기계', enName: 'Machinery', parentSlug: null, hsSection: 16, colorKey: 'stone', emoji: '⚙️' },
  { slug: 'electronics', name: '전자·전기', enName: 'Electronics', parentSlug: null, hsSection: 16, colorKey: 'blue', emoji: '💡' },
  { slug: 'transport-equipment', name: '운송장비', enName: 'Transport equipment', parentSlug: null, hsSection: 17, colorKey: 'indigo', emoji: '🚢' },
  { slug: 'armaments', name: '무기·군수', enName: 'Arms & munitions', parentSlug: null, hsSection: 19, colorKey: 'red', emoji: '🛡️' },
  { slug: 'luxury', name: '사치품·귀금속', enName: 'Luxury goods & precious metals', parentSlug: null, hsSection: 14, colorKey: 'yellow', emoji: '💎' },
  { slug: 'stimulants', name: '기호품', enName: 'Stimulants & beverages', parentSlug: null, hsSection: 4, colorKey: 'orange', emoji: '☕' },
  { slug: 'consumer-goods', name: '소비재', enName: 'Consumer goods', parentSlug: null, hsSection: 20, colorKey: 'teal', emoji: '🧺' },
  { slug: 'services', name: '서비스', enName: 'Services', parentSlug: null, colorKey: 'emerald', emoji: '🧾', description: '상품이 아니라 용역으로 오간 것 — 해운·관광·금융·특허료. 근대 이후 국제수지의 큰 몫이다.' },
  { slug: 'other-trade', name: '기타', enName: 'Other', parentSlug: null, colorKey: 'zinc', emoji: '📦' },

  // 중분류 — 농산물
  { slug: 'grain', name: '곡물', enName: 'Grain', parentSlug: 'agriculture', hsSection: 2, emoji: '🌾' },
  { slug: 'cash-crop', name: '환금작물', enName: 'Cash crops', parentSlug: 'agriculture', hsSection: 2, emoji: '🌱' },
  { slug: 'livestock', name: '축산물', enName: 'Livestock products', parentSlug: 'agriculture', hsSection: 1, emoji: '🐄' },
  { slug: 'forestry', name: '임산물', enName: 'Forestry products', parentSlug: 'agriculture', hsSection: 9, emoji: '🌲' },

  // 중분류 — 에너지·광물
  { slug: 'fossil-fuel', name: '화석연료', enName: 'Fossil fuels', parentSlug: 'energy-minerals', hsSection: 5, emoji: '🛢️' },
  { slug: 'metal-ore', name: '금속광석', enName: 'Metal ores', parentSlug: 'energy-minerals', hsSection: 5, emoji: '⛏️' },
  { slug: 'nonmetal-mineral', name: '비금속광물', enName: 'Non-metallic minerals', parentSlug: 'energy-minerals', hsSection: 5, emoji: '🧂' },
  { slug: 'electricity', name: '전력', enName: 'Electricity', parentSlug: 'energy-minerals', emoji: '⚡' },

  // 중분류 — 금속·소재
  { slug: 'steel', name: '철강', enName: 'Iron & steel', parentSlug: 'metals', hsSection: 15, emoji: '🏗️' },
  { slug: 'nonferrous', name: '비철금속', enName: 'Non-ferrous metals', parentSlug: 'metals', hsSection: 15, emoji: '🥉' },

  // 중분류 — 화학·의약
  { slug: 'basic-chemicals', name: '기초화학', enName: 'Basic chemicals', parentSlug: 'chemicals', hsSection: 6, emoji: '🧪' },
  { slug: 'pharmaceuticals', name: '의약품', enName: 'Pharmaceuticals', parentSlug: 'chemicals', hsSection: 6, emoji: '💊' },
  { slug: 'fertilizer', name: '비료', enName: 'Fertilizers', parentSlug: 'chemicals', hsSection: 6, emoji: '🧴' },
  { slug: 'polymers', name: '플라스틱·고무', enName: 'Plastics & rubber', parentSlug: 'chemicals', hsSection: 7, emoji: '🧯' },

  // 중분류 — 섬유·의류
  { slug: 'fiber', name: '섬유원료', enName: 'Raw fibers', parentSlug: 'textiles', hsSection: 11, emoji: '🌿' },
  { slug: 'fabric', name: '직물', enName: 'Fabrics', parentSlug: 'textiles', hsSection: 11, emoji: '🧶' },
  { slug: 'apparel', name: '의류', enName: 'Apparel', parentSlug: 'textiles', hsSection: 11, emoji: '👕' },

  // 중분류 — 전자·전기
  { slug: 'semiconductor', name: '반도체', enName: 'Semiconductors', parentSlug: 'electronics', hsSection: 16, emoji: '🔲' },
  { slug: 'electronic-device', name: '전자기기', enName: 'Electronic devices', parentSlug: 'electronics', hsSection: 16, emoji: '📱' },

  // 중분류 — 운송장비
  { slug: 'automobile', name: '자동차', enName: 'Automobiles', parentSlug: 'transport-equipment', hsSection: 17, emoji: '🚗' },
  { slug: 'shipbuilding', name: '선박', enName: 'Ships', parentSlug: 'transport-equipment', hsSection: 17, emoji: '🚢' },
  { slug: 'aerospace', name: '항공·우주', enName: 'Aerospace', parentSlug: 'transport-equipment', hsSection: 17, emoji: '✈️' },
  { slug: 'rolling-stock', name: '철도차량', enName: 'Rolling stock', parentSlug: 'transport-equipment', hsSection: 17, emoji: '🚂' },

  // 중분류 — 사치품
  { slug: 'precious', name: '귀금속·보석', enName: 'Precious metals & gems', parentSlug: 'luxury', hsSection: 14, emoji: '💍' },
  { slug: 'spices', name: '향신료', enName: 'Spices', parentSlug: 'luxury', hsSection: 2, emoji: '🌶️' },
  { slug: 'ceramics-craft', name: '도자기·공예', enName: 'Ceramics & crafts', parentSlug: 'luxury', hsSection: 13, emoji: '🏺' },

  // 중분류 — 서비스
  { slug: 'transport-services', name: '운송·물류', enName: 'Transport services', parentSlug: 'services', emoji: '🚚' },
  { slug: 'tourism', name: '관광', enName: 'Tourism', parentSlug: 'services', emoji: '🧳' },
  { slug: 'financial-services', name: '금융·보험', enName: 'Financial services', parentSlug: 'services', emoji: '🏦' },
  { slug: 'ip-royalties', name: '지식재산·로열티', enName: 'IP & royalties', parentSlug: 'services', emoji: '©️' },
]

/* ── 품목 ─────────────────────────────────────────────────── */

const COMMODITIES: CommoditySeed[] = [
  // 곡물
  { name: '쌀', enName: 'Rice', categorySlug: 'grain', aliases: ['미곡', 'rice'], hsCode: '1006', defaultUnit: '톤' },
  { name: '밀', enName: 'Wheat', categorySlug: 'grain', aliases: ['소맥', 'wheat'], hsCode: '1001', defaultUnit: '톤' },
  { name: '옥수수', enName: 'Maize', categorySlug: 'grain', aliases: ['강냉이', 'corn', 'maize'], hsCode: '1005', defaultUnit: '톤', firstYearSigned: 1500 },
  { name: '보리', enName: 'Barley', categorySlug: 'grain', aliases: ['대맥', 'barley'], hsCode: '1003', defaultUnit: '톤' },
  { name: '콩', enName: 'Soybean', categorySlug: 'grain', aliases: ['대두', 'soybean'], hsCode: '1201', defaultUnit: '톤' },
  { name: '감자', enName: 'Potato', categorySlug: 'grain', aliases: ['potato'], hsCode: '0701', defaultUnit: '톤', firstYearSigned: 1550 },

  // 환금작물
  { name: '면화', enName: 'Cotton', categorySlug: 'fiber', aliases: ['목화', '원면', 'raw cotton'], hsCode: '5201', defaultUnit: '톤', description: '산업혁명기 최대 원료 교역품. 인도·미국 남부·이집트가 공급하고 랭커셔가 빨아들였다.' },
  { name: '사탕수수', enName: 'Sugarcane', categorySlug: 'cash-crop', aliases: ['sugarcane'], defaultUnit: '톤' },
  { name: '설탕', enName: 'Sugar', categorySlug: 'stimulants', aliases: ['원당', 'sugar'], hsCode: '1701', defaultUnit: '톤', description: '카리브·브라질 플랜테이션의 산물. 삼각무역의 축이었다.' },
  { name: '담배', enName: 'Tobacco', categorySlug: 'stimulants', aliases: ['연초', 'tobacco'], hsCode: '2401', defaultUnit: '톤', firstYearSigned: 1550 },
  { name: '차', enName: 'Tea', categorySlug: 'stimulants', aliases: ['홍차', '녹차', 'tea'], hsCode: '0902', defaultUnit: '톤', description: '광저우 무역의 중심 품목. 영국의 은 유출과 아편 무역을 낳은 원인.' },
  { name: '커피', enName: 'Coffee', categorySlug: 'stimulants', aliases: ['coffee'], hsCode: '0901', defaultUnit: '톤' },
  { name: '카카오', enName: 'Cocoa', categorySlug: 'stimulants', aliases: ['코코아', 'cocoa'], hsCode: '1801', defaultUnit: '톤' },
  { name: '아편', enName: 'Opium', categorySlug: 'stimulants', aliases: ['opium', '아편연'], defaultUnit: '상자', firstYearSigned: 1700, lastYearSigned: 1940, description: '동인도회사가 인도에서 길러 청으로 밀어 넣은 품목. 아편전쟁의 직접 원인.' },
  { name: '주류', enName: 'Alcoholic beverages', categorySlug: 'stimulants', aliases: ['술', '와인', 'wine', 'spirits'], hsCode: '2204', defaultUnit: '리터' },
  { name: '고무', enName: 'Natural rubber', categorySlug: 'polymers', aliases: ['천연고무', 'rubber'], hsCode: '4001', defaultUnit: '톤', firstYearSigned: 1840 },
  { name: '인디고', enName: 'Indigo', categorySlug: 'cash-crop', aliases: ['쪽', 'indigo'], defaultUnit: '톤', lastYearSigned: 1920, description: '합성염료가 나오기 전 최대 염료 작물. 벵골 농민 강제 재배의 대상.' },
  { name: '팜유', enName: 'Palm oil', categorySlug: 'cash-crop', aliases: ['palm oil'], hsCode: '1511', defaultUnit: '톤', firstYearSigned: 1830 },

  // 축산·수산·임산
  { name: '모피', enName: 'Fur', categorySlug: 'livestock', aliases: ['가죽', '담비', 'fur', 'pelts'], defaultUnit: '장', description: '시베리아·북아메리카 팽창의 동력. 러시아의 동진과 허드슨만 회사의 근거.' },
  { name: '양모', enName: 'Wool', categorySlug: 'fiber', aliases: ['울', 'wool'], hsCode: '5101', defaultUnit: '톤' },
  { name: '쇠고기', enName: 'Beef', categorySlug: 'livestock', aliases: ['우육', 'beef'], hsCode: '0201', defaultUnit: '톤' },
  { name: '가죽', enName: 'Hides & leather', categorySlug: 'livestock', aliases: ['피혁', 'leather'], hsCode: '4101', defaultUnit: '톤' },
  { name: '수산물', enName: 'Fish & seafood', categorySlug: 'fishery', aliases: ['어류', '해산물', 'fish'], hsCode: '0303', defaultUnit: '톤' },
  { name: '건어물', enName: 'Dried fish', categorySlug: 'fishery', aliases: ['북어', '건멸치'], defaultUnit: '톤' },
  { name: '고래기름', enName: 'Whale oil', categorySlug: 'fishery', aliases: ['경유', 'whale oil'], defaultUnit: '배럴', lastYearSigned: 1930, description: '석유 이전의 등화용 연료. 태평양 포경선의 목적지가 개항 요구로 이어졌다.' },
  { name: '목재', enName: 'Timber', categorySlug: 'forestry', aliases: ['원목', 'timber', 'lumber'], hsCode: '4403', defaultUnit: '㎥' },
  { name: '펄프·제지', enName: 'Pulp & paper', categorySlug: 'forestry', aliases: ['종이', 'pulp', 'paper'], hsCode: '4703', defaultUnit: '톤' },

  // 화석연료·광물
  { name: '원유', enName: 'Crude oil', categorySlug: 'fossil-fuel', aliases: ['석유', 'crude oil', 'petroleum'], hsCode: '2709', defaultUnit: '배럴', firstYearSigned: 1860, description: '20세기 교역액 1위 단일 품목. 산지·해협·수송로가 곧 지정학이다.' },
  { name: '석유제품', enName: 'Refined petroleum', categorySlug: 'fossil-fuel', aliases: ['정제유', '휘발유', '경유', 'refined petroleum'], hsCode: '2710', defaultUnit: '배럴', firstYearSigned: 1860 },
  { name: '천연가스', enName: 'Natural gas', categorySlug: 'fossil-fuel', aliases: ['LNG', 'gas'], hsCode: '2711', defaultUnit: '㎥', firstYearSigned: 1950 },
  { name: '석탄', enName: 'Coal', categorySlug: 'fossil-fuel', aliases: ['무연탄', '역청탄', 'coal'], hsCode: '2701', defaultUnit: '톤', description: '증기선·철도의 연료. 급탄지 확보가 19세기 해군기지 배치를 결정했다.' },
  { name: '철광석', enName: 'Iron ore', categorySlug: 'metal-ore', aliases: ['iron ore'], hsCode: '2601', defaultUnit: '톤' },
  { name: '구리광석', enName: 'Copper ore', categorySlug: 'metal-ore', aliases: ['동광', 'copper ore'], hsCode: '2603', defaultUnit: '톤' },
  { name: '보크사이트', enName: 'Bauxite', categorySlug: 'metal-ore', aliases: ['bauxite'], hsCode: '2606', defaultUnit: '톤', firstYearSigned: 1890 },
  { name: '희토류', enName: 'Rare earth elements', categorySlug: 'metal-ore', aliases: ['rare earths'], hsCode: '2805', defaultUnit: '톤', firstYearSigned: 1960 },
  { name: '우라늄', enName: 'Uranium', categorySlug: 'metal-ore', aliases: ['uranium'], defaultUnit: '톤', firstYearSigned: 1940 },
  { name: '소금', enName: 'Salt', categorySlug: 'nonmetal-mineral', aliases: ['염', 'salt'], hsCode: '2501', defaultUnit: '톤', description: '전근대 국가 전매의 단골. 소금세는 왕조 재정의 기둥이었다.' },
  { name: '초석', enName: 'Saltpetre', categorySlug: 'nonmetal-mineral', aliases: ['질산칼륨', 'saltpetre', 'nitre'], defaultUnit: '톤', lastYearSigned: 1920, description: '화약의 원료. 인도산 초석은 유럽 열강의 전략 물자였다.' },
  { name: '구아노', enName: 'Guano', categorySlug: 'fertilizer', aliases: ['guano'], defaultUnit: '톤', firstYearSigned: 1840, lastYearSigned: 1910, description: '페루·칠레의 질소 비료. 구아노·초석 이권이 태평양 전쟁(1879)을 불렀다.' },
  { name: '시멘트', enName: 'Cement', categorySlug: 'nonmetal-mineral', aliases: ['cement'], hsCode: '2523', defaultUnit: '톤' },
  { name: '전력', enName: 'Electric power', categorySlug: 'electricity', aliases: ['전기', 'electricity'], defaultUnit: 'GWh', firstYearSigned: 1900 },

  // 금속
  { name: '선철', enName: 'Pig iron', categorySlug: 'steel', aliases: ['pig iron'], defaultUnit: '톤' },
  { name: '강철', enName: 'Steel', categorySlug: 'steel', aliases: ['철강', '강재', 'steel'], hsCode: '7207', defaultUnit: '톤', firstYearSigned: 1860, description: '베서머 공정 이후 국력의 표준 지표가 된 품목.' },
  { name: '철도레일', enName: 'Steel rails', categorySlug: 'steel', aliases: ['레일', 'rails'], defaultUnit: '톤', firstYearSigned: 1830 },
  { name: '구리', enName: 'Copper', categorySlug: 'nonferrous', aliases: ['동', 'copper'], hsCode: '7403', defaultUnit: '톤' },
  { name: '주석', enName: 'Tin', categorySlug: 'nonferrous', aliases: ['tin'], hsCode: '8001', defaultUnit: '톤' },
  { name: '납', enName: 'Lead', categorySlug: 'nonferrous', aliases: ['연', 'lead'], hsCode: '7801', defaultUnit: '톤' },
  { name: '아연', enName: 'Zinc', categorySlug: 'nonferrous', aliases: ['zinc'], hsCode: '7901', defaultUnit: '톤' },
  { name: '알루미늄', enName: 'Aluminium', categorySlug: 'nonferrous', aliases: ['aluminium', 'aluminum'], hsCode: '7601', defaultUnit: '톤', firstYearSigned: 1890 },
  { name: '니켈', enName: 'Nickel', categorySlug: 'nonferrous', aliases: ['nickel'], hsCode: '7502', defaultUnit: '톤' },

  // 화학·의약
  { name: '황산', enName: 'Sulphuric acid', categorySlug: 'basic-chemicals', aliases: ['sulphuric acid'], defaultUnit: '톤' },
  { name: '소다회', enName: 'Soda ash', categorySlug: 'basic-chemicals', aliases: ['탄산나트륨', 'soda ash'], defaultUnit: '톤' },
  { name: '합성염료', enName: 'Synthetic dyes', categorySlug: 'basic-chemicals', aliases: ['아닐린 염료', 'dyes'], defaultUnit: '톤', firstYearSigned: 1860, description: '독일 화학공업의 상징. 인디고·꼭두서니 같은 천연염료 교역을 지웠다.' },
  { name: '질소비료', enName: 'Nitrogen fertilizer', categorySlug: 'fertilizer', aliases: ['암모니아 비료', 'nitrogen fertilizer'], hsCode: '3102', defaultUnit: '톤', firstYearSigned: 1913 },
  { name: '의약품', enName: 'Pharmaceuticals', categorySlug: 'pharmaceuticals', aliases: ['약품', 'medicine', 'pharmaceuticals'], hsCode: '3004', defaultUnit: '톤' },
  { name: '백신', enName: 'Vaccines', categorySlug: 'pharmaceuticals', aliases: ['vaccine'], hsCode: '3002', defaultUnit: '도즈', firstYearSigned: 1900 },
  { name: '플라스틱', enName: 'Plastics', categorySlug: 'polymers', aliases: ['합성수지', 'plastics'], hsCode: '3901', defaultUnit: '톤', firstYearSigned: 1930 },
  { name: '화약', enName: 'Gunpowder & explosives', categorySlug: 'basic-chemicals', aliases: ['폭약', 'gunpowder', 'explosives'], defaultUnit: '톤' },

  // 섬유
  { name: '비단', enName: 'Silk', categorySlug: 'fabric', aliases: ['생사', '견직물', 'silk', '生絲'], defaultUnit: '톤', firstYearSigned: -200, description: '실크로드의 이름이 된 품목. 근대에는 일본 생사 수출이 외화 획득의 축이었다.' },
  { name: '면직물', enName: 'Cotton fabric', categorySlug: 'fabric', aliases: ['옥양목', '캘리코', 'cotton cloth', 'calico'], hsCode: '5208', defaultUnit: '야드', description: '19세기 영국 수출의 대표. 인도 수직기 직물업을 무너뜨린 상품이기도 하다.' },
  { name: '모직물', enName: 'Woolen fabric', categorySlug: 'fabric', aliases: ['라사', 'woolens'], defaultUnit: '야드' },
  { name: '마직물', enName: 'Linen', categorySlug: 'fabric', aliases: ['삼베', '아마포', 'linen'], defaultUnit: '야드' },
  { name: '면사', enName: 'Cotton yarn', categorySlug: 'fiber', aliases: ['방적사', 'cotton yarn'], hsCode: '5205', defaultUnit: '톤' },
  { name: '화학섬유', enName: 'Synthetic fiber', categorySlug: 'fiber', aliases: ['합섬', '나일론', 'synthetic fiber'], hsCode: '5402', defaultUnit: '톤', firstYearSigned: 1935 },
  { name: '의류', enName: 'Apparel', categorySlug: 'apparel', aliases: ['봉제의류', 'clothing', 'garments'], hsCode: '6203', defaultUnit: '벌' },
  { name: '신발', enName: 'Footwear', categorySlug: 'apparel', aliases: ['구두', 'footwear', 'shoes'], hsCode: '6403', defaultUnit: '켤레' },

  // 기계·전자
  { name: '방적기계', enName: 'Textile machinery', categorySlug: 'machinery', aliases: ['방직기', 'textile machinery'], defaultUnit: '대', firstYearSigned: 1780 },
  { name: '증기기관', enName: 'Steam engine', categorySlug: 'machinery', aliases: ['steam engine'], defaultUnit: '대', firstYearSigned: 1760, lastYearSigned: 1960 },
  { name: '공작기계', enName: 'Machine tools', categorySlug: 'machinery', aliases: ['machine tools'], hsCode: '8458', defaultUnit: '대' },
  { name: '농기계', enName: 'Agricultural machinery', categorySlug: 'machinery', aliases: ['트랙터', 'tractor'], hsCode: '8701', defaultUnit: '대', firstYearSigned: 1900 },
  { name: '발전설비', enName: 'Power generation equipment', categorySlug: 'machinery', aliases: ['터빈', 'turbine'], defaultUnit: '대', firstYearSigned: 1890 },
  { name: '반도체', enName: 'Semiconductors', categorySlug: 'semiconductor', aliases: ['집적회로', 'IC', 'chips', 'semiconductor'], hsCode: '8542', defaultUnit: '개', firstYearSigned: 1960, description: '20세기 후반 이후 교역 구조와 안보 통제가 겹치는 대표 품목.' },
  { name: '메모리반도체', enName: 'Memory chips', categorySlug: 'semiconductor', aliases: ['D램', 'DRAM', '낸드', 'NAND'], hsCode: '8542', defaultUnit: '개', firstYearSigned: 1970 },
  { name: '반도체장비', enName: 'Semiconductor equipment', categorySlug: 'semiconductor', aliases: ['노광장비', 'EUV', 'lithography'], hsCode: '8486', defaultUnit: '대', firstYearSigned: 1970 },
  { name: '컴퓨터', enName: 'Computers', categorySlug: 'electronic-device', aliases: ['PC', 'computer'], hsCode: '8471', defaultUnit: '대', firstYearSigned: 1950 },
  { name: '휴대전화', enName: 'Mobile phones', categorySlug: 'electronic-device', aliases: ['스마트폰', 'mobile phone', 'smartphone'], hsCode: '8517', defaultUnit: '대', firstYearSigned: 1985 },
  { name: '가전제품', enName: 'Home appliances', categorySlug: 'electronic-device', aliases: ['텔레비전', '냉장고', 'appliances'], hsCode: '8528', defaultUnit: '대', firstYearSigned: 1920 },
  { name: '이차전지', enName: 'Rechargeable batteries', categorySlug: 'electronic-device', aliases: ['배터리', '리튬이온전지', 'battery'], hsCode: '8507', defaultUnit: '개', firstYearSigned: 1995 },
  { name: '전선·케이블', enName: 'Wire & cable', categorySlug: 'electronic-device', aliases: ['해저케이블', 'cable'], hsCode: '8544', defaultUnit: '킬로미터', firstYearSigned: 1850 },

  // 운송장비
  { name: '승용차', enName: 'Passenger cars', categorySlug: 'automobile', aliases: ['자동차', 'car', 'automobile'], hsCode: '8703', defaultUnit: '대', firstYearSigned: 1900 },
  { name: '상용차', enName: 'Commercial vehicles', categorySlug: 'automobile', aliases: ['트럭', '버스', 'truck'], hsCode: '8704', defaultUnit: '대', firstYearSigned: 1905 },
  { name: '자동차부품', enName: 'Auto parts', categorySlug: 'automobile', aliases: ['부품', 'auto parts'], hsCode: '8708', defaultUnit: '톤', firstYearSigned: 1910 },
  { name: '선박', enName: 'Ships', categorySlug: 'shipbuilding', aliases: ['상선', 'ship', 'vessel'], hsCode: '8901', defaultUnit: '척', description: '수출 단위가 척·GT·CGT로 갈리는 품목 — 어느 단위인지 반드시 적어야 비교된다.' },
  { name: '유조선', enName: 'Oil tankers', categorySlug: 'shipbuilding', aliases: ['탱커', 'tanker'], hsCode: '8901', defaultUnit: '척', firstYearSigned: 1890 },
  { name: 'LNG선', enName: 'LNG carriers', categorySlug: 'shipbuilding', aliases: ['LNG carrier'], defaultUnit: '척', firstYearSigned: 1960 },
  { name: '항공기', enName: 'Aircraft', categorySlug: 'aerospace', aliases: ['비행기', 'aircraft', 'airplane'], hsCode: '8802', defaultUnit: '대', firstYearSigned: 1910 },
  { name: '기관차', enName: 'Locomotives', categorySlug: 'rolling-stock', aliases: ['locomotive'], hsCode: '8601', defaultUnit: '대', firstYearSigned: 1830 },
  { name: '철도차량', enName: 'Railway rolling stock', categorySlug: 'rolling-stock', aliases: ['객차', '화차', 'rolling stock'], hsCode: '8605', defaultUnit: '량', firstYearSigned: 1830 },

  // 무기
  { name: '소총', enName: 'Rifles', categorySlug: 'armaments', aliases: ['화승총', '조총', 'rifle', 'musket'], defaultUnit: '정' },
  { name: '화포', enName: 'Artillery', categorySlug: 'armaments', aliases: ['대포', 'cannon', 'artillery'], defaultUnit: '문' },
  { name: '군함', enName: 'Warships', categorySlug: 'armaments', aliases: ['전함', 'warship', 'battleship'], defaultUnit: '척', description: '드레드노트 시대의 군함 수출은 곧 동맹의 표시였다.' },
  { name: '탄약', enName: 'Ammunition', categorySlug: 'armaments', aliases: ['ammunition'], hsCode: '9306', defaultUnit: '발' },
  { name: '전차', enName: 'Tanks', categorySlug: 'armaments', aliases: ['탱크', 'tank'], defaultUnit: '대', firstYearSigned: 1916 },
  { name: '군용기', enName: 'Military aircraft', categorySlug: 'armaments', aliases: ['전투기', 'military aircraft'], defaultUnit: '대', firstYearSigned: 1914 },
  { name: '미사일', enName: 'Missiles', categorySlug: 'armaments', aliases: ['missile'], defaultUnit: '기', firstYearSigned: 1944 },

  // 사치품
  { name: '금', enName: 'Gold', categorySlug: 'precious', aliases: ['황금', 'gold'], hsCode: '7108', defaultUnit: '킬로그램', description: '상품이자 결제 수단. 금본위 시기의 금 이동은 무역수지 조정 그 자체였다.' },
  { name: '은', enName: 'Silver', categorySlug: 'precious', aliases: ['백은', 'silver'], hsCode: '7106', defaultUnit: '킬로그램', description: '아메리카 은 → 유럽 → 중국으로 흐른 16~18세기 세계 교역의 혈액.' },
  { name: '다이아몬드', enName: 'Diamonds', categorySlug: 'precious', aliases: ['diamond'], hsCode: '7102', defaultUnit: '캐럿' },
  { name: '진주', enName: 'Pearls', categorySlug: 'precious', aliases: ['pearl'], defaultUnit: '개' },
  { name: '상아', enName: 'Ivory', categorySlug: 'precious', aliases: ['ivory'], defaultUnit: '톤', lastYearSigned: 1989 },
  { name: '후추', enName: 'Pepper', categorySlug: 'spices', aliases: ['pepper'], hsCode: '0904', defaultUnit: '톤', description: '대항해시대를 연 품목. 향신료 가격차가 항로 개척의 채산을 만들었다.' },
  { name: '정향', enName: 'Cloves', categorySlug: 'spices', aliases: ['clove'], defaultUnit: '톤' },
  { name: '육두구', enName: 'Nutmeg', categorySlug: 'spices', aliases: ['nutmeg', 'mace'], defaultUnit: '톤', description: '반다 제도 독점을 둘러싼 네덜란드·영국 충돌의 대상.' },
  { name: '계피', enName: 'Cinnamon', categorySlug: 'spices', aliases: ['육계', 'cinnamon'], defaultUnit: '톤' },
  { name: '도자기', enName: 'Porcelain', categorySlug: 'ceramics-craft', aliases: ['자기', '청화백자', 'porcelain', 'china'], defaultUnit: '점', description: '중국·조선·일본의 대유럽 수출품. 유럽 자기 산업의 모방 대상이었다.' },
  { name: '칠기', enName: 'Lacquerware', categorySlug: 'ceramics-craft', aliases: ['lacquerware'], defaultUnit: '점' },
  { name: '융단', enName: 'Carpets', categorySlug: 'ceramics-craft', aliases: ['카펫', 'carpet', 'rug'], hsCode: '5701', defaultUnit: '장' },
  { name: '인삼', enName: 'Ginseng', categorySlug: 'cash-crop', aliases: ['홍삼', 'ginseng'], defaultUnit: '근', description: '조선의 대청·대일 수출 주력. 개성상인 자본 축적의 바탕.' },

  // 소비재·기타
  { name: '식료품', enName: 'Processed food', categorySlug: 'consumer-goods', aliases: ['가공식품', 'processed food'], defaultUnit: '톤' },
  { name: '가구', enName: 'Furniture', categorySlug: 'consumer-goods', aliases: ['furniture'], hsCode: '9403', defaultUnit: '점' },
  { name: '완구', enName: 'Toys', categorySlug: 'consumer-goods', aliases: ['장난감', 'toys'], hsCode: '9503', defaultUnit: '개' },
  { name: '서적·인쇄물', enName: 'Books & printed matter', categorySlug: 'consumer-goods', aliases: ['책', 'books'], hsCode: '4901', defaultUnit: '권' },
  { name: '시계', enName: 'Clocks & watches', categorySlug: 'consumer-goods', aliases: ['자명종', 'watch', 'clock'], hsCode: '9102', defaultUnit: '개' },
  { name: '유리제품', enName: 'Glassware', categorySlug: 'consumer-goods', aliases: ['유리', 'glass'], hsCode: '7013', defaultUnit: '점' },

  // 서비스
  { name: '해운', enName: 'Shipping services', categorySlug: 'transport-services', aliases: ['운임', 'freight', 'shipping'], isService: true, description: '영국의 19세기 무역수지 적자를 메운 것이 바로 해운·보험 같은 보이지 않는 수입이었다.' },
  { name: '항공운송', enName: 'Air transport', categorySlug: 'transport-services', aliases: ['air transport'], isService: true, firstYearSigned: 1930 },
  { name: '관광', enName: 'Tourism', categorySlug: 'tourism', aliases: ['여행수지', 'tourism', 'travel'], isService: true },
  { name: '금융·보험', enName: 'Financial & insurance services', categorySlug: 'financial-services', aliases: ['보험', 'insurance', 'financial services'], isService: true },
  { name: '특허·로열티', enName: 'Royalties & licence fees', categorySlug: 'ip-royalties', aliases: ['라이선스료', 'royalties'], isService: true, firstYearSigned: 1900 },
  { name: '소프트웨어·IT서비스', enName: 'Software & IT services', categorySlug: 'ip-royalties', aliases: ['IT서비스', 'software'], isService: true, firstYearSigned: 1980 },
  { name: '건설·플랜트', enName: 'Construction & plant exports', categorySlug: 'transport-services', aliases: ['해외건설', 'construction'], isService: true, firstYearSigned: 1950 },
  { name: '노동송금', enName: 'Labour remittances', categorySlug: 'other-trade', aliases: ['송금', 'remittances'], isService: true, description: '상품 교역표에는 안 잡히지만 국제수지에서는 큰 항목. 파독 광부·중동 건설 인력이 예다.' },

  // 역사적 항목
  { name: '노예', enName: 'Enslaved people', categorySlug: 'other-trade', aliases: ['노예무역', 'slaves', 'slave trade'], defaultUnit: '명', firstYearSigned: 1500, lastYearSigned: 1888, description: '대서양 삼각무역의 한 변으로 사료에 기록된 항목. 경제사 기록을 위한 분류이며, 인원 단위로 집계된다.' },
  { name: '조공품', enName: 'Tribute goods', categorySlug: 'other-trade', aliases: ['방물', 'tribute'], description: '사행(使行)에 실려 오간 물목. 가격이 아니라 의례가 규모를 정했다 — 교역 형태를 TRIBUTE로 함께 적을 것.' },
  { name: '기타', enName: 'Others', categorySlug: 'other-trade', aliases: ['잡화', 'others', 'miscellaneous'], description: '자료의 "기타" 항목을 그대로 담는 자리. 비중 합이 100%가 되게 맞출 때 쓴다.' },
]

export async function seedTradeCommodityCatalog(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🚢 교역 품목 카탈로그 시딩 시작...')

  /* 분류는 부모가 먼저 있어야 하므로 대분류(parentSlug=null)를 앞세운다 */
  const ordered = [
    ...CATEGORIES.filter((category) => category.parentSlug == null),
    ...CATEGORIES.filter((category) => category.parentSlug != null),
  ]

  const categoryIdBySlug = new Map<string, string>()
  const colorBySlug = new Map<string, string>()
  let categoryIndex = 0
  for (const category of ordered) {
    const parentId = category.parentSlug
      ? (categoryIdBySlug.get(category.parentSlug) ?? null)
      : null
    if (category.parentSlug && !parentId) {
      throw new Error(`상위 분류를 찾을 수 없습니다: ${category.parentSlug}`)
    }
    /*
     * 색은 대분류에서 물려받는다. 흐름 행이 무는 분류는 대개 중분류(화석연료)라,
     * 중분류에 색이 없으면 대시보드 구성 막대가 통째로 회색이 된다.
     */
    const colorKey =
      category.colorKey ??
      (category.parentSlug ? (colorBySlug.get(category.parentSlug) ?? null) : null)
    const data = {
      name: category.name,
      enName: category.enName,
      parentId,
      hsSection: category.hsSection ?? null,
      colorKey,
      emoji: category.emoji ?? null,
      description: category.description ?? null,
      sortOrder: categoryIndex++,
    }
    const row = await prisma.tradeCommodityCategory.upsert({
      where: { slug: category.slug },
      update: data,
      create: { slug: category.slug, ...data },
    })
    categoryIdBySlug.set(category.slug, row.id)
    if (colorKey) colorBySlug.set(category.slug, colorKey)
  }
  console.log(`  ✅ 분류 ${categoryIdBySlug.size}개`)

  let created = 0
  let updated = 0
  let commodityIndex = 0
  for (const commodity of COMMODITIES) {
    const categoryId = categoryIdBySlug.get(commodity.categorySlug)
    if (!categoryId) {
      throw new Error(`분류를 찾을 수 없습니다: ${commodity.categorySlug}`)
    }
    const data = {
      enName: commodity.enName ?? null,
      aliases: commodity.aliases?.join(',') ?? null,
      categoryId,
      hsCode: commodity.hsCode ?? null,
      defaultUnit: commodity.defaultUnit ?? null,
      firstYearSigned: commodity.firstYearSigned ?? null,
      lastYearSigned: commodity.lastYearSigned ?? null,
      isService: commodity.isService ?? false,
      description: commodity.description ?? null,
      sortOrder: commodityIndex++,
    }
    const existing = await prisma.tradeCommodity.findUnique({
      where: { name: commodity.name },
      select: { id: true },
    })
    if (existing) {
      await prisma.tradeCommodity.update({ where: { id: existing.id }, data })
      updated++
    } else {
      await prisma.tradeCommodity.create({
        data: { name: commodity.name, ...data },
      })
      created++
    }
  }

  console.log(`  ✅ 품목 신규 ${created} · 갱신 ${updated} (총 ${COMMODITIES.length})`)
  console.log('🚢 교역 품목 카탈로그 시딩 완료')
}
