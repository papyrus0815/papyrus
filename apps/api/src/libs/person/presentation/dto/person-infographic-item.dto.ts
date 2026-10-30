import { Era } from './create-person.dto'

/**
 * 인물 인포그래픽 목록 아이템 (경량).
 *
 * 대시보드 인포그래픽(매트릭스·은하계·왕조·통계)의 `adapt()`가 실제로 읽는 최소 필드만 노출.
 * 전체 `PersonResponseDto`(countryAffiliations·재임 상세·도시/행정구역/직업 등 30~50+ 필드)와 달리,
 * 시각화 파생값 계산에 필요한 ~15개 필드만 담아 목록 payload를 대폭 축소한다.
 *
 * 국가는 서버에서 이름 해석(CITIZENSHIP 소속 → country FK → BIRTH_PLACE 순)을 끝낸 결과만 내려준다
 * (클라이언트에서 affiliations 체인을 다시 받지 않아도 됨).
 */
export interface PersonInfographicItemDto {
  id: string
  name: string
  surname: string | null
  middleName: string | null
  /** 개인 표시 순서 오버라이드 — 국가 기본(country.defaultNameDisplayOrder)보다 우선 */
  nameDisplayOrder: string | null
  birthEra: Era | null
  birthYear: number | null
  isBirthDateApproximate?: boolean
  deathEra: Era | null
  deathYear: number | null
  isDeathDateApproximate?: boolean
  isAlive: boolean
  influence: number | null
  /** 대표 왕호 — 저장 칸 아님, 가장 최근 재위의 왕호에서 파생 */
  regnalName: string | null
  profileImageUrl: string | null
  biography: string | null
  /** 이름 표시 순서·지역 분류용 소속 국가 (서버 해석 결과) */
  country: {
    name: string
    isoCode: string | null
    defaultNameDisplayOrder: string | null
  } | null
  /** 가문 (faction 라벨) */
  dynasty: { name: string } | null
  /** 분야·활동연도 분류용 재임 기록 (최소 필드) */
  governmentTenures: Array<{
    startDate: string | null
    endDate?: string | null
    positionType: string | null
    title: string | null
    positionDefinition: {
      title: string | null
      positionType: string | null
    } | null
  }>
  /** 군주 여부 판정용 재위 기록 수 (존재 여부만 필요 — 0 또는 1) */
  sovereignReignCount: number
  /** 생몰 미상 인물의 활동시기(floruit) — 시대·세기 폴백 산출용 */
  floruitStartYear?: number | null
  floruitEndYear?: number | null
  floruitEra?: Era | null
  /** 대표 직업명 (분야 분류 및 검색용) */
  jobTitle?: string | null
  /** 분야(정치·군사·사상·과학·예술) 정밀 분류를 위한 경력 유무 요약 */
  careerHints?: {
    military: boolean
    political: boolean
    academic: boolean
    religious: boolean
    artist: boolean
    science: boolean
    researchText?: string | null
  }
}
