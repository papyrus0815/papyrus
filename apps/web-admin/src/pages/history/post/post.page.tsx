import { useState, useCallback, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import {
  usePostList,
  useDeletePost,
  useUpdatePost,
} from '@/features/post/use-posts.hook'
import { PostForm } from './components/PostForm'
import type { PostItem } from '@/shared/api/post'
import { getUploadImageUrl, uploadImage } from '@/shared/api/upload'
import { getGlossaryTermById } from '@/shared/api/glossary'
import { useFormEntities } from '@/entities/event-form/model'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/RichTextEditor'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '임시저장',
  PUBLISHED: '게시됨',
  PENDING_REVIEW: '검토중',
  REPORTED: '신고됨',
  DELETED: '삭제됨',
}

export default function PostPage() {
  const { data, isLoading } = usePostList({ pageSize: 100 })
  const deletePost = useDeletePost()
  const updatePost = useUpdatePost()
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [editingContent, setEditingContent] = useState(false)
  const [draftContent, setDraftContent] = useState('')
  const [termTooltip, setTermTooltip] = useState<{
    termId: string
    name: string
    description: string | null
    x: number
    y: number
  } | null>(null)
  const {
    availablePersons,
    availableCountries,
    availableHistoricalCountries,
    availableEvents,
    availableMilitaryUnits,
    availableDynasties,
    refetch: refetchEntities,
  } = useFormEntities()
  const mentionEntities = useMemo(
    () => ({
      persons: availablePersons,
      events: availableEvents,
      countries: availableCountries,
      historicalCountries: availableHistoricalCountries,
      militaryUnits: availableMilitaryUnits ?? [],
      dynasties: availableDynasties ?? [],
    }),
    [
      availablePersons,
      availableEvents,
      availableCountries,
      availableHistoricalCountries,
      availableMilitaryUnits,
      availableDynasties,
    ],
  )

  const list = data?.curations ?? []
  const total = data?.total ?? 0
  const filtered =
    statusFilter === ''
      ? list
      : list.filter((p) => p.status === statusFilter)

  const [view, setView] = useState<'list' | 'detail' | 'form'>('list')

  const handleCreate = () => {
    setSelectedPost(null)
    setView('form')
  }

  const handleOpenDetail = (post: PostItem) => {
    setSelectedPost(post)
    setView('detail')
  }

  const handleEdit = (post: PostItem) => {
    setSelectedPost(post)
    setView('form')
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('이 포스트를 삭제하시겠습니까?')) {
      await deletePost.mutateAsync(id)
      if (view === 'detail' && selectedPost?.id === id) {
        setView('list')
        setSelectedPost(null)
      }
    }
  }

  const handleBackFromDetail = () => {
    setView('list')
    setSelectedPost(null)
  }

  const handleBackFromForm = () => {
    setView('list')
    setSelectedPost(null)
  }

  const handleFormSuccess = () => {
    setView('list')
    setSelectedPost(null)
  }

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const startEditContent = useCallback(() => {
    setDraftContent(selectedPost?.content ?? '')
    setEditingContent(true)
  }, [selectedPost?.content])

  const cancelEditContent = useCallback(() => {
    setEditingContent(false)
    setDraftContent('')
  }, [])

  const saveEditContent = useCallback(async () => {
    if (!selectedPost) return
    const isFirstTime = !selectedPost.content?.trim()
    updatePost.mutate(
      { id: selectedPost.id, data: { content: draftContent } },
      {
        onSuccess: () => {
          setSelectedPost((prev) =>
            prev ? { ...prev, content: draftContent } : null,
          )
          setEditingContent(false)
          setDraftContent('')
          toast.success(isFirstTime ? '본문이 등록되었습니다.' : '저장되었습니다.')
        },
        onError: (err) => {
          toast.error(
            isFirstTime
              ? '등록에 실패했습니다.'
              : err instanceof Error
                ? err.message
                : '저장에 실패했습니다.',
          )
        },
      },
    )
  }, [selectedPost, draftContent, updatePost])

  useEffect(() => {
    if (!termTooltip) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTermTooltip(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [termTooltip])

  const handleDetailProseClick = useCallback((e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('.term')
    if (!target) return
    const termId = target.getAttribute('data-term-id')
    const name =
      target.getAttribute('data-term-name') || target.textContent || ''
    if (termId) {
      e.preventDefault()
      setTermTooltip({
        termId,
        name,
        description: null,
        x: e.clientX,
        y: e.clientY,
      })
      getGlossaryTermById(termId)
        .then((t) => {
          setTermTooltip((prev) =>
            prev ? { ...prev, description: t.description ?? null } : null,
          )
        })
        .catch(() => {
          setTermTooltip((prev) =>
            prev
              ? { ...prev, description: '(설명을 불러올 수 없습니다)' }
              : null,
          )
        })
    }
  }, [])

  // 상세 영역: 전체 사건 상세(dashboard-event-detail)와 동일 — 섹션 + 수정 시 인라인 에디터
  if (view === 'detail' && selectedPost) {
    return (
      <DetailPage
        as={motion.article}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        aria-label="포스트 상세"
      >
        <DetailTopBar>
          <DetailBack type="button" onClick={handleBackFromDetail}>
            ← 목록
          </DetailBack>
          <DetailActions>
            <DetailEditBtn
              type="button"
              onClick={() => handleEdit(selectedPost)}
              aria-label="포스트 전체 수정(폼)"
            >
              <FiEdit2 size={14} />
              수정
            </DetailEditBtn>
            <DetailDeleteBtn
              type="button"
              onClick={() => handleDelete(selectedPost.id)}
              aria-label="포스트 삭제"
            >
              <FiTrash2 size={14} />
              삭제
            </DetailDeleteBtn>
          </DetailActions>
        </DetailTopBar>

        <DetailHeadline>{selectedPost.title || '제목 없음'}</DetailHeadline>
        <DetailByline>
          <span>{formatDate(selectedPost.publishedAt ?? selectedPost.createdAt)}</span>
          <span> · </span>
          <span>{STATUS_LABEL[selectedPost.status] ?? selectedPost.status}</span>
          {selectedPost.keywords?.trim() && (
            <>
              <span> · </span>
              <span>{selectedPost.keywords.trim()}</span>
            </>
          )}
        </DetailByline>

        <DetailSection>
          <SectionTitleRow>
            <SectionTitle>본문</SectionTitle>
            {!editingContent ? (
              <SectionEditBtn
                type="button"
                onClick={startEditContent}
                aria-label={selectedPost.content?.trim() ? '본문 수정' : '본문 추가'}
              >
                <FiEdit2 size={14} />
                {selectedPost.content?.trim() ? '수정' : '추가'}
              </SectionEditBtn>
            ) : null}
          </SectionTitleRow>
          {editingContent ? (
            <>
              <SectionEditorWrap>
                <RichTextEditor
                  value={draftContent}
                  onChange={setDraftContent}
                  placeholder={selectedPost.content?.trim() ? '본문을 수정하세요.' : '본문 내용을 입력하세요.'}
                  mentionEntities={mentionEntities}
                  onEntityModalOpen={refetchEntities}
                  documentScope={selectedPost ? { type: 'post', id: selectedPost.id } : undefined}
                  onImageUpload={async (file) => {
                    const result = await uploadImage(file, 'attachments')
                    return getUploadImageUrl(result.url) || result.url
                  }}
                />
              </SectionEditorWrap>
              <SectionEditActions>
                <SectionEditBtn
                  type="button"
                  onClick={cancelEditContent}
                  disabled={updatePost.isPending}
                >
                  취소
                </SectionEditBtn>
                <SectionSaveBtn
                  type="button"
                  onClick={saveEditContent}
                  disabled={updatePost.isPending}
                  $isRegister={!selectedPost.content?.trim()}
                >
                  {updatePost.isPending
                    ? !selectedPost.content?.trim()
                      ? '등록 중…'
                      : '저장 중…'
                    : !selectedPost.content?.trim()
                      ? '등록'
                      : '저장'}
                </SectionSaveBtn>
              </SectionEditActions>
            </>
          ) : (
            <div onClick={handleDetailProseClick} role="presentation">
              <DetailProse dangerouslySetInnerHTML={{ __html: selectedPost.content || '' }} />
            </div>
          )}
        </DetailSection>
        {termTooltip && (
          <TermTooltipOverlay
            role="presentation"
            onClick={() => setTermTooltip(null)}
          >
            <TermTooltipPopover
              $x={termTooltip.x}
              $y={termTooltip.y}
              onClick={(e) => e.stopPropagation()}
            >
              <strong>{termTooltip.name}</strong>
              <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {termTooltip.description === null
                  ? ' 로딩…'
                  : termTooltip.description || '(설명 없음)'}
              </span>
            </TermTooltipPopover>
          </TermTooltipOverlay>
        )}
      </DetailPage>
    )
  }

  // 새 포스트 작성/수정: 대시보드·전체사건과 동일한 폼 뷰
  if (view === 'form') {
    return (
      <Root
        as={motion.div}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        $isForm
      >
        <FormSection aria-label={selectedPost ? '포스트 수정' : '포스트 작성'}>
          <PostForm
            post={selectedPost}
            onBack={handleBackFromForm}
            onSuccess={handleFormSuccess}
          />
        </FormSection>
      </Root>
    )
  }

  return (
    <Root
      as={motion.div}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <header className="post-header">
        <div>
          <h2 className="post-title">포스트</h2>
          <p className="post-desc">
            등록된 포스트를 상태별로 확인할 수 있습니다. 카드를 클릭하면 상세에서 수정·삭제할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          aria-label="새 포스트 작성"
          className="post-create-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          새 포스트 작성
        </button>
      </header>

      <div className="post-tabs-kpi">
        <GovTabNav>
          <GovTabButton type="button" $active={statusFilter === ''} onClick={() => setStatusFilter('')}>
            전체
          </GovTabButton>
          {(['PUBLISHED', 'DRAFT', 'PENDING_REVIEW'] as const).map((s) => (
            <GovTabButton
              key={s}
              type="button"
              $active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            >
              {STATUS_LABEL[s] ?? s}
            </GovTabButton>
          ))}
        </GovTabNav>
        <KpiBox>
          <div className="kpi-inner">
            <span className="kpi-label">등록 포스트</span>
            <span className="kpi-value">
              {total}
              <span className="kpi-unit">개</span>
            </span>
          </div>
        </KpiBox>
      </div>

      <section aria-label="포스트 목록" className="post-list-section">
        <div className="section-head">
          <h3 className="section-title">포스트 목록</h3>
          <p className="section-desc">
            등록된 포스트 목록입니다. 카드를 클릭하면 상세 보기·수정·삭제가 가능합니다.
          </p>
        </div>

        {isLoading && list.length === 0 ? (
          <LoadingBlock>불러오는 중…</LoadingBlock>
        ) : filtered.length === 0 ? (
          <EmptyBlock
            as={motion.div}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="empty-glow" />
            <div className="empty-inner">
              <h3 className="empty-title">
                {statusFilter ? '해당 상태의 포스트가 없습니다' : '등록된 포스트가 없습니다'}
              </h3>
              <p className="empty-desc">
                위 <strong>새 포스트 작성</strong> 버튼을 눌러 첫 포스트를 작성해 보세요.
              </p>
            </div>
          </EmptyBlock>
        ) : (
          <CardGrid>
            <AnimatePresence>
              {filtered.map((post, i) => (
                <PostCard
                  key={post.id}
                  as={motion.article}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ delay: Math.min(i * 0.03, 0.15), duration: 0.3 }}
                >
                  <CardInner>
                    <CardTitle onClick={() => handleOpenDetail(post)}>
                      {post.title || '제목 없음'}
                    </CardTitle>
                    <CardMeta>
                      <DateText>{formatDate(post.publishedAt ?? post.createdAt)}</DateText>
                      <StatusPill $status={post.status}>
                        {STATUS_LABEL[post.status] ?? post.status}
                      </StatusPill>
                    </CardMeta>
                    <CardExcerpt>
                      {post.content
                        ? (() => {
                            const plain = post.content.replace(/<[^>]+>/g, '').trim()
                            return plain.slice(0, 120) + (plain.length > 120 ? '…' : '')
                          })()
                        : '내용 없음'}
                    </CardExcerpt>
                    <CardFoot>
                      <StatList>
                        <span>조회 {post.viewCount}</span>
                        <span>좋아요 {post.likeCount}</span>
                        <span>댓글 {post.commentCount}</span>
                        {post.keywords?.trim() && (
                          <span className="kw">{post.keywords.trim()}</span>
                        )}
                      </StatList>
                    </CardFoot>
                  </CardInner>
                </PostCard>
              ))}
            </AnimatePresence>
          </CardGrid>
        )}
      </section>
    </Root>
  )
}

// ---------- 스타일: 대시보드/전체사건(events-timeline-section) 디자인 참조 ----------

const FormSection = styled.section`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

/* 포스트 상세: 전체 사건 상세(dashboard-event-detail)와 동일한 레이아웃·타이포 */
const DETAIL_ARTICLE_MAX_WIDTH = '680px'
const DetailSansFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"

const DetailPage = styled.article`
  max-width: ${DETAIL_ARTICLE_MAX_WIDTH};
  margin: 0 auto;
  padding: 40px 28px 64px;
  background: #ffffff;
  min-height: 100%;
  font-family: ${DetailSansFamily};
`

const DetailTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`

const DetailBack = styled.button`
  font-family: ${DetailSansFamily};
  padding: 0;
  border: none;
  background: none;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: color 0.15s;
  &:hover {
    color: #111827;
    text-decoration: underline;
  }
`

const DetailActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 16px;
`

/* 전체 사건 상세 EditButton과 동일 */
const DetailEditBtn = styled.button`
  font-family: ${DetailSansFamily};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  &:hover {
    color: #111827;
    text-decoration: underline;
  }
`

/* 수정 버튼과 동일 스타일, 삭제만 빨간색 */
const DetailDeleteBtn = styled.button`
  font-family: ${DetailSansFamily};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: #dc2626;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  &:hover {
    color: #b91c1c;
    text-decoration: underline;
  }
`

const DetailHeadline = styled.h1`
  font-family: ${DetailSansFamily};
  font-size: clamp(24px, 4vw, 32px);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #121212;
  margin: 0 0 16px;
`

const DetailByline = styled.p`
  font-family: ${DetailSansFamily};
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebebeb;
`

/* 사건 상세와 동일: 섹션 + 수정 버튼 */
const DetailSection = styled.section`
  margin-bottom: 40px;
  &:last-of-type {
    margin-bottom: 0;
  }
`
const SectionTitle = styled.h2`
  font-family: ${DetailSansFamily};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b7280;
  margin: 0 0 14px;
`
const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  ${SectionTitle} {
    margin: 0;
  }
`
const SectionEditBtn = styled.button`
  font-family: ${DetailSansFamily};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  &:hover {
    color: #111827;
    text-decoration: underline;
  }
`
const SectionEditorWrap = styled.div`
  width: 100%;
  min-height: 240px;
  margin-bottom: 12px;
`
const SectionEditActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`
const SectionSaveBtn = styled.button<{ $isRegister?: boolean }>`
  font-family: ${DetailSansFamily};
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: ${(p) => (p.$isRegister ? '#059669' : '#4f46e5')};
  border: none;
  border-radius: 8px;
  padding: ${(p) => (p.$isRegister ? '10px 20px' : '8px 16px')};
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
  &:hover:not(:disabled) {
    background: ${(p) => (p.$isRegister ? '#047857' : '#4338ca')};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const DetailProse = styled.div`
  font-family: ${DetailSansFamily};
  font-size: 15px;
  line-height: 1.7;
  color: #111827;
  white-space: pre-wrap;
  word-break: break-word;

  p {
    margin: 0 0 1em;
  }
  p:last-child {
    margin-bottom: 0;
  }
  strong {
    font-weight: 700;
  }
  /* 에디터와 동일: 순서 없음/있음 목록 들여쓰기 */
  ul,
  ol {
    margin: 12px 0;
    padding-left: 28px;
  }
  .mention,
  .entity-link {
    color: inherit;
    font-weight: inherit;
    text-decoration: none;
    cursor: pointer;
    display: inline;
    padding: 1px 6px;
    margin: 0 1px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.03);
    border: none;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .mention:hover,
  .entity-link:hover {
    color: #1d4ed8;
    background: rgba(29, 78, 216, 0.06);
  }
  /* 설명이 달린 문구 — 기본은 색만, 호버 시 구분되게 */
  .term {
    color: #0f766e;
    cursor: pointer;
    padding: 0 2px;
    border-radius: 3px;
    transition: color 0.15s ease, background 0.15s ease;
  }
  .term:hover {
    color: #0d9488;
    background: rgba(13, 148, 136, 0.1);
  }

  /* 에디터(RichTextEditor)와 동일한 수평선 */
  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 24px 0;
    height: 1px;
    display: block;
  }
`

const TermTooltipOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 999;
  background: transparent;
`
const TermTooltipPopover = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  transform: translate(12px, 12px);
  max-width: 360px;
  padding: 14px 18px;
  background: #fff;
  border-radius: 12px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.06);
  z-index: 1000;
  font-size: 13px;
  line-height: 1.5;
  color: #374151;
  strong {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    color: #0d9488;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const Root = styled.div<{ $isForm?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => (p.$isForm ? 0 : 32)}px;
  padding: ${(p) => (p.$isForm ? '24px 28px 0' : '36px 32px 48px')};
  background: #ffffff;
  min-height: ${(p) => (p.$isForm ? 0 : 'calc(100vh - 200px)')};
  height: ${(p) => (p.$isForm ? '100%' : 'auto')};
  overflow: ${(p) => (p.$isForm ? 'hidden' : 'visible')};
  box-sizing: border-box;

  .post-header {
    padding-bottom: 24px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
  }
  .post-title {
    margin: 0;
    font-size: 26px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.04em;
    line-height: 1.25;
  }
  .post-desc {
    margin: 10px 0 0;
    font-size: 15px;
    color: #64748b;
    line-height: 1.55;
    max-width: 540px;
    font-weight: 500;
  }
  .post-create-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    background: #fff;
    color: #374151;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    flex-shrink: 0;
    transition: border-color 0.2s, background 0.2s, color 0.2s;
  }
  .post-create-btn:hover {
    border-color: #c7d2fe;
    background: #f5f3ff;
    color: #4f46e5;
  }
  .post-tabs-kpi {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .post-list-section {
    padding-top: 8px;
  }
  .section-head {
    margin-bottom: 28px;
  }
  .section-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.02em;
  }
  .section-desc {
    margin: 6px 0 0;
    font-size: 14px;
    color: #64748b;
    font-weight: 500;
  }
  .kpi-inner {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .kpi-label {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .kpi-value {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.03em;
  }
  .kpi-unit {
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    margin-left: 2px;
  }
`

const GovTabNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  width: fit-content;
  background: #f1f5f9;
  border-radius: 20px;
  overflow-x: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`

const GovTabButton = styled.button<{ $active?: boolean }>`
  flex: 0 0 auto;
  padding: 10px 18px;
  border-radius: 14px;
  border: none;
  background: ${(p) => (p.$active ? '#ffffff' : 'transparent')};
  color: ${(p) => (p.$active ? '#4f46e5' : '#64748b')};
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? '600' : '500')};
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, box-shadow 0.2s ease;
  white-space: nowrap;
  box-shadow: ${(p) => (p.$active ? '0 2px 8px rgba(79, 70, 229, 0.12)' : 'none')};
  &:hover {
    color: ${(p) => (p.$active ? '#4f46e5' : '#475569')};
    background: ${(p) => (p.$active ? '#ffffff' : 'rgba(255,255,255,0.6)')};
  }
`

const KpiBox = styled.div`
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
  padding: 20px 28px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
`

const LoadingBlock = styled.div`
  padding: 56px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
  background: #f9fafb;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
`

const EmptyBlock = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 40px 72px;
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;

  .empty-glow {
    position: absolute;
    left: 50%;
    top: 20%;
    width: 280px;
    height: 280px;
    margin-left: -140px;
    margin-top: -140px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 70%);
    filter: blur(32px);
    pointer-events: none;
  }
  .empty-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .empty-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.02em;
  }
  .empty-desc {
    margin: 10px 0 0;
    font-size: 14px;
    color: #64748b;
    max-width: 320px;
    line-height: 1.55;
    font-weight: 500;
  }
  .empty-desc strong {
    color: #475569;
    font-weight: 600;
  }
`

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
`

/* 전체 사건(events-timeline-section) 카드와 동일: 흰 배경, padding 24, 제목 → 날짜 → 요약 */
const PostCard = styled.article`
  text-align: left;
  background: #fff;
  border-radius: 16px;
  min-height: 160px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: #c7d2fe;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);
  }
`

const CardInner = styled.div`
  padding: 24px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

const CardTitle = styled.button`
  display: block;
  width: 100%;
  margin: 0 0 8px;
  padding: 0;
  border: none;
  background: none;
  text-align: left;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
  line-height: 1.35;
  cursor: pointer;
  transition: color 0.15s;

  &:hover {
    color: #4f46e5;
  }
`

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`

const DateText = styled.span`
  font-size: 13px;
  color: #64748b;
`

const StatusPill = styled.span<{ $status: string }>`
  font-size: 12px;
  font-weight: 600;
  color: ${(p) =>
    p.$status === 'PUBLISHED' ? '#166534' :
    p.$status === 'DRAFT' ? '#92400e' :
    '#64748b'};
`

const CardExcerpt = styled.p`
  margin: 0 0 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const CardFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
`

const StatList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;

  .kw {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #64748b;
  }
`

