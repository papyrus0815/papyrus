/**
 * 섹션 공통 래퍼.
 * 모든 섹션은 동일한 헤더(제목·설명) + 카드 박스 구조를 따른다.
 */
import type { ReactNode } from 'react'
import * as S from './styles'
import type { EventEditorSectionId } from '../model/section-config'

interface Props {
  id: EventEditorSectionId
  title: string
  description?: string
  /** 헤더 우측에 노출할 액션 (예: "+ 추가") */
  action?: ReactNode
  children: ReactNode
}

export function SectionCard({ id, title, description, action, children }: Props) {
  return (
    <S.SectionAnchor id={`event-section-${id}`}>
      <S.SectionHeader>
        <div>
          <S.SectionTitle>{title}</S.SectionTitle>
          {description && (
            <S.SectionDescription style={{ marginTop: 4 }}>
              {description}
            </S.SectionDescription>
          )}
        </div>
        {action && <div>{action}</div>}
      </S.SectionHeader>
      <S.SectionCardBox>{children}</S.SectionCardBox>
    </S.SectionAnchor>
  )
}
