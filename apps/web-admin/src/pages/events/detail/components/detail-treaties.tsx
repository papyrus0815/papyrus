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
 *
 * 연결된 조약은 한 줄 요약이 아니라 **조약 문서 카드**로 보인다 — 수명(체결→발효→만료·파기),
 * 서명국, 첫 조항 몇 개. 사건을 읽다가 조약 지면으로 건너가지 않아도 "무엇을 약속했고 언제
 * 깨졌나"까지 답한다. 전문·편집은 여전히 조약 상세가 정본이다(카드는 미리보기만 받는다).
 */
import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiExternalLink, FiPlus, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerHairlineStrong,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'

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
import { InlineSelect } from '@/shared/ui/inline-edit'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

import { metaText } from '@/pages/events/styles/theme'
import * as S from '../styles'
import { TreatyContent } from './treaty-content'
import {
  type EventDetail,
  type EventDetailTreaty,
  type EventDetailTreatySignatory,
} from '../use-event-detail'
import {
  guessTreatyType,
  participationTypeFromRole,
  treatyNameFromEventTitle,
} from '@/features/event-facets/model/treaty-from-event'

interface DetailTreatiesProps {
  event: EventDetail
  /** 연결이 바뀌면 사건 상세를 다시 읽어야 한다(treaties는 상세 응답에 실린다). */
  onInvalidate: () => void
}

export function DetailTreaties({ event, onInvalidate }: DetailTreatiesProps) {
  const queryClient = useQueryClient()
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [showAllRecommended, setShowAllRecommended] = useState(false)
  /** 2단계 연결 — 조약을 고른 뒤 '이 사건과의 관계'(체결·비준·파기·관련)를 고른다 */
  const [pendingTreatyId, setPendingTreatyId] = useState<string | null>(null)
  const treaties = useMemo(() => event.treaties ?? [], [event.treaties])
  const eventYear = parseTreatyYmd(event.startDate)?.year ?? null
  const RECOMMEND_CHIP_CAP = 4

  /** 연결 후보 — 이미 걸린 조약은 뺀다. 사건 연도가 있거나 모달을 열 때 가져온다. */
  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ['treaties', 'link-candidates'],
    queryFn: () => treatyApi.getAll({ take: 200 }),
    enabled: linkModalOpen || eventYear !== null,
    staleTime: 60_000,
  })

  const recommendedTreaties = useMemo(() => {
    const items = candidates?.items ?? []
    if (items.length === 0) return []
    const linkedIds = new Set(treaties.map((treaty) => treaty.id))
    const normalizedTitle = treatyNameFromEventTitle(event.title).toLowerCase()
    return items
      .filter((treaty) => {
        if (linkedIds.has(treaty.id)) return false
        const treatyNameLower = treaty.name.toLowerCase()
        const nameMatch =
          normalizedTitle.length >= 2 &&
          (treatyNameLower.includes(normalizedTitle) ||
            normalizedTitle.includes(treatyNameLower))
        const signYear = parseTreatyYmd(treaty.signDate)?.year ?? null
        const yearMatch =
          eventYear !== null && signYear !== null && Math.abs(signYear - eventYear) <= 1
        return nameMatch || yearMatch
      })
      .sort((left, right) => {
        const leftNameMatch = left.name.toLowerCase().includes(normalizedTitle) ? 1 : 0
        const rightNameMatch = right.name.toLowerCase().includes(normalizedTitle) ? 1 : 0
        if (leftNameMatch !== rightNameMatch) return rightNameMatch - leftNameMatch
        const leftYear = parseTreatyYmd(left.signDate)?.year ?? (eventYear ?? 0)
        const rightYear = parseTreatyYmd(right.signDate)?.year ?? (eventYear ?? 0)
        return Math.abs(leftYear - (eventYear ?? 0)) - Math.abs(rightYear - (eventYear ?? 0))
      })
  }, [candidates?.items, event.title, eventYear, treaties])

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
    mutationFn: ({ treatyId, linkType }: { treatyId: string; linkType: TreatyEventLinkType }) =>
      treatyApi.linkEvent(treatyId, { eventId: event.id, linkType }),
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

  const changeLinkTypeMutation = useMutation({
    mutationFn: async ({
      treatyId,
      oldLinkId,
      nextLinkType,
    }: {
      treatyId: string
      oldLinkId: string
      nextLinkType: TreatyEventLinkType
    }) => {
      await treatyApi.linkEvent(treatyId, { eventId: event.id, linkType: nextLinkType })
      await treatyApi.unlinkEvent(oldLinkId)
    },
    onSuccess: () => {
      notify.success('사건-조약 관계 유형을 변경했습니다')
      invalidateTreaties()
    },
    onError: () => notify.error('관계 유형 변경에 실패했습니다'),
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

  const handleCreate = async () => {
    const participantCount =
      (event.relatedCountries?.length ?? 0) + (event.relatedHistoricalCountries?.length ?? 0)
    const name = treatyNameFromEventTitle(event.title)
    const ok = await confirm({
      title: '조약 만들기',
      message:
        participantCount > 0
          ? `「${name}」(${TREATY_TYPE_LABELS[guessTreatyType(event.title)]})을 만들고 참여국 ${participantCount}곳을 서명국으로 옮깁니다. 이름·유형·서명 인물은 조약 상세에서 고칠 수 있습니다.`
          : `「${name}」(${TREATY_TYPE_LABELS[guessTreatyType(event.title)]})을 만듭니다. 참여국이 없어 서명국은 비어 있습니다.`,
      confirmLabel: '만들기',
    })
    if (ok) createMutation.mutate()
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
            <TreatyCard
              key={treaty.linkId}
              treaty={treaty}
              onChangeLinkType={(nextLinkType) => {
                if (nextLinkType === treaty.linkType) return
                changeLinkTypeMutation.mutate({
                  treatyId: treaty.id,
                  oldLinkId: treaty.linkId,
                  nextLinkType,
                })
              }}
              onUnlink={() => handleUnlink(treaty.linkId, treaty.name)}
              onChanged={onInvalidate}
            />
          ))}
        </TreatyList>
      ) : (
        <EmptyNote>
          {hasParticipants
            ? '참여국을 그대로 서명국으로 옮겨 조약을 만들 수 있습니다.'
            : '이 사건에서 체결된 조약을 만들거나, 이미 등록된 조약을 연결하세요.'}
        </EmptyNote>
      )}

      {recommendedTreaties.length > 0 && (
        <RecommendBar aria-label="동시대 추천 조약 빠른 연결">
          <RecommendLabel>동시대·제목 일치 추천 조약 원클릭 연결</RecommendLabel>
          <RecommendChipGroup>
            {(showAllRecommended
              ? recommendedTreaties
              : recommendedTreaties.slice(0, RECOMMEND_CHIP_CAP)
            ).map((candidateTreaty) => {
              const dateText = formatTreatyDate(candidateTreaty.signDate)
              return (
                <RecommendChipBtn
                  key={candidateTreaty.id}
                  type="button"
                  disabled={linkMutation.isPending}
                  onClick={() =>
                    linkMutation.mutate({
                      treatyId: candidateTreaty.id,
                      linkType: 'SIGNING',
                    })
                  }
                >
                  <span>📜</span>
                  <strong>{candidateTreaty.name}</strong>
                  {dateText && <RecommendChipSub>({dateText})</RecommendChipSub>}
                  <RecommendChipPlus>+ 체결 연결</RecommendChipPlus>
                </RecommendChipBtn>
              )
            })}
            {recommendedTreaties.length > RECOMMEND_CHIP_CAP && (
              <RecommendMoreBtn
                type="button"
                onClick={() => setShowAllRecommended((previous) => !previous)}
              >
                {showAllRecommended
                  ? '접기'
                  : `+${recommendedTreaties.length - RECOMMEND_CHIP_CAP}건 더 보기`}
              </RecommendMoreBtn>
            )}
          </RecommendChipGroup>
        </RecommendBar>
      )}

      <Actions>
        <ActionBtn
          type="button"
          $primary
          onClick={() => void handleCreate()}
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
          setPendingTreatyId(treatyId)
        }}
      />

      <SelectModal
        isOpen={pendingTreatyId !== null}
        onClose={() => setPendingTreatyId(null)}
        title="이 사건과 조약의 관계"
        options={LINK_TYPE_OPTIONS}
        onSelect={(linkType) => {
          const treatyId = pendingTreatyId
          setPendingTreatyId(null)
          if (treatyId) linkMutation.mutate({ treatyId, linkType: linkType as TreatyEventLinkType })
        }}
      />
    </S.Section>
  )
}

const LINK_TYPE_OPTIONS: Array<{ value: TreatyEventLinkType; label: string; description: string }> = [
  { value: 'SIGNING', label: TREATY_EVENT_LINK_LABELS.SIGNING, description: '회담·조인식처럼 조약이 서명된 사건' },
  { value: 'RATIFICATION', label: TREATY_EVENT_LINK_LABELS.RATIFICATION, description: '의회 비준·발효 절차가 이뤄진 사건' },
  { value: 'VIOLATION', label: TREATY_EVENT_LINK_LABELS.VIOLATION, description: '침공·폐기 선언처럼 조약이 깨진 사건' },
  { value: 'RELATED', label: TREATY_EVENT_LINK_LABELS.RELATED, description: '그 밖에 조약과 이어지는 사건' },
]

const PARTICIPATION_SUFFIX: Partial<Record<EventDetailTreatySignatory['participationType'], string>> = {
  GUARANTOR: '보증',
  MEDIATOR: '중재',
  RATIFIER: '비준',
  OBSERVER: '참관',
}

/** ISO → '1939. 8. 23' — Date를 거치지 않는다(시간대에 따라 하루 밀리는 사고 방지). */
function formatTreatyDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const match = /^(-?\d{1,6})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return null
  return `${Number(match[1])}. ${Number(match[2])}. ${Number(match[3])}`
}

function parseTreatyYmd(
  iso: string | null | undefined,
): { year: number; month: number; day: number } | null {
  if (!iso) return null
  const match = /^(-?\d{1,6})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

/** 체결(또는 발효)부터 파기·만료까지 유지된 기간 요약 */
function formatTreatyActiveSpan(treaty: EventDetailTreaty): {
  label: string
  tone: 'normal' | 'ended' | 'broken'
} | null {
  const start = parseTreatyYmd(treaty.effectiveDate ?? treaty.signDate)
  const endIso = treaty.violationDate ?? treaty.expiryDate
  const end = parseTreatyYmd(endIso)
  if (!start || !end) return null
  const totalDays =
    (end.year - start.year) * 365.25 +
    (end.month - start.month) * 30.4375 +
    (end.day - start.day)
  if (totalDays < 0) return null
  const spanText =
    totalDays < 60
      ? `${Math.max(1, Math.round(totalDays))}일`
      : totalDays < 365
        ? `약 ${Math.max(1, Math.round(totalDays / 30.4375))}개월`
        : `약 ${(totalDays / 365.25).toFixed(1).replace(/\.0$/, '')}년`
  if (treaty.violationDate) {
    return { label: `${spanText} 만에 파기`, tone: 'broken' }
  }
  return { label: `${spanText} 유지 후 만료`, tone: 'ended' }
}

interface LifecycleStep {
  key: string
  label: string
  date: string
  tone: 'normal' | 'ended' | 'broken'
}

/** 체결 → 발효 → 만료 / 파기. 날짜가 있는 단계만 — 빈 단계를 '미상'으로 세우지 않는다. */
function lifecycleSteps(treaty: EventDetailTreaty): LifecycleStep[] {
  const steps: LifecycleStep[] = []
  const signed = formatTreatyDate(treaty.signDate)
  const effective = formatTreatyDate(treaty.effectiveDate)
  const expired = formatTreatyDate(treaty.expiryDate)
  const violated = formatTreatyDate(treaty.violationDate)
  if (signed) steps.push({ key: 'signed', label: '체결', date: signed, tone: 'normal' })
  if (effective && effective !== signed) {
    steps.push({ key: 'effective', label: '발효', date: effective, tone: 'normal' })
  }
  if (violated) steps.push({ key: 'violated', label: '파기', date: violated, tone: 'broken' })
  else if (expired) steps.push({ key: 'expired', label: '만료', date: expired, tone: 'ended' })
  return steps
}

function TreatyCard({
  treaty,
  onChangeLinkType,
  onUnlink,
  onChanged,
}: {
  treaty: EventDetailTreaty
  onChangeLinkType: (nextLinkType: TreatyEventLinkType) => void
  onUnlink: () => void
  onChanged: () => void
}) {
  const steps = lifecycleSteps(treaty)
  const activeSpan = formatTreatyActiveSpan(treaty)
  const signatories = treaty.signatories ?? []
  const hiddenSignatories = Math.max(0, treaty.signatoryCount - signatories.length)
  const detailPath = pathKeys.treaties.detail(treaty.id)

  return (
    <TreatyRow>
      <TreatyHead>
        <TreatyNameLine>
          <TreatyLink to={detailPath}>
            {treaty.name}
            <FiExternalLink size={13} aria-hidden />
          </TreatyLink>
          <LinkKindBadge title="클릭하여 사건-조약 관계 유형 변경">
            <InlineSelect
              value={treaty.linkType as TreatyEventLinkType}
              options={LINK_TYPE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              onSave={(nextLinkType) => onChangeLinkType(nextLinkType)}
              label={`${treaty.name} 관계 유형`}
            />
          </LinkKindBadge>
        </TreatyNameLine>
        <UnlinkBtn type="button" onClick={onUnlink} aria-label={`${treaty.name} 연결 해제`}>
          <FiX />
        </UnlinkBtn>
      </TreatyHead>

      <TreatyMeta>
        {[
          TREATY_TYPE_LABELS[treaty.type as TreatyType],
          treaty.location,
          treaty.alias ? `일명 ${treaty.alias}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </TreatyMeta>

      {steps.length > 0 && (
        <LifecycleBar>
          <Lifecycle aria-label="조약 수명">
            {steps.map((step) => (
              <LifecycleStepItem key={step.key} $tone={step.tone}>
                <StepDot $tone={step.tone} aria-hidden />
                <StepLabel>{step.label}</StepLabel>
                <StepDate>{step.date}</StepDate>
              </LifecycleStepItem>
            ))}
          </Lifecycle>
          {activeSpan && (
            <LifecycleSpanBadge $tone={activeSpan.tone}>
              {activeSpan.label}
            </LifecycleSpanBadge>
          )}
        </LifecycleBar>
      )}
      {treaty.violationDate && treaty.violationReason && (
        <ViolationReason>{treaty.violationReason}</ViolationReason>
      )}

      {signatories.length > 0 && (
        <Facet>
          <FacetLabel>서명국</FacetLabel>
          <SignatoryList>
            {signatories.map((signatory, index) => (
              <Signatory key={`${signatory.countryId ?? signatory.historicalCountryId ?? 'none'}-${index}`}>
                <span>{signatory.countryName ?? '국가 미상'}</span>
                {PARTICIPATION_SUFFIX[signatory.participationType] && (
                  <SignatoryRole>{PARTICIPATION_SUFFIX[signatory.participationType]}</SignatoryRole>
                )}
                {signatory.personName && <SignatoryPerson>{signatory.personName}</SignatoryPerson>}
              </Signatory>
            ))}
            {hiddenSignatories > 0 && <MoreNote>외 {hiddenSignatories}곳</MoreNote>}
          </SignatoryList>
        </Facet>
      )}

      {/* 조약 내용 — 개요 + 조항 전문(읽기·더하기·고치기). 예전엔 조항 앞 3개 발췌뿐, 개요는 그리지 않았다 */}
      <TreatyContent treatyId={treaty.id} summary={treaty.summary} onChanged={onChanged} />
    </TreatyRow>
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
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child {
    padding-top: 4px;
  }

  &:last-child {
    border-bottom: none;
  }
`

const TreatyHead = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
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
  border-radius: ${RADIUS.PILL};
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

/* 수명 — 단계 사이를 가는 선으로 잇는다. 파기는 오류색, 만료는 흐린 잉크. */
const LifecycleBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  padding: 8px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const Lifecycle = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  row-gap: 6px;

  /*
   * 단계 사이 선은 부모에서 건다 — 단계마다 $tone이 달라 styled 클래스가 갈려,
   * 자식 쪽 "& + &"로는 색이 다른 형제를 잇지 못한다.
   */
  > li + li::before {
    content: '';
    align-self: center;
    width: 24px;
    height: 1px;
    margin: 0 10px;
    background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

const LifecycleStepItem = styled.li<{ $tone: LifecycleStep['tone'] }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme, $tone }) =>
    $tone === 'broken'
      ? theme.colors.error
      : $tone === 'ended'
        ? theme.colors.text.tertiary
        : theme.colors.text.primary};
`

const StepDot = styled.span<{ $tone: LifecycleStep['tone'] }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ theme, $tone }) =>
    $tone === 'broken'
      ? theme.colors.error
      : $tone === 'ended'
        ? theme.colors.text.tertiary
        : theme.colors.accent};
`

const LifecycleSpanBadge = styled.span<{ $tone: LifecycleStep['tone'] }>`
  padding: 2px 8px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid
    ${({ theme, $tone }) =>
      $tone === 'broken'
        ? `${theme.colors.error}55`
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $tone }) =>
    $tone === 'broken'
      ? `${theme.colors.error}12`
      : theme.colors.background.primary};
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $tone }) =>
    $tone === 'broken' ? theme.colors.error : theme.colors.text.secondary};
`

const StepLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
`

const StepDate = styled.span`
  font-size: 13px;
  font-variant-numeric: tabular-nums;
`

const ViolationReason = styled.p`
  margin: -2px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${metaText};
`

/* 서명국·조항 — 왼쪽 짧은 라벨 열 + 내용. 좁으면 라벨이 위로 올라간다. */
const Facet = styled.div`
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  column-gap: 12px;
  row-gap: 6px;
  align-items: baseline;

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const FacetLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${metaText};
`

const SignatoryList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Signatory = styled.li`
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
`

const SignatoryRole = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${metaText};
`

const SignatoryPerson = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};

  &::before {
    content: '· ';
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const MoreNote = styled.li`
  font-size: 12.5px;
  color: ${metaText};
`

const EmptyNote = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: ${metaText};
`

const RecommendBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const RecommendLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${metaText};
`

const RecommendChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const RecommendChipBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12.5px;
  cursor: pointer;
  transition: border-color 0.14s, background 0.14s;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`

const RecommendChipSub = styled.span`
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

const RecommendChipPlus = styled.span`
  margin-left: 2px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const RecommendMoreBtn = styled.button`
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 9px;
  border-radius: ${RADIUS.PILL};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${metaText};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
`

/**
 * 두 동작의 무게를 가른다 — 만들기가 이 섹션의 본 동작이고 연결은 보조다.
 *
 * 다만 **검은 면 버튼**은 이 지면 전체에서 가장 진한 덩어리였다 — 조약은 대개 비어 있는
 * 섹션이라(실측 0건이 다수) 문서 끝자락의 빈 칸이 본문보다 먼저 시선을 끌었다. 면을 걷고
 * 진한 테두리 + 본문 잉크로만 무게를 준다. 보조는 흐린 테두리 + 보조 잉크.
 */
const ActionBtn = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid
    ${({ theme, $primary }) =>
      $primary ? theme.colors.text.secondary : ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  background-color: transparent;
  color: ${({ theme, $primary }) =>
    $primary ? theme.colors.text.primary : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 13px;
  font-weight: ${({ $primary }) => ($primary ? 600 : 500)};
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s, opacity 0.14s;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.secondary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
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
  border-radius: ${RADIUS.SM};
  background-color: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }
`
