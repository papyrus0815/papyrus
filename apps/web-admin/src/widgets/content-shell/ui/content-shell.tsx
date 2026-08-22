/**
 * ContentShell — 콘텐츠 영역(/country, /persons-timeline 등) 페이지의 공용 레이아웃 셸.
 *
 * 책임:
 * - 좌측·우측 슬롯을 받아 MainGrid에 배치
 * - 좌측 패널 접기/펼치기 state 관리
 * - 모바일·모달 레이어는 각 페이지가 자체 처리 (셸이 관여 X)
 *
 * ⚠️ 셸 전체에 opacity fade를 걸지 말 것.
 * 예전엔 Wrap이 motion.div로 매 마운트마다 0→1 페이드했는데, 셸은 라우트마다 새로
 * 마운트되므로 지면을 옮길 때마다 **좌측 사이드바까지 같이 깜빡였다**. 좌측은 페이지가
 * 아니라 그 자리에 계속 있어야 하는 크롬이다. 전환 연출이 필요하면 우측 슬롯을 넘기는
 * 쪽에서 우측에만 건다(country-detail-shell의 RouteSwapMotion, persons-timeline의 motion.div).
 *
 * 의도적으로 넣지 않은 것:
 * - CountryFormModal 같은 전역 모달 — 특정 뷰에서만 필요하므로 페이지에서 호출
 * - CountryMobileUI — 좌측 패널이 없는 뷰에서 필요 없음
 * - PageHeader — 콘텐츠 영역 밖 독립 페이지에서만 사용하던 레거시
 * - CountryListStateProvider — 국가 목록 전용. 예전엔 셸이 항상 감쌌으나 그러면 셸을 쓰는
 *   모든 지면이 국가·역사국가·대륙을 fetch한다. `countryListState`로 opt-in.
 */
import React, { type ReactNode } from 'react'

import styled from 'styled-components'

import { CountryListStateProvider } from '@/widgets/country/country-list/country-list-state.context'

import {
  useListCollapsed,
  type UseListCollapsedOptions,
} from '../model/use-list-collapsed.hook'
import * as S from './content-shell.styles'

export interface ContentShellRenderContext {
  /** 좌측 패널 접힘 여부 */
  listCollapsed: boolean
  /** 좌측 패널 접기/펼치기 토글 */
  toggleListCollapsed: () => void
}

interface ContentShellProps {
  /**
   * 좌측 슬롯. fullScreen=true이면 무시된다.
   * 함수형으로 받으면 listCollapsed·toggleListCollapsed 주입.
   */
  left?:
    | ReactNode
    | ((ctx: ContentShellRenderContext) => ReactNode)
  /** 우측(메인) 슬롯. */
  right: ReactNode | ((ctx: ContentShellRenderContext) => ReactNode)
  /**
   * 풀스크린 모드 — MainGrid 대신 children을 그대로 표시.
   * /history/country (browse) 등 좌우 분할이 없는 뷰에서 사용.
   */
  fullScreen?: boolean
  /**
   * 좌측 패널 접힘 상태 옵션 — 뷰별로 storageKey/defaultCollapsed 분리.
   * 인물 인포그래픽처럼 우측이 본질인 뷰에서 defaultCollapsed=true로.
   */
  listCollapsedConfig?: UseListCollapsedOptions
  /**
   * 사이드바에 보조 컬럼이 떠 있을 때 그 폭을 MainGrid에 더해줌 (B-4 Finder).
   * e.g. 자식 컬럼 180px 표시 중 → 180. 부모 컬럼 폭은 그대로 유지됨.
   */
  sidebarExtraWidth?: number
  /**
   * 모바일(≤1024px)에서 우측(DetailPane)을 보여줄지.
   * - 기본 false: 페이지가 자체 모바일 UI(예: CountryMobileUI)를 별도 렌더하므로 셸의 우측을 숨김.
   * - true: 모바일 전용 UI 없이 우측 콘텐츠를 그대로 보여줘야 할 때 (예: 인물 인포그래픽).
   */
  mobileDetailVisible?: boolean
  /**
   * 국가 목록 상태 Provider를 감쌀지 — 국가 지면(/country)에서만 true.
   * 이 Provider는 현대·역사 국가와 대륙을 fetch하므로 다른 지면에서 켜면 낭비다.
   */
  countryListState?: boolean
  /** Shell 외부로 한 번 감싸고 싶은 추가 요소 (모달 등) */
  children?: ReactNode
}

export function ContentShell({
  left,
  right,
  fullScreen = false,
  listCollapsedConfig,
  sidebarExtraWidth,
  mobileDetailVisible = false,
  countryListState = false,
  children,
}: ContentShellProps) {
  const { collapsed, toggle } = useListCollapsed(listCollapsedConfig)

  const ctx: ContentShellRenderContext = {
    listCollapsed: collapsed,
    toggleListCollapsed: toggle,
  }

  const resolvedLeft = typeof left === 'function' ? left(ctx) : left
  const resolvedRight = typeof right === 'function' ? right(ctx) : right

  const body = (
    <>
      {fullScreen ? (
        resolvedRight
      ) : (
        <S.MainGrid
          $noSidebar
          $listCollapsed={collapsed}
          $sidebarExtraWidth={sidebarExtraWidth}
        >
          {resolvedLeft}
          <S.DetailPane
            $mobileVisible={mobileDetailVisible}
            $listCollapsed={collapsed}
            $sidebarExtraWidth={sidebarExtraWidth}
          >
            <S.DetailPaneScrollBody>{resolvedRight}</S.DetailPaneScrollBody>
          </S.DetailPane>
        </S.MainGrid>
      )}
      {children}
    </>
  )

  return (
    <Wrap>
      {countryListState ? (
        <CountryListStateProvider>{body}</CountryListStateProvider>
      ) : (
        body
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  width: 100%;
  min-height: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  background: ${({ theme }) => theme.colors.background.primary};
  padding: 0;
`
