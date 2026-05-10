/**
 * HistoryShell — /history/* 하위 페이지의 공용 레이아웃 셸.
 *
 * 책임:
 * - 핵심 데이터(fetch) → CountryListStateProvider에 주입
 * - 좌측·우측 슬롯을 받아 MainGrid에 배치
 * - 좌측 패널 접기/펼치기 state 관리
 * - 모바일·모달 레이어는 각 페이지가 자체 처리 (셸이 관여 X)
 *
 * 의도적으로 넣지 않은 것:
 * - CountryFormModal 같은 전역 모달 — 특정 뷰에서만 필요하므로 페이지에서 호출
 * - CountryMobileUI — 좌측 패널이 없는 뷰에서 필요 없음
 * - PageHeader — /history가 아닌 독립 페이지에서만 사용하던 레거시
 */
import React, { type ReactNode } from 'react'

import { motion } from 'framer-motion'
import styled from 'styled-components'

import { CountryListStateProvider } from '@/widgets/country/country-list/country-list-state.context'

import {
  useListCollapsed,
  type UseListCollapsedOptions,
} from '../model/use-list-collapsed.hook'
import * as S from './history-shell.styles'

export interface HistoryShellRenderContext {
  /** 좌측 패널 접힘 여부 */
  listCollapsed: boolean
  /** 좌측 패널 접기/펼치기 토글 */
  toggleListCollapsed: () => void
}

interface HistoryShellProps {
  /**
   * 좌측 슬롯. fullScreen=true이면 무시된다.
   * 함수형으로 받으면 listCollapsed·toggleListCollapsed 주입.
   */
  left?:
    | ReactNode
    | ((ctx: HistoryShellRenderContext) => ReactNode)
  /** 우측(메인) 슬롯. */
  right: ReactNode | ((ctx: HistoryShellRenderContext) => ReactNode)
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
  /** Shell 외부로 한 번 감싸고 싶은 추가 요소 (모달 등) — provider 안쪽에 렌더됨 */
  children?: ReactNode
}

export function HistoryShell({
  left,
  right,
  fullScreen = false,
  listCollapsedConfig,
  sidebarExtraWidth,
  mobileDetailVisible = false,
  children,
}: HistoryShellProps) {
  const { collapsed, toggle } = useListCollapsed(listCollapsedConfig)

  const ctx: HistoryShellRenderContext = {
    listCollapsed: collapsed,
    toggleListCollapsed: toggle,
  }

  const resolvedLeft = typeof left === 'function' ? left(ctx) : left
  const resolvedRight = typeof right === 'function' ? right(ctx) : right

  return (
    <Wrap
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <CountryListStateProvider>
        {fullScreen ? (
          resolvedRight
        ) : (
          <S.MainGrid
            $noSidebar
            $listCollapsed={collapsed}
            $sidebarExtraWidth={sidebarExtraWidth}
          >
            {resolvedLeft}
            <S.DetailPane $mobileVisible={mobileDetailVisible}>
              <S.DetailPaneScrollBody>{resolvedRight}</S.DetailPaneScrollBody>
            </S.DetailPane>
          </S.MainGrid>
        )}
        {children}
      </CountryListStateProvider>
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
