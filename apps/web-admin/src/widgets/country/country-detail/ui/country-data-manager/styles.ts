import styled from 'styled-components'

export const TabBar = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  margin-bottom: 16px;
`

export const TabButton = styled.button<{ $active?: boolean }>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  background: none;
  border: none;
  border-bottom: 2px solid
    ${({ $active, theme }) => ($active ? theme.colors.active : 'transparent')};
  cursor: pointer;
  transition: color 0.15s ease;
`

export const SubTabBar = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
`

export const Chip = styled.button<{ $active?: boolean }>`
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.active : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : theme.colors.background.primary};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
`

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  th,
  td {
    padding: 7px 8px;
    text-align: right;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
    white-space: nowrap;
  }

  /*
   * td에 색을 명시한다. 라이트 모드에서도 body의 상속색이 #f9fafb(거의 흰색)라
   * 색을 안 주면 흰 모달 위에 흰 글씨가 되어 값이 안 보인다 — 이 모달의 표
   * 전부(지표·교역·기록·연령별 인구)가 같은 증상이었다.
   */
  td {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  th:first-child,
  td:first-child {
    text-align: left;
  }
  th {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-weight: 600;
    position: sticky;
    top: 0;
    background: ${({ theme }) => theme.colors.background.primary};
  }
`

export const TableScroll = styled.div`
  max-height: 240px;
  overflow: auto;
  margin-bottom: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
`

export const RowActions = styled.div`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
`

export const IconBtn = styled.button<{ $danger?: boolean }>`
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  color: ${({ $danger, theme }) =>
    $danger ? theme.colors.error ?? '#dc2626' : theme.colors.text.secondary};
  &:hover {
    text-decoration: underline;
  }
`

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px 12px;
  margin-bottom: 14px;
`

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const Input = styled.input`
  padding: 7px 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  font-size: 13px;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.active};
  }
`

export const TextArea = styled.textarea`
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  font-size: 13px;
  min-height: 64px;
  resize: vertical;
  font-family: inherit;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const FormBar = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

export const PrimaryButton = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: ${({ theme }) => theme.colors.active};
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const GhostButton = styled.button`
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13px;
  cursor: pointer;
`

export const EmptyHint = styled.p`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
  padding: 18px 0;
`

/* ─── 교역 품목 편집 (2026-09) ───────────────────────────────────────────
 * 총액만 담던 교역에 "무엇을" 칸이 생겼다. 품목은 행이 여럿이라 FormGrid로는
 * 담기지 않아 전용 행 레이아웃을 둔다.
 */
export const ItemSectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0 8px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const ItemSectionHint = styled.span`
  font-weight: 500;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ItemRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
`

/** 방향 · 품목명 · 금액 · 비중 · HS · 상대국 · 삭제 */
export const ItemRow = styled.div`
  display: grid;
  grid-template-columns: 84px minmax(120px, 1.6fr) minmax(90px, 1fr) 74px 90px minmax(110px, 1fr) 32px;
  gap: 6px;
  align-items: center;

  @media (max-width: 760px) {
    grid-template-columns: 84px minmax(0, 1fr) 32px;
  }
`

export const ItemSelect = styled.select`
  padding: 7px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  font-size: 12.5px;
  font-family: inherit;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.active};
  }
`

export const ItemHeadRow = styled.div`
  display: grid;
  grid-template-columns: 84px minmax(120px, 1.6fr) minmax(90px, 1fr) 74px 90px minmax(110px, 1fr) 32px;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 0 2px;

  @media (max-width: 760px) {
    display: none;
  }
`
