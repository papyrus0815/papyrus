import React from 'react'

function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <h1 className="logo">Evolution</h1>
          <nav className="nav">
            <a href="/">홈</a>
            <a href="/discover">발견</a>
            <a href="/search">검색</a>
            <a href="/login">로그인</a>
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <section className="hero">
            <h2 className="hero-title">
              역사를 큐레이션하고,
              <br />
              당신만의 역사 공간을 만드세요
            </h2>
            <p className="hero-description">
              역사적 인물, 사건, 국가에 대한 지식을 모으고 공유하는
              <br />
              소셜 큐레이션 플랫폼
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary">시작하기</button>
              <button className="btn btn-secondary">더 알아보기</button>
            </div>
          </section>

          <section className="features">
            <h3 className="section-title">주요 기능</h3>
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">📚</div>
                <h4>항목 큐레이션</h4>
                <p>역사적 인물, 사건, 국가 정보를 자유롭게 큐레이션하세요</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🏛️</div>
                <h4>나만의 방</h4>
                <p>싸이월드처럼 나만의 역사 공간을 꾸미고 관리하세요</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔍</div>
                <h4>항목 피드</h4>
                <p>관심있는 역사 항목의 다양한 해석을 탐색하세요</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💬</div>
                <h4>소셜 네트워크</h4>
                <p>역사 애호가들과 소통하고 지식을 공유하세요</p>
              </div>
            </div>
          </section>

          <section className="status">
            <div className="status-card">
              <p className="status-label">프로젝트 상태</p>
              <p className="status-value">🚧 개발 중</p>
              <p className="status-description">
                사용자 앱 (web-user) 초기 구조가 생성되었습니다.
                <br />
                다음 단계: DB 스키마 설계 및 API 개발
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>&copy; 2025 Evolution Team. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default App

