/**
 * 가문 섹션 — 행정조직 페이지와 동일한 구조·스타일 참조
 */
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  useDynasties,
  useCreateDynasty,
  useUpdateDynasty,
  useDeleteDynasty,
} from '@/features/dynasty/use-dynasties.hook'
import {
  getUploadImageUrl,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import type { Dynasty } from '@/shared/api/dynasty'
import {
  PillTabButton,
  PillTabNav,
} from '@/shared/ui/tab/tab.styles'
import { DynastyMembersInfographicModal } from './dynasty-members-infographic-modal'

/** 옵션 메타 필드 — 이전 SDK 타입에는 없을 수 있어 캐스트로 접근 */
type DynastyExtra = Dynasty & {
  originPlace?: string | null
  founderText?: string | null
  motto?: string | null
  crestImageUrl?: string | null
}

const MAIN = '#6366f1'

export function DynastySection() {
  const { data: dynasties = [], isLoading } = useDynasties()
  const createDynasty = useCreateDynasty()
  const updateDynasty = useUpdateDynasty()
  const deleteDynasty = useDeleteDynasty()

  const [view, setView] = useState<'list' | 'form'>('list')
  const [editing, setEditing] = useState<Dynasty | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    originPlace: '',
    founderText: '',
    motto: '',
  })
  /** 서버에 저장된 `/uploads/...` 경로 (업로드 API 응답 url) */
  const [thumbPath, setThumbPath] = useState('')
  const [thumbRemoved, setThumbRemoved] = useState(false)
  const [thumbUploading, setThumbUploading] = useState(false)
  const thumbInitialRef = useRef('')
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const [crestPath, setCrestPath] = useState('')
  const [crestRemoved, setCrestRemoved] = useState(false)
  const [crestUploading, setCrestUploading] = useState(false)
  const crestInitialRef = useRef('')
  const crestInputRef = useRef<HTMLInputElement>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [membersModal, setMembersModal] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    if (editing) {
      const e = editing as DynastyExtra
      setForm({
        name: e.name ?? '',
        description: e.description ?? '',
        startDate: e.startDate ? new Date(e.startDate).toISOString().split('T')[0] : '',
        endDate: e.endDate ? new Date(e.endDate).toISOString().split('T')[0] : '',
        originPlace: e.originPlace ?? '',
        founderText: e.founderText ?? '',
        motto: e.motto ?? '',
      })
      const t = e.thumbnailUrl ?? ''
      thumbInitialRef.current = t
      setThumbPath(t)
      setThumbRemoved(false)
      const c = e.crestImageUrl ?? ''
      crestInitialRef.current = c
      setCrestPath(c)
      setCrestRemoved(false)
    } else {
      setForm({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        originPlace: '',
        founderText: '',
        motto: '',
      })
      thumbInitialRef.current = ''
      setThumbPath('')
      setThumbRemoved(false)
      crestInitialRef.current = ''
      setCrestPath('')
      setCrestRemoved(false)
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
  const openEdit = (d: Dynasty) => {
    setEditing(d)
    setView('form')
  }

  const handleSave = async () => {
    setFormError(null)
    if (!form.name.trim()) {
      setFormError('가문명을 입력해주세요.')
      return
    }
    try {
      const thumbPayload: { thumbnailUrl?: string | null } = {}
      if (!editing) {
        if (thumbPath.trim()) thumbPayload.thumbnailUrl = thumbPath.trim()
      } else if (thumbRemoved) {
        thumbPayload.thumbnailUrl = null
      } else {
        const cur = thumbPath.trim()
        const initial = (thumbInitialRef.current ?? '').trim()
        if (cur && cur !== initial) thumbPayload.thumbnailUrl = cur
      }

      let crestImageUrl: string | null | undefined = undefined
      if (!editing) {
        if (crestPath.trim()) crestImageUrl = crestPath.trim()
      } else if (crestRemoved) {
        crestImageUrl = null
      } else {
        const cur = crestPath.trim()
        const initial = (crestInitialRef.current ?? '').trim()
        if (cur && cur !== initial) crestImageUrl = cur
      }

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        startDate: form.startDate.trim() || undefined,
        endDate: form.endDate.trim() || undefined,
        originPlace:
          form.originPlace.trim() || (editing ? null : undefined),
        founderText:
          form.founderText.trim() || (editing ? null : undefined),
        motto: form.motto.trim() || (editing ? null : undefined),
        ...thumbPayload,
      }
      if (crestImageUrl !== undefined) payload.crestImageUrl = crestImageUrl
      if (editing) {
        await updateDynasty.mutateAsync({ id: editing.id, data: payload })
      } else {
        // 새 등록은 name 필수 필드 보장됨
        await createDynasty.mutateAsync(payload as never)
      }
      goToList()
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message?.includes('Unique constraint failed') ||
        err?.message?.includes('Unique constraint failed')
          ? '이미 존재하는 가문명입니다. 다른 이름을 사용해주세요.'
          : err?.message || '저장 중 오류가 발생했습니다.'
      setFormError(msg)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 가문을 삭제하시겠습니까?')) return
    await deleteDynasty.mutateAsync(id)
    if (editing?.id === id) goToList()
  }

  const list = Array.isArray(dynasties) ? dynasties : []
  const isSaving = createDynasty.isPending || updateDynasty.isPending

  return (
    <div
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
      {/* 헤더 — 행정조직과 동일 */}
      <header style={{ paddingBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1.25 }}>
            가문
          </h2>
          <p style={{ margin: '10px 0 0', fontSize: 15, color: '#64748b', lineHeight: 1.55, maxWidth: 540, fontWeight: 500 }}>
            왕조·귀족 가문 등 혈통 기반 집단을 등록하고 관리합니다.
          </p>
        </div>
        {view === 'list' && (
          <button
            type="button"
            onClick={openCreate}
            aria-label="새 가문 추가"
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
            새 가문 추가
          </button>
        )}
      </header>

      {/* 탭 + KPI — 행정조직과 동일 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PillTabNav>
          <PillTabButton type="button" $active>
            가문 현황
          </PillTabButton>
        </PillTabNav>
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
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>등록 가문</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              {list.length}
              <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginLeft: 2 }}>개</span>
            </span>
          </div>
        </div>
      </div>

      <section aria-label="가문 현황" style={{ paddingTop: 8, ...(view === 'form' ? { padding: '20px 0 32px' } : {}) }}>
        {view === 'form' ? (
          <>
            <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', background: '#fff', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap', gap: 16 }}>
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
                    {editing ? '가문 수정' : '가문 등록'}
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
                  <div style={{ marginBottom: 24, padding: '12px 16px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 14, fontWeight: 500 }}>
                    {formError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>썸네일</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input
                      ref={thumbInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (!file) return
                        try {
                          validateImageFile(file)
                        } catch (err) {
                          setFormError((err as Error).message)
                          return
                        }
                        setThumbUploading(true)
                        setFormError(null)
                        try {
                          const r = await uploadImage(file, 'dynasties')
                          setThumbPath(r.url)
                          setThumbRemoved(false)
                        } catch (err) {
                          setFormError((err as Error).message)
                        } finally {
                          setThumbUploading(false)
                        }
                      }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        disabled={thumbUploading}
                        onClick={() => thumbInputRef.current?.click()}
                        style={{
                          padding: '10px 16px',
                          borderRadius: 12,
                          border: '1px solid #e5e7eb',
                          background: '#fff',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#374151',
                          cursor: thumbUploading ? 'wait' : 'pointer',
                        }}
                      >
                        {thumbUploading ? '업로드 중…' : '이미지 선택'}
                      </button>
                      {(thumbPath || (editing && thumbInitialRef.current && !thumbRemoved)) && (
                        <button
                          type="button"
                          disabled={thumbUploading}
                          onClick={() => {
                            setThumbPath('')
                            setThumbRemoved(true)
                          }}
                          style={{
                            padding: '10px 16px',
                            borderRadius: 12,
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#dc2626',
                            cursor: thumbUploading ? 'wait' : 'pointer',
                          }}
                        >
                          썸네일 제거
                        </button>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                      JPG·PNG·WebP 등 이미지 파일을 업로드합니다. (최대 10MB)
                    </p>
                    {!thumbRemoved && thumbPath ? (
                      <div style={{ marginTop: 4, width: '100%', maxWidth: 280, aspectRatio: '16/10', borderRadius: 14, overflow: 'hidden', background: '#fafafa' }}>
                        <img
                          src={getUploadImageUrl(thumbPath)}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(ev) => {
                            ev.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>가문명 <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="예: 조선 왕조"
                      style={{ width: '100%', maxWidth: 380, padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: '#111827', background: '#fff', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>시작일 · 종료일</label>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                      style={{ padding: '10px 18px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 13, color: form.startDate ? '#111827' : '#9ca3af', background: form.startDate ? '#eff6ff' : '#fff', cursor: 'pointer', minWidth: 140 }}
                    />
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                      style={{ padding: '10px 18px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 13, color: form.endDate ? '#111827' : '#9ca3af', background: form.endDate ? '#fef2f2' : '#fff', cursor: 'pointer', minWidth: 140 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>본관 · 발상지</label>
                  <input
                    type="text"
                    value={form.originPlace}
                    onChange={(e) => setForm((f) => ({ ...f, originPlace: e.target.value }))}
                    placeholder="예: 김해, Habsburg"
                    style={{ width: '100%', maxWidth: 380, padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: '#111827', background: '#fff', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>시조</label>
                  <input
                    type="text"
                    value={form.founderText}
                    onChange={(e) => setForm((f) => ({ ...f, founderText: e.target.value }))}
                    placeholder="시조 이름 (인물 등록되어 있으면 추후 연결)"
                    style={{ width: '100%', maxWidth: 380, padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: '#111827', background: '#fff', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>가훈 · 모토</label>
                  <input
                    type="text"
                    value={form.motto}
                    onChange={(e) => setForm((f) => ({ ...f, motto: e.target.value }))}
                    placeholder='예: "AEIOU"'
                    style={{ width: '100%', maxWidth: 440, padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: '#111827', background: '#fff', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>가문 상징(문장)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input
                      ref={crestInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (!file) return
                        try {
                          validateImageFile(file)
                        } catch (err) {
                          setFormError((err as Error).message)
                          return
                        }
                        setCrestUploading(true)
                        setFormError(null)
                        try {
                          const r = await uploadImage(file, 'dynasties')
                          setCrestPath(r.url)
                          setCrestRemoved(false)
                        } catch (err) {
                          setFormError((err as Error).message)
                        } finally {
                          setCrestUploading(false)
                        }
                      }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        disabled={crestUploading}
                        onClick={() => crestInputRef.current?.click()}
                        style={{
                          padding: '10px 16px',
                          borderRadius: 12,
                          border: '1px solid #e5e7eb',
                          background: '#fff',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#374151',
                          cursor: crestUploading ? 'wait' : 'pointer',
                        }}
                      >
                        {crestUploading ? '업로드 중…' : '문장 이미지 선택'}
                      </button>
                      {!crestRemoved && crestPath && (
                        <button
                          type="button"
                          disabled={crestUploading}
                          onClick={() => {
                            setCrestPath('')
                            setCrestRemoved(true)
                          }}
                          style={{
                            padding: '10px 16px',
                            borderRadius: 12,
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#dc2626',
                            cursor: crestUploading ? 'wait' : 'pointer',
                          }}
                        >
                          문장 제거
                        </button>
                      )}
                    </div>
                    {!crestRemoved && crestPath ? (
                      <div style={{ marginTop: 4, width: 120, height: 120, borderRadius: 14, overflow: 'hidden', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb' }}>
                        <img
                          src={getUploadImageUrl(crestPath)}
                          alt=""
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          onError={(ev) => {
                            ev.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>설명</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="가문에 대한 설명, 역할 등"
                      rows={2}
                      style={{ width: '100%', maxWidth: 440, padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: '#111827', background: '#fff', resize: 'vertical', minHeight: 72, outline: 'none' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>가문 현황</h3>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: '#64748b', fontWeight: 500 }}>등록된 가문 목록입니다. 수정·삭제는 카드에서 할 수 있습니다.</p>
            </div>
            {isLoading ? (
              <div style={{ padding: 56, textAlign: 'center', color: '#6b7280', fontSize: 14, background: '#f9fafb', borderRadius: 16, border: '1px solid #e5e7eb' }}>
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
                {/* 배경 그라데이션 오브 */}
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
                <div
                  style={{
                    position: 'absolute',
                    right: '10%',
                    bottom: '15%',
                    width: 160,
                    height: 160,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)',
                    filter: 'blur(24px)',
                    pointerEvents: 'none',
                  }}
                />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ marginBottom: 28 }}>
                    <svg width="120" height="88" viewBox="0 0 120 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{ display: 'block' }}>
                      {/* 뒤쪽 카드 */}
                      <rect x="4" y="20" width="100" height="60" rx="14" fill="#e2e8f0" />
                      {/* 가운데 카드 */}
                      <rect x="14" y="10" width="100" height="60" rx="14" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />
                      {/* 앞쪽 카드 - 포인트 */}
                      <rect x="24" y="0" width="100" height="60" rx="14" fill="#ffffff" stroke="#c7d2fe" strokeWidth="1.5" />
                      <rect x="32" y="14" width="56" height="10" rx="5" fill="#eef2ff" />
                      <rect x="32" y="30" width="76" height="6" rx="3" fill="#e0e7ff" />
                      <rect x="32" y="42" width="64" height="6" rx="3" fill="#e0e7ff" />
                    </svg>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    등록된 가문이 없습니다
                  </h3>
                  <p style={{ margin: '10px 0 0', fontSize: 14, color: '#64748b', maxWidth: 300, lineHeight: 1.55, fontWeight: 500 }}>
                    위 <strong style={{ color: '#475569', fontWeight: 600 }}>새 가문 추가</strong> 버튼을 눌러 첫 가문을 등록해 보세요.
                  </p>
                </div>
              </motion.div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 24 }}>
                {list.map((dynasty) => {
                  const ext = dynasty as DynastyExtra
                  const startYear = dynasty.startDate
                    ? new Date(dynasty.startDate).getFullYear().toString()
                    : null
                  const endYear = dynasty.endDate
                    ? new Date(dynasty.endDate).getFullYear().toString()
                    : null
                  const dateRange =
                    startYear && endYear
                      ? `${startYear} – ${endYear}`
                      : startYear
                        ? `${startYear} – 현재`
                        : endYear
                          ? `? – ${endYear}`
                          : null
                  return (
                    <div
                      key={dynasty.id}
                      style={{
                        background: '#fff',
                        borderRadius: 16,
                        minHeight: 280,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            {dynasty.thumbnailUrl ? (
                              <img src={getUploadImageUrl(dynasty.thumbnailUrl)} alt="" style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 16 }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            ) : (
                              <div style={{ width: 88, height: 88, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>
                                {dynasty.name?.trim().slice(0, 1) || '·'}
                              </div>
                            )}
                            {ext.crestImageUrl && (
                              <div
                                title="가문 상징"
                                style={{
                                  position: 'absolute',
                                  right: -6,
                                  bottom: -6,
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  border: '2px solid #fff',
                                  background: '#f8fafc',
                                  boxShadow: '0 2px 6px rgba(15,23,42,0.18)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <img
                                  src={getUploadImageUrl(ext.crestImageUrl)}
                                  alt=""
                                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                            <Link
                              to={`/history/dynasties/${dynasty.id}`}
                              style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.3, textDecoration: 'none' }}
                            >
                              {dynasty.name}
                            </Link>
                            {dateRange && (
                              <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: '#64748b', marginTop: 6 }}>{dateRange}</div>
                            )}
                            {ext.originPlace && (
                              <div style={{ fontSize: 12.5, color: '#6366f1', marginTop: 6, fontWeight: 500 }}>
                                본관 · {ext.originPlace}
                              </div>
                            )}
                            {ext.founderText && (
                              <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4 }}>
                                시조 · {ext.founderText}
                              </div>
                            )}
                            {ext.motto && (
                              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                                "{ext.motto}"
                              </div>
                            )}
                            {dynasty.description && (
                              <div style={{ fontSize: 13, color: '#64748b', marginTop: 10, lineHeight: 1.5, whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                                {dynasty.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 'auto', paddingTop: 4 }}>
                          <Link
                            to={`/history/dynasties/${dynasty.id}`}
                            style={{ padding: '10px 18px', fontSize: 13, cursor: 'pointer', border: '1px solid #c7d2fe', borderRadius: 12, background: '#eef2ff', fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}
                          >
                            상세 보기
                          </Link>
                          <button
                            type="button"
                            onClick={() => setMembersModal({ id: dynasty.id, name: dynasty.name })}
                            style={{ padding: '10px 18px', fontSize: 13, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', fontWeight: 600, color: '#475569' }}
                          >
                            구성원
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(dynasty)}
                            style={{ padding: '10px 18px', fontSize: 13, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', fontWeight: 600, color: '#475569' }}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(dynasty.id)}
                            disabled={deleteDynasty.isPending}
                            style={{ padding: '10px 18px', fontSize: 13, cursor: deleteDynasty.isPending ? 'wait' : 'pointer', border: '1px solid #fecaca', borderRadius: 12, background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>
      {membersModal ? (
        <DynastyMembersInfographicModal
          dynastyId={membersModal.id}
          dynastyName={membersModal.name}
          isOpen
          onClose={() => setMembersModal(null)}
        />
      ) : null}
    </div>
  )
}
