import '@testing-library/jest-dom'

import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { EVENTS_PAGE_SIZE_ALL } from '@/entities/event/model/types'

import type { ListColumnKey, SortOption } from '@/features/event-list/lib'
import type { ListDensity } from '@/pages/events/styles/theme'

import { CatalogViewUtilities } from './catalog-toolbar'

/**
 * 표시 설정(⋯) 메뉴 계약 가드.
 *
 * 2026-09-24 뷰 여섯(지도·격자·통계·트리·갤러리·시대)을 걷어내며 목록 위 '보기 행'이
 * 사라졌고, 그 행에 상시 노출돼 있던 정렬·방향·밀도·하위 접기가 전부 이 메뉴로 들어왔다.
 * 정렬에는 두 번째 진입점(열 머리글 클릭)이 있지만 그쪽은 `aria-hidden` 시각 보조라
 * **키보드·스크린리더에게는 이 메뉴가 유일한 경로**다. 여기서 축이 하나라도 빠지면
 * 그 사용자에게는 기능이 사라진 것과 같으므로, 목록이 아니라 계약으로 고정한다.
 */
const baseProps = {
  showFlatView: false,
  onToggleFlatView: jest.fn(),
  childrenCollapsed: false,
  hasCollapsibleChildren: true,
  onCollapseAllChildren: jest.fn(),
  onExpandAllChildren: jest.fn(),
  onExportJson: jest.fn(),
  onOpenShortcutHelp: jest.fn(),
  pageSize: 100,
  onPageSizeChange: jest.fn(),
  sortBy: 'recent' as SortOption,
  sortDirection: 'desc' as 'asc' | 'desc',
  onSortChange: jest.fn(),
  onSortDirectionToggle: jest.fn(),
  listDensity: 'cozy' as ListDensity,
  onChangeListDensity: jest.fn(),
  hiddenColumns: [] as ListColumnKey[],
  onToggleColumn: jest.fn(),
  onResetColumns: jest.fn(),
}

const openMenu = (props: Partial<typeof baseProps> = {}) => {
  renderWithTheme(<CatalogViewUtilities {...baseProps} {...props} />)
  fireEvent.click(screen.getByRole('button', { name: /표시 설정/ }))
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('CatalogViewUtilities — 표시 설정 메뉴', () => {
  it('정렬 네 축을 모두 편다 — 열 머리글이 못 싣는 축도 여기에는 있다', () => {
    openMenu()
    // '하위 많은 순'만 열이 없던 시절엔 이 축이 메뉴 밖으로 나가면 도달 수단이 0이 된다.
    for (const label of ['시기순', '등록순', '기간순', '하위 많은 순']) {
      expect(screen.getByRole('radio', { name: new RegExp(label) })).toBeInTheDocument()
    }
  })

  it('현재 정렬 축만 checked이고, 다른 축을 고르면 그 값으로 바꾼다', () => {
    openMenu({ sortBy: 'duration' })
    expect(screen.getByRole('radio', { name: /기간순/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /시기순/ })).not.toBeChecked()

    fireEvent.click(screen.getByRole('radio', { name: /하위 많은 순/ }))
    expect(baseProps.onSortChange).toHaveBeenCalledWith('descendants')
  })

  it('방향 토글은 지금 방향을 이름으로 말한다 — 낭독만 듣고도 상태를 안다', () => {
    openMenu({ sortDirection: 'asc' })
    const toggle = screen.getByRole('button', { name: /오름차순/ })
    fireEvent.click(toggle)
    expect(baseProps.onSortDirectionToggle).toHaveBeenCalled()
  })

  it('밀도 3단과 개수 4종이 각자 라디오 그룹으로 선다', () => {
    openMenu()
    const density = screen.getByRole('radiogroup', { name: '목록 밀도' })
    const pageSize = screen.getByRole('radiogroup', { name: '한 번에 불러올 개수' })
    expect(density).toBeInTheDocument()
    expect(pageSize).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: '조밀' }))
    expect(baseProps.onChangeListDensity).toHaveBeenCalledWith('compact')
  })

  it("개수에 '모두'가 있고, 고르면 전량 sentinel을 올린다", () => {
    // 목록은 어차피 전 페이지를 소진하는데 상한이 100이라 그 소진이 수십 번의
    // 왕복으로 쪼개져 있었다 — 한 번에 받겠다는 선택지가 없으면 그걸 고를 수 없다.
    openMenu()
    const all = screen.getByRole('radio', { name: /한 번에 전부/ })
    expect(all).not.toBeChecked()
    fireEvent.click(all)
    expect(baseProps.onPageSizeChange).toHaveBeenCalledWith(EVENTS_PAGE_SIZE_ALL)
  })

  it("'모두'로 불러오는 중이면 그 칸만 checked다", () => {
    openMenu({ pageSize: EVENTS_PAGE_SIZE_ALL })
    expect(screen.getByRole('radio', { name: /한 번에 전부/ })).toBeChecked()
    expect(
      screen.getByRole('radio', { name: /100건씩 이어 받기/ }),
    ).not.toBeChecked()
  })

  it('계층 보기 스위치가 메뉴 안에 있다 — 필터 바에서 내려온 표시 축', () => {
    // 계층/평면은 같은 사건을 다르게 나열할 뿐 결과 집합을 바꾸지 않는다. 필터 바에
    // 있던 동안은 켜짐 tint가 '이 축에 필터가 걸렸다'는 신호와 같은 색으로 경합했다.
    openMenu()
    const toggle = screen.getByRole('switch', { name: '계층 보기' })
    expect(toggle).toBeChecked()
    fireEvent.click(toggle)
    expect(baseProps.onToggleFlatView).toHaveBeenCalled()
  })

  it('평면 보기이면 계층 스위치가 꺼진 상태로 읽힌다', () => {
    openMenu({ showFlatView: true })
    expect(screen.getByRole('switch', { name: '계층 보기' })).not.toBeChecked()
  })

  it('평면 보기에서는 하위 접기가 비활성 — 지우지 않고 흐려 이유를 남긴다', () => {
    // 활성인 채로 눌리면 expandedEventIds만 비워 두었다가, 나중에 계층을 켜는 순간
    // 그때 접힘이 터진다(원인과 결과가 분리된 지연 폭발 — 검토 GAP-6).
    openMenu({ showFlatView: true })
    const item = screen.getByRole('button', { name: /하위 사건 모두 접기/ })
    expect(item).toBeDisabled()
    fireEvent.click(item)
    expect(baseProps.onCollapseAllChildren).not.toHaveBeenCalled()
  })

  it('접혀 있을 때 라벨은 **다음 동작**을 말한다(A11Y-8)', () => {
    // 예전엔 이름이 '하위 펼치기'인데 aria-pressed가 눌림이라 "펼치기, 눌림"으로 낭독됐다.
    openMenu({ childrenCollapsed: true })
    const item = screen.getByRole('button', { name: /하위 사건 모두 펼치기/ })
    fireEvent.click(item)
    expect(baseProps.onExpandAllChildren).toHaveBeenCalled()
  })

  it('열 여섯을 switch로 펴고, 끄면 그 열을 토글 핸들러로 올린다', () => {
    openMenu()
    for (const label of ['종료', '분류', '키워드', '기간', '관련국', '등록']) {
      expect(screen.getByRole('switch', { name: label })).toBeChecked()
    }
    fireEvent.click(screen.getByRole('switch', { name: '키워드' }))
    expect(baseProps.onToggleColumn).toHaveBeenCalledWith('kw')
  })

  it('끈 열은 switch가 꺼지고 되돌리기가 함께 선다', () => {
    // '전부 표시'는 하나라도 꺼져 있을 때만 — 항상 있으면 누를 일 없는 링크가 상주한다.
    openMenu({ hiddenColumns: ['kw', 'reg'] })
    expect(screen.getByRole('switch', { name: '키워드' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: '분류' })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: '전부 표시' }))
    expect(baseProps.onResetColumns).toHaveBeenCalled()
  })

  it('전부 표시 중이면 되돌리기 버튼 자체가 없다', () => {
    openMenu()
    expect(screen.queryByRole('button', { name: '전부 표시' })).toBeNull()
  })

  it('닫힌 트리거가 숨긴 열 수를 싣는다 — 메뉴를 열지 않고도 안다', () => {
    renderWithTheme(
      <CatalogViewUtilities {...baseProps} hiddenColumns={['kw', 'reg']} />,
    )
    expect(
      screen.getByRole('button', { name: /열 2개 숨김/ }),
    ).toBeInTheDocument()
  })

  it('닫힌 트리거가 현재 정렬을 싣는다 — 메뉴를 열지 않고도 순서를 안다', () => {
    renderWithTheme(<CatalogViewUtilities {...baseProps} sortBy="created" />)
    expect(
      screen.getByRole('button', { name: /현재 정렬 등록순/ }),
    ).toBeInTheDocument()
  })
})
