/**
 * 인물 등록/수정 폼의 "생애" 탭.
 * - 출생일(미상 토글) → 사망 여부 3-way 라디오 → 사망일(사망 시) → 사망 상세(사망/미상)
 * - 군주 호칭(군주명·묘호·시호) collapse — 일반 인물에겐 무관해 기본 접힘
 * 부모(person-register-view)는 state·setters·errors와 setDeathStatus 헬퍼만 주입.
 */
import React from 'react'

import {
  FiAlertCircle,
  FiChevronRight,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { Era } from '@/shared/api/persons'
import { FormInput } from '@/shared/ui/form-input/form-input'
import {
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
  inputFocusMixin,
  mobileInputFontMixin,
  segmentToggleMixin,
} from '../_form-primitives'
import { DEATH_TYPE_GROUPS } from '../person-register-view.helpers'
import { InlineDateField } from './inline-date-field'

export interface LifeSectionProps {
  fid: (key: string) => string
  // 출생
  birthEra: Era
  birthYear: string
  birthMonth: string
  birthDay: string
  isBirthDateUnknown: boolean
  setIsBirthDateUnknown: React.Dispatch<React.SetStateAction<boolean>>
  isBirthDateApproximate: boolean
  setIsBirthDateApproximate: React.Dispatch<React.SetStateAction<boolean>>
  setShowBirthDateModal: (v: boolean) => void
  setBirthEra: (era: Era) => void
  setBirthYear: (value: string) => void
  setBirthMonth: (value: string) => void
  setBirthDay: (value: string) => void
  // 사망
  deathEra: Era
  deathYear: string
  deathMonth: string
  deathDay: string
  isAlive: boolean
  isDeathDateUnknown: boolean
  isDeathDateApproximate: boolean
  setIsDeathDateApproximate: React.Dispatch<React.SetStateAction<boolean>>
  setShowDeathDateModal: (v: boolean) => void
  setDeathEra: (era: Era) => void
  setDeathYear: (value: string) => void
  setDeathMonth: (value: string) => void
  setDeathDay: (value: string) => void
  setDeathStatus: (status: 'alive' | 'deceased' | 'unknown') => void
  // 활동시기(floruit) — 생몰이 둘 다 미상일 때만 노출(생몰 폴백). 크기값 연도 문자열 + era.
  floruitStartYear: string
  floruitEndYear: string
  floruitEra: Era
  setFloruitStartYear: (value: string) => void
  setFloruitEndYear: (value: string) => void
  setFloruitEra: (era: Era) => void
  // 출생 상세
  birthNote: string
  setBirthNote: (v: string) => void
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
  isBirthDateApproximate,
  setIsBirthDateApproximate,
  setShowBirthDateModal,
  setBirthEra,
  setBirthYear,
  setBirthMonth,
  setBirthDay,
  deathEra,
  deathYear,
  deathMonth,
  deathDay,
  isAlive,
  isDeathDateUnknown,
  isDeathDateApproximate,
  setIsDeathDateApproximate,
  setShowDeathDateModal,
  setDeathEra,
  setDeathYear,
  setDeathMonth,
  setDeathDay,
  setDeathStatus,
  floruitStartYear,
  floruitEndYear,
  floruitEra,
  setFloruitStartYear,
  setFloruitEndYear,
  setFloruitEra,
  birthNote,
  setBirthNote,
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
                <InlineDateField
                  ariaLabel="출생일"
                  era={birthEra}
                  year={birthYear}
                  month={birthMonth}
                  day={birthDay}
                  onEra={(era) => {
                    setBirthEra(era)
                    markDirty()
                  }}
                  onYear={(value) => {
                    setBirthYear(value)
                    markDirty()
                  }}
                  onMonth={(value) => {
                    setBirthMonth(value)
                    markDirty()
                  }}
                  onDay={(value) => {
                    setBirthDay(value)
                    markDirty()
                  }}
                  onOpenPicker={() => setShowBirthDateModal(true)}
                  disabled={isBirthDateUnknown}
                  disabledLabel="미상"
                  error={!!errors.birth}
                  ariaDescribedBy={
                    errors.birth ? fid('birth-err') : undefined
                  }
                />
              </LifeFieldGroup>
              <SegmentBtn
                type="button"
                $active={isBirthDateUnknown}
                aria-pressed={isBirthDateUnknown}
                onClick={() => {
                  setIsBirthDateUnknown((v) => {
                    if (!v) setIsBirthDateApproximate(false) // 미상↔추정 배타
                    return !v
                  })
                  markDirty()
                }}
              >
                출생일 미상
              </SegmentBtn>
              <SegmentBtn
                type="button"
                $active={isBirthDateApproximate}
                aria-pressed={isBirthDateApproximate}
                disabled={isBirthDateUnknown}
                onClick={() => {
                  setIsBirthDateApproximate((v) => {
                    if (!v) setIsBirthDateUnknown(false) // 미상↔추정 배타
                    return !v
                  })
                  markDirty()
                }}
                aria-label="추정 연도"
                title="'약 1500년'처럼 추정 연도"
              >
                추정
              </SegmentBtn>
              {errors.birth && (
                <FieldError id={fid('birth-err')} role="alert">
                  <FiAlertCircle size={13} />
                  {errors.birth}
                </FieldError>
              )}
            </LifeCol>

            {/* ── 사망 열 ── */}
            <LifeCol>
              <LifeFieldGroup>
                <LifeSubLabel>사망일</LifeSubLabel>
                <InlineDateField
                  ariaLabel="사망일"
                  era={deathEra}
                  year={deathYear}
                  month={deathMonth}
                  day={deathDay}
                  onEra={(era) => {
                    setDeathEra(era)
                    markDirty()
                  }}
                  onYear={(value) => {
                    setDeathYear(value)
                    markDirty()
                  }}
                  onMonth={(value) => {
                    setDeathMonth(value)
                    markDirty()
                  }}
                  onDay={(value) => {
                    setDeathDay(value)
                    markDirty()
                  }}
                  onOpenPicker={() => setShowDeathDateModal(true)}
                  disabled={isAlive || isDeathDateUnknown}
                  disabledLabel={isAlive ? '생존 중' : '일자 미상'}
                  error={!!errors.death}
                  ariaDescribedBy={
                    errors.death ? fid('death-err') : undefined
                  }
                />
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
                  onClick={() => setDeathStatus('deceased')}
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
                  사망 (일자 미상)
                </Segmented3WayBtn>
              </Segmented3Way>
              {!isAlive && (
                <SegmentBtn
                  type="button"
                    $active={isDeathDateApproximate}
                  aria-pressed={isDeathDateApproximate}
                  disabled={isDeathDateUnknown}
                  onClick={() => {
                    setIsDeathDateApproximate((v) => !v)
                    markDirty()
                  }}
                  aria-label="추정 연도"
                  title="'약 1500년'처럼 추정 연도"
                >
                  추정
                </SegmentBtn>
              )}
              {lifespanText && (
                <LifespanText aria-live="polite">{lifespanText}</LifespanText>
              )}
              {/* 사망일 오류 — 출생>사망 역전 검증도 errs.death에 키잉되어 이 열에 귀속된다 */}
              {errors.death && (
                <FieldError id={fid('death-err')} role="alert">
                  <FiAlertCircle size={13} />
                  {errors.death}
                </FieldError>
              )}
            </LifeCol>
          </LifePairGrid>
        </LifeStack>
      </FieldRow>
      )}

      {/* 활동시기(floruit) — 생몰이 둘 다 미상일 때만. 생몰을 전혀 몰라도 활동 연대는 아는 고대·중세 인물용. */}
      {showEssentials && isBirthDateUnknown && isDeathDateUnknown && (
        <FieldRow>
          <FieldLabel>활동시기</FieldLabel>
          <FieldControl>
            <FloruitHint>
              생몰을 전혀 모를 때 활동 연대만 기록 (예: 15세기 → 1401 ~ 1500)
            </FloruitHint>
            <FloruitRow>
              <FloruitEraToggle role="group" aria-label="활동시기 기원">
                {(['AD', 'BC'] as const).map((era) => (
                  <SegmentBtn
                    key={era}
                    type="button"
                    $active={floruitEra === era}
                    aria-pressed={floruitEra === era}
                    onClick={() => {
                      setFloruitEra(era)
                      markDirty()
                    }}
                  >
                    {era === 'AD' ? '서기' : '기원전'}
                  </SegmentBtn>
                ))}
              </FloruitEraToggle>
              <FloruitYearInput
                value={floruitStartYear}
                onChange={(event) => {
                  setFloruitStartYear(event.target.value.replace(/[^0-9]/g, ''))
                  markDirty()
                }}
                placeholder="시작 연도"
                inputMode="numeric"
                aria-label="활동시기 시작 연도"
              />
              <FloruitTilde>~</FloruitTilde>
              <FloruitYearInput
                value={floruitEndYear}
                onChange={(event) => {
                  setFloruitEndYear(event.target.value.replace(/[^0-9]/g, ''))
                  markDirty()
                }}
                placeholder="종료 연도"
                inputMode="numeric"
                aria-label="활동시기 종료 연도"
              />
            </FloruitRow>
          </FieldControl>
        </FieldRow>
      )}

      {/*
       * 사망 유형(사인) — 사망/일자미상일 때만(=생존중 아닐 때). essentials 영역.
       * 암살·전사·처형은 역사 인물의 핵심 사실이라 "더 입력"을 펼치지 않아도 보이게 코어로 올림.
       * 원인 상세·메모는 details(아래)에 유지 — 유형 칩이 두 번 그려지지 않도록 details에선 제외.
       * 13개 평면 chip → 4그룹 mini-header. 그룹 내 chip은 active=indigo fill.
       */}
      {showEssentials &&
        !isAlive &&
        (!!deathType || !!deathYear.trim() || isDeathDateUnknown) && (
        <FieldRow>
          <FieldLabel>사망 유형</FieldLabel>
          <FieldControl>
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
                          setDeathType(deathType === opt.value ? '' : opt.value)
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
          </FieldControl>
        </FieldRow>
      )}

      {/* 출생 상세 — 출생 메모(탄생 설화·유복자 등). deathNote 대칭. details 영역. */}
      {showDetails && (
        <FieldRow>
          <FieldLabel>출생 상세</FieldLabel>
          <FieldControl>
            <Textarea
              value={birthNote}
              onChange={(e) => {
                setBirthNote(e.target.value)
                markDirty()
              }}
              placeholder="출생 메모 (탄생 설화·유복자·조산 등 맥락)"
              rows={2}
            />
          </FieldControl>
        </FieldRow>
      )}

      {/* 사망 상세 — 원인·메모. details 영역(유형은 essentials로 분리). */}
      {showDetails && !isAlive && (
        <FieldRow>
          <FieldLabel>사망 상세</FieldLabel>
          <FieldControl>
            <LifeDeathDetails>
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
                placeholder="사망 메모 (논란·맥락)"
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
              군주명·묘호·시호 (예: 루이 14세, 世宗 — 군주에 한해, 선택)
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

// ─── 활동시기(floruit) ────────────────────────────────────────────────────────
const FloruitHint = styled.p`
  margin: 0 0 8px;
  font-size: ${FONT.meta};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FloruitRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const FloruitEraToggle = styled.div`
  display: inline-flex;
  gap: 6px;
`

const FloruitYearInput = styled.input`
  width: 96px;
  height: 36px;
  padding: 0 10px;
  font-size: ${FONT.body};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  ${mobileInputFontMixin}
  ${({ theme }) => inputFocusMixin(theme)}
`

const FloruitTilde = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 사망 유형 chip — 채움 톤 + active=indigo. 사망 분기 segmented는 별도 컴포넌트 사용. */
const SegmentBtn = styled.button<{
  $active?: boolean
  $error?: boolean
}>`
  ${({ theme, $active, $error }) => segmentToggleMixin(theme, $active, $error)}
`

/**
 * 진짜 segmented control — "사망 여부" 3-way 분기를 단일 덩어리 시각으로.
 * 인접 button + container fill로 "이건 한 그룹의 분기"임을 강조 (chip과 위계 분리).
 */
const Segmented3Way = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  gap: 6px;

  /* 사망 열 폭(=절반)에 맞춰 세 버튼을 균등 분할. */
  > button {
    flex: 1;
  }
`

const Segmented3WayBtn = styled.button<{ $active?: boolean }>`
  ${({ theme, $active }) => segmentToggleMixin(theme, $active)}
  /* 균등 분할 컬럼이라 좌우 패딩을 줄여 좁은 폭에서도 라벨이 잘리지 않게 */
  padding-left: 8px;
  padding-right: 8px;
  text-align: center;
  justify-content: center;
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

/** 사망 유형 chip — 모달 공용 토글 규약(active=연한 indigo 채움 + indigo 텍스트/보더). */
const DeathTypeChip = styled.button<{ $active?: boolean }>`
  ${({ theme, $active }) => segmentToggleMixin(theme, $active)}
`

// Disclosure 카드·InlineFields·FieldError는 ../_form-primitives에서 import (중복 제거).
