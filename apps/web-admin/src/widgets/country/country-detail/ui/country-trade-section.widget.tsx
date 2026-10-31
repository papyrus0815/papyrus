import { motion } from 'framer-motion'
import styled from 'styled-components'

import { SectionTabHeader } from '@/shared/ui/section-page-layout'

import { TradePanel } from './country-data-manager/trade-panel'
import * as S from './country-detail-dashboard.styles'
import { IconArchive } from './country-detail-dashboard.icons'
import { TradeSection } from './dashboard-panels/trade-section'

export interface CountryTradeSectionProps {
  countryId?: string
  historicalCountryId?: string
  countryName: string
}

/**
 * 국가 상세 「교역」 전용 탭 (현대 국가 · 역사 국가 공용).
 *
 * - 상단: 연도별 수출·수입 막대, 무역수지, 분류 구성 트리맵, 품목·상대국 칩 시각화(`TradeSection`)
 * - 하단: 연도별 교역 원장 조회 및 수출·수입 흐름/연관 사건·조약·기업 편집(`TradePanel`)
 */
export function CountryTradeSection({
  countryId,
  historicalCountryId,
  countryName,
}: CountryTradeSectionProps) {
  return (
    <Root
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <SectionTabHeader
        variant="plain"
        title="교역"
        description="연도별 수출·수입 규모와 무역수지, 주요 교역 품목·상대국 구성 및 원장 데이터를 관리합니다."
      />

      <TradeSection
        countryId={countryId}
        historicalCountryId={historicalCountryId}
        countryName={countryName}
        embeddedInTab
      />

      <S.Section $wide>
        <S.SectionTitleRow>
          <S.SectionTitleIcon>
            <IconArchive />
          </S.SectionTitleIcon>
          <S.SectionTitleText>교역 원장 · 데이터 관리</S.SectionTitleText>
        </S.SectionTitleRow>
        <LedgerCard>
          <TradePanel
            countryId={countryId}
            historicalCountryId={historicalCountryId}
          />
        </LedgerCard>
      </S.Section>
    </Root>
  )
}

const Root = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 36px 32px 48px;
  min-height: calc(100vh - 200px);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 24px 20px 36px;
    gap: 24px;
  }
`

const LedgerCard = styled.div`
  padding: 20px 22px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
`
