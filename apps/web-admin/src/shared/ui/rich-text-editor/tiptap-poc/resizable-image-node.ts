/**
 * TipTap 커스텀 Node — 리사이즈 가능한 이미지(React NodeView).
 * 마이그레이션의 마지막 패턴(인터랙티브 React NodeView)이 가능함을 실증.
 * renderHTML은 직렬화(저장)용, addNodeView는 에디터 내 인터랙티브 뷰용 — 표준 분리.
 * 기존 포맷 호환: <img data-resizable="true" src style="width:Npx">
 */
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'

import { ResizableImageView } from './resizable-image-view'

export interface InsertResizableImageAttrs {
  src: string
  width?: number
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      insertResizableImage: (attrs: InsertResizableImageAttrs) => ReturnType
    }
  }
}

export const ResizableImageNode = Node.create({
  name: 'resizableImage',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: '',
        parseHTML: (element) => element.getAttribute('src') ?? '',
        renderHTML: (attributes) => ({ src: attributes.src }),
      },
      width: {
        default: 200,
        parseHTML: (element) => {
          const match = /width:\s*(\d+)px/.exec(
            element.getAttribute('style') ?? '',
          )
          return match ? Number(match[1]) : 200
        },
        renderHTML: (attributes) => ({
          style: `width:${attributes.width}px`,
        }),
      },
    }
  },

  parseHTML() {
    // priority를 높여 일반 Image 확장의 img 규칙보다 data-resizable img를 먼저 잡는다.
    return [{ tag: 'img[data-resizable]', priority: 100 }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, { 'data-resizable': 'true' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },

  addCommands() {
    return {
      insertResizableImage:
        (attrs: InsertResizableImageAttrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    }
  },
})
