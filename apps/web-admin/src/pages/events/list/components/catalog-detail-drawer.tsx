/**
 * 카탈로그 상세 패널 호스트
 *
 * - >=1200px: Layout.CatalogSplit grid의 두 번째 컬럼으로 자연스럽게 자리잡음
 * - <1200px: 우측에서 슬라이드인하는 fixed drawer + backdrop + sticky 닫기 헤더
 *
 * 모바일 drawer는 dialog로 동작 — focus trap + aria-modal + 닫기 시 트리거 복귀.
 * desktop column 모드에서는 일반 inline panel (a11y 처리 불필요).
 */
import React, { useEffect, useState } from 'react'

import { FiX } from 'react-icons/fi'

import * as PageStyles from '../../styles/list-page.styles'
import { ICON_SIZE } from '../../styles/theme'
import { useFocusTrap } from '../hooks/use-focus-trap'

const MOBILE_BREAKPOINT = 1200

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
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
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
      <PageStyles.DetailPanelHost
        ref={trapRef}
        $open={open}
        role={isMobile ? 'dialog' : undefined}
        aria-modal={isMobile && open ? true : undefined}
        aria-label={isMobile ? '사건 상세' : undefined}
      >
        <PageStyles.DetailDrawerHeader>
          <PageStyles.DetailDrawerHeaderTitle>
            {title ?? '사건 상세'}
          </PageStyles.DetailDrawerHeaderTitle>
          <PageStyles.DetailDrawerClose
            type="button"
            aria-label="상세 닫기"
            onClick={onClose}
          >
            <FiX size={ICON_SIZE.lg} aria-hidden="true" />
          </PageStyles.DetailDrawerClose>
        </PageStyles.DetailDrawerHeader>
        {children}
      </PageStyles.DetailPanelHost>
    </>
  )
}
