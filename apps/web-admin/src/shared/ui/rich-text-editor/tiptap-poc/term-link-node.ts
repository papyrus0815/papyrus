/**
 * TipTap 커스텀 Node — 용어(glossary) 링크.
 * 엔티티 링크와 동형(inline atom) — 커스텀 노드 패턴이 도메인 전반에 재사용됨을 보인다.
 * 기존 포맷 호환:
 *   <span class="term" data-term-id data-term-name contenteditable="false">label</span>
 */
import { Node, mergeAttributes } from '@tiptap/core'

export interface InsertTermLinkAttrs {
  termId: string
  termName: string
  /** 화면 표시 텍스트(선택한 문구) */
  label: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    termLink: {
      insertTermLink: (attrs: InsertTermLinkAttrs) => ReturnType
    }
  }
}

export const TermLinkNode = Node.create({
  name: 'termLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      termId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-term-id') ?? '',
        renderHTML: (attributes) => ({ 'data-term-id': attributes.termId }),
      },
      termName: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-term-name') ?? '',
        renderHTML: (attributes) => ({
          'data-term-name': attributes.termName,
        }),
      },
      label: {
        default: '',
        parseHTML: (element) => element.textContent ?? '',
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span.term' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'term',
        contenteditable: 'false',
      }),
      node.attrs.label,
    ]
  },

  addCommands() {
    return {
      insertTermLink:
        (attrs: InsertTermLinkAttrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    }
  },
})
