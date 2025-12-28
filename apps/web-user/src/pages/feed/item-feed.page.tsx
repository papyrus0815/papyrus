import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { curationApi, CurationResponse } from '@/shared/api/curation'
import { socialApi } from '@/shared/api/social'
import { CurationCard } from '@/shared/components/curation-card'
import './item-feed.css'

export function ItemFeedPage() {
  const { itemType, itemId } = useParams<{ itemType: string; itemId: string }>()
  const [curations, setCurations] = useState<CurationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadCurations()
  }, [itemType, itemId, page])

  const loadCurations = async () => {
    if (!itemType || !itemId) return

    try {
      setLoading(true)
      const data = await curationApi.getItemFeed(itemType, itemId, page)
      setCurations(data.curations)
      setTotal(data.total)

      // 좋아요 상태 확인
      const likedStatus: Record<string, boolean> = {}
      for (const curation of data.curations) {
        try {
          const { isLiked } = await socialApi.isLiked(curation.id)
          likedStatus[curation.id] = isLiked
        } catch {
          likedStatus[curation.id] = false
        }
      }
      setLikedMap(likedStatus)
    } catch (error) {
      console.error('Failed to load curations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (curationId: string) => {
    try {
      if (likedMap[curationId]) {
        await socialApi.unlike(curationId)
        setLikedMap({ ...likedMap, [curationId]: false })
        setCurations(
          curations.map((c) => (c.id === curationId ? { ...c, likeCount: c.likeCount - 1 } : c)),
        )
      } else {
        await socialApi.like(curationId)
        setLikedMap({ ...likedMap, [curationId]: true })
        setCurations(
          curations.map((c) => (c.id === curationId ? { ...c, likeCount: c.likeCount + 1 } : c)),
        )
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
    }
  }

  if (loading) {
    return (
      <div className="item-feed-page">
        <div className="container">
          <div className="loading">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="item-feed-page">
      <div className="container">
        <div className="item-feed-header">
          <h1 className="item-title">항목 피드</h1>
          <p className="item-subtitle">
            {itemType} #{itemId.substring(0, 8)}에 대한 {total}개의 큐레이션
          </p>
        </div>

        {curations.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">📚</p>
            <p className="empty-text">아직 큐레이션이 없습니다.</p>
            <p className="empty-subtext">첫 번째 큐레이션을 작성해보세요!</p>
          </div>
        ) : (
          <div className="curations-grid">
            {curations.map((curation) => (
              <CurationCard
                key={curation.id}
                curation={curation}
                onLike={() => handleLike(curation.id)}
                isLiked={likedMap[curation.id]}
              />
            ))}
          </div>
        )}

        {total > curations.length && (
          <div className="load-more">
            <button className="load-more-btn" onClick={() => setPage(page + 1)}>
              더 보기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

