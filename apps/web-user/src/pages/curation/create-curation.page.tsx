import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { curationApi } from '@/shared/api/curation'
import './create-curation.css'

export function CreateCurationPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    keywords: '',
    publish: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent, publish: boolean) => {
    e.preventDefault()
    setError('')

    if (!formData.title.trim() || !formData.content.trim()) {
      setError('제목과 내용은 필수입니다.')
      return
    }

    try {
      setLoading(true)
      await curationApi.create({
        title: formData.title,
        content: formData.content,
        keywords: formData.keywords.trim() || undefined,
        publish,
      })

      alert(publish ? '글이 게시되었습니다!' : '임시저장되었습니다.')
      navigate('/')
    } catch (err: unknown) {
      console.error('Failed to create curation:', err)
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || '글 작성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
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
          <h2 className="create-title">글 작성</h2>
          <p className="create-subtitle">당신의 생각을 공유해보세요</p>

          {error && <div className="error-message">{error}</div>}

          <form className="create-form">
            <div className="form-group">
              <label>제목</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="제목을 입력하세요"
                required
              />
            </div>

            <div className="form-group">
              <label>본문</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="내용을 작성해주세요..."
                rows={12}
                required
              />
            </div>

            <div className="form-group">
              <label>키워드</label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="쉼표로 구분 (예: 이순신, 임진왜란)"
              />
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
