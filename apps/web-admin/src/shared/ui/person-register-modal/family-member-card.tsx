/**
 * 인물 등록/수정 폼의 가족(부/모/배우자) 선택 결과 카드.
 * 선택 후 단순 텍스트 라벨이 아니라 썸네일·국가·생몰을 함께 보여줘서
 * 동명이인 식별을 쉽게 하고, "지금 누구를 묶어둔 건지" 한눈에 들어오게 함.
 */
import React from 'react'

import { FiUser, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import type { PersonResponseDto } from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

interface FamilyMemberCardProps {
  person: PersonResponseDto | undefined
  onChange: () => void
  onClear: () => void
  /** 비어 있을 때 노출되는 "선택" CTA 라벨 */
  placeholder: string
  /** disabled (예: 배우자 슬롯에서 인물 미선택 시 설명 textarea가 disabled되는 패턴과 별개) */
  disabled?: boolean
}

export function FamilyMemberCard({
  person,
  onChange,
  onClear,
  placeholder,
  disabled,
}: FamilyMemberCardProps) {
  if (!person) {
    return (
      <EmptyCard
        type="button"
        onClick={() => !disabled && onChange()}
        disabled={disabled}
      >
        <EmptyAvatar>
          <FiUser size={18} />
        </EmptyAvatar>
        <span>{placeholder}</span>
      </EmptyCard>
    )
  }

  const fullName = getPersonDisplayName(person)
  const lifespan =
    person.birthYear != null || person.deathYear != null
      ? `${person.birthYear ?? '?'} ~ ${person.deathYear ?? '현재'}`
      : null
  const country = (person as { country?: { name?: string } }).country?.name

  return (
    <Card>
      <Avatar>
        {person.profileImageUrl ? (
          <img
            src={getUploadImageUrl(person.profileImageUrl)}
            alt={fullName}
          />
        ) : (
          <FiUser size={20} />
        )}
      </Avatar>
      <Body>
        <Name>{fullName}</Name>
        <MetaRow>
          {country && <Meta>{country}</Meta>}
          {lifespan && <Meta>{lifespan}</Meta>}
          {!country && !lifespan && <Meta $muted>추가 정보 없음</Meta>}
        </MetaRow>
      </Body>
      <Actions>
        <ChangeBtn type="button" onClick={onChange} disabled={disabled}>
          변경
        </ChangeBtn>
        <RemoveBtn
          type="button"
          onClick={onClear}
          aria-label="선택 해제"
          disabled={disabled}
        >
          <FiX size={14} />
        </RemoveBtn>
      </Actions>
    </Card>
  )
}

const Card = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  max-width: 440px;
`

const EmptyCard = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  font-size: 14px;
  text-align: left;
  width: 100%;
  max-width: 440px;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
  &:hover:not(:disabled) {
    border-color: #6366f1;
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.08)' : '#eef2ff'};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.08)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const EmptyAvatar = styled(Avatar)`
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.04)'
      : 'rgba(226, 232, 240, 0.4)'};
`

const Body = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const Name = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.3;
  letter-spacing: -0.01em;
`

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const Meta = styled.span<{ $muted?: boolean }>`
  font-size: 12px;
  color: ${({ $muted, theme }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.secondary};
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const ChangeBtn = styled.button`
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : '#eef2ff'};
    color: #4f46e5;
    border-color: #c7d2fe;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const RemoveBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.12)' : '#fef2f2'};
    color: #dc2626;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`
