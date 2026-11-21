/**
 * 폼 안 드롭다운 목록의 공용 조판 — 검색 콤보박스(InlineSearchSelect: 국적·소속·가문·종교)와
 * 장소 칸(PlaceSelect: 출생지·사망지·주둔지)이 같은 목록 문법으로 선다.
 *
 * 예전엔 두 목록이 표면·활성 행·글자 크기를 각자 들고 있었다(활성 행이 하나는 회색, 하나는 파랑 면).
 *
 * 문법:
 *  - 묶음 머리(GroupLabel) — 작은 글자, 스크롤해도 위에 붙는다
 *  - 행 = [앞 칸 20px(국기·아이콘)] [이름 + 보조 줄] [오른쪽 메타] [선택 ✓]
 *  - 활성(키보드·hover) = 옅은 면, 선택 = 강조색 글자 + ✓ (면으로 둘을 섞지 않는다)
 *  - 발(Foot) — 잘린 수·키보드 안내 한 줄
 */
import styled from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

export const DropdownSurface = styled.div`
  position: absolute;
  z-index: ${Z_INDEX.DROPDOWN};
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 320px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(28,28,32,0.98)' : '#fff')};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  box-shadow:
    0 12px 32px ${({ theme }) => theme.colors.shadow.md},
    0 2px 6px ${({ theme }) => theme.colors.shadow.md};
`

/** 묶음 머리 — 스크롤 중에도 어느 묶음인지 보이게 위에 붙는다(면은 표면과 같은 색) */
export const DropdownGroupLabel = styled.div`
  position: sticky;
  top: -4px;
  z-index: 1;
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 0 -4px;
  padding: 8px 14px 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(28,28,32,0.98)' : '#fff')};

  & + * {
    margin-top: 0;
  }
  .hint {
    font-weight: 400;
    letter-spacing: 0;
  }
`

export const DropdownOption = styled.div<{ $active?: boolean; $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  min-height: 36px;
  padding: 6px 10px;
  font-size: 13.5px;
  text-align: left;
  color: ${({ $selected, theme }) => ($selected ? theme.colors.active : theme.colors.text.primary)};
  font-weight: ${({ $selected }) => ($selected ? 600 : 400)};
  background: ${({ $active, theme }) =>
    $active ? (theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9') : 'transparent'};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
`

/** 앞 칸 — 국기·아이콘. 비어 있어도 폭을 지켜 이름 열이 한 줄로 선다 */
export const OptionLeading = styled.span`
  flex: 0 0 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const OptionBody = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;

  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sub {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11.5px;
    font-weight: 400;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

export const OptionMeta = styled.span`
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 선택 표시 — 고른 항목만 ✓, 다른 행은 같은 폭을 비워 둔다 */
export const OptionCheck = styled.span<{ $visible: boolean }>`
  flex: 0 0 14px;
  display: inline-flex;
  color: ${({ theme }) => theme.colors.active};
  visibility: ${({ $visible }) => ($visible ? 'visible' : 'hidden')};
`

export const DropdownEmpty = styled.div`
  padding: 12px 10px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
`

export const DropdownFoot = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 2px 10px;
  margin-top: 4px;
  padding: 6px 10px 3px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};

  kbd {
    font-family: inherit;
    font-size: 11px;
    padding: 0 4px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 4px;
  }
`
