/**
 * /history/country — 국가 탐색 풀스크린 페이지
 *
 * 현대/역사 국가를 카드 그리드로 표시. 상세 페이지(/history/country/:id)와 별도 레이아웃.
 * HistoryShell을 fullScreen 모드로 사용해 CountryListStateProvider만 공유.
 */
import { HistoryShell } from '@/widgets/history-shell'
import { CountryBrowseView } from '@/widgets/country-browse'

export default function CountryBrowsePage() {
  return (
    <HistoryShell fullScreen right={<CountryBrowseView />} />
  )
}
