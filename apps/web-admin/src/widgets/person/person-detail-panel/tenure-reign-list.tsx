/**
 * 재임·재위 통합 카드 리스트 — 개요 탭.
 * (기존 person-detail-panel.tsx 인라인 IIFE에서 추출)
 * 정렬·서수·연임 판정은 combinedTenures 메모(부모)에서 미리 계산되어 items로 들어온다.
 * 이 컴포넌트는 표시와 편집/업적 콜백 위임만 담당.
 */
import { FiEdit2 } from 'react-icons/fi'

import {
  APPOINTMENT_METHOD_LABELS,
  TENURE_END_REASON_LABELS,
  deriveTenurePeriodLabel,
  getAgeAtDate,
} from './helpers'
import {
  TenureEmpty,
  UnifiedAgeBadge,
  UnifiedCard,
  UnifiedCardMain,
  UnifiedCardList,
  UnifiedCardTitle,
  UnifiedCardTopRow,
  UnifiedEditBtn,
  UnifiedKindBadge,
  UnifiedMetaChip,
  UnifiedMetaRow,
  UnifiedNote,
  UnifiedOrdinal,
  UnifiedReappointBadge,
  UnifiedSubRow,
} from './person-detail-panel.styles'
import { CabinetConnections } from './cabinet-connections'
import { TenureAchievements } from './tenure-achievements'
import type { CombinedTenureItem } from './types'

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
      {items.map(({ kind, data: d, ordinalNum, isReappointment }) => {
        const isReign = kind === 'reign'
        const posTitle = d.positionDefinition?.title ?? d.title ?? '직책'
        const countryName =
          d.historicalCountry?.name ?? d.country?.name ?? null
        // 종료일·정밀도·재직중사망·미상/현재 폴백은 연보 타임라인과 공용 파생(단일 출처)으로.
        // ('year' 정밀도 = 연도만 앎 / DEATH_IN_OFFICE → 사망일 / 종료사유·고인 → '미상')
        const { startYearOnly, rangeLabel } = deriveTenurePeriodLabel(
          {
            startDate: d.startDate,
            startDatePrecision: d.startDatePrecision,
            endDate: d.endDate,
            endReason: d.endReason,
            isDeceased,
            deathDateStr,
          },
        )
        // 즉위식·취임식 사건 링크 — 소프트삭제된 사건은 배지 숨김
        const accessionEvent =
          d.accessionEvent && !d.accessionEvent.deletedAt
            ? d.accessionEvent
            : null
        const subTermNum = d.subTermNumber
        const ageAtStart = getAgeAtDate(
          birthYear,
          birthMonth,
          birthDay,
          d.startDate,
          birthEra,
        )
        const ageAtEnd = d.endDate
          ? getAgeAtDate(birthYear, birthMonth, birthDay, d.endDate, birthEra)
          : null
        const mainTitle =
          isReign && d.regnalName ? `${d.regnalName} · ${posTitle}` : posTitle
        return (
          <UnifiedCard key={`${kind}-${d.id}`} $kind={kind}>
            <UnifiedCardMain>
              <UnifiedCardTopRow>
                <UnifiedKindBadge $kind={kind}>
                  {isReign ? '재위' : '재임'}
                </UnifiedKindBadge>
                <UnifiedCardTitle>
                  {mainTitle}
                  {ordinalNum != null && (
                    <UnifiedOrdinal>
                      {isReign
                        ? `${ordinalNum}대`
                        : ordinalNum === 1
                          ? '초대'
                          : `제${ordinalNum}대`}
                      {subTermNum != null && ` ${subTermNum}기`}
                    </UnifiedOrdinal>
                  )}
                  {isReappointment && (
                    <UnifiedReappointBadge>연임</UnifiedReappointBadge>
                  )}
                </UnifiedCardTitle>
              </UnifiedCardTopRow>
              <UnifiedMetaRow>
                {countryName && <UnifiedMetaChip>{countryName}</UnifiedMetaChip>}
                {isReign && d.dynastyOrdinal != null && (
                  <UnifiedMetaChip>
                    {dynastyName ? `${dynastyName} ` : '왕조 '}
                    {d.dynastyOrdinal}대
                  </UnifiedMetaChip>
                )}
                {rangeLabel && (
                  <UnifiedMetaChip $muted>{rangeLabel}</UnifiedMetaChip>
                )}
                {ageAtStart != null && (
                  <UnifiedAgeBadge>
                    {ageAtStart}세{startYearOnly ? '경' : ''}에{' '}
                    {isReign ? '즉위' : '취임'}
                  </UnifiedAgeBadge>
                )}
                {ageAtEnd != null && (
                  <UnifiedAgeBadge>
                    {ageAtEnd}세에 {isReign ? '퇴위' : '퇴임'}
                  </UnifiedAgeBadge>
                )}
              </UnifiedMetaRow>
              {(d.appointmentMethod ||
                d.appointmentDetail ||
                accessionEvent ||
                d.endReason ||
                d.endReasonDetail ||
                d.notes) && (
                <UnifiedSubRow>
                  {d.appointmentMethod && (
                    <span>
                      {isReign ? '즉위' : '취임'}:{' '}
                      {APPOINTMENT_METHOD_LABELS[d.appointmentMethod] ??
                        d.appointmentMethod}
                    </span>
                  )}
                  {accessionEvent && (
                    <span>
                      {isReign ? '즉위식' : '취임식'}:{' '}
                      {accessionEvent.title ?? '(제목 없음)'}
                    </span>
                  )}
                  {/* 즉위/취임 경위 서사 — 칩과 달리 여러 문장일 수 있어 UnifiedNote(자체 행·개행 보존)로 */}
                  {d.appointmentDetail && (
                    <UnifiedNote>{d.appointmentDetail}</UnifiedNote>
                  )}
                  {(d.endReason || d.endReasonDetail) && (
                    <span>
                      {isReign ? '퇴위' : '퇴임'}:{' '}
                      {[
                        d.endReason
                          ? TENURE_END_REASON_LABELS[d.endReason] ?? d.endReason
                          : null,
                        d.endReasonDetail,
                      ]
                        .filter(Boolean)
                        .join(' — ')}
                    </span>
                  )}
                  {d.notes && <UnifiedNote>{d.notes}</UnifiedNote>}
                </UnifiedSubRow>
              )}
              <TenureAchievements
                hostId={d.id}
                hostKind={kind}
                achievements={d.achievements ?? []}
                readOnly={embedInModal}
                onPlayClick={onPlayClick}
                onChanged={onAchievementChanged}
              />
              {!isReign &&
                onPersonClick &&
                (d.headOfCabinet?.id || d.cabinet?.id) && (
                  <CabinetConnections
                    cabinetId={(d.headOfCabinet?.id ?? d.cabinet?.id)!}
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
                  if (isReign) onEditReign(d.id)
                  else onEditTenure(d.id)
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
