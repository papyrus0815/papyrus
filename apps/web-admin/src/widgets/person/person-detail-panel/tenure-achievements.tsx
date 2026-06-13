/**
 * 재임·재위 카드 안에서 업적·한일을 열람/추가/수정/삭제하는 인라인 타임라인 섹션.
 *
 * - 백엔드는 인물 상세(`GET /persons/:id/detail`)의 각 재임·재위에 achievements를 함께 내려줌.
 * - 등록·수정·삭제는 재임(tenure) / 재위(reign)에 따라 다른 엔드포인트를 호출 (personCareerApi).
 * - 변경 후에는 onChanged()로 부모가 상세 쿼리를 무효화해 최신 목록을 다시 받게 함.
 * - accent 색은 부모 카드(재임=인디고 / 재위=틸)와 연동.
 */
import { useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import {
  FiAward,
  FiCalendar,
  FiChevronRight,
  FiEdit2,
  FiEyeOff,
  FiLink,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi'

import { personCareerApi } from '@/shared/api/person-career'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import { formatIsoDateKo } from './helpers'
import {
  AchievementAddBtn,
  AchievementCancelBtn,
  AchievementCheckboxRow,
  AchievementChevron,
  AchievementCount,
  AchievementDateChip,
  AchievementDateField,
  AchievementEmpty,
  AchievementEventBadge,
  AchievementForm,
  AchievementFormActions,
  AchievementFormRow,
  AchievementHeaderRow,
  AchievementHiddenBadge,
  AchievementIconBtn,
  AchievementNode,
  AchievementRowActions,
  AchievementRowDesc,
  AchievementRowMain,
  AchievementRowMeta,
  AchievementRowTitle,
  AchievementSaveBtn,
  AchievementSection,
  AchievementTextarea,
  AchievementTimeline,
  AchievementTitleInput,
  AchievementToggle,
} from './person-detail-panel.styles'

export interface TenureAchievementItem {
  id: string
  title?: string | null
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  orderNum?: number | null
  showOnEventsPage?: boolean | null
  eventId?: string | null
  event?: { id: string; title?: string | null; deletedAt?: string | null } | null
}

interface TenureAchievementsProps {
  hostId: string
  hostKind: 'tenure' | 'reign'
  achievements: TenureAchievementItem[]
  /** 읽기 전용 모드(모달 임베드) — 추가·수정·삭제 컨트롤 숨김 */
  readOnly?: boolean
  /** 변경 후 부모가 상세 쿼리를 무효화하도록 알림 */
  onChanged: () => void
  onPlayClick?: () => void
}

/** ISO → input[type=date] 값(YYYY-MM-DD) */
const toDateInput = (iso: string | null | undefined): string =>
  iso ? iso.slice(0, 10) : ''

const collapseVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto' },
}

export function TenureAchievements({
  hostId,
  hostKind,
  achievements,
  readOnly = false,
  onChanged,
  onPlayClick,
}: TenureAchievementsProps) {
  const list = [...(achievements ?? [])].sort((a, b) => {
    const oa = a.orderNum ?? 0
    const ob = b.orderNum ?? 0
    if (oa !== ob) return oa - ob
    return (a.startDate ?? '').localeCompare(b.startDate ?? '')
  })

  const [expanded, setExpanded] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showOnEventsPage, setShowOnEventsPage] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const isReign = hostKind === 'reign'

  const resetForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setTitle('')
    setDescription('')
    setStartDate('')
    setEndDate('')
    setShowOnEventsPage(true)
  }

  const openAddForm = () => {
    onPlayClick?.()
    setEditingId(null)
    setTitle('')
    setDescription('')
    setStartDate('')
    setEndDate('')
    setShowOnEventsPage(true)
    setExpanded(true)
    setFormOpen(true)
  }

  const openEditForm = (a: TenureAchievementItem) => {
    onPlayClick?.()
    setEditingId(a.id)
    setTitle(a.title ?? '')
    setDescription(a.description ?? '')
    setStartDate(toDateInput(a.startDate))
    setEndDate(toDateInput(a.endDate))
    setShowOnEventsPage(a.showOnEventsPage ?? true)
    setExpanded(true)
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      notify.error('제목을 입력하세요.')
      return
    }
    const dto = {
      title: title.trim(),
      description: description.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      showOnEventsPage,
    }
    setSubmitting(true)
    try {
      if (editingId) {
        if (isReign) {
          await personCareerApi.updateSovereignReignAchievement(
            hostId,
            editingId,
            dto,
          )
        } else {
          await personCareerApi.updateTenureAchievement(hostId, editingId, dto)
        }
        notify.success('업적이 수정되었습니다.')
      } else {
        if (isReign) {
          await personCareerApi.createSovereignReignAchievement(hostId, dto)
        } else {
          await personCareerApi.createTenureAchievement(hostId, dto)
        }
        notify.success('업적·한일이 등록되었습니다.')
      }
      resetForm()
      onChanged()
    } catch (err: any) {
      notify.error(
        err?.message ??
          (editingId ? '수정에 실패했습니다.' : '등록에 실패했습니다.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (achievementId: string) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '이 업적을 삭제하시겠습니까?',
        danger: true,
      }))
    )
      return
    onPlayClick?.()
    try {
      if (isReign) {
        await personCareerApi.deleteSovereignReignAchievement(
          hostId,
          achievementId,
        )
      } else {
        await personCareerApi.deleteTenureAchievement(hostId, achievementId)
      }
      if (editingId === achievementId) resetForm()
      notify.success('업적이 삭제되었습니다.')
      onChanged()
    } catch (err: any) {
      notify.error(err?.message ?? '삭제에 실패했습니다.')
    }
  }

  // 읽기 전용이며 업적이 하나도 없으면 섹션 자체를 렌더링하지 않음
  if (readOnly && list.length === 0) return null

  return (
    <AchievementSection $kind={hostKind}>
      <AchievementHeaderRow>
        <AchievementToggle
          type="button"
          onClick={() => {
            onPlayClick?.()
            setExpanded((v) => !v)
          }}
          aria-expanded={expanded}
        >
          <AchievementChevron $open={expanded}>
            <FiChevronRight size={13} />
          </AchievementChevron>
          <FiAward className="ach-trophy" size={12} />
          <span>업적·한일</span>
          {list.length > 0 && <AchievementCount>{list.length}</AchievementCount>}
        </AchievementToggle>
        {!readOnly && (
          <AchievementAddBtn type="button" onClick={openAddForm}>
            <FiPlus size={11} />
            추가
          </AchievementAddBtn>
        )}
      </AchievementHeaderRow>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="ach-body"
            variants={collapseVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {list.length === 0 && !formOpen ? (
              <AchievementEmpty>등록된 업적·한일이 없습니다.</AchievementEmpty>
            ) : (
              <AchievementTimeline>
                {list.map((a) => {
                  const startStr = formatIsoDateKo(a.startDate)
                  const endStr = a.endDate ? formatIsoDateKo(a.endDate) : null
                  const period =
                    startStr || endStr
                      ? `${startStr || '?'}${endStr ? ` – ${endStr}` : ''}`
                      : null
                  const eventDeleted = a.event?.deletedAt != null
                  const hasMeta =
                    !!period ||
                    (!!a.event && !eventDeleted) ||
                    a.showOnEventsPage === false
                  return (
                    <AchievementNode key={a.id}>
                      <AchievementRowMain>
                        <AchievementRowTitle>{a.title}</AchievementRowTitle>
                        {hasMeta && (
                          <AchievementRowMeta>
                            {period && (
                              <AchievementDateChip>
                                <FiCalendar size={9} />
                                {period}
                              </AchievementDateChip>
                            )}
                            {a.event && !eventDeleted && (
                              <AchievementEventBadge title={a.event.title ?? ''}>
                                <FiLink size={9} />
                                <span>{a.event.title ?? '연결된 사건'}</span>
                              </AchievementEventBadge>
                            )}
                            {a.showOnEventsPage === false && (
                              <AchievementHiddenBadge>
                                <FiEyeOff size={9} />
                                연대표 비표시
                              </AchievementHiddenBadge>
                            )}
                          </AchievementRowMeta>
                        )}
                        {a.description && (
                          <AchievementRowDesc>
                            {a.description}
                          </AchievementRowDesc>
                        )}
                      </AchievementRowMain>
                      {!readOnly && (
                        <AchievementRowActions>
                          <AchievementIconBtn
                            type="button"
                            aria-label="수정"
                            onClick={() => openEditForm(a)}
                          >
                            <FiEdit2 size={11} />
                          </AchievementIconBtn>
                          <AchievementIconBtn
                            type="button"
                            aria-label="삭제"
                            $danger
                            onClick={() => handleDelete(a.id)}
                          >
                            <FiTrash2 size={11} />
                          </AchievementIconBtn>
                        </AchievementRowActions>
                      )}
                    </AchievementNode>
                  )
                })}
              </AchievementTimeline>
            )}

            {!readOnly && formOpen && (
              <AchievementForm
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                <AchievementTitleInput
                  type="text"
                  placeholder="업적 제목 (예: 대동법 시행)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  autoFocus
                />
                <AchievementTextarea
                  placeholder="설명 (선택)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <AchievementFormRow>
                  <AchievementDateField>
                    시작
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </AchievementDateField>
                  <AchievementDateField>
                    종료
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </AchievementDateField>
                </AchievementFormRow>
                <AchievementCheckboxRow>
                  <input
                    type="checkbox"
                    checked={showOnEventsPage}
                    onChange={(e) => setShowOnEventsPage(e.target.checked)}
                  />
                  연대표(사건 페이지)에 표시
                </AchievementCheckboxRow>
                <AchievementFormActions>
                  <AchievementCancelBtn type="button" onClick={resetForm}>
                    취소
                  </AchievementCancelBtn>
                  <AchievementSaveBtn
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? '저장 중…' : editingId ? '수정' : '등록'}
                  </AchievementSaveBtn>
                </AchievementFormActions>
              </AchievementForm>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </AchievementSection>
  )
}
