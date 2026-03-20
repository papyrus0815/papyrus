import { useEffect, useState } from 'react'

import { mockGovernmentData } from '../mock'
import type {
  Agency,
  ConstitutionalBody,
  LocalGovernment,
  Ministry,
} from '../mock/types'

type OrgFilter = 'all' | 'ministries' | 'constitutional' | 'agencies' | 'local'
type SelectedOrg = {
  type: 'ministry' | 'constitutional' | 'agency' | 'local'
  id: string
} | null

/**
 * 정부 행정조직 섹션 위젯
 */
export function GovernmentInfoSection() {
  const [filter, setFilter] = useState<OrgFilter>('all')
  const [selectedOrg, setSelectedOrg] = useState<SelectedOrg>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [imageIndex, setImageIndex] = useState(0)

  // 선택된 조직이 변경될 때 이미지 인덱스 초기화
  useEffect(() => {
    setImageIndex(0)
  }, [selectedOrg])

  // 필터링된 데이터
  const filteredMinistriesData =
    filter === 'all' || filter === 'ministries'
      ? mockGovernmentData.ministries.filter((ministry) =>
          ministry.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : []

  const filteredConstitutionalData =
    filter === 'all' || filter === 'constitutional'
      ? mockGovernmentData.constitutionalBodies.filter((body) =>
          body.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : []

  const filteredAgenciesData =
    filter === 'all' || filter === 'agencies'
      ? mockGovernmentData.agencies.filter((agency) =>
          agency.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : []

  const filteredLocalData =
    filter === 'all' || filter === 'local'
      ? mockGovernmentData.localGovernments.filter((local) =>
          local.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : []

  // 선택된 조직 데이터 가져오기
  const selectedOrgData:
    | Ministry
    | ConstitutionalBody
    | Agency
    | LocalGovernment
    | null = selectedOrg
    ? selectedOrg.type === 'ministry'
      ? mockGovernmentData.ministries.find(
          (ministry) => ministry.id === selectedOrg.id,
        ) || null
      : selectedOrg.type === 'constitutional'
        ? mockGovernmentData.constitutionalBodies.find(
            (body) => body.id === selectedOrg.id,
          ) || null
        : selectedOrg.type === 'agency'
          ? mockGovernmentData.agencies.find(
              (agency) => agency.id === selectedOrg.id,
            ) || null
          : mockGovernmentData.localGovernments.find(
              (local) => local.id === selectedOrg.id,
            ) || null
    : null

  return (
    <div
      style={{
        display: 'flex',
        gap: '20px',
        height: 'calc(100vh - 200px)',
        minHeight: '600px',
      }}
    >
      {/* 왼쪽: 검색 + 필터 + 리스트 (30%) */}
      <div
        style={{
          width: selectedOrg ? '30%' : '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          transition: 'width 0.3s ease',
        }}
      >
        {/* 검색창 */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="조직명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: '#0f172a',
            }}
          />
        </div>

        {/* 필터 버튼 */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            {
              key: 'all',
              label: '전체',
              count:
                mockGovernmentData.ministries.length +
                mockGovernmentData.constitutionalBodies.length +
                mockGovernmentData.agencies.length +
                mockGovernmentData.localGovernments.length,
            },
            {
              key: 'ministries',
              label: '중앙부처',
              count: mockGovernmentData.ministries.length,
            },
            {
              key: 'constitutional',
              label: '헌법기관',
              count: mockGovernmentData.constitutionalBodies.length,
            },
            {
              key: 'agencies',
              label: '산하기관',
              count: mockGovernmentData.agencies.length,
            },
            {
              key: 'local',
              label: '지방정부',
              count: mockGovernmentData.localGovernments.length,
            },
          ].map((filterItem) => (
            <button
              key={filterItem.key}
              onClick={() => setFilter(filterItem.key as OrgFilter)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border:
                  filter === filterItem.key
                    ? '1px solid #8b5cf6'
                    : '1px solid #e2e8f0',
                background:
                  filter === filterItem.key
                    ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
                    : '#ffffff',
                color: filter === filterItem.key ? '#8b5cf6' : '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                if (filter !== filterItem.key) {
                  e.currentTarget.style.borderColor = '#cbd5e1'
                  e.currentTarget.style.background = '#f8fafc'
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== filterItem.key) {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.background = '#ffffff'
                }
              }}
            >
              {filterItem.label}
              <span
                style={{
                  fontSize: '11px',
                  background: filter === filterItem.key ? '#8b5cf6' : '#e2e8f0',
                  color: filter === filterItem.key ? '#ffffff' : '#64748b',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 700,
                }}
              >
                {filterItem.count}
              </span>
            </button>
          ))}
        </div>

        {/* 조직 리스트 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* 중앙부처 */}
          {filteredMinistriesData.map((ministry) => (
            <div
              key={ministry.id}
              onClick={() =>
                setSelectedOrg({ type: 'ministry', id: ministry.id })
              }
              style={{
                padding: '14px',
                background:
                  selectedOrg?.id === ministry.id
                    ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
                    : '#ffffff',
                border:
                  selectedOrg?.id === ministry.id
                    ? '2px solid #8b5cf6'
                    : '1px solid #e2e8f0',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (selectedOrg?.id !== ministry.id) {
                  e.currentTarget.style.borderColor = '#cbd5e1'
                  e.currentTarget.style.background = '#f8fafc'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedOrg?.id !== ministry.id) {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.background = '#ffffff'
                }
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                  >
                    <path d="M3 21h18M4 18h16M6 18V9m12 9V9M8 6l4-3 4 3M8 18V6h8v12" />
                  </svg>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    {ministry.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#8b5cf6',
                    background: '#f5f3ff',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  부처
                </span>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  marginLeft: '24px',
                }}
              >
                {ministry.minister} 장관
              </div>
            </div>
          ))}

          {/* 헌법기관 */}
          {filteredConstitutionalData.map((body) => (
            <div
              key={body.id}
              onClick={() =>
                setSelectedOrg({ type: 'constitutional', id: body.id })
              }
              style={{
                padding: '14px',
                background:
                  selectedOrg?.id === body.id
                    ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
                    : '#ffffff',
                border:
                  selectedOrg?.id === body.id
                    ? '2px solid #8b5cf6'
                    : '1px solid #e2e8f0',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (selectedOrg?.id !== body.id) {
                  e.currentTarget.style.borderColor = '#cbd5e1'
                  e.currentTarget.style.background = '#f8fafc'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedOrg?.id !== body.id) {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.background = '#ffffff'
                }
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                  >
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    {body.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#8b5cf6',
                    background: '#f5f3ff',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  헌법기관
                </span>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  marginLeft: '24px',
                }}
              >
                {body.head}
              </div>
            </div>
          ))}

          {/* 산하기관 */}
          {filteredAgenciesData.map((agency) => (
            <div
              key={agency.id}
              onClick={() => setSelectedOrg({ type: 'agency', id: agency.id })}
              style={{
                padding: '14px',
                background:
                  selectedOrg?.id === agency.id
                    ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
                    : '#ffffff',
                border:
                  selectedOrg?.id === agency.id
                    ? '2px solid #8b5cf6'
                    : '1px solid #e2e8f0',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (selectedOrg?.id !== agency.id) {
                  e.currentTarget.style.borderColor = '#cbd5e1'
                  e.currentTarget.style.background = '#f8fafc'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedOrg?.id !== agency.id) {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.background = '#ffffff'
                }
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    {agency.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#8b5cf6',
                    background: '#f5f3ff',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  산하기관
                </span>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  marginLeft: '24px',
                }}
              >
                {agency.parent} 소속
              </div>
            </div>
          ))}

          {/* 지방정부 */}
          {filteredLocalData.map((local) => (
            <div
              key={local.id}
              onClick={() => setSelectedOrg({ type: 'local', id: local.id })}
              style={{
                padding: '14px',
                background:
                  selectedOrg?.id === local.id
                    ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
                    : '#ffffff',
                border:
                  selectedOrg?.id === local.id
                    ? '2px solid #8b5cf6'
                    : '1px solid #e2e8f0',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (selectedOrg?.id !== local.id) {
                  e.currentTarget.style.borderColor = '#cbd5e1'
                  e.currentTarget.style.background = '#f8fafc'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedOrg?.id !== local.id) {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.background = '#ffffff'
                }
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    {local.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#8b5cf6',
                    background: '#f5f3ff',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {local.type}
                </span>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  marginLeft: '24px',
                }}
              >
                {local.head}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽: 상세 정보 (70%) */}
      {selectedOrg && selectedOrgData && (
        <div
          style={{
            width: '70%',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '32px',
            overflowY: 'auto',
          }}
        >
          <OrganizationDetail
            data={selectedOrgData}
            type={selectedOrg.type}
            imageIndex={imageIndex}
            setImageIndex={setImageIndex}
            onClose={() => setSelectedOrg(null)}
          />
        </div>
      )}
    </div>
  )
}

// 상세 정보 컴포넌트
function OrganizationDetail({
  data,
  type,
  imageIndex,
  setImageIndex,
  onClose,
}: {
  data: Ministry | ConstitutionalBody | Agency | LocalGovernment
  type: 'ministry' | 'constitutional' | 'agency' | 'local'
  imageIndex: number
  setImageIndex: (index: number) => void
  onClose: () => void
}) {
  return (
    <div>
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f8fafc'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ffffff'
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* 헤더 */}
      <div style={{ marginBottom: '32px' }}>
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: '8px',
          }}
        >
          {data.name}
        </h2>
        <p
          style={{
            fontSize: '16px',
            color: '#8b5cf6',
            margin: '0 0 16px',
            fontWeight: 600,
          }}
        >
          {(data as any).nameEn}
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {'minister' in data && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                color: '#64748b',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{data.minister} 장관</span>
            </div>
          )}
          {'head' in data && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                color: '#64748b',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{data.head}</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              color: '#64748b',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{(data as any).established} 설립</span>
          </div>
        </div>
      </div>

      {/* 이미지 갤러리 */}
      {(data as any).images && (data as any).images.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          {/* 메인 이미지 */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '320px',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <img
              src={(data as any).images[imageIndex]}
              alt={data.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {(data as any).images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setImageIndex(
                      (imageIndex - 1 + (data as any).images.length) %
                        (data as any).images.length,
                    )
                  }
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.95)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#8b5cf6'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.95)'
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={() =>
                    setImageIndex(
                      (imageIndex + 1) % (data as any).images.length,
                    )
                  }
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.95)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#8b5cf6'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.95)'
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </>
            )}
          </div>
          {/* 썸네일 */}
          {(data as any).images.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
              {(data as any).images.map((img: string, idx: number) => (
                <div
                  key={idx}
                  onClick={() => setImageIndex(idx)}
                  style={{
                    minWidth: '80px',
                    height: '60px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border:
                      imageIndex === idx
                        ? '2px solid #8b5cf6'
                        : '2px solid transparent',
                    opacity: imageIndex === idx ? 1 : 0.6,
                    transition: 'all 0.2s',
                  }}
                >
                  <img
                    src={img}
                    alt={`썸네일 ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 주요 사건 타임라인 */}
      {(data as any).events && (data as any).events.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            주요 사건
          </h3>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {(data as any).events.map((event: any, idx: number) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '16px',
                  background: getEventColor(event.type),
                  borderRadius: '10px',
                  border: `1px solid ${getEventBorderColor(event.type)}`,
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    background: getEventIconBackground(event.type),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)',
                  }}
                >
                  {getEventIcon(event.type)}
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#ffffff',
                      marginTop: '4px',
                    }}
                  >
                    {event.year}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <h4
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: '6px',
                    }}
                  >
                    {event.title}
                  </h4>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#475569',
                      lineHeight: '1.6',
                      margin: 0,
                    }}
                  >
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 연혁 타임라인 */}
      {(data as any).timeline && (data as any).timeline.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2"
            >
              <line x1="12" y1="2" x2="12" y2="22" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            주요 연혁
          </h3>
          <div style={{ position: 'relative', paddingLeft: '32px' }}>
            {/* 타임라인 라인 */}
            <div
              style={{
                position: 'absolute',
                left: '7px',
                top: '0',
                bottom: '0',
                width: '2px',
                background: 'linear-gradient(180deg, #8b5cf6 0%, #c084fc 100%)',
              }}
            />
            {(data as any).timeline.map((item: any, idx: number) => (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  marginBottom: '20px',
                  paddingBottom: '20px',
                  borderBottom:
                    idx < (data as any).timeline.length - 1
                      ? '1px solid #f1f5f9'
                      : 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '-28px',
                    top: '2px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#8b5cf6',
                    boxShadow: '0 0 0 4px rgba(139, 92, 246, 0.2)',
                  }}
                />
                <div
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    background:
                      'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                    borderRadius: '6px',
                    marginBottom: '8px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#8b5cf6',
                    }}
                  >
                    {item.year}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#334155',
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {item.event}
                </p>
                {item.impact && (
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#64748b',
                      marginTop: '4px',
                      marginLeft: '12px',
                    }}
                  >
                    → {item.impact}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 통계 그래프 */}
      {(data as any).statistics && (data as any).statistics.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            연도별 통계
          </h3>
          <div
            style={{
              background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e5e5',
            }}
          >
            {/* 예산 그래프 */}
            {(data as any).statistics[0].budget !== undefined && (
              <div style={{ marginBottom: '32px' }}>
                <h4
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '16px',
                  }}
                >
                  예산 규모 (조원)
                </h4>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '12px',
                    height: '200px',
                  }}
                >
                  {(data as any).statistics.map((stat: any, idx: number) => {
                    const maxBudget = Math.max(
                      ...(data as any).statistics.map((s: any) => s.budget),
                    )
                    const height = (stat.budget / maxBudget) * 180
                    return (
                      <div
                        key={idx}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: `${height}px`,
                            background:
                              'linear-gradient(180deg, #8b5cf6 0%, #a78bfa 100%)',
                            borderRadius: '8px 8px 0 0',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            padding: '8px',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 700,
                            boxShadow: '0 -2px 8px rgba(139, 92, 246, 0.3)',
                            transition: 'all 0.3s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                          }}
                        >
                          {stat.budget}
                        </div>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#64748b',
                          }}
                        >
                          {stat.year}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 인원 그래프 */}
            {(data as any).statistics[0].employees !== undefined && (
              <div style={{ marginBottom: '32px' }}>
                <h4
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '16px',
                  }}
                >
                  소속 인원 (명)
                </h4>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '12px',
                    height: '200px',
                  }}
                >
                  {(data as any).statistics.map((stat: any, idx: number) => {
                    const maxEmployees = Math.max(
                      ...(data as any).statistics.map((s: any) => s.employees),
                    )
                    const height = (stat.employees / maxEmployees) * 180
                    return (
                      <div
                        key={idx}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: `${height}px`,
                            background:
                              'linear-gradient(180deg, #10b981 0%, #34d399 100%)',
                            borderRadius: '8px 8px 0 0',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            padding: '8px',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 700,
                            boxShadow: '0 -2px 8px rgba(16, 185, 129, 0.3)',
                            transition: 'all 0.3s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                          }}
                        >
                          {stat.employees.toLocaleString()}
                        </div>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#64748b',
                          }}
                        >
                          {stat.year}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 프로젝트 수 그래프 */}
            {(data as any).statistics[0].projects !== undefined && (
              <div>
                <h4
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '16px',
                  }}
                >
                  추진 프로젝트 수 (개)
                </h4>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '12px',
                    height: '200px',
                  }}
                >
                  {(data as any).statistics.map((stat: any, idx: number) => {
                    const maxProjects = Math.max(
                      ...(data as any).statistics.map((s: any) => s.projects),
                    )
                    const height = (stat.projects / maxProjects) * 180
                    return (
                      <div
                        key={idx}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: `${height}px`,
                            background:
                              'linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%)',
                            borderRadius: '8px 8px 0 0',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            padding: '8px',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 700,
                            boxShadow: '0 -2px 8px rgba(59, 130, 246, 0.3)',
                            transition: 'all 0.3s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                          }}
                        >
                          {stat.projects}
                        </div>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#64748b',
                          }}
                        >
                          {stat.year}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 역사 */}
      {(data as any).history && (
        <div style={{ marginBottom: '32px' }}>
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            역사
          </h3>
          <div
            style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
              borderRadius: '12px',
              fontSize: '15px',
              color: '#475569',
              lineHeight: '1.8',
              border: '1px solid #e5e5e5',
            }}
          >
            {(data as any).history}
          </div>
        </div>
      )}

      {/* 나머지 기본 정보들 */}
      <BasicInfo data={data} type={type} />
    </div>
  )
}

// 기본 정보 컴포넌트
function BasicInfo({
  data,
  type,
}: {
  data: Ministry | ConstitutionalBody | Agency | LocalGovernment
  type: 'ministry' | 'constitutional' | 'agency' | 'local'
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 기본 정보 카드 */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <h4
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: '16px',
          }}
        >
          기본 정보
        </h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
          }}
        >
          {'employees' in data && (
            <InfoItem label="소속 인원" value={data.employees} />
          )}
          {'budget' in data && (
            <InfoItem label="예산 규모" value={data.budget} />
          )}
          {'members' in data && (
            <InfoItem label="구성원" value={data.members} />
          )}
          {'population' in data && (
            <InfoItem label="인구" value={data.population} />
          )}
          {'districts' in data && (
            <InfoItem label="자치구/시군" value={`${data.districts}개`} />
          )}
        </div>
      </div>

      {/* 주요 책무/역할 */}
      {'responsibilities' in data && data.responsibilities && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <h4
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '16px',
            }}
          >
            주요 책무
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {data.responsibilities.map((resp: string, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '10px 16px',
                  background:
                    'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                  border: '1px solid #e9d5ff',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#7c3aed',
                  fontWeight: 600,
                }}
              >
                {resp}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 하부 조직/위원회 */}
      {'departments' in data &&
        data.departments &&
        data.departments.length > 0 && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <h4
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '16px',
              }}
            >
              {'committees' in data ? '위원회' : '하부 조직'}
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}
            >
              {data.departments.map((dept: string, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    background:
                      'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#334155',
                    fontWeight: 600,
                    border: '1px solid #e5e5e5',
                  }}
                >
                  • {dept}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* 산하기관 */}
      {'agencies' in data && data.agencies && data.agencies.length > 0 && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <h4
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '16px',
            }}
          >
            산하기관
          </h4>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {data.agencies.map((agency: string, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  background:
                    'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#334155',
                  fontWeight: 600,
                  border: '1px solid #e5e5e5',
                }}
              >
                • {agency}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 주요 프로젝트 */}
      {'mainProjects' in data &&
        data.mainProjects &&
        data.mainProjects.length > 0 && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <h4
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '16px',
              }}
            >
              주요 프로젝트
            </h4>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              {data.mainProjects.map((project: string, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    background:
                      'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#334155',
                    fontWeight: 600,
                    border: '1px solid #e5e5e5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#8b5cf6',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>
                  {project}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* 주요 결정 */}
      {'keyDecisions' in data &&
        data.keyDecisions &&
        data.keyDecisions.length > 0 && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <h4
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '16px',
              }}
            >
              주요 결정
            </h4>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              {data.keyDecisions.map((decision: string, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    background:
                      'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#334155',
                    fontWeight: 600,
                    border: '1px solid #e5e5e5',
                  }}
                >
                  • {decision}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* 서비스 */}
      {'services' in data && data.services && data.services.length > 0 && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <h4
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '16px',
            }}
          >
            주요 서비스
          </h4>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {data.services.map((service: string, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  background:
                    'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#334155',
                  fontWeight: 600,
                  border: '1px solid #e5e5e5',
                }}
              >
                • {service}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 추가 정보 (위치, 웹사이트) */}
      {((data as any).location || (data as any).website) && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <h4
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '16px',
            }}
          >
            추가 정보
          </h4>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {(data as any).location && (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span style={{ fontSize: '14px', color: '#475569' }}>
                  {(data as any).location}
                </span>
              </div>
            )}
            {(data as any).website && (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <a
                  href={(data as any).website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '14px',
                    color: '#8b5cf6',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  {(data as any).website}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 정보 항목 컴포넌트
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: '12px',
          color: '#94a3b8',
          marginBottom: '6px',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>
        {value}
      </div>
    </div>
  )
}

// 이벤트 타입별 배경색
function getEventColor(type: string) {
  switch (type) {
    case 'establishment':
      return 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
    case 'reform':
      return 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
    case 'achievement':
      return 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
    case 'crisis':
      return 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
    case 'merger':
      return 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
    default:
      return 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)'
  }
}

// 이벤트 타입별 테두리 색
function getEventBorderColor(type: string) {
  switch (type) {
    case 'establishment':
      return '#e9d5ff'
    case 'reform':
      return '#bfdbfe'
    case 'achievement':
      return '#a7f3d0'
    case 'crisis':
      return '#fecaca'
    case 'merger':
      return '#fde68a'
    default:
      return '#e5e5e5'
  }
}

// 이벤트 타입별 아이콘 배경
function getEventIconBackground(type: string) {
  switch (type) {
    case 'establishment':
      return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
    case 'reform':
      return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    case 'achievement':
      return 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    case 'crisis':
      return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    case 'merger':
      return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    default:
      return 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
  }
}

// 이벤트 타입별 아이콘
function getEventIcon(type: string) {
  switch (type) {
    case 'establishment':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M3 21h18M4 18h16M6 18V9m12 9V9M8 6l4-3 4 3M8 18V6h8v12" />
        </svg>
      )
    case 'reform':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
        </svg>
      )
    case 'achievement':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    case 'crisis':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'merger':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
        </svg>
      )
    default:
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )
  }
}
