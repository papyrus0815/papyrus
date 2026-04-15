import { PrismaService } from '../prisma.service'

export interface EventCategoryData {
  name: string
  description: string
}

const EVENT_CATEGORIES: EventCategoryData[] = [
  { name: '정치', description: '정치 관련 사건' },
  { name: '경제', description: '경제 관련 사건' },
  {
    name: '전쟁/군사',
    description: '전쟁, 전투, 군사 작전 및 군사 관련 사건',
  },
  { name: '사회', description: '사회 관련 사건' },
  { name: '문화', description: '문화 관련 사건' },
  { name: '과학기술', description: '과학기술 관련 사건' },
  { name: '외교', description: '외교 관련 사건' },
  { name: '회담/조약', description: '국제 회담 및 협상' },
  { name: '종교', description: '종교 관련 사건' },
  { name: '기타', description: '기타 사건' },
]

export async function seedEventCategories(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n📋 이벤트 카테고리 시딩 시작...')

  for (const category of EVENT_CATEGORIES) {
    // 자연키(name)로 조회 후 없으면 생성 — id는 @default(uuid())로 자동 할당
    const existing = await prisma.eventCategory.findFirst({
      where: { name: category.name },
    })
    if (existing) {
      console.log(`  ⏭️  스킵: ${category.name}`)
    } else {
      await prisma.eventCategory.create({
        data: {
          name: category.name,
          description: category.description,
        },
      })
      console.log(`  ✅ 생성: ${category.name}`)
    }
  }

  console.log(`✅ 총 ${EVENT_CATEGORIES.length}개 이벤트 카테고리 시딩 완료!\n`)
}

