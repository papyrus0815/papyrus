import type { IconType } from 'react-icons'
import {
  FiBook,
  FiCpu,
  FiGlobe,
  FiHeart,
  FiMessageSquare,
  FiMoreHorizontal,
  FiShield,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi'

import { HistoricalEventCategory } from './events.types'

/**
 * 카테고리 라벨 매핑 (레거시 호환용)
 * 서버에서 받은 카테고리 이름을 그대로 표시하므로 더 이상 필요하지 않습니다.
 */
export const CATEGORY_LABEL: Partial<Record<string, string>> = {
  military: '군사',
  정치: '정치',
  경제: '경제',
  사회: '사회',
  기술: '기술',
  문화: '문화',
  외교: '외교',
  회담: '회담',
  종교: '종교',
  기타: '기타',
}

/**
 * 카테고리별 아이콘 매핑
 * 매핑되지 않은 카테고리는 기본 아이콘(FiFileText)을 사용합니다.
 */
export const CATEGORY_ICON_MAP: Partial<Record<string, IconType>> = {
  military: FiShield,
  군사: FiShield,
  political: FiUsers,
  정치: FiUsers,
  economic: FiTrendingUp,
  경제: FiTrendingUp,
  social: FiGlobe,
  사회: FiGlobe,
  technological: FiCpu,
  기술: FiCpu,
  과학기술: FiCpu,
  cultural: FiBook,
  문화: FiBook,
  diplomatic: FiGlobe,
  외교: FiGlobe,
  conference: FiMessageSquare,
  회담: FiMessageSquare,
  religious: FiHeart,
  종교: FiHeart,
  other: FiMoreHorizontal,
  기타: FiMoreHorizontal,
}
