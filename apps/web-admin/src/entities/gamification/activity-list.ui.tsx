import React from 'react'

import styled from 'styled-components'

import type { ActivityEntry } from './gamification.api'

const REASON_LABEL: Record<string, string> = {
  CREATE_CONTENT: '등록',
  COMPLETENESS_BONUS: '완성도 보너스',
  CONTENT_DELETED: '삭제 회수',
  ADMIN_ADJUST: '운영 조정',
}

const OWNER_LABEL: Record<string, string> = {
  PERSON: '인물',
  COUNTRY: '국가',
  HISTORICAL_COUNTRY: '역사적 국가',
  EVENT: '사건',
  ADMINISTRATIVE_DIVISION: '행정구역',
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return '방금'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}

/** 활동 내역 목록 — 점수 변동 이력(등록/보너스/회수). */
export const ActivityList: React.FC<{ items: ActivityEntry[] }> = ({ items }) => {
  if (items.length === 0) {
    return <Empty>아직 활동 내역이 없어요. 콘텐츠를 등록해보세요!</Empty>
  }
  return (
    <List>
      {items.map((it) => {
        const owner = OWNER_LABEL[it.ownerType] ?? it.ownerType
        const reason = REASON_LABEL[it.reason] ?? it.reason
        const positive = it.amount >= 0
        return (
          <Item key={it.id}>
            <Body>
              <Title>
                {owner} {reason}
              </Title>
              <Time>{fmtTime(it.createdAt)}</Time>
            </Body>
            <Amount $positive={positive}>
              {positive ? '+' : ''}
              {it.amount}P
            </Amount>
          </Item>
        )
      })}
    </List>
  )
}

const List = styled.div`
  display: flex;
  flex-direction: column;
`

const Item = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 2px;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border ?? 'rgba(0,0,0,0.05)'};
  }
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const Title = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Time = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Amount = styled.div<{ $positive: boolean }>`
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
  color: ${({ $positive }) => ($positive ? '#16A34A' : '#DC2626')};
`

const Empty = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 6px 0;
`
