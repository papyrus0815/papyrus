import React, { useCallback, useMemo, useState } from 'react'

import styled, { css } from 'styled-components'

import { scrollbarThinMixin } from '@/shared/styles/mixins'

import { ERAS, FIELDS, REGIONS, REGION_COLORS } from '../model/constants'
import {
  countActiveScopes,
  matchesScopes,
  usePersonInfographicFilterStore,
  type ScopeKind,
} from '../model/filter.store'
import type { AdaptedPerson } from '../model/types'
import { useAdaptedPersons } from '../model/use-adapted-persons'

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
  const all = useAdaptedPersons()

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

  /**
   * 패싯 카운트 — 각 카테고리 옵션 수는 **자기 카테고리를 제외한** 다른 활성 필터
   * (다른 스코프 + 영향력 + 생존)를 반영해 계산한다. 그래서 시대를 고르면 지역·분야·국가 수가
   * 그 시대 안으로 좁혀지고, 자기 카테고리 안에서는 OR이라 수가 유지된다.
   * globalRegion/globalField는 "데이터에 한 번이라도 존재하는가"(렌더 여부 판정)용 — 필터 무관.
   */
  const counts = useMemo(() => {
    const passNonScope = (p: AdaptedPerson) =>
      (minInfluence <= 0 || (p.influence ?? 0) >= minInfluence) &&
      (aliveFilter === 'all' ||
        (aliveFilter === 'alive' ? p.isAlive : !p.isAlive))

    const tallyExcluding = (
      exclude: ScopeKind,
      keyFn: (p: AdaptedPerson) => string,
    ): Record<string, number> => {
      const sc = { ...scopes, [exclude]: [] }
      const m: Record<string, number> = {}
      for (const p of all) {
        if (!passNonScope(p)) continue
        if (!matchesScopes(p, sc, (x) => x.era.key)) continue
        const k = keyFn(p)
        m[k] = (m[k] || 0) + 1
      }
      return m
    }

    const globalRegion: Record<string, number> = {}
    const globalField: Record<string, number> = {}
    for (const p of all) {
      globalRegion[p.region] = (globalRegion[p.region] || 0) + 1
      globalField[p.field] = (globalField[p.field] || 0) + 1
    }

    return {
      era: tallyExcluding('era', (p) => p.era.key),
      region: tallyExcluding('region', (p) => p.region),
      field: tallyExcluding('field', (p) => p.field),
      country: tallyExcluding('country', (p) => p.country),
      globalRegion,
      globalField,
      total: all.length,
    }
  }, [all, scopes, minInfluence, aliveFilter])

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
      matchesScopes(p, scopes, (x) => x.era.key),
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
      role="button"
      tabIndex={0}
      onClick={() => clearAllScopes()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          clearAllScopes()
        }
      }}
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
    // 0건이면서 선택도 안 된 옵션은 비활성(눌러도 결과 0) — 단 선택된 항목은 해제 위해 항상 조작 가능
    const disabled = count === 0 && !active
    const toggle = () => toggleScope(kind, val)
    return (
      <NavItem
        key={kind + val}
        $active={active}
        $disabled={disabled}
        role="checkbox"
        aria-checked={active}
        aria-disabled={disabled || undefined}
        aria-label={`${label} ${count}명`}
        tabIndex={disabled ? -1 : 0}
        onClick={disabled ? undefined : toggle}
        onKeyDown={
          disabled
            ? undefined
            : (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggle()
                }
              }
        }
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
        {REGIONS.filter((r) => counts.globalRegion[r]).map((r) =>
          scopeNavItem(
            'region',
            r,
            r,
            counts.region[r] || 0,
            // 색은 지역 정체성(정규 인덱스) 기준 — 표시 조합이 바뀌어도 같은 지역=같은 색
            REGION_COLORS[REGIONS.indexOf(r) % REGION_COLORS.length],
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
        {FIELDS.filter((f) => counts.globalField[f]).map((f) =>
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
            aria-label="최소 영향력"
            aria-valuetext={minInfluence === 0 ? '전체' : `${minInfluence} 이상`}
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

const NavItem = styled.div<{ $active?: boolean; $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.12s, color 0.12s;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: -2px;
  }

  ${({ $active, $disabled, theme }) =>
    $disabled
      ? css`
          /* 현재 필터 조합에서 0건 — 눌러도 결과 없음. 흐리게 + 조작 불가 */
          opacity: 0.36;
          cursor: default;
          color: ${theme.colors.text.tertiary};
        `
      : $active
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
