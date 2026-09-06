import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiSearch } from 'react-icons/fi'
import styled from 'styled-components'

import { getAllEvents } from '@/shared/api/events'
import { companyApi } from '@/shared/api/company'
import { treatyApi } from '@/shared/api/treaty'
import { Modal } from '@/shared/ui/modal'

/**
 * 교역 흐름에 **왜 그 교역이 있었는지**를 거는 피커.
 *
 * 아편전쟁 ↔ 아편 수입, 강화도조약 ↔ 부산 개항, 동인도회사 ↔ 차 — 셋 다 성격은
 * 다르지만 "목록에서 하나 고른다"는 조작은 같아, 종류만 바꿔 끼우는 한 모달로 뒀다.
 * 종류마다 모달을 따로 만들면 같은 행 안에서 생김새가 갈린다.
 */
export type TradeLinkKind = 'event' | 'treaty' | 'company'

export interface TradeLinkSelection {
  id: string
  name: string
}

interface TradeLinkPickerProps {
  kind: TradeLinkKind | null
  onClose: () => void
  onSelect: (picked: TradeLinkSelection) => void
}

const KIND_META: Record<
  TradeLinkKind,
  { title: string; placeholder: string; empty: string }
> = {
  event: {
    title: '관련 사건 선택',
    placeholder: '사건명 검색 (예: 아편전쟁)',
    empty: '등록된 사건이 없습니다.',
  },
  treaty: {
    title: '관련 조약 선택',
    placeholder: '조약명 검색 (예: 강화도조약)',
    empty: '등록된 조약이 없습니다.',
  },
  company: {
    title: '관련 기업 선택',
    placeholder: '기업명 검색 (예: 동인도회사)',
    empty: '등록된 기업이 없습니다.',
  },
}

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  color: ${({ theme }) => theme.colors.text.tertiary};

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.primary};
    outline: none;
    &::placeholder {
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
  }
`

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  max-height: min(56vh, 400px);
  overflow-y: auto;
`

const Row = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13.5px;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.colors.hover};
    outline: none;
  }
`

const RowMeta = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Hint = styled.p`
  margin: 0;
  padding: 24px 16px;
  text-align: center;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

interface PickerRow {
  id: string
  name: string
  meta: string | null
}

/** 연도만 떼어 부제로 쓴다 — 같은 이름의 조약·사건이 여럿일 때 이것만으로 갈린다. */
function yearOf(value: string | null | undefined): string | null {
  if (!value) return null
  const matched = /^(-?\d{1,6})-/.exec(value)
  if (!matched) return null
  const year = Number(matched[1])
  if (!Number.isFinite(year)) return null
  return year < 0 ? `기원전 ${Math.abs(year)}년` : `${year}년`
}

export function TradeLinkPicker({
  kind,
  onClose,
  onSelect,
}: TradeLinkPickerProps) {
  const [keyword, setKeyword] = useState('')

  const query = useQuery<PickerRow[]>({
    queryKey: ['trade-link-picker', kind],
    enabled: kind != null,
    queryFn: async () => {
      if (kind === 'event') {
        const events = await getAllEvents()
        return events.map((event) => ({
          id: event.id,
          name: event.title,
          meta: yearOf(event.startDate),
        }))
      }
      if (kind === 'treaty') {
        const response = await treatyApi.getAll({ take: 300 })
        return response.items.map((treaty) => ({
          id: treaty.id,
          name: treaty.name,
          meta: yearOf(treaty.signDate),
        }))
      }
      const companies = await companyApi.getAll()
      return companies.map((company) => ({
        id: company.id,
        name: company.name,
        meta: company.country?.name ?? company.historicalCountry?.name ?? null,
      }))
    },
  })

  const rows = useMemo(() => {
    const all = query.data ?? []
    const needle = keyword.trim().toLowerCase()
    if (!needle) return all.slice(0, 200)
    return all
      .filter((row) => row.name.toLowerCase().includes(needle))
      .slice(0, 200)
  }, [query.data, keyword])

  if (!kind) return null
  const meta = KIND_META[kind]

  return (
    <Modal isOpen onClose={onClose} title={meta.title} size="narrow">
      <SearchRow>
        <FiSearch aria-hidden />
        <input
          autoFocus
          value={keyword}
          placeholder={meta.placeholder}
          aria-label={meta.placeholder}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </SearchRow>
      {query.isLoading ? (
        <Hint>불러오는 중…</Hint>
      ) : query.isError ? (
        <Hint>목록을 불러오지 못했습니다.</Hint>
      ) : rows.length === 0 ? (
        <Hint>{keyword.trim() ? '검색 결과가 없습니다.' : meta.empty}</Hint>
      ) : (
        <List>
          {rows.map((row) => (
            <Row
              key={row.id}
              type="button"
              onClick={() => {
                onSelect({ id: row.id, name: row.name })
                onClose()
              }}
            >
              <span>{row.name}</span>
              {row.meta && <RowMeta>{row.meta}</RowMeta>}
            </Row>
          ))}
        </List>
      )}
    </Modal>
  )
}
