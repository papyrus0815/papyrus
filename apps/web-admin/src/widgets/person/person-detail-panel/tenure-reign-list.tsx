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
  formatIsoDateKo,
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
  UnifiedOrdinal,
  UnifiedReappointBadge,
  UnifiedSubRow,
} from './person-detail-panel.styles'
import { TenureAchievements } from './tenure-achievements'
import type { CombinedTenureItem } from './types'

interface TenureReignListProps {
  items: CombinedTenureItem[]
  birthYear?: number | null
  birthMonth?: number | null
  birthDay?: number | null
  /** 사망일 표시 문자열(재직 중 사망 시 종료일 폴백) */
  deathDateStr: string
  isDeceased: boolean
  embedInModal: boolean
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
  deathDateStr,
  isDeceased,
  embedInModal,
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
        const startStr = formatIsoDateKo(d.startDate)
        const endStr = d.endDate ? formatIsoDateKo(d.endDate) : null
        const subTermNum = d.subTermNumber
        const ageAtStart = getAgeAtDate(birthYear, birthMonth, birthDay, d.startDate)
        const ageAtEnd = d.endDate
          ? getAgeAtDate(birthYear, birthMonth, birthDay, d.endDate)
          : null
        const mainTitle =
          isReign && d.regnalName ? `${d.regnalName} · ${posTitle}` : posTitle
        // 종료일 폴백: 재직 중 사망이면 사망일, 종료 사유가 있으면(끝났으나 날짜 미상)
        // '미상', 사망자면 '미상', 그 외 진행 중이면 '현재'.
        const endLabel =
          endStr ??
          (d.endReason === 'DEATH_IN_OFFICE' && deathDateStr
            ? deathDateStr
            : d.endReason || isDeceased
              ? '미상'
              : '현재')
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
                {(startStr || endStr) && (
                  <UnifiedMetaChip $muted>
                    {startStr || '?'} – {endLabel}
                  </UnifiedMetaChip>
                )}
                {ageAtStart != null && (
                  <UnifiedAgeBadge>{ageAtStart}세에 취임</UnifiedAgeBadge>
                )}
                {ageAtEnd != null && (
                  <UnifiedAgeBadge>{ageAtEnd}세에 퇴임</UnifiedAgeBadge>
                )}
              </UnifiedMetaRow>
              {(d.appointmentMethod ||
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
                  {d.notes && <span>{d.notes}</span>}
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
