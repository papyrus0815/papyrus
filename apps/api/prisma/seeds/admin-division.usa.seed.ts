/**
 * 미국 행정구역 시드.
 *  · level 1: State (50개) + DC (1개)
 */
import { PrismaService } from '../prisma.service'
import {
  type AdminDivisionItem,
  seedAdminDivisionsForCountry,
} from './admin-division.shared'

const STATES: { name: string; localName: string }[] = [
  { name: '앨라배마', localName: 'Alabama' },
  { name: '알래스카', localName: 'Alaska' },
  { name: '애리조나', localName: 'Arizona' },
  { name: '아칸소', localName: 'Arkansas' },
  { name: '캘리포니아', localName: 'California' },
  { name: '콜로라도', localName: 'Colorado' },
  { name: '코네티컷', localName: 'Connecticut' },
  { name: '델라웨어', localName: 'Delaware' },
  { name: '플로리다', localName: 'Florida' },
  { name: '조지아', localName: 'Georgia' },
  { name: '하와이', localName: 'Hawaii' },
  { name: '아이다호', localName: 'Idaho' },
  { name: '일리노이', localName: 'Illinois' },
  { name: '인디애나', localName: 'Indiana' },
  { name: '아이오와', localName: 'Iowa' },
  { name: '캔자스', localName: 'Kansas' },
  { name: '켄터키', localName: 'Kentucky' },
  { name: '루이지애나', localName: 'Louisiana' },
  { name: '메인', localName: 'Maine' },
  { name: '메릴랜드', localName: 'Maryland' },
  { name: '매사추세츠', localName: 'Massachusetts' },
  { name: '미시간', localName: 'Michigan' },
  { name: '미네소타', localName: 'Minnesota' },
  { name: '미시시피', localName: 'Mississippi' },
  { name: '미주리', localName: 'Missouri' },
  { name: '몬태나', localName: 'Montana' },
  { name: '네브래스카', localName: 'Nebraska' },
  { name: '네바다', localName: 'Nevada' },
  { name: '뉴햄프셔', localName: 'New Hampshire' },
  { name: '뉴저지', localName: 'New Jersey' },
  { name: '뉴멕시코', localName: 'New Mexico' },
  { name: '뉴욕', localName: 'New York' },
  { name: '노스캐롤라이나', localName: 'North Carolina' },
  { name: '노스다코타', localName: 'North Dakota' },
  { name: '오하이오', localName: 'Ohio' },
  { name: '오클라호마', localName: 'Oklahoma' },
  { name: '오리건', localName: 'Oregon' },
  { name: '펜실베이니아', localName: 'Pennsylvania' },
  { name: '로드아일랜드', localName: 'Rhode Island' },
  { name: '사우스캐롤라이나', localName: 'South Carolina' },
  { name: '사우스다코타', localName: 'South Dakota' },
  { name: '테네시', localName: 'Tennessee' },
  { name: '텍사스', localName: 'Texas' },
  { name: '유타', localName: 'Utah' },
  { name: '버몬트', localName: 'Vermont' },
  { name: '버지니아', localName: 'Virginia' },
  { name: '워싱턴주', localName: 'Washington' },
  { name: '웨스트버지니아', localName: 'West Virginia' },
  { name: '위스콘신', localName: 'Wisconsin' },
  { name: '와이오밍', localName: 'Wyoming' },
  { name: '워싱턴 D.C.', localName: 'District of Columbia' },
]

const DIVISIONS: AdminDivisionItem[] = STATES.map((s) => ({
  level: 1,
  name: s.name,
  localName: s.localName,
}))

export async function seedUsaAdminDivisions(
  prisma: PrismaService,
): Promise<void> {
  await seedAdminDivisionsForCountry(prisma, {
    isoCode: 'US',
    countryNameKo: '미국',
    levels: [
      { level: 1, label: 'State', description: '주 (50) + 워싱턴 D.C.' },
      { level: 2, label: 'County', description: '카운티' },
      { level: 3, label: 'City', description: '시·타운' },
    ],
    divisions: DIVISIONS,
  })
}
