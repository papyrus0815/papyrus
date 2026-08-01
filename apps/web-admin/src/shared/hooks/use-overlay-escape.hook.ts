/**
 * 지역 오버레이(팝오버·드롭다운·메뉴)의 Escape 처리 — **전파를 반드시 끊는다**.
 *
 * ## 왜 필요한가
 *
 * 카탈로그 페이지는 window에 Escape 핸들러를 하나 두고 "열린 레이어가 있으면 그것 하나만
 * 닫고, 없으면 선택 해제"라는 우선순위를 관리한다. 그런데 그 스택이 아는 레이어는
 * `useCatalogModals`가 소유한 모달 4종뿐이고, 필터 팝오버·'더보기' 메뉴·'최근' 드롭다운은
 * 각자 document에 리스너를 걸어 놓고 전파를 끊지 않았다.
 *
 * document → window 순서로 전파되므로 Esc 한 번에 **두 핸들러가 모두** 실행됐다.
 * 결과: 사건을 열어 둔 채 팝오버를 Esc로 닫으면 보고 있던 사건의 선택까지 함께 풀려
 * 우측 상세가 사라졌다(검토 INT-1). 배치1이 팝오버 클리핑을 고쳐 팝오버가 실제로 열리게
 * 되면서 이 경로가 비로소 도달 가능해졌다.
 *
 * ## 계약
 *
 * 지역 오버레이는 이 훅을 써서 Escape를 처리한다. 훅은 오버레이를 닫고
 * `stopPropagation()`으로 window 핸들러가 같은 키를 다시 해석하지 못하게 막는다.
 * (document 리스너에서의 stopPropagation은 이후 경로인 window의 리스너를 막는다.)
 *
 * 공용 `<Modal>`/`useModalBehavior`를 쓰는 오버레이는 이미 컨테이너 바인딩 +
 * stopPropagation 규약을 지키므로 이 훅이 필요 없다.
 */
import { useEffect } from 'react'

export function useOverlayEscape(open: boolean, close: () => void): void {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // 이 Esc는 여기서 소비됐다 — 상위(window) 핸들러가 선택 해제로 재해석하면 안 된다.
      event.stopPropagation()
      close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])
}
