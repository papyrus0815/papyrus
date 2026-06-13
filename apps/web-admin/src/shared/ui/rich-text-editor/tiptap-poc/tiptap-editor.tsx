/**
 * TipTap 마이그레이션 PoC — execCommand/contentEditable 직접구현을 ProseMirror(TipTap)로
 * 대체했을 때의 핵심 포맷 동작을 실증한다. 기존 RichTextEditor와 동일한 외부 계약
 * (value/onChange/placeholder)을 만족하므로, 통합 테스트로 드롭인 가능성을 검증할 수 있다.
 *
 * 범위(PoC): 굵게/기울임/취소선/제목/목록/인용/코드/링크/색/이미지. 미포함(커스텀 확장 필요):
 *   - 엔티티/용어 멘션, figure+caption, 표(@tiptap/extension-table 미설치), 이미지 리사이즈.
 * 기존 에디터(소비처 11곳)는 전혀 건드리지 않는 추가 파일이다.
 */
import { useEffect } from 'react'

import { Color, TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TableKit } from '@tiptap/extension-table'

import { EntityLinkNode } from './entity-link-node'
import { FigureNode } from './figure-node'
import { ResizableImageNode } from './resizable-image-node'
import { TermLinkNode } from './term-link-node'

interface TiptapEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export function TiptapEditor({
  value,
  onChange,
  placeholder = '내용을 입력하세요...',
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      // StarterKit v3는 Link를 이미 포함 — 중복 추가 대신 옵션으로 설정.
      StarterKit.configure({ link: { openOnClick: false } }),
      TextStyle,
      Color,
      Image,
      Placeholder.configure({ placeholder }),
      // TableKit = Table + TableRow + TableHeader + TableCell 번들(v3). resizable 컬럼.
      TableKit.configure({ table: { resizable: true } }),
      // 커스텀 도메인 확장 — 기존 HTML과 호환되는 멘션/figure 노드 + React NodeView.
      EntityLinkNode,
      TermLinkNode,
      FigureNode,
      ResizableImageNode,
    ],
    content: value,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  })

  // 외부 value 변경 동기화 — 자기 편집(getHTML과 동일)에는 반응하지 않아 루프 방지.
  useEffect(() => {
    if (!editor) return
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div data-testid="tiptap-editor">
      <div role="toolbar" aria-label="서식">
        <button
          type="button"
          aria-label="굵게"
          aria-pressed={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          aria-label="기울임"
          aria-pressed={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          type="button"
          aria-label="취소선"
          aria-pressed={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          S
        </button>
        <button
          type="button"
          aria-label="제목 1"
          aria-pressed={editor.isActive('heading', { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          H1
        </button>
        <button
          type="button"
          aria-label="순서 없는 목록"
          aria-pressed={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •
        </button>
        <button
          type="button"
          aria-label="인용"
          aria-pressed={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          ❝
        </button>
        <button
          type="button"
          aria-label="인라인 코드"
          aria-pressed={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          {'</>'}
        </button>
        <button
          type="button"
          aria-label="표 삽입"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          ▦
        </button>
        <button
          type="button"
          aria-label="엔티티 연결"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertEntityLink({
                entityType: 'person',
                entityId: '1',
                entityName: '나폴레옹 보나파르트',
                label: '나폴레옹',
              })
              .run()
          }
        >
          🔗
        </button>
        <button
          type="button"
          aria-label="용어 연결"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTermLink({
                termId: 't1',
                termName: '봉건제',
                label: '봉건',
              })
              .run()
          }
        >
          📖
        </button>
        <button
          type="button"
          aria-label="이미지 삽입"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertFigure({
                src: 'https://example.com/x.png',
                alt: '예시',
                caption: '캡션 예시',
              })
              .run()
          }
        >
          🖼
        </button>
        <button
          type="button"
          aria-label="리사이즈 이미지"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertResizableImage({
                src: 'https://example.com/r.png',
                width: 200,
              })
              .run()
          }
        >
          ↔
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
