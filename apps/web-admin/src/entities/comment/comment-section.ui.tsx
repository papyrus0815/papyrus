/**
 * 콘텐츠 댓글 스레드 (목록 + 입력). 모달(<CommentModal>)과 사건 상세 인라인 섹션이 공유.
 * 폴리모픽(ownerType+recordId)이라 추후 인물·국가 댓글에도 그대로 재사용.
 */
import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'

import { notify } from '@/shared/ui/toast'
import { confirm } from '@/shared/ui/confirm-dialog'

import {
  type Comment,
  commentsQueryOptions,
  createComment,
  deleteComment,
  invalidateComments,
} from './comment.api'

interface CommentSectionProps {
  ownerType: string
  recordId: string
}

function extractMessage(error: unknown, fallback: string): string {
  const raw = (error as { message?: string })?.message
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.message) return String(parsed.message)
  } catch {
    // raw가 JSON이 아니면 그대로 사용
  }
  return raw.length < 120 ? raw : fallback
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function CommentSection({ ownerType, recordId }: CommentSectionProps) {
  const queryClient = useQueryClient()
  const {
    data: comments,
    isLoading,
    isError,
    refetch,
  } = useQuery(commentsQueryOptions(ownerType, recordId))
  const [text, setText] = useState('')

  const createMutation = useMutation({
    mutationFn: () => createComment(ownerType, recordId, text.trim()),
    onSuccess: () => {
      setText('')
      invalidateComments(queryClient, ownerType, recordId)
    },
    onError: (error) => notify.error(extractMessage(error, '댓글 등록에 실패했습니다')),
  })

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => invalidateComments(queryClient, ownerType, recordId),
    onError: (error) => notify.error(extractMessage(error, '댓글 삭제에 실패했습니다')),
  })

  const handleSubmit = () => {
    if (text.trim()) createMutation.mutate()
  }

  const handleDelete = async (commentId: string) => {
    const confirmed = await confirm({
      title: '댓글 삭제',
      message: '이 댓글을 삭제할까요?',
      danger: true,
    })
    if (confirmed) deleteMutation.mutate(commentId)
  }

  const list: Comment[] = comments ?? []

  return (
    <>
      {isLoading ? (
        <Muted>댓글을 불러오는 중…</Muted>
      ) : isError ? (
        <Muted>
          댓글을 불러오지 못했습니다.{' '}
          <RetryButton type="button" onClick={() => refetch()}>
            다시 시도
          </RetryButton>
        </Muted>
      ) : list.length === 0 ? (
        <Muted>첫 댓글을 남겨보세요.</Muted>
      ) : (
        <List>
          {list.map((comment) => (
            <Item key={comment.id}>
              {comment.authorAvatarUrl ? (
                <Avatar src={comment.authorAvatarUrl} alt="" />
              ) : (
                <AvatarFallback>{comment.authorName.charAt(0).toUpperCase()}</AvatarFallback>
              )}
              <Main>
                <MetaRow>
                  <Author>{comment.authorName}</Author>
                  <Time>{formatTime(comment.createdAt)}</Time>
                </MetaRow>
                <Text>{comment.content}</Text>
              </Main>
              {comment.canDelete && (
                <DeleteButton type="button" onClick={() => handleDelete(comment.id)}>
                  삭제
                </DeleteButton>
              )}
            </Item>
          ))}
        </List>
      )}

      <InputRow>
        <Textarea
          value={text}
          onChange={(changeEvent) => setText(changeEvent.target.value)}
          placeholder={isError ? '댓글을 사용할 수 없습니다' : '댓글을 입력하세요'}
          maxLength={1000}
          rows={2}
          disabled={isError}
        />
        <SubmitButton
          type="button"
          onClick={handleSubmit}
          disabled={isError || !text.trim() || createMutation.isPending}
        >
          등록
        </SubmitButton>
      </InputRow>
    </>
  )
}

const Muted = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 16px 0;
  text-align: center;
`

const RetryButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary ?? '#6366f1'};
  text-decoration: underline;
`

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 320px;
  overflow-y: auto;
  margin-bottom: 12px;
`

const Item = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
`

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`

const AvatarFallback = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary ?? '#6366f1'};
  flex-shrink: 0;
`

const Main = styled.div`
  flex: 1;
  min-width: 0;
`

const MetaRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
`

const Author = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Time = styled.time`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Text = styled.p`
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: pre-wrap;
  word-break: break-word;
`

const DeleteButton = styled.button`
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 2px 4px;
`

const InputRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
`

const Textarea = styled.textarea`
  flex: 1;
  resize: vertical;
  min-height: 40px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  font-family: inherit;
`

const SubmitButton = styled.button`
  flex-shrink: 0;
  padding: 9px 16px;
  border-radius: 10px;
  border: none;
  background: ${({ theme }) => theme.colors.primary ?? '#6366f1'};
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`
