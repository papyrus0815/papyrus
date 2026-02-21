/**
 * 그래프 시각화 컴포넌트 (React Flow 기반)
 * 
 * 국가 간 관계를 노드-엣지 그래프로 시각화
 */

import React, { useMemo, useCallback } from 'react'
import styled from 'styled-components'
import type {
  EventBelligerentsGraph,
  RelationType,
} from '../types/belligerents-graph.types'
import {  FiZoomIn, FiZoomOut, FiMaximize2, FiRefreshCw } from 'react-icons/fi'

interface BelligerentsGraphVisualizationProps {
  graph: EventBelligerentsGraph
  width?: number
  height?: number
}

export const BelligerentsGraphVisualization: React.FC<
  BelligerentsGraphVisualizationProps
> = ({ graph, width = 800, height = 600 }) => {
  const [zoom, setZoom] = React.useState(1)
  const svgRef = React.useRef<SVGSVGElement>(null)
  const [draggingNodeId, setDraggingNodeId] = React.useState<string | null>(null)
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 })

  // 노드 위치 계산 (원형 배치) - 초기 위치만 계산
  const initialNodePositions = useMemo(() => {
    const { countries } = graph
    const positions: Record<string, { x: number; y: number }> = {}

    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 3

    countries.forEach((country, index) => {
      const angle = (index / countries.length) * 2 * Math.PI
      positions[country.countryId] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      }
    })

    return positions
  }, [graph.countries, width, height])

  // 실제 노드 위치 (드래그로 변경 가능)
  const [nodePositions, setNodePositions] = React.useState(initialNodePositions)

  // initialNodePositions가 변경되면 nodePositions 업데이트
  React.useEffect(() => {
    setNodePositions(initialNodePositions)
  }, [initialNodePositions])

  // SVG 좌표 변환 (줌과 뷰포트 고려)
  const getSVGPoint = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 }

    const svg = svgRef.current
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY

    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: clientX, y: clientY }

    const transformedPoint = point.matrixTransform(ctm.inverse())
    return { x: transformedPoint.x, y: transformedPoint.y }
  }

  // 마우스 다운 - 드래그 시작
  const handleMouseDown = (
    event: React.MouseEvent<SVGCircleElement>,
    countryId: string,
  ) => {
    event.preventDefault()
    event.stopPropagation()

    const svgPoint = getSVGPoint(event.clientX, event.clientY)
    const nodePos = nodePositions[countryId]

    setDraggingNodeId(countryId)
    setDragOffset({
      x: svgPoint.x - nodePos.x,
      y: svgPoint.y - nodePos.y,
    })
  }

  // 마우스 무브 - 드래그 중
  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingNodeId) return

    event.preventDefault()
    const svgPoint = getSVGPoint(event.clientX, event.clientY)

    setNodePositions((prev) => ({
      ...prev,
      [draggingNodeId]: {
        x: svgPoint.x - dragOffset.x,
        y: svgPoint.y - dragOffset.y,
      },
    }))
  }

  // 마우스 업 - 드래그 종료
  const handleMouseUp = () => {
    setDraggingNodeId(null)
    setDragOffset({ x: 0, y: 0 })
  }

  // 관계 색상
  const getRelationColor = (type: RelationType): string => {
    const colors: Record<RelationType, string> = {
      allied: '#3b82f6',
      cooperation: '#8b5cf6',
      'non-aggression': '#94a3b8',
      neutral: '#cbd5e1',
      enemy: '#ef4444',
      puppet: '#f59e0b',
      occupied: '#dc2626',
    }
    return colors[type]
  }

  // 관계 스타일 (점선/실선)
  const getRelationStroke = (type: RelationType): string => {
    if (type === 'non-aggression' || type === 'neutral') {
      return '4,4' // 점선
    }
    return '' // 실선
  }

  // 줌 인/아웃
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 3))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5))
  const handleResetZoom = () => setZoom(1)

  // 위치 리셋
  const handleResetPositions = () => {
    setNodePositions(initialNodePositions)
  }

  return (
    <Container>
      <Controls>
        <ControlButton onClick={handleZoomIn} title="확대">
          <FiZoomIn size={16} />
        </ControlButton>
        <ControlButton onClick={handleZoomOut} title="축소">
          <FiZoomOut size={16} />
        </ControlButton>
        <ControlButton onClick={handleResetZoom} title="원래 크기">
          <FiMaximize2 size={16} />
        </ControlButton>
        <ControlButton onClick={handleResetPositions} title="위치 초기화">
          <FiRefreshCw size={16} />
        </ControlButton>
        <ZoomLabel>{Math.round(zoom * 100)}%</ZoomLabel>
      </Controls>

      {/* 범례 (상단으로 이동) */}
      <Legend>
        <LegendTitle>관계 타입</LegendTitle>
        <LegendItems>
          {(
            [
              'allied',
              'cooperation',
              'non-aggression',
              'neutral',
              'enemy',
              'puppet',
              'occupied',
            ] as RelationType[]
          ).map((type) => (
            <LegendItem key={type}>
              <LegendColor $color={getRelationColor(type)} />
              <LegendLabel>{getRelationLabel(type)}</LegendLabel>
            </LegendItem>
          ))}
        </LegendItems>
      </Legend>

      <SVGContainer $isDragging={!!draggingNodeId}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            {/* 화살표 마커 */}
            {(['allied', 'enemy', 'cooperation'] as RelationType[]).map((type) => (
              <marker
                key={type}
                id={`arrow-${type}`}
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L0,6 L9,3 z" fill={getRelationColor(type)} />
              </marker>
            ))}
          </defs>

          {/* 관계 (엣지) */}
          <g className="edges">
            {graph.relations.map((rel) => {
              const from = nodePositions[rel.fromCountry]
              const to = nodePositions[rel.toCountry]

              if (!from || !to) return null

              return (
                <g key={rel.id}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={getRelationColor(rel.relationType)}
                    strokeWidth={Math.abs(rel.strength) / 25 + 1}
                    strokeDasharray={getRelationStroke(rel.relationType)}
                    markerEnd={`url(#arrow-${rel.relationType})`}
                    opacity={0.7}
                  />
                  {rel.description && (
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2}
                      fontSize="10"
                      fill="#64748b"
                      textAnchor="middle"
                    >
                      {rel.description}
                    </text>
                  )}
                </g>
              )
            })}
          </g>

          {/* 국가 (노드) */}
          <g className="nodes">
            {graph.countries.map((country) => {
              const pos = nodePositions[country.countryId]
              if (!pos) return null

              const isDragging = draggingNodeId === country.countryId

              // 국기 이미지 또는 썸네일 URL
              const flagUrl = country.thumbnailUrl

              return (
                <g key={country.countryId}>
                  {/* 배경 원 */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={35}
                    fill={isDragging ? '#4f46e5' : '#6366f1'}
                    stroke="white"
                    strokeWidth="3"
                    style={{
                      cursor: isDragging ? 'grabbing' : 'grab',
                      opacity: isDragging ? 0.8 : 1,
                    }}
                    onMouseDown={(event) => handleMouseDown(event, country.countryId)}
                  />
                  
                  {/* 국기 이미지가 있는 경우 */}
                  {flagUrl ? (
                    <>
                      {/* 클리핑을 위한 원형 마스크 정의 */}
                      <defs>
                        <clipPath id={`clip-${country.countryId}`}>
                          <circle cx={pos.x} cy={pos.y} r={28} />
                        </clipPath>
                      </defs>
                      {/* 국기 이미지 */}
                      <image
                        x={pos.x - 28}
                        y={pos.y - 28}
                        width={56}
                        height={56}
                        href={flagUrl}
                        clipPath={`url(#clip-${country.countryId})`}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                        preserveAspectRatio="xMidYMid slice"
                        onError={(e) => {
                          // 이미지 로드 실패 시 숨김
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </>
                  ) : (
                    /* 국기 이미지가 없는 경우: 이모지 또는 국가명 */
                    <text
                      x={pos.x}
                      y={pos.y + 5}
                      fontSize="28"
                      fill="white"
                      fontWeight="700"
                      textAnchor="middle"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {country.flagEmoji || country.countryName.substring(0, 2)}
                    </text>
                  )}
                  
                  {/* 국가명 텍스트 */}
                  <text
                    x={pos.x}
                    y={pos.y + 55}
                    fontSize="13"
                    fill="#1e293b"
                    fontWeight="600"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {country.countryName}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </SVGContainer>
    </Container>
  )
}

function getRelationLabel(type: RelationType): string {
  const labels: Record<RelationType, string> = {
    allied: '동맹',
    cooperation: '협력',
    'non-aggression': '불가침',
    neutral: '중립',
    enemy: '적대',
    puppet: '괴뢰',
    occupied: '점령',
  }
  return labels[type]
}

// ============================================
// 스타일 컴포넌트
// ============================================

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: white;
  border: 1.5px solid rgba(99, 102, 241, 0.12);
  border-radius: 12px;
`

const Controls = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

const ControlButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #f8fafc;
  border: 1.5px solid rgba(99, 102, 241, 0.12);
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    border-color: #6366f1;
    color: #6366f1;
  }
`

const ZoomLabel = styled.span`
  margin-left: auto;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
`

const SVGContainer = styled.div<{ $isDragging?: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background: #f8fafc;
  border-radius: 10px;
  border: 1.5px solid rgba(99, 102, 241, 0.08);
  cursor: ${(props) => (props.$isDragging ? 'grabbing' : 'default')};
  user-select: none;
  min-height: 500px;
`

const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1.5px solid rgba(99, 102, 241, 0.12);
`

const LegendTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  padding-right: 8px;
  border-right: 1.5px solid rgba(99, 102, 241, 0.12);
`

const LegendItems = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  flex: 1;
`

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const LegendColor = styled.div<{ $color: string }>`
  width: 20px;
  height: 3px;
  background: ${(props) => props.$color};
  border-radius: 2px;
`

const LegendLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
`

