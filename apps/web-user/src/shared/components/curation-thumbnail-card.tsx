import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CurationResponse } from '@/shared/api/curation'
import './curation-thumbnail-card.css'

interface CurationThumbnailCardProps {
  curation: CurationResponse
  isPinned?: boolean
}

export function CurationThumbnailCard({
  curation,
  isPinned = false,
}: CurationThumbnailCardProps) {
  const navigate = useNavigate()

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

  // 이미지가 있으면 첫 번째 이미지 사용, 없으면 플레이스홀더
  const thumbnailImage = curation.images && curation.images.length > 0 
    ? curation.images[0] 
    : null

  return (
    <div
      className={`curation-thumbnail-card ${isPinned ? 'pinned' : ''}`}
      onClick={() => navigate(`/curation/${curation.id}`)}
    >
      {/* 고정 배지 */}
      {isPinned && (
        <div className="pin-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L8 6v6l-5 8h18l-5-8V6l-4-4z"/>
          </svg>
        </div>
      )}

      {/* 썸네일 이미지 */}
      <div className="thumbnail-image-container">
        {thumbnailImage ? (
          <img
            src={thumbnailImage}
            alt={curation.title}
            className="thumbnail-image"
            loading="lazy"
          />
        ) : (
          <div className="thumbnail-placeholder">
            <div className="placeholder-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" strokeWidth="1.5"/>
                <path d="M9 10C10.1046 10 11 9.10457 11 8C11 6.89543 10.1046 6 9 6C7.89543 6 7 6.89543 7 8C7 9.10457 7.89543 10 9 10Z" strokeWidth="1.5"/>
                <path d="M2.67004 18.95L7.60004 15.64C8.39004 15.11 9.53004 15.17 10.24 15.78L10.57 16.07C11.35 16.74 12.61 16.74 13.39 16.07L17.55 12.5C18.33 11.83 19.59 11.83 20.37 12.5L22 13.9" strokeWidth="1.5"/>
              </svg>
            </div>
          </div>
        )}
        
        {/* 호버 오버레이 */}
        <div className="thumbnail-overlay">
          <div className="overlay-content">
            <div className="quick-stats">
              <span className="stat-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                {curation.likeCount}
              </span>
              <span className="stat-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {curation.commentCount}
              </span>
            </div>
            {curation.isVerified && (
              <div className="verified-overlay">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 카드 정보 */}
      <div className="thumbnail-info">
        <div className="thumbnail-header">
          <span className="item-type-label">{getItemTypeLabel(curation.itemType)}</span>
          {curation.isVerified && (
            <span className="verified-mini">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
              </svg>
            </span>
          )}
        </div>
        
        <h3 className="thumbnail-title">{curation.title}</h3>
        
        {curation.tags && curation.tags.length > 0 && (
          <div className="thumbnail-tags">
            {curation.tags.slice(0, 2).map((tag, index) => (
              <span key={index} className="tag-mini">#{tag}</span>
            ))}
            {curation.tags.length > 2 && (
              <span className="tag-more">+{curation.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

