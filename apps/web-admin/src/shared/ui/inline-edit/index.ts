/**
 * 공용 인라인 편집 키트 — click-to-edit 상세 "문서" 토대.
 * 사건(events) 상세에서 출발해 기업 등 다른 상세 문서가 함께 쓰도록 승격.
 */
export { InlineText } from './inline-text'
export { InlineSelect, type InlineSelectOption } from './inline-select'
export {
  InlineDateRange,
  type DatePrecision,
  type DateRangePatch,
} from './inline-date-range'
export { InlineDate } from './inline-date'
export { InlineRichText } from './inline-rich-text'
export {
  InlineEditProvider,
  useInlineEditCoordinator,
  useInlineImageCategory,
} from './inline-edit-context'
export * as InlineStyles from './inline.styles'
