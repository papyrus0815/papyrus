import { LoaderFunctionArgs } from 'react-router'

/**
 * 🔄 Country 페이지 로더
 * 국가 목록 및 관련 데이터를 미리 로드
 */
export async function countryLoader({ request, params }: LoaderFunctionArgs) {
  // TODO: API에서 국가 목록 가져오기
  // const countries = await fetchCountries()

  return {
    timestamp: new Date().toISOString(),
    // countries,
  }
}
