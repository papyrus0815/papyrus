/**
 * 건국·멸망 카드의 한 줄 — 주체·사건·통치자·전신/후신이 모두 같은 줄 문법을 쓴다.
 *
 *   [그림] 이름  메타(종류·연도)            [끝 동작]
 *          둘째 줄(역할 메모·경고)
 *
 * 그림·이름·둘째 줄 전체가 한 누를 자리(미리보기 모달)이고, 끝 동작(메모·해제)은 그 밖에 따로 둔다 —
 * 링크 안에 버튼을 넣을 수 없어서이기도 하고, 미리보기와 편집이 한 번에 눌리지 않게 하려는 것이다.
 */
import type { MouseEvent, ReactNode } from 'react'

import { Link } from 'react-router-dom'
import styled from 'styled-components'

interface FoundingRowProps {
  /** 링크 주소 — ⌘/Ctrl 클릭 때 새 탭으로 열 상세. 없으면(자유 입력 주체) 버튼으로 */
  to?: string | null
  onOpen: (clickEvent: MouseEvent<HTMLElement>) => void
  /** 툴팁 — 누르면 무엇이 열리는지(이름은 줄 글자가 이미 읽힌다) */
  openLabel: string
  thumb?: ReactNode
  title: ReactNode
  meta?: ReactNode
  sub?: ReactNode
  trailing?: ReactNode
}

export function FoundingRow({ to, onOpen, openLabel, thumb, title, meta, sub, trailing }: FoundingRowProps) {
  const body = (
    <>
      {thumb}
      <RowText>
        <RowTitleLine>
          <RowTitle>{title}</RowTitle>
          {meta && <RowMeta>{meta}</RowMeta>}
        </RowTitleLine>
        {sub && <RowSub>{sub}</RowSub>}
      </RowText>
    </>
  )
  return (
    <Row>
      {to ? (
        <RowOpenLink to={to} onClick={onOpen} title={openLabel}>
          {body}
        </RowOpenLink>
      ) : (
        <RowOpenButton type="button" onClick={onOpen} title={openLabel}>
          {body}
        </RowOpenButton>
      )}
      {trailing && <RowTrailing>{trailing}</RowTrailing>}
    </Row>
  )
}

export const RowList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 0 0 -8px;
  padding: 0;
  list-style: none;
`

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  border-radius: 8px;
  transition: background 0.12s;

  &:hover,
  &:focus-within {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f4f5f7')};
  }
`

const openStyles = `
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  text-align: left;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
`

const RowOpenLink = styled(Link)`
  ${openStyles}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`

const RowOpenButton = styled.button`
  ${openStyles}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`

const RowText = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const RowTitleLine = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
  min-width: 0;
`

const RowTitle = styled.strong`
  font-weight: 600;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow-wrap: anywhere;
`

const RowMeta = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RowSub = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RowTrailing = styled.span`
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding-right: 4px;
`

/** 끝 동작 버튼 — 아이콘만(해제) 또는 짧은 글자(+ 메모) */
export const RowAction = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme, $danger }) => ($danger ? theme.colors.alert.danger.fg : theme.colors.text.primary)};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff')};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
  svg {
    width: 14px;
    height: 14px;
  }
`

/** 목록 끝 '추가' — 행과 같은 들여쓰기 */
export const RowAddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.active};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`
