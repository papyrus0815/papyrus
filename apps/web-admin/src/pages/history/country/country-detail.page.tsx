/**
 * /history/country[/:countryId/(default)] — 국가 상세 페이지의 우측 콘텐츠.
 *
 * Shell이 layout route로 동작하므로 이 컴포넌트는 motion wrapper나 데이터 fetch 없이
 * args만 소비해 CountryDetail 위젯을 렌더한다.
 */
import { CountryDetail } from '@/widgets/country/country-detail/ui/country-detail.widget'

import { useCountryDetailShellContext } from './country-detail-shell'

export default function CountryDetailPage() {
  const {
    selectedCountry,
    continents,
    isInitialLoading,
    notFound,
    initialDetailTab,
    handleDetailTabChange,
    onEdit,
    onDelete,
  } = useCountryDetailShellContext()

  return (
    <CountryDetail
      country={selectedCountry || null}
      continents={continents}
      isLoading={isInitialLoading}
      notFound={notFound}
      onEdit={onEdit}
      onDelete={onDelete}
      initialDetailTab={initialDetailTab}
      onDetailTabChange={handleDetailTabChange}
    />
  )
}
