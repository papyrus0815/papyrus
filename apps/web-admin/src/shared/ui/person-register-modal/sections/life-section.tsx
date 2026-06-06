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
import styled from 'styled-components'

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
  AdvancedBody,
  AdvancedSection,
  AdvancedToggle,
  AdvancedToggleBody,
  AdvancedToggleDesc,
  AdvancedToggleIcon,
  AdvancedToggleTitle,
  FONT,
  FieldError,
  InlineFields,
  RADIUS,
} from '../_form-primitives'
import {
  DEATH_TYPE_GROUPS,
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
  setDeathType: (v: string) => void
  setDeathCause: (v: string) => void
  setDeathNote: (v: string) => void
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
  /**
   * 렌더 범위 — 필수-먼저 레이아웃용.
   * - essentials: 생몰 날짜 + 사망 여부(코어, 늘 노출)
   * - details: 사망 상세(유형·원인·메모) + 군주 호칭(접힘 영역)
   * - all(기본): 둘 다
   */
  mode?: 'all' | 'essentials' | 'details'
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
  setDeathType,
  setDeathCause,
  setDeathNote,
  monarchTitlesOpen,
  setMonarchTitlesOpen,
  regnalName,
  templeName,
  posthumousName,
  setRegnalName,
  setTempleName,
  setPosthumousName,
  lifespanText,
  mode = 'all',
  errors,
  markDirty,
}: LifeSectionProps) {
  const showEssentials = mode !== 'details'
  const showDetails = mode !== 'essentials'
  return (
    <FormRows>
      {/*
       * 생몰 — 출생 → 사망 여부(주 분기) → 사망일(사망 시) 순. (essentials)
       * "생존중"이 핵심 분기점이라 별도 라디오 그룹으로 격상. 출생일 미상은 출생 영역에 인라인.
       */}
      {showEssentials && (
      <FieldRow>
        <FieldLabel>생몰</FieldLabel>
        <LifeStack>
          {/*
           * 출생일 · 사망일을 가로 2열로 (앱 공통 date-pair 하우스 스타일).
           * 출생 열: 날짜 + "출생일 미상" 토글.
           * 사망 열: 날짜(생존/미상 상태 반영) + 생존/사망/일자미상 3-way + 향년.
           * <768px에선 LifePairGrid가 1열로 떨어져 자연히 세로 스택.
           */}
          <LifePairGrid>
            {/* ── 출생 열 ── */}
            <LifeCol>
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
            </LifeCol>

            {/* ── 사망 열 ── */}
            <LifeCol>
              <LifeFieldGroup>
                <LifeSubLabel>사망일</LifeSubLabel>
                <DateFieldBtn
                  type="button"
                  $hasValue={
                    !isAlive && !isDeathDateUnknown && !!deathYear.trim()
                  }
                  onClick={() =>
                    !isAlive &&
                    !isDeathDateUnknown &&
                    setShowDeathDateModal(true)
                  }
                  aria-invalid={!!errors.death}
                  disabled={isAlive || isDeathDateUnknown}
                  style={
                    isAlive || isDeathDateUnknown
                      ? { opacity: 0.5, cursor: 'not-allowed' }
                      : undefined
                  }
                >
                  <FiCalendar size={16} />
                  <span>
                    {isAlive
                      ? '생존 중'
                      : isDeathDateUnknown
                        ? '일자 미상'
                        : formatDateDisplay(
                            deathEra,
                            deathYear,
                            deathMonth,
                            deathDay,
                          )}
                  </span>
                  <FiChevronDown size={14} />
                </DateFieldBtn>
              </LifeFieldGroup>
              {/*
               * 사망 여부 분기 — 사망일 열에 합쳐 두 날짜를 가로로 나란히 둔다.
               * 진짜 segmented control(인접 버튼 한 덩어리)로 "한 그룹의 분기"임을 강조.
               */}
              <Segmented3Way role="radiogroup" aria-label="사망 여부">
                <Segmented3WayBtn
                  type="button"
                  role="radio"
                  aria-checked={isAlive}
                  $active={isAlive}
                  onClick={() => setDeathStatus('alive')}
                >
                  생존 중
                </Segmented3WayBtn>
                <Segmented3WayBtn
                  type="button"
                  role="radio"
                  aria-checked={!isAlive && !isDeathDateUnknown}
                  $active={!isAlive && !isDeathDateUnknown}
                  onClick={() => {
                    setDeathStatus('deceased')
                    // 공용 date-range "시작 후 종료 자동 오픈"과 동일 — 사망일 미입력 시 피커 즉시 노출.
                    if (!deathYear.trim()) setShowDeathDateModal(true)
                  }}
                >
                  사망
                </Segmented3WayBtn>
                <Segmented3WayBtn
                  type="button"
                  role="radio"
                  aria-checked={!isAlive && isDeathDateUnknown}
                  $active={!isAlive && isDeathDateUnknown}
                  onClick={() => setDeathStatus('unknown')}
                >
                  일자 미상
                </Segmented3WayBtn>
              </Segmented3Way>
              {lifespanText && (
                <LifespanText aria-live="polite">{lifespanText}</LifespanText>
              )}
            </LifeCol>
          </LifePairGrid>

          {(errors.birth || errors.death) && (
            <FieldError role="alert">
              <FiAlertCircle size={13} />
              {errors.birth || errors.death}
            </FieldError>
          )}
        </LifeStack>
      </FieldRow>
      )}

      {/*
       * 사망 상세 — 사망/일자미상일 때만(=생존중 아닐 때). details 영역.
       * 13개 평면 chip → 4그룹 mini-header. 그룹 내 chip은 active=indigo fill.
       * 카테고리화로 사용자가 "사고/외부" 같은 의미를 한눈에 찾도록.
       */}
      {showDetails && !isAlive && (
        <FieldRow>
          <FieldLabel>사망 상세</FieldLabel>
          <FieldControl>
            <LifeDeathDetails>
              <DeathTypeGrouped role="group" aria-label="사망 유형">
                {DEATH_TYPE_GROUPS.map((group) => (
                  <DeathTypeGroupBox key={group.key}>
                    <DeathTypeGroupLabel>{group.label}</DeathTypeGroupLabel>
                    <DeathTypeChips>
                      {group.options.map((opt) => (
                        <DeathTypeChip
                          key={opt.value}
                          type="button"
                          aria-pressed={deathType === opt.value}
                          $active={deathType === opt.value}
                          onClick={() => {
                            setDeathType(
                              deathType === opt.value ? '' : opt.value,
                            )
                            markDirty()
                          }}
                        >
                          {opt.label}
                        </DeathTypeChip>
                      ))}
                    </DeathTypeChips>
                  </DeathTypeGroupBox>
                ))}
              </DeathTypeGrouped>
              <FormInput
                value={deathCause}
                onChange={(e) => {
                  setDeathCause(e.target.value)
                  markDirty()
                }}
                placeholder="사망 원인 상세"
              />
              <Textarea
                value={deathNote}
                onChange={(e) => {
                  setDeathNote(e.target.value)
                  markDirty()
                }}
                placeholder="사망 메모 (논란·맥락·비고)"
                rows={2}
              />
            </LifeDeathDetails>
          </FieldControl>
        </FieldRow>
      )}

      {/* 군주 호칭 — 군주에게만 적용. 카드형 disclosure로 옵셔널 표시. (details) */}
      {showDetails && (
      <AdvancedSection>
        <AdvancedToggle
          type="button"
          $open={monarchTitlesOpen}
          onClick={() => setMonarchTitlesOpen((v) => !v)}
          aria-expanded={monarchTitlesOpen}
        >
          <AdvancedToggleIcon $open={monarchTitlesOpen}>
            <FiChevronRight size={14} />
          </AdvancedToggleIcon>
          <AdvancedToggleBody>
            <AdvancedToggleTitle>군주 호칭</AdvancedToggleTitle>
            <AdvancedToggleDesc>
              군주명·묘호·시호 (군주에 한해, 선택)
            </AdvancedToggleDesc>
          </AdvancedToggleBody>
        </AdvancedToggle>
        {monarchTitlesOpen && (
          <AdvancedBody>
            <FieldLabel htmlFor={fid('regnalName')}>
              군주명 · 묘호 · 시호
            </FieldLabel>
            <FieldControl>
              <InlineFields $cols={3}>
                <FormInput
                  id={fid('regnalName')}
                  value={regnalName}
                  onChange={(e) => {
                    setRegnalName(e.target.value)
                    markDirty()
                  }}
                  placeholder="군주명·재위명"
                />
                <FormInput
                  id={fid('templeName')}
                  value={templeName}
                  onChange={(e) => {
                    setTempleName(e.target.value)
                    markDirty()
                  }}
                  placeholder="묘호"
                />
                <FormInput
                  id={fid('posthumousName')}
                  value={posthumousName}
                  onChange={(e) => {
                    setPosthumousName(e.target.value)
                    markDirty()
                  }}
                  placeholder="시호"
                />
              </InlineFields>
            </FieldControl>
          </AdvancedBody>
        )}
      </AdvancedSection>
      )}
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

/** 출생일 · 사망일 가로 2열 — 앱 공통 date-pair(480px)와 동일 폭. 좁은 화면은 1열. */
const LifePairGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 12px;
  align-items: start;
  max-width: 480px;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

/** 각 날짜 열 — (라벨+버튼) 그룹 아래 토글/분기 컨트롤을 쌓는다. */
const LifeCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
`

const LifeFieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const LifeSubLabel = styled.span`
  font-size: ${FONT.meta};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LifeDeathDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 0 0;
`

const LifespanText = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

/** 사망 유형 chip — 채움 톤 + active=indigo. 사망 분기 segmented는 별도 컴포넌트 사용. */
const SegmentBtn = styled.button<{
  $active?: boolean
  $error?: boolean
  $variant?: 'solid' | 'ghost'
}>`
  padding: 7px 12px;
  font-size: ${FONT.label};
  font-weight: ${({ $active }) => ($active ? 500 : 400)};
  border-radius: ${RADIUS.control};
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    border-color 0.12s ease;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid
    ${({ $active, $error, theme }) =>
      $error
        ? theme.colors.alert.danger.fg
        : $active
          ? theme.colors.primary
          : theme.colors.border.default};

  &:hover:not(:disabled) {
    border-color: ${({ $active, $error, theme }) =>
      $error
        ? theme.colors.alert.danger.fg
        : $active
          ? theme.colors.primary
          : theme.colors.border.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

/**
 * 진짜 segmented control — "사망 여부" 3-way 분기를 단일 덩어리 시각으로.
 * 인접 button + container fill로 "이건 한 그룹의 분기"임을 강조 (chip과 위계 분리).
 */
const Segmented3Way = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 3px;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f1f5f9'};
  border-radius: 9px;

  /* 사망 열 폭(=절반)에 맞춰 세 버튼을 균등 분할. */
  > button {
    flex: 1;
    padding-left: 0;
    padding-right: 0;
  }
`

const Segmented3WayBtn = styled.button<{ $active?: boolean }>`
  padding: 6px 14px;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  letter-spacing: -0.005em;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#171727'
        : '#fff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  box-shadow: ${({ $active }) =>
    $active ? '0 1px 2px rgba(15, 23, 42, 0.06)' : 'none'};

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/** 사망 유형 카테고리 그룹 — 4그룹 (자연/외부/자해/기타) */
const DeathTypeGrouped = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const DeathTypeGroupBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const DeathTypeGroupLabel = styled.span`
  font-size: ${FONT.eyebrow};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const DeathTypeChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

/** 사망 유형 chip — active=indigo fill + 흰 글자, idle=채움 톤. */
const DeathTypeChip = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  font-size: ${FONT.label};
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  letter-spacing: -0.005em;
  border-radius: ${RADIUS.control};
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
  color: ${({ $active, theme }) =>
    $active ? '#fff' : theme.colors.text.secondary};
  background: ${({ $active, theme }) =>
    $active
      ? theme.colors.primary
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : '#f9fafb'};
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.colors.primary
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : '#e5e7eb'};

  &:hover:not(:disabled) {
    color: ${({ $active, theme }) =>
      $active ? '#fff' : theme.colors.text.primary};
    background: ${({ $active, theme }) =>
      $active
        ? theme.colors.button.hover
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : '#fff'};
    border-color: ${({ $active, theme }) =>
      $active ? theme.colors.button.hover : theme.colors.border.medium};
  }
`

// Disclosure 카드·InlineFields·FieldError는 ../_form-primitives에서 import (중복 제거).
