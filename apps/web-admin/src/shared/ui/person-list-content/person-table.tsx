/**
 * 인물 리스트 테이블 뷰 — 95명 단위 비교 시 카드보다 효율적.
 * - 데스크톱(>=768px): 풀 테이블, 컬럼 정렬 가능
 * - 모바일(<768px): 안내 (테이블 뷰는 데스크톱 전용 — 자동 카드로 폴백 권장)
 */
import { useMemo, useState } from 'react'
import { FiCheck, FiDownload, FiSquare, FiStar, FiTarget } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import type { PersonEvaluationSummary } from '@/shared/lib/person-evaluation-index'

type PersonTableRow = {
  id: string
  name: string
  surname?: string | null
  middleName?: string | null
  nameDisplayOrder?: string | null
  regnalName?: string | null
  templeName?: string | null
  gender?: string | null
  birthYear?: number | null
  deathYear?: number | null
  birthEra?: string | null
  deathEra?: string | null
  birth_year?: number | null
  death_year?: number | null
  birth_era?: string | null
  death_era?: string | null
  influence?: number | null
  dynastyId?: string | null
  dynasty?: { id: string; name: string } | null
  country?: {
    id: string
    name: string
    flagEmoji?: string | null
    defaultNameDisplayOrder?: string | null
    isoCode?: string | null
  } | null
  isAlive?: boolean | null
  deathType?: string | null
}

type ColumnKey = 'name' | 'country' | 'dynasty' | 'lifespan' | 'influence' | 'eval' | 'traits'

interface Props {
  persons: PersonTableRow[]
  dynasties: Array<{ id: string; name: string }>
  evalIndex: Map<string, PersonEvaluationSummary>
  selectedIds: Set<string>
  onToggleSelected: (id: string, additive: boolean) => void
  onToggleAll: (allSelected: boolean) => void
  onPersonClick: (id: string) => void
  onQuickEdit: (id: string) => void
}

export function PersonTable({
  persons,
  dynasties,
  evalIndex,
  selectedIds,
  onToggleSelected,
  onToggleAll,
  onPersonClick,
  onQuickEdit,
}: Props) {
  const [sortKey, setSortKey] = useState<ColumnKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const dynastyName = (p: PersonTableRow): string => {
    return (
      p.dynasty?.name ??
      (p.dynastyId ? dynasties.find((d) => d.id === p.dynastyId)?.name : '') ??
      ''
    )
  }

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const norm = (n: number | null | undefined) => (n == null ? -Infinity : n)
    const list = [...persons]
    list.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return getPersonDisplayName(a, true).localeCompare(getPersonDisplayName(b, true), 'ko') * dir
        case 'country':
          return (a.country?.name ?? '').localeCompare(b.country?.name ?? '', 'ko') * dir
        case 'dynasty':
          return dynastyName(a).localeCompare(dynastyName(b), 'ko') * dir
        case 'lifespan': {
          const ya = (a.birthEra ?? a.birth_era) === 'BC' ? -(a.birthYear ?? a.birth_year ?? 0) : (a.birthYear ?? a.birth_year ?? 0)
          const yb = (b.birthEra ?? b.birth_era) === 'BC' ? -(b.birthYear ?? b.birth_year ?? 0) : (b.birthYear ?? b.birth_year ?? 0)
          return (ya - yb) * dir
        }
        case 'influence':
          return (norm(a.influence) - norm(b.influence)) * dir
        case 'eval': {
          const av = evalIndex.get(a.id)?.statsAverage ?? -Infinity
          const bv = evalIndex.get(b.id)?.statsAverage ?? -Infinity
          return (av - bv) * dir
        }
        case 'traits': {
          const at = evalIndex.get(a.id)?.traitCount ?? 0
          const bt = evalIndex.get(b.id)?.traitCount ?? 0
          return (at - bt) * dir
        }
      }
    })
    return list
  }, [persons, sortKey, sortDir, evalIndex, dynasties])

  const onClickHeader = (k: ColumnKey) => {
    if (sortKey === k) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(k)
      // 숫자 컬럼은 큰값부터 보여주는 게 직관적
      setSortDir(['influence', 'eval', 'traits'].includes(k) ? 'desc' : 'asc')
    }
  }

  const allInViewSelected =
    sorted.length > 0 && sorted.every((p) => selectedIds.has(p.id))

  // C2: CSV export — 현재 정렬 순서 그대로
  const exportCsv = () => {
    const headers = [
      '이름', '성', '국가', '가문', '출생', '사망', '영향력',
      '정치', '군사', '외교', '학식', '카리스마', '행정',
      '능력치 평균', '태그 수',
    ]
    const escape = (v: unknown): string => {
      if (v == null) return ''
      const s = String(v)
      // CSV 이스케이프 — 따옴표·콤마·줄바꿈 포함 시 따옴표로 감싸기
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const rows = sorted.map((p) => {
      const summary = evalIndex.get(p.id)
      const stats = summary?.stats
      const by = p.birthYear ?? p.birth_year
      const dy = p.deathYear ?? p.death_year
      return [
        getPersonDisplayName(p),
        p.surname ?? '',
        p.country?.name ?? '',
        dynastyName(p),
        by != null ? `${(p.birthEra ?? p.birth_era) === 'BC' ? 'BC ' : ''}${Math.abs(by)}` : '',
        dy != null ? `${(p.deathEra ?? p.death_era) === 'BC' ? 'BC ' : ''}${Math.abs(dy)}` : '',
        p.influence ?? '',
        stats?.politics ?? '',
        stats?.military ?? '',
        stats?.diplomacy ?? '',
        stats?.intellect ?? '',
        stats?.charisma ?? '',
        stats?.administration ?? '',
        summary?.statsAverage ?? '',
        summary?.traitCount ?? '',
      ]
    })
    const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n')
    // BOM — Excel 한글 호환
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    a.href = url
    a.download = `persons-${ts}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <TableWrap>
      <TableToolbar>
        <ToolbarMeta>{sorted.length}명</ToolbarMeta>
        <ExportBtn type="button" onClick={exportCsv} title="현재 정렬·필터 결과를 CSV로 다운로드">
          <FiDownload size={12} /> CSV 내보내기
        </ExportBtn>
      </TableToolbar>
      <Table>
        <thead>
          <tr>
            <Th $w="36px">
              <CheckboxBtn
                type="button"
                aria-label={allInViewSelected ? '전체 선택 해제' : '전체 선택'}
                onClick={() => onToggleAll(allInViewSelected)}
                $checked={allInViewSelected}
              >
                {allInViewSelected ? <FiCheck size={12} /> : <FiSquare size={12} />}
              </CheckboxBtn>
            </Th>
            <SortableTh $active={sortKey === 'name'} $dir={sortDir} onClick={() => onClickHeader('name')}>
              이름
            </SortableTh>
            <SortableTh $active={sortKey === 'country'} $dir={sortDir} onClick={() => onClickHeader('country')}>
              국가
            </SortableTh>
            <SortableTh $active={sortKey === 'dynasty'} $dir={sortDir} onClick={() => onClickHeader('dynasty')}>
              가문
            </SortableTh>
            <SortableTh $active={sortKey === 'lifespan'} $dir={sortDir} onClick={() => onClickHeader('lifespan')}>
              생몰
            </SortableTh>
            <SortableTh $active={sortKey === 'influence'} $dir={sortDir} onClick={() => onClickHeader('influence')} $right>
              영향력
            </SortableTh>
            <SortableTh $active={sortKey === 'eval'} $dir={sortDir} onClick={() => onClickHeader('eval')} $right>
              능력치 평균
            </SortableTh>
            <SortableTh $active={sortKey === 'traits'} $dir={sortDir} onClick={() => onClickHeader('traits')} $right>
              태그
            </SortableTh>
            <Th $w="60px"></Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const checked = selectedIds.has(p.id)
            const summary = evalIndex.get(p.id)
            const fullName = getPersonDisplayName(p)
            const monarch = p.templeName || p.regnalName
            const birthYear = p.birthYear ?? p.birth_year
            const deathYear = p.deathYear ?? p.death_year
            const lifespan =
              birthYear != null
                ? `${(p.birthEra ?? p.birth_era) === 'BC' ? 'BC ' : ''}${Math.abs(birthYear)} – ${
                    deathYear != null
                      ? `${(p.deathEra ?? p.death_era) === 'BC' ? 'BC ' : ''}${Math.abs(deathYear)}`
                      : '現'
                  }`
                : '미상'
            return (
              <Tr
                key={p.id}
                $selected={checked}
                onClick={() => onPersonClick(p.id)}
              >
                <Td onClick={(e) => e.stopPropagation()}>
                  <CheckboxBtn
                    type="button"
                    aria-label={checked ? '선택 해제' : '선택'}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleSelected(p.id, e.shiftKey || e.metaKey || e.ctrlKey)
                    }}
                    $checked={checked}
                  >
                    {checked ? <FiCheck size={12} /> : <FiSquare size={12} />}
                  </CheckboxBtn>
                </Td>
                <Td>
                  <NameStack>
                    <NameTop>
                      <strong>{fullName || '(이름 없음)'}</strong>
                      {p.gender === 'MALE' && <SmallG $g="M">♂</SmallG>}
                      {p.gender === 'FEMALE' && <SmallG $g="F">♀</SmallG>}
                    </NameTop>
                    {monarch && <Sub>♛ {monarch}</Sub>}
                  </NameStack>
                </Td>
                <Td>
                  {p.country?.name ? (
                    <CountryCell>
                      {p.country.flagEmoji && <span>{p.country.flagEmoji}</span>}
                      {p.country.name}
                    </CountryCell>
                  ) : (
                    <Muted>—</Muted>
                  )}
                </Td>
                <Td>{dynastyName(p) || <Muted>—</Muted>}</Td>
                <Td><LifespanCell>{lifespan}</LifespanCell></Td>
                <NumTd>{p.influence != null ? p.influence : <Muted>—</Muted>}</NumTd>
                <NumTd>
                  {summary?.statsAverage != null ? (
                    <strong>{summary.statsAverage}</strong>
                  ) : (
                    <Muted>—</Muted>
                  )}
                </NumTd>
                <NumTd>
                  {summary?.traitCount ? summary.traitCount : <Muted>0</Muted>}
                </NumTd>
                <Td onClick={(e) => e.stopPropagation()}>
                  <RowEditBtn
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onQuickEdit(p.id)
                    }}
                    title={summary?.hasEvaluation ? '평가 수정' : '평가 시작'}
                  >
                    {summary?.hasEvaluation ? (
                      <>
                        <FiTarget size={11} /> 수정
                      </>
                    ) : (
                      <>
                        <FiStar size={11} /> 평가
                      </>
                    )}
                  </RowEditBtn>
                </Td>
              </Tr>
            )
          })}
        </tbody>
      </Table>
      <MobileFallbackHint>
        화면이 좁아 일부 컬럼은 가로 스크롤됩니다. 카드 뷰가 더 보기 편할 수 있습니다.
      </MobileFallbackHint>
    </TableWrap>
  )
}

const TableWrap = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
`

const Th = styled.th<{ $w?: string }>`
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  white-space: nowrap;
  ${({ $w }) => $w && `width: ${$w};`}
  background: ${({ theme }) => theme.colors.background.secondary};
  position: sticky;
  top: 0;
  z-index: 1;
`

const SortableTh = styled(Th)<{ $active?: boolean; $dir?: 'asc' | 'desc'; $right?: boolean }>`
  cursor: pointer;
  user-select: none;
  ${({ $right }) => $right && 'text-align: right;'}
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  ${({ $active, $dir, theme }) =>
    $active &&
    css`
      color: ${theme.colors.active};
      &::after {
        content: '${$dir === 'asc' ? ' ↑' : ' ↓'}';
        font-size: 11px;
      }
    `}
`

const Tr = styled.tr<{ $selected?: boolean }>`
  cursor: pointer;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  transition: background 0.1s;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
  ${({ $selected, theme }) =>
    $selected &&
    css`
      background: ${theme.colors.activeLight};
      &:hover {
        background: ${theme.colors.activeLight};
      }
    `}
`

const Td = styled.td`
  padding: 10px 12px;
  vertical-align: middle;
  color: ${({ theme }) => theme.colors.text.primary};
`

const NumTd = styled(Td)`
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
`

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.6;
`

const NameStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 140px;
`

const NameTop = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const Sub = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SmallG = styled.span<{ $g: 'M' | 'F' }>`
  font-size: 10px;
  font-weight: 700;
  padding: 0 4px;
  border-radius: 999px;
  color: ${({ $g }) => ($g === 'M' ? '#2563eb' : '#db2777')};
  background: ${({ $g }) => ($g === 'M' ? 'rgba(37,99,235,0.1)' : 'rgba(219,39,119,0.1)')};
`

const CountryCell = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`

const LifespanCell = styled.span`
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const CheckboxBtn = styled.button<{ $checked?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  cursor: pointer;
  border: 1px solid ${({ theme, $checked }) =>
    $checked ? theme.colors.active : theme.colors.border.medium};
  background: ${({ theme, $checked }) =>
    $checked ? theme.colors.active : theme.colors.background.primary};
  color: ${({ $checked, theme }) =>
    $checked ? '#fff' : theme.colors.text.tertiary};
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  &:hover {
    border-color: ${({ theme }) => theme.colors.active};
  }
`

const RowEditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: background 0.12s, color 0.12s;
  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
    color: ${({ theme }) => theme.colors.active};
    border-color: ${({ theme }) => theme.colors.active};
  }
`

const TableToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
`

const ToolbarMeta = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ExportBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
    color: ${({ theme }) => theme.colors.active};
    border-color: ${({ theme }) => theme.colors.active};
  }
`

const MobileFallbackHint = styled.p`
  display: none;
  margin: 0;
  padding: 8px 12px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  @media (max-width: 768px) {
    display: block;
  }
`
