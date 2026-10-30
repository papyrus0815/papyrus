/**
 * 근거 용어 — 출처 등급·추정치 지위·산정 방식의 한국어 이름과 풀이. 화면마다 다르게 부르지 않게 한 곳에.
 */
import type { EstimateMethod, EstimateRole, SourceKind, SourceTier } from '@/shared/api/evidence'

/** 고를 수 있는 출처 종류 — '출처 미기재'는 시드 자리표시라 사람이 고르지 않는다 */
export const SOURCE_KIND_CHOICES: SourceKind[] = ['BOOK', 'ARTICLE', 'NEWS', 'OFFICIAL', 'ARCHIVE', 'DATASET', 'WEBSITE', 'OTHER']

export const SOURCE_TIER_LABEL: Record<SourceTier, string> = {
  PRIMARY: '1차 사료',
  SECONDARY: '2차 연구',
  TERTIARY: '3차 개설',
}

export const SOURCE_TIER_HINT: Record<SourceTier, string> = {
  PRIMARY: '그 시대에 쓰인 기록 — 공문서·일기·전투 보고·당대 신문',
  SECONDARY: '1차 사료를 읽고 쓴 연구 — 학술서·논문',
  TERTIARY: '연구를 다시 정리한 글 — 개설서·사전·백과',
}

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  BOOK: '단행본',
  ARTICLE: '논문',
  NEWS: '신문·기사',
  OFFICIAL: '공문서·공식 발표',
  DATASET: '통계·데이터셋',
  WEBSITE: '웹 문서',
  ARCHIVE: '문서고 자료',
  LEGACY_UNVERIFIED: '출처 미기재',
  OTHER: '기타',
}

export const ESTIMATE_ROLE_LABEL: Record<EstimateRole, string> = {
  PREFERRED: '채택',
  ALTERNATIVE: '다른 추정',
  DISPUTED: '논쟁 중',
}

export const ESTIMATE_ROLE_HINT: Record<EstimateRole, string> = {
  PREFERRED: '같은 지표의 여러 추정치 중 이 사건에서 기준으로 삼는 값 — 비교·해설·손실률이 이 값으로 계산된다',
  ALTERNATIVE: '다른 연구·사료가 내놓은 값 — 기준값과 나란히 보존한다',
  DISPUTED: '근거가 다투어지는 값 — 인용은 하되 기준으로 쓰지 않는다',
}

export const ESTIMATE_METHOD_LABEL: Record<EstimateMethod, string> = {
  COUNTED: '집계',
  ESTIMATED: '추정',
  EXTRAPOLATED: '외삽',
  OFFICIAL_CLAIM: '당사자 발표',
}

export const ESTIMATE_METHOD_HINT: Record<EstimateMethod, string> = {
  COUNTED: '명부·보고를 세어 낸 값',
  ESTIMATED: '부분 자료로 연구자가 어림한 값',
  EXTRAPOLATED: '다른 시기·지역의 비율을 넓혀 적용한 값',
  OFFICIAL_CLAIM: '교전 당사자가 공식 발표한 값 — 선전 목적으로 부풀리거나 줄였을 수 있다',
}
