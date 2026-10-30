/**
 * @deprecated 인물 고르기는 `@/shared/ui/person-picker`의 PersonPickerModal 하나로 통일됐다.
 * 이 경로·이름은 기존 호출부(19곳)를 위해 남긴 재수출이다 — 새 코드는 person-picker에서 가져올 것.
 *
 * 예전 이 파일(1,771줄)은 공용 <Modal> 밖에서 포털·포커스 트랩·Esc를 직접 다뤘다.
 */
export { PersonPickerModal as PersonSelectModal } from '../person-picker'
export type { PersonPickerModalProps as PersonSelectModalProps } from '../person-picker'
