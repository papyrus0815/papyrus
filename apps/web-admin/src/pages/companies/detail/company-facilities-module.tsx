import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FiMapPin, FiPlus, FiTrash2 } from 'react-icons/fi'

import type {
  CompanyFacilityInput,
  CompanyFacilitySummary,
  FacilityType,
  UpdateCompanyInput,
} from '@/shared/api/company'
import { isVisuallyEmptyRichText } from '@/shared/lib/rich-text-read-view'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  InlineDate,
  InlineRichText,
  InlineSelect,
  type InlineSelectOption,
  InlineText,
} from '@/shared/ui/inline-edit'

import * as S from './company-detail.styles'

const FACILITY_TYPE_OPTIONS: InlineSelectOption[] = [
  { value: 'HEADQUARTERS', label: '본사' },
  { value: 'FACTORY', label: '공장' },
  { value: 'RND', label: '연구소' },
  { value: 'OFFICE', label: '사무소' },
  { value: 'OTHER', label: '기타' },
]

interface FacilityRow {
  key: string
  serverId?: string
  facilityType: string
  name: string
  address: string
  openedAt: string | null
  closedAt: string | null
  constructionBackground: string
  /* 입력 컨트롤 없는 보존 필드 — 기존 값을 PUT에 그대로 실어 보존. */
  note: string | null
  constructionStartDate: string | null
  constructionEndDate: string | null
  cityId: string | null
  cityName: string | null
  administrativeDivisionId: string | null
}

interface CompanyFacilitiesModuleProps {
  facilities: CompanyFacilitySummary[]
  onPatch: (patch: UpdateCompanyInput) => void
  onPersonClick?: (personId: string) => void
}

/**
 * 시설 인라인 편집 — 유형·이름·주소·운영기간·건설 배경을 그 자리에서 수정.
 *
 * 도시/행정구역은 v1에서 *읽기 전용*으로 표시하고 PUT에 그대로 실어 보존한다
 * (도시 피커 인라인화는 후속). 서버 delete-and-recreate라 변경 시 전체 배열 PUT.
 */
export function CompanyFacilitiesModule({
  facilities,
  onPatch,
  onPersonClick,
}: CompanyFacilitiesModuleProps) {
  const counterRef = useRef(0)
  const nextKey = useCallback(
    () => `facility-${Date.now()}-${++counterRef.current}`,
    [],
  )

  const serverRows = useMemo(() => facilities ?? [], [facilities])

  const toRow = useCallback(
    (facility: CompanyFacilitySummary): FacilityRow => ({
      key: nextKey(),
      serverId: facility.id,
      facilityType: facility.facilityType ?? '',
      name: facility.name ?? '',
      address: facility.address ?? '',
      openedAt: facility.openedAt,
      closedAt: facility.closedAt,
      constructionBackground: facility.constructionBackground ?? '',
      note: facility.note,
      constructionStartDate: facility.constructionStartDate,
      constructionEndDate: facility.constructionEndDate,
      cityId: facility.city?.id ?? null,
      cityName: facility.city?.name ?? null,
      administrativeDivisionId: facility.administrativeDivision?.id ?? null,
    }),
    [nextKey],
  )

  const [rows, setRows] = useState<FacilityRow[]>(() => serverRows.map(toRow))

  useEffect(() => {
    setRows((prev) => syncRows(prev, serverRows, toRow))
  }, [serverRows, toRow])

  const commitRows = (next: FacilityRow[]) => {
    setRows(next)
    const cleaned: CompanyFacilityInput[] = next
      .filter(
        (row) =>
          row.name.trim() ||
          row.facilityType ||
          row.address.trim() ||
          !isVisuallyEmptyRichText(row.constructionBackground) ||
          row.openedAt ||
          row.closedAt,
      )
      .map((row) => ({
        facilityType: (row.facilityType || null) as FacilityType | null,
        name: row.name.trim() || null,
        address: row.address.trim() || null,
        openedAt: row.openedAt,
        closedAt: row.closedAt,
        constructionBackground: isVisuallyEmptyRichText(
          row.constructionBackground,
        )
          ? null
          : row.constructionBackground,
        note: row.note,
        constructionStartDate: row.constructionStartDate,
        constructionEndDate: row.constructionEndDate,
        cityId: row.cityId,
        administrativeDivisionId: row.administrativeDivisionId,
      }))
    onPatch({ facilities: cleaned })
  }

  const addRow = () => {
    setRows((arr) => [
      ...arr,
      {
        key: nextKey(),
        facilityType: '',
        name: '',
        address: '',
        openedAt: null,
        closedAt: null,
        constructionBackground: '',
        note: null,
        constructionStartDate: null,
        constructionEndDate: null,
        cityId: null,
        cityName: null,
        administrativeDivisionId: null,
      },
    ])
  }

  const updateRow = (idx: number, patch: Partial<FacilityRow>) => {
    commitRows(rows.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  const removeRow = async (idx: number) => {
    const row = rows[idx]
    if (!row) return
    const hasContent =
      !!row.name.trim() ||
      !!row.facilityType ||
      !!row.address.trim() ||
      !isVisuallyEmptyRichText(row.constructionBackground) ||
      !!row.openedAt ||
      !!row.closedAt
    if (
      hasContent &&
      !(await confirm({
        title: '시설 삭제',
        message: '이 시설 항목을 삭제할까요? 되돌릴 수 없습니다.',
        confirmLabel: '삭제',
        danger: true,
      }))
    ) {
      return
    }
    commitRows(rows.filter((entry) => entry.key !== row.key))
  }

  return (
    <S.Section id="company-facilities">
      <S.SectionHeader>
        <S.SectionTitle>시설</S.SectionTitle>
        {rows.length > 0 && (
          <S.SectionSubtitle>{rows.length}곳</S.SectionSubtitle>
        )}
      </S.SectionHeader>

      {rows.length === 0 ? (
        <S.EmptyState>
          본사·공장·연구소 등 시설을 기록할 수 있습니다.
        </S.EmptyState>
      ) : (
        <S.RowStack>
          {rows.map((row, idx) => (
            <S.Row key={row.key}>
              <S.RowHeader>
                <S.RowTitleHost>
                  <InlineText
                    value={row.name}
                    onSave={(next) => updateRow(idx, { name: next })}
                    placeholder="시설명"
                    label="시설명"
                  />
                </S.RowTitleHost>
                <S.ManageActions>
                  <S.IconBtn
                    type="button"
                    onClick={() => void removeRow(idx)}
                    aria-label="시설 삭제"
                    $danger
                  >
                    <FiTrash2 />
                  </S.IconBtn>
                </S.ManageActions>
              </S.RowHeader>

              <S.RowMetaLine>
                <span>
                  <S.RowFieldLabel>유형</S.RowFieldLabel>
                  <InlineSelect
                    value={row.facilityType}
                    options={FACILITY_TYPE_OPTIONS}
                    onSave={(next) => updateRow(idx, { facilityType: next })}
                    placeholder="유형 선택"
                    label="시설 유형"
                  />
                </span>
                <span>
                  <S.RowFieldLabel>주소</S.RowFieldLabel>
                  <InlineText
                    value={row.address}
                    onSave={(next) => updateRow(idx, { address: next })}
                    placeholder="주소 미입력"
                    label="주소"
                  />
                </span>
                {row.cityName && (
                  <span>
                    <FiMapPin size={12} style={{ opacity: 0.6, marginRight: 4 }} />
                    {row.cityName}
                  </span>
                )}
              </S.RowMetaLine>

              <S.RowMetaLine>
                <span>
                  <S.RowFieldLabel>개장</S.RowFieldLabel>
                  <InlineDate
                    value={row.openedAt}
                    onSave={(next) => updateRow(idx, { openedAt: next })}
                    emptyLabel="미입력"
                    pickerTitle="개장일 선택"
                    blockBc
                    label="개장일"
                  />
                </span>
                <span>
                  <S.RowFieldLabel>폐장</S.RowFieldLabel>
                  <InlineDate
                    value={row.closedAt}
                    onSave={(next) => updateRow(idx, { closedAt: next })}
                    emptyLabel="미입력"
                    pickerTitle="폐장일 선택"
                    blockBc
                    label="폐장일"
                  />
                </span>
              </S.RowMetaLine>

              <S.RowNarrative>
                <S.RowFieldLabel>건설 배경</S.RowFieldLabel>
                <InlineRichText
                  value={row.constructionBackground}
                  onSave={(next) =>
                    updateRow(idx, { constructionBackground: next })
                  }
                  placeholder="건설 배경·사유 — 인물·사건을 인라인으로 링크할 수 있습니다."
                  onPersonClick={onPersonClick}
                  stickyEditButton={false}
                  label="건설 배경"
                />
              </S.RowNarrative>

              <S.RowNarrative>
                <S.RowFieldLabel>메모</S.RowFieldLabel>
                <InlineRichText
                  value={row.note ?? ''}
                  onSave={(next) =>
                    updateRow(idx, {
                      note: isVisuallyEmptyRichText(next) ? null : next,
                    })
                  }
                  placeholder="추가 메모 — 운영·이슈 등"
                  onPersonClick={onPersonClick}
                  stickyEditButton={false}
                />
              </S.RowNarrative>
            </S.Row>
          ))}
        </S.RowStack>
      )}

      <S.AddButton type="button" onClick={addRow}>
        <FiPlus /> 시설 추가
      </S.AddButton>
    </S.Section>
  )
}

/** server↔로컬 키 보존 동기화(연혁과 동일 전략, name/type/주소 기준 매칭). */
function syncRows(
  prev: FacilityRow[],
  server: CompanyFacilitySummary[],
  toRow: (facility: CompanyFacilitySummary) => FacilityRow,
): FacilityRow[] {
  if (prev.length === server.length) {
    return server.map((srv, i) => {
      const p = prev[i]
      const prevIsAhead =
        p.serverId === undefined ||
        (p.serverId !== srv.id &&
          (p.name !== (srv.name ?? '') ||
            p.facilityType !== (srv.facilityType ?? '') ||
            p.address !== (srv.address ?? '') ||
            p.constructionBackground !== (srv.constructionBackground ?? '')))
      if (prevIsAhead) return { ...p, serverId: srv.id }
      return { ...toRow(srv), key: p.key }
    })
  }

  const prevUsed = new Array<boolean>(prev.length).fill(false)
  const next: FacilityRow[] = []
  for (const srv of server) {
    let matchedIdx = prev.findIndex(
      (p, i) => !prevUsed[i] && p.serverId === srv.id,
    )
    if (matchedIdx < 0) {
      matchedIdx = prev.findIndex(
        (p, i) =>
          !prevUsed[i] &&
          p.name === (srv.name ?? '') &&
          p.facilityType === (srv.facilityType ?? ''),
      )
    }
    if (matchedIdx >= 0) {
      prevUsed[matchedIdx] = true
      next.push({ ...toRow(srv), key: prev[matchedIdx].key })
    } else {
      next.push(toRow(srv))
    }
  }
  for (let i = 0; i < prev.length; i++) {
    if (!prevUsed[i]) next.push(prev[i])
  }
  return next
}
