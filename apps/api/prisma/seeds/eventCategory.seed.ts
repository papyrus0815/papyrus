import { PrismaService } from '../prisma.service'

export interface EventCategoryData {
  id: string
  name: string
  description: string
  parentId: string | null
}

const EVENT_CATEGORIES: EventCategoryData[] = [
  {
    id: 'cat-political-001',
    name: '정치',
    description: '정치 관련 사건',
    parentId: null,
  },
  {
    id: 'cat-economic-001',
    name: '경제',
    description: '경제 관련 사건',
    parentId: null,
  },
  {
    id: 'cat-military-001',
    name: '전쟁/군사',
    description: '전쟁, 전투, 군사 작전 및 군사 관련 사건',
    parentId: null,
  },
  {
    id: 'cat-social-001',
    name: '사회',
    description: '사회 관련 사건',
    parentId: null,
  },
  {
    id: 'cat-cultural-001',
    name: '문화',
    description: '문화 관련 사건',
    parentId: null,
  },
  {
    id: 'cat-tech-001',
    name: '과학기술',
    description: '과학기술 관련 사건',
    parentId: null,
  },
  {
    id: 'cat-diplomatic-001',
    name: '외교',
    description: '외교 관련 사건',
    parentId: null,
  },
  {
    id: 'cat-conference-001',
    name: '회담/조약',
    description: '국제 회담 및 협상',
    parentId: null,
  },
  {
    id: 'cat-religious-001',
    name: '종교',
    description: '종교 관련 사건',
    parentId: null,
  },
  {
    id: 'cat-other-001',
    name: '기타',
    description: '기타 사건',
    parentId: null,
  },
]

export async function seedEventCategories(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n📋 이벤트 카테고리 시딩 시작...')

  for (const category of EVENT_CATEGORIES) {
    const created = await prisma.eventCategory.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        description: category.description,
        parentId: category.parentId,
      },
      create: category,
    })
    console.log(`  ✅ 이벤트 카테고리 생성됨: ${created.name}`)
  }

  console.log(`✅ 총 ${EVENT_CATEGORIES.length}개 이벤트 카테고리 생성 완료!\n`)
}

