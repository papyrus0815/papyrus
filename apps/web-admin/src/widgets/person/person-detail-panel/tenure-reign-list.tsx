/**
 * 재임·재위 통합 카드 리스트 — 개요 탭.
 * (기존 person-detail-panel.tsx 인라인 IIFE에서 추출)
 * 정렬·서수·연임 판정은 combinedTenures 메모(부모)에서 미리 계산되어 items로 들어온다.
 * 이 컴포넌트는 표시와 편집/업적 콜백 위임만 담당.
 *
 * 행 위계(플랫 리스트): 킥커(액센트 글리프 디스크·kind·서수·연임) → 제목 →
 * interpunct 팩트라인(국가·왕조·기간·나이) → 정의 그리드(즉위·경위·퇴위·비고).
 * 항목별 카드 박스는 없다 — 형제는 실선 헤어라인, 내부 소섹션은 점선 seam으로 구분.
 */
import { FiAward, FiBriefcase, FiEdit2, FiShield } from 'react-icons/fi'

import { getRecordFamily } from '@/entities/government-position/model/record-family'

import {
  APPOINTMENT_METHOD_LABELS,
  TENURE_END_REASON_LABELS,
  deriveTenurePeriodLabel,
  getAgeAtDate,
} from './helpers'
import {
  TenureEmpty,
  UnifiedCard,
  UnifiedCardList,
  UnifiedCardMain,
  UnifiedCardTitle,
  UnifiedDetailGrid,
  UnifiedDetailLabel,
  UnifiedDetailValue,
  UnifiedEditBtn,
  UnifiedEyebrow,
  UnifiedFact,
  UnifiedFactLine,
  UnifiedReappointBadge,
} from './person-detail-panel.styles'
import { CabinetConnections } from './cabinet-connections'
import { TenureAchievements } from './tenure-achievements'
import { SuccessionBox } from './succession-box'
import type { CombinedTenureItem } from './types'
import type { ReignAdjacencyEntry } from '@/shared/api/person-reign-adjacency'

interface TenureReignListProps {
  items: CombinedTenureItem[]
  birthYear?: number | null
  birthMonth?: number | null
  birthDay?: number | null
  /** 출생 era(BC/AD) — 나이 배지 계산이 BC 출생·BC→AD 교차에서 어긋나지 않게 위임 */
  birthEra?: string | null
  /** 사망일 표시 문자열(재직 중 사망 시 종료일 폴백) */
  deathDateStr: string
  isDeceased: boolean
  embedInModal: boolean
  /** 인물의 소속 왕조명 — 재위의 왕조 서수를 "부르봉 왕조 5대"로 표시할 때 접두 */
  dynastyName?: string | null
  /** 현재 보고 있는 인물 — 같은 행정부 동료 표시에서 본인 강조용 */
  currentPersonId?: string | null
  /** 같은 행정부 동료(인물) 클릭 시 이동 */
  onPersonClick?: (id: string) => void
  /** 재위 record별 같은 국가 선대/후대 (GET /persons/:id/reign-adjacency) — recordId로 조인 */
  adjacencyByRecordId?: Map<string, ReignAdjacencyEntry>
  onEditTenure: (id: string) => void
  onEditReign: (id: string) => void
  onPlayClick: () => void
  onAchievementChanged: () => void
}

export function TenureReignList({
  items,
  birthYear,
  birthMonth,
  birthDay,
  birthEra,
  deathDateStr,
  isDeceased,
  embedInModal,
  dynastyName,
  currentPersonId,
  onPersonClick,
  adjacencyByRecordId,
  onEditTenure,
  onEditReign,
  onPlayClick,
  onAchievementChanged,
}: TenureReignListProps) {
  if (items.length === 0) {
    return (
      <TenureEmpty>
        {embedInModal ? (
          '등록된 재임·재위 기록이 없습니다.'
        ) : (
          <>
            등록된 재임·재위 기록이 없습니다. 위{' '}
            <strong>재임·재위 버튼</strong>으로 추가하세요.
          </>
        )}
      </TenureEmpty>
    )
  }

  return (
    <UnifiedCardList>
      {items.map(({ kind, data: record, ordinalNum, isReappointment }) => {
        const isReign = kind === 'reign'
        const posTitle = record.positionDefinition?.title ?? record.title ?? '직책'
        /**
         * 작위(공작·백작·자작 등)는 재임 행으로 저장돼 있지만 공직 임기가 아니다 —
         * '취임/퇴임'이 아니라 '승계/상실'이라 눈썹·동사만 바꾼다(서수·국가·기간은 그대로 성립).
         */
        // ⚠️ positionDefinition을 통째로 넘기면 안 된다 — 인물 상세 응답의 positionDefinition
         // select에는 positionType·isMonarchical이 없어서 항상 OFFICE로 떨어진다(죽은 분기).
         // 재임 행 자신의 positionType('ROYAL_NOBLE_TITLE')이 실제로 채워져 있으므로 그걸 먼저 본다.
        const isNobleTitle =
          !isReign &&
          getRecordFamily({
            positionType:
              record.positionType ?? record.positionDefinition?.positionType ?? null,
            isMonarchical: record.positionDefinition?.isMonarchical ?? null,
          }) === 'NOBLE_TITLE'
        const startVerb = isReign ? '즉위' : isNobleTitle ? '승계' : '취임'
        const endVerb = isReign ? '퇴위' : isNobleTitle ? '상실' : '퇴임'
        const countryName =
          record.historicalCountry?.name ?? record.country?.name ?? null
        // 종료일·정밀도·재직중사망·미상/현재 폴백은 연보 타임라인과 공용 파생(단일 출처)으로.
        // ('year' 정밀도 = 연도만 앎 / DEATH_IN_OFFICE → 사망일 / 종료사유·고인 → '미상')
        const { startYearOnly, rangeLabel } = deriveTenurePeriodLabel(
          {
            startDate: record.startDate,
            startDatePrecision: record.startDatePrecision,
            endDate: record.endDate,
            endReason: record.endReason,
            isDeceased,
            deathDateStr,
          },
        )
        // 진행 중(표시 전용 파생) — rangeLabel의 '– 현재'와 같은 조건. 기간 팩트를 액센트로.
        const isOngoing =
          !!record.startDate && !record.endDate && !record.endReason && !isDeceased
        // 즉위식·취임식 사건 링크 — 소프트삭제된 사건은 배지 숨김
        const accessionEvent =
          record.accessionEvent && !record.accessionEvent.deletedAt
            ? record.accessionEvent
            : null
        const subTermNum = record.subTermNumber
        const ageAtStart = getAgeAtDate(
          birthYear,
          birthMonth,
          birthDay,
          record.startDate,
          birthEra,
        )
        const ageAtEnd = record.endDate
          ? getAgeAtDate(
              birthYear,
              birthMonth,
              birthDay,
              record.endDate,
              birthEra,
            )
          : null
        const mainTitle =
          isReign && record.regnalName
            ? `${record.regnalName} · ${posTitle}`
            : posTitle
        const hasFacts =
          !!countryName ||
          (isReign && record.dynastyOrdinal != null) ||
          !!rangeLabel ||
          ageAtStart != null ||
          ageAtEnd != null
        return (
          <UnifiedCard key={`${kind}-${record.id}`} $kind={kind}>
            <UnifiedCardMain>
              <UnifiedEyebrow>
                {isReign ? (
                  <FiShield size={11} />
                ) : isNobleTitle ? (
                  <FiAward size={11} />
                ) : (
                  <FiBriefcase size={11} />
                )}
                <span>{isReign ? '재위' : isNobleTitle ? '작위' : '재임'}</span>
                {ordinalNum != null && (
                  <span>
                    ·{' '}
                    {isReign
                      ? `${ordinalNum}대`
                      : ordinalNum === 1
                        ? '초대'
                        : `제${ordinalNum}대`}
                    {subTermNum != null && ` ${subTermNum}기`}
                  </span>
                )}
                {isReappointment && (
                  <UnifiedReappointBadge>연임</UnifiedReappointBadge>
                )}
              </UnifiedEyebrow>
              <UnifiedCardTitle>{mainTitle}</UnifiedCardTitle>
              {hasFacts && (
                <UnifiedFactLine>
                  {countryName && <UnifiedFact>{countryName}</UnifiedFact>}
                  {isReign && record.dynastyOrdinal != null && (
                    <UnifiedFact>
                      {dynastyName ? `${dynastyName} ` : '왕조 '}
                      {record.dynastyOrdinal}대
                    </UnifiedFact>
                  )}
                  {rangeLabel && (
                    <UnifiedFact $accent={isOngoing}>{rangeLabel}</UnifiedFact>
                  )}
                  {ageAtStart != null && (
                    <UnifiedFact>
                      {ageAtStart}세{startYearOnly ? '경' : ''}에 {startVerb}
                    </UnifiedFact>
                  )}
                  {ageAtEnd != null && (
                    <UnifiedFact>
                      {ageAtEnd}세에 {endVerb}
                    </UnifiedFact>
                  )}
                </UnifiedFactLine>
              )}
              {(record.appointmentMethod ||
                record.appointmentDetail ||
                accessionEvent ||
                record.endReason ||
                record.endReasonDetail ||
                record.notes) && (
                <UnifiedDetailGrid>
                  {record.appointmentMethod && (
                    <>
                      <UnifiedDetailLabel>{startVerb}</UnifiedDetailLabel>
                      <UnifiedDetailValue>
                        {APPOINTMENT_METHOD_LABELS[record.appointmentMethod] ??
                          record.appointmentMethod}
                      </UnifiedDetailValue>
                    </>
                  )}
                  {accessionEvent && (
                    <>
                      <UnifiedDetailLabel>
                        {isReign ? '즉위식' : isNobleTitle ? '서임식' : '취임식'}
                      </UnifiedDetailLabel>
                      <UnifiedDetailValue>
                        {accessionEvent.title ?? '(제목 없음)'}
                      </UnifiedDetailValue>
                    </>
                  )}
                  {/* 즉위/취임 경위 서사 — 여러 문장일 수 있어 개행 보존($prewrap) */}
                  {record.appointmentDetail && (
                    <>
                      <UnifiedDetailLabel>경위</UnifiedDetailLabel>
                      <UnifiedDetailValue $prewrap>
                        {record.appointmentDetail}
                      </UnifiedDetailValue>
                    </>
                  )}
                  {(record.endReason || record.endReasonDetail) && (
                    <>
                      <UnifiedDetailLabel>{endVerb}</UnifiedDetailLabel>
                      <UnifiedDetailValue>
                        {[
                          record.endReason
                            ? TENURE_END_REASON_LABELS[record.endReason] ??
                              record.endReason
                            : null,
                          record.endReasonDetail,
                        ]
                          .filter(Boolean)
                          .join(' — ')}
                      </UnifiedDetailValue>
                    </>
                  )}
                  {record.notes && (
                    <>
                      <UnifiedDetailLabel>비고</UnifiedDetailLabel>
                      <UnifiedDetailValue $prewrap>
                        {record.notes}
                      </UnifiedDetailValue>
                    </>
                  )}
                </UnifiedDetailGrid>
              )}
              <TenureAchievements
                hostId={record.id}
                hostKind={kind}
                achievements={record.achievements ?? []}
                readOnly={embedInModal}
                onPlayClick={onPlayClick}
                onChanged={onAchievementChanged}
              />
              {/* 같은 국가 전/후 재위(승계) — head-level record에만 엔트리가 오므로
                  맵에 있으면(=수장급) 렌더. 양쪽 이웃 0이면 박스가 스스로 null. */}
              {onPersonClick &&
                (() => {
                  const adjacency = adjacencyByRecordId?.get(record.id)
                  if (!adjacency) return null
                  return (
                    <SuccessionBox
                      entry={adjacency}
                      anchorLabel={mainTitle}
                      anchorPolity={countryName}
                      onPersonClick={onPersonClick}
                    />
                  )
                })()}
              {!isReign &&
                onPersonClick &&
                (record.headOfCabinet?.id || record.cabinet?.id) && (
                  <CabinetConnections
                    cabinetId={(record.headOfCabinet?.id ?? record.cabinet?.id)!}
                    currentPersonId={currentPersonId}
                    onPersonClick={onPersonClick}
                    onToggle={onPlayClick}
                  />
                )}
            </UnifiedCardMain>
            {!embedInModal && (
              <UnifiedEditBtn
                type="button"
                aria-label="수정"
                onClick={() => {
                  onPlayClick()
                  if (isReign) onEditReign(record.id)
                  else onEditTenure(record.id)
                }}
              >
                <FiEdit2 size={12} />
              </UnifiedEditBtn>
            )}
          </UnifiedCard>
        )
      })}
    </UnifiedCardList>
  )
}
