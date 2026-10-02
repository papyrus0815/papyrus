import { CitationTargetType, type ObservationSubjectType, type Prisma } from '@prisma/client'

/**
 * 대상이 지워질 때 그 대상의 측정값·인용을 함께 지운다.
 *
 * 측정값의 대상은 다형이라 DB FK가 없다(Comment와 같은 패턴) — CASCADE가 대신해 주지 않는다.
 * 그래서 대상을 지우는 쓰기 통로(진영 동기화·참여국 동기화)가 **같은 트랜잭션 안에서** 이걸 부른다.
 * 출처(Source)는 공유 자원이라 남긴다.
 */
export async function removeObservationsForSubjects(
  tx: Prisma.TransactionClient,
  subjectType: ObservationSubjectType,
  subjectIds: string[],
): Promise<number> {
  if (subjectIds.length === 0) return 0
  const rows = await tx.observation.findMany({
    where: { subjectType, subjectId: { in: subjectIds } },
    select: { id: true },
  })
  if (rows.length === 0) return 0
  const ids = rows.map((row) => row.id)
  await tx.citation.deleteMany({ where: { targetType: CitationTargetType.OBSERVATION, targetId: { in: ids } } })
  await tx.observation.deleteMany({ where: { id: { in: ids } } })
  return ids.length
}
