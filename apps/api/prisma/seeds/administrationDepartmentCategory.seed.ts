import { PrismaService } from '../prisma.service'

/** 전세계 공통 부처 카테고리 (국방·외교·재정 등) — 카테고리 테이블에 넣을 데이터 */
const ADMINISTRATION_DEPARTMENT_CATEGORIES: Array<{ name: string; nameEn: string | null }> = [
  { name: '국방', nameEn: 'Defense' },
  { name: '외교', nameEn: 'Foreign Affairs' },
  { name: '재정·경제', nameEn: 'Finance & Economy' },
  { name: '법무', nameEn: 'Justice' },
  { name: '교육', nameEn: 'Education' },
  { name: '과학기술', nameEn: 'Science & Technology' },
  { name: '문화·체육', nameEn: 'Culture & Sports' },
  { name: '보건·복지', nameEn: 'Health & Welfare' },
  { name: '환경', nameEn: 'Environment' },
  { name: '고용·노동', nameEn: 'Employment & Labor' },
  { name: '여성·가족', nameEn: 'Gender & Family' },
  { name: '농림·해양', nameEn: 'Agriculture & Fisheries' },
  { name: '산업·에너지', nameEn: 'Industry & Energy' },
  { name: '국토·교통', nameEn: 'Land & Transport' },
  { name: '정보·통신', nameEn: 'Information & Communication' },
  { name: '행정·안전', nameEn: 'Administration & Safety' },
  { name: '기획·조정', nameEn: 'Planning & Coordination' },
  { name: '정보·정보기관', nameEn: 'Intelligence' },
  { name: '기타', nameEn: 'Other' },
]

export async function seedAdministrationDepartmentCategories(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n📋 행정 부처 카테고리 시딩 시작...')

  for (const category of ADMINISTRATION_DEPARTMENT_CATEGORIES) {
    const existing = await prisma.administrationDepartmentCategory.findFirst({
      where: { name: category.name },
    })
    if (existing) {
      await prisma.administrationDepartmentCategory.update({
        where: { id: existing.id },
        data: { nameEn: category.nameEn },
      })
    } else {
      await prisma.administrationDepartmentCategory.create({
        data: { name: category.name, nameEn: category.nameEn },
      })
    }
    console.log(`  ✅ 부처 카테고리: ${category.name}${category.nameEn ? ` (${category.nameEn})` : ''}`)
  }

  console.log(`✅ 총 ${ADMINISTRATION_DEPARTMENT_CATEGORIES.length}개 부처 카테고리 시딩 완료!\n`)
}
