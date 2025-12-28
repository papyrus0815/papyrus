import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { curationApi, CurationResponse } from '@/shared/api/curation'
import { socialApi } from '@/shared/api/social'
import { CurationThumbnailCard } from '@/shared/components/curation-thumbnail-card'
import { CurationCard } from '@/shared/components/curation-card'
import './user-room.css'

interface UserInfo {
  id: string
  displayName: string
  email: string
  bio?: string
  profileImageUrl?: string
  followerCount: number
  followingCount: number
  curationCount: number
}

interface UserRoom {
  title?: string
  description?: string
  themeColor?: string
  backgroundImageUrl?: string
  layout?: 'grid' | 'list'
  showVisitorCount: boolean
  totalVisitors: number
  todayVisitors: number
}

type ViewMode = 'grid' | 'list'

export function UserRoomPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [room, setRoom] = useState<UserRoom | null>(null)
  const [curations, setCurations] = useState<CurationResponse[]>([])
  const [pinnedCurations, setPinnedCurations] = useState<string[]>([]) // 고정된 큐레이션 ID 목록
  const [loading, setLoading] = useState(true)
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({})
  const [isFollowing, setIsFollowing] = useState(false)
  const [isOwnRoom, setIsOwnRoom] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  useEffect(() => {
    if (!id) {
      navigate('/')
      return
    }
    loadUserRoom()
  }, [id])

  const loadUserRoom = async () => {
    try {
      setLoading(true)
      
      // 현재 로그인 사용자 확인
      const currentUserStr = localStorage.getItem('user')
      if (currentUserStr && currentUserStr !== 'undefined') {
        const currentUser = JSON.parse(currentUserStr)
        setIsOwnRoom(currentUser.id === id)
      }

      // 목업 사용자 데이터
      const mockUser: UserInfo = {
        id: id || 'user001',
        displayName: '김철수',
        email: 'kim@example.com',
        bio: '역사를 사랑하는 큐레이터입니다. 조선 시대와 근대사에 관심이 많아요.',
        followerCount: 124,
        followingCount: 89,
        curationCount: 18,
      }
      setUser(mockUser)

      // 목업 방 설정
      const mockRoom: UserRoom = {
        title: '역사의 길을 걷다',
        description: '한국사를 큐레이션하는 개인 갤러리입니다.',
        themeColor: '#3b82f6',
        layout: 'grid',
        showVisitorCount: true,
        totalVisitors: 1245,
        todayVisitors: 23,
      }
      setRoom(mockRoom)
      setViewMode(mockRoom.layout || 'grid')

      // 목업 큐레이션 데이터 (더 많게)
      const mockCurations: CurationResponse[] = []
      const mockTitles = [
        '조선 시대의 정치 체제와 왕권',
        '임진왜란과 이순신의 해전 전략',
        '고려 시대의 불교 문화와 예술',
        '근대 한국의 독립운동가들',
        '한국 전쟁과 휴전 협정',
        '신라 시대의 금관문화',
        '백제의 대외 교류와 문화',
        '고구려의 강대국 지위 확립',
        '대한민국 헌법 제정 과정',
        '한반도 분단과 통일 운동',
        '조선 후기 실학의 발전',
        '근대 개화기의 사회 변화',
        '한국 고대 국가의 형성',
        '조선 왕조의 건국과 발전',
        '일제 강점기 민족 운동',
        '6.25 전쟁과 국가 재건',
        '현대 한국의 산업화',
        '한국의 민주화 운동',
      ]

      for (let i = 0; i < 18; i++) {
        const daysAgo = Math.floor(Math.random() * 60)
        const createdAt = new Date()
        createdAt.setDate(createdAt.getDate() - daysAgo)
        const publishedAt = new Date(createdAt.getTime() + Math.random() * 3600000)

        // 일부 큐레이션에 이미지 추가 (목업)
        const hasImage = Math.random() > 0.4

        mockCurations.push({
          id: `room-curation-${i + 1}`,
          userId: id || 'user001',
          itemType: ['PERSON', 'COUNTRY', 'EVENT', 'ORGANIZATION'][i % 4],
          itemId: `item-${i + 1}`,
          title: mockTitles[i % mockTitles.length],
          content: `${mockTitles[i % mockTitles.length]}에 대한 상세한 설명입니다. 역사적 맥락과 의미를 깊이 있게 다룹니다.`,
          images: hasImage ? [`https://picsum.photos/400/300?random=${i + 1}`] : [],
          sources: ['한국사 데이터베이스', '한국민족문화대백과사전'],
          tags: ['조선', '역사', '정치', '문화'],
          visibility: 'PUBLIC',
          status: 'PUBLISHED',
          viewCount: Math.floor(Math.random() * 1000) + 10,
          likeCount: Math.floor(Math.random() * 500) + 5,
          commentCount: Math.floor(Math.random() * 100),
          isVerified: Math.random() > 0.7,
          createdAt: createdAt.toISOString(),
          publishedAt: publishedAt.toISOString(),
        })
      }

      setCurations(mockCurations)
      
      // 첫 번째 큐레이션을 고정으로 설정 (목업)
      setPinnedCurations([mockCurations[0]?.id].filter(Boolean) as string[])

      // 좋아요 상태 (목업)
      const likedStatus: Record<string, boolean> = {}
      for (const curation of mockCurations) {
        likedStatus[curation.id] = Math.random() > 0.7
      }
      setLikedMap(likedStatus)
    } catch (error) {
      console.error('Failed to load user room:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    try {
      setIsFollowing(!isFollowing)
      if (user) {
        setUser({
          ...user,
          followerCount: isFollowing ? user.followerCount - 1 : user.followerCount + 1,
        })
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
    }
  }

  // 고정된 큐레이션과 일반 큐레이션 분리
  const sortedCurations = [...curations].sort((a, b) => {
    const aPinned = pinnedCurations.includes(a.id)
    const bPinned = pinnedCurations.includes(b.id)
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    return 0
  })

  if (loading) {
    return (
      <div className="user-room-page">
        <div className="loading">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="user-room-page">
        <div className="error">사용자를 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="user-room-page" data-view-mode={viewMode}>
      {/* 헤더 */}
      <header className="room-header">
        <div className="header-content">
          <h1 className="logo" onClick={() => navigate('/')}>
            Evolution
          </h1>
          <nav className="nav">
            <button className="nav-icon" onClick={() => navigate('/')} title="홈">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9.02 2.84004L3.63 7.04004C2.73 7.74004 2 9.23004 2 10.36V17.77C2 20.09 3.89 21.99 6.21 21.99H17.79C20.11 21.99 22 20.09 22 17.78V10.5C22 9.29004 21.19 7.74004 20.2 7.05004L14.02 2.72004C12.62 1.74004 10.37 1.79004 9.02 2.84004Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="nav-icon"
              onClick={() => navigate('/curation/create')}
              title="새 게시물"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 10C10.1046 10 11 9.10457 11 8C11 6.89543 10.1046 6 9 6C7.89543 6 7 6.89543 7 8C7 9.10457 7.89543 10 9 10Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2.67004 18.95L7.60004 15.64C8.39004 15.11 9.53004 15.17 10.24 15.78L10.57 16.07C11.35 16.74 12.61 16.74 13.39 16.07L17.55 12.5C18.33 11.83 19.59 11.83 20.37 12.5L22 13.9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </nav>
        </div>
      </header>

      {/* 갤러리 헤더 */}
      <div className="gallery-header">
        <div className="container">
          <div className="gallery-profile">
            <div className="profile-avatar-large">
              <div className="avatar-circle-large">
                {user.displayName.substring(0, 2).toUpperCase()}
              </div>
            </div>
            <div className="profile-details">
              <div className="profile-header-row">
                <h2 className="profile-name-large">{user.displayName}</h2>
                {isOwnRoom ? (
                  <button className="btn-edit-room" onClick={() => navigate('/room/edit')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    방 꾸미기
                  </button>
                ) : (
                  <button
                    className={`btn-follow-large ${isFollowing ? 'following' : ''}`}
                    onClick={handleFollow}
                  >
                    {isFollowing ? '팔로잉' : '팔로우'}
                  </button>
                )}
              </div>
              {room?.title && <p className="room-title-large">{room.title}</p>}
              {user.bio && <p className="profile-bio-large">{user.bio}</p>}
              
              {/* 통계 */}
              <div className="profile-stats-large">
                <div className="stat-item-large">
                  <span className="stat-value-large">{user.curationCount}</span>
                  <span className="stat-label-large">큐레이션</span>
                </div>
                <div className="stat-divider">·</div>
                <div className="stat-item-large">
                  <span className="stat-value-large">{user.followerCount}</span>
                  <span className="stat-label-large">팔로워</span>
                </div>
                <div className="stat-divider">·</div>
                <div className="stat-item-large">
                  <span className="stat-value-large">{user.followingCount}</span>
                  <span className="stat-label-large">팔로잉</span>
                </div>
                {room?.showVisitorCount && (
                  <>
                    <div className="stat-divider">·</div>
                    <div className="stat-item-large">
                      <span className="stat-value-large">{room.todayVisitors}</span>
                      <span className="stat-label-large">오늘 방문</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 큐레이션 갤러리 */}
      <div className="container gallery-section">
        <div className="gallery-controls">
          <div className="gallery-info">
            <h3 className="gallery-title">갤러리</h3>
            <span className="gallery-count">{curations.length}개 작품</span>
          </div>
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="그리드 뷰"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="리스트 뷰"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {curations.length === 0 ? (
          <div className="empty-gallery">
            <div className="empty-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" strokeWidth="1.5"/>
              </svg>
            </div>
            <p className="empty-text">아직 큐레이션이 없습니다.</p>
            {isOwnRoom && (
              <button className="btn-create-first" onClick={() => navigate('/curation/create')}>
                첫 번째 큐레이션 만들기
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="gallery-grid">
            {sortedCurations.map((curation) => (
              <CurationThumbnailCard
                key={curation.id}
                curation={curation}
                isPinned={pinnedCurations.includes(curation.id)}
              />
            ))}
          </div>
        ) : (
          <div className="gallery-list">
            {sortedCurations.map((curation) => (
              <CurationCard
                key={curation.id}
                curation={curation}
                onLike={() => {}}
                isLiked={likedMap[curation.id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
