import React, { useMemo } from 'react'

import styled, { css } from 'styled-components'

import type { Person } from '@/entities/person/api'
import { usePersons } from '@/entities/person/api'
import { scrollbarThinMixin } from '@/shared/styles/mixins'

import { adapt, yearOfEra } from '../model/adapt'
import { ERAS, FIELDS, REGIONS, REGION_COLORS } from '../model/constants'
import { usePersonInfographicFilterStore } from '../model/filter.store'
import type { AdaptedPerson, Scope } from '../model/types'

/**
 * 인물 인포그래픽용 좌측 필터 패널.
 * - 기존 `persons-infographic.page.tsx`의 NavRail을 store 기반으로 재구성.
 * - LeftFilterSlot 안쪽에서 `view === 'person'`일 때 렌더.
 */
export function PersonFilterPanel() {
  const { data: rawPersons } = usePersons()

  const scope = usePersonInfographicFilterStore((s) => s.scope)
  const setScope = usePersonInfographicFilterStore((s) => s.setScope)
  const minInfluence = usePersonInfographicFilterStore((s) => s.minInfluence)
  const setMinInfluence = usePersonInfographicFilterStore(
    (s) => s.setMinInfluence,
  )
  const aliveFilter = usePersonInfographicFilterStore((s) => s.aliveFilter)
  const setAliveFilter = usePersonInfographicFilterStore(
    (s) => s.setAliveFilter,
  )

  const all = useMemo<AdaptedPerson[]>(() => {
    if (!rawPersons) return []
    return (rawPersons as Person[])
      .map(adapt)
      .filter((p): p is AdaptedPerson => p !== null)
  }, [rawPersons])

  const counts = useMemo(() => {
    const era: Record<string, number> = {}
    const region: Record<string, number> = {}
    const field: Record<string, number> = {}
    const country: Record<string, number> = {}
    all.forEach((p) => {
      const e = yearOfEra(p.activityYear).key
      era[e] = (era[e] || 0) + 1
      region[p.region] = (region[p.region] || 0) + 1
      field[p.field] = (field[p.field] || 0) + 1
      country[p.country] = (country[p.country] || 0) + 1
    })
    return { era, region, field, country, total: all.length }
  }, [all])

  const topCountries = useMemo(
    () =>
      Object.entries(counts.country)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 14),
    [counts.country],
  )

  const isActive = (type: string, val: string | null) =>
    scope.type === type && scope.val === val

  const navItem = (
    type: Scope['type'],
    val: string | null,
    label: string,
    count: number,
    dot?: string,
  ) => (
    <NavItem
      key={type + val}
      $active={isActive(type, val)}
      onClick={() => setScope({ type, val })}
    >
      {dot && <NavDot style={{ background: dot }} />}
      <NavItemLabel>{label}</NavItemLabel>
      <NavItemCount>{count}</NavItemCount>
    </NavItem>
  )

  return (
    <Root>
      <NavGroup>
        <NavGroupLabel>범위</NavGroupLabel>
        {navItem('all', null, '전체 인물', counts.total)}
      </NavGroup>
      <NavGroup>
        <NavGroupLabel>시대</NavGroupLabel>
        {ERAS.map((e) =>
          navItem('era', e.key, e.lbl, counts.era[e.key] || 0, e.color),
        )}
      </NavGroup>
      <NavGroup>
        <NavGroupLabel>지역</NavGroupLabel>
        {REGIONS.filter((r) => counts.region[r]).map((r, i) =>
          navItem(
            'region',
            r,
            r,
            counts.region[r] || 0,
            REGION_COLORS[i % REGION_COLORS.length],
          ),
        )}
      </NavGroup>
      <NavGroup>
        <NavGroupLabel>분야</NavGroupLabel>
        {FIELDS.filter((f) => counts.field[f]).map((f) =>
          navItem('field', f, f, counts.field[f] || 0),
        )}
      </NavGroup>
      <NavGroup>
        <NavGroupLabel>국가</NavGroupLabel>
        <NavCountryScroll>
          {topCountries.map(([c, n]) => navItem('country', c, c, n))}
        </NavCountryScroll>
      </NavGroup>
      <NavGroup>
        <NavGroupLabel>영향력 ≥ {minInfluence}</NavGroupLabel>
        <NavSliderWrap>
          <NavSlider
            type="range"
            min={0}
            max={100}
            step={5}
            value={minInfluence}
            onChange={(e) => setMinInfluence(Number(e.target.value))}
          />
        </NavSliderWrap>
      </NavGroup>
      <NavGroup>
        <NavGroupLabel>생존</NavGroupLabel>
        <NavToggleRow>
          {(
            [
              ['all', '전체'],
              ['alive', '생존'],
              ['dead', '사망'],
            ] as const
          ).map(([k, lbl]) => (
            <NavToggleBtn
              key={k}
              $active={aliveFilter === k}
              onClick={() => setAliveFilter(k)}
            >
              {lbl}
            </NavToggleBtn>
          ))}
        </NavToggleRow>
      </NavGroup>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const NavGroup = styled.div`
  margin-bottom: 6px;
`

const NavGroupLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 8px 8px 4px;
`

const NavItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.12s, color 0.12s;

  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme.mode === 'dark'
            ? 'rgba(99,106,242,0.2)'
            : '#eef2ff'};
          color: ${theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'};
          font-weight: 600;
        `
      : css`
          color: ${theme.colors.text.secondary};
          &:hover {
            background: ${theme.colors.hover};
            color: ${theme.colors.text.primary};
          }
        `}
`

const NavDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 2px;
  flex-shrink: 0;
`

const NavItemLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const NavItemCount = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const NavCountryScroll = styled.div`
  max-height: 200px;
  overflow-y: auto;
  ${scrollbarThinMixin}
`

const NavSliderWrap = styled.div`
  padding: 6px 8px 2px;
`

const NavSlider = styled.input`
  width: 100%;
  accent-color: #6366f1;
  cursor: pointer;
`

const NavToggleRow = styled.div`
  display: flex;
  gap: 4px;
  padding: 2px 4px;
`

const NavToggleBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 5px 0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  transition: background 0.12s, color 0.12s;

  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme.mode === 'dark'
            ? 'rgba(99,106,242,0.22)'
            : '#eef2ff'};
          color: ${theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'};
          font-weight: 600;
        `
      : css`
          background: transparent;
          color: ${theme.colors.text.secondary};
          &:hover {
            background: ${theme.colors.hover};
            color: ${theme.colors.text.primary};
          }
        `}
`
