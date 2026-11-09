/**
 * 인물 묶음 생성 모달 — 인물 컨텍스트 없이(허브/상세에서) 새 묶음을 만든다.
 * 유형 칩 그리드 + 이름 + (세대순번/중심인물) + 설명 + 초기 멤버 다중 선택.
 */
import { useEffect, useState } from 'react'

import { createPortal } from 'react-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiPlus, FiX } from 'react-icons/fi'
import styled, { type DefaultTheme } from 'styled-components'

import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { getAllPersons } from '@/shared/api/persons'
import {
  PERSON_GROUP_TYPE_META,
  createPersonGroup,
  type PersonGroup,
  type PersonGroupType,
} from '@/shared/api/person-groups'
import { useBodyScrollLock } from '@/shared/hooks/use-body-scroll-lock.hook'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { notify } from '@/shared/ui/toast'
import { GroupTypeChips } from '@/widgets/person/person-group-ui/group-type-ui'
import { Z_INDEX } from '@/shared/styles/z-index'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

interface Props {
  /** 기본 현대 국가 (국가 상세에서 생성 시) */
  defaultCountryId?: string
  /** 기본 역사 국가 (사건·역사 국가에서 생성 시) */
  defaultHistoricalCountryId?: string
  /** 기본 유형 (사건 진영에서 생성 시 'FACTION') */
  defaultType?: PersonGroupType
  /** 기본 이름 */
  defaultName?: string
  /** 초기 멤버 목록 */
  defaultMembers?: Array<{ id: string; name: string }>
  /** 현재 사건·진영에 추가되어 있는 추천 인물 목록 */
  candidatePersons?: Array<{ id: string; name: string }>
  onCreated: (group: PersonGroup) => void
  onClose: () => void
}

interface MemberDraft {
  id: string
  name: string
}

export function PersonGroupCreateModal({
  defaultCountryId,
  defaultHistoricalCountryId,
  defaultType = 'GENERATION',
  defaultName = '',
  defaultMembers = [],
  candidatePersons = [],
  onCreated,
  onClose,
}: Props) {
  const [name, setName] = useState(defaultName)
  const [type, setType] = useState<PersonGroupType>(defaultType)
  const [generationOrder, setGenerationOrder] = useState('')
  const [description, setDescription] = useState('')
  const [countryId, setCountryId] = useState(defaultCountryId ?? '')
  const [historicalCountryId, setHistoricalCountryId] = useState(
    defaultHistoricalCountryId ?? '',
  )
  const [centerId, setCenterId] = useState('')
  const [centerName, setCenterName] = useState('')
  const [members, setMembers] = useState<MemberDraft[]>(defaultMembers)
  const [picker, setPicker] = useState<'member' | 'center' | null>(null)

  const queryClient = useQueryClient()

  useBodyScrollLock(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (picker) return
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picker, onClose])

  const allPersonsQuery = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: () => getAllPersons(),
  })
  const countriesQuery = useQuery({
    queryKey: ['all-countries'],
    queryFn: () => getAllCountries(),
    staleTime: 5 * 60_000,
  })
  const historicalCountriesQuery = useQuery({
    queryKey: ['all-historical-countries'],
    queryFn: () => getAllHistoricalCountries(),
    staleTime: 5 * 60_000,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createPersonGroup({
        name: name.trim(),
        type,
        description: description.trim() || null,
        generationOrder:
          type === 'GENERATION' && generationOrder.trim()
            ? Number(generationOrder)
            : null,
        countryId: countryId || null,
        historicalCountryId: historicalCountryId || null,
        centerPersonId: centerId || null,
        memberPersonIds: members.map((member) => member.id),
      }),
    onSuccess: (group) => {
      notify.success('묶음을 만들었습니다.')
      void queryClient.invalidateQueries({ queryKey: ['person-groups-all'] })
      void queryClient.invalidateQueries({ queryKey: ['person-groups-by-person'] })
      onCreated(group)
    },
    onError: () => notify.error('묶음 생성에 실패했습니다.'),
  })

  const handleSelect = (id: string, pname: string) => {
    if (picker === 'member') {
      setMembers((prev) =>
        prev.some((member) => member.id === id) ? prev : [...prev, { id, name: pname }],
      )
    } else if (picker === 'center') {
      setCenterId(id)
      setCenterName(pname)
    }
    setPicker(null)
  }

  return createPortal(
    <Overlay onClick={onClose}>
      <Modal
        role="dialog"
        aria-modal="true"
        aria-label="새 묶음 만들기"
        onClick={(event) => event.stopPropagation()}
      >
        <Header>
          <Title>새 묶음 만들기</Title>
          <CloseBtn type="button" onClick={onClose} aria-label="닫기">
            <FiX size={22} />
          </CloseBtn>
        </Header>

        <Body>
          <FieldLabel>유형 선택</FieldLabel>
          <GroupTypeChips value={type} onChange={setType} />
          <ExampleNote>{PERSON_GROUP_TYPE_META[type].example}</ExampleNote>

          <Field>
            <FieldLabel>이름</FieldLabel>
            <BigInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  name.trim() &&
                  !createMutation.isPending
                ) {
                  event.preventDefault()
                  createMutation.mutate()
                }
              }}
              placeholder="예: 지롱드파, 산악파, 중국공산당 혁명 1세대"
              autoFocus
            />
          </Field>

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
                {(historicalCountriesQuery.data ?? []).map((hc) => (
                  <option key={hc.id} value={hc.id}>
                    {hc.name}
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

          <CondRow>
            {type === 'GENERATION' && (
              <Field style={{ width: 150 }}>
                <FieldLabel>세대 순번</FieldLabel>
                <BigInput
                  type="number"
                  value={generationOrder}
                  onChange={(event) => setGenerationOrder(event.target.value)}
                  placeholder="1"
                />
              </Field>
            )}
            <Field style={{ flex: 1, minWidth: 200 }}>
              <FieldLabel>
                중심 인물 <Muted>(구심점, 선택)</Muted>
              </FieldLabel>
              <PickerRow>
                <PickerValue $empty={!centerId}>
                  {centerId ? `★ ${centerName}` : '미지정'}
                </PickerValue>
                <SmallBtn type="button" onClick={() => setPicker('center')}>
                  선택
                </SmallBtn>
                {centerId && (
                  <SmallBtn
                    type="button"
                    onClick={() => {
                      setCenterId('')
                      setCenterName('')
                    }}
                  >
                    해제
                  </SmallBtn>
                )}
              </PickerRow>
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
              placeholder="맥락·시기·계기 등 자유 서술"
            />
          </Field>

          <Field>
            <FieldLabel>
              초기 멤버 <Muted>(선택, 나중에 추가 가능)</Muted>
            </FieldLabel>
            {candidatePersons.some(
              (candidate) => !members.some((member) => member.id === candidate.id),
            ) && (
              <CandidateQuickBox>
                <CandidateQuickLabel>
                  현재 사건 인물에서 빠른 추가:
                </CandidateQuickLabel>
                {candidatePersons
                  .filter(
                    (candidate) =>
                      !members.some((member) => member.id === candidate.id),
                  )
                  .map((candidate) => (
                    <CandidateQuickChip
                      key={candidate.id}
                      type="button"
                      onClick={() =>
                        setMembers((prev) =>
                          prev.some((item) => item.id === candidate.id)
                            ? prev
                            : [...prev, { id: candidate.id, name: candidate.name }],
                        )
                      }
                    >
                      + {candidate.name}
                    </CandidateQuickChip>
                  ))}
                {candidatePersons.filter(
                  (candidate) =>
                    !members.some((member) => member.id === candidate.id),
                ).length > 1 && (
                  <CandidateQuickChip
                    type="button"
                    $accent
                    onClick={() =>
                      setMembers((prev) => {
                        const existingIds = new Set(prev.map((item) => item.id))
                        const additions = candidatePersons.filter(
                          (candidate) => !existingIds.has(candidate.id),
                        )
                        return [...prev, ...additions]
                      })
                    }
                  >
                    + 전체 담기
                  </CandidateQuickChip>
                )}
              </CandidateQuickBox>
            )}
            <MemberChips>
              {members.map((member) => (
                <MemberChip key={member.id}>
                  {member.name}
                  <ChipX
                    type="button"
                    onClick={() =>
                      setMembers((prev) => prev.filter((item) => item.id !== member.id))
                    }
                  >
                    <FiX size={12} />
                  </ChipX>
                </MemberChip>
              ))}
              <AddMemberBtn type="button" onClick={() => setPicker('member')}>
                <FiPlus size={14} /> 멤버 추가
              </AddMemberBtn>
            </MemberChips>
          </Field>

          <PrimaryBtn
            type="button"
            disabled={!name.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            <FiPlus size={18} />
            만들기
          </PrimaryBtn>
        </Body>
      </Modal>

      {picker && (
        <PersonSelectModal
          persons={allPersonsQuery.data ?? []}
          selectedPersonId=""
          title={picker === 'center' ? '중심 인물 선택' : '멤버 추가'}
          excludeIds={picker === 'member' ? members.map((member) => member.id) : []}
          onSelect={handleSelect}
          onClose={() => setPicker(null)}
        />
      )}
    </Overlay>,
    document.body,
  )
}

/* ─── styles (manage 모달과 동일 톤) ─────────────────────────────────────── */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

const Modal = styled.div`
  z-index: ${Z_INDEX.MODAL_CONTENT};
  width: 640px;
  max-width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const Title = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CloseBtn = styled.button`
  display: inline-flex;
  padding: 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  border-radius: 10px;
  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Body = styled.div`
  padding: 22px 26px 26px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const CondRow = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-end;
  flex-wrap: wrap;
`

const FieldLabel = styled.label`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Muted = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ExampleNote = styled.p`
  margin: -4px 0 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  min-height: 16px;
`

const inputStyles = ({ theme }: { theme: DefaultTheme }) => `
  width: 100%;
  padding: 11px 13px;
  font-size: 14px;
  border-radius: 10px;
  border: 1px solid ${theme.colors.border.default};
  background: ${theme.colors.background.primary};
  color: ${theme.colors.text.primary};
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px ${theme.colors.primary}22;
  }
`

const BigInput = styled.input`
  ${inputStyles}
`
const BigSelect = styled.select`
  ${inputStyles}
`
const BigTextarea = styled.textarea`
  ${inputStyles}
  resize: vertical;
  line-height: 1.5;
`

const PickerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const PickerValue = styled.div<{ $empty: boolean }>`
  flex: 1;
  padding: 11px 13px;
  font-size: 13.5px;
  font-weight: ${({ $empty }) => ($empty ? 500 : 700)};
  border-radius: 10px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  color: ${({ $empty, theme }) =>
    $empty ? theme.colors.text.tertiary : theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const SmallBtn = styled.button`
  padding: 9px 14px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const MemberChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
`

const MemberChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 8px 6px 12px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
`

const ChipX = styled.button`
  display: inline-flex;
  padding: 2px;
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  border-radius: 50%;
  &:hover {
    opacity: 1;
  }
`

const AddMemberBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const PrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  align-self: flex-start;
  margin-top: 4px;
  padding: 12px 22px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 10px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
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
