/**
 * 에디터 내 이미지(figure) 4코너 리사이즈 훅 — PointerEvent(터치/펜) + rAF 스로틀.
 * 저장 시 width(px)만 인라인으로 박고 height는 img.aspect-ratio로 산출 → 좁은 화면에서
 * max-width:100%로 줄어도 비율 유지. 새 이미지는 MutationObserver로 자동 추적.
 * editorRef만 의존하는 self-contained effect라 컴포넌트 밖 훅으로 분리(마운트 1회).
 * (원본: rich-text-editor.tsx 인라인 useEffect 추출 — 단일문자 변수만 풀네임화, 동작 보존)
 */
import { type RefObject, useEffect } from 'react'

export function useImageResize(editorRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    type Corner = 'tl' | 'tr' | 'bl' | 'br'
    const HANDLE_CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br']

    let isResizing = false
    let resizeFigure: HTMLElement | null = null
    let resizeImg: HTMLImageElement | null = null
    let activeCorner: Corner = 'br'
    let startX = 0
    let startY = 0
    let startWidth = 0
    let aspectRatio = 1
    let pendingFrame: number | null = null
    let pendingW = 0
    let activePointerId: number | null = null
    const loadHandlers = new Map<HTMLImageElement, EventListener>()
    const dragstartHandlers = new Map<HTMLImageElement, EventListener>()

    const ensureAspectRatio = (figure: HTMLElement, img: HTMLImageElement) => {
      const imgWidth = img.naturalWidth || img.offsetWidth
      const imgHeight = img.naturalHeight || img.offsetHeight
      if (imgWidth > 0 && imgHeight > 0 && !img.dataset.aspectRatio) {
        // 비율 마커는 img에 — figure에 두면 figure 박스 자체가 비율로 강제돼
        // 컨테이너 폭이 큰 읽기 뷰에서 빈 공간이 생김.
        img.dataset.aspectRatio = `${imgWidth} / ${imgHeight}`
        img.style.aspectRatio = `${imgWidth} / ${imgHeight}`
      }
      // 레거시 데이터 마이그레이션: figure에 aspect-ratio가 박힌 경우 img로 옮기고 figure는 비움
      if (figure.dataset.aspectRatio && !img.dataset.aspectRatio) {
        const ratio = figure.dataset.aspectRatio
        img.dataset.aspectRatio = ratio
        img.style.aspectRatio = ratio
      }
      if (figure.dataset.aspectRatio) {
        delete figure.dataset.aspectRatio
        figure.style.aspectRatio = ''
      }
    }

    const ensureHandles = (figure: HTMLElement) => {
      const existing = figure.querySelectorAll('.resize-handle')
      if (existing.length === HANDLE_CORNERS.length) return
      existing.forEach((handleEl) => handleEl.remove())
      HANDLE_CORNERS.forEach((corner) => {
        const handle = document.createElement('span')
        handle.className = `resize-handle ${corner}`
        handle.setAttribute('contenteditable', 'false')
        handle.dataset.corner = corner
        figure.appendChild(handle)
      })
    }

    const initImage = (img: HTMLImageElement) => {
      const figure = img.closest('figure') as HTMLElement | null
      if (!figure) return

      img.setAttribute('draggable', 'false')
      if (!dragstartHandlers.has(img)) {
        const onDrag: EventListener = (event) => {
          event.preventDefault()
          event.stopPropagation()
        }
        img.addEventListener('dragstart', onDrag)
        dragstartHandlers.set(img, onDrag)
      }
      // 키보드 접근: Tab으로 figure 포커스 가능, aria-label 부여
      if (!figure.hasAttribute('tabindex')) {
        figure.setAttribute('tabindex', '0')
      }
      const captionText = figure
        .querySelector('figcaption')
        ?.textContent?.trim()
      figure.setAttribute(
        'aria-label',
        captionText ? `이미지: ${captionText}` : '이미지',
      )
      ensureAspectRatio(figure, img)
      ensureHandles(figure)
    }

    const trackImage = (img: HTMLImageElement) => {
      if (img.getAttribute('data-resizable') !== 'true') return
      if (img.complete && img.naturalWidth > 0) {
        initImage(img)
        return
      }
      if (loadHandlers.has(img)) return
      const handler: EventListener = () => {
        const existingHandler = loadHandlers.get(img)
        if (existingHandler) {
          img.removeEventListener('load', existingHandler)
          loadHandlers.delete(img)
        }
        if (img.getAttribute('data-resizable') === 'true') initImage(img)
      }
      img.addEventListener('load', handler)
      loadHandlers.set(img, handler)
    }

    const applyPending = () => {
      pendingFrame = null
      if (!resizeImg || !resizeFigure) return
      const width = Math.round(pendingW)
      // width만 저장 — height는 aspect-ratio로 산출되므로 인라인 height 제거
      resizeImg.style.width = `${width}px`
      resizeImg.style.height = 'auto'
      resizeImg.style.maxWidth = 'none'
      resizeImg.style.maxHeight = ''
      resizeFigure.style.width = `${width}px`
      resizeFigure.style.height = ''
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target?.classList.contains('resize-handle')) return
      const figure = target.closest('figure') as HTMLElement | null
      const img = figure?.querySelector('img') as HTMLImageElement | null
      if (!figure || !img) return

      event.preventDefault()
      event.stopPropagation()

      isResizing = true
      resizeFigure = figure
      resizeImg = img
      activeCorner = (target.dataset.corner as Corner) || 'br'
      startX = event.clientX
      startY = event.clientY
      startWidth = img.offsetWidth
      const startHeight = img.offsetHeight
      aspectRatio =
        startWidth > 0 && startHeight > 0
          ? startHeight / startWidth
          : img.naturalWidth > 0 && img.naturalHeight > 0
            ? img.naturalHeight / img.naturalWidth
            : 1
      activePointerId = event.pointerId
      try {
        target.setPointerCapture?.(event.pointerId)
      } catch {
        /* 무시 — 일부 브라우저에서 capture 실패 가능 */
      }

      figure.classList.add('resizing')
      document.body.style.cursor = window.getComputedStyle(target).cursor
      document.body.style.userSelect = 'none'
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!isResizing || !resizeImg) return
      if (activePointerId !== null && event.pointerId !== activePointerId) return

      const deltaX = event.clientX - startX
      const deltaY = event.clientY - startY

      // 코너에 따라 가로/세로 부호가 다름 — 원점이 반대쪽 코너라고 보면 명확
      const xSign = activeCorner === 'tr' || activeCorner === 'br' ? 1 : -1
      const ySign = activeCorner === 'bl' || activeCorner === 'br' ? 1 : -1

      // 비율 유지: x축 변화량과 y축 변화량을 width 기준으로 환산해 평균
      const widthDeltaFromX = deltaX * xSign
      const widthDeltaFromY = aspectRatio > 0 ? (deltaY * ySign) / aspectRatio : 0
      const widthDelta = (widthDeltaFromX + widthDeltaFromY) / 2

      const naturalMax = (resizeImg.naturalWidth || startWidth) * 2
      const newWidth = Math.max(
        40,
        Math.min(startWidth + widthDelta, naturalMax),
      )

      pendingW = newWidth
      if (pendingFrame == null) {
        pendingFrame = window.requestAnimationFrame(applyPending)
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      if (!isResizing) return
      if (activePointerId !== null && event.pointerId !== activePointerId) return

      if (pendingFrame != null) {
        window.cancelAnimationFrame(pendingFrame)
        pendingFrame = null
        applyPending()
      }
      if (resizeFigure) resizeFigure.classList.remove('resizing')

      // input 이벤트로 onChange 트리거
      const inputEvent = new Event('input', { bubbles: true })
      editor.dispatchEvent(inputEvent)

      isResizing = false
      resizeFigure = null
      resizeImg = null
      activePointerId = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    // 기존 이미지 처리
    editor
      .querySelectorAll<HTMLImageElement>('img[data-resizable="true"]')
      .forEach(trackImage)

    // 새로 추가되는 이미지 감지
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return
          const element = node as HTMLElement
          if (element.matches?.('img[data-resizable="true"]')) {
            trackImage(element as HTMLImageElement)
          }
          element
            .querySelectorAll?.('img[data-resizable="true"]')
            .forEach((img) => trackImage(img as HTMLImageElement))
        })
      })
    })
    observer.observe(editor, { childList: true, subtree: true })

    editor.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointercancel', onPointerUp)

    return () => {
      if (pendingFrame != null) {
        window.cancelAnimationFrame(pendingFrame)
        pendingFrame = null
      }
      observer.disconnect()
      loadHandlers.forEach((handler, img) => {
        img.removeEventListener('load', handler)
      })
      loadHandlers.clear()
      dragstartHandlers.forEach((handler, img) => {
        img.removeEventListener('dragstart', handler)
      })
      dragstartHandlers.clear()
      editor.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [editorRef])
}
