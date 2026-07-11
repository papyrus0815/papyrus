import { type HTMLAttributes, forwardRef, useMemo, useState, useCallback, useEffect } from 'react'

import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'

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

  /** figure 안 이미지 클릭 시 풀스크린 라이트박스로 띄움 */
  const [lightbox, setLightbox] = useState<{
    src: string
    caption: string | null
  } | null>(null)

  const onContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const img = target.closest('figure img') as HTMLImageElement | null
    if (!img) return
    e.preventDefault()
    e.stopPropagation()
    const figure = img.closest('figure')
    const caption =
      figure?.querySelector('figcaption')?.textContent?.trim() ?? null
    setLightbox({ src: img.currentSrc || img.src, caption })
  }, [])

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
        ref={ref}
        className={className}
        role={role}
        aria-label={ariaLabel}
        onClick={onContentClick}
        dangerouslySetInnerHTML={{ __html: safe }}
        {...rest}
      />
      {lightbox &&
        typeof document !== 'undefined' &&
        createPortal(
          <LightboxOverlay
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-label="이미지 보기"
          >
            <LightboxImg
              src={lightbox.src}
              alt={lightbox.caption ?? ''}
              onClick={(e) => e.stopPropagation()}
            />
            {lightbox.caption && (
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
