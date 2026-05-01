export const ERAS = [
  { key: 'ancient', lbl: '고대', from: -800, to: 500, color: '#f59e0b' },
  { key: 'medieval', lbl: '중세', from: 500, to: 1500, color: '#ef4444' },
  { key: 'early', lbl: '근세', from: 1500, to: 1800, color: '#10b981' },
  { key: 'modern19', lbl: '근대 19c', from: 1800, to: 1900, color: '#3b82f6' },
  { key: 'modern20', lbl: '현대 20c', from: 1900, to: 2000, color: '#6366f1' },
  { key: 'contemp', lbl: '당대', from: 2000, to: 2100, color: '#8b5cf6' },
] as const

export const REGIONS = [
  '동아시아',
  '유럽',
  '미주',
  '남아시아',
  '서아시아',
  '아프리카',
  '기타',
]

export const REGION_COLORS = [
  '#6366f1',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#06b6d4',
  '#8b5cf6',
  '#64748b',
]

export const FIELDS = ['정치', '군사', '사상', '과학', '예술', '기타']

/**
 * 인포그래픽 뷰 공용 상수.
 * 매트릭스/은하계/스토리/통계가 공유하는 임계값·기본값 — 한 곳에서 조정.
 */
export const INFOGRAPHIC_DEFAULTS = {
  /** HeaderStats 시대 밀도 차트 bin 개수 */
  ERA_DENSITY_BINS: 42,
  /** HeaderStats 상위 국가 기본/펼침 개수 */
  TOP_COUNTRY_DEFAULT: 6,
  TOP_COUNTRY_EXPANDED: 15,
  /** Matrix 뷰 — 기본 표시 국가 개수 (top N) */
  MATRIX_COUNTRY_TOP_N: 20,
  /** EraStory·Dynasty — 그룹별 기본 표시 인원 (이상이면 더보기 토글) */
  GROUP_TOP_N: 20,
  /** Galaxy 라벨 — 영향력 임계, 라벨 최대 표시 수, x/y 충돌 거리 */
  GALAXY_LABEL_MIN_INFLUENCE: 60,
  GALAXY_LABEL_MAX: 50,
  GALAXY_LABEL_MIN_X_DIST: 52,
  GALAXY_LABEL_Y_BAND: 14,
  /** Galaxy 점 jitter 범위 (px) */
  GALAXY_JITTER_RANGE: 6,
  /** Galaxy density underlay 발동 인물 수 */
  GALAXY_DENSITY_THRESHOLD: 300,
  GALAXY_DENSITY_BIN_SIZE: 36,
  /** 차트 높이 (vh 비율 + 상하한) */
  GALAXY_CHART_H_VH_RATIO: 0.9,
  GALAXY_CHART_H_MIN: 640,
  GALAXY_CHART_H_MAX: 1100,
  /** Resize 이벤트 throttle ms */
  RESIZE_THROTTLE_MS: 120,
} as const

export const COUNTRY_REGION: Record<string, string> = {
  대한민국: '동아시아', 조선: '동아시아', 고려: '동아시아', 신라: '동아시아',
  백제: '동아시아', 고구려: '동아시아', 북한: '동아시아',
  중국: '동아시아', 청: '동아시아', 청나라: '동아시아', 명: '동아시아', 송: '동아시아',
  일본: '동아시아', 일본제국: '동아시아', 베트남: '동아시아', 몽골: '동아시아',
  러시아: '유럽', 소련: '유럽', 독일: '유럽', 프로이센: '유럽',
  프랑스: '유럽', 영국: '유럽', 그레이트브리튼: '유럽',
  이탈리아: '유럽', 로마: '유럽',
  스페인: '유럽', 오스트리아: '유럽', 헝가리: '유럽', 폴란드: '유럽',
  스웨덴: '유럽', 덴마크: '유럽', 네덜란드: '유럽', 그리스: '유럽',
  세르비아: '유럽', 유고: '유럽', 불가리아: '유럽', 루마니아: '유럽',
  미국: '미주', 캐나다: '미주', 멕시코: '미주', 브라질: '미주',
  아르헨티나: '미주', 쿠바: '미주', 콜롬비아: '미주',
  인도: '남아시아', 파키스탄: '남아시아', 방글라데시: '남아시아',
  튀르키예: '서아시아', 이란: '서아시아', 이라크: '서아시아', 오스만: '서아시아',
  이집트: '아프리카', 남아공: '아프리카', 에티오피아: '아프리카',
}
