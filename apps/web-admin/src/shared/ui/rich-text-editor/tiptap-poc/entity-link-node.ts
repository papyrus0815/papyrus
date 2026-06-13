/**
 * TipTap 커스텀 Node — 엔티티 링크(인물/사건/국가 등 멘션).
 * 마이그레이션의 가장 어려운 부분(도메인 멘션)이 TipTap에서 구현 가능함을 실증한다.
 * 기존 에디터 HTML 포맷과 호환:
 *   <span class="entity-link" data-entity-type data-entity-id data-entity-name
 *         contenteditable="false">label</span>
 * inline atom — 내부 편집 불가(기존 contenteditable=false와 동일), 라운드트립 보장.
 */
import { Node, mergeAttributes } from '@tiptap/core'

export interface InsertEntityLinkAttrs {
  entityType: string
  entityId: string
  entityName: string
  /** 화면 표시 텍스트(선택한 문구) — entityName과 다를 수 있음 */
  label: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    entityLink: {
      insertEntityLink: (attrs: InsertEntityLinkAttrs) => ReturnType
    }
  }
}

export const EntityLinkNode = Node.create({
  name: 'entityLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      entityType: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-entity-type') ?? '',
        renderHTML: (attributes) => ({
          'data-entity-type': attributes.entityType,
        }),
      },
      entityId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-entity-id') ?? '',
        renderHTML: (attributes) => ({ 'data-entity-id': attributes.entityId }),
      },
      entityName: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-entity-name') ?? '',
        renderHTML: (attributes) => ({
          'data-entity-name': attributes.entityName,
        }),
      },
      label: {
        default: '',
        // 표시 텍스트는 span의 textContent에서 복원(라운드트립)
        parseHTML: (element) => element.textContent ?? '',
        // 라벨은 텍스트 콘텐츠로 렌더되므로 별도 속성을 만들지 않음
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span.entity-link' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'entity-link',
        contenteditable: 'false',
      }),
      node.attrs.label,
    ]
  },

  addCommands() {
    return {
      insertEntityLink:
        (attrs: InsertEntityLinkAttrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    }
  },
})
