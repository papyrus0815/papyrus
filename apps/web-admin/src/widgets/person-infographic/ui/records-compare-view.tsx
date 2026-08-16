/**
 * VIEW: 기록 비교 — 공유 연도축(행) × 인물 칼럼 그리드.
 *
 * "16세기 각국 왕들이 뭘 했는지"처럼 여러 인물의 기록(연보·재임/재위·업적·사건·수상)을
 * 같은 연도 행에서 나란히 비교한다.
 *  - TENURE/REIGN은 카드 나열 대신 칼럼 좌측 밴드 레일로 재임 기간 맥락을 깐다
 *  - 같은 linkEventId 기록은 "공유" 뱃지 + hover 시 전체 하이라이트로 묶는다(표시만, dedup 쓰기 없음)
 *  - 연도는 부호 연도(BC 음수) — iso-date/lifespan-text 헬퍼만 사용, native Date 파싱 금지
 */
import { Fragment, useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiPlus, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

import { personKeys } from '@/entities/person/api'
import {
  PERSON_RECORD_KIND_COLOR,
  PERSON_RECORD_KIND_LABEL,
  type ComparePersonRecordsParams,
  type PersonRecordItem,
  type PersonRecordKind,
  comparePersonRecords,
  personRecordsKeys,
} from '@/shared/api/person-records'
import { getAllPersons } from '@/shared/api/persons'
import { centuryYearRange, getCentury } from '@/shared/lib/iso-date'
import { formatLifespan, formatSignedYear } from '@/shared/lib/lifespan-text'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { CenturyStepper } from '@/shared/ui/century-stepper'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { notify } from '@/shared/ui/toast'
import { PersonTabSharedTitle } from '@/widgets/country/country-detail/ui/country-detail.styles'

import { usePersonInfographicFilterStore } from '../model/filter.store'
import {
  MAX_RECORD_PERSONS,
  type RecordBand,
  bandsAtYear,
  buildRecordsGrid,
} from '../model/records-compare'
import { EmptyState } from './_shared/empty-state'

/** 공유 사건 커넥터 전용 액센트 — kind 색과 겹치지 않는 계열(teal) */
const SHARED_ACCENT = '#14b8a6'
const SHARED_ACCENT_SOFT = 'rgba(20, 184, 166, 0.14)'

const KIND_ORDER: PersonRecordKind[] = [
  'LIFE_EVENT',
  'TENURE',
  'REIGN',
  'ACHIEVEMENT',
  'EVENT',
  'AWARD',
]

interface RecordsCompareViewProps {
  /** 칼럼 헤더 이름 클릭 → 인물 상세 이동 */
  onPersonClick: (id: string) => void
}

export function RecordsCompareView({ onPersonClick }: RecordsCompareViewProps) {
  const recordPersonIds = usePersonInfographicFilterStore(
    (state) => state.recordPersonIds,
  )
  const recordFromYear = usePersonInfographicFilterStore(
    (state) => state.recordFromYear,
  )
  const recordToYear = usePersonInfographicFilterStore(
    (state) => state.recordToYear,
  )
  const addRecordPersonId = usePersonInfographicFilterStore(
    (state) => state.addRecordPersonId,
  )
  const removeRecordPersonId = usePersonInfographicFilterStore(
    (state) => state.removeRecordPersonId,
  )
  const setRecordYearRange = usePersonInfographicFilterStore(
    (state) => state.setRecordYearRange,
  )

  const [pickerOpen, setPickerOpen] = useState(false)
  /** hover 중인 공유 사건 linkEventId — 같은 값 카드 전체 하이라이트 */
  const [hoverLinkId, setHoverLinkId] = useState<string | null>(null)

  // 인물 선택 모달용 전체 인물 — 모달을 열 때만 로드(usePersons와 같은 캐시 키 공유)
  const { data: allPersons = [], isLoading: personsLoading } = useQuery({
    queryKey: personKeys.all,
    queryFn: getAllPersons,
    enabled: pickerOpen,
    staleTime: 60_000,
  })

  const compareParams: ComparePersonRecordsParams = {
    personIds: recordPersonIds,
    fromYear: recordFromYear,
    toYear: recordToYear,
  }
  const {
    data: compareData,
    isLoading: compareLoading,
    isError: compareError,
    isPlaceholderData,
    refetch,
  } = useQuery({
    queryKey: personRecordsKeys.compare(compareParams),
    queryFn: () => comparePersonRecords(compareParams),
    enabled: recordPersonIds.length > 0,
    staleTime: 30_000,
    // 세기 이동·인물 추가 시 이전 그리드를 유지해 깜빡임 방지
    placeholderData: (previous) => previous,
  })

  // 칼럼 순서는 사용자가 추가한 순서(store) — 서버 응답 순서에 의존하지 않음
  const orderedPersons = useMemo(() => {
    const byId = new Map(
      (compareData?.persons ?? []).map((entry) => [entry.person.id, entry]),
    )
    return recordPersonIds
      .map((personId) => byId.get(personId))
      .filter((entry): entry is NonNullable<typeof entry> => entry != null)
  }, [compareData, recordPersonIds])

  const grid = useMemo(
    () => buildRecordsGrid(orderedPersons, recordFromYear, recordToYear),
    [orderedPersons, recordFromYear, recordToYear],
  )

  // CenturyStepper 라벨 — 현재 기간이 정확히 한 세기 범위와 일치할 때만 세기로 표시
  const century = useMemo(() => {
    if (recordFromYear == null || recordToYear == null) return null
    const guess = getCentury(recordFromYear)
    const range = centuryYearRange(guess)
    return range.fromYear === recordFromYear && range.toYear === recordToYear
      ? guess
      : null
  }, [recordFromYear, recordToYear])

  const hasRange = recordFromYear != null || recordToYear != null
  // toYear는 배타 → 표시용 상한은 -1 (BC 경계 포함 부호 연도 그대로)
  const periodText = hasRange
    ? `${recordFromYear != null ? formatSignedYear(recordFromYear) : '…'} – ${
        recordToYear != null ? formatSignedYear(recordToYear - 1) : '…'
      }`
    : '전 기간'

  const atCap = recordPersonIds.length >= MAX_RECORD_PERSONS

  // 정원(12명) 도달 시 모달 자동 닫기 — 초과 선택이 무성으로 무시되는 것 방지
  useEffect(() => {
    if (pickerOpen && atCap) {
      setPickerOpen(false)
      notify.info(`최대 ${MAX_RECORD_PERSONS}명까지 비교할 수 있습니다.`)
    }
  }, [pickerOpen, atCap])

  const missingCount = compareData?.meta.missingPersonIds.length ?? 0
  const bodyRowCount = Math.max(grid.years.length, 1)
  const showGrid =
    recordPersonIds.length > 0 &&
    !compareError &&
    compareData != null &&
    grid.columns.length > 0

  return (
    <PanelWrap
      id="person-view-panel"
      role="tabpanel"
      aria-labelledby="person-view-tab-records"
    >
      <Toolbar>
        <PersonTabSharedTitle>
          기록 비교
          {recordPersonIds.length > 0 && (
            <TitleMeta>
              {recordPersonIds.length}명 · {periodText}
            </TitleMeta>
          )}
        </PersonTabSharedTitle>
        <ToolbarRight>
          <PeriodGroup>
            <CenturyStepper
              century={century}
              onChange={(selection) =>
                setRecordYearRange(selection.fromYear, selection.toYear)
              }
            />
            <PeriodText $active={hasRange}>{periodText}</PeriodText>
            {hasRange && (
              <ClearRangeBtn
                type="button"
                onClick={() => setRecordYearRange(null, null)}
              >
                전 기간 보기
              </ClearRangeBtn>
            )}
          </PeriodGroup>
          <AddPersonBtn
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={atCap}
            title={
              atCap
                ? `최대 ${MAX_RECORD_PERSONS}명까지 비교할 수 있습니다`
                : undefined
            }
          >
            <FiPlus size={14} />
            인물 추가
          </AddPersonBtn>
        </ToolbarRight>
      </Toolbar>

      <CaptionRow>
        <Legend aria-hidden>
          {KIND_ORDER.map((kind) => (
            <LegendItem key={kind}>
              <LegendSwatch
                style={{ background: PERSON_RECORD_KIND_COLOR[kind].base }}
              />
              {PERSON_RECORD_KIND_LABEL[kind]}
            </LegendItem>
          ))}
          <LegendItem>
            <SharedBadge as="span">공유</SharedBadge>
            같은 사건에 함께 등장
          </LegendItem>
        </Legend>
        <Caption>연보(LIFE_EVENT)는 내 계정 기록만 표시됩니다.</Caption>
        {missingCount > 0 && (
          <CaptionWarn role="status">
            찾을 수 없는 인물 {missingCount}명은 비교에서 제외되었습니다.
          </CaptionWarn>
        )}
      </CaptionRow>

      {recordPersonIds.length === 0 ? (
        <EmptyState
          title="비교할 인물을 추가하세요"
          description="공유 연도축 위에서 여러 인물의 연보·재임·업적·사건·수상 기록을 나란히 비교합니다. (최대 12명)"
          actionLabel="인물 추가"
          onAction={() => setPickerOpen(true)}
        />
      ) : compareError ? (
        <EmptyState
          title="기록을 불러오지 못했어요"
          description="네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
          actionLabel="다시 시도"
          onAction={() => refetch()}
        />
      ) : compareLoading && compareData == null ? (
        <LoadingBox>기록을 불러오는 중…</LoadingBox>
      ) : !showGrid ? (
        <EmptyState
          title="표시할 인물이 없습니다"
          description="선택한 인물을 찾을 수 없습니다. 다른 인물을 추가해 보세요."
          actionLabel="인물 추가"
          onAction={() => setPickerOpen(true)}
        />
      ) : (
        <GridScroll
          aria-label="인물 기록 비교 그리드"
          style={{ opacity: isPlaceholderData ? 0.6 : 1 }}
        >
          <Grid
            style={{
              gridTemplateColumns: `64px repeat(${grid.columns.length}, minmax(230px, 300px))`,
              gridTemplateRows: `auto repeat(${bodyRowCount}, auto)`,
            }}
          >
            <CornerCell style={{ gridColumn: 1, gridRow: 1 }}>연도</CornerCell>

            {grid.columns.map((column, colIdx) => {
              const displayName = getPersonDisplayName(column.person)
              const lifespan = formatLifespan({
                birthYear: column.person.birthYear,
                deathYear: column.person.deathYear,
              })
              return (
                <ColumnHeadCell
                  key={column.person.id}
                  style={{ gridColumn: colIdx + 2, gridRow: 1 }}
                >
                  <ColumnHeadMain>
                    <ColumnNameBtn
                      type="button"
                      onClick={() => onPersonClick(column.person.id)}
                      title="인물 상세 보기"
                    >
                      {displayName}
                    </ColumnNameBtn>
                    <ColumnLifespan>{lifespan || '생몰 미상'}</ColumnLifespan>
                    {column.recordCount > 0 && column.undatedCount > 0 && (
                      <ColumnHeadCaption>
                        연도 미상 {column.undatedCount}건은 기간 비교에서 제외됨
                      </ColumnHeadCaption>
                    )}
                  </ColumnHeadMain>
                  <RemoveBtn
                    type="button"
                    onClick={() => removeRecordPersonId(column.person.id)}
                    aria-label={`${displayName} 비교에서 제거`}
                  >
                    <FiX size={13} />
                  </RemoveBtn>
                </ColumnHeadCell>
              )
            })}

            {grid.years.length > 0 ? (
              grid.years.map((year, rowIdx) => (
                <YearCell
                  key={year}
                  style={{ gridColumn: 1, gridRow: rowIdx + 2 }}
                >
                  {formatSignedYear(year)}
                </YearCell>
              ))
            ) : (
              <YearCell style={{ gridColumn: 1, gridRow: 2 }} aria-hidden>
                —
              </YearCell>
            )}

            {grid.columns.map((column, colIdx) => {
              if (column.recordCount === 0) {
                // 빈 열 — 기간 내 기록 0건: 연보 저작 딥링크 CTA (열 전체 스팬)
                return (
                  <EmptyColCell
                    key={column.person.id}
                    style={{
                      gridColumn: colIdx + 2,
                      gridRow: `2 / ${bodyRowCount + 2}`,
                    }}
                  >
                    <EmptyColTitle>
                      {hasRange
                        ? '이 시대 기록이 없습니다'
                        : '등록된 기록이 없습니다'}
                    </EmptyColTitle>
                    {column.undatedCount > 0 && (
                      <EmptyColCaption>
                        연도 미상 {column.undatedCount}건은 기간 비교에서 제외됨
                      </EmptyColCaption>
                    )}
                    <AuthorLink
                      to={`${pathKeys.personsTimelineDetail(column.person.id)}?tab=events`}
                    >
                      연보 저작하러 가기
                    </AuthorLink>
                  </EmptyColCell>
                )
              }
              return (
                <Fragment key={column.person.id}>
                  {grid.years.map((year, rowIdx) => {
                    const points = column.pointsByYear.get(year) ?? []
                    const activeBands = bandsAtYear(column.bands, year)
                    const labelBands = column.bands.filter(
                      (band) => band.labelYear === year,
                    )
                    return (
                      <BodyCell
                        key={`${column.person.id}-${year}`}
                        style={{
                          gridColumn: colIdx + 2,
                          gridRow: rowIdx + 2,
                          background:
                            activeBands.length > 0
                              ? PERSON_RECORD_KIND_COLOR[
                                  activeBands[0].record.kind
                                ].soft
                              : undefined,
                        }}
                      >
                        {activeBands.length > 0 && (
                          <BandRail aria-hidden>
                            {activeBands.map((band) => (
                              <BandStripe
                                key={`${band.record.kind}-${band.record.sourceId}`}
                                style={{
                                  background:
                                    PERSON_RECORD_KIND_COLOR[band.record.kind]
                                      .base,
                                }}
                              />
                            ))}
                          </BandRail>
                        )}
                        <CellBody>
                          {labelBands.map((band) => (
                            <BandLabelBlock
                              key={`label-${band.record.kind}-${band.record.sourceId}`}
                              band={band}
                            />
                          ))}
                          {points.map((record) => (
                            <RecordCard
                              key={`${record.kind}-${record.sourceId}`}
                              record={record}
                              shared={
                                record.linkEventId != null &&
                                (grid.sharedLinkCounts.get(record.linkEventId) ??
                                  0) >= 2
                              }
                              highlighted={
                                record.linkEventId != null &&
                                hoverLinkId === record.linkEventId
                              }
                              onHover={setHoverLinkId}
                            />
                          ))}
                        </CellBody>
                      </BodyCell>
                    )
                  })}
                </Fragment>
              )
            })}
          </Grid>
        </GridScroll>
      )}

      {pickerOpen && (
        <PersonSelectModal
          persons={allPersons}
          selectedPersonId=""
          onSelect={(personId) => addRecordPersonId(personId)}
          onClose={() => setPickerOpen(false)}
          excludeIds={recordPersonIds}
          title="비교할 인물 추가"
          searchPlaceholder="비교할 인물을 검색..."
          multiSelect
          loading={personsLoading}
        />
      )}
    </PanelWrap>
  )
}

/** 재임/재위 밴드 시작 행에 붙는 칭호 라벨 블록 */
function BandLabelBlock({ band }: { band: RecordBand }) {
  const color = PERSON_RECORD_KIND_COLOR[band.record.kind]
  const endText = band.record.ongoing
    ? '현재'
    : band.record.endYear != null
      ? formatSignedYear(band.record.endYear)
      : null
  return (
    <BandLabel style={{ borderLeftColor: color.base }}>
      <BandKind style={{ color: color.base }}>
        {PERSON_RECORD_KIND_LABEL[band.record.kind]}
      </BandKind>
      <BandTitle>{band.record.title}</BandTitle>
      <BandMeta>
        {formatSignedYear(band.startYear)}
        {endText ? `–${endText}` : ''}
        {band.record.countryName ? ` · ${band.record.countryName}` : ''}
      </BandMeta>
    </BandLabel>
  )
}

/** 점 기록 카드 — kind 칩 + 제목 + 요약 말줄임 + 국가. 공유 사건이면 뱃지/하이라이트 */
function RecordCard({
  record,
  shared,
  highlighted,
  onHover,
}: {
  record: PersonRecordItem
  shared: boolean
  highlighted: boolean
  onHover: (linkEventId: string | null) => void
}) {
  const color = PERSON_RECORD_KIND_COLOR[record.kind]
  return (
    <CardBox
      $shared={shared}
      $highlighted={shared && highlighted}
      onMouseEnter={shared ? () => onHover(record.linkEventId) : undefined}
      onMouseLeave={shared ? () => onHover(null) : undefined}
    >
      <CardTop>
        <KindChip style={{ color: color.base, background: color.soft }}>
          {PERSON_RECORD_KIND_LABEL[record.kind]}
        </KindChip>
        {shared && <SharedBadge>공유</SharedBadge>}
        {record.role && <RoleText>{record.role}</RoleText>}
      </CardTop>
      <CardTitle>{record.title}</CardTitle>
      {record.summary && <CardSummary>{record.summary}</CardSummary>}
      {record.countryName && <CardCountry>{record.countryName}</CardCountry>}
    </CardBox>
  )
}

const PanelWrap = styled.div`
  padding: 12px 0 60px;

  @media (max-width: 768px) {
    padding: 8px 0 40px;
  }
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px 16px;
  flex-wrap: wrap;
  margin-bottom: 6px;
`

const TitleMeta = styled.span`
  margin-left: 10px;
  font-size: 13px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ToolbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-left: auto;
`

const PeriodGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
`

const PeriodText = styled.span<{ $active: boolean }>`
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
`

const ClearRangeBtn = styled.button`
  border: none;
  background: transparent;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.tertiary};
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const AddPersonBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: ${({ theme }) => theme.colors.active};
  color: ${({ theme }) => theme.colors.background.primary};
  transition: opacity 0.14s;
  &:hover:not(:disabled) {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`

const CaptionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px 16px;
  flex-wrap: wrap;
  margin: 6px 0 14px;
`

const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LegendSwatch = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
`

const Caption = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CaptionWarn = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #d97706;
`

const LoadingBox = styled.div`
  padding: 48px 24px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const GridScroll = styled.div`
  overflow: auto;
  max-height: calc(100vh - 260px);
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  transition: opacity 0.15s;
`

const Grid = styled.div`
  display: grid;
  min-width: min-content;
`

const headCellBase = css`
  position: sticky;
  top: 0;
  z-index: 2;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`

const CornerCell = styled.div`
  ${headCellBase}
  left: 0;
  z-index: 3;
  padding: 12px 10px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-right: 1px solid ${({ theme }) => theme.colors.border.default};
`

const ColumnHeadCell = styled.div`
  ${headCellBase}
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 10px 12px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ColumnHeadMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ColumnNameBtn = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &:hover {
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 1px;
    border-radius: 4px;
  }
`

const ColumnLifespan = styled.span`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ColumnHeadCaption = styled.span`
  font-size: 10.5px;
  color: #d97706;
`

const RemoveBtn = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 1px;
  }
`

const YearCell = styled.div`
  position: sticky;
  left: 0;
  z-index: 1;
  padding: 10px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.primary};
  border-right: 1px solid ${({ theme }) => theme.colors.border.default};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const BodyCell = styled.div`
  position: relative;
  padding: 8px 10px 8px 16px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  min-height: 34px;
`

/** 셀 좌측 재임/재위 밴드 레일 — 동시 재위 수만큼 세로 스트라이프 */
const BandRail = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  display: flex;
  gap: 2px;
  padding: 0 0 0 3px;
`

const BandStripe = styled.span`
  width: 3px;
  height: 100%;
  opacity: 0.85;
`

const CellBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const BandLabel = styled.div`
  border-left: 3px solid transparent;
  padding: 4px 8px;
  border-radius: 0 6px 6px 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'};
`

const BandKind = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-right: 6px;
`

const BandTitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow-wrap: anywhere;
`

const BandMeta = styled.div`
  margin-top: 2px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CardBox = styled.div<{ $shared: boolean; $highlighted: boolean }>`
  border: 1px solid
    ${({ theme, $shared }) =>
      $shared ? SHARED_ACCENT : theme.colors.border.default};
  border-radius: 8px;
  padding: 7px 9px;
  background: ${({ theme }) => theme.colors.background.primary};
  transition: box-shadow 0.12s, border-color 0.12s;
  ${({ $highlighted }) =>
    $highlighted &&
    css`
      border-color: ${SHARED_ACCENT};
      box-shadow: 0 0 0 2px ${SHARED_ACCENT_SOFT}, 0 0 0 1px ${SHARED_ACCENT};
    `}
`

const CardTop = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 3px;
`

const KindChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
`

const SharedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: ${SHARED_ACCENT};
  background: ${SHARED_ACCENT_SOFT};
`

const RoleText = styled.span`
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
`

const CardTitle = styled.div`
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow-wrap: anywhere;
`

const CardSummary = styled.div`
  margin-top: 2px;
  font-size: 11.5px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const CardCountry = styled.div`
  margin-top: 3px;
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EmptyColCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 32px 16px;
  text-align: center;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const EmptyColTitle = styled.div`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptyColCaption = styled.div`
  font-size: 11px;
  color: #d97706;
`

const AuthorLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.active};
  background: ${({ theme }) => theme.colors.activeLight};
  &:hover {
    opacity: 0.85;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 1px;
  }
`
