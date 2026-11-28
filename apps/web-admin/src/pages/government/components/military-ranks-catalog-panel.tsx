import React, { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiCheck, FiPlus, FiTrash2, FiX } from 'react-icons/fi'

import {
  type CreateMilitaryRankInput,
  MILITARY_RANK_CATEGORY_LABELS,
  type MilitaryBranchCode,
  type MilitaryRankCategory,
  type MilitaryRankDto,
  militaryRankApi,
} from '@/shared/api/military-rank'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { notify } from '@/shared/ui/toast'

import { MILITARY_BRANCH_LABELS } from './government-positions.helpers'
import * as S from './government-positions.styles'

interface MilitaryRanksCatalogPanelProps {
  searchQuery: string
  polityFilter: string
  polityOptions: SearchableSelectOption[]
  creatingRank: boolean
  onCloseCreate: () => void
}

const CATEGORY_ORDER: MilitaryRankCategory[] = [
  'MARSHAL',
  'GENERAL',
  'FIELD_OFFICER',
  'COMPANY_OFFICER',
  'WARRANT_OFFICER',
  'NCO',
  'ENLISTED',
  'TRADITIONAL',
]

export function MilitaryRanksCatalogPanel({
  searchQuery,
  polityFilter,
  polityOptions,
  creatingRank,
  onCloseCreate,
}: MilitaryRanksCatalogPanelProps) {
  const queryClient = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [branchFilter, setBranchFilter] = useState<string>('ALL')
  const [selectedRankId, setSelectedRankId] = useState<string | null>(null)

  const [draftName, setDraftName] = useState('')
  const [draftNameEn, setDraftNameEn] = useState('')
  const [draftNameLocal, setDraftNameLocal] = useState('')
  const [draftAbbr, setDraftAbbr] = useState('')
  const [draftCategory, setDraftCategory] =
    useState<MilitaryRankCategory>('GENERAL')
  const [draftRankOrder, setDraftRankOrder] = useState('10')
  const [draftNatoCode, setDraftNatoCode] = useState('')
  const [draftBranch, setDraftBranch] = useState<string>('')
  const [draftPolity, setDraftPolity] = useState<string>('')
  const [draftDesc, setDraftDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: ranks = [], isLoading } = useQuery({
    queryKey: ['military-ranks', 'catalog-all'],
    queryFn: () => militaryRankApi.list({ includeUniversal: true, limit: 500 }),
    staleTime: 30_000,
  })

  const filteredRanks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const targetPolityId = polityFilter.replace(/^[mh]:/, '')
    const isHistPolity = polityFilter.startsWith('h:')

    return ranks
      .filter((rk) => {
        if (categoryFilter !== 'ALL' && rk.category !== categoryFilter) {
          return false
        }
        if (branchFilter !== 'ALL' && (rk.branch ?? 'JOINT') !== branchFilter) {
          return false
        }
        if (targetPolityId) {
          if (isHistPolity) {
            if (!rk.isUniversal && rk.historicalCountryId !== targetPolityId) {
              return false
            }
          } else if (!rk.isUniversal && rk.countryId !== targetPolityId) {
            return false
          }
        }
        if (q) {
          const hay = [
            rk.name,
            rk.nameEn,
            rk.nameLocal,
            rk.abbreviation,
            rk.natoCode,
            rk.country?.name,
            rk.historicalCountry?.name,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort(
        (left, right) =>
          (left.rankOrder ?? 999) - (right.rankOrder ?? 999) ||
          left.name.localeCompare(right.name, 'ko'),
      )
  }, [ranks, categoryFilter, branchFilter, polityFilter, searchQuery])

  const selectedRank = useMemo<MilitaryRankDto | null>(
    () => ranks.find((rk) => rk.id === selectedRankId) ?? null,
    [ranks, selectedRankId],
  )

  const loadRankIntoForm = (rk: MilitaryRankDto) => {
    setDraftName(rk.name)
    setDraftNameEn(rk.nameEn ?? '')
    setDraftNameLocal(rk.nameLocal ?? '')
    setDraftAbbr(rk.abbreviation ?? '')
    setDraftCategory(rk.category)
    setDraftRankOrder(String(rk.rankOrder ?? 50))
    setDraftNatoCode(rk.natoCode ?? '')
    setDraftBranch(rk.branch ?? '')
    setDraftPolity(
      rk.historicalCountryId
        ? `h:${rk.historicalCountryId}`
        : rk.countryId
          ? `m:${rk.countryId}`
          : '',
    )
    setDraftDesc(rk.description ?? '')
  }

  const startCreate = () => {
    setSelectedRankId(null)
    setDraftName('')
    setDraftNameEn('')
    setDraftNameLocal('')
    setDraftAbbr('')
    setDraftCategory('GENERAL')
    setDraftRankOrder('20')
    setDraftNatoCode('')
    setDraftBranch('')
    setDraftPolity(polityFilter || '')
    setDraftDesc('')
  }

  React.useEffect(() => {
    if (creatingRank) {
      startCreate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatingRank])

  const handleSelectRank = (rk: MilitaryRankDto) => {
    onCloseCreate()
    setSelectedRankId(rk.id)
    loadRankIntoForm(rk)
  }

  const handleSave = async () => {
    const cleanName = draftName.trim()
    if (!cleanName) {
      notify.error('계급명을 입력해 주세요.')
      return
    }
    const isHist = draftPolity.startsWith('h:')
    const cleanPolityId = draftPolity.replace(/^[mh]:/, '') || null
    const payload: CreateMilitaryRankInput = {
      name: cleanName,
      nameEn: draftNameEn.trim() || null,
      nameLocal: draftNameLocal.trim() || null,
      abbreviation: draftAbbr.trim() || null,
      category: draftCategory,
      rankOrder: Number(draftRankOrder) || 50,
      natoCode: draftNatoCode.trim() || null,
      branch: (draftBranch || null) as MilitaryBranchCode | null,
      countryId: !isHist && cleanPolityId ? cleanPolityId : null,
      historicalCountryId: isHist && cleanPolityId ? cleanPolityId : null,
      isUniversal: !cleanPolityId,
      description: draftDesc.trim() || null,
    }

    setSaving(true)
    try {
      if (selectedRank) {
        const updated = await militaryRankApi.update(selectedRank.id, payload)
        await queryClient.invalidateQueries({ queryKey: ['military-ranks'] })
        setSelectedRankId(updated.id)
        notify.success(`‘${updated.name}’ 계급 정본을 수정했습니다.`)
      } else {
        const created = await militaryRankApi.createOrResolve(payload)
        await queryClient.invalidateQueries({ queryKey: ['military-ranks'] })
        onCloseCreate()
        setSelectedRankId(created.id)
        loadRankIntoForm(created)
        notify.success(`‘${created.name}’ 계급 정본을 DB에 등록했습니다.`)
      }
    } catch (err) {
      notify.error(getApiErrorMessage(err, '계급 저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRank) return
    const ok = await confirm({
      title: `‘${selectedRank.name}’ 계급 정본 삭제`,
      message:
        '이 계급을 참조하는 지휘관 재임이나 진급 기록이 없을 때만 삭제할 수 있습니다. 삭제하시겠습니까?',
      confirmLabel: '삭제',
      danger: true,
    })
    if (!ok) return
    setSaving(true)
    try {
      await militaryRankApi.remove(selectedRank.id)
      await queryClient.invalidateQueries({ queryKey: ['military-ranks'] })
      setSelectedRankId(null)
      notify.success(`‘${selectedRank.name}’ 계급을 삭제했습니다.`)
    } catch (err) {
      notify.error(getApiErrorMessage(err, '계급 삭제에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const drawerOpen = creatingRank || Boolean(selectedRank)

  return (
    <>
      <S.SubFilterRow>
        <S.FilterChipGroup role="group" aria-label="군 계급 등급 필터">
          <S.FilterChip
            type="button"
            $active={categoryFilter === 'ALL'}
            onClick={() => setCategoryFilter('ALL')}
          >
            전체 등급 ({ranks.length})
          </S.FilterChip>
          {CATEGORY_ORDER.map((cat) => (
            <S.FilterChip
              key={cat}
              type="button"
              $active={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
            >
              {MILITARY_RANK_CATEGORY_LABELS[cat]}
            </S.FilterChip>
          ))}
        </S.FilterChipGroup>

        <S.InlineSelect
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          aria-label="군종 필터"
        >
          <option value="ALL">모든 군종</option>
          {Object.entries(MILITARY_BRANCH_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </S.InlineSelect>
      </S.SubFilterRow>

      <S.SplitWorkspace $hasDrawer={drawerOpen}>
        <S.LedgerPane>
          <S.LedgerHeaderBand>
            <span>서열</span>
            <span>등급</span>
            <span>계급명 · 원어/영문</span>
            <span data-col="scope">군종 · 적용 국가</span>
            <span style={{ textAlign: 'right' }}>NATO 부호</span>
          </S.LedgerHeaderBand>

          <S.LedgerScrollList>
            {isLoading ? (
              <S.EmptyStateBox>군 계급 정본을 불러오는 중…</S.EmptyStateBox>
            ) : filteredRanks.length === 0 ? (
              <S.EmptyStateBox>
                조건에 맞는 군 계급 정본이 없습니다.
              </S.EmptyStateBox>
            ) : (
              filteredRanks.map((rk) => {
                const subBits = [rk.nameLocal, rk.nameEn, rk.abbreviation]
                  .filter(Boolean)
                  .join(' · ')
                const polityName =
                  rk.historicalCountry?.name ?? rk.country?.name ?? null
                return (
                  <S.LedgerRow
                    key={rk.id}
                    $selected={rk.id === selectedRankId && !creatingRank}
                    onClick={() => handleSelectRank(rk)}
                  >
                    <S.RankNumCell>#{rk.rankOrder}</S.RankNumCell>
                    <div>
                      <S.TypeBadge
                        $tone={
                          rk.category === 'MARSHAL'
                            ? 'amber'
                            : rk.category === 'GENERAL'
                              ? 'orange'
                              : rk.category === 'TRADITIONAL'
                                ? 'violet'
                                : 'slate'
                        }
                      >
                        {MILITARY_RANK_CATEGORY_LABELS[rk.category]}
                      </S.TypeBadge>
                    </div>
                    <S.TitleCol>
                      <S.TitleMainLine>
                        <strong>{rk.name}</strong>
                      </S.TitleMainLine>
                      {subBits ? <S.TitleSubLine>{subBits}</S.TitleSubLine> : null}
                    </S.TitleCol>
                    <S.ScopeChipsCell data-col="scope">
                      <S.ScopePill $kind={rk.isUniversal ? 'universal' : 'polity'}>
                        {rk.isUniversal ? '전역 보편' : (polityName ?? '국가 고유')}
                      </S.ScopePill>
                      {rk.branch ? (
                        <S.ScopePill>
                          {MILITARY_BRANCH_LABELS[rk.branch] ?? rk.branch}
                        </S.ScopePill>
                      ) : null}
                    </S.ScopeChipsCell>
                    <S.UsageCell>
                      {rk.natoCode ? (
                        <S.UsagePill $active>{rk.natoCode}</S.UsagePill>
                      ) : (
                        <S.UsagePill>—</S.UsagePill>
                      )}
                    </S.UsageCell>
                  </S.LedgerRow>
                )
              })
            )}
          </S.LedgerScrollList>
        </S.LedgerPane>

        {drawerOpen ? (
          <S.DetailPane aria-label="군 계급 정본 상세 편집">
            <S.DetailHead>
              <S.DetailTitleBlock>
                <h2>
                  {creatingRank
                    ? '새 군 계급 정본 등록'
                    : (selectedRank?.name ?? '군 계급 편집')}
                </h2>
              </S.DetailTitleBlock>
              <S.ActionBtn
                type="button"
                onClick={() => {
                  onCloseCreate()
                  setSelectedRankId(null)
                }}
              >
                <FiX size={14} />
              </S.ActionBtn>
            </S.DetailHead>

            <S.DetailScrollBody>
              <S.FormFieldGrid>
                <S.FieldBlock>
                  <span className="lbl">계급명 (필수)</span>
                  <S.TextInput
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="예: 원수, 상급대장, 제독"
                  />
                </S.FieldBlock>
                <S.FieldBlock>
                  <span className="lbl">등급 분류</span>
                  <S.InlineSelect
                    style={{ height: 34 }}
                    value={draftCategory}
                    onChange={(e) =>
                      setDraftCategory(e.target.value as MilitaryRankCategory)
                    }
                  >
                    {CATEGORY_ORDER.map((cat) => (
                      <option key={cat} value={cat}>
                        {MILITARY_RANK_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </S.InlineSelect>
                </S.FieldBlock>
              </S.FormFieldGrid>

              <S.FormFieldGrid>
                <S.FieldBlock>
                  <span className="lbl">원어 · 한자 표기</span>
                  <S.TextInput
                    value={draftNameLocal}
                    onChange={(e) => setDraftNameLocal(e.target.value)}
                    placeholder="예: Generalfeldmarschall"
                  />
                </S.FieldBlock>
                <S.FieldBlock>
                  <span className="lbl">영문 표기</span>
                  <S.TextInput
                    value={draftNameEn}
                    onChange={(e) => setDraftNameEn(e.target.value)}
                    placeholder="예: Field Marshal"
                  />
                </S.FieldBlock>
              </S.FormFieldGrid>

              <S.FormFieldGrid>
                <S.FieldBlock>
                  <span className="lbl">서열 순서 (낮을수록 상위)</span>
                  <S.TextInput
                    type="number"
                    value={draftRankOrder}
                    onChange={(e) => setDraftRankOrder(e.target.value)}
                  />
                </S.FieldBlock>
                <S.FieldBlock>
                  <span className="lbl">NATO 비교 부호</span>
                  <S.TextInput
                    value={draftNatoCode}
                    onChange={(e) => setDraftNatoCode(e.target.value)}
                    placeholder="예: OF-10, OF-9"
                  />
                </S.FieldBlock>
              </S.FormFieldGrid>

              <S.FormFieldGrid>
                <S.FieldBlock>
                  <span className="lbl">군종 구분 (비우면 합동·공통)</span>
                  <S.InlineSelect
                    style={{ height: 34 }}
                    value={draftBranch}
                    onChange={(e) => setDraftBranch(e.target.value)}
                  >
                    <option value="">전군 공통</option>
                    {Object.entries(MILITARY_BRANCH_LABELS).map(
                      ([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ),
                    )}
                  </S.InlineSelect>
                </S.FieldBlock>
                <S.FieldBlock>
                  <span className="lbl">약칭</span>
                  <S.TextInput
                    value={draftAbbr}
                    onChange={(e) => setDraftAbbr(e.target.value)}
                    placeholder="예: Gen., Adm."
                  />
                </S.FieldBlock>
              </S.FormFieldGrid>

              <S.FieldBlock>
                <span className="lbl">
                  적용 국가 · 역사정체 (비우면 전 국가 보편 계급)
                </span>
                <SearchableSelect
                  options={[
                    { value: '', label: '전역 보편 계급 (모든 국가 사용 가능)' },
                    ...polityOptions,
                  ]}
                  value={draftPolity}
                  onChange={(val) => setDraftPolity(val)}
                  placeholder="전역 보편 계급 (또는 고유 국가 검색)"
                />
              </S.FieldBlock>

              <S.FieldBlock>
                <span className="lbl">설명 · 비고</span>
                <S.TextArea
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  placeholder="계급 제정 배경 및 비교 등급 설명"
                />
              </S.FieldBlock>
            </S.DetailScrollBody>

            <S.DetailFooter>
              <div>
                {selectedRank ? (
                  <S.ActionBtn
                    type="button"
                    $variant="danger"
                    onClick={() => void handleDelete()}
                    disabled={saving}
                  >
                    <FiTrash2 size={13} />
                    삭제
                  </S.ActionBtn>
                ) : null}
              </div>
              <S.ActionBtn
                type="button"
                $variant="primary"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {creatingRank ? <FiPlus size={14} /> : <FiCheck size={14} />}
                {saving
                  ? '저장 중…'
                  : creatingRank
                    ? '계급 정본 등록'
                    : '변경사항 저장'}
              </S.ActionBtn>
            </S.DetailFooter>
          </S.DetailPane>
        ) : null}
      </S.SplitWorkspace>
    </>
  )
}
