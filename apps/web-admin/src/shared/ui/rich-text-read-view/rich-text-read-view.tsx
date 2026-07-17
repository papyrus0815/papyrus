import {
  type HTMLAttributes,
  forwardRef,
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react'

import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'

import { useFocusTrap } from '@/shared/hooks/use-focus-trap.hook'
import { formatRichTextForReadView } from '@/shared/lib/rich-text-read-view'
import {
  richTextBlockAlignCss,
  richTextProseListCss,
  richTextReadonlyEntityLinksCss,
  richTextReadonlyHorizontalRuleCss,
  richTextReadonlyMediaAndTablesCss,
} from '@/shared/styles/rich-text-readonly-content'

/**
 * RichTextEditor 저장 HTML 읽기 전용 표시 — sanitize + 멘션 @ 제거 + 공통 타이포/표·이미지·엔티티 스타일.
 * 편집 화면과 동일한 본문 처리 경로(`formatRichTextForReadView`)를 한곳에서 사용합니다.
 */
const Root = styled.div`
  font-family: inherit;
  font-size: 15px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.primary};
  /* RD5: 대용량 전기(최대 16MB) 섹션이 여러 개 쌓일 때, 화면 밖 섹션의 레이아웃·페인트를
     건너뛰어 개요 탭 초기 페인트 블로킹을 줄인다. 미지원 브라우저는 자연 폴백(무영향).
     라이트박스·엔티티 툴팁은 document.body 포털이라 paint containment 영향 없음. */
  content-visibility: auto;
  contain-intrinsic-size: auto 600px;
  /* 에디터 HTML은 줄바꿈을 <br>·<div>·<p>로 인코딩 — pre-wrap을 켜면 태그 사이의
     소스 포맷 개행(\\n)까지 공백으로 렌더되어 단락 간 빈 줄이 누적됨.
     평문 입력은 사용처에서 별도 pre-wrap 컨테이너로 분기 (예: CardDesc). */
  white-space: normal;
  word-break: break-word;

  p {
    margin: 0 0 1em;
  }
  p:last-child {
    margin-bottom: 0;
  }
  strong {
    font-weight: 700;
  }

  ${richTextProseListCss}
  ${richTextBlockAlignCss}

  blockquote {
    border-left: 4px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.55)' : '#6366f1'};
    padding-left: 16px;
    margin: 12px 0;
    color: ${({ theme }) => theme.colors.text.secondary};
    font-style: italic;
  }

  a[href] {
    color: #6366f1;
    text-decoration: underline;
  }

  ${richTextReadonlyHorizontalRuleCss}
  ${richTextReadonlyMediaAndTablesCss}
  ${richTextReadonlyEntityLinksCss}

  /* 엔티티 링크 어포던스 구분(읽기 뷰 전용 — 에디터 미적용). 단일 amber라 클릭 결과가
     '페이지 이동/제자리 툴팁/모달'로 제각각이던 예측 불가를 완화:
     확실히 다른 화면으로 이동하는 타입엔 ↗ 글리프를 붙이고, 제자리 요약 툴팁형(가문)은
     도움말 커서로 '정보' 성격을 표시한다. person/historicalCountry/party/military는
     맥락에 따라 이동/툴팁이 갈려 중립 유지. */
  .entity-link[data-entity-type='event']::after,
  .entity-link[data-entity-type='company']::after,
  .entity-link[data-entity-type='country']::after,
  .entity-link[data-entity-type='personGroup']::after {
    content: '↗';
    margin-left: 3px;
    font-size: 0.82em;
    font-weight: 400;
    opacity: 0.65;
  }
  .entity-link[data-entity-type='dynasty'] {
    cursor: help;
  }

  /* 읽기 뷰 전용 오버라이드(에디터 미적용):
     - RD2: 공유 .entity-link의 user-select:none이 상속돼 본문을 드래그 복사하면
       엔티티 링크 단어가 통째로 빠졌다. 읽기 본문은 복사 가능해야 하므로 텍스트 선택 허용.
     - RD4: nowrap + max-width 없음이라 긴 앵커 문구가 좁은 임베드 모달에서 컨테이너를
       가로로 넘쳤다. 여러 줄 배지로 흐르게 한다(에디터의 원자 선택 동작은 nowrap 유지). */
  .entity-link {
    user-select: text;
    -webkit-user-select: text;
    white-space: normal;
    max-width: 100%;
    overflow-wrap: anywhere;
  }

  /* MD3: 로드 실패한 본문 이미지에 플레이스홀더 — 깨진 아이콘 방치 방지.
     capture 단계 error 리스너가 data-broken을 스탬프한다. */
  img[data-broken='true'] {
    min-height: 48px;
    min-width: 120px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};
    border: 1px dashed
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.18)' : '#cbd5e1'};
    border-radius: 8px;
    box-shadow: none;
    cursor: default;
    object-fit: contain;
    position: relative;
  }
  figure img[data-broken='true'] {
    cursor: default;
  }
`

export type RichTextReadViewProps = {
  html: string
  /** true(기본)이면 공백만 있으면 null 반환 */
  hideWhenEmpty?: boolean
} & Omit<HTMLAttributes<HTMLDivElement>, 'dangerouslySetInnerHTML' | 'children'>

export const RichTextReadView = forwardRef<
  HTMLDivElement,
  RichTextReadViewProps
>(function RichTextReadView(
  {
    html,
    hideWhenEmpty = true,
    className,
    role = 'region',
    'aria-label': ariaLabel = '본문',
    ...rest
  },
  ref,
) {
  const safe = useMemo(() => formatRichTextForReadView(html ?? ''), [html])

  /** figure 안 이미지 클릭/키보드 활성화 시 풀스크린 라이트박스로 띄움 */
  const [lightbox, setLightbox] = useState<{
    src: string
    caption: string | null
  } | null>(null)
  const [lightboxBroken, setLightboxBroken] = useState(false)

  // 내부 ref(이미지 접근성 주석·error 위임)와 forwarded ref를 병합.
  const rootRef = useRef<HTMLDivElement | null>(null)
  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  const overlayRef = useRef<HTMLDivElement | null>(null)
  useFocusTrap(overlayRef, !!lightbox)

  /** 이미 로드가 끝난 뒤 깨진 이미지인지(라이트박스 열기 차단·MD3). */
  const isBrokenImg = (img: HTMLImageElement) =>
    img.dataset.broken === 'true' || (img.complete && img.naturalWidth === 0)

  const openLightboxFromImg = useCallback((img: HTMLImageElement) => {
    if (isBrokenImg(img)) return // 깨진 원본을 전면 확대하지 않는다(MD3)
    const figure = img.closest('figure')
    const caption =
      figure?.querySelector('figcaption')?.textContent?.trim() ?? null
    setLightboxBroken(false)
    setLightbox({ src: img.currentSrc || img.src, caption })
  }, [])

  const onContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
      const img = target.closest('figure img') as HTMLImageElement | null
      if (!img) return
      e.preventDefault()
      e.stopPropagation()
      openLightboxFromImg(img)
    },
    [openLightboxFromImg],
  )

  // AY8: 이미지 라이트박스를 키보드로 열 수 있게 — figure img에 role/tabindex 부여 후
  // Enter/Space로 활성화. MD3: 로드 실패 img에 data-broken 스탬프(capture 단계 위임).
  useEffect(() => {
    const host = rootRef.current
    if (!host) return
    host.querySelectorAll('figure img').forEach((node) => {
      const img = node as HTMLImageElement
      if (!img.hasAttribute('tabindex')) img.setAttribute('tabindex', '0')
      if (!img.hasAttribute('role')) img.setAttribute('role', 'button')
      if (!img.getAttribute('aria-label')) {
        const caption = img
          .closest('figure')
          ?.querySelector('figcaption')
          ?.textContent?.trim()
        img.setAttribute('aria-label', caption ? `이미지: ${caption}` : '이미지 크게 보기')
      }
      if (img.complete && img.naturalWidth === 0) img.dataset.broken = 'true'
    })
    const onError = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (target && target.tagName === 'IMG') {
        ;(target as HTMLImageElement).dataset.broken = 'true'
      }
    }
    host.addEventListener('error', onError, true)
    return () => host.removeEventListener('error', onError, true)
  }, [safe])

  const onContentKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return
      const target = e.target as HTMLElement
      const img = target.closest('figure img') as HTMLImageElement | null
      if (!img) return
      e.preventDefault()
      openLightboxFromImg(img)
    },
    [openLightboxFromImg],
  )

  // ESC로 라이트박스 닫기
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightbox])

  if (hideWhenEmpty && !safe.trim()) return null
  return (
    <>
      <Root
        ref={setRootRef}
        className={className}
        role={role}
        aria-label={ariaLabel}
        onClick={onContentClick}
        onKeyDown={onContentKeyDown}
        dangerouslySetInnerHTML={{ __html: safe }}
        {...rest}
      />
      {lightbox &&
        typeof document !== 'undefined' &&
        createPortal(
          <LightboxOverlay
            ref={overlayRef}
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
            aria-label="이미지 보기"
            // 열려 있는 동안 전기 편집 Esc 핸들러가 양보하도록 마커 노출(AU1).
            data-lightbox-open="true"
          >
            {lightboxBroken ? (
              <LightboxFallback onClick={(e) => e.stopPropagation()}>
                이미지를 불러올 수 없습니다.
              </LightboxFallback>
            ) : (
              <LightboxImg
                src={lightbox.src}
                alt={lightbox.caption ?? ''}
                onClick={(e) => e.stopPropagation()}
                onError={() => setLightboxBroken(true)}
              />
            )}
            {lightbox.caption && !lightboxBroken && (
              <LightboxCaption>{lightbox.caption}</LightboxCaption>
            )}
            <LightboxClose
              type="button"
              aria-label="닫기"
              onClick={() => setLightbox(null)}
            >
              ✕
            </LightboxClose>
          </LightboxOverlay>,
          document.body,
        )}
    </>
  )
})

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
  padding: 32px;
  cursor: zoom-out;
  animation: ${fadeIn} 0.15s ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const LightboxImg = styled.img`
  max-width: 95vw;
  max-height: 88vh;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  cursor: default;
`

const LightboxFallback = styled.div`
  color: rgba(255, 255, 255, 0.9);
  font-size: 15px;
  padding: 40px 48px;
  border: 1px dashed rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  cursor: default;
`

const LightboxCaption = styled.div`
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  font-style: italic;
  letter-spacing: -0.005em;
  text-align: center;
  max-width: 80vw;
`

const LightboxClose = styled.button`
  position: fixed;
  top: 24px;
  right: 28px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.22);
  }
`
