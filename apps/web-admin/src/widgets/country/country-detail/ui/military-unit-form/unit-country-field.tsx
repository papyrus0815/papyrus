/**
 * 군사 사령부·부대 등록 모달 — 소속 국가 선택 필드.
 *
 * 사건 등록 모달(`BasicInfoSection`)의 국가 입력 디자인과 인터랙션을 단일 소속 국가 모델에 맞춰 적용:
 * - 미선택 시: 빠른 검색 input(`type="search"`, 방향키·Enter·Esc 지원) + `+ 국가 선택` 버튼(`S.AddButton`) 한 줄 배치
 * - 검색 결과 드롭다운: `+ 국가명` + `시대 일치` 배지 + 존속기간/ISO 메타 + 빈 결과 안내
 * - 하단 빠른 제안 바: 부대명 기반 `추천` → `최근` 사용 국가 → 창설 연도 기반 `시대 추천` 원클릭 칩
 * - 선택 완료 시: 사건 모달 `ParentEventCard`/`ParticipantRow` 톤의 깔끔한 행 + 연결된 역사 정치체 `시대` 원클릭 전환 알약 + `변경`·`×` 해제
 * - 시대 불일치 경고 시: `findReplacementForMismatchedCountry`로 동시대 역사국가 원클릭 교체 버튼 제공
 */
import React, { useMemo, useState } from 'react'

import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  findReplacementForMismatchedCountry,
  readRecentParticipants,
  suggestCountriesForEra,
  suggestCountriesFromTitle,
} from '@/entities/event/model'
import * as S from '@/pages/events/create/event-create.styles'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import {
  describeLifespanMismatch,
  formatCountryPeriod,
} from '@/shared/lib/country-period'
import {
  type CountryHintYearRange,
  filterCountriesByQuery,
  matchesHintYearRange,
} from '@/shared/lib/country-picker-filter'
import { AlertBox } from '@/shared/ui/alert-box/alert-box'

export interface UnitCountrySelection {
  countryId: string
  historicalCountryId: string
  countryName: string
  countryFlagEmoji: string
}

export interface UnitCountryFieldProps {
  inputId: string
  unitName: string
  countryId: string
  historicalCountryId: string
  countryName: string
  countryFlagEmoji: string
  modernCountries: ReadonlyArray<CountryResponseDto>
  historicalCountries: ReadonlyArray<HistoricalCountryResponseDto>
  linkedEraChips: ReadonlyArray<HistoricalCountryResponseDto>
  hintYearRange: CountryHintYearRange | null
  locked?: boolean
  onSelectCountry: (next: UnitCountrySelection) => void
  onClearCountry: () => void
  onOpenCountryModal: () => void
  onClickSound?: () => void
}

export const UnitCountryField: React.FC<UnitCountryFieldProps> = ({
  inputId,
  unitName,
  countryId,
  historicalCountryId,
  countryName,
  countryFlagEmoji,
  modernCountries,
  historicalCountries,
  linkedEraChips,
  hintYearRange,
  locked = false,
  onSelectCountry,
  onClearCountry,
  onOpenCountryModal,
  onClickSound,
}) => {
  const [quickQuery, setQuickQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [isQuickDismissed, setIsQuickDismissed] = useState(false)

  const hasCountry = Boolean(countryId || historicalCountryId)
  const isHistorical = Boolean(historicalCountryId)

  const selectedModern = useMemo(
    () =>
      countryId
        ? modernCountries.find((item) => item.id === countryId) ?? null
        : null,
    [countryId, modernCountries],
  )

  const selectedHistorical = useMemo(
    () =>
      historicalCountryId
        ? historicalCountries.find((item) => item.id === historicalCountryId) ??
          null
        : null,
    [historicalCountryId, historicalCountries],
  )

  const existingKeys = useMemo(() => {
    const keys = new Set<string>()
    if (historicalCountryId) keys.add(`h:${historicalCountryId}`)
    else if (countryId) keys.add(`m:${countryId}`)
    return keys
  }, [countryId, historicalCountryId])

  const storedRecents = useMemo(() => readRecentParticipants(), [])

  const recentSuggestions = useMemo(() => {
    return storedRecents
      .map((entry) => {
        if (entry.historicalCountryId) {
          const hist = historicalCountries.find(
            (candidate) => candidate.id === entry.historicalCountryId,
          )
          if (!hist || existingKeys.has(`h:${hist.id}`)) return null
          return {
            key: `h:${hist.id}`,
            label: hist.name,
            countryId: '',
            historicalCountryId: hist.id,
            emoji: '🏛️',
          }
        }
        if (entry.countryId) {
          const mod = modernCountries.find(
            (candidate) => candidate.id === entry.countryId,
          )
          if (!mod || existingKeys.has(`m:${mod.id}`)) return null
          return {
            key: `m:${mod.id}`,
            label: mod.name,
            countryId: mod.id,
            historicalCountryId: '',
            emoji: mod.flagEmoji || '🏳️',
          }
        }
        return null
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 4)
  }, [storedRecents, modernCountries, historicalCountries, existingKeys])

  const titleSuggestions = useMemo(
    () =>
      suggestCountriesFromTitle(
        unitName,
        [...modernCountries],
        [...historicalCountries],
        hintYearRange,
        existingKeys,
      ),
    [unitName, modernCountries, historicalCountries, hintYearRange, existingKeys],
  )

  const eraSuggestions = useMemo(() => {
    if (titleSuggestions.length > 0 || recentSuggestions.length > 0) return []
    if (!hintYearRange) return []
    return suggestCountriesForEra(
      [...modernCountries],
      [...historicalCountries],
      {
        startYear: hintYearRange.startYear,
        endYear: hintYearRange.endYear,
      },
      existingKeys,
      4,
    )
  }, [
    titleSuggestions.length,
    recentSuggestions.length,
    hintYearRange,
    modernCountries,
    historicalCountries,
    existingKeys,
  ])

  const quickMatches = useMemo(() => {
    const trimmed = quickQuery.trim()
    if (!trimmed) return []
    const lower = trimmed.toLowerCase()

    const matchedModern = filterCountriesByQuery([...modernCountries], trimmed)
      .filter((country) => !existingKeys.has(`m:${country.id}`))
      .map((country) => ({
        key: `m:${country.id}`,
        countryId: country.id,
        historicalCountryId: '',
        label: country.name,
        emoji: country.flagEmoji || '🏳️',
        meta: country.isoCode ?? '현대 국가',
        eraMatched: false,
        exact: country.name.toLowerCase() === lower,
        prefix: country.name.toLowerCase().startsWith(lower),
      }))

    const matchedHistorical = filterCountriesByQuery(
      [...historicalCountries],
      trimmed,
    )
      .filter((country) => !existingKeys.has(`h:${country.id}`))
      .map((country) => {
        const eraMatched = matchesHintYearRange(country, hintYearRange)
        return {
          key: `h:${country.id}`,
          countryId: '',
          historicalCountryId: country.id,
          label: country.name,
          emoji: '🏛️',
          meta: formatCountryPeriod(country) ?? '역사 국가',
          eraMatched,
          exact: country.name.toLowerCase() === lower,
          prefix: country.name.toLowerCase().startsWith(lower),
        }
      })

    const combined = [...matchedModern, ...matchedHistorical]
    combined.sort((left, right) => {
      if (left.exact !== right.exact) return left.exact ? -1 : 1
      if (left.eraMatched !== right.eraMatched) return left.eraMatched ? -1 : 1
      if (left.prefix !== right.prefix) return left.prefix ? -1 : 1
      return left.label.localeCompare(right.label, 'ko')
    })
    return combined.slice(0, 7)
  }, [
    quickQuery,
    modernCountries,
    historicalCountries,
    existingKeys,
    hintYearRange,
  ])

  const lifespanMismatchInfo = useMemo(() => {
    if (!selectedHistorical || !hintYearRange) return null
    const recordYear = hintYearRange.startYear ?? hintYearRange.endYear
    if (recordYear == null) return null
    const mismatch = describeLifespanMismatch(selectedHistorical, recordYear, {
      recordSupportsBc: true,
    })
    if (!mismatch) return null
    const replacement = findReplacementForMismatchedCountry(
      selectedHistorical,
      recordYear,
      [...modernCountries],
      [...historicalCountries],
      existingKeys,
    )
    return {
      name: selectedHistorical.name,
      mismatch,
      replacement,
    }
  }, [
    selectedHistorical,
    hintYearRange,
    modernCountries,
    historicalCountries,
    existingKeys,
  ])

  const applySelection = (target: {
    countryId?: string
    historicalCountryId?: string
  }) => {
    onClickSound?.()
    if (target.historicalCountryId) {
      const hist = historicalCountries.find(
        (item) => item.id === target.historicalCountryId,
      )
      onSelectCountry({
        countryId: '',
        historicalCountryId: target.historicalCountryId,
        countryName: hist?.name ?? '',
        countryFlagEmoji: '🏛️',
      })
    } else if (target.countryId) {
      const mod = modernCountries.find((item) => item.id === target.countryId)
      onSelectCountry({
        countryId: target.countryId,
        historicalCountryId: '',
        countryName: mod?.name ?? '',
        countryFlagEmoji: mod?.flagEmoji || '🏳️',
      })
    }
    setQuickQuery('')
    setActiveIndex(0)
  }

  // 연결된 현대 국가 기준점 (역사국가가 선택된 경우에도 modernCountryIds가 단일 매핑이면 시대 칩 전환 지원)
  const parentModernForSelectedHistorical = useMemo(() => {
    if (!selectedHistorical) return null
    const modLinks = (
      selectedHistorical as HistoricalCountryResponseDto & {
        modernCountries?: Array<{ countryId?: string; id?: string }>
      }
    ).modernCountries
    if (!modLinks || modLinks.length !== 1) return null
    const linkedModId = modLinks[0].countryId ?? modLinks[0].id
    if (!linkedModId) return null
    return modernCountries.find((item) => item.id === linkedModId) ?? null
  }, [selectedHistorical, modernCountries])

  const displayMeta = selectedHistorical
    ? formatCountryPeriod(selectedHistorical)
    : selectedModern?.isoCode ?? null

  return (
    <FieldStack>
      {hasCountry ? (
        <SelectedCountryCard role="group" aria-label="선택된 소속 국가">
          <SelectedHeaderRow>
            <SelectedNameWrap>
              <KindBadge $historical={isHistorical}>
                {isHistorical ? '역사 국가' : '현대 국가'}
              </KindBadge>
              {!isHistorical && countryFlagEmoji ? (
                <span aria-hidden="true">{countryFlagEmoji}</span>
              ) : null}
              <SelectedName>{countryName || '선택된 국가'}</SelectedName>
              {displayMeta ? <PeriodMeta>{displayMeta}</PeriodMeta> : null}
            </SelectedNameWrap>

            {!locked ? (
              <HeaderActions>
                <S.AddButton
                  type="button"
                  onClick={() => {
                    onClickSound?.()
                    onOpenCountryModal()
                  }}
                >
                  변경
                </S.AddButton>
                <RemoveIconBtn
                  type="button"
                  aria-label="소속 국가 해제"
                  onClick={() => {
                    onClickSound?.()
                    onClearCountry()
                  }}
                >
                  <FiX size={14} />
                </RemoveIconBtn>
              </HeaderActions>
            ) : null}
          </SelectedHeaderRow>

          {!locked && countryId && linkedEraChips.length > 0 ? (
            <EraSwitchBar>
              <EraSwitchLabel>시대</EraSwitchLabel>
              <EraChipGroup role="group" aria-label="시대(역사 정치체)">
                <EraChipBtn
                  type="button"
                  aria-pressed={!historicalCountryId}
                  $active={!historicalCountryId}
                  onClick={() => {
                    onClickSound?.()
                    if (selectedModern) {
                      onSelectCountry({
                        countryId: selectedModern.id,
                        historicalCountryId: '',
                        countryName: selectedModern.name,
                        countryFlagEmoji: selectedModern.flagEmoji || '🏳️',
                      })
                    }
                  }}
                >
                  현대 국가
                </EraChipBtn>
                {linkedEraChips.map((eraItem) => (
                  <EraChipBtn
                    key={eraItem.id}
                    type="button"
                    aria-pressed={historicalCountryId === eraItem.id}
                    $active={historicalCountryId === eraItem.id}
                    title={formatCountryPeriod(eraItem) || undefined}
                    onClick={() => {
                      onClickSound?.()
                      onSelectCountry({
                        countryId,
                        historicalCountryId: eraItem.id,
                        countryName: eraItem.name,
                        countryFlagEmoji: '🏛️',
                      })
                    }}
                  >
                    {eraItem.name}
                  </EraChipBtn>
                ))}
              </EraChipGroup>
            </EraSwitchBar>
          ) : !locked &&
            !countryId &&
            historicalCountryId &&
            parentModernForSelectedHistorical ? (
            <EraSwitchBar>
              <EraSwitchLabel>연결</EraSwitchLabel>
              <SuggestionChip
                type="button"
                onClick={() =>
                  applySelection({
                    countryId: parentModernForSelectedHistorical.id,
                  })
                }
              >
                현대 {parentModernForSelectedHistorical.name}(으)로 전환
              </SuggestionChip>
            </EraSwitchBar>
          ) : null}
        </SelectedCountryCard>
      ) : (
        <QuickSearchRow>
          <QuickSearchAnchor
            onBlur={(blurEvent) => {
              if (
                !blurEvent.currentTarget.contains(
                  blurEvent.relatedTarget as Node | null,
                )
              ) {
                setIsQuickDismissed(true)
              }
            }}
          >
            <QuickSearchInput
              id={inputId}
              type="search"
              disabled={locked}
              aria-label="소속 국가 빠른 검색"
              placeholder="국가 이름·약칭 빠른 검색 (예: 대한민국, 독일 제국, 프랑스, 로마…)"
              value={quickQuery}
              onFocus={() => setIsQuickDismissed(false)}
              onChange={(changeEvent) => {
                setQuickQuery(changeEvent.target.value)
                setActiveIndex(0)
                setIsQuickDismissed(false)
              }}
              onKeyDown={(keyEvent) => {
                if (keyEvent.key === 'ArrowDown') {
                  if (quickMatches.length > 0) {
                    keyEvent.preventDefault()
                    setIsQuickDismissed(false)
                    setActiveIndex((prev) => (prev + 1) % quickMatches.length)
                  }
                } else if (keyEvent.key === 'ArrowUp') {
                  if (quickMatches.length > 0) {
                    keyEvent.preventDefault()
                    setIsQuickDismissed(false)
                    setActiveIndex(
                      (prev) =>
                        (prev - 1 + quickMatches.length) % quickMatches.length,
                    )
                  }
                } else if (keyEvent.key === 'Enter') {
                  if (quickMatches.length > 0) {
                    keyEvent.preventDefault()
                    const chosen =
                      quickMatches[
                        Math.min(activeIndex, quickMatches.length - 1)
                      ] ?? quickMatches[0]
                    applySelection({
                      countryId: chosen.countryId || undefined,
                      historicalCountryId:
                        chosen.historicalCountryId || undefined,
                    })
                  }
                } else if (keyEvent.key === 'Escape' && quickQuery) {
                  keyEvent.preventDefault()
                  setQuickQuery('')
                  setActiveIndex(0)
                }
              }}
            />

            {quickQuery.trim() && !isQuickDismissed ? (
              <QuickResultBox
                role="listbox"
                aria-label="소속 국가 빠른 검색 결과"
              >
                {quickMatches.length > 0 ? (
                  quickMatches.map((match, matchIdx) => (
                    <QuickResultBtn
                      key={match.key}
                      type="button"
                      role="option"
                      aria-selected={matchIdx === activeIndex}
                      $active={matchIdx === activeIndex}
                      onMouseEnter={() => setActiveIndex(matchIdx)}
                      onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
                      onClick={() =>
                        applySelection({
                          countryId: match.countryId || undefined,
                          historicalCountryId:
                            match.historicalCountryId || undefined,
                        })
                      }
                    >
                      <QuickResultName>+ {match.label}</QuickResultName>
                      <QuickResultMeta>
                        {match.eraMatched ? (
                          <CountryEraBadge>시대 일치</CountryEraBadge>
                        ) : null}
                        {match.meta ? <span>{match.meta}</span> : null}
                      </QuickResultMeta>
                    </QuickResultBtn>
                  ))
                ) : (
                  <QuickEmpty>
                    &lsquo;{quickQuery.trim()}&rsquo;에 맞는 국가가 없습니다.
                  </QuickEmpty>
                )}
              </QuickResultBox>
            ) : null}
          </QuickSearchAnchor>

          {!locked ? (
            <S.AddButton
              type="button"
              onClick={() => {
                onClickSound?.()
                onOpenCountryModal()
              }}
            >
              <FiPlus size={15} />
              국가 선택
            </S.AddButton>
          ) : null}

          {!locked && titleSuggestions.length > 0 ? (
            <SuggestionBar aria-label="부대명 추천 소속 국가">
              <SuggestionLabel>추천</SuggestionLabel>
              {titleSuggestions.map((candidate) => (
                <SuggestionChip
                  key={candidate.key}
                  type="button"
                  onClick={() =>
                    applySelection({
                      countryId: candidate.countryId,
                      historicalCountryId: candidate.historicalCountryId,
                    })
                  }
                >
                  + {candidate.label}
                </SuggestionChip>
              ))}
            </SuggestionBar>
          ) : !locked && recentSuggestions.length > 0 ? (
            <SuggestionBar aria-label="최근 사용한 국가">
              <SuggestionLabel>최근</SuggestionLabel>
              {recentSuggestions.map((entry) => (
                <SuggestionChip
                  key={entry.key}
                  type="button"
                  onClick={() =>
                    applySelection({
                      countryId: entry.countryId || undefined,
                      historicalCountryId:
                        entry.historicalCountryId || undefined,
                    })
                  }
                >
                  + {entry.label}
                </SuggestionChip>
              ))}
            </SuggestionBar>
          ) : !locked && eraSuggestions.length > 0 ? (
            <SuggestionBar aria-label="시대별 추천 국가">
              <SuggestionLabel>시대 추천</SuggestionLabel>
              {eraSuggestions.map((candidate) => (
                <SuggestionChip
                  key={candidate.key}
                  type="button"
                  onClick={() =>
                    applySelection({
                      countryId: candidate.countryId,
                      historicalCountryId: candidate.historicalCountryId,
                    })
                  }
                >
                  + {candidate.label}
                </SuggestionChip>
              ))}
            </SuggestionBar>
          ) : null}
        </QuickSearchRow>
      )}

      {!locked && hasCountry && titleSuggestions.length > 0 ? (
        <SuggestionBar aria-label="부대명 추천 국가 전환">
          <SuggestionLabel>부대명 추천</SuggestionLabel>
          {titleSuggestions.slice(0, 3).map((candidate) => (
            <SuggestionChip
              key={candidate.key}
              type="button"
              onClick={() =>
                applySelection({
                  countryId: candidate.countryId,
                  historicalCountryId: candidate.historicalCountryId,
                })
              }
            >
              {candidate.label}(으)로 변경
            </SuggestionChip>
          ))}
        </SuggestionBar>
      ) : null}

      {lifespanMismatchInfo ? (
        <AlertBox variant="warning" style={{ marginTop: 4 }}>
          <strong>{lifespanMismatchInfo.name}</strong>{' '}
          {lifespanMismatchInfo.mismatch} 국가 소멸 전후 소급·연속 편제 등 정당한
          경우라면 그대로 저장하세요.
          {!locked && lifespanMismatchInfo.replacement ? (
            <LifespanReplaceBtn
              type="button"
              onClick={() =>
                applySelection({
                  countryId: lifespanMismatchInfo.replacement?.countryId,
                  historicalCountryId:
                    lifespanMismatchInfo.replacement?.historicalCountryId,
                })
              }
            >
              {lifespanMismatchInfo.replacement.label}(으)로 교체
            </LifespanReplaceBtn>
          ) : null}
        </AlertBox>
      ) : null}
    </FieldStack>
  )
}

/* ─── 사건 등록 모달(BasicInfoSection)과 동일한 토큰·규격 ─── */

const FieldStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

const SelectedCountryCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 11px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#ffffff'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.03)'};
`

const SelectedHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
  min-width: 0;
`

const SelectedNameWrap = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  min-width: 0;
`

const KindBadge = styled.span<{ $historical: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  background: ${({ $historical, theme }) =>
    $historical
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.18)'
        : 'rgba(245, 158, 11, 0.11)'
      : theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.1)'};
  color: ${({ $historical, theme }) =>
    $historical
      ? theme.mode === 'dark'
        ? '#fbbf24'
        : '#b45309'
      : theme.colors.primary};
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
`

const SelectedName = styled.span`
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
`

const PeriodMeta = styled.span`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
`

const RemoveIconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background-color: transparent;
  color: ${({ theme }) => S.getC(theme).text.muted};
  cursor: pointer;
  transition: color 0.14s ease, background-color 0.14s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.error};
    background-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(239, 68, 68, 0.12)'
        : 'rgba(239, 68, 68, 0.08)'};
    outline: none;
  }
`

const EraSwitchBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  min-width: 0;
`

const EraSwitchLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const EraChipGroup = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 2.5px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9'};
`

const EraChipBtn = styled.button<{ $active: boolean }>`
  height: 25px;
  padding: 0 9px;
  border: none;
  border-radius: 6px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? theme.colors.activeLight
        : '#ffffff'
      : 'transparent'};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.14s ease, color 0.14s ease, box-shadow 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const QuickSearchRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
`

const QuickSearchAnchor = styled.div`
  position: relative;
  flex: 1 1 260px;
  min-width: 0;
`

const QuickSearchInput = styled.input`
  width: 100%;
  min-width: 0;
  height: 36px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  border-radius: 8px;
  background: ${({ theme }) => S.getC(theme).background.content};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.02)'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 13px;
  letter-spacing: -0.01em;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => S.getC(theme).text.muted};
  }

  &:hover:not(:focus):not(:disabled) {
    border-color: ${({ theme }) => S.getC(theme).border.hover};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => S.getC(theme).border.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => S.getC(theme).border.focusHalo};
  }
`

const QuickResultBox = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 100%;
  width: 100%;
  max-width: min(440px, 100%);
  max-height: 210px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1e1e24' : '#ffffff')};
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
`

const QuickResultBtn = styled.button<{ $active?: boolean }>`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 8px;
  border: none;
  border-radius: 7px;
  background: ${({ $active, theme }) =>
    $active ? S.getC(theme).background.hover : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => S.getC(theme).background.hover};
  }
`

const QuickResultName = styled.span`
  font-size: 13px;
  font-weight: 600;
`

const QuickResultMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CountryEraBadge = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(99, 102, 241, 0.14);
  color: ${({ theme }) => theme.colors.primary};
`

const QuickEmpty = styled.p`
  margin: 0;
  padding: 6px 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SuggestionBar = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  flex-basis: 100%;
  gap: 5px 6px;
  margin-top: 2px;
  font-size: 11.5px;
`

const SuggestionLabel = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const SuggestionChip = styled.button`
  display: inline-flex;
  align-items: center;
  height: 24px;
  max-width: 240px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.default};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const LifespanReplaceBtn = styled.button`
  display: inline-flex;
  align-items: center;
  height: 26px;
  margin-left: 8px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`
