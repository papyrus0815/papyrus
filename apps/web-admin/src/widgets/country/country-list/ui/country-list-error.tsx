/**
 * 국가 목록 로딩 실패 상태 (G1-1·G1-2).
 *
 * - CountryListError: 목록 전체를 못 불러온 총체 실패 — '등록된 국가가 없어요' 빈 상태로
 *   위장되지 않도록 별도 컴포넌트로 분리하고 '다시 시도' 경로를 제공(등록 CTA는 제외).
 * - HistoricalPartialErrorBanner: 현대 목록은 정상인데 역사 목록만 실패한 부분 결손 —
 *   목록 상단 인라인 배너로 '일부만 표시 중'을 고지하고 재시도를 노출.
 */
import React from 'react'

import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi'
import styled from 'styled-components'

import * as S from './country-list.styles'

interface CountryListErrorProps {
  onRetry: () => void
}

export function CountryListError({ onRetry }: CountryListErrorProps) {
  return (
    <S.EmptyFilterState role="alert">
      <S.EmptyFilterIcon>
        <FiAlertTriangle size={26} />
      </S.EmptyFilterIcon>
      <S.EmptyFilterTitle>목록을 불러오지 못했어요</S.EmptyFilterTitle>
      <S.EmptyFilterText>
        네트워크 또는 서버 문제로 국가 목록을 가져오지 못했어요.
        <br />
        잠시 후 다시 시도해주세요.
      </S.EmptyFilterText>
      <S.EmptyFilterActions>
        <S.AddButton type="button" onClick={onRetry}>
          <S.AddButtonIcon>
            <FiRefreshCw size={15} />
          </S.AddButtonIcon>
          다시 시도
        </S.AddButton>
      </S.EmptyFilterActions>
    </S.EmptyFilterState>
  )
}

const Banner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 10px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.alert.warning.fg};
  border: 1px solid ${({ theme }) => theme.colors.alert.warning.border};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(251, 191, 36, 0.08)'};
`

const BannerIcon = styled.span`
  display: inline-flex;
  flex-shrink: 0;
`

const BannerText = styled.span`
  flex: 1;
  min-width: 0;
`

const BannerRetry = styled.button`
  flex-shrink: 0;
  border: none;
  background: transparent;
  padding: 2px 4px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.alert.warning.fg};
  text-decoration: underline;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
`

interface HistoricalPartialErrorBannerProps {
  onRetry: () => void
}

export function HistoricalPartialErrorBanner({
  onRetry,
}: HistoricalPartialErrorBannerProps) {
  return (
    <Banner role="status">
      <BannerIcon aria-hidden>
        <FiAlertTriangle size={14} />
      </BannerIcon>
      <BannerText>과거 국가 목록을 불러오지 못해 일부만 표시 중이에요.</BannerText>
      <BannerRetry type="button" onClick={onRetry}>
        다시 시도
      </BannerRetry>
    </Banner>
  )
}
