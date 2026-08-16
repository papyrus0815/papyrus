import { css, type DefaultTheme } from 'styled-components'

/**
 * 재임·재위 행 내부 소섹션(업적·승계·행정부)의 이음새 — 점선.
 *
 * **규약**: 이 seam은 항상 행 구분선(UnifiedCard `& + &`, 0.12/0.09)보다 약해야 한다.
 * 행 구분선이 리스트의 유일한 랜드마크이므로, 내부 이음새가 그보다 진해지면
 * 한 행이 두 행으로 오독된다. 행 구분선 대비를 올릴 때 여기도 함께 재계산할 것.
 *
 * person-detail-panel.styles.ts(3,500줄)가 아니라 이 경량 모듈에 두는 이유:
 * succession-box·cabinet-connections가 6줄짜리 믹스인 하나 때문에 styles 전체를
 * import하면 RichTextReadView→react-router-dom→client.ts(import.meta) 체인이 딸려와
 * 각 스펙이 모듈 모킹 없이는 실행조차 못 한다.
 */
export const subSectionSeam = (theme: DefaultTheme) => css`
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed
    ${theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.09)'};
`
