/**
 * 형제 모달 레인 그룹핑 렌더 테스트 (배치3 회귀 가드).
 *
 * 브라우저 육안 확인을 대신하는 jsdom 검증 — 레인 헤더·배지 텍스트·a11y 배선이
 * 실제 DOM에 기대대로 나타나는지 못박는다.
 */
import '@testing-library/jest-dom'
import { screen } from '@testing-library/react'

// card.tsx → @/shared/api/upload → api/client(import.meta.env)가 jest CJS 트랜스파일과
// 충돌하므로 업로드 URL 해석만 항등 함수로 대체(렌더 검증에 무관).
jest.mock('@/shared/api/upload', () => ({
  getUploadImageUrl: (url: string) => url,
}))

import type { FamilyTreePerson } from '@/shared/api/persons-family-tree'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import { FamilyTreeLookupContext } from './context'
import { SiblingsListModal } from './modals'
import type { NodePerson } from './types'

const EGO_FATHER = 'father-1'
const EGO_MOTHER = 'mother-1'
const OTHER_MOTHER = 'mother-2'

function ftNode(id: string, name: string): FamilyTreePerson {
  return { id, isOwned: true, name, fatherId: null, motherId: null }
}

function sibling(
  id: string,
  name: string,
  fks: { fatherId?: string | null; motherId?: string | null },
): NodePerson {
  return { id, name, ...fks }
}

const nodeMap = new Map<string, FamilyTreePerson>([
  [EGO_FATHER, ftNode(EGO_FATHER, '볼레스와프')],
  [EGO_MOTHER, ftNode(EGO_MOTHER, '즈비슬라바')],
  [OTHER_MOTHER, ftNode(OTHER_MOTHER, '살로메아')],
])

function renderModal(siblings: NodePerson[]) {
  return renderWithTheme(
    <FamilyTreeLookupContext.Provider value={nodeMap}>
      <SiblingsListModal
        siblings={siblings}
        anchorParents={{ fatherId: EGO_FATHER, motherId: EGO_MOTHER }}
        onClose={() => {}}
      />
    </FamilyTreeLookupContext.Provider>,
  )
}

describe('SiblingsListModal — 레인 그룹핑', () => {
  it('혼합 구성이면 레인 헤더(친형제/이복—어머니 실명/관계 미상)가 그려진다', () => {
    renderModal([
      sibling('full', '친형제A', { fatherId: EGO_FATHER, motherId: EGO_MOTHER }),
      sibling('half', '이복B', { fatherId: EGO_FATHER, motherId: OTHER_MOTHER }),
      sibling('unknown', '미상C', { fatherId: EGO_FATHER, motherId: null }),
    ])
    expect(screen.getByRole('heading', { name: '친형제' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '이복 — 어머니 살로메아' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '관계 미상 — 개별 사유는 카드 참조' })).toBeInTheDocument()
    // 레인 role=group이 제목 요소로 라벨링(aria-labelledby)돼야 함
    expect(screen.getByRole('group', { name: '친형제' })).toBeInTheDocument()
    // 확정 이복만 '이복형제' 배지, 미상은 무수식 '형제'
    expect(screen.getByText('이복형제')).toBeInTheDocument()
    expect(screen.getAllByText('형제')).toHaveLength(2)
  })

  it('전원 친형제면 레인 헤더 없이 flat 렌더 (헤더 노이즈 방지)', () => {
    renderModal([
      sibling('one', '형A', { fatherId: EGO_FATHER, motherId: EGO_MOTHER }),
      sibling('two', '형B', { fatherId: EGO_FATHER, motherId: EGO_MOTHER }),
    ])
    expect(screen.queryByRole('heading', { name: '친형제' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('절단(truncated)이면 표시분 기준 한정 고지가 부제로 뜬다', () => {
    renderWithTheme(
      <FamilyTreeLookupContext.Provider value={nodeMap}>
        <SiblingsListModal
          siblings={[sibling('one', '형A', { fatherId: EGO_FATHER, motherId: EGO_MOTHER })]}
          anchorParents={{ fatherId: EGO_FATHER, motherId: EGO_MOTHER }}
          truncated
          onClose={() => {}}
        />
      </FamilyTreeLookupContext.Provider>,
    )
    expect(
      screen.getByText('인원이 많아 일부만 표시 — 구분·인원수는 표시된 형제 기준'),
    ).toBeInTheDocument()
  })

  it('공용 Modal 토대 — dialog role과 제목 라벨링이 배선된다 (#14/#26)', () => {
    renderModal([sibling('one', '형A', { fatherId: EGO_FATHER, motherId: OTHER_MOTHER })])
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName(/형제자매 — 1명/)
  })
})
