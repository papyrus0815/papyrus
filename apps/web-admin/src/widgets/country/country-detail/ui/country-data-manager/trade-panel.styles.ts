import styled from 'styled-components'

/**
 * 교역 패널 전용 조판.
 *
 * 흐름 한 줄에 담기는 칸이 20개가 넘는다. 전부 펼치면 표가 아니라 벽이 되므로
 * **기본 6칸 + 접이식 상세**로 나눈다 — 자주 쓰는 칸만 늘 보이고, 나머지는 필요할 때만.
 */

export const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`

export const ToolbarSpacer = styled.div`
  flex: 1 1 auto;
`

export const SectionCard = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
  background: ${({ theme }) => theme.colors.background.secondary};
`

export const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const SectionHint = styled.span`
  font-weight: 500;
  font-size: 11px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 흐름 한 줄 — 카드로 세워야 접이식 상세가 들어갈 자리가 생긴다 */
export const FlowCard = styled.div<{ $direction: 'EXPORT' | 'IMPORT' }>`
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-left: 3px solid
    ${({ theme, $direction }) =>
      $direction === 'EXPORT' ? theme.colors.success : theme.colors.accent};
  border-radius: 8px;
  padding: 8px 10px;
  background: ${({ theme }) => theme.colors.background.primary};
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const FlowMainRow = styled.div`
  display: grid;
  grid-template-columns:
    76px minmax(140px, 1.8fr) minmax(110px, 1.2fr)
    minmax(88px, 1fr) 66px 30px 30px;
  gap: 6px;
  align-items: center;

  @media (max-width: 860px) {
    grid-template-columns: 76px minmax(0, 1fr) 30px 30px;
  }
`

export const FlowHeadRow = styled.div`
  display: grid;
  grid-template-columns:
    76px minmax(140px, 1.8fr) minmax(110px, 1.2fr)
    minmax(88px, 1fr) 66px 30px 30px;
  gap: 6px;
  padding: 0 12px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @media (max-width: 860px) {
    display: none;
  }
`

export const FlowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
`

/** 접이식 상세 — 수량·제도·경로·연결·자료를 소제목으로 갈라 놓는다 */
export const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px 10px;
  padding-top: 8px;
  border-top: 1px dashed ${({ theme }) => theme.colors.border.default};
`

export const DetailGroupLabel = styled.div`
  grid-column: 1 / -1;
  margin-top: 2px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const InlineCheck = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

export const DisclosureButton = styled.button<{ $open?: boolean }>`
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme, $open }) =>
    $open ? theme.colors.background.secondary : 'transparent'};
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 6px;
  width: 30px;
  height: 30px;
  font-size: 12px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
  }
`

/** 합계 점검 줄 — 비중 합이 100을 넘으면 자료를 잘못 읽은 것이다 */
export const CheckBar = styled.div<{ $warn?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 8px 10px;
  margin-bottom: 10px;
  border-radius: 8px;
  font-size: 11.5px;
  line-height: 1.6;
  border: 1px solid
    ${({ theme, $warn }) =>
      $warn ? theme.colors.alert.warning.border : theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const CheckWarn = styled.span`
  color: ${({ theme }) => theme.colors.alert.warning.fg};
  font-weight: 600;
`

export const YearBadge = styled.span<{ $estimate?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
  opacity: ${({ $estimate }) => ($estimate ? 0.75 : 1)};
`

export const MutedTag = styled.span`
  display: inline-block;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
`
