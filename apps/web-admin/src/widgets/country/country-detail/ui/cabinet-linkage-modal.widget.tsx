/**
 * 같은 국제 사건(Event)을 축으로 다국 행정부(CabinetLinkageGroup) 연결
 * — 국가 선택 → 해당 국가 행정부 선택 (재임 기록·URL에 사건이 있으면 사건 선택 생략)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiGlobe, FiSearch, FiX } from 'react-icons/fi'

import { getAllCountries } from '@/shared/api/countries'
import { getAllEvents } from '@/shared/api/events'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import {
  type CabinetListItemDto,
  personCareerApi,
} from '@/shared/api/person-career'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import {
  ModalBody,
  ModalBox,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalSubtitle,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'

import * as CabS from './cabinets-section.styled'
import {
  formatCabinetHeadBreadcrumbLabel,
  getHeadTenureTerritoryLabel,
  getPersonName,
} from './cabinets-section.helpers'

function rowLabel(cab: CabinetListItemDto, fallbackCountry: string) {
  const ht = cab.headTenure
  const territory = getHeadTenureTerritoryLabel(ht, fallbackCountry)
  const headLine = formatCabinetHeadBreadcrumbLabel(ht)
  const cabName = cab.name?.trim()
  return [territory, cabName || headLine, ht?.person ? getPersonName(ht.person) : null]
    .filter(Boolean)
    .join(' · ')
}

function parseTerritoryKey(key: string): {
  kind: 'modern' | 'historical'
  id: string
} | null {
  const i = key.indexOf('|')
  if (i < 1) return null
  const kind = key.slice(0, i) as 'modern' | 'historical'
  const id = key.slice(i + 1)
  if (!id || (kind !== 'modern' && kind !== 'historical')) return null
  return { kind, id }
}

function shortTerritoryLabel(label: string) {
  return label
    .replace(/\s*\(현대 국가\)\s*$/, '')
    .replace(/\s*\(역사적 국가\)\s*$/, '')
}

export type CabinetLinkageModalProps = {
  cabinetId: string
  countryId?: string
  historicalCountryId?: string
  countryName: string
  isDark: boolean
  linkageGroupId?: string | null
  linkageGroup?: CabinetListItemDto['linkageGroup'] | null
  /** 재임 기록·URL 등에서 넘긴 사건 ID — 있으면 사건 선택 UI 숨김 */
  linkEventId?: string | null
  linkEventTitle?: string | null
  onClose: () => void
}

export function CabinetLinkageModal({
  cabinetId,
  countryId,
  historicalCountryId,
  countryName,
  isDark,
  linkageGroupId = null,
  linkageGroup = null,
  linkEventId = null,
  linkEventTitle = null,
  onClose,
}: CabinetLinkageModalProps) {
  const C = getCabinetsSectionPalette(isDark)
  const queryClient = useQueryClient()
  const territorySearchRef = useRef<HTMLInputElement>(null)
  const cabinetSearchRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [territoryKey, setTerritoryKey] = useState('')
  const debounced = useDebouncedValue(search, 280, territoryKey)
  const [territoryFilter, setTerritoryFilter] = useState('')
  const [eventSearch, setEventSearch] = useState('')
  const [fallbackEventId, setFallbackEventId] = useState<string | null>(null)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [leavingId, setLeavingId] = useState<string | null>(null)

  const { data: countriesBundle } = useQuery({
    queryKey: ['cabinet-linkage-territory-options'],
    queryFn: async () => {
      const [modern, historical] = await Promise.all([
        getAllCountries(),
        getAllHistoricalCountries(),
      ])
      return { modern, historical }
    },
    staleTime: 120_000,
  })

  const {
    data: linked = [],
    isLoading: linkedLoading,
    isError: linkedError,
    error: linkedErr,
  } = useQuery({
    queryKey: ['cabinet-linked-cabinets', cabinetId],
    queryFn: () => personCareerApi.getLinkedCabinets(cabinetId),
    enabled: !!cabinetId,
  })

  const territory = parseTerritoryKey(territoryKey)

  const {
    data: searchHits = [],
    isFetching: searchFetching,
    isError: searchError,
    error: searchErr,
  } = useQuery({
    queryKey: [
      'cabinet-search-for-linkage',
      cabinetId,
      territoryKey,
      debounced.trim(),
    ],
    queryFn: () => {
      if (!territory) return Promise.resolve([])
      return personCareerApi.searchCabinetsForLinkage({
        excludeCabinetId: cabinetId,
        q: debounced.trim(),
        limit: 80,
        countryId: territory.kind === 'modern' ? territory.id : undefined,
        historicalCountryId:
          territory.kind === 'historical' ? territory.id : undefined,
      })
    },
    enabled: !!cabinetId && !!territory,
  })

  const { data: eventOptions = [], isPending: eventsLoading } = useQuery({
    queryKey: ['events-for-cabinet-linkage-fallback'],
    queryFn: () => getAllEvents({ limit: 500 }),
    staleTime: 60_000,
    enabled:
      !linkEventId?.trim() &&
      !linkageGroup?.eventId &&
      !(linked as CabinetListItemDto[])[0]?.linkageGroup?.eventId,
  })

  const linkedList = linked as CabinetListItemDto[]

  const lockedEventId =
    linkedList[0]?.linkageGroup?.eventId ?? linkageGroup?.eventId ?? null

  const urlEventId = linkEventId?.trim() || null

  const showFallbackEventPicker =
    !lockedEventId && !urlEventId && !linkageGroup?.eventId

  const effectiveEventId =
    lockedEventId ?? urlEventId ?? linkageGroup?.eventId ?? fallbackEventId

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase()
    if (!q) return eventOptions
    return eventOptions.filter((e) => e.title?.toLowerCase().includes(q))
  }, [eventOptions, eventSearch])

  const selectedFallbackEventTitle = useMemo(() => {
    if (!fallbackEventId) return null
    return eventOptions.find((e) => e.id === fallbackEventId)?.title ?? null
  }, [fallbackEventId, eventOptions])

  const eventListRows = useMemo(() => {
    if (!eventSearch.trim().length) return filteredEvents.slice(0, 40)
    return filteredEvents.slice(0, 120)
  }, [filteredEvents, eventSearch])

  const eventListHint =
    !eventSearch.trim() && eventOptions.length > 40

  const eventLabel = useMemo(() => {
    if (linkEventTitle?.trim()) return linkEventTitle.trim()
    if (urlEventId && linkageGroup?.eventId === urlEventId && linkageGroup.event?.title) {
      return linkageGroup.event.title
    }
    if (lockedEventId) {
      const t =
        linkedList[0]?.linkageGroup?.event?.title ??
        linkageGroup?.event?.title
      if (t) return t
    }
    return null
  }, [
    linkEventTitle,
    urlEventId,
    linkageGroup,
    lockedEventId,
    linkedList,
  ])

  const territoryOptions = useMemo(() => {
    const modern = countriesBundle?.modern ?? []
    const historical = countriesBundle?.historical ?? []
    const out: { key: string; label: string }[] = []
    for (const c of modern) {
      if (countryId && c.id === countryId) continue
      out.push({
        key: `modern|${c.id}`,
        label: `${c.name} (현대 국가)`,
      })
    }
    for (const h of historical) {
      if (historicalCountryId && h.id === historicalCountryId) continue
      out.push({
        key: `historical|${h.id}`,
        label: `${h.name} (역사적 국가)`,
      })
    }
    out.sort((a, b) => a.label.localeCompare(b.label, 'ko'))
    return out
  }, [countriesBundle, countryId, historicalCountryId])

  const filteredTerritoryList = useMemo(() => {
    const q = territoryFilter.trim().toLowerCase()
    if (!q.length) return territoryOptions.slice(0, 48)
    return territoryOptions.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 200)
  }, [territoryOptions, territoryFilter])

  const territoryListHint =
    !territoryFilter.trim() && territoryOptions.length > 48

  const selectedTerritoryOption = useMemo(
    () => territoryOptions.find((o) => o.key === territoryKey) ?? null,
    [territoryOptions, territoryKey],
  )

  const linkedIds = useMemo(
    () => new Set(linkedList.map((c) => c.id)),
    [linkedList],
  )

  const visibleHits = useMemo(
    () =>
      (searchHits as CabinetListItemDto[]).filter((c) => !linkedIds.has(c.id)),
    [searchHits, linkedIds],
  )

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cabinet-linked-cabinets'] })
    queryClient.invalidateQueries({ queryKey: ['cabinets-by-country'] })
    queryClient.invalidateQueries({ queryKey: ['cabinets-by-linkage-event'] })
  }

  const handleLink = async (otherId: string) => {
    const eid = effectiveEventId
    if (!eid) {
      notify.error(
        '연결할 사건이 필요합니다. 재임 기록에 사건을 연결하거나 아래에서 사건을 고르세요.',
      )
      return
    }
    setLinkingId(otherId)
    try {
      await personCareerApi.linkCabinetWithOther(cabinetId, otherId, eid)
      notify.success('같은 묶음으로 연결했습니다.')
      setSearch('')
      invalidate()
    } catch (e: unknown) {
      notify.error(getApiErrorMessage(e, '연결에 실패했습니다.'))
    } finally {
      setLinkingId(null)
    }
  }

  const handleLeave = async (targetCabinetId: string) => {
    setLeavingId(targetCabinetId)
    try {
      await personCareerApi.leaveCabinetLinkage(targetCabinetId)
      notify.success('묶음에서 제외했습니다.')
      invalidate()
    } catch (e: unknown) {
      notify.error(getApiErrorMessage(e, '묶음 해제에 실패했습니다.'))
    } finally {
      setLeavingId(null)
    }
  }

  const busy = linkingId != null || leavingId != null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  useEffect(() => {
    if (territoryKey) return
    const t = window.setTimeout(() => territorySearchRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [territoryKey])

  useEffect(() => {
    if (!territoryKey || !parseTerritoryKey(territoryKey)) return
    const t = window.setTimeout(() => cabinetSearchRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [territoryKey])

  return (
    <ModalOverlay
      role="dialog"
      aria-modal="true"
      aria-labelledby="cabinet-linkage-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <ModalBox
        $maxWidth="min(520px, calc(100vw - 28px))"
        $maxHeight="min(720px, 92vh)"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderRadius: 16,
          border: isDark
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid rgba(15,23,42,0.06)',
        }}
      >
        <ModalHeader>
          <div>
            <ModalTitle id="cabinet-linkage-modal-title">
              다른 나라 행정부와 묶기
            </ModalTitle>
            <ModalSubtitle style={{ marginTop: 6, lineHeight: 1.5 }}>
              국가를 고른 뒤 그 나라 행정부를 고릅니다. 재임 기록에 사건이
              연결되어 있거나 주소에 사건이 있으면 그 축으로 묶습니다.
            </ModalSubtitle>
          </div>
          <ModalCloseButton
            type="button"
            onClick={() => !busy && onClose()}
            aria-label="닫기"
          >
            <FiX size={22} strokeWidth={2} />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody style={{ paddingTop: 8, gap: 20 }}>
          <section>
            <p
              style={{
                margin: '0 0 8px',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: C.textMuted,
              }}
            >
              축이 되는 사건
            </p>
            {lockedEventId ? (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: C.text }}>
                <strong>
                  {linkedList[0]?.linkageGroup?.event?.title ??
                    linkageGroup?.event?.title ??
                    lockedEventId}
                </strong>
                <span
                  style={{
                    display: 'block',
                    marginTop: 4,
                    fontSize: 12,
                    color: C.textMuted,
                  }}
                >
                  이미 묶음에 사건이 정해져 있어 변경할 수 없습니다.
                </span>
              </p>
            ) : urlEventId ? (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: C.text }}>
                <strong>{eventLabel ?? urlEventId}</strong>
                <span
                  style={{
                    display: 'block',
                    marginTop: 4,
                    fontSize: 12,
                    color: C.textMuted,
                  }}
                >
                  이 재임·주소에서 넘어온 사건 맥락으로 묶습니다.
                </span>
              </p>
            ) : showFallbackEventPicker ? (
              <>
                {fallbackEventId && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: 14,
                      marginBottom: 10,
                      background: C.accentBg,
                      border: `1px solid ${C.accentBorder}`,
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 14,
                        fontWeight: 600,
                        color: C.text,
                      }}
                    >
                      {selectedFallbackEventTitle ?? fallbackEventId}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFallbackEventId(null)}
                      style={{
                        flexShrink: 0,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 999,
                        border: `1px solid ${C.accentBorder}`,
                        color: C.accent,
                        background: C.inputBg,
                        cursor: 'pointer',
                      }}
                    >
                      바꾸기
                    </button>
                  </div>
                )}
                {!fallbackEventId && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 12,
                        border: `1px solid ${C.inputBorder}`,
                        marginBottom: 8,
                        background: C.bgSubtle,
                      }}
                    >
                      <FiSearch
                        size={18}
                        aria-hidden
                        style={{ color: C.iconColor, flexShrink: 0 }}
                      />
                      <input
                        type="search"
                        value={eventSearch}
                        onChange={(e) => setEventSearch(e.target.value)}
                        placeholder="사건 제목으로 검색…"
                        autoComplete="off"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          border: 'none',
                          background: 'transparent',
                          fontSize: 14,
                          outline: 'none',
                          color: C.text,
                        }}
                      />
                    </div>
                    {eventListHint && (
                      <p
                        style={{
                          margin: '0 0 8px',
                          fontSize: 11,
                          lineHeight: 1.45,
                          color: C.textFaint,
                        }}
                      >
                        검색어 없이는 상위 40개만 표시됩니다. 제목을 입력해
                        좁히세요.
                      </p>
                    )}
                    {eventsLoading ? (
                      <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>
                        사건 목록 불러오는 중…
                      </p>
                    ) : eventListRows.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>
                        검색 결과가 없습니다.
                      </p>
                    ) : (
                      <div
                        role="listbox"
                        aria-label="사건 목록"
                        style={{
                          maxHeight: 220,
                          overflow: 'auto',
                          borderRadius: 12,
                          border: `1px solid ${C.borderMid}`,
                          padding: 4,
                          background: C.cardBg,
                        }}
                      >
                        {eventListRows.map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            role="option"
                            onClick={() => setFallbackEventId(ev.id)}
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              padding: '10px 12px',
                              borderRadius: 10,
                              border: '1.5px solid transparent',
                              marginBottom: 2,
                              fontSize: 13,
                              lineHeight: 1.4,
                              color: C.text,
                              background: 'transparent',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = C.accentSecondaryBg
                              e.currentTarget.style.borderColor = C.accentBorder
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.borderColor = 'transparent'
                            }}
                          >
                            {ev.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: C.text }}>
                <strong>{linkageGroup?.event?.title ?? '—'}</strong>
              </p>
            )}
          </section>

          <section>
            <p
              style={{
                margin: '0 0 8px',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: C.textMuted,
              }}
            >
              국가·행정부 선택
            </p>
            {showFallbackEventPicker ? (
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: C.textFaint,
                }}
              >
                위에서 사건을 선택한 뒤, 여기서 나라와 행정부를 고릅니다.
              </p>
            ) : (
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: C.textFaint,
                }}
              >
                사건 축이 정해졌습니다. 묶을 나라와 행정부를 고릅니다.
              </p>
            )}
            {territoryOptions.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>
                다른 국가 목록이 없습니다. (현재 보고 있는 국가만 제외됩니다.)
              </p>
            ) : territory && selectedTerritoryOption ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 14,
                  marginBottom: 10,
                  background: C.accentBg,
                  border: `1px solid ${C.accentBorder}`,
                }}
              >
                <FiGlobe
                  size={20}
                  aria-hidden
                  style={{ color: C.accent, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.text,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {shortTerritoryLabel(selectedTerritoryOption.label)}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 2, color: C.textMuted }}>
                    {selectedTerritoryOption.key.startsWith('modern|')
                      ? '현대 국가'
                      : '역사적 국가'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTerritoryKey('')
                    setSearch('')
                    setTerritoryFilter('')
                  }}
                  style={{
                    flexShrink: 0,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 999,
                    border: `1px solid ${C.accentBorder}`,
                    color: C.accent,
                    background: C.inputBg,
                    cursor: 'pointer',
                  }}
                >
                  변경
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: `1px solid ${C.inputBorder}`,
                    marginBottom: 8,
                    background: C.bgSubtle,
                  }}
                >
                  <FiSearch
                    size={18}
                    aria-hidden
                    style={{ color: C.iconColor, flexShrink: 0 }}
                  />
                  <input
                    ref={territorySearchRef}
                    type="search"
                    value={territoryFilter}
                    onChange={(e) => setTerritoryFilter(e.target.value)}
                    placeholder="국가 이름 검색 (예: 미국, 프랑스, 조선)…"
                    autoComplete="off"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: 'none',
                      background: 'transparent',
                      fontSize: 14,
                      outline: 'none',
                      color: C.text,
                    }}
                  />
                </div>
                {territoryListHint && (
                  <p
                    style={{
                      margin: '0 0 8px',
                      fontSize: 11,
                      lineHeight: 1.45,
                      color: C.textFaint,
                    }}
                  >
                    검색어 없이는 가나다·알파벳 순 상위 48개만 표시됩니다. 검색으로
                    좁히세요.
                  </p>
                )}
                <div
                  role="listbox"
                  aria-label="묶을 행정부가 있는 국가"
                  style={{
                    maxHeight: 240,
                    overflow: 'auto',
                    borderRadius: 12,
                    border: `1px solid ${C.borderMid}`,
                    padding: 4,
                    background: C.cardBg,
                  }}
                >
                  {filteredTerritoryList.length === 0 ? (
                    <p
                      style={{
                        margin: '12px 10px',
                        fontSize: 13,
                        color: C.textMuted,
                      }}
                    >
                      검색 결과가 없습니다.
                    </p>
                  ) : (
                    filteredTerritoryList.map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        role="option"
                        onClick={() => {
                          setTerritoryKey(o.key)
                          setTerritoryFilter('')
                          setSearch('')
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1.5px solid transparent',
                          marginBottom: 2,
                          fontSize: 13,
                          color: C.text,
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = C.bgSubtle
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>
                          {shortTerritoryLabel(o.label)}
                        </span>
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: C.textFaint,
                          }}
                        >
                          {o.key.startsWith('modern|') ? '현대' : '역사'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {territory ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 999,
                  border: `1px solid ${C.inputBorder}`,
                  marginBottom: 8,
                  background: C.bgSubtle,
                }}
              >
                <FiSearch
                  size={18}
                  aria-hidden
                  style={{ color: C.iconColor, flexShrink: 0 }}
                />
                <input
                  ref={cabinetSearchRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="이 국가 안에서 수반·내각명으로 좁히기…"
                  autoComplete="off"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: 'none',
                    background: 'transparent',
                    fontSize: 14,
                    outline: 'none',
                    color: C.text,
                  }}
                />
              </div>
            ) : null}

            {searchError && (
              <p
                style={{ margin: '0 0 8px', fontSize: 12, color: C.danger }}
              >
                {getApiErrorMessage(
                  searchErr,
                  '목록을 불러오지 못했습니다. 로그인 후 다시 시도하세요.',
                )}
              </p>
            )}
            {territory && searchFetching && (
              <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>
                불러오는 중…
              </p>
            )}
            {territory &&
              !searchFetching &&
              !searchError &&
              visibleHits.length === 0 && (
                <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>
                  이 국가에 묶을 수 있는 다른 행정부가 없거나 검색 결과가 없습니다.
                </p>
              )}
            {territory && !searchFetching && visibleHits.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxHeight: Math.min(260, 42 * 6),
                  overflow: 'auto',
                }}
              >
                {visibleHits.map((cab) => (
                  <div
                    key={cab.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: `1px solid ${C.borderMid}`,
                      fontSize: 13,
                      background: C.cardBg,
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, color: C.text }}>
                      {rowLabel(cab, countryName)}
                    </span>
                    <button
                      type="button"
                      disabled={
                        linkingId === cab.id ||
                        busy ||
                        (showFallbackEventPicker && !fallbackEventId)
                      }
                      onClick={() => void handleLink(cab.id)}
                      style={{
                        flexShrink: 0,
                        padding: '7px 14px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 999,
                        border: 'none',
                        color: '#fff',
                        cursor:
                          showFallbackEventPicker && !fallbackEventId
                            ? 'not-allowed'
                            : 'pointer',
                        opacity:
                          showFallbackEventPicker && !fallbackEventId ? 0.45 : 1,
                        background: `linear-gradient(135deg, ${C.accent} 0%, #8b5cf6 100%)`,
                      }}
                    >
                      {linkingId === cab.id ? '연결 중…' : '묶기'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {linkedError && (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: C.danger,
              }}
            >
              {getApiErrorMessage(
                linkedErr,
                '연결 목록을 불러오지 못했습니다. 로그인 상태를 확인하세요.',
              )}
            </p>
          )}

          <section>
            <p
              style={{
                margin: '0 0 8px',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: C.textMuted,
              }}
            >
              이미 묶인 행정부
            </p>
            {linkedLoading ? (
              <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>
                불러오는 중…
              </p>
            ) : linkedError ? null : linkedList.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>
                아직 연결된 다른 행정부가 없습니다. 위에서 국가를 고른 뒤 묶을 수
                있습니다.
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxHeight: Math.min(260, 42 * 6),
                  overflow: 'auto',
                }}
              >
                {linkedList.map((cab) => (
                  <div
                    key={cab.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: `1px solid ${C.borderMid}`,
                      fontSize: 13,
                      background: C.cardBg,
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, color: C.text }}>
                      {rowLabel(cab, countryName)}
                    </span>
                    <button
                      type="button"
                      disabled={leavingId === cab.id || busy}
                      onClick={async () => {
                        if (
                          await confirm({
                            title: '삭제 확인',
                            message:
                              '이 행정부를 묶음에서 제외할까요? (해당 행정부만 빠집니다.)',
                            danger: true,
                          })
                        )
                          void handleLeave(cab.id)
                      }}
                      style={{
                        flexShrink: 0,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 999,
                        border: `1px solid ${C.dangerBg}`,
                        color: C.danger,
                        background: C.inputBg,
                        cursor: 'pointer',
                      }}
                    >
                      {leavingId === cab.id ? '처리 중…' : '제외'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {(linkedList.length > 0 || linkageGroupId) &&
            !linkedLoading &&
            !linkedError && (
              <button
                type="button"
                disabled={leavingId === cabinetId || busy}
                onClick={async () => {
                  if (
                    await confirm({
                      title: '삭제 확인',
                      message:
                        '이 행정부(지금 보고 있는 행정부)만 묶음에서 빠질까요?',
                      danger: true,
                    })
                  )
                    void handleLeave(cabinetId)
                }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: `1px solid ${C.dangerBg}`,
                  color: C.danger,
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                {leavingId === cabinetId ? '처리 중…' : '이 행정부만 묶음 해제'}
              </button>
            )}
        </ModalBody>

        <ModalFooter>
          <CabS.CabinetCancelBtn type="button" onClick={() => !busy && onClose()}>
            닫기
          </CabS.CabinetCancelBtn>
        </ModalFooter>
      </ModalBox>
    </ModalOverlay>
  )
}
