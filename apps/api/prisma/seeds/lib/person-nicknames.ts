/**
 * 인물 별칭 시드 헬퍼 — (인물, 별칭) 멱등으로 하나 단다.
 *
 * 인물 왕호 칸(person.regnal_name)이 사라진 뒤 그 칸에 들어가던 값 가운데 사람에 붙는 이름
 * (별호 '철공', 궁호·관명 '가즈노미야 내친왕'·'고즈케노스케')은 별칭으로 둔다.
 * 왕호 자체(루이 14세)는 재위 기록의 regnalName이다.
 */
import type { PersonNicknameType, PrismaClient } from '@prisma/client'

export async function ensureNickname(
  prisma: PrismaClient,
  personId: string,
  nickname: string,
  type: PersonNicknameType,
  reason?: string,
): Promise<void> {
  const existing = await prisma.personNickname.findFirst({
    where: { personId, nickname },
    select: { id: true },
  })
  if (existing) return
  await prisma.personNickname.create({
    data: { personId, nickname, type, priority: 0, ...(reason ? { reason } : {}) },
  })
  console.log(`  ✅ 별칭: ${nickname} (${type})`)
}
