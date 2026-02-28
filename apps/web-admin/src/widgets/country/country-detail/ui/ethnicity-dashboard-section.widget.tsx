/**
 * 민족 섹션 (대시보드) — 가문 섹션과 동일한 구조·스타일
 * 전역 민족 목록 + 등록/수정 폼 (list | form)
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import styled from 'styled-components'
import {
  useEthnicities,
  useCreateEthnicity,
  useUpdateEthnicity,
  useDeleteEthnicity,
} from '@/features/ethnicity/use-ethnicities.hook'
import { getUploadImageUrl } from '@/shared/api/upload'
import type { Ethnicity } from '@/shared/api/ethnicity'

const MAIN = '#6366f1'

const GovTabNav = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  margin-bottom: 20px;
  width: fit-content;
  background: #f1f5f9;
  border-radius: 20px;
  overflow-x: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`
const GovTabButton = styled.button<{ $active?: boolean }>`
  flex: 0 0 auto;
  padding: 10px 18px;
  border-radius: 14px;
  border: none;
  background: ${(p) => (p.$active ? '#ffffff' : 'transparent')};
  color: ${(p) => (p.$active ? '#4f46e5' : '#64748b')};
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? '600' : '500')};
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, box-shadow 0.2s ease;
  white-space: nowrap;
  box-shadow: ${(p) => (p.$active ? '0 2px 8px rgba(79, 70, 229, 0.12)' : 'none')};
  &:hover {
    color: ${(p) => (p.$active ? '#4f46e5' : '#475569')};
    background: ${(p) => (p.$active ? '#ffffff' : 'rgba(255,255,255,0.6)')};
  }
`

export function EthnicityDashboardSection() {
  const { data: ethnicities = [], isLoading } = useEthnicities()
  const createEthnicity = useCreateEthnicity()
  const updateEthnicity = useUpdateEthnicity()
  const deleteEthnicity = useDeleteEthnicity()

  const [view, setView] = useState<'list' | 'form'>('list')
  const [editing, setEditing] = useState<Ethnicity | null>(null)
  const [form, setForm] = useState({
    name: '',
    nameLocal: '',
    description: '',
    thumbnailUrl: '',
    parentId: '',
  })
  const [formError, setFormError] = useState<string | null>(null)

  const list = Array.isArray(ethnicities) ? ethnicities : []
  const parentOptions = list.filter((e) => !editing || e.id !== editing.id)

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name ?? '',
        nameLocal: editing.nameLocal ?? '',
        description: editing.description ?? '',
        thumbnailUrl: editing.thumbnailUrl ?? '',
        parentId: editing.parentId ?? '',
      })
    } else {
      setForm({ name: '', nameLocal: '', description: '', thumbnailUrl: '', parentId: '' })
    }
    setFormError(null)
  }, [editing, view])

  const goToList = () => {
    setView('list')
    setEditing(null)
  }
  const openCreate = () => {
    setEditing(null)
    setView('form')
  }
  const openEdit = (e: Ethnicity) => {
    setEditing(e)
    setView('form')
  }

  const handleSave = async () => {
    setFormError(null)
    if (!form.name.trim()) {
      setFormError('민족명을 입력해주세요.')
      return
    }
    try {
      const payload = {
        name: form.name.trim(),
        nameLocal: form.nameLocal.trim() || null,
        description: form.description.trim() || null,
        thumbnailUrl: form.thumbnailUrl.trim() || null,
        parentId: form.parentId || null,
      }
      if (editing) {
        await updateEthnicity.mutateAsync({ id: editing.id, data: payload })
      } else {
        await createEthnicity.mutateAsync(payload)
      }
      goToList()
    } catch (err: unknown) {
      const msg =
        (err as Error)?.message?.includes('Unique constraint failed')
          ? '이미 존재하는 민족명입니다. 다른 이름을 사용해주세요.'
          : (err as Error)?.message || '저장 중 오류가 발생했습니다.'
      setFormError(msg)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 민족을 삭제하시겠습니까?')) return
    await deleteEthnicity.mutateAsync(id)
    if (editing?.id === id) goToList()
  }

  const isSaving = createEthnicity.isPending || updateEthnicity.isPending

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        padding: '36px 32px 48px',
        background: '#ffffff',
        minHeight: 'calc(100vh - 200px)',
        position: 'relative',
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
            슬라브족·게르만족 등 구성 민족을 등록하고 관리합니다. 국가 상세의 민족 탭에서 해당 국가에 연결할 수 있습니다.
          </p>
        </div>
        {view === 'list' && (
          <button
            type="button"
            onClick={openCreate}
            aria-label="새 민족 추가"
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
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            새 민족 추가
          </button>
        )}
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <GovTabNav>
          <GovTabButton type="button" $active>
            민족 현황
          </GovTabButton>
        </GovTabNav>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            flexWrap: 'wrap',
            padding: '20px 28px',
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>등록 민족</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              {list.length}
              <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginLeft: 2 }}>개</span>
            </span>
          </div>
        </div>
      </div>

      <section aria-label="민족 현황" style={{ paddingTop: 8, ...(view === 'form' ? { padding: '20px 0 32px' } : {}) }}>
        {view === 'form' ? (
          <>
            <div
              style={{
                background: '#fff',
                borderRadius: 20,
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '24px 28px',
                  background: '#fff',
                  borderBottom: '1px solid #f3f4f6',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button
                    type="button"
                    onClick={goToList}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#64748b',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'color 0.2s, background 0.2s',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.color = '#475569'
                      e.currentTarget.style.background = '#f1f5f9'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.color = '#64748b'
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    목록으로
                  </button>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.025em' }}>
                    {editing ? '민족 수정' : '민족 등록'}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                      padding: '12px 24px',
                      background: MAIN,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: isSaving ? 'wait' : 'pointer',
                      boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                      opacity: isSaving ? 0.7 : 1,
                    }}
                  >
                    {isSaving ? '저장 중…' : editing ? '저장' : '등록'}
                  </button>
                </div>
              </div>

              <div style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {formError && (
                  <div
                    style={{
                      marginBottom: 24,
                      padding: '12px 16px',
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: 10,
                      color: '#dc2626',
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    {formError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>썸네일</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      type="text"
                      value={form.thumbnailUrl}
                      onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
                      placeholder="이미지 URL 입력"
                      style={{
                        width: '100%',
                        maxWidth: 380,
                        padding: '12px 16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        fontSize: 14,
                        color: '#111827',
                        background: '#fff',
                        outline: 'none',
                      }}
                    />
                    {form.thumbnailUrl && (
                      <div style={{ marginTop: 4, width: '100%', maxWidth: 280, aspectRatio: '16/10', borderRadius: 14, overflow: 'hidden', background: '#fafafa' }}>
                        <img
                          src={getUploadImageUrl(form.thumbnailUrl)}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>
                    민족명 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="예: 슬라브족"
                      style={{
                        width: '100%',
                        maxWidth: 380,
                        padding: '12px 16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        fontSize: 14,
                        color: '#111827',
                        background: '#fff',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>현지명 / 원어명</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input
                      type="text"
                      value={form.nameLocal}
                      onChange={(e) => setForm((f) => ({ ...f, nameLocal: e.target.value }))}
                      placeholder="예: Slavs"
                      style={{
                        width: '100%',
                        maxWidth: 380,
                        padding: '12px 16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        fontSize: 14,
                        color: '#111827',
                        background: '#fff',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>상위 민족</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <select
                      value={form.parentId}
                      onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                      style={{
                        width: '100%',
                        maxWidth: 380,
                        padding: '12px 16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        fontSize: 14,
                        color: '#111827',
                        background: '#fff',
                        outline: 'none',
                      }}
                    >
                      <option value="">— 없음 —</option>
                      {parentOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.nameLocal ? ` (${p.nameLocal})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>설명</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="민족에 대한 설명"
                      rows={2}
                      style={{
                        width: '100%',
                        maxWidth: 440,
                        padding: '12px 16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        fontSize: 14,
                        color: '#111827',
                        background: '#fff',
                        resize: 'vertical',
                        minHeight: 72,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>민족 현황</h3>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: '#64748b', fontWeight: 500 }}>등록된 민족 목록입니다. 수정·삭제는 카드에서 할 수 있습니다.</p>
            </div>
            {isLoading ? (
              <div
                style={{
                  padding: 56,
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: 14,
                  background: '#f9fafb',
                  borderRadius: 16,
                  border: '1px solid #e5e7eb',
                }}
              >
                불러오는 중…
              </div>
            ) : list.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '64px 40px 72px',
                  background: '#ffffff',
                  borderRadius: 20,
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '20%',
                    width: 280,
                    height: 280,
                    marginLeft: -140,
                    marginTop: -140,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
                    filter: 'blur(32px)',
                    pointerEvents: 'none',
                  }}
                />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>등록된 민족이 없습니다</h3>
                  <p style={{ margin: '10px 0 0', fontSize: 14, color: '#64748b', maxWidth: 300, lineHeight: 1.55, fontWeight: 500 }}>
                    위 <strong style={{ color: '#475569', fontWeight: 600 }}>새 민족 추가</strong> 버튼을 눌러 첫 민족을 등록해 보세요.
                  </p>
                </div>
              </motion.div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                {list.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      minHeight: 200,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                        {e.thumbnailUrl ? (
                          <img
                            src={getUploadImageUrl(e.thumbnailUrl)}
                            alt=""
                            style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 14 }}
                            onError={(ev) => {
                              ev.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 72,
                              height: 72,
                              borderRadius: 14,
                              background: 'linear-gradient(145deg, #f1f5f9 0%, #e2e8f0 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94a3b8',
                              fontSize: 28,
                            }}
                          >
                            👥
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.3 }}>{e.name}</div>
                          {e.nameLocal && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{e.nameLocal}</div>}
                          {e.parent && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>상위: {e.parent.name}</div>}
                          {e.description && (
                            <div
                              style={{
                                fontSize: 13,
                                color: '#64748b',
                                marginTop: 10,
                                lineHeight: 1.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical' as const,
                                overflow: 'hidden',
                              }}
                            >
                              {e.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => openEdit(e)}
                          style={{
                            padding: '10px 18px',
                            fontSize: 13,
                            cursor: 'pointer',
                            border: '1px solid #e2e8f0',
                            borderRadius: 12,
                            background: '#fff',
                            fontWeight: 600,
                            color: '#475569',
                          }}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(e.id)}
                          disabled={deleteEthnicity.isPending}
                          style={{
                            padding: '10px 18px',
                            fontSize: 13,
                            cursor: deleteEthnicity.isPending ? 'wait' : 'pointer',
                            border: '1px solid #fecaca',
                            borderRadius: 12,
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontWeight: 600,
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </motion.div>
  )
}
