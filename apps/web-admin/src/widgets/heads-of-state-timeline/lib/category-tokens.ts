/**
 * re-export shim — 실체는 entities/government-position/model/category-tokens로 승격됨
 * (인물 상세 동시대 수장 스트립과 색·라벨을 공유하기 위해). 위젯 내부 import 경로는
 * 무변경 유지. PositionTypeCategory는 PositionCategory의 별칭이라 타입 호환.
 */
export {
  CATEGORY_TOKENS,
  categoryBarStyle,
  categoryGlyph,
  categoryLabel,
} from '@/entities/government-position/model/category-tokens'
export type { CategoryToken } from '@/entities/government-position/model/category-tokens'
