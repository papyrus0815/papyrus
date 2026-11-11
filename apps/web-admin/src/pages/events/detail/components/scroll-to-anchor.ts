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
/**
 * 앵커가 줄여 둔 영역(긴 배경의 '줄여 보기') 안에 있으면 먼저 펼치라고 알린다.
 * 버블링 DOM 이벤트라 목차·장부·해시 진입이 줄여 보기의 상태를 몰라도 된다 — 받는 쪽은
 * 그 자리에서 flushSync로 펼쳐, 이어지는 scrollIntoView가 펼친 뒤의 좌표를 재게 한다.
 */
export const REVEAL_ANCHOR_EVENT = 'papyrus:reveal-anchor'

/**
 * 앵커가 아예 그려져 있지 않을 때(접힌 국면·접힌 묶음 안의 하위 사건) — 그 앵커를 가진 쪽이 펼치라고 알린다.
 * 받는 쪽은 flushSync로 펼쳐, 바로 이어지는 getElementById가 펼친 뒤의 요소를 찾게 한다.
 * 예전엔 목차에서 접힌 하위를 누르면 아무 일도 없었다(제헌국민의회기 '국면만'에서 '바스티유 감옥 습격' → 이동 0px).
 */
export const REVEAL_MISSING_ANCHOR_EVENT = 'papyrus:reveal-missing-anchor'

export function revealAnchor(target: HTMLElement) {
  target.dispatchEvent(new CustomEvent(REVEAL_ANCHOR_EVENT, { bubbles: true }))
}

export function scrollToAnchor(
  anchorId: string,
  options: { block?: ScrollLogicalPosition; updateHash?: boolean } = {},
) {
  const { block = 'start', updateHash = true } = options
  let target = document.getElementById(anchorId)
  /* 접힌 자리('찾으면 펼쳐지는 숨김')에 든 앵커는 좌표가 없다 — 그려지지 않은 것과 같이 펼쳐 달라고 한다 */
  if (!target || target.closest('[hidden]')) {
    window.dispatchEvent(new CustomEvent(REVEAL_MISSING_ANCHOR_EVENT, { detail: { anchorId } }))
    target = document.getElementById(anchorId)
  }
  if (!target || target.closest('[hidden]')) return
  revealAnchor(target)
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
