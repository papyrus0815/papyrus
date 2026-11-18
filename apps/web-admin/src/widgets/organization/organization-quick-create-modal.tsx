import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiGlobe, FiPlus, FiUser, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerOverlay,
  ledgerScrim,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { getApiConnection } from '@/shared/api/client'
import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import {
  createOrganization,
  isInternationalOrgType,
  ORGANIZATION_COUNTRY_ROLE_LABEL,
  ORGANIZATION_SCOPE_LABEL,
  type OrganizationCountryRole,
  type OrganizationResponseDto,
  type OrganizationScope,
  type OrganizationType,
} from '@/shared/api/organizations'
import { getAllPersons } from '@/shared/api/persons'
import { Z_INDEX } from '@/shared/styles/z-index'
import { CountryPicker } from '@/shared/ui/country-picker'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { notify } from '@/shared/ui/toast'

const QUICK_ORG_TYPES: Array<{
  value: OrganizationType
  label: string
  example: string
}> = [
  {
    value: 'MULTILATERAL_FORUM',
    label: '다자 협의체·국가 블록',
    example: '예: 쿼드(Quad), G7, G20, APEC, BRICS, ASEM, 파이브 아이즈, 유럽협조체제',
  },
  {
    value: 'INTERGOVERNMENTAL_ORG',
    label: '국제기구',
    example: '예: 아세안(ASEAN), 유엔(UN), 세계무역기구(WTO), 유럽연합(EU), 국제연맹',
  },
  {
    value: 'MILITARY_ALLIANCE',
    label: '군사동맹',
    example: '예: 북대서양조약기구(NATO), 바르샤바 조약기구, 델로스 동맹',
  },
  {
    value: 'NGO',
    label: '비정부기구·시민결사',
    example: '예: 국제적십자위원회(ICRC), 그린피스, 자코뱅 클럽, 삼민주의청년단',
  },
  {
    value: 'TRADE_UNION',
    label: '노동조합·연맹',
    example: '예: 전국노동조합총연맹, 솔리다르노시치(연대노조)',
  },
  {
    value: 'BUSINESS_ASSOCIATION',
    label: '상공·직능단체',
    example: '예: 한자 동맹 상인조합, 경단련, 상공회의소',
  },
  {
    value: 'EDUCATION',
    label: '학술·교육·연구기관',
    example: '예: 왕립학회, 집현전 학단, 고등사범학교, 싱크탱크',
  },
  {
    value: 'RELIGIOUS_ORG',
    label: '종교단체·교단·기사단',
    example: '예: 예수회, 성전기사단, 튜튼 기사단',
  },
  {
    value: 'OTHER',
    label: '기타 민간·비국가 단체',
    example: '예: 자유군단(Freikorps), 의병진, 역사적 민간 결사체',
  },
]

const MEMBER_COUNTRY_ROLES: OrganizationCountryRole[] = [
  'MEMBER',
  'FOUNDER',
  'DIALOGUE_PARTNER',
  'OBSERVER',
  'SECRETARIAT_HOST',
]

export interface OrganizationQuickMemberDraft {
  id: string
  name: string
  roleTitle: string
}

export interface OrganizationQuickCountryDraft {
  key: string
  countryId?: string
  historicalCountryId?: string
  name: string
  flagEmoji?: string | null
  role: OrganizationCountryRole
}

interface Props {
  defaultCountryId?: string
  defaultHistoricalCountryId?: string
  defaultName?: string
  defaultType?: OrganizationType
  /** 사건·진영에 이미 추가된 인물들을 원클릭 추천 칩으로 표시 */
  candidatePersons?: Array<{ id: string; name: string; role?: string }>
  defaultMembers?: Array<{ id: string; name: string; roleTitle?: string }>
  /** 사건에 이미 추가된 참여국들을 회원국 원클릭 추천 칩으로 표시 */
  candidateCountries?: Array<{
    countryId?: string
    historicalCountryId?: string
    name: string
    flagEmoji?: string | null
  }>
  onClose: () => void
  onCreated: (
    organization: OrganizationResponseDto,
    initialMembers?: OrganizationQuickMemberDraft[],
  ) => void
}

function defaultScopeForType(orgType: OrganizationType): OrganizationScope {
  if (orgType === 'INTERGOVERNMENTAL_ORG' || orgType === 'MULTILATERAL_FORUM') {
    return 'INTERNATIONAL'
  }
  if (orgType === 'MILITARY_ALLIANCE') {
    return 'REGIONAL'
  }
  return 'NATIONAL'
}

export function OrganizationQuickCreateModal({
  defaultCountryId,
  defaultHistoricalCountryId,
  defaultName,
  defaultType = 'NGO',
  candidatePersons = [],
  defaultMembers = [],
  candidateCountries = [],
  onClose,
  onCreated,
}: Props) {
  const queryClient = useQueryClient()
  const safeDefaultType: OrganizationType =
    defaultType === 'COMPANY' ||
    defaultType === 'POLITICAL_PARTY' ||
    defaultType === 'GOVERNMENT_AGENCY'
      ? 'NGO'
      : defaultType
  const [name, setName] = useState(defaultName ?? '')
  const [shortName, setShortName] = useState('')
  const [localName, setLocalName] = useState('')
  const [type, setType] = useState<OrganizationType>(safeDefaultType)
  const [scope, setScope] = useState<OrganizationScope>(() =>
    defaultScopeForType(safeDefaultType),
  )
  const [countryId, setCountryId] = useState(() =>
    isInternationalOrgType(safeDefaultType) ? '' : (defaultCountryId ?? ''),
  )
  const [historicalCountryId, setHistoricalCountryId] = useState(() =>
    isInternationalOrgType(safeDefaultType)
      ? ''
      : (defaultHistoricalCountryId ?? ''),
  )
  const [foundedYear, setFoundedYear] = useState('')
  const [description, setDescription] = useState('')
  const [members, setMembers] = useState<OrganizationQuickMemberDraft[]>(() =>
    defaultMembers.map((member) => ({
      id: member.id,
      name: member.name,
      roleTitle: member.roleTitle?.trim() || '위원',
    })),
  )
  const [countryMemberships, setCountryMemberships] = useState<
    OrganizationQuickCountryDraft[]
  >([])
  const [personPickerOpen, setPersonPickerOpen] = useState(false)
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)

  const handleSelectType = (nextType: OrganizationType) => {
    setType(nextType)
    setScope(defaultScopeForType(nextType))
    if (isInternationalOrgType(nextType)) {
      setCountryId('')
      setHistoricalCountryId('')
    } else if (!countryId && !historicalCountryId) {
      if (defaultCountryId) setCountryId(defaultCountryId)
      if (defaultHistoricalCountryId) setHistoricalCountryId(defaultHistoricalCountryId)
    }
  }

  const countriesQuery = useQuery({
    queryKey: ['countries-all', 'for-org-quick-create'],
    queryFn: () => getAllCountries(),
    staleTime: 5 * 60_000,
  })

  const historicalCountriesQuery = useQuery({
    queryKey: ['historical-countries-all', 'for-org-quick-create'],
    queryFn: () => getAllHistoricalCountries(),
    staleTime: 5 * 60_000,
  })

  const allPersonsQuery = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: () => getAllPersons(),
    enabled: personPickerOpen,
  })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !personPickerOpen && !countryPickerOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, personPickerOpen, countryPickerOpen])

  const parsedFoundedIso = (() => {
    const trimmed = foundedYear.trim()
    if (!trimmed) return null
    const yr = Number.parseInt(trimmed, 10)
    if (!Number.isFinite(yr) || yr < 1000 || yr > 9999) return null
    return `${String(yr).padStart(4, '0')}-01-01T00:00:00.000Z`
  })()

  const createMutation = useMutation({
    mutationFn: () =>
      createOrganization(getApiConnection(), {
        name: name.trim(),
        shortName: shortName.trim() || null,
        localName: localName.trim() || null,
        type,
        scope,
        foundedDate: parsedFoundedIso,
        countryId: countryId || null,
        historicalCountryId: historicalCountryId || null,
        description: description.trim() || null,
        ...(members.length > 0
          ? {
              members: members.map((member) => ({
                personId: member.id,
                roleTitle: member.roleTitle.trim() || '위원',
              })),
            }
          : {}),
        ...(countryMemberships.length > 0
          ? {
              countryMemberships: countryMemberships.map((cm, idx) => ({
                countryId: cm.countryId ?? null,
                historicalCountryId: cm.historicalCountryId ?? null,
                role: cm.role,
                sortOrder: idx,
              })),
            }
          : {}),
      }),
    onSuccess: (created) => {
      const summaryParts = [
        countryMemberships.length > 0 ? `회원국 ${countryMemberships.length}개국` : null,
        members.length > 0 ? `소속 인물 ${members.length}명` : null,
      ].filter(Boolean)
      notify.success(
        summaryParts.length > 0
          ? `‘${created.name}’ 기구·조직(${summaryParts.join(' · ')})을 등록했습니다.`
          : `‘${created.name}’ 기구·조직을 등록했습니다.`,
      )
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
      void queryClient.invalidateQueries({
        queryKey: ['register-record-candidates', 'organizations'],
      })
      onCreated(created, members)
    },
    onError: (error) =>
      notify.error(
        error instanceof Error ? error.message : '기관·조직 생성에 실패했습니다.',
      ),
  })

  const availableCandidates = candidatePersons.filter(
    (candidate) => !members.some((member) => member.id === candidate.id),
  )

  const availableCountryCandidates = candidateCountries.filter((candidate) => {
    const key = candidate.historicalCountryId
      ? `H:${candidate.historicalCountryId}`
      : `C:${candidate.countryId}`
    return !countryMemberships.some((item) => item.key === key)
  })

  const addMember = (id: string, personName: string, roleHint?: string) => {
    setMembers((previous) =>
      previous.some((member) => member.id === id)
        ? previous
        : [
            ...previous,
            {
              id,
              name: personName,
              roleTitle: roleHint?.trim() || '위원',
            },
          ],
    )
  }

  const addCountryDraft = (draft: {
    countryId?: string
    historicalCountryId?: string
    name: string
    flagEmoji?: string | null
    role?: OrganizationCountryRole
  }) => {
    const key = draft.historicalCountryId
      ? `H:${draft.historicalCountryId}`
      : `C:${draft.countryId}`
    if (!draft.countryId && !draft.historicalCountryId) return
    setCountryMemberships((prev) =>
      prev.some((item) => item.key === key)
        ? prev
        : [
            ...prev,
            {
              key,
              countryId: draft.countryId,
              historicalCountryId: draft.historicalCountryId,
              name: draft.name,
              flagEmoji: draft.flagEmoji,
              role: draft.role ?? 'MEMBER',
            },
          ],
    )
  }

  const currentTypeMeta =
    QUICK_ORG_TYPES.find((item) => item.value === type) ?? QUICK_ORG_TYPES[0]
  const isInternational = isInternationalOrgType(type)

  return createPortal(
    <Overlay onClick={onClose}>
      <Modal onClick={(event) => event.stopPropagation()}>
        <Header>
          <Title>새 기구·협의체·조직 등록</Title>
          <CloseBtn type="button" onClick={onClose} aria-label="닫기">
            <FiX size={20} />
          </CloseBtn>
        </Header>

        <Body>
          <FieldLabel>유형 선택</FieldLabel>
          <TypeChipRow>
            {QUICK_ORG_TYPES.map((item) => (
              <TypeChip
                key={item.value}
                type="button"
                $active={type === item.value}
                onClick={() => handleSelectType(item.value)}
              >
                {item.label}
              </TypeChip>
            ))}
          </TypeChipRow>
          <ExampleNote>
            {currentTypeMeta.example} · 정당(/political-parties)·행정부처(/government)·기업(/companies)은 각각 전용 도메인에서 등록합니다.
          </ExampleNote>

          <Field>
            <FieldLabel>기구·조직명 *</FieldLabel>
            <BigInput
              aria-label="기관·조직명"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={
                isInternational
                  ? '예: 쿼드(4자 안보 대화), 동남아시아국가연합, 아시아태평양경제협력체'
                  : '예: 공안위원회, 국민공회, 파리 코뮌'
              }
              autoFocus
            />
          </Field>

          <CondRow>
            <Field style={{ flex: 1, minWidth: 140 }}>
              <FieldLabel>
                약칭 <Muted>(선택)</Muted>
              </FieldLabel>
              <BigInput
                value={shortName}
                onChange={(event) => setShortName(event.target.value)}
                placeholder={isInternational ? '예: Quad, ASEAN, APEC' : '예: 공안위'}
              />
            </Field>
            <Field style={{ flex: 1, minWidth: 140 }}>
              <FieldLabel>
                현지·영문 표기 <Muted>(선택)</Muted>
              </FieldLabel>
              <BigInput
                value={localName}
                onChange={(event) => setLocalName(event.target.value)}
                placeholder={
                  isInternational
                    ? '예: Quadrilateral Security Dialogue'
                    : '예: Comité de salut public'
                }
              />
            </Field>
          </CondRow>

          <CondRow>
            <Field style={{ flex: 1, minWidth: 160 }}>
              <FieldLabel>활동 범위</FieldLabel>
              <BigSelect
                value={scope}
                onChange={(event) => setScope(event.target.value as OrganizationScope)}
              >
                {(Object.keys(ORGANIZATION_SCOPE_LABEL) as OrganizationScope[]).map(
                  (sc) => (
                    <option key={sc} value={sc}>
                      {ORGANIZATION_SCOPE_LABEL[sc]}
                    </option>
                  ),
                )}
              </BigSelect>
            </Field>
            <Field style={{ flex: 1, minWidth: 130 }}>
              <FieldLabel>
                설립·출범 연도 <Muted>(선택, AD 1000~)</Muted>
              </FieldLabel>
              <BigInput
                type="number"
                min={1000}
                max={9999}
                value={foundedYear}
                onChange={(event) => setFoundedYear(event.target.value)}
                placeholder={isInternational ? '예: 1967, 1989, 2007' : '예: 1793'}
              />
            </Field>
          </CondRow>

          {/* 회원국·파트너국 (국제기구·다자협의체·군사동맹일 때 상단 강조, 국내 조직도 필요시 사용 가능) */}
          {(isInternational || countryMemberships.length > 0 || availableCountryCandidates.length > 0) && (
            <Field>
              <FieldLabel>
                회원국·참여국{' '}
                <Muted>
                  (등록해 두면 정상회의·사건 등록 시 회원국을 한 번에 불러올 수 있습니다)
                </Muted>
              </FieldLabel>
              {availableCountryCandidates.length > 0 && (
                <CandidateQuickBox>
                  <CandidateQuickLabel>
                    현재 사건 참여국에서 빠른 추가:
                  </CandidateQuickLabel>
                  {availableCountryCandidates.map((candidate) => (
                    <CandidateQuickChip
                      key={
                        candidate.historicalCountryId
                          ? `H:${candidate.historicalCountryId}`
                          : `C:${candidate.countryId}`
                      }
                      type="button"
                      onClick={() => addCountryDraft(candidate)}
                    >
                      + {candidate.flagEmoji ? `${candidate.flagEmoji} ` : ''}
                      {candidate.name}
                    </CandidateQuickChip>
                  ))}
                  {availableCountryCandidates.length > 1 && (
                    <CandidateQuickChip
                      type="button"
                      $accent
                      onClick={() => {
                        for (const candidate of availableCountryCandidates) {
                          addCountryDraft(candidate)
                        }
                      }}
                    >
                      + 전체 회원국 담기 ({availableCountryCandidates.length})
                    </CandidateQuickChip>
                  )}
                </CandidateQuickBox>
              )}
              <MemberRows>
                {countryMemberships.map((cm) => (
                  <MemberRow key={cm.key}>
                    <MemberName>
                      {cm.flagEmoji ? `${cm.flagEmoji} ` : ''}
                      {cm.name}
                    </MemberName>
                    <MemberRoleSelect
                      aria-label={`${cm.name} 멤버십 역할`}
                      value={cm.role}
                      onChange={(event) => {
                        const nextRole = event.target.value as OrganizationCountryRole
                        setCountryMemberships((prev) =>
                          prev.map((item) =>
                            item.key === cm.key ? { ...item, role: nextRole } : item,
                          ),
                        )
                      }}
                    >
                      {MEMBER_COUNTRY_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ORGANIZATION_COUNTRY_ROLE_LABEL[r]}
                        </option>
                      ))}
                    </MemberRoleSelect>
                    <RemoveMemberBtn
                      type="button"
                      aria-label={`${cm.name} 제거`}
                      onClick={() =>
                        setCountryMemberships((prev) =>
                          prev.filter((item) => item.key !== cm.key),
                        )
                      }
                    >
                      <FiX size={13} />
                    </RemoveMemberBtn>
                  </MemberRow>
                ))}
                <AddMemberBtn
                  type="button"
                  onClick={() => setCountryPickerOpen(true)}
                >
                  <FiGlobe size={13} /> 회원국·파트너국 검색·추가
                </AddMemberBtn>
              </MemberRows>
            </Field>
          )}

          {!isInternational && (
            <CondRow>
              <Field style={{ flex: 1, minWidth: 180 }}>
                <FieldLabel>
                  역사 국가 <Muted>(예: 프랑스 제1공화국, 조선)</Muted>
                </FieldLabel>
                <BigSelect
                  value={historicalCountryId}
                  onChange={(event) => setHistoricalCountryId(event.target.value)}
                >
                  <option value="">미지정</option>
                  {(historicalCountriesQuery.data ?? []).map((histCountry) => (
                    <option key={histCountry.id} value={histCountry.id}>
                      {histCountry.name}
                    </option>
                  ))}
                </BigSelect>
              </Field>
              <Field style={{ flex: 1, minWidth: 180 }}>
                <FieldLabel>
                  현대 국가 <Muted>(선택)</Muted>
                </FieldLabel>
                <BigSelect
                  value={countryId}
                  onChange={(event) => setCountryId(event.target.value)}
                >
                  <option value="">미지정</option>
                  {(countriesQuery.data ?? []).map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </BigSelect>
              </Field>
            </CondRow>
          )}

          <Field>
            <FieldLabel>
              설명 <Muted>(선택)</Muted>
            </FieldLabel>
            <BigTextarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="설립 배경·역할·성격 등 자유 서술"
            />
          </Field>

          <Field>
            <FieldLabel>
              초기 소속 인물·위원{' '}
              <Muted>(선택 — 등록해 두면 사건에서 소속 인물로 바로 불러올 수 있습니다)</Muted>
            </FieldLabel>
            {availableCandidates.length > 0 && (
              <CandidateQuickBox>
                <CandidateQuickLabel>
                  현재 사건 인물에서 빠른 추가:
                </CandidateQuickLabel>
                {availableCandidates.map((candidate) => (
                  <CandidateQuickChip
                    key={candidate.id}
                    type="button"
                    onClick={() =>
                      addMember(candidate.id, candidate.name, candidate.role)
                    }
                  >
                    + {candidate.name}
                  </CandidateQuickChip>
                ))}
                {availableCandidates.length > 1 && (
                  <CandidateQuickChip
                    type="button"
                    $accent
                    onClick={() => {
                      for (const candidate of availableCandidates) {
                        addMember(candidate.id, candidate.name, candidate.role)
                      }
                    }}
                  >
                    + 전체 담기 ({availableCandidates.length})
                  </CandidateQuickChip>
                )}
              </CandidateQuickBox>
            )}
            <MemberRows>
              {members.map((member) => (
                <MemberRow key={member.id}>
                  <MemberName>
                    <FiUser size={12} style={{ marginRight: 5, verticalAlign: -1 }} />
                    {member.name}
                  </MemberName>
                  <MemberRoleInput
                    aria-label={`${member.name} 조직 내 역할`}
                    value={member.roleTitle}
                    onChange={(event) => {
                      const nextRole = event.target.value
                      setMembers((previous) =>
                        previous.map((item) =>
                          item.id === member.id
                            ? { ...item, roleTitle: nextRole }
                            : item,
                        ),
                      )
                    }}
                    placeholder="역할 (예: 사무총장, 의장, 위원)"
                  />
                  <RemoveMemberBtn
                    type="button"
                    aria-label={`${member.name} 제거`}
                    onClick={() =>
                      setMembers((previous) =>
                        previous.filter((item) => item.id !== member.id),
                      )
                    }
                  >
                    <FiX size={13} />
                  </RemoveMemberBtn>
                </MemberRow>
              ))}
              <AddMemberBtn
                type="button"
                onClick={() => setPersonPickerOpen(true)}
              >
                <FiPlus size={13} /> 소속 인물 검색·추가
              </AddMemberBtn>
            </MemberRows>
          </Field>

          <PrimaryBtn
            type="button"
            disabled={!name.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            <FiPlus size={16} />
            기구·조직 만들기
          </PrimaryBtn>
        </Body>
      </Modal>
      {personPickerOpen && (
        <PersonSelectModal
          persons={allPersonsQuery.data ?? []}
          selectedPersonId=""
          title="소속 인물·위원 추가"
          excludeIds={members.map((member) => member.id)}
          onSelect={(personId, personName) => {
            addMember(personId, personName)
            setPersonPickerOpen(false)
          }}
          onClose={() => setPersonPickerOpen(false)}
        />
      )}
      <CountryPicker
        isOpen={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        mode="single"
        title="회원국·파트너국 추가"
        modernCountries={countriesQuery.data ?? []}
        historicalCountries={historicalCountriesQuery.data ?? []}
        selectedIds={countryMemberships
          .map((cm) => cm.countryId ?? cm.historicalCountryId ?? '')
          .filter(Boolean)}
        onSelect={(picked) => {
          const matchedFlag = picked.isHistorical
            ? null
            : ((countriesQuery.data ?? []).find((c) => c.id === picked.id)
                ?.flagEmoji ?? null)
          addCountryDraft({
            countryId: picked.isHistorical ? undefined : picked.id,
            historicalCountryId: picked.isHistorical ? picked.id : undefined,
            name: picked.name,
            flagEmoji: matchedFlag,
          })
          setCountryPickerOpen(false)
        }}
      />
    </Overlay>,
    document.body,
  )
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  background: ${({ theme }) => ledgerScrim(theme.mode)};
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`

const Modal = styled.div`
  width: min(580px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerOverlay(theme.mode)};
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.34);
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 13px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const Title = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CloseBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: 4px;
  border-radius: ${RADIUS.SM};
  display: inline-flex;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Body = styled.div`
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const CondRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const FieldLabel = styled.label`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Muted = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TypeChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const TypeChip = styled.button<{ $active: boolean }>`
  padding: 4px 10px;
  border-radius: ${RADIUS.SM};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  transition: border-color 0.12s, color 0.12s, background 0.12s;
  &:hover {
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const ExampleNote = styled.div`
  font-size: 11.5px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const BigInput = styled.input`
  height: 35px;
  padding: 0 11px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const BigSelect = styled.select`
  height: 35px;
  padding: 0 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const BigTextarea = styled.textarea`
  padding: 9px 11px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  resize: vertical;
  font-family: inherit;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const PrimaryBtn = styled.button`
  margin-top: 6px;
  height: 38px;
  border-radius: ${RADIUS.SM};
  border: none;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#0e0f12' : '#ffffff')};
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const CandidateQuickBox = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  padding: 7px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const CandidateQuickLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 2px;
`

const CandidateQuickChip = styled.button<{ $accent?: boolean }>`
  padding: 3px 9px;
  border-radius: ${RADIUS.PILL};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $accent }) =>
      $accent
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $accent }) =>
    $accent ? ledgerAccentSubtle(theme.mode) : theme.colors.background.primary};
  color: ${({ theme, $accent }) =>
    $accent ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const MemberRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const MemberRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const MemberName = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 110px;
`

const MemberRoleInput = styled.input`
  flex: 1;
  min-width: 110px;
  height: 27px;
  padding: 0 8px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
`

const MemberRoleSelect = styled.select`
  flex: 1;
  min-width: 120px;
  height: 27px;
  padding: 0 8px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
`

const RemoveMemberBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  display: inline-flex;
  padding: 3px;
  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }
`

const AddMemberBtn = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`
