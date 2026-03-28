import styled, { css } from 'styled-components'
import type { DefaultTheme } from 'styled-components'

import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'

/** styled 내부에서 테마당 팔레트 1회만 조회 */
function sectionPalette(theme: DefaultTheme) {
  return getCabinetsSectionPalette(theme.mode === 'dark')
}

export const FillRoot = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
`

export const SimpleBox = styled.div<{ $border: 'dashed' | 'solid' | 'none' }>`
  padding: 56px;
  text-align: center;
  font-size: 14px;
  border-radius: 16px;
  ${({ theme, $border }) => {
    const palette = sectionPalette(theme)
    const borderValue =
      $border === 'none'
        ? 'none'
        : $border === 'dashed'
          ? `1px dashed ${palette.borderMid}`
          : `1px solid ${palette.border}`
    return css`
      color: ${palette.textMuted};
      background: ${theme.mode === 'dark' ? 'transparent' : palette.bgSubtle};
      border: ${borderValue};
    `
  }}
`

export const FeatureCardWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 520px;
`

export const FeatureCardInner = styled.div<{
  $cardBorder: boolean
  $flat: boolean
}>`
  ${({ theme, $cardBorder, $flat }) => {
    const palette = sectionPalette(theme)
    const boxShadow = $flat
      ? 'none'
      : theme.mode === 'dark'
        ? '0 2px 8px rgba(0,0,0,0.3)'
        : '0 2px 8px rgba(0,0,0,0.04)'
    return css`
      padding: 48px 32px;
      border-radius: 20px;
      text-align: center;
      background: ${theme.mode === 'dark' && $flat
        ? 'transparent'
        : palette.cardBg};
      border: ${$cardBorder ? `1px solid ${palette.border}` : 'none'};
      box-shadow: ${boxShadow};
    `
  }}
`

export const FeatureCardIconWrap = styled.div<{ $flat?: boolean }>`
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  ${({ theme, $flat }) => {
    const palette = sectionPalette(theme)
    if (theme.mode === 'dark' && $flat) {
      return css`
        background: transparent;
        border: 1px solid ${palette.borderMid};
        color: ${palette.accent};
        box-shadow: none;
      `
    }
    return css`
      background: linear-gradient(
        145deg,
        rgba(99, 102, 241, 0.12) 0%,
        rgba(99, 102, 241, 0.06) 100%
      );
      color: ${palette.accent};
    `
  }}
`

export const FeatureCardTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: ${({ theme }) => sectionPalette(theme).text};
`

export const FeatureCardDesc = styled.p`
  margin: 0 0 24px;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => sectionPalette(theme).textMuted};
  max-width: 420px;
  margin-left: auto;
  margin-right: auto;
`

export const PrimaryButton = styled.button<{ $flat?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: 12px;
  color: #fff;
  ${({ theme, $flat }) => {
    const palette = sectionPalette(theme)
    return css`
      background: ${palette.accent};
      box-shadow: ${$flat ? 'none' : '0 4px 14px rgba(99, 102, 241, 0.35)'};
    `
  }}
`

export const SpotlightRoot = styled.div<{ $fill: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 40px 20px 48px;
  text-align: center;
  box-sizing: border-box;
  ${({ $fill }) =>
    $fill
      ? css`
          flex: 1;
          min-height: 0;
        `
      : css`
          width: 100%;
        `}
`

export const SpotlightIconWrap = styled.div<{ $flat: boolean }>`
  width: 72px;
  height: 72px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  ${({ theme, $flat }) => {
    const palette = sectionPalette(theme)
    if (theme.mode === 'dark' && $flat) {
      return css`
        background: transparent;
        color: ${palette.accent};
        box-shadow: none;
        border: 1px solid ${palette.borderMid};
      `
    }
    const background =
      theme.mode === 'dark'
        ? 'linear-gradient(145deg, rgba(99,102,241,0.22), rgba(99,102,241,0.08))'
        : 'linear-gradient(145deg, #eef2ff, #f5f3ff)'
    const color = theme.mode === 'dark' ? '#a5b4fc' : palette.accent
    const boxShadow = $flat
      ? 'none'
      : theme.mode === 'dark'
        ? 'inset 0 1px 0 rgba(255,255,255,0.06)'
        : '0 8px 24px rgba(99, 102, 241, 0.12)'
    return css`
      background: ${background};
      color: ${color};
      box-shadow: ${boxShadow};
    `
  }}
`

export const SpotlightTextBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
`

export const SpotlightTitle = styled.span`
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: ${({ theme }) => sectionPalette(theme).text};
`

export const SpotlightDesc = styled.span`
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => sectionPalette(theme).textMuted};
`

export const SpotlightActionsRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 4px;
`

export const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 12px;
  box-shadow: none;
  ${({ theme }) => {
    const palette = sectionPalette(theme)
    return css`
      background: ${palette.accentSecondaryBg};
      color: ${palette.accent};
      border: 1px solid ${palette.accentSecondaryBorder};
    `
  }}
`
