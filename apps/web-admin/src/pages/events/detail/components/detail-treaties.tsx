/**
 * 사건에 걸린 조약 — "이 사건에서 무엇이 체결되었나".
 *
 * 설계: 조약 본문·조항·서명자는 **Treaty가 정본**이고 사건은 링크만 갖는다. 같은
 * 사실(누가 서명했나)을 사건 쪽에 한 번 더 적지 않기 위해서다. 그래서 이 모듈이 하는
 * 일은 셋뿐이다 — 연결, 새 조약 만들기(참여국 승격), 연결 해제.
 *
 * '새 조약 만들기'가 핵심 동선이다. 사건의 참여국·시작일·제목을 그대로 조약 초안으로
 * 승격하므로, 조약 지면에서 서명국을 처음부터 다시 고를 일이 없다. 승격된 뒤 서명
 * 인물·직책·국가별 서명일 같은 **조약 고유의 사실**만 조약 상세에서 채우면 된다.
 */
import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiExternalLink, FiPlus, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  TREATY_EVENT_LINK_LABELS,
  TREATY_TYPE_LABELS,
  type CreateTreatySignatoryNested,
  type TreatyEventLinkType,
  type TreatyType,
  treatyApi,
} from '@/shared/api/treaty'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

import { metaText } from '@/pages/events/styles/theme'
import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'

interface DetailTreatiesProps {
  event: EventDetail
  /** 연결이 바뀌면 사건 상세를 다시 읽어야 한다(treaties는 상세 응답에 실린다). */
  onInvalidate: () => void
}

/**
 * 참여국 역할 → 조약 참여 유형.
 * 중재·관찰은 조약에도 같은 개념이 있어 그대로 옮기고, 나머지는 서명국으로 본다
 * (보증국·비준국은 사건 역할로 표현되지 않으므로 조약 지면에서 고친다).
 */
function participationTypeFromRole(
  role: string | null | undefined,
): CreateTreatySignatoryNested['participationType'] {
  if (role === 'MEDIATOR') return 'MEDIATOR'
  if (role === 'OBSERVER') return 'OBSERVER'
  return 'SIGNATORY'
}

/** 제목에서 조약 유형을 추정 — 틀려도 조약 지면에서 한 번에 고칠 수 있는 값이다. */
function guessTreatyType(title: string): TreatyType {
  if (/불가침/.test(title)) return 'NON_AGGRESSION'
  if (/동맹/.test(title)) return 'ALLIANCE'
  if (/통상|무역|교역/.test(title)) return 'TRADE'
  if (/강화|평화|종전/.test(title)) return 'PEACE'
  if (/국경/.test(title)) return 'BORDER'
  if (/군축/.test(title)) return 'DISARMAMENT'
  if (/영토|할양/.test(title)) return 'TERRITORIAL'
  if (/비밀/.test(title)) return 'SECRET'
  if (/우호/.test(title)) return 'FRIENDSHIP'
  return 'OTHER'
}

/** 사건 제목에서 조약명 후보 — "…조약 체결"의 꼬리를 떼어 이름만 남긴다. */
function treatyNameFromEventTitle(title: string): string {
  return title.replace(/\s*(체결|조인|서명|선포)\s*$/u, '').trim() || title
}

export function DetailTreaties({ event, onInvalidate }: DetailTreatiesProps) {
  const queryClient = useQueryClient()
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const treaties = event.treaties ?? []

  /** 연결 후보 — 이미 걸린 조약은 뺀다. 모달을 열 때만 가져온다. */
  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ['treaties', 'link-candidates'],
    queryFn: () => treatyApi.getAll({ take: 200 }),
    enabled: linkModalOpen,
    staleTime: 60_000,
  })

  const candidateOptions = useMemo(() => {
    const linkedIds = new Set(treaties.map((treaty) => treaty.id))
    return (candidates?.items ?? [])
      .filter((treaty) => !linkedIds.has(treaty.id))
      .map((treaty) => ({
        value: treaty.id,
        label: treaty.name,
        description: [
          TREATY_TYPE_LABELS[treaty.type],
          treaty.signDate ? treaty.signDate.slice(0, 10) : null,
          treaty.signatories?.length
            ? `서명국 ${treaty.signatories.length}`
            : null,
        ]
          .filter(Boolean)
          .join(' · '),
      }))
  }, [candidates, treaties])

  const invalidateTreaties = () => {
    void queryClient.invalidateQueries({ queryKey: ['treaties'] })
    onInvalidate()
  }

  const linkMutation = useMutation({
    mutationFn: (treatyId: string) =>
      treatyApi.linkEvent(treatyId, { eventId: event.id, linkType: 'SIGNING' }),
    onSuccess: () => {
      notify.success('조약을 이 사건에 연결했습니다')
      invalidateTreaties()
    },
    onError: () => notify.error('조약 연결에 실패했습니다'),
  })

  /**
   * 새 조약 만들기 — 서버가 조약 + 서명국을 한 트랜잭션으로 받으므로 POST 한 번이다.
   * 참여국이 곧 서명국 초안이 된다.
   */
  const createMutation = useMutation({
    mutationFn: async () => {
      const signatories: CreateTreatySignatoryNested[] = [
        ...(event.relatedCountries ?? []).map((country) => ({
          countryId: country.id,
          participationType: participationTypeFromRole(country.role),
          note: country.roleDescription ?? null,
        })),
        ...(event.relatedHistoricalCountries ?? []).map((country) => ({
          historicalCountryId: country.id,
          participationType: participationTypeFromRole(country.role),
          note: country.roleDescription ?? null,
        })),
      ]
      const treaty = await treatyApi.create({
        name: treatyNameFromEventTitle(event.title),
        type: guessTreatyType(event.title),
        signDate: event.startDate ?? new Date().toISOString(),
        location: event.location ?? null,
        summary: event.description ?? null,
        signatories,
        allowDuplicateSignDate: true,
      })
      await treatyApi.linkEvent(treaty.id, {
        eventId: event.id,
        linkType: 'SIGNING',
      })
      return treaty
    },
    onSuccess: (treaty) => {
      notify.success(
        `조약 「${treaty.name}」을 만들고 참여국을 서명국으로 옮겼습니다`,
      )
      invalidateTreaties()
    },
    onError: () => notify.error('조약 생성에 실패했습니다'),
  })

  const unlinkMutation = useMutation({
    mutationFn: (linkId: string) => treatyApi.unlinkEvent(linkId),
    onSuccess: () => {
      notify.success('연결을 해제했습니다 (조약 자체는 남아 있습니다)')
      invalidateTreaties()
    },
    onError: () => notify.error('연결 해제에 실패했습니다'),
  })

  const handleUnlink = async (linkId: string, name: string) => {
    const ok = await confirm({
      title: '연결 해제',
      message: `「${name}」과 이 사건의 연결만 끊습니다. 조약 자체와 서명국 정보는 그대로 남습니다.`,
      confirmLabel: '연결 해제',
      danger: true,
    })
    if (ok) unlinkMutation.mutate(linkId)
  }

  const hasParticipants =
    (event.relatedCountries?.length ?? 0) +
      (event.relatedHistoricalCountries?.length ?? 0) >
    0

  return (
    <S.Section id="treaties">
      <S.SectionHeader>
        <S.SectionTitle>조약</S.SectionTitle>
      </S.SectionHeader>

      {treaties.length > 0 ? (
        <TreatyList>
          {treaties.map((treaty) => (
            <TreatyRow key={treaty.linkId}>
              <TreatyBody>
                <TreatyNameLine>
                  <TreatyLink to={pathKeys.treaties.detail(treaty.id)}>
                    {treaty.name}
                    <FiExternalLink size={13} aria-hidden />
                  </TreatyLink>
                  <LinkKindBadge>
                    {
                      TREATY_EVENT_LINK_LABELS[
                        treaty.linkType as TreatyEventLinkType
                      ]
                    }
                  </LinkKindBadge>
                </TreatyNameLine>
                <TreatyMeta>
                  {[
                    TREATY_TYPE_LABELS[treaty.type as TreatyType],
                    treaty.signDate ? treaty.signDate.slice(0, 10) : null,
                    `서명국 ${treaty.signatoryCount}`,
                    treaty.termCount > 0 ? `조항 ${treaty.termCount}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </TreatyMeta>
              </TreatyBody>
              <UnlinkBtn
                type="button"
                onClick={() => handleUnlink(treaty.linkId, treaty.name)}
                aria-label={`${treaty.name} 연결 해제`}
              >
                <FiX />
              </UnlinkBtn>
            </TreatyRow>
          ))}
        </TreatyList>
      ) : (
        <EmptyNote>
          {hasParticipants
            ? '참여국을 그대로 서명국으로 옮겨 조약을 만들 수 있습니다.'
            : '이 사건에서 체결된 조약을 만들거나, 이미 등록된 조약을 연결하세요.'}
        </EmptyNote>
      )}

      <Actions>
        <ActionBtn
          type="button"
          $primary
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          title={
            hasParticipants
              ? '참여국을 서명국 초안으로 옮겨 새 조약을 만듭니다'
              : '참여국이 없어 서명국은 빈 채로 만들어집니다'
          }
        >
          <FiPlus size={14} />
          {createMutation.isPending ? '만드는 중…' : '조약 만들기'}
        </ActionBtn>
        <ActionBtn type="button" onClick={() => setLinkModalOpen(true)}>
          기존 조약 연결
        </ActionBtn>
      </Actions>

      <SelectModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        title="연결할 조약 선택"
        options={candidateOptions}
        isLoading={candidatesLoading}
        searchable
        searchPlaceholder="조약명으로 검색..."
        onSelect={(treatyId) => {
          setLinkModalOpen(false)
          linkMutation.mutate(treatyId)
        }}
      />
    </S.Section>
  )
}

/* ───────────────────────── styles ───────────────────────── */

const TreatyList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

const TreatyRow = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`

const TreatyBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const TreatyNameLine = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`

const TreatyLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const LinkKindBadge = styled.span`
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/* 조약의 체결일·종류 — 이 섹션에서 사용자가 실제로 읽는 데이텀이다. */
const TreatyMeta = styled.div`
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

const EmptyNote = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: ${metaText};
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
`

/* 두 동작의 무게를 가른다 — 만들기가 이 섹션의 본 동작이고 연결은 보조다. */
const ActionBtn = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid
    ${({ theme, $primary }) =>
      $primary ? theme.colors.text.primary : theme.colors.border};
  border-radius: 8px;
  background-color: ${({ theme, $primary }) =>
    $primary ? theme.colors.text.primary : 'transparent'};
  color: ${({ theme, $primary }) =>
    $primary ? theme.colors.background.primary : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 13px;
  font-weight: ${({ $primary }) => ($primary ? 600 : 500)};
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s, opacity 0.14s;

  &:hover:not(:disabled) {
    ${({ $primary, theme }) =>
      $primary
        ? 'opacity: 0.86;'
        : `color: ${theme.colors.text.primary}; border-color: ${theme.colors.text.tertiary};`}
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`

const UnlinkBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background-color: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }
`
