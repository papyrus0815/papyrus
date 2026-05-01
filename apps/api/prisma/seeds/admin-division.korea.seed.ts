/**
 * 대한민국 행정구역 시드.
 *  · level 1: 광역시도 (17개)
 *  · level 2: 시군구 — 서울특별시 25구 + 광역시·도 일부 시범
 */
import { PrismaService } from '../prisma.service'
import {
  type AdminDivisionItem,
  seedAdminDivisionsForCountry,
} from './admin-division.shared'

const DIVISIONS: AdminDivisionItem[] = [
  // Level 1 — 광역시도
  { level: 1, name: '서울특별시', localName: 'Seoul' },
  { level: 1, name: '부산광역시', localName: 'Busan' },
  { level: 1, name: '대구광역시', localName: 'Daegu' },
  { level: 1, name: '인천광역시', localName: 'Incheon' },
  { level: 1, name: '광주광역시', localName: 'Gwangju' },
  { level: 1, name: '대전광역시', localName: 'Daejeon' },
  { level: 1, name: '울산광역시', localName: 'Ulsan' },
  { level: 1, name: '세종특별자치시', localName: 'Sejong' },
  { level: 1, name: '경기도', localName: 'Gyeonggi' },
  { level: 1, name: '강원특별자치도', localName: 'Gangwon' },
  { level: 1, name: '충청북도', localName: 'Chungbuk' },
  { level: 1, name: '충청남도', localName: 'Chungnam' },
  { level: 1, name: '전북특별자치도', localName: 'Jeonbuk' },
  { level: 1, name: '전라남도', localName: 'Jeonnam' },
  { level: 1, name: '경상북도', localName: 'Gyeongbuk' },
  { level: 1, name: '경상남도', localName: 'Gyeongnam' },
  { level: 1, name: '제주특별자치도', localName: 'Jeju' },

  // Level 2 — 서울 25구
  { level: 2, name: '강남구', localName: 'Gangnam-gu', parentName: '서울특별시' },
  { level: 2, name: '강동구', localName: 'Gangdong-gu', parentName: '서울특별시' },
  { level: 2, name: '강북구', localName: 'Gangbuk-gu', parentName: '서울특별시' },
  { level: 2, name: '강서구', localName: 'Gangseo-gu', parentName: '서울특별시' },
  { level: 2, name: '관악구', localName: 'Gwanak-gu', parentName: '서울특별시' },
  { level: 2, name: '광진구', localName: 'Gwangjin-gu', parentName: '서울특별시' },
  { level: 2, name: '구로구', localName: 'Guro-gu', parentName: '서울특별시' },
  { level: 2, name: '금천구', localName: 'Geumcheon-gu', parentName: '서울특별시' },
  { level: 2, name: '노원구', localName: 'Nowon-gu', parentName: '서울특별시' },
  { level: 2, name: '도봉구', localName: 'Dobong-gu', parentName: '서울특별시' },
  { level: 2, name: '동대문구', localName: 'Dongdaemun-gu', parentName: '서울특별시' },
  { level: 2, name: '동작구', localName: 'Dongjak-gu', parentName: '서울특별시' },
  { level: 2, name: '마포구', localName: 'Mapo-gu', parentName: '서울특별시' },
  { level: 2, name: '서대문구', localName: 'Seodaemun-gu', parentName: '서울특별시' },
  { level: 2, name: '서초구', localName: 'Seocho-gu', parentName: '서울특별시' },
  { level: 2, name: '성동구', localName: 'Seongdong-gu', parentName: '서울특별시' },
  { level: 2, name: '성북구', localName: 'Seongbuk-gu', parentName: '서울특별시' },
  { level: 2, name: '송파구', localName: 'Songpa-gu', parentName: '서울특별시' },
  { level: 2, name: '양천구', localName: 'Yangcheon-gu', parentName: '서울특별시' },
  { level: 2, name: '영등포구', localName: 'Yeongdeungpo-gu', parentName: '서울특별시' },
  { level: 2, name: '용산구', localName: 'Yongsan-gu', parentName: '서울특별시' },
  { level: 2, name: '은평구', localName: 'Eunpyeong-gu', parentName: '서울특별시' },
  { level: 2, name: '종로구', localName: 'Jongno-gu', parentName: '서울특별시' },
  { level: 2, name: '중구 (서울)', localName: 'Jung-gu (Seoul)', parentName: '서울특별시' },
  { level: 2, name: '중랑구', localName: 'Jungnang-gu', parentName: '서울특별시' },

  // Level 2 — 부산 광역구 (대표 8개)
  { level: 2, name: '해운대구', localName: 'Haeundae-gu', parentName: '부산광역시' },
  { level: 2, name: '부산진구', localName: 'Busanjin-gu', parentName: '부산광역시' },
  { level: 2, name: '동래구', localName: 'Dongnae-gu', parentName: '부산광역시' },
  { level: 2, name: '남구 (부산)', localName: 'Nam-gu (Busan)', parentName: '부산광역시' },
  { level: 2, name: '서구 (부산)', localName: 'Seo-gu (Busan)', parentName: '부산광역시' },
  { level: 2, name: '북구 (부산)', localName: 'Buk-gu (Busan)', parentName: '부산광역시' },
  { level: 2, name: '사상구', localName: 'Sasang-gu', parentName: '부산광역시' },
  { level: 2, name: '사하구', localName: 'Saha-gu', parentName: '부산광역시' },

  // Level 2 — 경기도 주요 시 (대표 10개)
  { level: 2, name: '수원시', localName: 'Suwon', parentName: '경기도' },
  { level: 2, name: '성남시', localName: 'Seongnam', parentName: '경기도' },
  { level: 2, name: '고양시', localName: 'Goyang', parentName: '경기도' },
  { level: 2, name: '용인시', localName: 'Yongin', parentName: '경기도' },
  { level: 2, name: '부천시', localName: 'Bucheon', parentName: '경기도' },
  { level: 2, name: '안산시', localName: 'Ansan', parentName: '경기도' },
  { level: 2, name: '안양시', localName: 'Anyang', parentName: '경기도' },
  { level: 2, name: '남양주시', localName: 'Namyangju', parentName: '경기도' },
  { level: 2, name: '평택시', localName: 'Pyeongtaek', parentName: '경기도' },
  { level: 2, name: '시흥시', localName: 'Siheung', parentName: '경기도' },

  // Level 2 — 제주 (시 2개)
  { level: 2, name: '제주시', localName: 'Jeju-si', parentName: '제주특별자치도' },
  {
    level: 2,
    name: '서귀포시',
    localName: 'Seogwipo-si',
    parentName: '제주특별자치도',
  },
]

export async function seedKoreaAdminDivisions(
  prisma: PrismaService,
): Promise<void> {
  await seedAdminDivisionsForCountry(prisma, {
    isoCode: 'KR',
    countryNameKo: '대한민국',
    levels: [
      { level: 1, label: '광역시도', description: '특별시·광역시·도·특별자치도' },
      { level: 2, label: '시군구', description: '시·군·자치구' },
      { level: 3, label: '읍면동', description: '읍·면·동' },
    ],
    divisions: DIVISIONS,
  })
}
