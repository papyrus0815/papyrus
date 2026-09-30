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
  CheckLabel,
} from '../_form-primitives'
import {
  KitChipGroup,
  KitChoiceChip,
  KitGroupLabel,
} from '@/shared/ui/register-form-kit/register-form-kit'
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
  /** 출생일/사망일 드롭다운 달력이 열려 있는지 — 날짜 칸 포커스 링 유지용 */
  birthPickerOpen?: boolean
  deathPickerOpen?: boolean
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
  birthPickerOpen,
  deathPickerOpen,
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
        {/* 사건 등록 폼의 '기간' 행처럼 — 왼쪽 라벨 하나, 오른쪽 출생일·사망일 두 칸(칸별 작은 머리) */}
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
                <InlineDateField
                  ariaLabel="출생일"
                  appearance="field"
                  anchorId={fid('birth-date')}
                  pickerOpen={birthPickerOpen}
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
              <LifeToggleRow>
                <CheckLabel>
                  <input
                    type="checkbox"
                    checked={isBirthDateUnknown}
                    onChange={() => {
                      setIsBirthDateUnknown((wasUnknown) => {
                        if (!wasUnknown) setIsBirthDateApproximate(false) // 미상↔추정 배타
                        return !wasUnknown
                      })
                      markDirty()
                    }}
                  />
                  미상
                </CheckLabel>
                <CheckLabel
                  $disabled={isBirthDateUnknown}
                  title="'약 1500년'처럼 추정 연도"
                >
                  <input
                    type="checkbox"
                    checked={isBirthDateApproximate}
                    disabled={isBirthDateUnknown}
                    onChange={() => {
                      setIsBirthDateApproximate((wasApproximate) => {
                        if (!wasApproximate) setIsBirthDateUnknown(false) // 미상↔추정 배타
                        return !wasApproximate
                      })
                      markDirty()
                    }}
                  />
                  추정 연도
                </CheckLabel>
              </LifeToggleRow>
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
                  appearance="field"
                  anchorId={fid('death-date')}
                  pickerOpen={deathPickerOpen}
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
              <LifeToggleRow>
                <Segmented3Way role="radiogroup" aria-label="사망 여부">
                  <Segmented3WayBtn
                    type="button"
                    role="radio"
                    aria-checked={isAlive}
                    $selected={isAlive}
                    onClick={() => setDeathStatus('alive')}
                  >
                    생존 중
                  </Segmented3WayBtn>
                  <Segmented3WayBtn
                    type="button"
                    role="radio"
                    aria-checked={!isAlive && !isDeathDateUnknown}
                    $selected={!isAlive && !isDeathDateUnknown}
                    onClick={() => setDeathStatus('deceased')}
                  >
                    사망
                  </Segmented3WayBtn>
                  <Segmented3WayBtn
                    type="button"
                    role="radio"
                    aria-checked={!isAlive && isDeathDateUnknown}
                    $selected={!isAlive && isDeathDateUnknown}
                    onClick={() => setDeathStatus('unknown')}
                  >
                    일자 미상
                  </Segmented3WayBtn>
                </Segmented3Way>
                {!isAlive && (
                  <CheckLabel
                    $disabled={isDeathDateUnknown}
                    title="'약 1500년'처럼 추정 연도"
                  >
                    <input
                      type="checkbox"
                      checked={isDeathDateApproximate}
                      disabled={isDeathDateUnknown}
                      onChange={() => {
                        setIsDeathDateApproximate((wasApproximate) => !wasApproximate)
                        markDirty()
                      }}
                    />
                    추정 연도
                  </CheckLabel>
                )}
              </LifeToggleRow>
              {/*
               * 사망 유형(사인) — 사망 열 안, 상태 줄 바로 아래. 예전엔 전폭 행에 그룹 머리글 4개
               * (자연·외부 요인·자해·기타)를 세로로 쌓아 한 개 고르는 데 250px를 썼고('자해'는 칩 1개에
               * 한 줄), 오른쪽은 비었다. 이제 한 흐름의 알약 줄 — 그룹은 머리글 대신 넓은 간격으로 끊고(세로선은 줄바꿈 때 줄 끝·줄 머리에 홀로 남았다)
               * 이름은 aria-label로만 남긴다. 사망 날짜·유형 입력 후에만 보이는 점진 공개는 그대로.
               */}
              {!isAlive &&
                (!!deathType || !!deathYear.trim() || isDeathDateUnknown) && (
                  <DeathTypeField role="group" aria-labelledby={fid('death-type-label')}>
                    <DeathTypeLabel id={fid('death-type-label')}>사망 유형</DeathTypeLabel>
                    <DeathTypeChips>
                      {DEATH_TYPE_GROUPS.map((group) => (
                        <DeathTypeGroup key={group.key} role="group" aria-label={group.label}>
                          {group.options.map((opt) => (
                            <DeathTypeChip
                              key={opt.value}
                              type="button"
                              aria-pressed={deathType === opt.value}
                              $selected={deathType === opt.value}
                              onClick={() => {
                                setDeathType(deathType === opt.value ? '' : opt.value)
                                markDirty()
                              }}
                            >
                              {opt.label}
                            </DeathTypeChip>
                          ))}
                        </DeathTypeGroup>
                      ))}
                    </DeathTypeChips>
                  </DeathTypeField>
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
                  <SegmentItem
                    key={era}
                    type="button"
                    $selected={floruitEra === era}
                    aria-pressed={floruitEra === era}
                    onClick={() => {
                      setFloruitEra(era)
                      markDirty()
                    }}
                  >
                    {era === 'AD' ? '서기' : '기원전'}
                  </SegmentItem>
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


      {/* 출생 상세 — 출생 메모(탄생 설화·유복자 등). deathNote 대칭. details 영역. */}
      {showDetails && (
        <FieldRow>
          <FieldLabel>출생 메모</FieldLabel>
          <FieldControl>
            <MemoArea
              value={birthNote}
              onChange={(e) => {
                setBirthNote(e.target.value)
                markDirty()
              }}
              placeholder="탄생 설화·유복자·조산 등"
              rows={1}
            />
          </FieldControl>
        </FieldRow>
      )}

      {/* 사망 상세 — 원인·메모. details 영역(유형은 essentials로 분리). */}
      {showDetails && !isAlive && (
        <FieldRow>
          <FieldLabel>사망 원인 · 메모</FieldLabel>
          <FieldControl>
            <LifeDeathDetails>
              <FormInput
                value={deathCause}
                onChange={(e) => {
                  setDeathCause(e.target.value)
                  markDirty()
                }}
                placeholder="사망 원인"
              />
              <MemoArea
                value={deathNote}
                onChange={(e) => {
                  setDeathNote(e.target.value)
                  markDirty()
                }}
                placeholder="메모 (논란·맥락)"
                rows={1}
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
              군주명·묘호·시호 (루이 14세, 世宗)
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

/**
 * 출생일 · 사망일 가로 2열 — 성별·국적(CoreFieldPair)·출생지·사망지와 같은 두 열(간격 24)이라
 * 위아래 블록의 열 경계가 한 줄로 맞는다. 예전 480px 상한에선 사망 열 버튼 줄이 열을 넘쳤다.
 */
const LifePairGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 24px;
  align-items: start;
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

/** 날짜 아래 상태 토글 한 줄 — '출생일 미상·추정', '생존 중|사망|일자 미상 · 추정'. 좁으면 줄바꿈. */
const LifeToggleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
`

const LifeFieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* LifeCol이 flex-start라 날짜 칸(width 100%)이 내용 폭으로 줄지 않게 열 폭을 채운다 */
  align-self: stretch;
  min-width: 0;
`

/** 출생일·사망일 칸 머리 — 사건 등록 폼 기간 행의 '시작일·종료일'(DateRangeLabel)과 같은 11/700 */
const LifeSubLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/*
 * 메모 칸 — 빈 상태에선 입력칸 한 줄 높이, 쓰는 만큼 늘어난다(field-sizing 미지원 브라우저는
 * 손잡이로 늘림). 두 줄짜리 빈 상자 두 개가 생애 블록에서 가장 큰 면적이었다.
 */
const MemoArea = styled(Textarea)`
  min-height: 42px;
  max-height: 240px;
  field-sizing: content;
`

const LifeDeathDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
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

/** 활동시기 서기|기원전 — 사건 등록 폼 카테고리 칩과 같은 알약 */
const FloruitEraToggle = styled(KitChipGroup)``

/** 활동시기 연도 — 텍스트 입력(FormInput)과 같은 41px 칸 */
const FloruitYearInput = styled.input`
  box-sizing: border-box;
  width: 96px;
  height: 41px;
  padding: 0 12px;
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

/** 활동시기 서기|기원전 항목 — 사건 등록 폼 카테고리 칩 */
const SegmentItem = KitChoiceChip

/** "사망 여부" 3-way 분기(생존 중·사망·일자 미상) — 사건 등록 폼 카테고리 칩 */
const Segmented3Way = styled(KitChipGroup)``

const Segmented3WayBtn = KitChoiceChip

/** 사망 유형 — 사망 열 안의 라벨 + 알약 줄 */
const DeathTypeField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-self: stretch;
  margin-top: 6px;
`

/** 사망 유형 머리 — 사건 폼 기간 행 '시작일·종료일'과 같은 11/700 */
const DeathTypeLabel = styled(KitGroupLabel).attrs({ as: 'span' })``

/** 그룹 사이는 14px, 그룹 안 칩 사이는 6px — 간격 차이가 그룹을 말한다 */
const DeathTypeChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
`

/** 한 그룹의 칩 묶음 — 줄바꿈 시 그룹이 쪼개지지 않게 한 덩어리 */
const DeathTypeGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
`

/** 사망 유형 알약 — 사건 등록 폼 카테고리 칩 */
const DeathTypeChip = KitChoiceChip

// Disclosure 카드·InlineFields·FieldError는 ../_form-primitives에서 import (중복 제거).
