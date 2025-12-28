import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { curationApi } from '@/shared/api/curation'
import './create-curation.css'

export function CreateCurationPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    itemType: 'PERSON',
    itemId: '',
    title: '',
    content: '',
    sources: [''],
    tags: [''],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent, publish: boolean) => {
    e.preventDefault()
    setError('')

    if (!formData.title.trim() || !formData.content.trim() || !formData.itemId.trim()) {
      setError('제목, 내용, 항목 ID는 필수입니다.')
      return
    }

    try {
      setLoading(true)
      await curationApi.create({
        itemType: formData.itemType,
        itemId: formData.itemId,
        title: formData.title,
        content: formData.content,
        sources: formData.sources.filter((s) => s.trim()),
        tags: formData.tags.filter((t) => t.trim()),
        publish,
      })

      alert(publish ? '큐레이션이 게시되었습니다!' : '임시저장되었습니다.')
      navigate('/')
    } catch (err: any) {
      console.error('Failed to create curation:', err)
      setError(err.response?.data?.message || '큐레이션 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const addSource = () => {
    setFormData({ ...formData, sources: [...formData.sources, ''] })
  }

  const updateSource = (index: number, value: string) => {
    const newSources = [...formData.sources]
    newSources[index] = value
    setFormData({ ...formData, sources: newSources })
  }

  const removeSource = (index: number) => {
    setFormData({ ...formData, sources: formData.sources.filter((_, i) => i !== index) })
  }

  const addTag = () => {
    setFormData({ ...formData, tags: [...formData.tags, ''] })
  }

  const updateTag = (index: number, value: string) => {
    const newTags = [...formData.tags]
    newTags[index] = value
    setFormData({ ...formData, tags: newTags })
  }

  const removeTag = (index: number) => {
    setFormData({ ...formData, tags: formData.tags.filter((_, i) => i !== index) })
  }

  return (
    <div className="create-curation-page">
      <header className="create-header">
        <div className="container header-content">
          <h1 className="logo" onClick={() => navigate('/')}>
            Evolution
          </h1>
          <button className="back-btn" onClick={() => navigate('/')}>
            ← 돌아가기
          </button>
        </div>
      </header>

      <div className="container create-container">
        <div className="create-content">
          <h2 className="create-title">큐레이션 작성</h2>
          <p className="create-subtitle">역사적 항목에 대한 당신의 통찰을 공유해보세요</p>

          {error && <div className="error-message">{error}</div>}

          <form className="create-form">
            <div className="form-row">
              <div className="form-group half">
                <label>항목 타입</label>
                <select value={formData.itemType} onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}>
                  <option value="PERSON">인물</option>
                  <option value="COUNTRY">국가</option>
                  <option value="EVENT">사건</option>
                  <option value="HISTORICAL_COUNTRY">역사적 국가</option>
                </select>
              </div>

              <div className="form-group half">
                <label>항목 ID</label>
                <input
                  type="text"
                  value={formData.itemId}
                  onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                  placeholder="Person, Country 등의 ID를 입력하세요"
                  required
                />
                <small>💡 관리자 앱에서 항목의 ID를 확인할 수 있습니다</small>
              </div>
            </div>

            <div className="form-group">
              <label>제목</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="예: 비스마르크의 현실주의 외교 전략"
                required
              />
            </div>

            <div className="form-group">
              <label>본문</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="역사적 항목에 대한 당신의 생각, 분석, 해석을 작성해주세요..."
                rows={12}
                required
              />
            </div>

            <div className="form-group">
              <label>출처</label>
              {formData.sources.map((source, index) => (
                <div key={index} className="array-input">
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => updateSource(index, e.target.value)}
                    placeholder="예: 역사책 제목, 논문 이름 등"
                  />
                  {formData.sources.length > 1 && (
                    <button type="button" className="remove-btn" onClick={() => removeSource(index)}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="add-btn" onClick={addSource}>
                + 출처 추가
              </button>
            </div>

            <div className="form-group">
              <label>태그</label>
              {formData.tags.map((tag, index) => (
                <div key={index} className="array-input">
                  <input type="text" value={tag} onChange={(e) => updateTag(index, e.target.value)} placeholder="예: 외교, 정치, 전쟁" />
                  {formData.tags.length > 1 && (
                    <button type="button" className="remove-btn" onClick={() => removeTag(index)}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="add-btn" onClick={addTag}>
                + 태그 추가
              </button>
            </div>

            <div className="form-actions">
              <button type="button" className="action-btn secondary" onClick={(e) => handleSubmit(e, false)} disabled={loading}>
                {loading ? '저장 중...' : '임시저장'}
              </button>
              <button type="button" className="action-btn primary" onClick={(e) => handleSubmit(e, true)} disabled={loading}>
                {loading ? '게시 중...' : '게시하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

