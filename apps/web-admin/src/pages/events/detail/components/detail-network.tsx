import { useState } from 'react'

import { FiPlus, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  ledgerHairlineStrong,
  resolveCategory,
} from '@/pages/events/ledger/styles/ledger-tokens'
import { type UpdateEventDto } from '@/shared/api/events'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import { pathKeys } from '@/shared/router'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'

interface DetailNetworkProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
}

/**
 * 사건의 횡적 네트워크 — 자식 사건 + 키워드.
 *
 * 자식은 시간 순으로 정렬된 카드 그리드. 각 카드 클릭 시 해당 사건 상세로.
 * 키워드는 inline chip — 칩의 ✕로 제거, "+" 인풋으로 추가. 별도 폼 X.
 */
export function DetailNetwork({ event, onPatch }: DetailNetworkProps) {
  const children = (event.childEvents ?? [])
    .slice()
    .sort((a, b) => {
      const aTime = a.startDate ? new Date(a.startDate).getTime() : 0
      const bTime = b.startDate ? new Date(b.startDate).getTime() : 0
      return aTime - bTime
    })
  const keywords = (event.keywords ?? []).filter(
    (k): k is string => typeof k === 'string' && k.trim().length > 0,
  )

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const submitKeyword = () => {
    const next = draft.trim()
    setDraft('')
    setAdding(false)
    if (!next) return
    if (keywords.includes(next)) return
    onPatch({ keywords: [...keywords, next] })
  }

  const removeKeyword = (k: string) => {
    onPatch({ keywords: keywords.filter((kw) => kw !== k) })
  }

  return (
    <S.Section id="network">
      <S.SectionHeader>
        <S.SectionTitle>연관</S.SectionTitle>
        {(children.length > 0 || keywords.length > 0) && (
          <S.SectionSubtitle>
            {children.length > 0 && `자식 ${children.length}`}
            {children.length > 0 && keywords.length > 0 && ' · '}
            {keywords.length > 0 && `키워드 ${keywords.length}`}
          </S.SectionSubtitle>
        )}
      </S.SectionHeader>

      {children.length > 0 && (
        <S.CardGrid $cols={2}>
          {children.map((child) => {
            const category = resolveCategory(child.category?.name)
            const dateLabel =
              child.startDate &&
              formatDateRange(
                child.startDate,
                child.endDate ?? undefined,
                child.startDatePrecision,
                child.endDatePrecision,
              )
            return (
              <ChildCard key={child.id} to={pathKeys.events.detail(child.id)}>
                <ChildBar style={{ background: category.color }} />
                <ChildBody>
                  <ChildTitle>{child.title}</ChildTitle>
                  {dateLabel && <ChildMeta>{dateLabel}</ChildMeta>}
                  {child.description && <ChildDesc>{child.description}</ChildDesc>}
                </ChildBody>
              </ChildCard>
            )
          })}
        </S.CardGrid>
      )}

      <KeywordsBlock>
        <KeywordsLabel>키워드</KeywordsLabel>
        <KeywordsRow>
          {keywords.map((keyword) => (
            <KeywordChip key={keyword}>
              <span>{keyword}</span>
              <ChipX
                type="button"
                onClick={() => removeKeyword(keyword)}
                aria-label={`${keyword} 제거`}
              >
                <FiX />
              </ChipX>
            </KeywordChip>
          ))}
          {adding ? (
            <KeywordInput
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={submitKeyword}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submitKeyword()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setDraft('')
                  setAdding(false)
                }
              }}
              placeholder="키워드 입력 후 Enter"
            />
          ) : (
            <AddBtn type="button" onClick={() => setAdding(true)}>
              <FiPlus /> 추가
            </AddBtn>
          )}
        </KeywordsRow>
      </KeywordsBlock>
    </S.Section>
  )
}

const ChildCard = styled(Link)`
  display: flex;
  gap: 12px;
  padding: 4px 0 12px;
  background: transparent;
  border: none;
  text-decoration: none;
  color: inherit;
  transition: color 0.16s;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const ChildBar = styled.span`
  width: 3px;
  border-radius: 2px;
  flex-shrink: 0;
`

const ChildBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const ChildTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.4;
`

const ChildMeta = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const ChildDesc = styled.span`
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const KeywordsBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const KeywordsLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const KeywordsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`

const KeywordChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  border: none;

  &::before {
    content: '#';
    color: ${({ theme }) => theme.colors.text.tertiary};
    margin-right: 1px;
  }
`

const ChipX = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 11px;
    height: 11px;
  }
`

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s, color 0.14s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

const KeywordInput = styled.input`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  min-width: 140px;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`
