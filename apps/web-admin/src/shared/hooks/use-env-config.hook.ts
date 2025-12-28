import { useState, useEffect } from 'react'

interface EnvConfig {
  VITE_API_BASE_URL?: string
  // 필요한 다른 환경 변수들 추가
}

interface UseEnvConfigReturn {
  missingEnvKeys: string[]
  hasRequiredEnvs: boolean
  showModal: boolean
  closeModal: () => void
}

const REQUIRED_ENV_KEYS = [
  'VITE_API_BASE_URL',
  // 필요한 다른 환경 변수들 추가
] as const

/**
 * 환경 변수 설정 상태를 체크하고 관리하는 훅
 */
export function useEnvConfig(): UseEnvConfigReturn {
  const [showModal, setShowModal] = useState(false)
  const [missingEnvKeys, setMissingEnvKeys] = useState<string[]>([])

  useEffect(() => {
    const missing: string[] = []

    REQUIRED_ENV_KEYS.forEach((key) => {
      const value = import.meta.env[key]
      if (!value || value.trim() === '') {
        missing.push(key)
      }
    })

    setMissingEnvKeys(missing)

    // 개발 환경에서는 콘솔 경고만 표시하고 모달은 띄우지 않음
    if (missing.length > 0) {
      console.warn('⚠️ 누락된 환경 변수:', missing)
      console.warn('💡 .env 파일을 생성하고 다음 변수들을 설정하세요:')
      missing.forEach((key) => {
        console.warn(`   ${key}=your_value_here`)
      })

      // 프로덕션 환경에서만 모달 표시
      if (import.meta.env.PROD) {
        setShowModal(true)
      }
    }
  }, [])

  const closeModal = () => {
    setShowModal(false)
  }

  return {
    missingEnvKeys,
    hasRequiredEnvs: missingEnvKeys.length === 0,
    showModal,
    closeModal,
  }
}

export default useEnvConfig
