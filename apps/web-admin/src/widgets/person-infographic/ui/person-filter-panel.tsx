import React, { useCallback, useMemo, useState } from 'react'

import styled, { css } from 'styled-components'

import type { Person } from '@/entities/person/api'
import { usePersons } from '@/entities/person/api'
import { scrollbarThinMixin } from '@/shared/styles/mixins'

import { adapt, yearOfEra } from '../model/adapt'
import { ERAS, FIELDS, REGIONS, REGION_COLORS } from '../model/constants'
import {
  countActiveScopes,
  matchesScopes,
  usePersonInfographicFilterStore,
  type ScopeKind,
} from '../model/filter.store'
import type { AdaptedPerson } from '../model/types'

/** accordion 상태 — 그룹별 collapsed 여부 localStorage 유지 */
const COLLAPSED_GROUPS_KEY = 'person-filter-collapsed-groups'
type GroupId = 'era' | 'region' | 'field' | 'country' | 'influence' | 'alive'
const DEFAULT_COLLAPSED: Record<GroupId, boolean> = {
  era: false,
  region: false,
  field: false,
  country: false,
  influence: true,
  alive: true,
}

function useCollapsedGroups() {
  const [collapsed, setCollapsed] = useState<Record<GroupId, boolean>>(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_GROUPS_KEY)
      if (!saved) return DEFAULT_COLLAPSED
      return { ...DEFAULT_COLLAPSED, ...(JSON.parse(saved) as Record<GroupId, boolean>) }
    } catch {
      return DEFAULT_COLLAPSED
    }
  })

  const toggle = useCallback((id: GroupId) => {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return { collapsed, toggle }
}

/**
 * 인물 인포그래픽용 좌측 필터 패널.
 * - 기존 `persons-infographic.page.tsx`의 NavRail을 store 기반으로 재구성.
 * - LeftFilterSlot 안쪽에서 `view === 'person'`일 때 렌더.
 */
export function PersonFilterPanel() {
  const { data: rawPersons } = usePersons()

  const scopes = usePersonInfographicFilterStore((s) => s.scopes)
  const toggleScope = usePersonInfographicFilterStore((s) => s.toggleScope)
  const clearScopeKind = usePersonInfographicFilterStore(
    (s) => s.clearScopeKind,
  )
  const clearAllScopes = usePersonInfographicFilterStore(
    (s) => s.clearAllScopes,
  )
  const minInfluence = usePersonInfographicFilterStore((s) => s.minInfluence)
  const setMinInfluence = usePersonInfographicFilterStore(
    (s) => s.setMinInfluence,
  )
  const aliveFilter = usePersonInfographicFilterStore((s) => s.aliveFilter)
  const setAliveFilter = usePersonInfographicFilterStore(
    (s) => s.setAliveFilter,
  )
  const resetFilters = usePersonInfographicFilterStore((s) => s.resetFilters)
  const { collapsed: groupCollapsed, toggle: toggleGroup } = useCollapsedGroups()

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

  // 국가 그룹 — 검색어가 없으면 top 14, 있으면 매칭되는 모든 국가
  const [countryQuery, setCountryQuery] = useState('')
  const visibleCountries = useMemo(() => {
    const sorted = Object.entries(counts.country).sort((a, b) => b[1] - a[1])
    const q = countryQuery.trim().toLowerCase()
    if (!q) return sorted.slice(0, 14)
    return sorted.filter(([name]) => name.toLowerCase().includes(q))
  }, [counts.country, countryQuery])

  // 사이드바 필터만 적용한 결과 수. query는 panel 외부에서 관리.
  const filteredCount = useMemo(() => {
    let arr = all.filter((p) =>
      matchesScopes(p, scopes, (x) => yearOfEra(x.activityYear).key),
    )
    if (minInfluence > 0)
      arr = arr.filter((p) => (p.influence ?? 0) >= minInfluence)
    if (aliveFilter === 'alive') arr = arr.filter((p) => p.isAlive)
    else if (aliveFilter === 'dead') arr = arr.filter((p) => !p.isAlive)
    return arr.length
  }, [all, scopes, minInfluence, aliveFilter])

  const activeScopeCount = countActiveScopes(scopes)
  const hasActiveFilter =
    activeScopeCount > 0 || minInfluence > 0 || aliveFilter !== 'all'

  const isAllActive = activeScopeCount === 0

  const navAllItem = (
    <NavItem
      $active={isAllActive}
      onClick={() => clearAllScopes()}
    >
      <NavItemLabel>전체 인물</NavItemLabel>
      <NavItemCount>{counts.total}</NavItemCount>
    </NavItem>
  )

  const scopeNavItem = (
    kind: ScopeKind,
    val: string,
    label: string,
    count: number,
    dot?: string,
  ) => {
    const active = scopes[kind].includes(val)
    return (
      <NavItem
        key={kind + val}
        $active={active}
        onClick={() => toggleScope(kind, val)}
      >
        {dot && <NavDot style={{ background: dot }} />}
        <NavItemLabel>{label}</NavItemLabel>
        <NavItemCount>{count}</NavItemCount>
      </NavItem>
    )
  }

  const KIND_LABEL: Record<ScopeKind, string> = {
    era: '시대',
    region: '지역',
    field: '분야',
    country: '국가',
  }
  const labelFor = (kind: ScopeKind, val: string): string => {
    if (kind === 'era')
      return ERAS.find((e) => e.key === val)?.lbl ?? val
    return val
  }

  return (
    <Root>
      {hasActiveFilter && (
        <ActiveFilterBar>
          <ActiveFilterChips>
            {(['era', 'region', 'field', 'country'] as ScopeKind[]).flatMap(
              (kind) =>
                scopes[kind].map((val) => (
                  <Chip key={`${kind}-${val}`}>
                    <ChipKind>{KIND_LABEL[kind]}</ChipKind>
                    <ChipValue>{labelFor(kind, val)}</ChipValue>
                    <ChipClose
                      type="button"
                      aria-label={`${KIND_LABEL[kind]} ${labelFor(kind, val)} 해제`}
                      onClick={() => toggleScope(kind, val)}
                    >
                      ×
                    </ChipClose>
                  </Chip>
                )),
            )}
            {minInfluence > 0 && (
              <Chip>
                <ChipKind>영향력</ChipKind>
                <ChipValue>≥ {minInfluence}</ChipValue>
                <ChipClose
                  type="button"
                  aria-label="영향력 필터 해제"
                  onClick={() => setMinInfluence(0)}
                >
                  ×
                </ChipClose>
              </Chip>
            )}
            {aliveFilter !== 'all' && (
              <Chip>
                <ChipKind>생존</ChipKind>
                <ChipValue>
                  {aliveFilter === 'alive' ? '생존' : '사망'}
                </ChipValue>
                <ChipClose
                  type="button"
                  aria-label="생존 필터 해제"
                  onClick={() => setAliveFilter('all')}
                >
                  ×
                </ChipClose>
              </Chip>
            )}
          </ActiveFilterChips>
          <ActiveFilterMeta>
            <span>
              <strong>{filteredCount.toLocaleString()}</strong>명 매칭
            </span>
            <ResetAllBtn type="button" onClick={resetFilters}>
              초기화
            </ResetAllBtn>
          </ActiveFilterMeta>
          {filteredCount === 0 && (
            <EmptyHint>
              조건에 해당하는 인물이 없습니다. 일부 필터를 해제해 보세요.
            </EmptyHint>
          )}
        </ActiveFilterBar>
      )}

      {/* 범위는 항상 펼침 (accordion 제외) */}
      <NavGroup>
        <NavGroupLabel as="div">범위</NavGroupLabel>
        {navAllItem}
      </NavGroup>

      <NavGroupAccordion
        id="era"
        title="시대"
        suffix={
          scopes.era.length > 0 ? (
            <NavGroupLabelValue>{scopes.era.length}</NavGroupLabelValue>
          ) : null
        }
        collapsed={groupCollapsed.era}
        onToggle={toggleGroup}
      >
        {ERAS.map((e) =>
          scopeNavItem('era', e.key, e.lbl, counts.era[e.key] || 0, e.color),
        )}
      </NavGroupAccordion>

      <NavGroupAccordion
        id="region"
        title="지역"
        suffix={
          scopes.region.length > 0 ? (
            <NavGroupLabelValue>{scopes.region.length}</NavGroupLabelValue>
          ) : null
        }
        collapsed={groupCollapsed.region}
        onToggle={toggleGroup}
      >
        {REGIONS.filter((r) => counts.region[r]).map((r, i) =>
          scopeNavItem(
            'region',
            r,
            r,
            counts.region[r] || 0,
            REGION_COLORS[i % REGION_COLORS.length],
          ),
        )}
      </NavGroupAccordion>

      <NavGroupAccordion
        id="field"
        title="분야"
        suffix={
          scopes.field.length > 0 ? (
            <NavGroupLabelValue>{scopes.field.length}</NavGroupLabelValue>
          ) : null
        }
        collapsed={groupCollapsed.field}
        onToggle={toggleGroup}
      >
        {FIELDS.filter((f) => counts.field[f]).map((f) =>
          scopeNavItem('field', f, f, counts.field[f] || 0),
        )}
      </NavGroupAccordion>

      <NavGroupAccordion
        id="country"
        title="국가"
        suffix={
          scopes.country.length > 0 ? (
            <NavGroupLabelValue>{scopes.country.length}</NavGroupLabelValue>
          ) : null
        }
        collapsed={groupCollapsed.country}
        onToggle={toggleGroup}
      >
        <CountrySearchInput
          type="text"
          value={countryQuery}
          onChange={(e) => setCountryQuery(e.target.value)}
          placeholder="국가 검색..."
          aria-label="국가 검색"
        />
        <NavCountryScroll>
          {visibleCountries.length === 0 ? (
            <NavCountryEmpty>일치하는 국가 없음</NavCountryEmpty>
          ) : (
            visibleCountries.map(([c, n]) =>
              scopeNavItem('country', c, c, n),
            )
          )}
        </NavCountryScroll>
      </NavGroupAccordion>

      <NavGroupAccordion
        id="influence"
        title="영향력"
        suffix={
          minInfluence === 0 ? (
            <NavGroupLabelHint>전체</NavGroupLabelHint>
          ) : (
            <NavGroupLabelValue>≥ {minInfluence}</NavGroupLabelValue>
          )
        }
        collapsed={groupCollapsed.influence}
        onToggle={toggleGroup}
      >
        <NavSliderWrap>
          <NavSlider
            type="range"
            min={0}
            max={100}
            step={5}
            value={minInfluence}
            onChange={(e) => setMinInfluence(Number(e.target.value))}
          />
          {minInfluence > 0 && (
            <NavSliderResetBtn
              type="button"
              onClick={() => setMinInfluence(0)}
              aria-label="영향력 필터 초기화"
              title="초기화"
            >
              ×
            </NavSliderResetBtn>
          )}
        </NavSliderWrap>
      </NavGroupAccordion>

      <NavGroupAccordion
        id="alive"
        title="생존"
        suffix={
          aliveFilter !== 'all' ? (
            <NavGroupLabelValue>
              {aliveFilter === 'alive' ? '생존' : '사망'}
            </NavGroupLabelValue>
          ) : null
        }
        collapsed={groupCollapsed.alive}
        onToggle={toggleGroup}
      >
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
      </NavGroupAccordion>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ActiveFilterBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 8px 12px;
  margin-bottom: 4px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ActiveFilterChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px 3px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.active};
  font-size: 11px;
  line-height: 1.2;
  max-width: 100%;
`

const ChipKind = styled.span`
  font-weight: 600;
  opacity: 0.7;
`

const ChipValue = styled.span`
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 110px;
`

const ChipClose = styled.button`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;

  &:hover {
    background: rgba(0, 0, 0, 0.08);
    opacity: 1;
  }
`

const ActiveFilterMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};

  > span > strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`

const ResetAllBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const EmptyHint = styled.div`
  padding: 8px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(248, 113, 113, 0.12)'
      : 'rgba(239, 68, 68, 0.08)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#b91c1c')};
  font-size: 11px;
  line-height: 1.4;
`

const NavGroup = styled.div`
  margin-bottom: 6px;
`

const NavGroupLabel = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 8px 8px 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;

  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const NavGroupCaret = styled.span<{ $collapsed: boolean }>`
  display: inline-block;
  width: 10px;
  margin-right: 4px;
  font-size: 10px;
  transition: transform 0.15s ease;
  transform: rotate(${({ $collapsed }) => ($collapsed ? '-90deg' : '0deg')});
`

interface NavGroupAccordionProps {
  id: GroupId
  title: string
  suffix?: React.ReactNode
  collapsed: boolean
  onToggle: (id: GroupId) => void
  children: React.ReactNode
}

function NavGroupAccordion({
  id,
  title,
  suffix,
  collapsed,
  onToggle,
  children,
}: NavGroupAccordionProps) {
  return (
    <NavGroup>
      <NavGroupLabel
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={!collapsed}
      >
        <NavGroupCaret $collapsed={collapsed}>▾</NavGroupCaret>
        <span style={{ flex: 1 }}>
          {title}
          {suffix}
        </span>
      </NavGroupLabel>
      {!collapsed && children}
    </NavGroup>
  )
}

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
          background: ${theme.colors.activeLight};
          color: ${theme.colors.active};
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
  border-radius: 50%;
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

const CountrySearchInput = styled.input`
  width: calc(100% - 16px);
  margin: 0 8px 6px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const NavCountryEmpty = styled.div`
  padding: 8px;
  text-align: center;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const NavSliderWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 2px;
`

const NavSlider = styled.input`
  flex: 1;
  min-width: 0;
  accent-color: #6366f1;
  cursor: pointer;
`

const NavSliderResetBtn = styled.button`
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border: none;
  background: ${({ theme }) => theme.colors.hover};
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 50%;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.text.tertiary};
    color: ${({ theme }) => theme.colors.background.primary};
  }
`

const NavGroupLabelHint = styled.span`
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-left: 4px;
`

const NavGroupLabelValue = styled.span`
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-left: 4px;
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
          background: ${theme.colors.activeLight};
          color: ${theme.colors.active};
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
