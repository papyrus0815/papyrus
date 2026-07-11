/**
 * 용어(glossary) 관련 모달 2종 — 공유 styled를 한 파일에 둔다.
 *  - TermLinkModal: 선택 문구에 용어 연결 / (문서 전용)설명 넣기 + 새 용어 등록.
 *  - TermEditModal: 에디터에서 .term 클릭 시 용어/설명 수정·삭제.
 * 상태·핸들러는 부모가 보유하고 props로 받는 표현 컴포넌트.
 * GlossaryTermDto는 import type으로만 가져와(런타임 모듈 미로드) 테스트 안정성 확보.
 * (원본: rich-text-editor.tsx 인라인 JSX 추출 — 동작 보존)
 */
import React, { type Dispatch, type SetStateAction } from 'react'

import { createPortal } from 'react-dom'

import { FiX } from 'react-icons/fi'
import styled from 'styled-components'

import type { GlossaryTermDto } from '@/shared/api/glossary'
import { Z_INDEX } from '@/shared/styles/z-index'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: ${Z_INDEX.RICH_TEXT_EDITOR_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
`
const ModalCard = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(25,25,25,0.92)' : '#fff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  border-radius: 20px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  width: 90%;
  max-width: 440px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`
const Header = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`
const Title = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`
const CloseButton = styled.button`
  padding: 8px;
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 10px;
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
const Content = styled.div`
  padding: 20px 24px 24px;
  overflow-y: auto;
  flex: 1;
`
const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  margin-bottom: 14px;
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
const ResultsList = styled.div`
  max-height: 280px;
  overflow-y: auto;
  margin-bottom: 16px;
`
const NewSection = styled.div`
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`
const NewLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 8px;
`
const NewInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  font-size: 13px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  margin-bottom: 8px;
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  &:focus {
    border-color: #6366f1;
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
const NewTextarea = styled.textarea`
  width: 100%;
  min-height: 240px;
  padding: 10px 14px;
  font-size: 13px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  resize: vertical;
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  &:focus {
    border-color: #6366f1;
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
const ActionButton = styled.button<{ $primary?: boolean }>`
  margin-top: 10px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  border: 1px solid
    ${(buttonProps) =>
      buttonProps.$primary ? '#6366f1' : buttonProps.theme.colors.border.default};
  background: ${(buttonProps) =>
    buttonProps.$primary
      ? '#6366f1'
      : buttonProps.theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : '#fff'};
  color: ${(buttonProps) =>
    buttonProps.$primary ? '#fff' : buttonProps.theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    background: ${(buttonProps) =>
      buttonProps.$primary
        ? '#4f46e5'
        : buttonProps.theme.colors.background.tertiary};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

/** 전역 용어 편집 시 파급(blast radius) 경고 — 이 용어를 링크한 모든 문서에 반영됨을 알림. */
const GlobalTermNotice = styled.div`
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 14px;
  font-size: 12.5px;
  line-height: 1.5;
  border-radius: 10px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#92400e')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251,191,36,0.1)' : '#fffbeb'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(251,191,36,0.28)' : '#fde68a'};
`

interface TermLinkModalProps {
  visible: boolean
  explanationOnly: boolean
  selectedText: string
  query: string
  onQueryChange: (query: string) => void
  results: GlossaryTermDto[]
  selectedIndex: number
  onSelectedIndexChange: Dispatch<SetStateAction<number>>
  onInsert: (term: GlossaryTermDto) => void
  newName: string
  onNewNameChange: (value: string) => void
  newDesc: string
  onNewDescChange: (value: string) => void
  documentOnly: boolean
  onDocumentOnlyChange: (value: boolean) => void
  /** documentScope가 있을 때만 "이 문서에만 사용" 체크박스 노출 */
  hasDocumentScope: boolean
  onCreateAndLink: () => void
  onClose: () => void
  playClickSound: () => void
}

function TermLinkModalComponent({
  visible,
  explanationOnly,
  selectedText,
  query,
  onQueryChange,
  results,
  selectedIndex,
  onSelectedIndexChange,
  onInsert,
  newName,
  onNewNameChange,
  newDesc,
  onNewDescChange,
  documentOnly,
  onDocumentOnlyChange,
  hasDocumentScope,
  onCreateAndLink,
  onClose,
  playClickSound,
}: TermLinkModalProps) {
  if (!visible || typeof document === 'undefined') return null
  return createPortal(
    <Overlay onClick={onClose}>
      <ModalCard onClick={(event) => event.stopPropagation()}>
        <Header>
          <Title>{explanationOnly ? '설명 넣기' : '용어 연결'}</Title>
          <CloseButton onClick={onClose} aria-label="닫기">
            <FiX size={20} />
          </CloseButton>
        </Header>
        <Content>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
            <strong>선택한 문구</strong> &quot;{selectedText}&quot;
          </div>

          {explanationOnly ? (
            <NewSection>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                읽는 사람이 아래 문구에 마우스를 올리면 이 설명이 툴팁으로
                표시됩니다.
              </div>
              <NewLabel>설명 (이 문서에서만 표시)</NewLabel>
              <NewTextarea
                placeholder="선택한 문구에 달 설명을 입력하세요"
                value={newDesc}
                onChange={(event) => onNewDescChange(event.target.value)}
                autoFocus
              />
              <ActionButton
                $primary
                type="button"
                onClick={() => {
                  playClickSound()
                  onCreateAndLink()
                }}
                disabled={!newDesc.trim()}
              >
                설명 넣기
              </ActionButton>
            </NewSection>
          ) : (
            <>
              <SearchInput
                type="text"
                placeholder="용어 검색 (이름)..."
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    onSelectedIndexChange((prevIdx) =>
                      prevIdx < results.length - 1 ? prevIdx + 1 : 0,
                    )
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    onSelectedIndexChange((prevIdx) =>
                      prevIdx > 0 ? prevIdx - 1 : results.length - 1,
                    )
                  } else if (event.key === 'Enter') {
                    event.preventDefault()
                    if (results[selectedIndex]) {
                      onInsert(results[selectedIndex])
                    }
                  } else if (event.key === 'Escape') {
                    event.preventDefault()
                    onClose()
                  }
                }}
                autoFocus
              />
              <ResultsList>
                {results.length === 0 ? (
                  <div
                    style={{
                      padding: 20,
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: 13,
                    }}
                  >
                    {query.trim()
                      ? '검색 결과가 없습니다. 아래에서 새 용어를 등록할 수 있습니다.'
                      : '검색어를 입력하거나 아래에서 새 용어를 등록하세요.'}
                  </div>
                ) : (
                  results.map((term, idx) => (
                    <div
                      key={term.id}
                      style={{
                        padding: '12px 14px',
                        cursor: 'pointer',
                        background:
                          idx === selectedIndex
                            ? 'rgba(13, 148, 136, 0.08)'
                            : 'transparent',
                        borderRadius: 10,
                        marginBottom: 4,
                        border:
                          idx === selectedIndex
                            ? '1px solid rgba(13, 148, 136, 0.25)'
                            : '1px solid transparent',
                      }}
                      onMouseEnter={() => onSelectedIndexChange(idx)}
                      onClick={() => {
                        playClickSound()
                        onInsert(term)
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {term.name}
                      </span>
                      {term.description && (
                        <div
                          style={{
                            fontSize: 12,
                            color: '#64748b',
                            marginTop: 4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {term.description}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </ResultsList>
              <NewSection>
                <NewLabel>새 용어로 등록 후 연결</NewLabel>
                {hasDocumentScope ? (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 10,
                      fontSize: 13,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={documentOnly}
                      onChange={(event) =>
                        onDocumentOnlyChange(event.target.checked)
                      }
                    />
                    이 문서에만 사용 (문서 전용 용어)
                  </label>
                ) : null}
                <NewInput
                  placeholder="용어명 (필수)"
                  value={newName}
                  onChange={(event) => onNewNameChange(event.target.value)}
                />
                <NewTextarea
                  placeholder="설명 (선택)"
                  value={newDesc}
                  onChange={(event) => onNewDescChange(event.target.value)}
                />
                <ActionButton
                  $primary
                  type="button"
                  onClick={() => {
                    playClickSound()
                    onCreateAndLink()
                  }}
                  disabled={!newName.trim()}
                >
                  등록 후 연결
                </ActionButton>
              </NewSection>
            </>
          )}
        </Content>
      </ModalCard>
    </Overlay>,
    document.body,
  )
}

export const TermLinkModal = React.memo(TermLinkModalComponent)

interface TermEditModalProps {
  visible: boolean
  loading: boolean
  isDocumentScoped: boolean
  name: string
  onNameChange: (value: string) => void
  desc: string
  onDescChange: (value: string) => void
  onSave: () => void
  onDelete: () => void
  onClose: () => void
  playClickSound: () => void
}

function TermEditModalComponent({
  visible,
  loading,
  isDocumentScoped,
  name,
  onNameChange,
  desc,
  onDescChange,
  onSave,
  onDelete,
  onClose,
  playClickSound,
}: TermEditModalProps) {
  if (!visible || typeof document === 'undefined') return null
  return createPortal(
    <Overlay onClick={onClose}>
      <ModalCard onClick={(event) => event.stopPropagation()}>
        <Header>
          <Title>{isDocumentScoped ? '설명 수정' : '용어 수정'}</Title>
          <CloseButton type="button" onClick={onClose} aria-label="닫기">
            <FiX size={20} />
          </CloseButton>
        </Header>
        <Content>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
              불러오는 중…
            </div>
          ) : isDocumentScoped ? (
            <>
              <NewLabel>문구</NewLabel>
              <div
                style={{
                  padding: '10px 12px',
                  background: '#f1f5f9',
                  borderRadius: 8,
                  fontSize: 14,
                  color: '#334155',
                  marginBottom: 12,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={name}
              >
                {name}
              </div>
              <NewLabel>설명 (이 문서에서만 표시)</NewLabel>
              <NewTextarea
                placeholder="설명을 입력하세요"
                value={desc}
                onChange={(event) => onDescChange(event.target.value)}
                style={{ minHeight: 120 }}
              />
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  marginTop: 16,
                  flexWrap: 'wrap',
                }}
              >
                <ActionButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    onClose()
                  }}
                >
                  취소
                </ActionButton>
                <ActionButton
                  $primary
                  type="button"
                  onClick={() => {
                    playClickSound()
                    onSave()
                  }}
                  disabled={loading}
                >
                  저장
                </ActionButton>
                <ActionButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    onDelete()
                  }}
                  disabled={loading}
                  style={{
                    marginLeft: 'auto',
                    color: '#dc2626',
                    borderColor: '#fecaca',
                    background: '#fef2f2',
                  }}
                >
                  설명 삭제
                </ActionButton>
              </div>
            </>
          ) : (
            <>
              <GlobalTermNotice>
                전역 용어입니다. 수정하면 이 용어를 링크한 다른 문서에도 함께
                반영됩니다.
              </GlobalTermNotice>
              <NewLabel>용어명</NewLabel>
              <NewInput
                placeholder="용어명 (필수)"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
              />
              <NewLabel style={{ marginTop: 12 }}>설명</NewLabel>
              <NewTextarea
                placeholder="설명 (선택)"
                value={desc}
                onChange={(event) => onDescChange(event.target.value)}
                style={{ minHeight: 200 }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <ActionButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    onClose()
                  }}
                >
                  취소
                </ActionButton>
                <ActionButton
                  $primary
                  type="button"
                  onClick={() => {
                    playClickSound()
                    onSave()
                  }}
                  disabled={!name.trim() || loading}
                >
                  저장
                </ActionButton>
              </div>
            </>
          )}
        </Content>
      </ModalCard>
    </Overlay>,
    document.body,
  )
}

export const TermEditModal = React.memo(TermEditModalComponent)
