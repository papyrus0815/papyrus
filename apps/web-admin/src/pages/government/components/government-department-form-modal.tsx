import React, { useEffect, useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { useCountries } from '@/features/country/api'
import { useHistoricalCountries } from '@/features/historical-country/use-historical-countries.hook'
import {
  administrationDepartmentApi,
  type AdministrationDepartment,
  type AdministrationDepartmentKind,
  DEPARTMENT_KIND_OPTIONS,
} from '@/shared/api/administration-department'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { Z_INDEX } from '@/shared/styles/z-index'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { notify } from '@/shared/ui/toast'

type EraType = 'BC' | 'AD'

export interface GovernmentDepartmentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (savedDepartmentId?: string) => void
  editingDepartment?: AdministrationDepartment | null
  initialPolityValue?: string
}

function formatPolityRange(polity: {
  startYear?: number | null
  endYear?: number | null
  startEra?: string | null
  endEra?: string | null
}): string | null {
  if (polity.startYear == null && polity.endYear == null) return null
  const startLabel =
    polity.startYear != null
      ? `${polity.startEra === 'BC' ? 'BC ' : ''}${Math.abs(polity.startYear)}`
      : ''
  const endLabel =
    polity.endYear != null
      ? `${polity.endEra === 'BC' ? 'BC ' : ''}${Math.abs(polity.endYear)}`
      : '현재'
  return `${startLabel}~${endLabel}`
}

function toSignedChronologyKey(
  era: EraType,
  year: number,
  month?: number,
  day?: number,
  edge: 'start' | 'end' = 'start',
): number {
  const signedYear = era === 'BC' ? -Math.abs(year) : Math.abs(year)
  const monthNum = month ?? (edge === 'start' ? 1 : 12)
  const dayNum = day ?? (edge === 'start' ? 1 : 31)
  return signedYear * 10000 + monthNum * 100 + dayNum
}

export const GovernmentDepartmentFormModal: React.FC<
  GovernmentDepartmentFormModalProps
> = ({
  isOpen,
  onClose,
  onSaved,
  editingDepartment = null,
  initialPolityValue = '',
}) => {
  const queryClient = useQueryClient()
  const isEditing = Boolean(editingDepartment)

  const { data: countries = [] } = useCountries({ enabled: isOpen })
  const { data: historicalCountries = [] } = useHistoricalCountries({
    enabled: isOpen,
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['administration-department-categories'],
    queryFn: () => administrationDepartmentApi.getCategories(),
    enabled: isOpen,
    staleTime: 120_000,
  })

  const [polityValue, setPolityValue] = useState<string>('')
  const [kind, setKind] = useState<AdministrationDepartmentKind>('MINISTRY')
  const [categoryId, setCategoryId] = useState<string>('')
  const [showNewCategory, setShowNewCategory] = useState<boolean>(false)
  const [newCategoryName, setNewCategoryName] = useState<string>('')

  const [name, setName] = useState<string>('')
  const [abbreviation, setAbbreviation] = useState<string>('')
  const [nameLocal, setNameLocal] = useState<string>('')
  const [nameEn, setNameEn] = useState<string>('')
  const [parentId, setParentId] = useState<string>('')

  const [estEra, setEstEra] = useState<EraType>('AD')
  const [estYear, setEstYear] = useState<string>('')
  const [estMonth, setEstMonth] = useState<string>('')
  const [estDay, setEstDay] = useState<string>('')

  const [abolEra, setAbolEra] = useState<EraType>('AD')
  const [abolYear, setAbolYear] = useState<string>('')
  const [abolMonth, setAbolMonth] = useState<string>('')
  const [abolDay, setAbolDay] = useState<string>('')

  const [headquarters, setHeadquarters] = useState<string>('')
  const [primaryMission, setPrimaryMission] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const polityOptions = useMemo<SearchableSelectOption[]>(() => {
    const modernOpts: SearchableSelectOption[] = [...countries]
      .sort((leftItem, rightItem) =>
        leftItem.name.localeCompare(rightItem.name, 'ko'),
      )
      .map((countryItem) => ({
        value: `m:${countryItem.id}`,
        label: `${countryItem.flagEmoji ?? ''} ${countryItem.name}`.trim(),
        group: '현대 국가',
      }))
    const histOpts: SearchableSelectOption[] = [...historicalCountries]
      .sort((leftItem, rightItem) =>
        leftItem.name.localeCompare(rightItem.name, 'ko'),
      )
      .map((histItem) => {
        const range = formatPolityRange(histItem)
        return {
          value: `h:${histItem.id}`,
          label: range ? `${histItem.name} (${range})` : histItem.name,
          group: '역사적 국가 · 왕조 · 정체',
        }
      })
    return [...modernOpts, ...histOpts]
  }, [countries, historicalCountries])

  const resolvedAxis = useMemo(() => {
    if (polityValue.startsWith('m:')) {
      return {
        countryId: polityValue.slice(2) || null,
        historicalCountryId: null,
      }
    }
    if (polityValue.startsWith('h:')) {
      const histId = polityValue.slice(2)
      const matchedHist = historicalCountries.find(
        (histItem) => histItem.id === histId,
      )
      const linkedModernId =
        matchedHist?.parentModernCountryIds?.[0] ??
        (
          matchedHist as
            | {
                modernCountries?: Array<{ modernCountryId?: string | null }>
                countryId?: string | null
              }
            | undefined
        )?.modernCountries?.[0]?.modernCountryId ??
        (matchedHist as { countryId?: string | null } | undefined)?.countryId ??
        null
      return {
        countryId: linkedModernId,
        historicalCountryId: histId || null,
      }
    }
    return { countryId: null, historicalCountryId: null }
  }, [polityValue, historicalCountries])

  const { data: siblingDepartments = [] } = useQuery({
    queryKey: [
      'dept-form-siblings',
      resolvedAxis.countryId ?? '',
      resolvedAxis.historicalCountryId ?? '',
    ],
    queryFn: () =>
      administrationDepartmentApi.getAll({
        ...(resolvedAxis.historicalCountryId
          ? { historicalCountryId: resolvedAxis.historicalCountryId }
          : resolvedAxis.countryId
            ? { countryId: resolvedAxis.countryId }
            : {}),
        take: 500,
      }),
    enabled:
      isOpen &&
      Boolean(resolvedAxis.countryId || resolvedAxis.historicalCountryId),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!isOpen) return
    setErrorMessage(null)
    setShowNewCategory(false)
    setNewCategoryName('')

    if (editingDepartment) {
      if (editingDepartment.historicalCountryId) {
        setPolityValue(`h:${editingDepartment.historicalCountryId}`)
      } else if (editingDepartment.countryId) {
        setPolityValue(`m:${editingDepartment.countryId}`)
      } else {
        setPolityValue('')
      }
      setKind(editingDepartment.kind)
      setCategoryId(editingDepartment.categoryId ?? '')
      setName(editingDepartment.name ?? '')
      setAbbreviation(editingDepartment.abbreviation ?? '')
      setNameLocal(editingDepartment.nameLocal ?? '')
      setNameEn(editingDepartment.nameEn ?? '')
      setParentId(editingDepartment.parentId ?? '')

      if (editingDepartment.established) {
        setEstEra(editingDepartment.established.era)
        setEstYear(String(Math.abs(editingDepartment.established.year)))
        setEstMonth(
          editingDepartment.established.month != null
            ? String(editingDepartment.established.month)
            : '',
        )
        setEstDay(
          editingDepartment.established.day != null
            ? String(editingDepartment.established.day)
            : '',
        )
      } else {
        setEstEra('AD')
        setEstYear('')
        setEstMonth('')
        setEstDay('')
      }

      if (editingDepartment.abolished) {
        setAbolEra(editingDepartment.abolished.era)
        setAbolYear(String(Math.abs(editingDepartment.abolished.year)))
        setAbolMonth(
          editingDepartment.abolished.month != null
            ? String(editingDepartment.abolished.month)
            : '',
        )
        setAbolDay(
          editingDepartment.abolished.day != null
            ? String(editingDepartment.abolished.day)
            : '',
        )
      } else {
        setAbolEra('AD')
        setAbolYear('')
        setAbolMonth('')
        setAbolDay('')
      }

      setHeadquarters(editingDepartment.headquarters ?? '')
      setPrimaryMission(editingDepartment.primaryMission ?? '')
      setDescription(editingDepartment.description ?? '')
      return
    }

    setPolityValue(initialPolityValue || '')
    setKind('MINISTRY')
    setCategoryId('')
    setName('')
    setAbbreviation('')
    setNameLocal('')
    setNameEn('')
    setParentId('')
    setEstEra('AD')
    setEstYear('')
    setEstMonth('')
    setEstDay('')
    setAbolEra('AD')
    setAbolYear('')
    setAbolMonth('')
    setAbolDay('')
    setHeadquarters('')
    setPrimaryMission('')
    setDescription('')
  }, [isOpen, editingDepartment, initialPolityValue])

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      const trimmedCat = newCategoryName.trim()
      if (!trimmedCat) {
        throw new Error('새 기관 분류 이름을 입력해주세요.')
      }
      return administrationDepartmentApi.createCategory({ name: trimmedCat })
    },
    onSuccess: (createdCat) => {
      setCategoryId(createdCat.id)
      setShowNewCategory(false)
      setNewCategoryName('')
      void queryClient.invalidateQueries({
        queryKey: ['administration-department-categories'],
      })
    },
    onError: (mutationError) => {
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  const saveDepartmentMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedAxis.countryId && !resolvedAxis.historicalCountryId) {
        throw new Error('소속 국가 또는 역사적 정치체를 선택해주세요.')
      }
      const trimmedName = name.trim()
      if (!trimmedName) {
        throw new Error('부처 · 국가기관 이름을 입력해주세요.')
      }

      let establishedInfo:
        | { era: EraType; year: number; month?: number; day?: number }
        | null
        | undefined = undefined
      if (estYear.trim()) {
        const parsedEstYear = Number(estYear.trim())
        if (!Number.isInteger(parsedEstYear) || parsedEstYear <= 0) {
          throw new Error('설립 연도를 자연수로 입력해주세요.')
        }
        establishedInfo = {
          era: estEra,
          year: parsedEstYear,
          ...(estMonth.trim() ? { month: Number(estMonth.trim()) } : {}),
          ...(estDay.trim() ? { day: Number(estDay.trim()) } : {}),
        }
      } else if (isEditing) {
        establishedInfo = null
      }

      let abolishedInfo:
        | { era: EraType; year: number; month?: number; day?: number }
        | null
        | undefined = undefined
      if (abolYear.trim()) {
        const parsedAbolYear = Number(abolYear.trim())
        if (!Number.isInteger(parsedAbolYear) || parsedAbolYear <= 0) {
          throw new Error('폐지 연도를 자연수로 입력해주세요.')
        }
        abolishedInfo = {
          era: abolEra,
          year: parsedAbolYear,
          ...(abolMonth.trim() ? { month: Number(abolMonth.trim()) } : {}),
          ...(abolDay.trim() ? { day: Number(abolDay.trim()) } : {}),
        }
      } else if (isEditing) {
        abolishedInfo = null
      }

      if (establishedInfo && abolishedInfo) {
        const startKey = toSignedChronologyKey(
          establishedInfo.era,
          establishedInfo.year,
          establishedInfo.month,
          establishedInfo.day,
          'start',
        )
        const endKey = toSignedChronologyKey(
          abolishedInfo.era,
          abolishedInfo.year,
          abolishedInfo.month,
          abolishedInfo.day,
          'end',
        )
        if (endKey < startKey) {
          throw new Error('폐지 시점이 설립 시점보다 앞설 수 없습니다.')
        }
      }

      const payload = {
        countryId: resolvedAxis.countryId,
        historicalCountryId: resolvedAxis.historicalCountryId,
        kind,
        categoryId: categoryId || null,
        parentId: parentId || null,
        name: trimmedName,
        abbreviation: abbreviation.trim() || null,
        nameLocal: nameLocal.trim() || null,
        nameEn: nameEn.trim() || null,
        headquarters: headquarters.trim() || null,
        primaryMission: primaryMission.trim() || null,
        description: description.trim() || null,
        ...(establishedInfo !== undefined ? { establishedInfo } : {}),
        ...(abolishedInfo !== undefined ? { abolishedInfo } : {}),
      }

      if (isEditing && editingDepartment?.id) {
        return administrationDepartmentApi.update(editingDepartment.id, payload)
      }
      return administrationDepartmentApi.create(payload)
    },
    onSuccess: (savedDept) => {
      void queryClient.invalidateQueries({ queryKey: ['global-departments'] })
      void queryClient.invalidateQueries({
        queryKey: ['global-department-detail'],
      })
      void queryClient.invalidateQueries({
        queryKey: ['administration-departments'],
      })
      notify.success(
        isEditing
          ? '부처 · 국가기관 정보가 수정되었습니다.'
          : '새 부처 · 국가기관이 등록되었습니다.',
      )
      onSaved?.(savedDept.id)
      onClose()
    },
    onError: (mutationError) => {
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  if (!isOpen) return null

  const availableParents = siblingDepartments.filter(
    (deptItem) => deptItem.id !== editingDepartment?.id,
  )

  return createPortal(
    <Backdrop onMouseDown={onClose}>
      <ModalCard onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}>
        <HeaderBar>
          <HeaderTitleGroup>
            <ContextBadge>
              {isEditing ? '중앙부처 · 국가기관 수정' : '새 중앙부처 · 국가기관 등록'}
            </ContextBadge>
            <HeaderTitle>
              {isEditing ? editingDepartment?.name : '부처 · 국가기관 원스톱 등록'}
            </HeaderTitle>
          </HeaderTitleGroup>
          <CloseButton type="button" onClick={onClose} aria-label="닫기">
            <FiX size={18} />
          </CloseButton>
        </HeaderBar>

        <BodyScroll>
          {errorMessage ? <ErrorBanner>{errorMessage}</ErrorBanner> : null}

          <FieldBlock>
            <LabelRow>
              <FieldLabel>
                소속 국가 · 시대 정치체 <RequiredMark>*</RequiredMark>
              </FieldLabel>
            </LabelRow>
            <SearchableSelect
              options={polityOptions}
              value={polityValue}
              onChange={(nextVal) => {
                setPolityValue(nextVal)
                setParentId('')
              }}
              placeholder="국가 또는 역사적 정치체 검색 (예: 대한민국, 일본, 조선, 독일 제국...)"
              searchPlaceholder="국가명 검색..."
            />
          </FieldBlock>

          <FieldBlock>
            <LabelRow>
              <FieldLabel>기관 종류</FieldLabel>
            </LabelRow>
            <KindPillRow>
              {DEPARTMENT_KIND_OPTIONS.map((kindOption) => (
                <KindPill
                  key={kindOption.value}
                  type="button"
                  $active={kind === kindOption.value}
                  onClick={() => setKind(kindOption.value)}
                >
                  {kindOption.label}
                </KindPill>
              ))}
            </KindPillRow>
          </FieldBlock>

          <TwoColGrid>
            <FieldBlock>
              <LabelRow>
                <FieldLabel>
                  기관명 (한국어) <RequiredMark>*</RequiredMark>
                </FieldLabel>
              </LabelRow>
              <TextInput
                value={name}
                onChange={(changeEvent) => setName(changeEvent.target.value)}
                placeholder="예: 국방부, 외무성, 제국전쟁성, 병조"
              />
            </FieldBlock>

            <FieldBlock>
              <LabelRow>
                <FieldLabel>약칭 (선택)</FieldLabel>
              </LabelRow>
              <TextInput
                value={abbreviation}
                onChange={(changeEvent) =>
                  setAbbreviation(changeEvent.target.value)
                }
                placeholder="예: 국방부, MOFA, CIA, RSHA"
              />
            </FieldBlock>
          </TwoColGrid>

          <TwoColGrid>
            <FieldBlock>
              <LabelRow>
                <FieldLabel>원어 · 한자 표기</FieldLabel>
              </LabelRow>
              <TextInput
                value={nameLocal}
                onChange={(changeEvent) =>
                  setNameLocal(changeEvent.target.value)
                }
                placeholder="예: 外務省, 兵曹, Reichskriegsministerium"
              />
            </FieldBlock>

            <FieldBlock>
              <LabelRow>
                <FieldLabel>영문 표기</FieldLabel>
              </LabelRow>
              <TextInput
                value={nameEn}
                onChange={(changeEvent) => setNameEn(changeEvent.target.value)}
                placeholder="예: Ministry of Foreign Affairs"
              />
            </FieldBlock>
          </TwoColGrid>

          <TwoColGrid>
            <FieldBlock>
              <LabelRow>
                <FieldLabel>공통 직능 분류</FieldLabel>
                <InlineLinkBtn
                  type="button"
                  onClick={() => setShowNewCategory((prev) => !prev)}
                >
                  <FiPlus size={11} />
                  {showNewCategory ? '기존 분류 선택' : '새 분류 추가'}
                </InlineLinkBtn>
              </LabelRow>
              {showNewCategory ? (
                <InlineAddRow>
                  <TextInput
                    value={newCategoryName}
                    onChange={(changeEvent) =>
                      setNewCategoryName(changeEvent.target.value)
                    }
                    placeholder="예: 국방·군무, 외교, 재정"
                  />
                  <SmallActionBtn
                    type="button"
                    disabled={createCategoryMutation.isPending}
                    onClick={() => createCategoryMutation.mutate()}
                  >
                    추가
                  </SmallActionBtn>
                </InlineAddRow>
              ) : (
                <SelectInput
                  value={categoryId}
                  onChange={(changeEvent) =>
                    setCategoryId(changeEvent.target.value)
                  }
                >
                  <option value="">분류 미지정</option>
                  {categories.map((catItem) => (
                    <option key={catItem.id} value={catItem.id}>
                      {catItem.name}
                    </option>
                  ))}
                </SelectInput>
              )}
            </FieldBlock>

            <FieldBlock>
              <LabelRow>
                <FieldLabel>상위 기관 (선택)</FieldLabel>
              </LabelRow>
              <SelectInput
                value={parentId}
                onChange={(changeEvent) => setParentId(changeEvent.target.value)}
              >
                <option value="">최상위 독립 기관</option>
                {availableParents.map((parentDept) => (
                  <option key={parentDept.id} value={parentDept.id}>
                    {parentDept.name}
                  </option>
                ))}
              </SelectInput>
            </FieldBlock>
          </TwoColGrid>

          <FieldBlock>
            <LabelRow>
              <FieldLabel>설립 · 폐지 시기 (선택)</FieldLabel>
              <FieldHint>폐지 연도를 비워두면 현존 기관으로 표시됩니다</FieldHint>
            </LabelRow>
            <TwoColGrid>
              <DateCard>
                <DateCardHeader>
                  <span>설립 시기</span>
                  <EraToggle>
                    <EraBtn
                      type="button"
                      $active={estEra === 'BC'}
                      onClick={() => setEstEra('BC')}
                    >
                      BC
                    </EraBtn>
                    <EraBtn
                      type="button"
                      $active={estEra === 'AD'}
                      onClick={() => setEstEra('AD')}
                    >
                      AD
                    </EraBtn>
                  </EraToggle>
                </DateCardHeader>
                <YmdRow>
                  <TextInput
                    type="number"
                    min={1}
                    value={estYear}
                    onChange={(changeEvent) =>
                      setEstYear(changeEvent.target.value)
                    }
                    placeholder="연도"
                  />
                  <TextInput
                    type="number"
                    min={1}
                    max={12}
                    value={estMonth}
                    onChange={(changeEvent) =>
                      setEstMonth(changeEvent.target.value)
                    }
                    placeholder="월"
                  />
                  <TextInput
                    type="number"
                    min={1}
                    max={31}
                    value={estDay}
                    onChange={(changeEvent) =>
                      setEstDay(changeEvent.target.value)
                    }
                    placeholder="일"
                  />
                </YmdRow>
              </DateCard>

              <DateCard>
                <DateCardHeader>
                  <span>폐지 · 해체 시기</span>
                  <EraToggle>
                    <EraBtn
                      type="button"
                      $active={abolEra === 'BC'}
                      onClick={() => setAbolEra('BC')}
                    >
                      BC
                    </EraBtn>
                    <EraBtn
                      type="button"
                      $active={abolEra === 'AD'}
                      onClick={() => setAbolEra('AD')}
                    >
                      AD
                    </EraBtn>
                  </EraToggle>
                </DateCardHeader>
                <YmdRow>
                  <TextInput
                    type="number"
                    min={1}
                    value={abolYear}
                    onChange={(changeEvent) =>
                      setAbolYear(changeEvent.target.value)
                    }
                    placeholder="현존 시 비움"
                  />
                  <TextInput
                    type="number"
                    min={1}
                    max={12}
                    value={abolMonth}
                    onChange={(changeEvent) =>
                      setAbolMonth(changeEvent.target.value)
                    }
                    placeholder="월"
                  />
                  <TextInput
                    type="number"
                    min={1}
                    max={31}
                    value={abolDay}
                    onChange={(changeEvent) =>
                      setAbolDay(changeEvent.target.value)
                    }
                    placeholder="일"
                  />
                </YmdRow>
              </DateCard>
            </TwoColGrid>
          </FieldBlock>

          <TwoColGrid>
            <FieldBlock>
              <LabelRow>
                <FieldLabel>본부 · 청사 소재지</FieldLabel>
              </LabelRow>
              <TextInput
                value={headquarters}
                onChange={(changeEvent) =>
                  setHeadquarters(changeEvent.target.value)
                }
                placeholder="예: 서울 정부서울청사, 도쿄 가스미가세키"
              />
            </FieldBlock>

            <FieldBlock>
              <LabelRow>
                <FieldLabel>핵심 관장 임무</FieldLabel>
              </LabelRow>
              <TextInput
                value={primaryMission}
                onChange={(changeEvent) =>
                  setPrimaryMission(changeEvent.target.value)
                }
                placeholder="예: 외교 정책 수립 및 조약 체결 총괄"
              />
            </FieldBlock>
          </TwoColGrid>

          <FieldBlock>
            <LabelRow>
              <FieldLabel>연혁 · 기관 설명 (선택)</FieldLabel>
            </LabelRow>
            <TextArea
              rows={2}
              value={description}
              onChange={(changeEvent) =>
                setDescription(changeEvent.target.value)
              }
              placeholder="설립 배경, 주요 조직 개편 연혁 등을 자유롭게 기록하세요"
            />
          </FieldBlock>
        </BodyScroll>

        <FooterBar>
          <CancelBtn type="button" onClick={onClose}>
            취소
          </CancelBtn>
          <SubmitBtn
            type="button"
            disabled={saveDepartmentMutation.isPending}
            onClick={() => {
              setErrorMessage(null)
              saveDepartmentMutation.mutate()
            }}
          >
            {saveDepartmentMutation.isPending
              ? '저장 중...'
              : isEditing
                ? '수정 저장'
                : '기관 등록'}
          </SubmitBtn>
        </FooterBar>
      </ModalCard>
    </Backdrop>,
    document.body,
  )
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.modal};
  background: rgba(15, 23, 42, 0.56);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`

const ModalCard = styled.div`
  width: min(640px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.28);
  overflow: hidden;
`

const HeaderBar = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px 13px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const HeaderTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const ContextBadge = styled.span`
  align-self: flex-start;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}15`};
`

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
`

const CloseButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
  }
`

const BodyScroll = styled.div`
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const ErrorBanner = styled.div`
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.25);
`

const FieldBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const FieldLabel = styled.label`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

const FieldHint = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const RequiredMark = styled.span`
  color: #ef4444;
`

const KindPillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const KindPill = styled.button<{ $active: boolean }>`
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) =>
    $active ? `${theme.colors.primary}18` : theme.colors.surface};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text};
`

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const TextInput = styled.input`
  width: 100%;
  padding: 8px 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 13px;
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const TextArea = styled.textarea`
  width: 100%;
  padding: 8px 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 13px;
  box-sizing: border-box;
  resize: vertical;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const SelectInput = styled.select`
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 12.5px;
  box-sizing: border-box;
`

const InlineLinkBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
`

const InlineAddRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
`

const SmallActionBtn = styled.button`
  padding: 0 11px;
  border-radius: 8px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
`

const DateCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 9px 10px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`

const DateCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const EraToggle = styled.div`
  display: inline-flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
`

const EraBtn = styled.button<{ $active: boolean }>`
  padding: 2px 7px;
  font-size: 10.5px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.background};
  color: ${({ theme, $active }) =>
    $active ? '#ffffff' : theme.colors.textSecondary};
`

const YmdRow = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 5px;
`

const FooterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`

const CancelBtn = styled.button`
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`

const SubmitBtn = styled.button`
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
