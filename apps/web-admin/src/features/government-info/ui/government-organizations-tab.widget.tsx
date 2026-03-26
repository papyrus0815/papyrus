import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { FiGrid, FiInfo, FiPlus, FiSearch, FiX } from 'react-icons/fi'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  ORGANIZATION_SCOPE_OPTIONS,
  ORGANIZATION_TYPE_LABEL,
  ORGANIZATION_TYPE_OPTIONS,
} from '@/features/government-info/model/organization-tab.constants'
import { GOV_MAIN_COLOR as MAIN } from '@/features/government-info/model/constants'
import { apiConnection } from '@/shared/api/client'
import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import {
  createOrganization,
  getOrganizations,
  updateOrganization,
} from '@/shared/api/organizations'
import type {
  OrganizationResponseDto,
  OrganizationScope,
  OrganizationType,
} from '@/shared/api/organizations'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { useThemeStore } from '@/shared/styles/theme.store'
import {
  ModalBody,
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import { PositionDefinitionsSection } from '@/widgets/country/country-detail/ui/position-definitions-section.widget'

import {
  OrgCancelBtn,
  OrgCard,
  OrgCardContent,
  OrgCreateButton,
  OrgEmptyState,
  OrgErrorText,
  OrgField,
  OrgFormActions,
  GovSectionEyebrow,
  OrgFormDesc,
  OrgGrid,
  OrgInput,
  OrgLabel,
  OrgListHeader,
  OrgListHeaderCount,
  OrgListHeaderDesc,
  OrgListHeaderRow,
  OrgListHeaderTitle,
  OrgListHeaderTitleBlock,
  OrgModalBody,
  OrgModalBoxCustom,
  OrgPrimaryBtn,
  OrgSearchInput,
  OrgSearchWrap,
  OrgSelect,
  OrgTextArea,
  OrgToolbarRow,
} from './government-organizations-tab.styled'

export type GovernmentOrganizationsTabProps = {
  country?: UnifiedCountry
  effectiveCountryId: string | undefined
}

export function GovernmentOrganizationsTab({
  country,
  effectiveCountryId,
}: GovernmentOrganizationsTabProps) {
  const queryClient = useQueryClient()
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const palette = useMemo(() => getCabinetsSectionPalette(isDark), [isDark])

  const [organizationModalOpen, setOrganizationModalOpen] = useState(false)
  const [organizationModalError, setOrganizationModalError] = useState<
    string | null
  >(null)
  const [organizationModalSubmitting, setOrganizationModalSubmitting] =
    useState(false)
  const [organizationSearchQuery, setOrganizationSearchQuery] = useState('')
  const [editingOrganization, setEditingOrganization] =
    useState<OrganizationResponseDto | null>(null)
  const [orgModalTab, setOrgModalTab] = useState<'info' | 'positions'>('info')
  const [selectedOrganization, setSelectedOrganization] =
    useState<OrganizationResponseDto | null>(null)
  const [organizationForm, setOrganizationForm] = useState<{
    name: string
    shortName: string | null
    localName: string | null
    type: OrganizationType
    scope: OrganizationScope | null
    countryId: string | null
    historicalCountryId: string | null
    description: string | null
    foundedDate: string | null
    dissolvedDate: string | null
    websiteUrl: string | null
    logoUrl: string | null
    ideology: string | null
  }>({
    name: '',
    shortName: null,
    localName: null,
    type: 'GOVERNMENT_AGENCY',
    scope: null,
    countryId: null,
    historicalCountryId: null,
    description: null,
    foundedDate: null,
    dissolvedDate: null,
    websiteUrl: null,
    logoUrl: null,
    ideology: null,
  })

  const { data: organizationsList = [], isLoading: organizationsLoading } =
    useQuery({
      queryKey: [
        'organizations-by-country',
        effectiveCountryId,
        country?.type,
        country?.historicalCountries?.map((hist) => hist.id).join(','),
      ],
      queryFn: async () => {
        if (country?.type === 'historical') {
          return getOrganizations(apiConnection, {
            historicalCountryId: effectiveCountryId ?? undefined,
          })
        }
        const byModern = await getOrganizations(apiConnection, {
          countryId: effectiveCountryId ?? undefined,
        })
        const historicalIds =
          country?.historicalCountries?.map((hist) => hist.id) ?? []
        const byHistorical = await Promise.all(
          historicalIds.map((historicalId) =>
            getOrganizations(apiConnection, { historicalCountryId: historicalId }),
          ),
        )
        const merged = byModern.concat(...byHistorical)
        const seen = new Set<string>()
        return merged.filter((organization) => {
          if (seen.has(organization.id)) return false
          seen.add(organization.id)
          return true
        })
      },
      enabled: !!effectiveCountryId,
    })

  const { data: countriesList = [] } = useQuery({
    queryKey: ['countries-for-org-form'],
    queryFn: () => getAllCountries(),
    enabled: organizationModalOpen,
  })
  const { data: historicalCountriesList = [] } = useQuery({
    queryKey: ['historical-countries-for-org-form'],
    queryFn: () => getAllHistoricalCountries(),
    enabled: organizationModalOpen,
  })

  const filteredOrganizationsList = useMemo(() => {
    if (!organizationSearchQuery.trim()) return organizationsList
    const queryLower = organizationSearchQuery.trim().toLowerCase()
    return organizationsList.filter((orgItem) => {
      const name = (orgItem.name ?? '').toLowerCase()
      const shortName = (orgItem.shortName ?? '').toLowerCase()
      const typeLabel = (
        ORGANIZATION_TYPE_LABEL[orgItem.type] ?? orgItem.type
      ).toLowerCase()
      return name.includes(queryLower) || shortName.includes(queryLower) || typeLabel.includes(queryLower)
    })
  }, [organizationsList, organizationSearchQuery])


  return (
    <section aria-label="행정기구(조직)">
      {selectedOrganization ? (
        /* ── 상세 뷰 ── */
        <>
          {/* 헤더: 뒤로가기 + 조직명 + 액션 버튼 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              paddingBottom: 20,
              marginBottom: 24,
              borderBottom: `1px solid ${palette.border}`,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrganization(null)
                  setEditingOrganization(null)
                  setOrganizationModalError(null)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: palette.textMuted,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
                onMouseOver={(event) => {
                  event.currentTarget.style.background = isDark
                    ? palette.btnHover
                    : palette.avatarBg
                  event.currentTarget.style.color = isDark
                    ? palette.sectionLabelTint
                    : palette.textFaint
                }}
                onMouseOut={(event) => {
                  event.currentTarget.style.background = 'transparent'
                  event.currentTarget.style.color = palette.textMuted
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                목록으로
              </button>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                  color: palette.text,
                  letterSpacing: '-0.025em',
                }}
              >
                {selectedOrganization.name}
                {selectedOrganization.shortName && (
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: palette.textMuted,
                      marginLeft: 8,
                    }}
                  >
                    ({selectedOrganization.shortName})
                  </span>
                )}
              </h2>
            </div>
            {/* 액션 버튼 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setEditingOrganization(selectedOrganization)
                  setOrganizationForm({
                    name: selectedOrganization.name,
                    shortName: selectedOrganization.shortName,
                    localName: selectedOrganization.localName,
                    type: selectedOrganization.type,
                    scope: selectedOrganization.scope,
                    countryId: selectedOrganization.countryId,
                    historicalCountryId:
                      selectedOrganization.historicalCountryId,
                    description: selectedOrganization.description,
                    foundedDate: selectedOrganization.foundedDate
                      ? selectedOrganization.foundedDate.slice(0, 10)
                      : null,
                    dissolvedDate: selectedOrganization.dissolvedDate
                      ? selectedOrganization.dissolvedDate.slice(0, 10)
                      : null,
                    websiteUrl: selectedOrganization.websiteUrl,
                    logoUrl: selectedOrganization.logoUrl,
                    ideology: selectedOrganization.ideology,
                  })
                  setOrganizationModalError(null)
                  setOrganizationModalOpen(true)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: palette.chipActionColor,
                  background: palette.chipActionBg,
                  border: `1px solid ${palette.chipActionBorder}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                <FiGrid size={13} />
                수정
              </button>
              <button
                type="button"
                onClick={() => setOrgModalTab('positions')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: MAIN,
                  background: palette.accentBg,
                  border: `1px solid ${palette.accentSecondaryBorder}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                <FiAward size={13} />
                직위 설정
              </button>
            </div>
          </div>

          {/* 조직 기본 정보 표시 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            {[
              {
                label: '유형',
                value:
                  ORGANIZATION_TYPE_LABEL[selectedOrganization.type] ??
                  selectedOrganization.type,
              },
              {
                label: '설립일',
                value: selectedOrganization.foundedDate
                  ? selectedOrganization.foundedDate.slice(0, 10)
                  : '—',
              },
              {
                label: '해체일',
                value: selectedOrganization.dissolvedDate
                  ? selectedOrganization.dissolvedDate.slice(0, 10)
                  : '—',
              },
              {
                label: '로컬명',
                value: selectedOrganization.localName ?? '—',
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: palette.bgSubtle,
                  borderRadius: 12,
                  padding: '14px 16px',
                  border: `1px solid ${palette.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: palette.textMuted,
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: palette.text,
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          {selectedOrganization.description && (
            <div
              style={{
                background: palette.bgSubtle,
                borderRadius: 12,
                padding: '16px 18px',
                border: `1px solid ${palette.border}`,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: palette.textMuted,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                설명
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: palette.sectionLabelTint,
                  lineHeight: 1.6,
                }}
              >
                {selectedOrganization.description}
              </p>
            </div>
          )}
        </>
      ) : (
        /* ── 목록 뷰 ── */
        <>
          {!effectiveCountryId ? (
            <>
              <GovSectionEyebrow>행정기구·조직</GovSectionEyebrow>
              <p
                style={{
                  fontSize: 14,
                  color: palette.textMuted,
                }}
              >
                현대 국가를 선택하면 해당 국가 소속 조직을 등록·조회할 수
                있습니다.
              </p>
            </>
          ) : organizationsLoading ? (
            <>
              <GovSectionEyebrow>행정기구·조직</GovSectionEyebrow>
              <p
                style={{
                  fontSize: 14,
                  color: palette.textMuted,
                }}
              >
                불러오는 중…
              </p>
            </>
          ) : (
            <>
              {organizationsList.length === 0 ? (
                /* 행정부와 동일: 등록 카드만 표시 (추가 버튼 없음) */
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 24,
                  }}
                >
                  <div
                    style={{
                      padding: '48px 32px',
                      background: palette.bgSubtle,
                      borderRadius: 20,
                      border: `1px solid ${palette.border}`,
                      boxShadow: isDark
                        ? '0 2px 8px rgba(0,0,0,0.3)'
                        : '0 2px 8px rgba(0,0,0,0.04)',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        margin: '0 auto 20px',
                        borderRadius: 20,
                        background:
                          'linear-gradient(145deg, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.06) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: MAIN,
                      }}
                    >
                      <FiPlus size={28} strokeWidth={2.5} />
                    </div>
                    <h3
                      style={{
                        margin: '0 0 8px',
                        fontSize: 20,
                        fontWeight: 700,
                        color: palette.text,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      등록된 조직이 없습니다
                    </h3>
                    <p
                      style={{
                        margin: '0 0 24px',
                        fontSize: 14,
                        color: palette.textMuted,
                        lineHeight: 1.5,
                        maxWidth: 400,
                        marginLeft: 'auto',
                        marginRight: 'auto',
                      }}
                    >
                      만철·관동군·총독부 등 행정기구·조직을 등록하면 이 국가
                      소속으로 관리할 수 있습니다.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingOrganization(null)
                        setOrganizationForm({
                          name: '',
                          shortName: null,
                          localName: null,
                          type: 'GOVERNMENT_AGENCY',
                          scope: null,
                          countryId: effectiveCountryId,
                          historicalCountryId: null,
                          description: null,
                          foundedDate: null,
                          dissolvedDate: null,
                          websiteUrl: null,
                          logoUrl: null,
                          ideology: null,
                        })
                        setOrganizationModalOpen(true)
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '14px 24px',
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#fff',
                        background: MAIN,
                        border: 'none',
                        borderRadius: 14,
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                      }}
                    >
                      <FiPlus size={18} /> 조직 등록
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <OrgListHeader>
                    <OrgListHeaderRow>
                      <OrgListHeaderTitleBlock>
                        <OrgListHeaderTitle>
                          행정기구·조직
                          <OrgListHeaderCount>
                            {filteredOrganizationsList.length}개
                            {organizationSearchQuery.trim()
                              ? ` / 전체 ${organizationsList.length}개`
                              : ''}
                          </OrgListHeaderCount>
                        </OrgListHeaderTitle>
                        <OrgListHeaderDesc>
                          이름·약칭·유형으로 검색할 수 있습니다.
                        </OrgListHeaderDesc>
                      </OrgListHeaderTitleBlock>
                    </OrgListHeaderRow>
                    <OrgToolbarRow>
                      <OrgSearchWrap style={{ position: 'relative' }}>
                        <span
                          style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: palette.textMuted,
                            pointerEvents: 'none',
                          }}
                        >
                          <FiSearch size={16} />
                        </span>
                        <OrgSearchInput
                          type="search"
                          placeholder="이름, 약칭, 유형 검색"
                          value={organizationSearchQuery}
                          onChange={(event) =>
                            setOrganizationSearchQuery(event.target.value)
                          }
                          aria-label="조직 검색"
                        />
                      </OrgSearchWrap>
                    </OrgToolbarRow>
                  </OrgListHeader>
                  {filteredOrganizationsList.length === 0 ? (
                    <OrgEmptyState>
                      검색 조건에 맞는 조직이 없습니다.
                    </OrgEmptyState>
                  ) : (
                    <OrgGrid>
                      {/* 행정부처럼 첫 카드: 조직 등록 카드 */}
                      <OrgCard
                        as="button"
                        type="button"
                        onClick={() => {
                          setEditingOrganization(null)
                          setOrganizationForm({
                            name: '',
                            shortName: null,
                            localName: null,
                            type: 'GOVERNMENT_AGENCY',
                            scope: null,
                            countryId: effectiveCountryId,
                            historicalCountryId: null,
                            description: null,
                            foundedDate: null,
                            dissolvedDate: null,
                            websiteUrl: null,
                            logoUrl: null,
                            ideology: null,
                          })
                          setOrganizationModalOpen(true)
                        }}
                        style={{
                          borderStyle: 'dashed',
                          cursor: 'pointer',
                          textAlign: 'left',
                          minHeight: 120,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <OrgCardContent
                          style={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 14,
                              background: 'rgba(99, 102, 241, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: MAIN,
                            }}
                          >
                            <FiPlus size={24} />
                          </div>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: palette.textMuted,
                            }}
                          >
                            조직 등록
                          </span>
                        </OrgCardContent>
                      </OrgCard>
                      {filteredOrganizationsList.map(
                        (org: OrganizationResponseDto) => (
                          <OrgCard
                            key={org.id}
                            as="button"
                            type="button"
                            onClick={() => {
                              setOrgModalTab('info')
                              setOrganizationModalError(null)
                              setSelectedOrganization(org)
                            }}
                            style={{
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%',
                            }}
                          >
                            <OrgCardContent>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                  gap: 12,
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <h3
                                    style={{
                                      margin: 0,
                                      fontSize: 16,
                                      fontWeight: 600,
                                      color: palette.text,
                                      letterSpacing: '-0.01em',
                                      lineHeight: 1.35,
                                    }}
                                  >
                                    {org.name}
                                  </h3>
                                  <div
                                    style={{
                                      marginTop: 6,
                                      fontSize: 13,
                                      color: palette.textMuted,
                                    }}
                                  >
                                    {ORGANIZATION_TYPE_LABEL[org.type] ??
                                      org.type}
                                    {(org.foundedDate ||
                                      org.dissolvedDate) && (
                                      <span
                                        style={{
                                          display: 'block',
                                          marginTop: 4,
                                        }}
                                      >
                                        {org.foundedDate &&
                                          `설립 ${org.foundedDate.slice(0, 10)}`}
                                        {org.foundedDate &&
                                          org.dissolvedDate &&
                                          ' ~ '}
                                        {org.dissolvedDate &&
                                          `해체 ${org.dissolvedDate.slice(0, 10)}`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    color: '#cbd5e1',
                                    flexShrink: 0,
                                  }}
                                >
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M9 18l6-6-6-6" />
                                  </svg>
                                </div>
                              </div>
                            </OrgCardContent>
                          </OrgCard>
                        ),
                      )}
                    </OrgGrid>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {organizationModalOpen &&
        createPortal(
          <ModalOverlay
            role="dialog"
            aria-modal="true"
            aria-labelledby="org-modal-title"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setOrganizationModalOpen(false)
                setOrganizationModalError(null)
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
            >
              <OrgModalBoxCustom>
                <ModalHeader>
                  <ModalTitle id="org-modal-title">
                    <FiGrid size={24} strokeWidth={2} />
                    {editingOrganization
                      ? editingOrganization.name
                      : '조직 등록'}
                  </ModalTitle>
                  <ModalCloseButton
                    type="button"
                    onClick={() => {
                      setOrganizationModalOpen(false)
                      setOrganizationModalError(null)
                    }}
                    aria-label="닫기"
                  >
                    <FiX size={22} strokeWidth={2} />
                  </ModalCloseButton>
                </ModalHeader>
                <ModalBody>
                  <OrgFormDesc>
                    <FiInfo size={20} />
                    <span>
                      기본 정보를 입력하세요. 소속 국가는 현재 보고 있는
                      국가로 미리 설정됩니다.
                    </span>
                  </OrgFormDesc>
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault()
                      setOrganizationModalError(null)
                      if (!organizationForm.name.trim()) {
                        setOrganizationModalError('이름을 입력해주세요.')
                        return
                      }
                      setOrganizationModalSubmitting(true)
                      try {
                        const body = {
                          name: organizationForm.name.trim(),
                          shortName:
                            organizationForm.shortName?.trim() || null,
                          localName:
                            organizationForm.localName?.trim() || null,
                          type: organizationForm.type,
                          scope: organizationForm.scope || null,
                          countryId: organizationForm.countryId || null,
                          historicalCountryId:
                            organizationForm.historicalCountryId || null,
                          description:
                            organizationForm.description?.trim() || null,
                          foundedDate:
                            organizationForm.foundedDate?.trim() || null,
                          dissolvedDate:
                            organizationForm.dissolvedDate?.trim() || null,
                          websiteUrl:
                            organizationForm.websiteUrl?.trim() || null,
                          logoUrl: organizationForm.logoUrl?.trim() || null,
                          ideology:
                            organizationForm.ideology?.trim() || null,
                        }
                        if (editingOrganization) {
                          await updateOrganization(
                            apiConnection,
                            editingOrganization.id,
                            body,
                          )
                          toast.success('수정되었습니다.')
                          if (
                            selectedOrganization?.id ===
                            editingOrganization.id
                          ) {
                            setSelectedOrganization({
                              ...selectedOrganization,
                              ...body,
                            })
                          }
                        } else {
                          await createOrganization(apiConnection, body)
                          toast.success('등록되었습니다.')
                        }
                        queryClient.invalidateQueries({
                          queryKey: [
                            'organizations-by-country',
                            effectiveCountryId,
                          ],
                        })
                        setOrganizationModalOpen(false)
                        setEditingOrganization(null)
                      } catch (err) {
                        const msg =
                          err instanceof Error
                            ? err.message
                            : '저장에 실패했습니다.'
                        setOrganizationModalError(msg)
                        toast.error(msg)
                      } finally {
                        setOrganizationModalSubmitting(false)
                      }
                    }}
                  >
                    <OrgField>
                      <OrgLabel>
                        이름 <span style={{ color: '#ef4444' }}>*</span>
                      </OrgLabel>
                      <OrgInput
                        value={organizationForm.name}
                        onChange={(event) =>
                          setOrganizationForm((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                        placeholder="예: 남만주철도주식회사, 관동군"
                        autoFocus
                      />
                    </OrgField>
                    <OrgField>
                      <OrgLabel>약칭 / 두문자</OrgLabel>
                      <OrgInput
                        value={organizationForm.shortName ?? ''}
                        onChange={(event) =>
                          setOrganizationForm((prev) => ({
                            ...prev,
                            shortName: event.target.value || null,
                          }))
                        }
                        placeholder="예: 만철, MOFA"
                      />
                    </OrgField>
                    <OrgField>
                      <OrgLabel>로컬 명칭 (현지어)</OrgLabel>
                      <OrgInput
                        value={organizationForm.localName ?? ''}
                        onChange={(event) =>
                          setOrganizationForm((prev) => ({
                            ...prev,
                            localName: event.target.value || null,
                          }))
                        }
                        placeholder="예: 南滿洲鐵道株式會社"
                      />
                    </OrgField>
                    <OrgField>
                      <OrgLabel>유형</OrgLabel>
                      <OrgSelect
                        value={organizationForm.type}
                        onChange={(event) =>
                          setOrganizationForm((prev) => ({
                            ...prev,
                            type: event.target.value as OrganizationType,
                          }))
                        }
                      >
                        {ORGANIZATION_TYPE_OPTIONS.map((typeOption) => (
                          <option key={typeOption.value} value={typeOption.value}>
                            {typeOption.label}
                          </option>
                        ))}
                      </OrgSelect>
                    </OrgField>
                    <OrgField>
                      <OrgLabel>활동 범위</OrgLabel>
                      <OrgSelect
                        value={organizationForm.scope ?? ''}
                        onChange={(event) =>
                          setOrganizationForm((prev) => ({
                            ...prev,
                            scope: (event.target.value || null) as
                              | import('@/shared/api/organizations').OrganizationScope
                              | null,
                          }))
                        }
                      >
                        <option value="">선택 안 함</option>
                        {ORGANIZATION_SCOPE_OPTIONS.map((scopeOption) => (
                          <option key={scopeOption.value} value={scopeOption.value}>
                            {scopeOption.label}
                          </option>
                        ))}
                      </OrgSelect>
                    </OrgField>
                    <OrgField>
                      <OrgLabel>소속 국가 (현대)</OrgLabel>
                      <OrgSelect
                        value={organizationForm.countryId ?? ''}
                        onChange={(event) =>
                          setOrganizationForm((prev) => ({
                            ...prev,
                            countryId: event.target.value || null,
                            historicalCountryId: event.target.value
                              ? null
                              : prev.historicalCountryId,
                          }))
                        }
                      >
                        <option value="">선택 안 함</option>
                        {countriesList.map((countryItem) => (
                          <option key={countryItem.id} value={countryItem.id}>
                            {countryItem.name}
                          </option>
                        ))}
                      </OrgSelect>
                    </OrgField>
                    <OrgField>
                      <OrgLabel>소속 국가 (역사적)</OrgLabel>
                      <OrgSelect
                        value={organizationForm.historicalCountryId ?? ''}
                        onChange={(event) =>
                          setOrganizationForm((prev) => ({
                            ...prev,
                            historicalCountryId: event.target.value || null,
                            countryId: event.target.value ? null : prev.countryId,
                          }))
                        }
                      >
                        <option value="">선택 안 함</option>
                        {historicalCountriesList.map((historicalItem) => (
                          <option key={historicalItem.id} value={historicalItem.id}>
                            {historicalItem.name}
                          </option>
                        ))}
                      </OrgSelect>
                    </OrgField>
                    <OrgField>
                      <OrgLabel>설립일</OrgLabel>
                      <OrgInput
                        type="date"
                        value={organizationForm.foundedDate ?? ''}
                        onChange={(event) =>
                          setOrganizationForm((prev) => ({
                            ...prev,
                            foundedDate: event.target.value || null,
                          }))
                        }
                        style={{ maxWidth: 200 }}
                      />
                    </OrgField>
                    <OrgField>
                      <OrgLabel>해체일</OrgLabel>
                      <OrgInput
                        type="date"
                        value={organizationForm.dissolvedDate ?? ''}
                        onChange={(event) =>
                          setOrganizationForm((prev) => ({
                            ...prev,
                            dissolvedDate: event.target.value || null,
                          }))
                        }
                        style={{ maxWidth: 200 }}
                      />
                    </OrgField>
                    <OrgField>
                      <OrgLabel>공식 웹사이트</OrgLabel>
                      <OrgInput
                        type="url"
                        value={organizationForm.websiteUrl ?? ''}
                        onChange={(event) =>
                          setOrganizationForm((prev) => ({
                            ...prev,
                            websiteUrl: event.target.value || null,
                          }))
                        }
                        placeholder="https://..."
                      />
                    </OrgField>
                    <OrgField>
                      <OrgLabel>로고 URL</OrgLabel>
                      <OrgInput
                        type="url"
                        value={organizationForm.logoUrl ?? ''}
                        onChange={(event) =>
                          setOrganizationForm((prev) => ({
                            ...prev,
                            logoUrl: event.target.value || null,
                          }))
                        }
                        placeholder="이미지 URL"
                      />
                    </OrgField>
                    <OrgField>
                      <OrgLabel>설명 (역할·목적·개요)</OrgLabel>
                      <OrgTextArea
                        value={organizationForm.description ?? ''}
                        onChange={(event) =>
                          setOrganizationForm((prev) => ({
                            ...prev,
                            description: event.target.value || null,
                          }))
                        }
                        placeholder="이 조직이 하는 일, 설립 목적, 주요 활동 등"
                        rows={3}
                      />
                    </OrgField>
                    <OrgField style={{ marginBottom: 0 }}>
                      <OrgLabel>이념 / 노선 (정당·노조 등)</OrgLabel>
                      <OrgTextArea
                        value={organizationForm.ideology ?? ''}
                        onChange={(event) =>
                          setOrganizationForm((prev) => ({
                            ...prev,
                            ideology: event.target.value || null,
                          }))
                        }
                        placeholder="선택"
                        rows={2}
                      />
                    </OrgField>
                    {organizationModalError && (
                      <OrgErrorText>{organizationModalError}</OrgErrorText>
                    )}
                    <OrgFormActions>
                      <OrgCancelBtn
                        type="button"
                        onClick={() => {
                          setOrganizationModalOpen(false)
                          setOrganizationModalError(null)
                        }}
                      >
                        취소
                      </OrgCancelBtn>
                      <OrgPrimaryBtn
                        type="submit"
                        disabled={organizationModalSubmitting}
                      >
                        {organizationModalSubmitting
                          ? '저장 중…'
                          : editingOrganization
                            ? '저장'
                            : '등록'}
                      </OrgPrimaryBtn>
                    </OrgFormActions>
                  </form>
                </ModalBody>
              </OrgModalBoxCustom>
            </motion.div>
          </ModalOverlay>,
          document.body,
        )}

      {/* 직위 설정 모달 */}
      {orgModalTab === 'positions' &&
        selectedOrganization &&
        createPortal(
          <ModalOverlay
            role="dialog"
            aria-modal="true"
            aria-labelledby="org-position-modal-title"
            onClick={() => setOrgModalTab('info')}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              style={{
                width: '90vw',
                maxWidth: 700,
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <OrgModalBoxCustom
                style={{
                  maxHeight: '90vh',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <ModalHeader>
                  <ModalTitle id="org-position-modal-title">
                    <FiAward size={22} strokeWidth={2} />
                    직위 설정 — {selectedOrganization.name}
                  </ModalTitle>
                  <ModalCloseButton
                    type="button"
                    onClick={() => setOrgModalTab('info')}
                    aria-label="닫기"
                  >
                    <FiX size={22} strokeWidth={2} />
                  </ModalCloseButton>
                </ModalHeader>
                <ModalBody style={{ flex: 1, overflow: 'auto' }}>
                  <PositionDefinitionsSection
                    fixedOrganizationId={selectedOrganization.id}
                    fixedOrganizationName={
                      selectedOrganization.shortName
                        ? `${selectedOrganization.name} (${selectedOrganization.shortName})`
                        : selectedOrganization.name
                    }
                  />
                </ModalBody>
              </OrgModalBoxCustom>
            </motion.div>
          </ModalOverlay>,
          document.body,
        )}
    </section>

  )
}
