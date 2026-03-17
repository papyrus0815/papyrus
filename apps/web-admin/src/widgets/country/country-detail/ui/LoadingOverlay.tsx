import { motion } from 'framer-motion'

import * as CountryStyles from './country-detail.styles'

interface LoadingOverlayProps {
  message?: string
}

/**
 * 로딩 오버레이
 * @param message 로딩 메시지
 * @returns 로딩 오버레이
 */
export function LoadingOverlay({
  message = '정보를 불러오는 중...',
}: LoadingOverlayProps) {
  return (
    <CountryStyles.LoadingOverlay
      as={motion.div}
      key="loading"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
    >
      <CountryStyles.LoadingSpinner>
        <CountryStyles.LoadingSpinnerInner />
      </CountryStyles.LoadingSpinner>
      <CountryStyles.LoadingText>{message}</CountryStyles.LoadingText>
    </CountryStyles.LoadingOverlay>
  )
}
