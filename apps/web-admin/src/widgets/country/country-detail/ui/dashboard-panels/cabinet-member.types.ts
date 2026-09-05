/**
 * 행정부 한 자리 — 수반이든 각료든 같은 모양이다.
 *
 * 정권 패널과 마인드맵이 함께 쓰는 타입이라 별도 파일로 뺐다. 패널 파일에 두면
 * 마인드맵이 2,400줄짜리 패널을 값으로 import 하게 돼 순환이 생긴다.
 */
export interface CabinetMember {
  id: string
  personId: string | null
  name: string
  imageUrl: string | null
  title: string
  startDate: string | null
  isHead: boolean
  /** 종료일. 있으면 지난 정권이라 '몇 년째'가 아니라 기간으로 적는다 */
  endDate: string | null
  /** 제47대 — 없으면 null */
  termNumber: number | null
  /** 이 정부 임기 중에 앞사람을 이어받았는가 */
  replaced: boolean
  /** 그 자리를 앞서 맡았던 사람 */
  predecessor: string | null
}
