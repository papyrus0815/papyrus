/**
 * 카탈로그 상세 패널 호스트
 *
 * - >=1200px: Layout.CatalogSplit grid의 두 번째 컬럼으로 자연스럽게 자리잡음
 * - <1200px: 우측에서 슬라이드인하는 fixed drawer + backdrop
 *   (제목·닫기 헤더는 자식 EventDetailPanel이 담당 — drawer가 따로 그리면 2중 노출)
 *
 * 모바일 drawer는 dialog로 동작 — focus trap + aria-modal + 닫기 시 트리거 복귀.
 * desktop column 모드에서는 일반 inline panel (a11y 처리 불필요).
 */
import React, { useEffect, useState } from 'react'

import * as PageStyles from '../../styles/list-page.styles'
import { BREAKPOINTS } from '../../styles/theme'
import { useFocusTrap } from '../hooks/use-focus-trap'

/** desktop 미만에서는 drawer로 동작 — Layout.CatalogSplit과 같은 분기점을 공유 */
const DRAWER_BREAKPOINT = BREAKPOINTS.desktop

interface Props {
  open: boolean
  onClose: () => void
  /** 모바일 drawer header에 표시할 사건 제목 (없으면 비워둠) */
  title?: string | null
  children: React.ReactNode
}

export const CatalogDetailDrawer: React.FC<Props> = ({
  open,
  onClose,
  title,
  children,
}) => {
  // SSR 안전: window 접근은 effect 안에서만
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${DRAWER_BREAKPOINT})`)
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  // 모바일 drawer일 때만 focus trap 활성
  const trapRef = useFocusTrap<HTMLDivElement>(isMobile && open)

  // Esc로 닫기 (drawer가 dialog로 동작할 때만)
  useEffect(() => {
    if (!isMobile || !open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isMobile, open, onClose])

  return (
    <>
      <PageStyles.DetailDrawerBackdrop
        $open={open}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* 열림 고지(A11Y-18)는 **페이지 레벨**의 DrawerAnnouncer가 담당한다 —
       * 이 컴포넌트 자체가 `selectedEventId && (...)`로 조건부 렌더라, 여기에 두면
       * 라이브 영역이 텍스트를 품은 채 삽입돼 첫 열림이 낭독되지 않는다. */}
      <PageStyles.DetailPanelHost
        ref={trapRef}
        $open={open}
        /**
         * 모바일 = dialog(트랩·aria-modal), 데스크톱 = region 랜드마크.
         * 데스크톱에서 role을 비워 두면 SR이 이 영역으로 건너뛸 방법이 없다 —
         * 랜드마크로 두면 '사건 상세: <제목>' 영역으로 바로 이동할 수 있다.
         */
        role={isMobile ? 'dialog' : open ? 'region' : undefined}
        aria-modal={isMobile && open ? true : undefined}
        /* 이름은 **어떤 사건인지**여야 한다. 고정 문구 '사건 상세'는 어느 사건을 열었는지
         * 전달하지 못한다. */
        aria-label={
          isMobile
            ? (title ?? '사건 상세')
            : open
              ? `사건 상세: ${title ?? '선택된 사건'}`
              : undefined
        }
      >
        {/*
         * (제거됨) DetailDrawerHeader — 제목 + 닫기 버튼의 자체 sticky 띠.
         *
         * ≤1200px에서 이 띠와 자식 EventDetailPanel의 DetailPanelHeader가 **동시에** 렌더돼
         * 같은 사건 제목이 두 번, ✕ 버튼이 두 번 나왔다(390px 실측 확인). sticky 헤더도 2겹.
         * 패널 헤더 쪽이 제목을 h2로 들고 있고 이전/다음·공유·수정·삭제까지 함께 제공하므로
         * 그쪽을 정본으로 두고 drawer 자체 헤더를 걷어낸다. 닫기 어포던스는 패널 헤더의 ✕가 잇는다.
         */}
        {children}
      </PageStyles.DetailPanelHost>
    </>
  )
}
