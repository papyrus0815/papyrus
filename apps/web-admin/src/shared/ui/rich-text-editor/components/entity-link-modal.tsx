/**
 * 엔티티 연결 모달 — 선택한 텍스트에 인물/사건/국가/정당 등을 연결.
 * 검색어·결과·선택 인덱스·로딩 등 상태는 부모가 보유하고 props로 받는 표현 컴포넌트.
 * 결과는 타입별로 그룹화해 표시하며, ↑/↓/Enter 키보드 내비를 지원한다.
 * (원본: rich-text-editor.tsx 인라인 JSX 추출 — 동작 보존)
 */
import React, { type Dispatch, type SetStateAction } from 'react'

import { createPortal } from 'react-dom'

import { FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { getUploadImageUrl } from '@/shared/api/upload'
import type { MentionItem } from '@/shared/lib/mention/mention-system'
import { MENTION_TYPE_CONFIG } from '@/shared/lib/mention/mention-system'
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
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.04);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
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
  border: none;
  background: transparent;
  padding: 6px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: #4f46e5;
  }
`

const Content = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  overflow-y: auto;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SelectedText = styled.div`
  padding: 12px 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245,158,11,0.08)'
      : 'rgba(245, 158, 11, 0.06)'};
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 12px;
  font-size: 13px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#78350f')};
  font-weight: 500;

  strong {
    display: block;
    margin-bottom: 4px;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f59e0b' : '#92400e')};
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`

const ResultsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
`

interface EntityLinkModalProps {
  visible: boolean
  selectedText: string
  query: string
  results: MentionItem[]
  selectedIndex: number
  loading: boolean
  /** 서버 검색 모드 여부(entityLinkRemote) */
  remote: boolean
  /** 편집기에 넘긴 로컬 멘션 목록이 있는지(Boolean(mentionEntities)) */
  hasMentionEntities: boolean
  countryId?: string
  playClickSound: () => void
  onQueryChange: (query: string) => void
  onSelectedIndexChange: Dispatch<SetStateAction<number>>
  onInsert: (item: MentionItem) => void
  onClose: () => void
}

function EntityLinkModalComponent({
  visible,
  selectedText,
  query,
  results,
  selectedIndex,
  loading,
  remote,
  hasMentionEntities,
  countryId,
  playClickSound,
  onQueryChange,
  onSelectedIndexChange,
  onInsert,
  onClose,
}: EntityLinkModalProps) {
  if (!visible || typeof document === 'undefined') return null
  return createPortal(
    <Overlay onClick={onClose}>
      <ModalCard onClick={(event) => event.stopPropagation()}>
        <Header>
          <Title>엔티티 연결</Title>
          <CloseButton onClick={onClose} aria-label="닫기">
            <FiX size={20} />
          </CloseButton>
        </Header>
        <Content>
          <SelectedText>
            <strong>선택한 텍스트</strong>"{selectedText}"
          </SelectedText>

          <SearchInput
            type="text"
            placeholder="연결할 엔티티 검색 (인물, 사건, 국가, 정당 등)"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                onSelectedIndexChange((prev) =>
                  prev < results.length - 1 ? prev + 1 : 0,
                )
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                onSelectedIndexChange((prev) =>
                  prev > 0 ? prev - 1 : results.length - 1,
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
            {loading ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '13px',
                }}
              >
                {remote && query.trim().length > 0
                  ? '서버에서 검색 중입니다…'
                  : '인물·사건·국가·정당 등 목록을 불러오는 중입니다…'}
              </div>
            ) : results.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '13px',
                }}
              >
                {query.trim() === '' ? (
                  <>
                    {remote && !hasMentionEntities ? (
                      <>
                        검색어를 한 글자 이상 입력하면 서버에서
                        인물·사건·국가·정당 등을 찾습니다.
                        {countryId ? (
                          <span> (정당은 이 국가 소속만)</span>
                        ) : null}
                      </>
                    ) : (
                      <>
                        연결할 수 있는 항목이 없습니다. (등록된
                        인물·사건·국가·정당 등이 없거나, 이 편집기에 넘긴 목록이
                        비어 있습니다.)
                        <div
                          style={{
                            fontSize: '11px',
                            marginTop: '10px',
                            color: '#cbd5e1',
                          }}
                        >
                          검색어를 입력하면 목록에서 좁혀 볼 수 있습니다.
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  '검색 결과가 없습니다'
                )}
              </div>
            ) : (
              (() => {
                // 타입별로 그룹화
                const grouped: Record<string, MentionItem[]> = {}
                results.forEach((item) => {
                  if (!grouped[item.type]) {
                    grouped[item.type] = []
                  }
                  grouped[item.type].push(item)
                })

                let globalIndex = 0
                return Object.entries(grouped).map(([type, items]) => {
                  const typeConfig =
                    MENTION_TYPE_CONFIG[
                      type as keyof typeof MENTION_TYPE_CONFIG
                    ]
                  const startIndex = globalIndex
                  globalIndex += items.length

                  return (
                    <div key={type} style={{ marginBottom: '12px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          background: 'rgba(79, 70, 229, 0.06)',
                          borderRadius: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        {typeConfig && typeConfig.icon && (
                          <span style={{ color: typeConfig.color }}>
                            {React.createElement(typeConfig.icon, {
                              size: 14,
                            })}
                          </span>
                        )}
                        <span style={{ color: '#64748b' }}>
                          {typeConfig?.label || type}
                        </span>
                        <span
                          style={{
                            marginLeft: 'auto',
                            fontSize: '10px',
                            color: '#94a3b8',
                          }}
                        >
                          {items.length}
                        </span>
                      </div>
                      {items.map((item, itemIndex) => {
                        const currentIndex = startIndex + itemIndex
                        return (
                          <div
                            key={`${item.type}-${item.id}`}
                            style={{
                              padding: '12px 14px',
                              cursor: 'pointer',
                              background:
                                currentIndex === selectedIndex
                                  ? 'rgba(245, 158, 11, 0.08)'
                                  : 'transparent',
                              borderRadius: '10px',
                              marginBottom: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              border:
                                currentIndex === selectedIndex
                                  ? '1px solid rgba(245, 158, 11, 0.25)'
                                  : '1px solid transparent',
                            }}
                            onMouseEnter={() =>
                              onSelectedIndexChange(currentIndex)
                            }
                            onClick={() => {
                              playClickSound()
                              onInsert(item)
                            }}
                          >
                            {(() => {
                              /* 인물이며 프로필 이미지가 있으면 아바타 썸네일 —
                                 동명이인 구분에 도움. 없으면 기존 타입 아이콘. */
                              const avatarRaw =
                                item.type === 'person'
                                  ? (
                                      item.data as {
                                        imageUrl?: string | null
                                      } | null
                                    )?.imageUrl
                                  : undefined
                              if (avatarRaw) {
                                return (
                                  <img
                                    src={getUploadImageUrl(avatarRaw) || avatarRaw}
                                    alt=""
                                    loading="lazy"
                                    style={{
                                      width: 28,
                                      height: 28,
                                      flexShrink: 0,
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      filter: 'grayscale(1)',
                                    }}
                                  />
                                )
                              }
                              if (item.icon) {
                                return (
                                  <span
                                    style={{
                                      color: item.color,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {React.createElement(item.icon, {
                                      size: 18,
                                    })}
                                  </span>
                                )
                              }
                              return null
                            })()}
                            <span
                              style={{
                                flex: 1,
                                fontWeight: 500,
                                fontSize: '14px',
                                color: '#0f172a',
                              }}
                            >
                              {item.name}
                            </span>
                            {item.subtitle && (
                              <span
                                style={{
                                  fontSize: '12px',
                                  color: '#64748b',
                                }}
                              >
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              })()
            )}
          </ResultsList>
        </Content>
      </ModalCard>
    </Overlay>,
    document.body,
  )
}

export const EntityLinkModal = React.memo(EntityLinkModalComponent)
