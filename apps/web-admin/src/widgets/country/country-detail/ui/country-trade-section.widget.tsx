import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { motion } from 'framer-motion'
import { FiEdit2, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { BentoActionBtn } from '@/entities/event/ui/bento-primitives'
import {
  ModalBody,
  ModalBoxWide,
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import { SectionTabHeader } from '@/shared/ui/section-page-layout'

import { CountryDataManagerModal } from './country-data-manager/country-data-manager-modal'
import { TradePanel } from './country-data-manager/trade-panel'
import { countryTabCanvasPadding } from './country-ledger-primitives'
import { TradeSection } from './dashboard-panels/trade-section'

export interface CountryTradeSectionProps {
  countryId?: string
  historicalCountryId?: string
  countryName: string
}

/**
 * 국가 상세 「교역」 전용 탭 (현대 국가 · 역사 국가 공용).
 *
 * - 읽기 화면: 연도별 수출·수입 막대, 무역수지, 상대국 Top 5 양방향 비교(Butterfly), 품목 구성 트리맵(`TradeSection`)
 * - 편집 분리: 상단 `[교역 데이터 편집]` 버튼으로 데이터 관리 모달을 호출한다.
 */
export function CountryTradeSection({
  countryId,
  historicalCountryId,
  countryName,
}: CountryTradeSectionProps) {
  const [editorOpen, setEditorOpen] = useState(false)

  useEffect(() => {
    if (!editorOpen || countryId) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditorOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editorOpen, countryId])

  return (
    <Root
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <SectionTabHeader
        variant="plain"
        title="교역"
        description="연도별 수출·수입 규모와 무역수지, 주요 교역 상대국 Top 5 비교 및 품목 구성을 탐색합니다."
        rightSlot={
          <BentoActionBtn
            type="button"
            $accent
            onClick={() => setEditorOpen(true)}
          >
            <FiEdit2 size={13} />
            교역 데이터 편집
          </BentoActionBtn>
        }
      />

      <TradeSection
        countryId={countryId}
        historicalCountryId={historicalCountryId}
        countryName={countryName}
        embeddedInTab
        onOpenEditor={() => setEditorOpen(true)}
      />

      {countryId ? (
        <CountryDataManagerModal
          countryId={countryId}
          countryName={countryName}
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          initialTab="trade"
        />
      ) : editorOpen && historicalCountryId ? (
        createPortal(
          <ModalOverlay
            role="dialog"
            aria-modal="true"
            aria-label={`${countryName} 교역 데이터 편집`}
            onClick={() => setEditorOpen(false)}
          >
            <HistoricalModalBox onClick={(event) => event.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>{countryName} · 교역 원장 데이터 편집</ModalTitle>
                <ModalCloseButton
                  type="button"
                  aria-label="닫기"
                  onClick={() => setEditorOpen(false)}
                >
                  <FiX size={18} />
                </ModalCloseButton>
              </ModalHeader>
              <ModalBody>
                <TradePanel historicalCountryId={historicalCountryId} />
              </ModalBody>
            </HistoricalModalBox>
          </ModalOverlay>,
          document.body,
        )
      ) : null}
    </Root>
  )
}

const Root = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 20px;
  ${countryTabCanvasPadding}
  min-height: calc(100vh - 200px);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
`

const HistoricalModalBox = styled(ModalBoxWide)`
  max-width: min(1040px, 95vw);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
`
