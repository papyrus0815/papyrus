import { useEffect, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import type { Ethnicity } from '@/shared/api/ethnicity'
import { ethnicityApi } from '@/shared/api/ethnicity'
import { getUploadImageUrl } from '@/shared/api/upload'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

const sectionLabelStyle: React.CSSProperties = {
  marginBottom: 18,
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  lineHeight: 1.4,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

export interface EthnicitySectionProps {
  /** 현대 국가 ID (있으면 해당 국가 구성 민족 조회·설정) */
  countryId?: string
  /** 역사적 국가 ID (있으면 해당 역사적 국가 구성 민족 조회·설정) */
  historicalCountryId?: string
}

/**
 * 국가/역사적 국가별 구성 민족 섹션
 * - 행정조직과 동일한 디자인 톤: 목록 + 구성 민족 편집(모달) + 민족 전체 관리 링크
 */
export function EthnicitySection({
  countryId,
  historicalCountryId,
}: EthnicitySectionProps) {
  const navigate = useNavigate()
  const [list, setList] = useState<Ethnicity[]>([])
  const [allEthnicities, setAllEthnicities] = useState<Ethnicity[]>([])
  const [loading, setLoading] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [modalSelectedIds, setModalSelectedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const entityId = countryId ?? historicalCountryId

  const loadList = () => {
    if (!entityId) return
    setLoading(true)
    if (countryId) {
      ethnicityApi
        .getAll({ countryId })
        .then(setList)
        .catch(() => setList([]))
        .finally(() => setLoading(false))
    } else if (historicalCountryId) {
      ethnicityApi
        .getAll({ historicalCountryId })
        .then(setList)
        .catch(() => setList([]))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadList()
  }, [countryId, historicalCountryId])

  const openEditModal = () => {
    ethnicityApi
      .getAll()
      .then((all) => {
        setAllEthnicities(all)
        setModalSelectedIds(list.map((e) => e.id))
        setEditModalOpen(true)
      })
      .catch(() => setAllEthnicities([]))
  }

  const handleToggleEthnicity = (id: string) => {
    setModalSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleSaveEdit = async () => {
    if (!entityId) return
    setSaving(true)
    try {
      if (countryId) {
        await ethnicityApi.setCountryEthnicities(countryId, modalSelectedIds)
      } else if (historicalCountryId) {
        await ethnicityApi.setHistoricalCountryEthnicities(
          historicalCountryId,
          modalSelectedIds,
        )
      }
      loadList()
      setEditModalOpen(false)
    } catch (e) {
      notify.error(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (!entityId) {
    return (
      <div style={{ padding: '36px 32px 48px' }}>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          국가를 선택하면 구성 민족을 관리할 수 있습니다.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        padding: '36px 32px 48px',
        minHeight: 'calc(100vh - 200px)',
      }}
    >
      <header
        style={{
          paddingBottom: 24,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.04em',
              lineHeight: 1.25,
            }}
          >
            민족
          </h2>
          <p
            style={{
              margin: '10px 0 0',
              fontSize: 15,
              color: '#64748b',
              lineHeight: 1.55,
              maxWidth: 540,
              fontWeight: 500,
            }}
          >
            이 국가의 구성 민족을 연결·관리합니다. 민족 마스터 데이터는 전체
            보기에서 등록·수정할 수 있습니다.
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={openEditModal}
            aria-label="구성 민족 편집"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: '#374151',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            구성 민족 편집
          </button>
          <button
            type="button"
            onClick={() => navigate('/ethnicities')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 12,
              border: '1px solid #6366f1',
              background: '#6366f1',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            민족 전체 관리
          </button>
        </div>
      </header>

      <section aria-label="구성 민족 목록">
        <div style={sectionLabelStyle}>구성 민족</div>
        {loading ? (
          <p style={{ color: '#64748b', fontSize: 14 }}>불러오는 중...</p>
        ) : list.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: 16,
              border: '1px dashed #e2e8f0',
              color: '#64748b',
              fontSize: 14,
            }}
          >
            연결된 민족이 없습니다. &quot;구성 민족 편집&quot;에서 추가하거나,
            민족 전체 관리에서 새 민족을 등록한 뒤 연결하세요.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            {list.map((e) => (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  background: '#fff',
                  borderRadius: 14,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {e.thumbnailUrl ? (
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: '#f1f5f9',
                    }}
                  >
                    <img
                      src={getUploadImageUrl(e.thumbnailUrl)}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background:
                        'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                    }}
                  >
                    👥
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}
                  >
                    {e.name}
                  </div>
                  {e.nameLocal && (
                    <div
                      style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}
                    >
                      {e.nameLocal}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <SelectModal
        isOpen={editModalOpen}
        onClose={() => !saving && setEditModalOpen(false)}
        title="구성 민족 편집"
        options={allEthnicities.map((e) => ({
          value: e.id,
          label: e.nameLocal ? `${e.name} (${e.nameLocal})` : e.name,
        }))}
        multiple
        selectedValues={modalSelectedIds}
        onSelect={handleToggleEthnicity}
        headerExtra={
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              padding: '12px 0',
            }}
          >
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                background: '#fff',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={saving}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: 'none',
                background: '#6366f1',
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        }
      />
    </div>
  )
}
