import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { curationApi, CurationResponse } from '@/shared/api/curation'
import { socialApi } from '@/shared/api/social'
import './curation-detail.css'

export function CurationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [curation, setCuration] = useState<CurationResponse | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadCuration()
      loadComments()
    }
  }, [id])

  const loadCuration = async () => {
    if (!id) return

    try {
      setLoading(true)
      const data = await curationApi.getById(id)
      setCuration(data)

      const { isLiked: liked } = await socialApi.isLiked(id)
      setIsLiked(liked)
    } catch (error) {
      console.error('Failed to load curation:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    if (!id) return

    try {
      const data = await socialApi.getComments(id)
      setComments(data.comments || [])
    } catch (error) {
      console.error('Failed to load comments:', error)
    }
  }

  const handleLike = async () => {
    if (!id) return

    try {
      if (isLiked) {
        await socialApi.unlike(id)
        setIsLiked(false)
        setCuration((prev) => (prev ? { ...prev, likeCount: prev.likeCount - 1 } : null))
      } else {
        await socialApi.like(id)
        setIsLiked(true)
        setCuration((prev) => (prev ? { ...prev, likeCount: prev.likeCount + 1 } : null))
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !newComment.trim()) return

    try {
      await socialApi.createComment(id, newComment.trim())
      setNewComment('')
      loadComments()
      setCuration((prev) => (prev ? { ...prev, commentCount: prev.commentCount + 1 } : null))
    } catch (error) {
      console.error('Failed to create comment:', error)
    }
  }

  if (loading || !curation) {
    return (
      <div className="curation-detail-page">
        <div className="container">
          <div className="loading">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="curation-detail-page">
      <header className="detail-header">
        <div className="container header-content">
          <h1 className="logo" onClick={() => navigate('/')}>
            Evolution
          </h1>
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← 돌아가기
          </button>
        </div>
      </header>

      <div className="container detail-container">
        <article className="curation-article">
          <div className="article-header">
            <h1 className="article-title">{curation.title}</h1>
            <div className="article-meta">
              <span className="meta-item">조회 {curation.viewCount}</span>
              <span className="meta-item">·</span>
              <span className="meta-item">{new Date(curation.publishedAt || curation.createdAt).toLocaleDateString('ko-KR')}</span>
              {curation.isVerified && <span className="verified-badge">✓ 검증됨</span>}
            </div>
          </div>

          <div className="article-content">
            <p className="content-text">{curation.content}</p>
          </div>

          {curation.tags && curation.tags.length > 0 && (
            <div className="article-tags">
              {curation.tags.map((tag, index) => (
                <span key={index} className="tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {curation.sources && curation.sources.length > 0 && (
            <div className="article-sources">
              <h3 className="sources-title">📚 출처</h3>
              <ul className="sources-list">
                {curation.sources.map((source, index) => (
                  <li key={index}>{source}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="article-actions">
            <button className={`action-btn ${isLiked ? 'active' : ''}`} onClick={handleLike}>
              <span className="action-icon">❤️</span>
              <span className="action-text">좋아요 {curation.likeCount}</span>
            </button>
            <div className="action-btn">
              <span className="action-icon">💬</span>
              <span className="action-text">댓글 {curation.commentCount}</span>
            </div>
          </div>
        </article>

        <section className="comments-section">
          <h2 className="comments-title">댓글 {comments.length}</h2>

          <form className="comment-form" onSubmit={handleSubmitComment}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 작성해주세요..."
              rows={3}
            />
            <button type="submit" className="submit-btn" disabled={!newComment.trim()}>
              댓글 작성
            </button>
          </form>

          <div className="comments-list">
            {comments.length === 0 ? (
              <div className="empty-comments">
                <p>아직 댓글이 없습니다.</p>
                <p>첫 번째 댓글을 작성해보세요!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <span className="comment-author">{comment.user?.displayName || 'User'}</span>
                    <span className="comment-date">{new Date(comment.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <p className="comment-content">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

