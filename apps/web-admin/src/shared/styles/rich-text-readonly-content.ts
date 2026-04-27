/**
 * RichTextEditor로 저장한 HTML을 읽기 전용으로 표시할 때 공통 스타일 조각.
 * 읽기 UI는 `@/shared/ui/rich-text-read-view`의 RichTextReadView에서 이 조각들을 조합합니다.
 */
import { css } from 'styled-components'

import { proseHrSmallStyles, proseHrStyles } from './prose-hr'

/** hr 및 에디터에서 삽입하는 .prose-hr 구분선 */
export const richTextReadonlyHorizontalRuleCss = css`
  hr,
  .prose-hr {
    ${proseHrStyles}
  }
  .prose-hr.prose-hr--small {
    ${proseHrSmallStyles}
  }
`

/** 이미지·캡션·표 (에디터 산출물과 동일한 뷰) */
export const richTextReadonlyMediaAndTablesCss = css`
  figure {
    margin: 12px 0;
    text-align: center;
    max-width: 100%;
  }

  /* 정렬: data-align="left|center|right" — 에디터에서 저장 */
  figure[data-align='left'] {
    display: block;
    margin-left: 0;
    margin-right: auto;
    text-align: left;
  }
  figure[data-align='left'] img {
    margin: 0;
  }
  figure[data-align='right'] {
    display: block;
    margin-left: auto;
    margin-right: 0;
    text-align: right;
  }
  figure[data-align='right'] img {
    margin: 0 0 0 auto;
  }
  figure[data-align='center'] {
    display: block;
    margin-left: auto;
    margin-right: auto;
    text-align: center;
  }

  /* 레거시 데이터 호환: 과거 figure에 aspect-ratio를 박았는데, 읽기 뷰의 figure는
     block(기본)이라 컨테이너 폭만큼 늘어나면서 비율로 강제된 height가 이미지보다
     커져 빈 공간이 생기는 버그가 있었음. figure의 aspect-ratio를 무력화하고
     img가 자체 인라인 width + height: auto + 자연 비율로 그려지도록 함. */
  figure[data-aspect-ratio] {
    aspect-ratio: auto !important;
  }
  figure[data-aspect-ratio] img,
  figure img[data-aspect-ratio],
  img[data-aspect-ratio] {
    height: auto !important;
  }

  figure img {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    display: block;
    margin: 0 auto;
    cursor: zoom-in;
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 4px 12px rgba(0,0,0,0.35)'
        : '0 4px 12px rgba(15, 23, 42, 0.08)'};
  }

  figcaption {
    margin-top: 8px;
    font-size: 13px;
    font-style: italic;
    text-align: center;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 10px 0;
    display: block;
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 4px 12px rgba(0,0,0,0.25)'
        : '0 4px 12px rgba(15, 23, 42, 0.08)'};
  }

  table,
  table.rich-table {
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
    font-size: 14px;
    line-height: 1.45;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.14)' : '#e5e7eb'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  }

  table td,
  table th {
    border: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e8e8ed'};
    padding: 8px 10px;
    min-width: 40px;
    vertical-align: top;
  }
`

/** 멘션·엔티티 링크·용어 (에디터 .mention / .entity-link / .term) */
export const richTextReadonlyEntityLinksCss = css`
  .mention,
  .entity-link {
    color: inherit;
    font-weight: inherit;
    text-decoration: none;
    cursor: pointer;
    display: inline;
    padding: 1px 6px;
    margin: 0 1px;
    border-radius: 4px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0, 0, 0, 0.03)'};
    border: none;
    transition:
      background 0.15s ease,
      color 0.15s ease;
  }
  .mention:hover,
  .entity-link:hover {
    color: #1d4ed8;
    background: rgba(29, 78, 216, 0.06);
  }

  .term {
    color: #0f766e;
    font-weight: inherit;
    text-decoration: none;
    cursor: pointer;
    padding: 0 2px;
    border-radius: 3px;
    transition:
      color 0.15s ease,
      background 0.15s ease;
  }
  .term:hover {
    color: #0d9488;
    background: rgba(13, 148, 136, 0.1);
  }
`

/**
 * 순서·비순서 목록 — RichTextEditor 본문(`EditorContent`)과 읽기 전용 뷰 동일.
 * 중첩 `ul` 마커(disc → circle → square)까지 맞춤.
 */
export const richTextProseListCss = css`
  ul,
  ol {
    margin: 8px 0;
    padding-left: 28px;
    list-style-position: outside;
  }

  ul {
    list-style-type: disc;
  }

  ol {
    list-style-type: decimal;
  }

  ul ul {
    list-style-type: circle;
    margin-top: 4px;
    margin-bottom: 4px;
  }

  ul ul ul {
    list-style-type: square;
  }

  ol ol {
    list-style-type: lower-alpha;
    margin-top: 4px;
    margin-bottom: 4px;
  }

  ol ol ol {
    list-style-type: lower-roman;
  }

  li {
    margin: 4px 0;
    line-height: 1.55;
  }

  li > ul,
  li > ol {
    margin-top: 4px;
    margin-bottom: 4px;
  }
`

/** 블록 가운데 정렬 — execCommand `justifyCenter`·레거시 align 속성 */
export const richTextBlockAlignCss = css`
  [align='center'] {
    text-align: center;
  }
`
