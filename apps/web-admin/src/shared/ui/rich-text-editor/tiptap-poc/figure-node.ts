/**
 * TipTap 커스텀 Node — 이미지 figure(이미지 + 캡션).
 * 엔티티 링크(inline atom)와 다른 패턴인 *블록 레벨 미디어 노드*가 가능함을 실증.
 * 기존 포맷과 호환: <figure><img src alt><figcaption>caption</figcaption></figure>
 * block atom — 캡션은 인라인 편집이 아니라 명령(모달)으로 설정(기존 UX와 동일).
 */
import { Node, mergeAttributes } from '@tiptap/core'

export interface InsertFigureAttrs {
  src: string
  alt?: string
  caption?: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figureImage: {
      insertFigure: (attrs: InsertFigureAttrs) => ReturnType
    }
  }
}

export const FigureNode = Node.create({
  name: 'figureImage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: '',
        parseHTML: (element) =>
          element.querySelector('img')?.getAttribute('src') ?? '',
        renderHTML: () => ({}),
      },
      alt: {
        default: '',
        parseHTML: (element) =>
          element.querySelector('img')?.getAttribute('alt') ?? '',
        renderHTML: () => ({}),
      },
      caption: {
        default: '',
        parseHTML: (element) =>
          element.querySelector('figcaption')?.textContent ?? '',
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        // img가 없는 figure는 무시(다른 figure와 구분)
        getAttrs: (element) =>
          element.querySelector('img') ? null : false,
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'figure',
      mergeAttributes(HTMLAttributes),
      ['img', { src: node.attrs.src, alt: node.attrs.alt }],
      ['figcaption', {}, node.attrs.caption],
    ]
  },

  addCommands() {
    return {
      insertFigure:
        (attrs: InsertFigureAttrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    }
  },
})
