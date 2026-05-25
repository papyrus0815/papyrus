import { LoaderFunctionArgs } from 'react-router'

/**
 * 🔄 Continents 페이지 로더
 * 대륙 목록 및 관련 데이터를 미리 로드
 */
export async function continentsLoader({
  request,
  params,
}: LoaderFunctionArgs) {
  // TODO: API에서 대륙 목록 가져오기
  // const continents = await fetchContinents()

  return {
    timestamp: new Date().toISOString(),
    // continents,
  }
}
