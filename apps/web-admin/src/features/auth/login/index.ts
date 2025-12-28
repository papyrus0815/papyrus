/**
 * 로그인 기능 Public API
 * FSD: Features - 외부에 노출할 API만 선별 export
 */

// 메인 기능 컴포넌트
export { LoginFormFeature } from './ui/login-feature'

// 개별 UI 컴포넌트 (Pages에서 조합용)
export { BackgroundSlideshow } from './ui/background-slideshow'
export { ParticleSystem } from './ui/particle-system'
export { WelcomeSection } from './ui/welcome-section'

// 커스텀 훅 (다른 features에서 재사용 가능)
export { useErrorHandler } from './model/use-error-handler.hook'
export { useBackgroundSlideshow } from './model/use-background-slideshow.hook'
