import { useMemo, useState } from 'react'

import { FiPlus, FiX } from 'react-icons/fi'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import { getAllCountries } from '@/shared/api/countries'
import { type UpdateEventDto } from '@/shared/api/events'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { AdvancedCountrySelectModal } from '@/shared/ui/advanced-country-select-modal/advanced-country-select-modal'

import {
  type BelligerentSideShape,
  buildMilitaryPatch,
  getMilitary,
} from '../military-edit'
import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { InlineText } from './inline'
import { MODULE_COLOR } from './module-colors'
import { ModuleRemoveAction } from './module-remove-action'

interface ModuleBelligerentsProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
}

/**
 * 교전 진영 — 정규화 militaryEvent.belligerentSides의 편집 가능 뷰.
 *
 * 진영별: 이름·지휘관·병력·설명을 InlineText로 편집, 참전 국가를 모달로 추가/제거.
 * 모든 편집은 buildMilitaryPatch로 militaryEvent 전체를 재구성해 저장한다.
 */
export function ModuleBelligerents({ event, onPatch }: ModuleBelligerentsProps) {
  const sides = getMilitary(event).belligerentSides ?? []

  /** 국가 추가 모달 대상 진영 index — null이면 닫힘. */
  const [countryModalSide, setCountryModalSide] = useState<number | null>(null)

  const { data: allModern = [] } = useQuery({
    queryKey: ['countries', 'all'],
    queryFn: getAllCountries,
    enabled: countryModalSide !== null,
    staleTime: 5 * 60_000,
  })
  const { data: allHistorical = [] } = useQuery({
    queryKey: ['historical-countries', 'all'],
    queryFn: getAllHistoricalCountries,
    enabled: countryModalSide !== null,
    staleTime: 5 * 60_000,
  })

  /* 국가 id → 표시명 — 캐시가 있으면 이름, 없으면 빈 문자열(읽기 시 fallback). */
  const nameOf = useMemo(() => {
    const modern = new Map(
      (allModern as Array<{ id: string; name: string }>).map((c) => [c.id, c.name]),
    )
    const historical = new Map(
      (allHistorical as Array<{ id: string; name: string }>).map((c) => [
        c.id,
        c.name,
      ]),
    )
    return (countryId?: string, historicalId?: string): string => {
      if (historicalId) return historical.get(historicalId) ?? '역사 국가'
      if (countryId) return modern.get(countryId) ?? '국가'
      return '미상'
    }
  }, [allModern, allHistorical])

  const updateSide = (idx: number, patch: Partial<BelligerentSideShape>) => {
    onPatch(
      buildMilitaryPatch(event, (draft) => ({
        ...draft,
        belligerentSides: draft.belligerentSides.map((s, i) =>
          i === idx ? { ...s, ...patch } : s,
        ),
      })),
    )
  }

  const addSide = () => {
    onPatch(
      buildMilitaryPatch(event, (draft) => ({
        ...draft,
        belligerentSides: [
          ...draft.belligerentSides,
          { name: '', countries: [] },
        ],
      })),
    )
  }

  const removeSide = (idx: number) => {
    onPatch(
      buildMilitaryPatch(event, (draft) => ({
        ...draft,
        belligerentSides: draft.belligerentSides.filter((_, i) => i !== idx),
      })),
    )
  }

  const addCountry = (
    sideIdx: number,
    country: { id: string; isHistorical: boolean },
  ) => {
    onPatch(
      buildMilitaryPatch(event, (draft) => ({
        ...draft,
        belligerentSides: draft.belligerentSides.map((s, i) => {
          if (i !== sideIdx) return s
          const countries = s.countries ?? []
          const exists = countries.some((c) =>
            country.isHistorical
              ? c.historicalCountryId === country.id
              : c.countryId === country.id,
          )
          if (exists) return s
          return {
            ...s,
            countries: [
              ...countries,
              country.isHistorical
                ? { historicalCountryId: country.id }
                : { countryId: country.id },
            ],
          }
        }),
      })),
    )
  }

  const removeCountry = (sideIdx: number, countryIdx: number) => {
    onPatch(
      buildMilitaryPatch(event, (draft) => ({
        ...draft,
        belligerentSides: draft.belligerentSides.map((s, i) =>
          i === sideIdx
            ? { ...s, countries: (s.countries ?? []).filter((_, c) => c !== countryIdx) }
            : s,
        ),
      })),
    )
  }

  const selectedIdsForSide = (sideIdx: number): string[] => {
    const countries = sides[sideIdx]?.countries ?? []
    return countries.map((c) => c.historicalCountryId ?? c.countryId ?? '').filter(Boolean)
  }

  return (
    <S.Section id="module-belligerents">
      <S.SectionHeader>
        <S.SectionTitle>
          <S.SectionTitleDot $color={MODULE_COLOR.belligerents} />
          교전 진영
        </S.SectionTitle>
        {sides.length > 0 && <S.SectionSubtitle>{sides.length}개 진영</S.SectionSubtitle>}
        <S.SectionActions>
          <ModuleRemoveAction
            label="교전 진영"
            onRemove={() =>
              onPatch(
                buildMilitaryPatch(event, (draft) => ({
                  ...draft,
                  belligerentSides: [],
                })),
              )
            }
          />
        </S.SectionActions>
      </S.SectionHeader>

      <Stack>
        {sides.map((side, idx) => {
          const countries = side.countries ?? []
          return (
            <SideBlock key={idx}>
              <SideHead>
                <SideNameEdit>
                  <InlineText
                    value={side.name ?? ''}
                    onSave={(next) => updateSide(idx, { name: next.trim() })}
                    placeholder={`진영 ${idx + 1}`}
                    as="span"
                  />
                </SideNameEdit>
                <RemoveSideBtn
                  type="button"
                  onClick={() => removeSide(idx)}
                  aria-label={`진영 ${idx + 1} 제거`}
                >
                  <FiX />
                </RemoveSideBtn>
              </SideHead>

              <S.ModuleDataCard $accent={MODULE_COLOR.belligerents}>
                <S.Definitions>
                  <S.DefRow>
                    <S.DefLabel>지휘관</S.DefLabel>
                    <S.DefValue>
                      <InlineText
                        value={side.commander ?? ''}
                        onSave={(next) =>
                          updateSide(idx, { commander: next.trim() || undefined })
                        }
                        placeholder="추가"
                      />
                    </S.DefValue>
                  </S.DefRow>
                  <S.DefRow>
                    <S.DefLabel>병력</S.DefLabel>
                    <S.DefValue>
                      <InlineText
                        value={side.forces ?? ''}
                        onSave={(next) =>
                          updateSide(idx, { forces: next.trim() || undefined })
                        }
                        placeholder="추가"
                      />
                    </S.DefValue>
                  </S.DefRow>
                  <S.DefRow>
                    <S.DefLabel>비고</S.DefLabel>
                    <S.DefValue>
                      <InlineText
                        value={side.description ?? ''}
                        onSave={(next) =>
                          updateSide(idx, { description: next.trim() || undefined })
                        }
                        placeholder="추가"
                        multiline
                        multilineEnter
                      />
                    </S.DefValue>
                  </S.DefRow>
                </S.Definitions>
              </S.ModuleDataCard>

              <CountryList>
                {countries.map((country, cidx) => (
                  <CountryItem key={cidx}>
                    <CountryName>
                      {nameOf(country.countryId, country.historicalCountryId)}
                    </CountryName>
                    <CountryRemove
                      type="button"
                      onClick={() => removeCountry(idx, cidx)}
                      aria-label="국가 제거"
                    >
                      <FiX />
                    </CountryRemove>
                  </CountryItem>
                ))}
                <AddCountryBtn
                  type="button"
                  onClick={() => setCountryModalSide(idx)}
                >
                  <FiPlus /> 국가
                </AddCountryBtn>
              </CountryList>
            </SideBlock>
          )
        })}
      </Stack>

      <AddSideBtn type="button" onClick={addSide}>
        <FiPlus /> 진영 추가
      </AddSideBtn>

      <AdvancedCountrySelectModal
        isOpen={countryModalSide !== null}
        onClose={() => setCountryModalSide(null)}
        onSelect={(country) => {
          if (countryModalSide !== null) addCountry(countryModalSide, country)
        }}
        modernCountries={allModern}
        historicalCountries={allHistorical}
        selectedCountryIds={
          countryModalSide !== null ? selectedIdsForSide(countryModalSide) : []
        }
        multiSelect
      />
    </S.Section>
  )
}

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const SideBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const SideHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const SideNameEdit = styled.div`
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RemoveSideBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.14s, background 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
  }

  svg {
    width: 13px;
    height: 13px;
  }
`

const CountryList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 2px;
`

const CountryItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 4px 3px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'};
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CountryName = styled.span``

const CountryRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }

  svg {
    width: 10px;
    height: 10px;
  }
`

const AddCountryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.18)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }

  svg {
    width: 11px;
    height: 11px;
  }
`

const AddSideBtn = styled.button`
  align-self: flex-start;
  margin-top: 16px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.2)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }

  svg {
    width: 12px;
    height: 12px;
  }
`
