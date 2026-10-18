/**
 * 테스트 전용 — 재위·재임이 한 테이블이 된 뒤에도 '두 모델' 가짜(fake)를 그대로 쓰게 하는 라우터.
 *
 * 서비스는 이제 `governmentPositionTenure.findMany`를 군주직(재위)·비군주직(재임) 조건으로 감싸
 * 두 번 부른다(office-holding.query의 reignWhere/tenureWhere). 이 라우터가 그 포장을 벗겨
 * 군주직이면 `sovereignReign.findMany` 가짜로, 아니면 원래 재임 가짜로 보낸다 — 기존 스펙의
 * where 검사·호출 기록이 바뀌지 않는다.
 */
type FindMany = (args?: any) => Promise<any>

export function unwrapOfficeWhere(where: any): { kind: 'reign' | 'tenure'; inner: any } {
  const and = where?.AND
  if (Array.isArray(and) && and.length === 2) {
    const marker = JSON.stringify(and[1])
    if (marker.includes('"isMonarchical":true')) return { kind: 'reign', inner: and[0] }
    if (marker.includes('"isMonarchical":false')) return { kind: 'tenure', inner: and[0] }
  }
  return { kind: 'tenure', inner: where }
}

export function withOfficeHoldingRouter<
  T extends { governmentPositionTenure: { findMany: FindMany }; sovereignReign?: { findMany: FindMany } },
>(fake: T): T {
  const tenureFindMany = fake.governmentPositionTenure.findMany
  const reignFindMany: FindMany = fake.sovereignReign?.findMany ?? (async () => [])
  return {
    ...fake,
    governmentPositionTenure: {
      ...fake.governmentPositionTenure,
      findMany: (args?: any) => {
        const { kind, inner } = unwrapOfficeWhere(args?.where)
        const next = { ...args, where: inner }
        return kind === 'reign' ? reignFindMany(next) : tenureFindMany(next)
      },
    },
  }
}
