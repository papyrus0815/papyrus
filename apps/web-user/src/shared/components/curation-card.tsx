import React from 'react'
import { CurationResponse } from '@/shared/api/curation'
import { useNavigate } from 'react-router-dom'
import './curation-card.css'

interface CurationCardProps {
  curation: CurationResponse
  onLike?: () => void
  isLiked?: boolean
}

export function CurationCard({ curation, onLike, isLiked }: CurationCardProps) {
  const navigate = useNavigate()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '오늘'
    if (days === 1) return '어제'
    if (days < 7) return `${days}일 전`
    if (days < 30) return `${Math.floor(days / 7)}주 전`
    if (days < 365) return `${Math.floor(days / 30)}개월 전`
    return `${Math.floor(days / 365)}년 전`
  }

  const getItemTypeLabel = (itemType: string) => {
    const typeMap: Record<string, string> = {
      PERSON: '인물',
      COUNTRY: '국가',
      EVENT: '사건',
      ORGANIZATION: '조직',
      CITY: '도시',
      RELIGION: '종교',
      LAW: '법률',
      COMPANY: '기업',
    }
    return typeMap[itemType] || itemType
  }

  return (
    <div className="curation-card" onClick={() => navigate(`/curation/${curation.id}`)}>
      {/* 헤더: 작성자 정보 */}
      <div className="curation-header">
        <div className="curation-author">
          <div className="author-avatar">
            <span>{curation.userId.substring(0, 2).toUpperCase()}</span>
          </div>
          <div className="author-info">
            <span className="author-name">User {curation.userId.substring(0, 6)}</span>
            <span className="curation-time">{formatDate(curation.publishedAt || curation.createdAt)}</span>
          </div>
        </div>
        {curation.isVerified && (
          <div className="verified-badge-small">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            검증됨
          </div>
        )}
      </div>

      {/* 제목 영역 */}
      <div className="curation-title-section">
        <h2 className="curation-title">{curation.title}</h2>
        <div className="curation-meta">
          <span className="item-type-badge">{getItemTypeLabel(curation.itemType)}</span>
          <span className="meta-separator">·</span>
          <span className="view-count">조회 {curation.viewCount.toLocaleString()}</span>
        </div>
      </div>

      {/* 본문 미리보기 */}
      <div className="curation-body">
        <p className="curation-excerpt">
          {curation.content.length > 250 ? `${curation.content.substring(0, 250)}...` : curation.content}
        </p>
      </div>

      {/* 출처 정보 */}
      {curation.sources && curation.sources.length > 0 && (
        <div className="curation-sources">
          <div className="sources-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 0 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            출처 {curation.sources.length}개
          </div>
          <div className="sources-preview">
            {curation.sources.slice(0, 2).map((source, index) => (
              <span key={index} className="source-item">{source}</span>
            ))}
            {curation.sources.length > 2 && (
              <span className="source-more">외 {curation.sources.length - 2}개</span>
            )}
          </div>
        </div>
      )}

      {/* 태그 */}
      {curation.tags && curation.tags.length > 0 && (
        <div className="curation-tags">
          {curation.tags.map((tag, index) => (
            <span key={index} className="tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="curation-actions">
        <div className="action-buttons-left">
          <button
            className={`action-btn ${isLiked ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onLike?.()
            }}
          >
            {isLiked ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            )}
            <span className="action-label">{curation.likeCount > 0 && curation.likeCount}</span>
          </button>
          <button
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/curation/${curation.id}`)
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="action-label">{curation.commentCount > 0 && curation.commentCount}</span>
          </button>
        </div>
        <div className="read-more-btn">
          읽기 →
        </div>
      </div>
    </div>
  )
}

