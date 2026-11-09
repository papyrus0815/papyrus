import { useEffect, useMemo, useState } from 'react'

import styled from 'styled-components'

import {
  type AdminDivisionConfig,
  type AdministrativeDivision,
  useAdminDivisionConfigs,
  useAdminDivisionSchemes,
  useAdministrativeDivisions,
} from '@/entities/country/api.administrative-divisions'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { GoogleMap, type MapMarker } from '@/shared/ui/google-map/google-map'

import * as S from '../country-detail-dashboard.styles'

export interface CountryMapDashboardPanelProps {
  country: UnifiedCountry
  /** 역사 국가일 때 연결된 현대 국가 목록 (검색 폴백 및 지리 맥락 표시용) */
  linkedModernCountries?: Array<{ id: string; name: string }>
  /** 기본 정보 수정(위·경도, 수도 등) 모달 열기 */
  onEdit?: () => void
  /** 행정구역 탭 열기 (선택된 divisionId가 있으면 해당 구역으로 딥링크) */
  onOpenRegionsTab: (divisionId?: string) => void
}

interface FlatDivisionNode {
  id: string
  name: string
  localName: string | null
  level: number
  unitLabel: string
  parentId: string | null
  parentPath: string[]
  parentIdPath: string[]
  centerLat: number | null
  centerLng: number | null
  childrenCount: number
  abolished: boolean
}

type FocusTarget =
  | { kind: 'country' }
  | { kind: 'capital'; capitalName: string }
  | { kind: 'division'; division: FlatDivisionNode }

type MapViewMode = 'google' | 'pins'

function flattenDivisions(
  nodes: AdministrativeDivision[],
  configsById: Map<string, AdminDivisionConfig>,
  depth = 1,
  parentPath: string[] = [],
  parentIdPath: string[] = [],
  parentId: string | null = null,
  acc: FlatDivisionNode[] = [],
): FlatDivisionNode[] {
  for (const node of nodes) {
    const cfg = configsById.get(node.adminDivisionId)
    const hasLat =
      node.centerLat != null && Number.isFinite(Number(node.centerLat))
    const hasLng =
      node.centerLng != null && Number.isFinite(Number(node.centerLng))
    acc.push({
      id: node.id,
      name: node.name,
      localName: node.localName ?? null,
      level: cfg?.divisionLevel ?? depth,
      unitLabel: cfg?.divisionLabel ?? `${depth}차`,
      parentId,
      parentPath,
      parentIdPath,
      centerLat: hasLat ? Number(node.centerLat) : null,
      centerLng: hasLng ? Number(node.centerLng) : null,
      childrenCount: node.children?.length ?? 0,
      abolished: Boolean(
        node.abolishedDate && node.abolishedDate.trim() !== '',
      ),
    })
    if (node.children && node.children.length > 0) {
      flattenDivisions(
        node.children,
        configsById,
        depth + 1,
        [...parentPath, node.name],
        [...parentIdPath, node.id],
        node.id,
        acc,
      )
    }
  }
  return acc
}

function formatCoordinatePair(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lngDir = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`
}

/** 국가 영토 면적(km²)에 따른 기본 구글 지도 줌 레벨 산출 */
function getOptimalCountryZoom(
  areaSqKm: number | null | undefined,
  isHistorical: boolean,
  hasCapital: boolean,
): number {
  const area = areaSqKm != null ? Number(areaSqKm) : NaN
  if (Number.isFinite(area) && area > 0) {
    if (area >= 7_000_000) return 3
    if (area >= 1_500_000) return 4
    if (area >= 150_000) return 5
    if (area >= 25_000) return 6
    if (area >= 3_000) return 8
    return 10
  }
  return isHistorical && hasCapital ? 6 : 5
}

function buildGoogleEmbedUrl(params: {
  query: string
  lat?: number | null
  lng?: number | null
  zoom: number
}): string {
  const searchParams = new URLSearchParams()
  const hasCoord =
    params.lat != null &&
    params.lng != null &&
    Number.isFinite(params.lat) &&
    Number.isFinite(params.lng)

  if (hasCoord) {
    const coordStr = `${Number(params.lat).toFixed(6)},${Number(params.lng).toFixed(6)}`
    searchParams.set('q', params.query ? `${params.query}` : coordStr)
    searchParams.set('ll', coordStr)
  } else {
    searchParams.set('q', params.query)
  }
  searchParams.set('hl', 'ko')
  searchParams.set('z', String(Math.round(params.zoom)))
  searchParams.set('output', 'embed')
  return `https://maps.google.com/maps?${searchParams.toString()}`
}

function buildGoogleExternalUrl(params: {
  query: string
  lat?: number | null
  lng?: number | null
}): string {
  const hasCoord =
    params.lat != null &&
    params.lng != null &&
    Number.isFinite(params.lat) &&
    Number.isFinite(params.lng)
  const q = hasCoord
    ? `${Number(params.lat).toFixed(6)},${Number(params.lng).toFixed(6)}`
    : params.query
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

const TOP_DIVISION_PREVIEW_LIMIT = 10
const SUB_DIVISION_PREVIEW_LIMIT = 14

export function CountryMapDashboardPanel({
  country,
  linkedModernCountries = [],
  onEdit,
  onOpenRegionsTab,
}: CountryMapDashboardPanelProps) {
  const isHistorical = country.type === 'historical'
  const owner = useMemo(
    () =>
      isHistorical
        ? { historicalCountryId: country.id }
        : { countryId: country.id },
    [isHistorical, country.id],
  )

  const [activeSchemeId, setActiveSchemeId] = useState<string | null>(null)
  const [focusTarget, setFocusTarget] = useState<FocusTarget>({
    kind: 'country',
  })
  const [mapMode, setMapMode] = useState<MapViewMode>('google')
  const [customZoom, setCustomZoom] = useState<number | null>(null)
  const [showAllTopDivisions, setShowAllTopDivisions] = useState(false)
  const [showAllSubDivisions, setShowAllSubDivisions] = useState(false)
  const [divisionSearch, setDivisionSearch] = useState('')

  // 국가 변경 시 내부 상태 초기화
  useEffect(() => {
    setActiveSchemeId(null)
    setFocusTarget({ kind: 'country' })
    setCustomZoom(null)
    setShowAllTopDivisions(false)
    setShowAllSubDivisions(false)
    setDivisionSearch('')
  }, [country.id])

  const { data: schemes = [] } = useAdminDivisionSchemes(owner)
  const { data: divisions = [] } = useAdministrativeDivisions(
    owner,
    activeSchemeId,
  )
  const { data: configs = [] } = useAdminDivisionConfigs(owner, activeSchemeId)

  const configsById = useMemo(() => {
    const map = new Map<string, AdminDivisionConfig>()
    for (const cfg of configs) map.set(cfg.id, cfg)
    return map
  }, [configs])

  const flatDivisions = useMemo(
    () => flattenDivisions(divisions, configsById),
    [divisions, configsById],
  )

  const divisionsById = useMemo(() => {
    const map = new Map<string, FlatDivisionNode>()
    for (const item of flatDivisions) map.set(item.id, item)
    return map
  }, [flatDivisions])

  const topLevelDivisions = useMemo(
    () => flatDivisions.filter((d) => d.parentId === null),
    [flatDivisions],
  )

  const pinnedDivisions = useMemo(
    () =>
      flatDivisions.filter(
        (d) => d.centerLat != null && d.centerLng != null && !d.abolished,
      ),
    [flatDivisions],
  )

  // 검색어로 필터링된 행정구역 목록 (전체 레벨 대상)
  const searchResults = useMemo(() => {
    const q = divisionSearch.trim().toLowerCase()
    if (!q) return []
    return flatDivisions
      .filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.localName && d.localName.toLowerCase().includes(q)) ||
          d.parentPath.some((p) => p.toLowerCase().includes(q)),
      )
      .slice(0, 16)
  }, [divisionSearch, flatDivisions])

  // 현재 선택된 행정구역의 조상 노드 및 직계 하위(2·3차) 구역 목록
  const selectedDivisionContext = useMemo(() => {
    if (focusTarget.kind !== 'division') return null
    const current =
      divisionsById.get(focusTarget.division.id) ?? focusTarget.division
    const ancestors = current.parentIdPath
      .map((id) => divisionsById.get(id))
      .filter((item): item is FlatDivisionNode => Boolean(item))
    const children = flatDivisions.filter((d) => d.parentId === current.id)
    return {
      current,
      ancestors,
      children,
    }
  }, [focusTarget, divisionsById, flatDivisions])

  const countryLat =
    country.latitude != null && Number.isFinite(Number(country.latitude))
      ? Number(country.latitude)
      : null
  const countryLng =
    country.longitude != null && Number.isFinite(Number(country.longitude))
      ? Number(country.longitude)
      : null
  const hasCountryCoords = countryLat != null && countryLng != null

  const capitalText = country.capital ? String(country.capital).trim() : ''

  const defaultCountryZoom = useMemo(
    () =>
      getOptimalCountryZoom(
        country.areaSqKm,
        isHistorical,
        Boolean(capitalText),
      ),
    [country.areaSqKm, isHistorical, capitalText],
  )

  // 기본 국가 검색어 폴백 (좌표가 없을 때도 구글 지도가 정확한 지역을 가리키도록 구성)
  const defaultCountryQuery = useMemo(() => {
    if (!isHistorical) {
      return country.fullName?.trim() || country.name.trim()
    }
    if (capitalText) {
      return linkedModernCountries[0]?.name
        ? `${linkedModernCountries[0].name} ${capitalText}`
        : capitalText
    }
    if (linkedModernCountries.length > 0) {
      return linkedModernCountries[0].name
    }
    return country.enName?.trim() || country.name.trim()
  }, [
    isHistorical,
    country.fullName,
    country.name,
    country.enName,
    capitalText,
    linkedModernCountries,
  ])

  const selectFocusTarget = (next: FocusTarget) => {
    setFocusTarget(next)
    setCustomZoom(null)
    setShowAllSubDivisions(false)
  }

  // 현재 포커스 대상에 따른 Google Maps Embed 파라미터 계산
  const activeEmbedSpec = useMemo(() => {
    if (focusTarget.kind === 'capital') {
      const prefix = !isHistorical
        ? country.name
        : linkedModernCountries[0]?.name ?? ''
      const q = prefix
        ? `${prefix} ${focusTarget.capitalName}`
        : focusTarget.capitalName
      const zoom = customZoom ?? 11
      return {
        label: `수도 · ${focusTarget.capitalName}`,
        subLabel: `${q} 중심 확대`,
        zoom,
        embedUrl: buildGoogleEmbedUrl({ query: q, zoom }),
        externalUrl: buildGoogleExternalUrl({ query: q }),
      }
    }

    if (focusTarget.kind === 'division') {
      const div = focusTarget.division
      const hasDivCoord = div.centerLat != null && div.centerLng != null
      const prefix = !isHistorical
        ? country.name
        : linkedModernCountries[0]?.name ?? ''
      const fullPathName = [...div.parentPath, div.name].join(' ')
      const q = hasDivCoord
        ? `${div.centerLat},${div.centerLng}`
        : prefix
          ? `${prefix} ${fullPathName}`
          : fullPathName
      const defaultDivZoom = div.level >= 3 ? 13 : div.level === 2 ? 11 : 9
      const zoom = customZoom ?? defaultDivZoom
      return {
        label: `${div.unitLabel ? `${div.unitLabel} · ` : ''}${div.name}`,
        subLabel: hasDivCoord
          ? formatCoordinatePair(div.centerLat!, div.centerLng!)
          : `"${q}" 명칭 기준 탐색`,
        zoom,
        embedUrl: buildGoogleEmbedUrl({
          query: q,
          lat: div.centerLat,
          lng: div.centerLng,
          zoom,
        }),
        externalUrl: buildGoogleExternalUrl({
          query: q,
          lat: div.centerLat,
          lng: div.centerLng,
        }),
      }
    }

    // kind === 'country'
    const firstPinned = pinnedDivisions[0]
    const effectiveLat = countryLat ?? firstPinned?.centerLat ?? null
    const effectiveLng = countryLng ?? firstPinned?.centerLng ?? null
    const hasEffectiveCoord = effectiveLat != null && effectiveLng != null

    const queryForEmbed = hasCountryCoords
      ? `${countryLat},${countryLng}`
      : hasEffectiveCoord
        ? `${effectiveLat},${effectiveLng}`
        : defaultCountryQuery

    const zoom = customZoom ?? defaultCountryZoom

    return {
      label: `${country.name} 전체`,
      subLabel: hasCountryCoords
        ? formatCoordinatePair(countryLat!, countryLng!)
        : hasEffectiveCoord
          ? `대표 행정구역(${firstPinned.name}) 좌표 기준`
          : `"${defaultCountryQuery}" 검색 기준`,
      zoom,
      embedUrl: buildGoogleEmbedUrl({
        query: queryForEmbed,
        lat: effectiveLat,
        lng: effectiveLng,
        zoom,
      }),
      externalUrl: buildGoogleExternalUrl({
        query: defaultCountryQuery,
        lat: countryLat,
        lng: countryLng,
      }),
    }
  }, [
    focusTarget,
    isHistorical,
    country.name,
    linkedModernCountries,
    customZoom,
    pinnedDivisions,
    countryLat,
    countryLng,
    hasCountryCoords,
    defaultCountryQuery,
    defaultCountryZoom,
  ])

  // 핀 지도용 마커 목록
  const mapMarkers = useMemo<MapMarker[]>(() => {
    if (pinnedDivisions.length > 0) {
      return pinnedDivisions.map((div) => ({
        id: div.id,
        latitude: div.centerLat!,
        longitude: div.centerLng!,
        name: div.unitLabel ? `${div.name} (${div.unitLabel})` : div.name,
      }))
    }
    if (hasCountryCoords) {
      return [
        {
          id: '__country__',
          latitude: countryLat!,
          longitude: countryLng!,
          name: country.name,
        },
      ]
    }
    return []
  }, [pinnedDivisions, hasCountryCoords, countryLat, countryLng, country.name])

  const canUsePinMap = mapMarkers.length > 0
  const effectiveMapMode: MapViewMode =
    mapMode === 'pins' && canUsePinMap ? 'pins' : 'google'

  const selectedDivisionId =
    focusTarget.kind === 'division' ? focusTarget.division.id : null

  const visibleTopDivisions = showAllTopDivisions
    ? topLevelDivisions
    : topLevelDivisions.slice(0, TOP_DIVISION_PREVIEW_LIMIT)
  const hiddenTopDivisionCount = Math.max(
    0,
    topLevelDivisions.length - visibleTopDivisions.length,
  )

  const handleMarkerClick = (markerId: string) => {
    if (markerId === '__country__') {
      selectFocusTarget({ kind: 'country' })
      return
    }
    const found = divisionsById.get(markerId)
    if (found) {
      selectFocusTarget({ kind: 'division', division: found })
    }
  }

  const zoomPresets = useMemo(
    () => [
      { label: '광역', zoom: Math.max(3, defaultCountryZoom - 1) },
      { label: '국가', zoom: defaultCountryZoom },
      { label: '지역', zoom: 9 },
      { label: '도시', zoom: 12 },
    ],
    [defaultCountryZoom],
  )

  const activeTopRootId =
    focusTarget.kind === 'division'
      ? focusTarget.division.parentIdPath[0] ?? focusTarget.division.id
      : null

  return (
    <PanelRoot>
      {/* 1. 4열 지리·영토 요약 원장 스트립 */}
      <S.SectionHeadlineStrip aria-label="국가 지리 및 행정구역 요약">
        <S.SectionHeadlineCell>
          <S.SectionHeadlineLabel>수도 · 중심지</S.SectionHeadlineLabel>
          <S.SectionHeadlineValue $muted={!capitalText}>
            {capitalText || '미등록'}
          </S.SectionHeadlineValue>
          <S.SectionHeadlineSub>
            {capitalText
              ? isHistorical && linkedModernCountries.length > 0
                ? `현대 계승: ${linkedModernCountries.map((m) => m.name).join(' · ')}`
                : '공식 수도 · 하단 칩으로 위치 포커스'
              : onEdit
                ? '기본 정보에서 수도 명칭 입력 가능'
                : '수도 명칭 미입력'}
          </S.SectionHeadlineSub>
        </S.SectionHeadlineCell>

        <S.SectionHeadlineCell>
          <S.SectionHeadlineLabel>중심 좌표 (위도 · 경도)</S.SectionHeadlineLabel>
          <S.SectionHeadlineValue $muted={!hasCountryCoords}>
            {hasCountryCoords
              ? `${countryLat!.toFixed(2)}°, ${countryLng!.toFixed(2)}°`
              : '국가명 자동 탐색'}
          </S.SectionHeadlineValue>
          <S.SectionHeadlineSub>
            {hasCountryCoords
              ? formatCoordinatePair(countryLat!, countryLng!)
              : `위·경도 미등록 — "${defaultCountryQuery}" 기준 표시`}
          </S.SectionHeadlineSub>
        </S.SectionHeadlineCell>

        <S.SectionHeadlineCell>
          <S.SectionHeadlineLabel>등록 행정구역</S.SectionHeadlineLabel>
          <S.SectionHeadlineValue $muted={flatDivisions.length === 0}>
            {flatDivisions.length > 0 ? (
              <>
                {flatDivisions.length.toLocaleString('ko-KR')}
                <S.SectionHeadlineUnit>곳</S.SectionHeadlineUnit>
              </>
            ) : (
              '미등록'
            )}
          </S.SectionHeadlineValue>
          <S.SectionHeadlineSub>
            {flatDivisions.length > 0
              ? `1차 구역 ${topLevelDivisions.length}곳 · 좌표 핀 ${pinnedDivisions.length}곳`
              : '행정구역 탭에서 광역·기초 구역 등록'}
          </S.SectionHeadlineSub>
        </S.SectionHeadlineCell>

        <S.SectionHeadlineCell>
          <S.SectionHeadlineLabel>현재 지도 포커스</S.SectionHeadlineLabel>
          <S.SectionHeadlineValue>
            {activeEmbedSpec.label}
          </S.SectionHeadlineValue>
          <S.SectionHeadlineSub>
            {effectiveMapMode === 'google'
              ? `구글 지도 (z=${activeEmbedSpec.zoom}) · ${activeEmbedSpec.subLabel}`
              : `핀 지도 · 마커 ${mapMarkers.length}개 표시 중`}
          </S.SectionHeadlineSub>
        </S.SectionHeadlineCell>
      </S.SectionHeadlineStrip>

      {/* 1-B. 시기별 행정구역 편제(체계) 필터 바 — 편제 체계가 등록된 국가에만 노출 */}
      {schemes.length > 0 && (
        <SchemeStrip role="tablist" aria-label="시기별 행정구역 편제 체계">
          <SchemeLabel>편제 체계</SchemeLabel>
          <SchemePill
            type="button"
            role="tab"
            aria-selected={activeSchemeId === null}
            $active={activeSchemeId === null}
            onClick={() => {
              setActiveSchemeId(null)
              selectFocusTarget({ kind: 'country' })
            }}
          >
            전체
          </SchemePill>
          {schemes.map((scheme) => {
            const active = activeSchemeId === scheme.id
            return (
              <SchemePill
                key={scheme.id}
                type="button"
                role="tab"
                aria-selected={active}
                $active={active}
                onClick={() => {
                  setActiveSchemeId(scheme.id)
                  selectFocusTarget({ kind: 'country' })
                }}
              >
                <span>{scheme.name}</span>
                {scheme.divisionCount > 0 && (
                  <SchemeCount>{scheme.divisionCount}</SchemeCount>
                )}
              </SchemePill>
            )
          })}
        </SchemeStrip>
      )}

      {/* 2. 컨트롤 바: 좌측 지역 포커스 칩(국가 전체 / 수도 / 1차 행정구역) + 우측 검색·축척·지도 모드·외부 링크 */}
      <ControlBar>
        <FocusChipGroup role="group" aria-label="지도 위치 빠른 포커스">
          <FocusChip
            type="button"
            $active={focusTarget.kind === 'country'}
            onClick={() => selectFocusTarget({ kind: 'country' })}
          >
            국가 전체
          </FocusChip>

          {capitalText && (
            <FocusChip
              type="button"
              $active={focusTarget.kind === 'capital'}
              onClick={() =>
                selectFocusTarget({ kind: 'capital', capitalName: capitalText })
              }
            >
              수도 · {capitalText}
            </FocusChip>
          )}

          {visibleTopDivisions.map((div) => {
            const isSelected = activeTopRootId === div.id
            const hasCoord = div.centerLat != null && div.centerLng != null
            return (
              <FocusChip
                key={div.id}
                type="button"
                $active={isSelected}
                onClick={() =>
                  selectFocusTarget({ kind: 'division', division: div })
                }
                title={
                  hasCoord
                    ? `${div.name} (${formatCoordinatePair(div.centerLat!, div.centerLng!)})`
                    : `${div.name} (명칭 검색 포커스)`
                }
              >
                {hasCoord && <CoordDot $active={isSelected} aria-hidden />}
                <span>{div.name}</span>
                {div.childrenCount > 0 && (
                  <SubCountTag>{div.childrenCount}</SubCountTag>
                )}
              </FocusChip>
            )
          })}

          {hiddenTopDivisionCount > 0 && (
            <MoreChipBtn
              type="button"
              onClick={() => setShowAllTopDivisions(true)}
            >
              +{hiddenTopDivisionCount}곳 더보기
            </MoreChipBtn>
          )}
          {showAllTopDivisions &&
            topLevelDivisions.length > TOP_DIVISION_PREVIEW_LIMIT && (
              <MoreChipBtn
                type="button"
                onClick={() => setShowAllTopDivisions(false)}
              >
                접기
              </MoreChipBtn>
            )}
        </FocusChipGroup>

        <RightControls>
          {flatDivisions.length >= 6 && (
            <QuickSearchWrap>
              <QuickSearchInput
                type="search"
                value={divisionSearch}
                onChange={(e) => setDivisionSearch(e.target.value)}
                placeholder="행정구역 빠른 검색…"
                aria-label="대시보드 지도 행정구역 검색"
              />
            </QuickSearchWrap>
          )}

          {effectiveMapMode === 'google' && (
            <ModeSwitchGroup role="group" aria-label="구글 지도 축척 프리셋">
              {zoomPresets.map((preset) => (
                <ModeSwitchBtn
                  key={preset.label}
                  type="button"
                  $active={activeEmbedSpec.zoom === preset.zoom}
                  onClick={() => setCustomZoom(preset.zoom)}
                  title={`줌 레벨 z=${preset.zoom}`}
                >
                  {preset.label}
                </ModeSwitchBtn>
              ))}
            </ModeSwitchGroup>
          )}

          {canUsePinMap && (
            <ModeSwitchGroup role="tablist" aria-label="지도 표시 방식">
              <ModeSwitchBtn
                type="button"
                role="tab"
                aria-selected={effectiveMapMode === 'google'}
                $active={effectiveMapMode === 'google'}
                onClick={() => setMapMode('google')}
              >
                구글 지도
              </ModeSwitchBtn>
              <ModeSwitchBtn
                type="button"
                role="tab"
                aria-selected={effectiveMapMode === 'pins'}
                $active={effectiveMapMode === 'pins'}
                onClick={() => setMapMode('pins')}
              >
                행정구역 핀 ({mapMarkers.length})
              </ModeSwitchBtn>
            </ModeSwitchGroup>
          )}

          <ExternalMapLink
            href={activeEmbedSpec.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Google 지도 크게 보기 ↗
          </ExternalMapLink>
        </RightControls>
      </ControlBar>

      {/* 2-B. 행정구역 빠른 검색 결과 바 */}
      {divisionSearch.trim() !== '' && (
        <DrilldownBar aria-label="행정구역 검색 결과">
          <DrilldownMeta>
            검색 결과 <strong>{searchResults.length}</strong>곳
          </DrilldownMeta>
          {searchResults.length === 0 ? (
            <DrilldownEmpty>
              &ldquo;{divisionSearch.trim()}&rdquo;와(과) 일치하는 행정구역이
              없습니다.
            </DrilldownEmpty>
          ) : (
            <FocusChipGroup>
              {searchResults.map((div) => {
                const isSelected =
                  focusTarget.kind === 'division' &&
                  focusTarget.division.id === div.id
                const hasCoord = div.centerLat != null && div.centerLng != null
                const pathPrefix =
                  div.parentPath.length > 0
                    ? `${div.parentPath.join(' › ')} › `
                    : ''
                return (
                  <FocusChip
                    key={div.id}
                    type="button"
                    $active={isSelected}
                    onClick={() => {
                      selectFocusTarget({ kind: 'division', division: div })
                      setDivisionSearch('')
                    }}
                  >
                    {hasCoord && <CoordDot $active={isSelected} aria-hidden />}
                    <span>
                      {pathPrefix}
                      <strong>{div.name}</strong>
                    </span>
                  </FocusChip>
                )
              })}
            </FocusChipGroup>
          )}
        </DrilldownBar>
      )}

      {/* 2-C. 선택된 구역의 상위 경로 브레드크럼 및 2·3차 하위 행정구역 드릴다운 바 */}
      {selectedDivisionContext &&
        (selectedDivisionContext.ancestors.length > 0 ||
          selectedDivisionContext.children.length > 0) && (
          <DrilldownBar aria-label="하위 행정구역 탐색">
            <BreadcrumbRow>
              <BreadcrumbRootBtn
                type="button"
                onClick={() => selectFocusTarget({ kind: 'country' })}
              >
                {country.name}
              </BreadcrumbRootBtn>
              {selectedDivisionContext.ancestors.map((anc) => (
                <BreadcrumbItemWrap key={anc.id}>
                  <BreadcrumbSep aria-hidden>›</BreadcrumbSep>
                  <BreadcrumbNodeBtn
                    type="button"
                    onClick={() =>
                      selectFocusTarget({ kind: 'division', division: anc })
                    }
                  >
                    {anc.name}
                  </BreadcrumbNodeBtn>
                </BreadcrumbItemWrap>
              ))}
              <BreadcrumbItemWrap>
                <BreadcrumbSep aria-hidden>›</BreadcrumbSep>
                <BreadcrumbCurrent>
                  {selectedDivisionContext.current.name}
                  {selectedDivisionContext.current.unitLabel
                    ? ` (${selectedDivisionContext.current.unitLabel})`
                    : ''}
                </BreadcrumbCurrent>
              </BreadcrumbItemWrap>
            </BreadcrumbRow>

            {selectedDivisionContext.children.length > 0 && (
              <SubChipRow>
                <DrilldownMeta>
                  하위 구역{' '}
                  <strong>{selectedDivisionContext.children.length}</strong>곳
                </DrilldownMeta>
                <FocusChipGroup>
                  {(showAllSubDivisions
                    ? selectedDivisionContext.children
                    : selectedDivisionContext.children.slice(
                        0,
                        SUB_DIVISION_PREVIEW_LIMIT,
                      )
                  ).map((child) => {
                    const hasCoord =
                      child.centerLat != null && child.centerLng != null
                    return (
                      <FocusChip
                        key={child.id}
                        type="button"
                        onClick={() =>
                          selectFocusTarget({
                            kind: 'division',
                            division: child,
                          })
                        }
                      >
                        {hasCoord && <CoordDot aria-hidden />}
                        <span>{child.name}</span>
                        {child.childrenCount > 0 && (
                          <SubCountTag>{child.childrenCount}</SubCountTag>
                        )}
                      </FocusChip>
                    )
                  })}
                  {!showAllSubDivisions &&
                    selectedDivisionContext.children.length >
                      SUB_DIVISION_PREVIEW_LIMIT && (
                      <MoreChipBtn
                        type="button"
                        onClick={() => setShowAllSubDivisions(true)}
                      >
                        +
                        {selectedDivisionContext.children.length -
                          SUB_DIVISION_PREVIEW_LIMIT}
                        곳 더보기
                      </MoreChipBtn>
                    )}
                  {showAllSubDivisions &&
                    selectedDivisionContext.children.length >
                      SUB_DIVISION_PREVIEW_LIMIT && (
                      <MoreChipBtn
                        type="button"
                        onClick={() => setShowAllSubDivisions(false)}
                      >
                        접기
                      </MoreChipBtn>
                    )}
                </FocusChipGroup>
              </SubChipRow>
            )}
          </DrilldownBar>
        )}

      {/* 3. 지도 뷰포트 (구글 지도 iframe 또는 행정구역 다중 핀 지도) */}
      <MapFrameWrap>
        {effectiveMapMode === 'google' ? (
          <GoogleEmbedIframe
            key={activeEmbedSpec.embedUrl}
            title={`${country.name} - ${activeEmbedSpec.label} 구글 지도`}
            src={activeEmbedSpec.embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <PinMapCanvas>
            <GoogleMap
              markers={mapMarkers}
              selectedId={selectedDivisionId}
              onMarkerClick={handleMarkerClick}
              zoom={selectedDivisionId ? 9 : defaultCountryZoom}
            />
          </PinMapCanvas>
        )}
      </MapFrameWrap>

      {/* 4. 하단 상태 · 빠른 이동 바 */}
      <FooterBar>
        <FooterMetaText>
          {focusTarget.kind === 'division' ? (
            <>
              선택된 행정구역:{' '}
              <strong>
                {[
                  ...focusTarget.division.parentPath,
                  focusTarget.division.name,
                ].join(' › ')}
                {focusTarget.division.localName
                  ? ` (${focusTarget.division.localName})`
                  : ''}
              </strong>
              {' · '}
              {focusTarget.division.unitLabel}
              {focusTarget.division.childrenCount > 0
                ? ` · 하위 구역 ${focusTarget.division.childrenCount}곳`
                : ''}
            </>
          ) : !hasCountryCoords ? (
            <>
              국가 중심 위·경도가 아직 등록되지 않아{' '}
              <strong>{defaultCountryQuery}</strong> 검색 기준으로 구글 지도를
              표시하고 있습니다.
            </>
          ) : (
            <>
              중심 좌표{' '}
              <strong>
                {formatCoordinatePair(countryLat!, countryLng!)}
              </strong>{' '}
              기준으로 지도를 표시하고 있습니다.
            </>
          )}
        </FooterMetaText>

        <FooterActions>
          {focusTarget.kind !== 'country' && (
            <FooterGhostBtn
              type="button"
              onClick={() => selectFocusTarget({ kind: 'country' })}
            >
              국가 전체로 초기화
            </FooterGhostBtn>
          )}

          {!hasCountryCoords && onEdit && (
            <FooterGhostBtn type="button" onClick={onEdit}>
              + 중심 좌표 입력
            </FooterGhostBtn>
          )}

          {focusTarget.kind === 'division' ? (
            <FooterPrimaryBtn
              type="button"
              onClick={() => onOpenRegionsTab(focusTarget.division.id)}
            >
              「{focusTarget.division.name}」 행정구역 상세 →
            </FooterPrimaryBtn>
          ) : (
            <FooterGhostBtn
              type="button"
              onClick={() => onOpenRegionsTab()}
            >
              행정구역 탭 열기 →
            </FooterGhostBtn>
          )}
        </FooterActions>
      </FooterBar>
    </PanelRoot>
  )
}

/* ─── Styled (Hairline Ledger Aesthetic) ────────────────────────────────── */

const PanelRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
`

const SchemeStrip = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SchemeLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 4px;
`

const SchemePill = styled.button<{ $active: boolean }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border.light};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.text.primary};
  }
`

const SchemeCount = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0.78;
`

const ControlBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
`

const FocusChipGroup = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
`

const FocusChip = styled.button<{ $active?: boolean }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border.light};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  line-height: 1.3;
  cursor: pointer;
  transition:
    border-color 0.12s ease,
    background 0.12s ease,
    color 0.12s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.text.primary};
  }
`

const SubCountTag = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CoordDot = styled.span<{ $active?: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  flex-shrink: 0;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary : '#10b981'};
`

const MoreChipBtn = styled.button`
  appearance: none;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

const RightControls = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
`

const QuickSearchWrap = styled.div`
  display: inline-flex;
  align-items: center;
`

const QuickSearchInput = styled.input`
  width: 156px;
  padding: 4px 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 11.5px;
  outline: none;
  transition: border-color 0.14s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const ModeSwitchGroup = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.045)'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ModeSwitchBtn = styled.button<{ $active: boolean }>`
  appearance: none;
  padding: 4px 9px;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.tertiary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.background.primary : 'transparent'};
  box-shadow: ${({ $active }) =>
    $active ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none'};
  transition:
    color 0.14s ease,
    background 0.14s ease;

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.text.primary};
  }
`

const ExternalMapLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition:
    color 0.14s ease,
    background 0.14s ease,
    border-color 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(15,23,42,0.035)'};
  }
`

const DrilldownBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const BreadcrumbRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 12px;
`

const BreadcrumbRootBtn = styled.button`
  appearance: none;
  padding: 2px 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const BreadcrumbItemWrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const BreadcrumbSep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
`

const BreadcrumbNodeBtn = styled.button`
  appearance: none;
  padding: 2px 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const BreadcrumbCurrent = styled.span`
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
`

const SubChipRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`

const DrilldownMeta = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`

const DrilldownEmpty = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MapFrameWrap = styled.div`
  position: relative;
  width: 100%;
  height: 360px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.45)' : '#f8fafc'};

  @media (max-width: 640px) {
    height: 280px;
  }
`

const GoogleEmbedIframe = styled.iframe`
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
`

const PinMapCanvas = styled.div`
  width: 100%;
  height: 100%;
`

const FooterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const FooterMetaText = styled.span`
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const FooterActions = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
`

const FooterGhostBtn = styled.button`
  appearance: none;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const FooterPrimaryBtn = styled.button`
  appearance: none;
  padding: 5px 11px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.primary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`
