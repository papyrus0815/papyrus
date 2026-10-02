/**
 * 지면 안 앵커로 부드럽게 이동 — 목차·개요 장부·'채우기'가 함께 쓴다.
 *
 * ⚠️ 왜 한 번 더 맞추나. 본문 읽기 뷰(RichTextReadView)는 `content-visibility: auto` +
 *    `contain-intrinsic-size: 600px`라, 화면 밖 단락은 실제 높이가 아니라 600px로 자리를
 *    잡고 있다가 스크롤이 지나가며 렌더될 때 진짜 높이로 바뀐다. smooth 스크롤은 출발 시점의
 *    좌표로 목표를 정하므로, 도중에 위쪽 문서가 줄면 목표를 **지나친다**(톨비악 전투에서
 *    '여파 쓰기'를 누르면 문서가 4,609 → 3,800px로 줄며 여파 머리가 화면 위 -53px에 섰다).
 *    스크롤이 멈춘 뒤 다시 재서 어긋났으면 즉시 한 번 더 맞춘다.
 */
export function scrollToAnchor(
  anchorId: string,
  options: { block?: ScrollLogicalPosition; updateHash?: boolean } = {},
) {
  const { block = 'start', updateHash = true } = options
  const target = document.getElementById(anchorId)
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block })
  if (updateHash) window.history.replaceState(null, '', `#${anchorId}`)

  let settled = false
  const realign = () => {
    if (settled) return
    settled = true
    document.removeEventListener('scrollend', realign, { capture: true })
    document.getElementById(anchorId)?.scrollIntoView({ behavior: 'auto', block })
  }
  /* 'scrollend'가 있으면 그때 맞추고, 없거나(구형 Safari) 이미 제자리라 스크롤이 일어나지
     않아 이벤트가 오지 않으면 타이머가 맡는다. */
  if ('onscrollend' in window) {
    document.addEventListener('scrollend', realign, { capture: true, once: true })
  }
  window.setTimeout(realign, 900)
}
