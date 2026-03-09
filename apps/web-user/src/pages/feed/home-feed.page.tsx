import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { curationApi, CurationResponse } from '@/shared/api/curation'
import { socialApi } from '@/shared/api/social'
import { CurationCard } from '@/shared/components/curation-card'
import './home-feed.css'

// 목업 데이터 생성 함수
const generateMockCurations = (count: number = 10): CurationResponse[] => {
  const mockUsers = [
    { id: 'user001', name: '김철수' },
    { id: 'user002', name: '이영희' },
    { id: 'user003', name: '박민수' },
    { id: 'user004', name: '최지영' },
    { id: 'user005', name: '정대현' },
    { id: 'user006', name: '한소연' },
    { id: 'user007', name: '송태현' },
    { id: 'user008', name: '윤서아' },
  ]

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
  ]

  const mockContents = [
    '조선 시대의 정치 체제는 유교적 이상에 기반하여 건국되었습니다. 왕권 중심의 중앙집권 체제가 확립되었고, 신하들의 간쟁을 통한 권력 견제 시스템이 작동했습니다. 이는 동아시아 역사상 매우 특징적인 정치 구조였습니다.',
    '1592년 임진왜란이 발발하면서 조선은 위기에 빠졌습니다. 하지만 이순신 장군의 탁월한 전략과 함대 지휘 능력으로 전세를 역전시켰습니다. 특히 거북선을 활용한 해전 전술은 세계 해전사에 길이 남을 전략이었습니다.',
    '고려 시대는 불교가 국가 종교로 자리 잡았던 시기입니다. 대장경 제작, 고려청자, 불화 등 불교 문화가 예술 전반에 깊이 영향을 미쳤습니다. 특히 팔만대장경은 세계 기록 유산으로 인정받았습니다.',
    '일제 강점기 동안 많은 독립운동가들이 목숨을 바쳐 조국의 독립을 위해 싸웠습니다. 안중근, 윤봉길, 이봉창 등 수많은 선열들의 희생이 오늘의 대한민국을 있게 했습니다.',
    '1950년 6월 25일 발발한 한국 전쟁은 한반도를 분단으로 고착화시켰습니다. 3년간의 전쟁 끝에 휴전 협정이 체결되었지만, 평화 협정은 아직까지 체결되지 않았습니다.',
    '신라의 금관은 고대 동아시아 금속 공예의 정수로 평가받습니다. 특히 금관총에서 발견된 금관은 신라의 문화적 수준과 예술적 완성도를 보여주는 대표적인 유물입니다.',
    '백제는 해상 교역을 통해 일본과 중국, 동남아시아와 활발히 교류했습니다. 특히 문화 전달의 중개 역할을 하며 동아시아 문화권의 형성에 큰 기여를 했습니다.',
    '고구려는 5세기 전성기를 맞아 동아시아의 강대국으로 부상했습니다. 광개토대왕과 장수왕 시대에 영토를 크게 확장하며 중국과 맞서 싸운 강력한 제국이 되었습니다.',
    '1948년 제정된 대한민국 헌법은 대한민국의 법적 기초가 되었습니다. 이는 민주주의와 인권을 보장하는 근본 법전으로, 이후 여러 차례 개정되어 오늘에 이르렀습니다.',
    '한반도 분단은 냉전 체제의 직접적인 결과였습니다. 이후 수많은 통일 운동이 있었지만, 아직까지 통일은 이루어지지 않았고, 평화 통일을 향한 노력이 계속되고 있습니다.',
  ]

  const mockTags = [
    ['조선', '정치', '유교'],
    ['임진왜란', '이순신', '해전'],
    ['고려', '불교', '문화'],
    ['독립운동', '일제강점기', '역사'],
    ['한국전쟁', '분단', '휴전'],
    ['신라', '금관', '고대'],
    ['백제', '교류', '문화'],
    ['고구려', '제국', '강대국'],
    ['헌법', '민주주의', '법률'],
    ['분단', '통일', '평화'],
  ]

  const curations: CurationResponse[] = []

  for (let i = 0; i < count; i++) {
    const user = mockUsers[i % mockUsers.length]
    const daysAgo = Math.floor(Math.random() * 30)
    const createdAt = new Date()
    createdAt.setDate(createdAt.getDate() - daysAgo)
    const publishedAt = new Date(createdAt.getTime() + Math.random() * 3600000)

    const mockSources = [
      ['한국사 데이터베이스', '한국민족문화대백과사전'],
      ['국사편찬위원회', '한국학중앙연구원'],
      ['네이버 지식백과', '다음 백과'],
      ['위키피디아', '브리태니커 백과사전'],
      ['한국사 연표', '역사학연구소'],
    ]

    curations.push({
      id: `mock-curation-${i + 1}`,
      userId: user.id,
      keywords: mockTags[i % mockTags.length].join(', '),
      title: mockTitles[i % mockTitles.length],
      content: mockContents[i % mockContents.length],
      visibility: 'PUBLIC',
      status: 'PUBLISHED',
      viewCount: Math.floor(Math.random() * 1000) + 10,
      likeCount: Math.floor(Math.random() * 500) + 5,
      commentCount: Math.floor(Math.random() * 100),
      createdAt: createdAt.toISOString(),
      publishedAt: publishedAt.toISOString(),
    })
  }

  return curations
}

// 목업 스토리 사용자 데이터
const generateMockStories = () => {
  return [
    { id: 'story1', name: '김철수', initials: '김철' },
    { id: 'story2', name: '이영희', initials: '이영' },
    { id: 'story3', name: '박민수', initials: '박민' },
    { id: 'story4', name: '최지영', initials: '최지' },
    { id: 'story5', name: '정대현', initials: '정대' },
    { id: 'story6', name: '한소연', initials: '한소' },
    { id: 'story7', name: '송태현', initials: '송태' },
    { id: 'story8', name: '윤서아', initials: '윤서' },
  ]
}

// 목업 추천 사용자 데이터
const generateMockSuggestions = () => {
  return [
    { id: 'sug1', name: '김철수', subtitle: '회원님을 아는 사람' },
    { id: 'sug2', name: '이영희', subtitle: '회원님을 위한 추천' },
    { id: 'sug3', name: '박민수', subtitle: '팔로워 1,234명' },
    { id: 'sug4', name: '최지영', subtitle: '회원님을 위한 추천' },
    { id: 'sug5', name: '정대현', subtitle: '회원님을 아는 사람' },
  ]
}

export function HomeFeedPage() {
  const navigate = useNavigate()
  const [curations, setCurations] = useState<CurationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({})
  const [user, setUser] = useState<any>(null)
  const [mockStories] = useState(generateMockStories())
  const [mockSuggestions] = useState(generateMockSuggestions())

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 가져오기
    const userStr = localStorage.getItem('user')
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
      navigate('/login')
      return
    }

    try {
      const userData = JSON.parse(userStr)
      setUser(userData)
      loadCurations()
    } catch (error) {
      console.error('Failed to parse user data:', error)
      localStorage.removeItem('user')
      navigate('/login')
    }
  }, [])

  const loadCurations = async () => {
    try {
      setLoading(true)

      // 목업 데이터 사용 (개발용)
      const mockData = generateMockCurations(15)
      setCurations(mockData)

      // 좋아요 상태 확인 (목업 데이터용 - 랜덤하게 설정)
      const likedStatus: Record<string, boolean> = {}
      for (const curation of mockData) {
        likedStatus[curation.id] = Math.random() > 0.7
      }
      setLikedMap(likedStatus)

      // 실제 API 호출 주석 처리 (필요시 활성화)
      // const data = await curationApi.getCurations(1, 20)
      // setCurations(data.curations)
      // for (const curation of data.curations) {
      //   try {
      //     const { isLiked } = await socialApi.isLiked(curation.id)
      //     likedStatus[curation.id] = isLiked
      //   } catch {
      //     likedStatus[curation.id] = false
      //   }
      // }
    } catch (error) {
      console.error('Failed to load curations:', error)
      // 에러 발생 시 목업 데이터 사용
      const mockData = generateMockCurations(15)
      setCurations(mockData)
      const likedStatus: Record<string, boolean> = {}
      for (const curation of mockData) {
        likedStatus[curation.id] = Math.random() > 0.7
      }
      setLikedMap(likedStatus)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (curationId: string) => {
    try {
      // 목업 모드: API 호출 없이 로컬 상태만 업데이트
      if (likedMap[curationId]) {
        // 실제 API 호출 주석 처리
        // await socialApi.unlike(curationId)
        setLikedMap({ ...likedMap, [curationId]: false })
        setCurations(
          curations.map((c) =>
            c.id === curationId ? { ...c, likeCount: c.likeCount - 1 } : c,
          ),
        )
      } else {
        // 실제 API 호출 주석 처리
        // await socialApi.like(curationId)
        setLikedMap({ ...likedMap, [curationId]: true })
        setCurations(
          curations.map((c) =>
            c.id === curationId ? { ...c, likeCount: c.likeCount + 1 } : c,
          ),
        )
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="home-feed-page">
        <div className="container">
          <div className="loading">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="home-feed-page">
      <header className="main-header">
        <div className="container header-content">
          <h1 className="logo" onClick={() => navigate('/')}>
            Evolution
          </h1>
          <div className="search-bar">
            <svg
              className="search-icon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z"
                stroke="#8e8e8e"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 14L11.1 11.1"
                stroke="#8e8e8e"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input type="text" placeholder="검색" className="search-input" />
          </div>
          <nav className="nav">
            <button
              className="nav-icon"
              onClick={() => navigate('/')}
              title="홈"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9.02 2.84004L3.63 7.04004C2.73 7.74004 2 9.23004 2 10.36V17.77C2 20.09 3.89 21.99 6.21 21.99H17.79C20.11 21.99 22 20.09 22 17.78V10.5C22 9.29004 21.19 7.74004 20.2 7.05004L14.02 2.72004C12.62 1.74004 10.37 1.79004 9.02 2.84004Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 17.99V14.99"
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
            <button
              className="nav-icon"
              onClick={() => navigate(`/room/${user?.id}`)}
              title="프로필"
            >
              <div className="nav-avatar">
                {user?.displayName?.substring(0, 1).toUpperCase() || 'U'}
              </div>
            </button>
          </nav>
        </div>
      </header>

      <div className="container main-container">
        <div className="feed-section">
          <div className="stories-section">
            <div className="story-item">
              <div className="story-avatar">
                <div className="story-avatar-inner">
                  {user?.displayName?.substring(0, 2).toUpperCase() || 'U'}
                </div>
              </div>
              <div className="story-username">내 스토리</div>
            </div>
            {mockStories.map((story) => (
              <div key={story.id} className="story-item">
                <div className="story-avatar">
                  <div className="story-avatar-inner">{story.initials}</div>
                </div>
                <div className="story-username">{story.name}</div>
              </div>
            ))}
          </div>

          {curations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrapper">
                <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
                  <circle
                    cx="48"
                    cy="48"
                    r="47"
                    stroke="#262626"
                    strokeWidth="2"
                  />
                  <path
                    d="M48 32V48L58 58"
                    stroke="#262626"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="48" cy="48" r="4" fill="#262626" />
                </svg>
              </div>
              <h3 className="empty-title">게시물 없음</h3>
              <p className="empty-description">
                아직 아무도 글을 공유하지 않았습니다.
              </p>
            </div>
          ) : (
            <div className="curations-list">
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
        </div>

        <aside className="sidebar">
          <div className="sidebar-profile">
            {user && (
              <>
                <div className="sidebar-user-header">
                  <div className="sidebar-user-avatar">
                    {user.displayName?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div className="sidebar-user-info">
                    <div className="sidebar-user-name">{user.displayName}</div>
                    <div className="sidebar-user-email">{user.email}</div>
                  </div>
                  <button className="switch-btn" onClick={handleLogout}>
                    전환
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="sidebar-suggestions">
            <div className="suggestions-header">
              <span className="suggestions-title">회원님을 위한 추천</span>
              <button className="see-all-btn">모두 보기</button>
            </div>
            <div className="suggestions-list">
              {mockSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="suggestion-item">
                  <div className="suggestion-avatar">
                    {suggestion.name.substring(0, 2)}
                  </div>
                  <div className="suggestion-info">
                    <div className="suggestion-name">{suggestion.name}</div>
                    <div className="suggestion-subtitle">
                      {suggestion.subtitle}
                    </div>
                  </div>
                  <button className="follow-btn">팔로우</button>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="footer-links">
              <a href="#">소개</a>
              <a href="#">도움말</a>
              <a href="#">홍보 센터</a>
              <a href="#">API</a>
              <a href="#">채용 정보</a>
              <a href="#">개인정보처리방침</a>
              <a href="#">약관</a>
              <a href="#">위치</a>
              <a href="#">언어</a>
            </div>
            <div className="footer-copyright">© 2025 EVOLUTION</div>
          </div>
        </aside>
      </div>

      <div className="mobile-nav">
        <button className="mobile-nav-item" onClick={() => navigate('/')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M9.02 2.84004L3.63 7.04004C2.73 7.74004 2 9.23004 2 10.36V17.77C2 20.09 3.89 21.99 6.21 21.99H17.79C20.11 21.99 22 20.09 22 17.78V10.5C22 9.29004 21.19 7.74004 20.2 7.05004L14.02 2.72004C12.62 1.74004 10.37 1.79004 9.02 2.84004Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="mobile-nav-item">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M7 12L12 12M12 12L17 12M12 12L12 7M12 12L12 17"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          className="mobile-nav-item"
          onClick={() => navigate('/curation/create')}
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
          </svg>
        </button>
        <button className="mobile-nav-item">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12.02 2.91C8.71 2.91 6.02 5.6 6.02 8.91C6.02 12.16 8.61 14.79 11.81 14.9C11.93 14.89 12.05 14.89 12.15 14.9C12.17 14.9 12.18 14.9 12.19 14.9C12.2 14.9 12.2 14.9 12.21 14.9C15.37 14.79 17.96 12.16 17.97 8.91C17.97 5.6 15.28 2.91 12.02 2.91Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18.74 19.38C15.48 21.76 11.51 21.76 8.24 19.38C8.46 17.85 9.37 16.35 10.98 15.22C13.87 13.15 16.15 13.15 19 15.22C20.61 16.35 21.52 17.85 21.74 19.38"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          className="mobile-nav-item"
          onClick={() => navigate(`/room/${user?.id}`)}
        >
          <div className="mobile-nav-avatar">
            {user?.displayName?.substring(0, 1).toUpperCase() || 'U'}
          </div>
        </button>
      </div>
    </div>
  )
}
