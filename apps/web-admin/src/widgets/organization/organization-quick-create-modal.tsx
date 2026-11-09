import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { getApiConnection } from '@/shared/api/client'
import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import {
  createOrganization,
  type OrganizationResponseDto,
  type OrganizationType,
} from '@/shared/api/organizations'
import { getAllPersons } from '@/shared/api/persons'
import { Z_INDEX } from '@/shared/styles/z-index'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { notify } from '@/shared/ui/toast'

const QUICK_ORG_TYPES: Array<{
  value: OrganizationType
  label: string
  example: string
}> = [
  {
    value: 'GOVERNMENT_AGENCY',
    label: '행정기구·위원회·의회',
    example: '예: 공안위원회, 보안위원회, 국민공회, 혁명재판소, 파리 코뮌',
  },
  {
    value: 'POLITICAL_PARTY',
    label: '정당·정치결사',
    example: '예: 자코뱅 클럽, 공화당 전국위원회, 중국국민당',
  },
  {
    value: 'MILITARY_ALLIANCE',
    label: '군사동맹·무장조직',
    example: '예: 국민위병대, 신모범군, 북대서양조약기구(NATO)',
  },
  {
    value: 'INTERGOVERNMENTAL_ORG',
    label: '국제기구',
    example: '예: 국제연맹, 유엔(UN), 유럽연합(EU)',
  },
  {
    value: 'NGO',
    label: '시민단체·결사',
    example: '예: 삼민주의청년단, 인권협회',
  },
  {
    value: 'COMPANY',
    label: '기업·특허회사',
    example: '예: 영국 동인도회사, 네덜란드 동인도회사',
  },
  {
    value: 'RELIGIOUS_ORG',
    label: '종교단체·교단',
    example: '예: 예수회, 성전기사단',
  },
  {
    value: 'OTHER',
    label: '기타 조직',
    example: '예: 기타 역사적 기구·단체',
  },
]

export interface OrganizationQuickMemberDraft {
  id: string
  name: string
  roleTitle: string
}

interface Props {
  defaultCountryId?: string
  defaultHistoricalCountryId?: string
  defaultName?: string
  defaultType?: OrganizationType
  /** 사건·진영에 이미 추가된 인물들을 원클릭 추천 칩으로 표시 */
  candidatePersons?: Array<{ id: string; name: string; role?: string }>
  defaultMembers?: Array<{ id: string; name: string; roleTitle?: string }>
  onClose: () => void
  onCreated: (
    organization: OrganizationResponseDto,
    initialMembers?: OrganizationQuickMemberDraft[],
  ) => void
}

export function OrganizationQuickCreateModal({
  defaultCountryId,
  defaultHistoricalCountryId,
  defaultName,
  defaultType = 'GOVERNMENT_AGENCY',
  candidatePersons = [],
  defaultMembers = [],
  onClose,
  onCreated,
}: Props) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(defaultName ?? '')
  const [shortName, setShortName] = useState('')
  const [localName, setLocalName] = useState('')
  const [type, setType] = useState<OrganizationType>(defaultType)
  const [countryId, setCountryId] = useState(defaultCountryId ?? '')
  const [historicalCountryId, setHistoricalCountryId] = useState(
    defaultHistoricalCountryId ?? '',
  )
  const [description, setDescription] = useState('')
  const [members, setMembers] = useState<OrganizationQuickMemberDraft[]>(() =>
    defaultMembers.map((member) => ({
      id: member.id,
      name: member.name,
      roleTitle: member.roleTitle?.trim() || '위원',
    })),
  )
  const [personPickerOpen, setPersonPickerOpen] = useState(false)

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
      if (event.key === 'Escape' && !personPickerOpen) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, personPickerOpen])

  const createMutation = useMutation({
    mutationFn: () =>
      createOrganization(getApiConnection(), {
        name: name.trim(),
        shortName: shortName.trim() || null,
        localName: localName.trim() || null,
        type,
        scope: 'NATIONAL',
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
      }),
    onSuccess: (created) => {
      notify.success(
        members.length > 0
          ? `‘${created.name}’ 기관·조직과 소속 인물 ${members.length}명을 등록했습니다.`
          : `‘${created.name}’ 기관·조직을 등록했습니다.`,
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

  const currentTypeMeta =
    QUICK_ORG_TYPES.find((item) => item.value === type) ?? QUICK_ORG_TYPES[0]

  return createPortal(
    <Overlay onClick={onClose}>
      <Modal onClick={(event) => event.stopPropagation()}>
        <Header>
          <Title>새 기관·조직 등록</Title>
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
                onClick={() => setType(item.value)}
              >
                {item.label}
              </TypeChip>
            ))}
          </TypeChipRow>
          <ExampleNote>{currentTypeMeta.example}</ExampleNote>

          <Field>
            <FieldLabel>기관·조직명 *</FieldLabel>
            <BigInput
              aria-label="기관·조직명"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 공안위원회, 국민공회, 파리 코뮌"
              autoFocus
            />
          </Field>

          <CondRow>
            <Field style={{ flex: 1, minWidth: 160 }}>
              <FieldLabel>
                약칭 <Muted>(선택)</Muted>
              </FieldLabel>
              <BigInput
                value={shortName}
                onChange={(event) => setShortName(event.target.value)}
                placeholder="예: 공안위"
              />
            </Field>
            <Field style={{ flex: 1, minWidth: 160 }}>
              <FieldLabel>
                현지 표기 <Muted>(선택)</Muted>
              </FieldLabel>
              <BigInput
                value={localName}
                onChange={(event) => setLocalName(event.target.value)}
                placeholder="예: Comité de salut public"
              />
            </Field>
          </CondRow>

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
                  <MemberName>👤 {member.name}</MemberName>
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
                    placeholder="역할 (예: 위원, 의장)"
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
            기관·조직 만들기
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
    </Overlay>,
    document.body,
  )
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  background: rgba(9, 9, 11, 0.58);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`

const Modal = styled.div`
  width: min(560px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  box-shadow: 0 24px 72px rgba(0, 0, 0, 0.36);
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CloseBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Body = styled.div`
  padding: 18px 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const CondRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`

const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Muted = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TypeChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const TypeChip = styled.button<{ $active: boolean }>`
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  background: ${({ theme, $active }) =>
    $active ? `${theme.colors.primary}18` : theme.colors.background.secondary};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
`

const ExampleNote = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const BigInput = styled.input`
  height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13.5px;
`

const BigSelect = styled.select`
  height: 38px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
`

const BigTextarea = styled.textarea`
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  resize: vertical;
  font-family: inherit;
`

const PrimaryBtn = styled.button`
  margin-top: 6px;
  height: 40px;
  border-radius: 10px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-size: 13.5px;
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
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
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
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $accent }) =>
      $accent ? theme.colors.primary : theme.colors.border.default};
  background: ${({ theme, $accent }) =>
    $accent ? `${theme.colors.primary}18` : theme.colors.background.primary};
  color: ${({ theme, $accent }) =>
    $accent ? theme.colors.primary : theme.colors.text.secondary};
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const MemberRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const MemberRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const MemberName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 90px;
`

const MemberRoleInput = styled.input`
  flex: 1;
  min-width: 110px;
  height: 28px;
  padding: 0 8px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
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
  padding: 6px 11px;
  border-radius: 9px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`
