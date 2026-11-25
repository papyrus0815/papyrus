import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiCheck,
  FiEdit2,
  FiLayers,
  FiMap,
  FiRotateCcw,
  FiSearch,
  FiTrash2,
} from 'react-icons/fi'
import styled from 'styled-components'

import { cityApi } from '@/shared/api/city'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'

import type {
  GarrisonMapPoint,
  JurisdictionGeometry,
  JurisdictionGeometryType,
} from './jurisdiction-map.types'

const LazyJurisdictionLeafletCanvas = lazy(
  () => import('./jurisdiction-leaflet-canvas'),
)

export interface JurisdictionMapFieldProps {
  value: JurisdictionGeometry | null
  onChange: (next: JurisdictionGeometry | null) => void
  garrisonPoint?: GarrisonMapPoint | null
  accentColor?: string
  countryName?: string | null
}

export const JurisdictionMapField: React.FC<JurisdictionMapFieldProps> = ({
  value,
  onChange,
  garrisonPoint,
  accentColor = '#2563eb',
  countryName,
}) => {
  const hasValidSavedGeometry = Boolean(
    value &&
      ((value.type === 'POLYGON' && value.coordinates.length >= 3) ||
        (value.type === 'LINE' && value.coordinates.length >= 2)),
  )

  const [editing, setEditing] = useState(false)
  const [draftType, setDraftType] = useState<JurisdictionGeometryType>(
    value?.type ?? 'POLYGON',
  )
  const [draftCoords, setDraftCoords] = useState<Array<[number, number]>>(
    value?.coordinates ?? [],
  )
  const [mapLayer, setMapLayer] = useState<'roadmap' | 'hybrid'>('roadmap')
  const [searchText, setSearchText] = useState('')
  const [flyTarget, setFlyTarget] = useState<{
    lat: number
    lng: number
    token: number
  } | null>(null)

  useEffect(() => {
    if (!editing) {
      setDraftType(value?.type ?? 'POLYGON')
      setDraftCoords(value?.coordinates ?? [])
    }
  }, [value, editing])

  const debouncedQuery = useDebouncedValue(searchText.trim(), 280)
  const placeSearchQuery = useQuery({
    queryKey: ['jurisdiction-place-search', debouncedQuery],
    queryFn: () =>
      cityApi.searchPlaces(debouncedQuery, undefined, { anyPlace: true }),
    enabled: editing && debouncedQuery.length >= 2,
    staleTime: 5 * 60_000,
  })

  const suggestions = useMemo(
    () => (placeSearchQuery.data ?? []).slice(0, 5),
    [placeSearchQuery.data],
  )

  const minPoints = draftType === 'POLYGON' ? 3 : 2
  const canCommitDraft = draftCoords.length >= minPoints

  const commitIfValid = (
    nextType: JurisdictionGeometryType,
    nextCoords: Array<[number, number]>,
  ) => {
    const reqPts = nextType === 'POLYGON' ? 3 : 2
    if (nextCoords.length >= reqPts) {
      onChange({
        type: nextType,
        coordinates: nextCoords,
        color: accentColor,
      })
    } else if (nextCoords.length === 0) {
      onChange(null)
    }
  }

  const handleStartEdit = () => {
    setDraftType(value?.type ?? 'POLYGON')
    setDraftCoords(value?.coordinates ?? [])
    setEditing(true)
    if (!value && !garrisonPoint && countryName) {
      setSearchText(countryName)
    }
  }

  const handleAddVertex = (pt: [number, number]) => {
    const next = [...draftCoords, pt]
    setDraftCoords(next)
    commitIfValid(draftType, next)
  }

  const handleMoveVertex = (idx: number, pt: [number, number]) => {
    const next = draftCoords.map((item, i) => (i === idx ? pt : item))
    setDraftCoords(next)
    commitIfValid(draftType, next)
  }

  const handleRemoveVertex = (idx: number) => {
    const next = draftCoords.filter((_, i) => i !== idx)
    setDraftCoords(next)
    commitIfValid(draftType, next)
  }

  const handleUndo = () => {
    if (draftCoords.length === 0) return
    const next = draftCoords.slice(0, -1)
    setDraftCoords(next)
    commitIfValid(draftType, next)
  }

  const handleClear = () => {
    setDraftCoords([])
    onChange(null)
  }

  const handleSwitchType = (nextType: JurisdictionGeometryType) => {
    setDraftType(nextType)
    commitIfValid(nextType, draftCoords)
  }

  const handleFinishEdit = () => {
    if (draftCoords.length > 0 && !canCommitDraft) {
      // 점 개수가 부족한 채 닫으면 미완성 좌표를 정리한다
      setDraftCoords(value?.coordinates ?? [])
    }
    setEditing(false)
  }

  return (
    <Container>
      <TopControlBar>
        <StatusSide>
          <MapBadge $active={hasValidSavedGeometry || editing}>
            <FiMap size={12} />
          </MapBadge>
          {hasValidSavedGeometry && value ? (
            <StatusLabel>
              <strong>
                {value.type === 'POLYGON' ? '관할·작전 다각형' : '담당 전선·방어선'}
              </strong>{' '}
              · 지점 {value.coordinates.length}개 지정됨
            </StatusLabel>
          ) : editing ? (
            <StatusLabel>
              지도를 클릭해{' '}
              {draftType === 'POLYGON'
                ? `관할 구역 꼭짓점을 ${minPoints}개 이상 찍어 주세요 (현재 ${draftCoords.length}개)`
                : `담당 전선 지점을 ${minPoints}개 이상 찍어 주세요 (현재 ${draftCoords.length}개)`}
            </StatusLabel>
          ) : (
            <StatusLabel $muted>
              관할·작전구역 지도를 지정하면 위수지역·전선 지도가 함께 표시됩니다
            </StatusLabel>
          )}
        </StatusSide>

        <ButtonRow>
          {(hasValidSavedGeometry || editing) && (
            <LayerSwitch role="group" aria-label="관할 지도 레이어">
              <LayerBtn
                type="button"
                $active={mapLayer === 'roadmap'}
                onClick={() => setMapLayer('roadmap')}
              >
                일반
              </LayerBtn>
              <LayerBtn
                type="button"
                $active={mapLayer === 'hybrid'}
                onClick={() => setMapLayer('hybrid')}
              >
                <FiLayers size={10} /> 위성
              </LayerBtn>
            </LayerSwitch>
          )}

          {editing ? (
            <PrimaryTriggerBtn
              type="button"
              $accent={accentColor}
              onClick={handleFinishEdit}
            >
              <FiCheck size={12} />
              <span>{canCommitDraft ? '구역 확정' : '그리기 닫기'}</span>
            </PrimaryTriggerBtn>
          ) : (
            <ActionBtn type="button" onClick={handleStartEdit}>
              <FiEdit2 size={11.5} />
              <span>
                {hasValidSavedGeometry
                  ? '관할 구역 수정'
                  : '지도에 관할·작전구역 그리기'}
              </span>
            </ActionBtn>
          )}

          {hasValidSavedGeometry && !editing ? (
            <DangerIconBtn
              type="button"
              title="지정된 관할 지도 도형 지우기"
              aria-label="관할 지도 도형 지우기"
              onClick={handleClear}
            >
              <FiTrash2 size={12} />
            </DangerIconBtn>
          ) : null}
        </ButtonRow>
      </TopControlBar>

      {editing ? (
        <DrawToolbar>
          <TypeSwitch role="group" aria-label="관할 도형 종류">
            <TypeBtn
              type="button"
              $active={draftType === 'POLYGON'}
              onClick={() => handleSwitchType('POLYGON')}
            >
              다각형 구역 (군관구 · 위수지역 · 해역)
            </TypeBtn>
            <TypeBtn
              type="button"
              $active={draftType === 'LINE'}
              onClick={() => handleSwitchType('LINE')}
            >
              전선 · 선형 구역 (담당 정면 · 방어선)
            </TypeBtn>
          </TypeSwitch>

          <SearchJumpWrap>
            <SearchInputBox>
              <FiSearch size={12} />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="지역·도시·해역 이동 검색…"
                aria-label="관할 지도 위치 검색"
              />
            </SearchInputBox>
            {suggestions.length > 0 && searchText.trim().length >= 2 ? (
              <JumpResultRow>
                {suggestions.map((placeItem) => (
                  <JumpChip
                    key={placeItem.placeId}
                    type="button"
                    onClick={() => {
                      if (
                        typeof placeItem.lat === 'number' &&
                        typeof placeItem.lng === 'number'
                      ) {
                        setFlyTarget({
                          lat: placeItem.lat,
                          lng: placeItem.lng,
                          token: Date.now(),
                        })
                        setSearchText('')
                      }
                    }}
                  >
                    {placeItem.shortName}
                  </JumpChip>
                ))}
              </JumpResultRow>
            ) : null}
          </SearchJumpWrap>

          <EditQuickActions>
            <SmallBtn
              type="button"
              disabled={draftCoords.length === 0}
              onClick={handleUndo}
            >
              <FiRotateCcw size={11} /> 되돌리기
            </SmallBtn>
            <SmallBtn
              type="button"
              disabled={draftCoords.length === 0}
              onClick={handleClear}
            >
              초기화
            </SmallBtn>
          </EditQuickActions>
        </DrawToolbar>
      ) : null}

      {editing || hasValidSavedGeometry ? (
        <CanvasShell>
          <Suspense
            fallback={<MapFallback>관할·작전구역 지도를 불러오는 중…</MapFallback>}
          >
            <LazyJurisdictionLeafletCanvas
              mode={editing ? 'edit' : 'view'}
              geometryType={editing ? draftType : (value?.type ?? 'POLYGON')}
              coordinates={editing ? draftCoords : (value?.coordinates ?? [])}
              accentColor={value?.color || accentColor}
              mapLayer={mapLayer}
              garrisonPoint={garrisonPoint}
              flyTarget={flyTarget}
              height={editing ? 280 : 210}
              onAddVertex={handleAddVertex}
              onMoveVertex={handleMoveVertex}
              onRemoveVertex={handleRemoveVertex}
            />
          </Suspense>
        </CanvasShell>
      ) : null}
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(15, 23, 42, 0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc'};
  overflow: hidden;
`

const TopControlBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 10px;
  padding: 8px 11px;
`

const StatusSide = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
`

const MapBadge = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  flex-shrink: 0;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.tertiary};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.1)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(15, 23, 42, 0.05)'};
`

const StatusLabel = styled.span<{ $muted?: boolean }>`
  font-size: 12px;
  line-height: 1.4;
  color: ${({ $muted, theme }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.secondary};
  strong {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ButtonRow = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: auto;
`

const ActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 27px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.14)' : '#cbd5e1'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.14s ease, color 0.14s ease;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const PrimaryTriggerBtn = styled.button<{ $accent: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 27px;
  padding: 0 11px;
  border-radius: 7px;
  border: none;
  background: ${({ $accent }) => $accent};
  color: #ffffff;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
`

const DangerIconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 27px;
  border-radius: 7px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  &:hover {
    color: #dc2626;
    border-color: rgba(220, 38, 38, 0.4);
  }
`

const LayerSwitch = styled.div`
  display: inline-flex;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'};
`

const LayerBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 21px;
  padding: 0 7px;
  border: none;
  border-radius: 4px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.25)'
        : 'rgba(99, 102, 241, 0.12)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
`

const DrawToolbar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 8px 11px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.18)' : '#ffffff'};
`

const TypeSwitch = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const TypeBtn = styled.button<{ $active: boolean }>`
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.colors.primary
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.14)'
          : '#cbd5e1'};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.09)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
`

const SearchJumpWrap = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const SearchInputBox = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 9px;
  border-radius: 7px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.14)' : '#cbd5e1'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  min-width: 210px;
  flex: 1;
  input {
    border: none;
    outline: none;
    background: transparent;
    color: ${({ theme }) => theme.colors.text.primary};
    font: inherit;
    font-size: 12px;
    width: 100%;
  }
`

const JumpResultRow = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
`

const JumpChip = styled.button`
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const EditQuickActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const SmallBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

const CanvasShell = styled.div`
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.08)'};
`

const MapFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 210px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
