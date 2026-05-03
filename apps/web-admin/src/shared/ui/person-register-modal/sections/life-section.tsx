/**
 * 인물 등록/수정 폼의 "생애" 탭.
 * - 출생일(미상 토글) → 사망 여부 3-way 라디오 → 사망일(사망 시) → 사망 상세(사망/미상)
 * - 군주 호칭(군주명·묘호·시호) collapse — 일반 인물에겐 무관해 기본 접힘
 * 부모(person-register-view)는 state·setters·errors와 setDeathStatus 헬퍼만 주입.
 */
import React from 'react'

import {
  FiAlertCircle,
  FiCalendar,
  FiChevronDown,
  FiChevronRight,
} from 'react-icons/fi'
import styled, { css } from 'styled-components'

import type { Era } from '@/shared/api/persons'
import { FormInput } from '@/shared/ui/form-input/form-input'
import {
  DateFieldBtn,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  Textarea,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

import {
  EXTRA_DEATH_TYPES,
  PRIMARY_DEATH_TYPES,
  formatDateDisplay,
} from '../person-register-view.helpers'

export interface LifeSectionProps {
  fid: (key: string) => string
  // 출생
  birthEra: Era
  birthYear: string
  birthMonth: string
  birthDay: string
  isBirthDateUnknown: boolean
  setIsBirthDateUnknown: React.Dispatch<React.SetStateAction<boolean>>
  setShowBirthDateModal: (v: boolean) => void
  // 사망
  deathEra: Era
  deathYear: string
  deathMonth: string
  deathDay: string
  isAlive: boolean
  isDeathDateUnknown: boolean
  setShowDeathDateModal: (v: boolean) => void
  setDeathStatus: (status: 'alive' | 'deceased' | 'unknown') => void
  // 사망 상세
  deathType: string
  deathCause: string
  deathNote: string
  deathTypeShowMore: boolean
  setDeathType: (v: string) => void
  setDeathCause: (v: string) => void
  setDeathNote: (v: string) => void
  setDeathTypeShowMore: (v: boolean) => void
  // 군주 호칭
  monarchTitlesOpen: boolean
  setMonarchTitlesOpen: React.Dispatch<React.SetStateAction<boolean>>
  regnalName: string
  templeName: string
  posthumousName: string
  setRegnalName: (v: string) => void
  setTempleName: (v: string) => void
  setPosthumousName: (v: string) => void
  // 파생값(부모에서 계산)
  /** "향년 N세" 라벨 — 둘 다 정상 입력 시에만 truthy */
  lifespanText: string | null
  // 검증·dirty
  errors: Record<string, string>
  markDirty: () => void
}

export function LifeSection({
  fid,
  birthEra,
  birthYear,
  birthMonth,
  birthDay,
  isBirthDateUnknown,
  setIsBirthDateUnknown,
  setShowBirthDateModal,
  deathEra,
  deathYear,
  deathMonth,
  deathDay,
  isAlive,
  isDeathDateUnknown,
  setShowDeathDateModal,
  setDeathStatus,
  deathType,
  deathCause,
  deathNote,
  deathTypeShowMore,
  setDeathType,
  setDeathCause,
  setDeathNote,
  setDeathTypeShowMore,
  monarchTitlesOpen,
  setMonarchTitlesOpen,
  regnalName,
  templeName,
  posthumousName,
  setRegnalName,
  setTempleName,
  setPosthumousName,
  lifespanText,
  errors,
  markDirty,
}: LifeSectionProps) {
  return (
    <FormRows>
      {/*
       * 생몰 — 출생 → 사망 여부(주 분기) → 사망일(사망 시) → 사망 상세(사망/일자미상) 순.
       * "생존중"이 핵심 분기점이라 별도 라디오 그룹으로 격상. 출생일 미상은 출생 영역에 인라인.
       */}
      <FieldRow>
        <FieldLabel>생몰</FieldLabel>
        <LifeStack>
          {/* 1) 출생 — 늘 표시. 미상 토글은 인라인. */}
          <LifeInlineRow>
            <LifeFieldGroup>
              <LifeSubLabel>출생일</LifeSubLabel>
              <DateFieldBtn
                type="button"
                $hasValue={!!birthYear.trim() && !isBirthDateUnknown}
                onClick={() =>
                  !isBirthDateUnknown && setShowBirthDateModal(true)
                }
                aria-invalid={!!errors.birth}
                disabled={isBirthDateUnknown}
                style={
                  isBirthDateUnknown
                    ? { opacity: 0.5, cursor: 'not-allowed' }
                    : undefined
                }
              >
                <FiCalendar size={16} />
                <span>
                  {isBirthDateUnknown
                    ? '미상'
                    : formatDateDisplay(
                        birthEra,
                        birthYear,
                        birthMonth,
                        birthDay,
                      )}
                </span>
                <FiChevronDown size={14} />
              </DateFieldBtn>
            </LifeFieldGroup>
            <SegmentBtn
              type="button"
              $variant="ghost"
              $active={isBirthDateUnknown}
              aria-pressed={isBirthDateUnknown}
              onClick={() => {
                setIsBirthDateUnknown((v) => !v)
                markDirty()
              }}
            >
              출생일 미상
            </SegmentBtn>
          </LifeInlineRow>

          {/* 2) 사망 여부 — 3-way 라디오. 가장 중요한 분기. */}
          <LifeFieldGroup>
            <LifeSubLabel>사망 여부</LifeSubLabel>
            <SegmentRow role="radiogroup" aria-label="사망 여부">
              <SegmentBtn
                type="button"
                role="radio"
                aria-checked={isAlive}
                $active={isAlive}
                onClick={() => setDeathStatus('alive')}
              >
                생존 중
              </SegmentBtn>
              <SegmentBtn
                type="button"
                role="radio"
                aria-checked={!isAlive && !isDeathDateUnknown}
                $active={!isAlive && !isDeathDateUnknown}
                onClick={() => setDeathStatus('deceased')}
              >
                사망
              </SegmentBtn>
              <SegmentBtn
                type="button"
                role="radio"
                aria-checked={!isAlive && isDeathDateUnknown}
                $active={!isAlive && isDeathDateUnknown}
                onClick={() => setDeathStatus('unknown')}
              >
                일자 미상
              </SegmentBtn>
            </SegmentRow>
          </LifeFieldGroup>

          {/* 3) 사망일 — 사망(정상)일 때만. 향년은 둘 다 정상 입력일 때만. */}
          {!isAlive && !isDeathDateUnknown && (
            <LifeInlineRow>
              <LifeFieldGroup>
                <LifeSubLabel>사망일</LifeSubLabel>
                <DateFieldBtn
                  type="button"
                  $hasValue={!!deathYear.trim()}
                  onClick={() => setShowDeathDateModal(true)}
                  aria-invalid={!!errors.death}
                >
                  <FiCalendar size={16} />
                  <span>
                    {formatDateDisplay(
                      deathEra,
                      deathYear,
                      deathMonth,
                      deathDay,
                    )}
                  </span>
                  <FiChevronDown size={14} />
                </DateFieldBtn>
              </LifeFieldGroup>
              {lifespanText && (
                <LifeFieldGroup>
                  <LifeSubLabel>향년</LifeSubLabel>
                  <LifespanText aria-live="polite">
                    {lifespanText.replace('향년 ', '')}
                  </LifespanText>
                </LifeFieldGroup>
              )}
            </LifeInlineRow>
          )}

          {(errors.birth || errors.death) && (
            <FieldError role="alert">
              <FiAlertCircle size={13} />
              {errors.birth || errors.death}
            </FieldError>
          )}

          {/* 4) 사망 상세 — 사망 또는 일자 미상일 때(=생존중 아닐 때). 사망유형 칩은 토글 button(aria-pressed). */}
          {!isAlive && (
            <LifeDeathDetails>
              <SegmentRow role="group" aria-label="사망 유형">
                {PRIMARY_DEATH_TYPES.map((opt) => (
                  <SegmentBtn
                    key={opt.value}
                    type="button"
                    aria-pressed={deathType === opt.value}
                    $active={deathType === opt.value}
                    onClick={() => {
                      setDeathType(deathType === opt.value ? '' : opt.value)
                      markDirty()
                    }}
                  >
                    {opt.label}
                  </SegmentBtn>
                ))}
                {deathTypeShowMore &&
                  EXTRA_DEATH_TYPES.map((opt) => (
                    <SegmentBtn
                      key={opt.value}
                      type="button"
                      aria-pressed={deathType === opt.value}
                      $active={deathType === opt.value}
                      onClick={() => {
                        setDeathType(deathType === opt.value ? '' : opt.value)
                        markDirty()
                      }}
                    >
                      {opt.label}
                    </SegmentBtn>
                  ))}
                {!deathTypeShowMore && (
                  <ChipMoreBtn
                    type="button"
                    onClick={() => setDeathTypeShowMore(true)}
                  >
                    더보기 +{EXTRA_DEATH_TYPES.length}
                  </ChipMoreBtn>
                )}
              </SegmentRow>
              <FormInput
                value={deathCause}
                onChange={(e) => setDeathCause(e.target.value)}
                placeholder="사망 원인 상세 (예: 폐렴 합병증)"
              />
              <Textarea
                value={deathNote}
                onChange={(e) => setDeathNote(e.target.value)}
                placeholder="사망 메모 (논란·맥락·비고)"
                rows={2}
              />
            </LifeDeathDetails>
          )}
        </LifeStack>
      </FieldRow>

      {/* 군주 호칭 — 군주가 아닌 인물에겐 무관. collapse로 숨김. */}
      <AdvancedSection>
        <AdvancedToggle
          type="button"
          $open={monarchTitlesOpen}
          onClick={() => setMonarchTitlesOpen((v) => !v)}
          aria-expanded={monarchTitlesOpen}
        >
          <FiChevronRight size={14} />
          군주 호칭 — 군주명·묘호·시호
        </AdvancedToggle>
        {monarchTitlesOpen && (
          <AdvancedBody>
            <FormRows>
              <FieldRowMulti>
                <FieldLabel htmlFor={fid('regnalName')}>
                  군주명 · 묘호 · 시호
                </FieldLabel>
                <FieldControl>
                  <InlineFields $cols={3}>
                    <FormInput
                      id={fid('regnalName')}
                      value={regnalName}
                      onChange={(e) => setRegnalName(e.target.value)}
                      placeholder="군주명/재위명 (예: 세종)"
                    />
                    <FormInput
                      id={fid('templeName')}
                      value={templeName}
                      onChange={(e) => setTempleName(e.target.value)}
                      placeholder="묘호 (예: 세종)"
                    />
                    <FormInput
                      id={fid('posthumousName')}
                      value={posthumousName}
                      onChange={(e) => setPosthumousName(e.target.value)}
                      placeholder="시호"
                    />
                  </InlineFields>
                </FieldControl>
              </FieldRowMulti>
            </FormRows>
          </AdvancedBody>
        )}
      </AdvancedSection>
    </FormRows>
  )
}

// ─── Styled (생애 섹션) — 메인 파일에서 그대로 옮김. 외부 노출 없음. ─────────

const LifeStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  min-width: 0;
`

const LifeInlineRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
`

const LifeFieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const LifeSubLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const LifeDeathDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 0 0;
  border-top: 1px dashed ${({ theme }) => theme.colors.border.light};
`

const LifespanText = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
`

const SegmentRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const SegmentBtn = styled.button<{
  $active?: boolean
  $error?: boolean
  $variant?: 'solid' | 'ghost'
}>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
  ${({ $variant = 'solid', $active, $error, theme }) => {
    if ($variant === 'ghost') {
      return `
        color: ${$active ? theme.colors.text.primary : theme.colors.text.tertiary};
        background: ${
          $active
            ? theme.mode === 'dark'
              ? 'rgba(255,255,255,0.08)'
              : '#f1f5f9'
            : 'transparent'
        };
        border: 1px solid ${$active ? theme.colors.border.medium : theme.colors.border.default};
        &:hover:not(:disabled) {
          color: ${theme.colors.text.primary};
          border-color: ${theme.colors.border.medium};
        }
      `
    }
    return `
      color: ${$active ? '#fff' : theme.colors.text.secondary};
      background: ${
        $active
          ? '#6366f1'
          : $error
            ? theme.colors.alert.danger.bg
            : theme.mode === 'dark'
              ? 'rgba(255,255,255,0.05)'
              : '#fff'
      };
      border: 1px solid ${$active ? '#6366f1' : $error ? '#dc2626' : theme.colors.border.default};
      &:hover:not(:disabled) {
        border-color: ${$active ? '#4f46e5' : '#a5b4fc'};
        color: ${$active ? '#fff' : theme.colors.text.primary};
      }
    `
  }}
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ChipMoreBtn = styled.button`
  padding: 8px 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s ease;
  &:hover {
    color: #4f46e5;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const AdvancedSection = styled.section`
  padding: 16px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const AdvancedToggle = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  margin-bottom: ${({ $open }) => ($open ? '12px' : '0')};
  font-size: 13px;
  font-weight: 600;
  color: #4f46e5;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s ease;
  &:hover {
    color: #4338ca;
  }
  &:focus-visible {
    outline: 2px solid rgba(79, 70, 229, 0.35);
    outline-offset: 2px;
    border-radius: 4px;
  }
  svg {
    transition: transform 0.2s ease;
    transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
  }
`

const AdvancedBody = styled.div`
  padding-left: 12px;
  border-left: 2px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.4)' : '#c7d2fe'};
`

const FieldRowMulti = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 220px) 1fr;
  gap: 24px;
  align-items: start;
  padding: 20px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const InlineFields = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: ${(p) => `repeat(${p.$cols ?? 3}, 1fr)`};
  gap: 12px;
  max-width: 600px;
  & > div {
    min-width: 0;
  }
  input,
  select,
  button {
    max-width: 100%;
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const FieldError = styled.span`
  ${() => css``}
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #dc2626;
  margin-top: 6px;
  line-height: 1.4;
  svg {
    flex-shrink: 0;
  }
`
