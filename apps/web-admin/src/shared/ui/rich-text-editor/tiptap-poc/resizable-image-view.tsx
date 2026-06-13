/**
 * TipTap React NodeView — 리사이즈 가능한 이미지의 에디터 내 인터랙티브 뷰.
 * 본격 마이그레이션에선 기존 use-image-resize의 포인터 드래그 로직을 여기로 이식한다.
 * (PoC: jsdom에서 드래그는 불가하나, 버튼으로 width 속성을 상호작용 변경해
 *  "React NodeView 마운트 + 인터랙티브 노드 속성 변경"이라는 리사이즈 핵심을 실증)
 */
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'

export function ResizableImageView({ node, updateAttributes }: NodeViewProps) {
  const width = Number(node.attrs.width) || 200

  return (
    <NodeViewWrapper as="span" data-testid="resizable-image">
      <img
        src={node.attrs.src as string}
        alt=""
        style={{ width: `${width}px`, display: 'inline-block' }}
      />
      <button
        type="button"
        aria-label="넓게"
        onClick={() => updateAttributes({ width: width + 50 })}
      >
        +
      </button>
      <button
        type="button"
        aria-label="좁게"
        onClick={() => updateAttributes({ width: Math.max(50, width - 50) })}
      >
        −
      </button>
    </NodeViewWrapper>
  )
}
