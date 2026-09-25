/**
 * 정체(政體) 섹션 — 이 나라가 대통령제인지 의원내각제인지, 단원제인지 양원제인지.
 *
 * 정체 도메인은 원래 국가 상세 → 행정조직 → '정체' 탭에만 있었다. 세 번 눌러야 닿는
 * 자리라 "그런 기능이 없다"로 읽혔고, 실제로 14줄이 등록된 나라가 프랑스·미국 둘뿐이다.
 * 대시보드는 "이 나라가 어떤 나라인가"에 답하는 지면이니 **체제**가 여기서 먼저 읽혀야
 * 한다 — 수반이 누구인지보다 앞이다(행정조직 탭 순서와 같은 판단).
 *
 * 여기서 바로 등록·수정한다. 요약만 보여주고 편집은 탭으로 보내면 진입점이 다시 세 번
 * 누르기가 된다. 탭과 **같은 폼 모달**을 쓰므로 두 지면의 규칙이 갈라지지 않는다.
 */
import { useMemo, useState } from 'react'

import styled from 'styled-components'

import {
  usePoliticalSystems,
  useCreatePoliticalSystem,
  useUpdatePoliticalSystem,
  type PoliticalSystem,
} from '@/entities/political-system/api'
import {
  comparePoliticalSystems,
  formatPeriod,
  GOVERNMENT_FORM_LABEL,
  headOfGovernmentTitleOf,
  headOfStateTitleOf,
  houseText,
  LEGISLATURE_TYPE_LABEL,
  PARTY_SYSTEM_LABEL,
  primaryHouseLabel,
  resolveCurrentSystem,
  STATE_STRUCTURE_LABEL,
  summarize,
} from '@/entities/political-system/model/political-system'
import { PoliticalSystemFormModal } from '@/features/government-info/ui/political-system-form.modal'
import { notify } from '@/shared/ui/toast'

import { IconLandmark } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import { SectionEmpty } from './section-empty'

interface Props {
  /** 현대 국가 ID — 주면 브리지로 연결된 과거 국가의 정체까지 함께 온다 */
  countryId?: string
  /** 과거 국가 ID */
  historicalCountryId?: string
  countryName: string
  /** '시대별 전체 보기' — 행정조직 정체 탭으로 */
  onOpenAll: () => void
}

/** 요약 카드에 올릴 부가 항목 — 값이 있는 것만 줄이 된다 */
interface Fact {
  key: string
  label: string
  value: string
  /** 실권 없음 같은 단서 */
  note?: string
}

function buildFacts(system: PoliticalSystem): Fact[] {
  const facts: Fact[] = []

  /* lowerHouse*는 양원제면 하원, 단원제면 유일 원이다 — 라벨은 반드시 헬퍼를 거친다 */
  if (system.lowerHouseName || system.lowerHouseSeats != null) {
    const label = primaryHouseLabel(system.legislatureType ?? null)
    facts.push({
      key: 'lower',
      label,
      value: [
        system.lowerHouseName ? houseText(label, system.lowerHouseName) : label,
        system.lowerHouseSeats != null
          ? `${system.lowerHouseSeats.toLocaleString()}석`
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
    })
  }
  /* 상원은 양원제일 때만 뜻이 있다 — 단원제 기록에 남은 값은 보여주지 않는다 */
  if (
    system.legislatureType === 'BICAMERAL' &&
    (system.upperHouseName || system.upperHouseSeats != null)
  ) {
    facts.push({
      key: 'upper',
      label: '상원',
      value: [
        system.upperHouseName ? houseText('상원', system.upperHouseName) : '상원',
        system.upperHouseSeats != null
          ? `${system.upperHouseSeats.toLocaleString()}석`
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
    })
  }
  /* 직함은 관직 정의 카탈로그가 정본 — 자유입력 칸은 카탈로그에 없는 칭호일 때만 찬다 */
  const headOfState = headOfStateTitleOf(system)
  if (headOfState) {
    facts.push({
      key: 'hos',
      label: '국가원수',
      value: headOfState,
      note: system.headOfStateHasPower === false ? '상징' : undefined,
    })
  }
  const headOfGovernment = headOfGovernmentTitleOf(system)
  if (headOfGovernment) {
    facts.push({
      key: 'hog',
      label: '정부수반',
      value: headOfGovernment,
      note: system.headOfGovernmentHasPower === false ? '상징' : undefined,
    })
  }
  if (system.stateStructure) {
    facts.push({
      key: 'structure',
      label: '국가 구조',
      value: STATE_STRUCTURE_LABEL[system.stateStructure],
    })
  }
  if (system.partySystem) {
    facts.push({
      key: 'party',
      label: '정당제',
      value: PARTY_SYSTEM_LABEL[system.partySystem],
    })
  }
  return facts
}

export function PoliticalSystemPanel({
  countryId,
  historicalCountryId,
  countryName,
  onOpenAll,
}: Props) {
  const scope = { countryId, historicalCountryId }
  const query = usePoliticalSystems(scope)
  const createMutation = useCreatePoliticalSystem()
  const updateMutation = useUpdatePoliticalSystem()

  const [editing, setEditing] = useState<PoliticalSystem | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const systems = useMemo(
    () => [...(query.data ?? [])].sort(comparePoliticalSystems),
    [query.data],
  )
  const current = useMemo(() => resolveCurrentSystem(systems), [systems])
  /* 지금 것 말고 남은 줄 — 최근 것부터. 대시보드에서는 몇 개만 스치듯 보여준다 */
  const past = useMemo(
    () => systems.filter((system) => system.id !== current?.id).reverse(),
    [systems, current],
  )

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const headline = current
    ? [
        current.governmentForm && GOVERNMENT_FORM_LABEL[current.governmentForm],
        current.legislatureType &&
          LEGISLATURE_TYPE_LABEL[current.legislatureType],
      ].filter(Boolean)
    : []

  return (
    <S.Section>
      <S.SectionTitleRow>
        <S.SectionTitleIcon>
          <IconLandmark />
        </S.SectionTitleIcon>
        <S.SectionTitleText>정체</S.SectionTitleText>
        {systems.length > 0 && (
          <S.SectionCountChip>{systems.length}개</S.SectionCountChip>
        )}
        {current && (
          <S.SectionAction type="button" onClick={() => {
            setEditing(current)
            setFormOpen(true)
          }}>
            수정
          </S.SectionAction>
        )}
        {systems.length > 0 && (
          <S.SectionLink type="button" onClick={onOpenAll}>
            시대별 전체 보기
          </S.SectionLink>
        )}
      </S.SectionTitleRow>

      {query.isLoading ? (
        <LoadingLine>불러오는 중…</LoadingLine>
      ) : !current ? (
        <SectionEmpty
          text="이 국가가 대통령제인지 의원내각제인지, 단원제인지 양원제인지가 아직 없습니다. 헌법 체제를 기간과 함께 남기면 여기 요약이 서고, 바뀔 때마다 한 줄씩 쌓입니다."
          actionLabel="정체 등록"
          onAction={openCreate}
        />
      ) : (
        <Card>
          <Head>
            <Headline>
              {headline.length > 0 ? (
                headline.map((text, index) => (
                  <HeadlinePart key={text}>
                    {index > 0 && <HeadlineDot aria-hidden>·</HeadlineDot>}
                    {text}
                  </HeadlinePart>
                ))
              ) : (
                <HeadlinePart>{summarize(current)}</HeadlinePart>
              )}
            </Headline>
            <Meta>
              {current.name && <SystemName>{current.name}</SystemName>}
              <Period>{formatPeriod(current)}</Period>
              {current.isCurrent && <NowChip>현행</NowChip>}
              {/* 현대 국가 지면에는 브리지로 과거 국가 정체도 섞여 온다 */}
              {historicalCountryId == null &&
                current.historicalCountryId != null && (
                  <PastChip>
                    {current.historicalCountry?.name ?? '과거 국가'}
                  </PastChip>
                )}
            </Meta>
          </Head>

          {(() => {
            const facts = buildFacts(current)
            return facts.length > 0 ? (
              <Facts>
                {facts.map((fact) => (
                  <FactItem key={fact.key}>
                    <FactKey>{fact.label}</FactKey>
                    <FactValue>
                      {fact.value}
                      {fact.note && <Muted> ({fact.note})</Muted>}
                    </FactValue>
                  </FactItem>
                ))}
              </Facts>
            ) : null
          })()}

          {past.length > 0 && (
            <PastRow>
              <PastLabel>이전 정체</PastLabel>
              {past.slice(0, 4).map((system) => (
                <PastItem key={system.id} type="button" onClick={onOpenAll}>
                  <PastPeriod>{formatPeriod(system)}</PastPeriod>
                  <PastName>{system.name || summarize(system)}</PastName>
                </PastItem>
              ))}
              {past.length > 4 && (
                <PastMore type="button" onClick={onOpenAll}>
                  +{past.length - 4}
                </PastMore>
              )}
            </PastRow>
          )}
        </Card>
      )}

      <PoliticalSystemFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        countryId={countryId}
        historicalCountryId={historicalCountryId}
        countryName={countryName}
        onSubmit={async (dto) => {
          if (editing) {
            await updateMutation.mutateAsync({ id: editing.id, dto })
            notify.success('정체가 수정되었습니다')
          } else {
            await createMutation.mutateAsync({
              ...dto,
              countryId: countryId ?? null,
              historicalCountryId: historicalCountryId ?? null,
            })
            notify.success('정체가 추가되었습니다')
          }
          setFormOpen(false)
        }}
      />
    </S.Section>
  )
}

const LoadingLine = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.primary};
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 14px;
`

/* 체제 이름이 이 카드의 주인공이다 — 기간·별칭보다 확실히 크게 */
const Headline = styled.p`
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeadlinePart = styled.span`
  display: inline-flex;
  align-items: baseline;
`

const HeadlineDot = styled.span`
  margin: 0 8px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Meta = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const SystemName = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Period = styled.span`
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const NowChip = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
  background: rgba(16, 185, 129, 0.16);
`

const PastChip = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  background: rgba(245, 158, 11, 0.16);
`

const Facts = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px 20px;
`

const FactItem = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
`

const FactKey = styled.dt`
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FactValue = styled.dd`
  margin: 0;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow-wrap: anywhere;
`

const Muted = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PastRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px dashed ${({ theme }) => theme.colors.border.light};
`

const PastLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PastItem = styled.button`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: none;
  font-family: inherit;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const PastPeriod = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PastName = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PastMore = styled(PastItem)`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`
