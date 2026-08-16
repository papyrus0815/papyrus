/**
 * 재임·재위 통합 카드 리스트 — 개요 탭.
 * (기존 person-detail-panel.tsx 인라인 IIFE에서 추출)
 * 정렬·서수·연임 판정은 combinedTenures 메모(부모)에서 미리 계산되어 items로 들어온다.
 * 이 컴포넌트는 표시와 편집/업적 콜백 위임만 담당.
 *
 * 행 위계(플랫 리스트): 킥커(액센트 글리프 디스크·kind·서수·연임) → 제목 →
 * interpunct 팩트라인(기간(승격)·길이·국가·왕조·나이) →
 * 정의 그리드(경위 → 퇴위 → 비고 → 즉위(방식) → 즉위식).
 *
 * 그리드 순서 규약: 위 3행은 **서사**(평균 175자), 아래 2행은 **2~6자 분류 토큰**이다.
 * 토큰(취임 방식은 88%가 '임명' 상수)이 격자 첫 줄을 차지하면 읽을거리가 뒤로 밀린다.
 * 항목별 카드 박스는 없다 — 형제는 실선 헤어라인, 내부 소섹션은 점선 seam으로 구분.
 */
import { FiAward, FiBriefcase, FiEdit2, FiShield } from 'react-icons/fi'

import { getRecordFamily } from '@/entities/government-position/model/record-family'
import { VisuallyHidden } from '@/shared/ui/visually-hidden'

import {
  APPOINTMENT_METHOD_LABELS,
  type TenureFamily,
  deriveTenureDurationLabel,
  deriveTenurePeriodLabel,
  endReasonLabelFor,
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
  UnifiedDetailTag,
  UnifiedDetailValue,
  UnifiedEditBtn,
  UnifiedEyebrow,
  UnifiedFact,
  UnifiedFactKey,
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
    /* role은 중복이 아니다 — list-style:none + display:flex 조합에서 WebKit/VoiceOver가
       ol의 목록 역할을 지운다(스타일이 시맨틱을 먹는 알려진 케이스). */
    <UnifiedCardList role="list">
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
        const family: TenureFamily = isReign
          ? 'reign'
          : isNobleTitle
            ? 'noble'
            : 'office'
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
        // 기간 옆 길이("약 3년") — 원천 ISO에서만 파생한다(rangeLabel 파싱 금지 규약)
        const durationLabel = deriveTenureDurationLabel(
          record.startDate,
          record.endDate,
          record.startDatePrecision,
        )
        /**
         * 'OTHER(기타)'는 사유가 아니라 **결측 마커**다. 부연이 있으면 토큰을 렌더하지
         * 않는다 — "기타 — 1888년 1월 임기 만료로 귀국했다"는 진짜 사유를 가릴 뿐 아니라
         * 틀려 보이기까지 한다(실DB 재임 55/127행이 OTHER+부연).
         */
        const endEnumLabel =
          record.endReason &&
          !(record.endReason === 'OTHER' && record.endReasonDetail)
            ? endReasonLabelFor(record.endReason, family)
            : null
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
          !!durationLabel ||
          ageAtStart != null ||
          ageAtEnd != null
        return (
          <UnifiedCard key={`${kind}-${record.id}`} $kind={kind} role="listitem">
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
                  {/* 기간이 선두 — 이 리스트에서 가장 먼저 찾는 값이다.
                      rangeLabel은 완성 문자열이라 컨테이너만 바꾸고 문자열은 손대지 않는다.
                      마이크로 라벨은 자식 <span>이라 팩트의 직계 텍스트에 섞이지 않는다. */}
                  {rangeLabel && (
                    <UnifiedFact $period data-period $accent={isOngoing}>
                      <UnifiedFactKey>기간</UnifiedFactKey>
                      {rangeLabel}
                    </UnifiedFact>
                  )}
                  {/* 낭독 시 값만 나열되면 무슨 값인지 알 수 없다 — 접두는 자식이라
                      화면에도, 기존 텍스트 단언에도 영향이 없다. 나이 팩트는 자기서술적이라 제외. */}
                  {durationLabel && (
                    <UnifiedFact>
                      <VisuallyHidden>기간 길이 </VisuallyHidden>
                      {durationLabel}
                    </UnifiedFact>
                  )}
                  {countryName && (
                    <UnifiedFact>
                      <VisuallyHidden>국가 </VisuallyHidden>
                      {countryName}
                    </UnifiedFact>
                  )}
                  {isReign && record.dynastyOrdinal != null && (
                    <UnifiedFact>
                      <VisuallyHidden>왕조 서수 </VisuallyHidden>
                      {dynastyName ? `${dynastyName} ` : '왕조 '}
                      {record.dynastyOrdinal}대
                    </UnifiedFact>
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
                endEnumLabel ||
                record.endReasonDetail ||
                record.notes) && (
                <UnifiedDetailGrid>
                  {/* ── 서사 3행: 읽을거리를 격자 위쪽에 둔다 ── */}
                  {/* 즉위/취임 경위 서사 — 여러 문장일 수 있어 개행 보존($prewrap) */}
                  {record.appointmentDetail && (
                    <>
                      <UnifiedDetailLabel>경위</UnifiedDetailLabel>
                      <UnifiedDetailValue $prewrap>
                        {record.appointmentDetail}
                      </UnifiedDetailValue>
                    </>
                  )}
                  {/* 분류(사임/사퇴)와 서사는 성격이 달라 한 문자열로 잇지 않는다 —
                      ' — '로 이으면 낭독도 한 덩어리가 되고 서사 첫 줄이 분류에 밀린다. */}
                  {(endEnumLabel || record.endReasonDetail) && (
                    <>
                      <UnifiedDetailLabel>{endVerb}</UnifiedDetailLabel>
                      {endEnumLabel && (
                        <UnifiedDetailTag>{endEnumLabel}</UnifiedDetailTag>
                      )}
                      {record.endReasonDetail && (
                        <UnifiedDetailValue $prewrap $tight={!!endEnumLabel}>
                          {record.endReasonDetail}
                        </UnifiedDetailValue>
                      )}
                    </>
                  )}
                  {record.notes && (
                    <>
                      <UnifiedDetailLabel>비고</UnifiedDetailLabel>
                      <UnifiedDetailValue $prewrap $muted>
                        {record.notes}
                      </UnifiedDetailValue>
                    </>
                  )}
                  {/* ── 분류 토큰 2행: 2~6자짜리라 서사에 격자를 먼저 내준다 ── */}
                  {record.appointmentMethod && (
                    <>
                      <UnifiedDetailLabel>{startVerb}</UnifiedDetailLabel>
                      <UnifiedDetailValue $token>
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
                      <UnifiedDetailValue $token>
                        {accessionEvent.title ?? '(제목 없음)'}
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
                /* 15행이 전부 '수정'이면 버튼 목록에서 어느 행인지 구분이 안 된다 */
                aria-label={`${mainTitle} 수정`}
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
