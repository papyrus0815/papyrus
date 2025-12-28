import React, { useState } from 'react'

import { useNavigate } from 'react-router-dom'

import { authApi } from '@/shared/api/auth'

import './auth.css'

export function LoginPage() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    bio: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        const result = await authApi.login({
          email: formData.email,
          password: formData.password,
        })
        console.log('✅ Login success:', result)

        // user가 존재하는지 확인
        if (result && result.user) {
          localStorage.setItem('user', JSON.stringify(result.user))
          navigate('/')
        } else {
          setError('로그인 응답이 올바르지 않습니다.')
        }
      } else {
        const result = await authApi.register({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
          bio: formData.bio,
        })
        console.log('✅ Register success:', result)
        alert('회원가입이 완료되었습니다! 로그인해주세요.')
        setIsLogin(true)
      }
    } catch (err: any) {
      console.error('❌ Auth error:', err)
      setError(
        err.response?.data?.message || err.message || '오류가 발생했습니다.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-logo">Evolution</h1>
          <p className="auth-subtitle">역사 소셜 큐레이션 플랫폼</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            로그인
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            회원가입
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label>이메일</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              placeholder="user1@test.com"
            />
          </div>

          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              placeholder="password123"
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label>닉네임</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  required
                  placeholder="역사덕후"
                />
              </div>

              <div className="form-group">
                <label>자기소개 (선택)</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  placeholder="역사를 사랑하는 사람입니다."
                  rows={3}
                />
              </div>
            </>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
          </button>
        </form>

        <div className="auth-footer">
          <p className="test-info">
            🧪 테스트 계정: user1@test.com / password123
          </p>
        </div>
      </div>
    </div>
  )
}
