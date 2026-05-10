/**
 * /history/country/:countryId/*  — 국가 상세 페이지 (events 외 모든 탭)
 *
 * 셸(좌측 리스트·모달·데이터)은 CountryDetailShell이 소유.
 * 이 페이지는 우측에 CountryDetail 위젯만 그린다.
 */
import { motion } from 'framer-motion'

import { CountryDetail } from '@/widgets/country/country-detail/ui/country-detail.widget'

import { CountryDetailShell } from './country-detail-shell'

export default function CountryDetailPage() {
  return (
    <CountryDetailShell
      renderRight={({
        selectedId,
        selectedCountry,
        continents,
        isLoading,
        notFound,
        initialDetailTab,
        handleDetailTabChange,
        onEdit,
        onDelete,
      }) => (
        <motion.div
          key={`detail-${selectedId}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          style={{ width: '100%', minHeight: '100%' }}
        >
          <CountryDetail
            country={selectedCountry || null}
            continents={continents}
            isLoading={isLoading}
            notFound={notFound}
            onEdit={onEdit}
            onDelete={onDelete}
            initialDetailTab={initialDetailTab}
            onDetailTabChange={handleDetailTabChange}
          />
        </motion.div>
      )}
    />
  )
}
