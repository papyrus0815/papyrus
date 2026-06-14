/**
 * 행정 단위(레벨) 관리 모달.
 *
 * 행정 단위 = 구역의 계층 레벨 정의 (예: 1차=주, 2차=카운티, 3차=시).
 * 구역을 등록하기 *전에* 단위를 미리 정의해 두면, 등록 시 드롭다운에서
 * 선택만 하면 된다. (등록 모달에서 인라인 생성도 가능하지만, 여기서
 * 한 번에 체계를 잡아두는 흐름을 위한 전용 화면.)
 *
 * 소속: 현대(countryId) 또는 역사(historicalCountryId) 국가.
 * 활성 체계가 있으면 그 체계 전용으로 생성되고, '전체'면 공용(공통)으로 생성된다.
 */
import { useEffect, useMemo, useState } from 'react'

import { FiCheck, FiEdit2, FiPlus, FiTrash2, FiX } from 'react-icons/fi'

import {
  type AdminDivisionConfig,
  type AdministrativeDivision,
  type DivisionOwner,
  useAdminDivisionConfigs,
  useAdministrativeDivisions,
  useCreateAdminDivisionConfig,
  useDeleteAdminDivisionConfig,
  useUpdateAdminDivisionConfig,
} from '@/entities/country/api.administrative-divisions'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  ModalBody,
  ModalBox,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalSubtitle,
  ModalTitle,
  ModalOverlay,
} from '@/shared/ui/modal'
import { notify } from '@/shared/ui/toast'

import { FooterBtn } from './form-fields'
import { type RegionPalette, useRegionPalette } from './use-region-palette'

interface AdminDivisionConfigModalProps {
  isOpen: boolean
  /** 소속 — 현대(countryId) 또는 역사(historicalCountryId) 국가 */
  owner: DivisionOwner
  /** 활성 체계 — 지정 시 단위가 이 체계 전용으로 생성됨. null이면 공용. */
  schemeId?: string | null
  schemeName?: string | null
  onClose: () => void
}

/** 트리 전체를 순회하며 adminDivisionId(=단위)별 사용 구역 수 집계 */
function countUsageByConfig(
  roots: AdministrativeDivision[],
): Map<string, number> {
  const counts = new Map<string, number>()
  const walk = (nodes: AdministrativeDivision[]) => {
    for (const node of nodes) {
      counts.set(node.adminDivisionId, (counts.get(node.adminDivisionId) ?? 0) + 1)
      if (node.children?.length) walk(node.children)
    }
  }
  walk(roots)
  return counts
}

/** 레벨 예시 안내 */
function levelExample(level: number): string {
  return level === 1 ? '도, 주' : level === 2 ? '시, 군, 구' : '읍, 면, 동'
}

export function AdminDivisionConfigModal({
  isOpen,
  owner,
  schemeId = null,
  schemeName = null,
  onClose,
}: AdminDivisionConfigModalProps) {
  const palette = useRegionPalette()
  const { data: configs = [] } = useAdminDivisionConfigs(owner, schemeId)
  const { data: divisions = [] } = useAdministrativeDivisions(owner, schemeId)
  const createMut = useCreateAdminDivisionConfig(owner)
  const updateMut = useUpdateAdminDivisionConfig(owner)
  const deleteMut = useDeleteAdminDivisionConfig(owner)

  const usageByConfig = useMemo(
    () => countUsageByConfig(divisions),
    [divisions],
  )

  const sortedConfigs = useMemo(
    () =>
      [...configs].sort(
        (left, right) =>
          left.divisionLevel - right.divisionLevel ||
          left.divisionLabel.localeCompare(right.divisionLabel),
      ),
    [configs],
  )

  const maxLevel = configs.reduce(
    (acc, config) => Math.max(acc, config.divisionLevel),
    0,
  )
  const nextLevel = maxLevel + 1

  // 새 단위 입력
  const [newLevel, setNewLevel] = useState('')
  const [newLabel, setNewLabel] = useState('')
  // 인라인 수정
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLevel, setEditLevel] = useState('')
  const [editLabel, setEditLabel] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setNewLevel('')
    setNewLabel('')
    setEditingId(null)
  }, [isOpen])

  if (!isOpen) return null

  const submitting =
    createMut.isPending || updateMut.isPending || deleteMut.isPending

  const handleCreate = async () => {
    const label = newLabel.trim()
    if (!label) {
      notify.error('단위 이름을 입력하세요')
      return
    }
    const level = newLevel.trim() ? Number(newLevel) : nextLevel
    if (!Number.isInteger(level) || level < 1) {
      notify.error('차수는 1 이상의 정수여야 합니다')
      return
    }
    try {
      await createMut.mutateAsync({
        ...owner,
        schemeId: schemeId ?? undefined,
        divisionLevel: level,
        divisionLabel: label,
      })
      notify.success(`${level}차 "${label}" 단위를 추가했습니다`)
      setNewLabel('')
      setNewLevel('')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '추가에 실패했습니다')
    }
  }

  const startEdit = (config: AdminDivisionConfig) => {
    setEditingId(config.id)
    setEditLevel(String(config.divisionLevel))
    setEditLabel(config.divisionLabel)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const handleSaveEdit = async (config: AdminDivisionConfig) => {
    const label = editLabel.trim()
    if (!label) {
      notify.error('단위 이름을 입력하세요')
      return
    }
    const level = Number(editLevel)
    if (!Number.isInteger(level) || level < 1) {
      notify.error('차수는 1 이상의 정수여야 합니다')
      return
    }
    try {
      await updateMut.mutateAsync({
        id: config.id,
        input: { divisionLevel: level, divisionLabel: label },
      })
      notify.success('단위를 수정했습니다')
      setEditingId(null)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '수정에 실패했습니다')
    }
  }

  const handleDelete = async (config: AdminDivisionConfig) => {
    const usage = usageByConfig.get(config.id) ?? 0
    const message =
      usage > 0
        ? `"${config.divisionLabel}" 단위를 사용하는 구역이 ${usage}개 있습니다. 사용 중인 단위는 삭제할 수 없을 수 있습니다. 계속할까요?`
        : `"${config.divisionLabel}" 단위를 삭제할까요?`
    if (!(await confirm({ title: '단위 삭제', message, danger: true }))) return
    try {
      await deleteMut.mutateAsync(config.id)
      notify.success('단위를 삭제했습니다')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '삭제에 실패했습니다')
    }
  }

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBox $maxWidth="520px" onClick={(event) => event.stopPropagation()}>
        <ModalHeader>
          <div>
            <ModalTitle>행정 단위 관리</ModalTitle>
            <ModalSubtitle>
              {schemeName ? `${schemeName} 체계 전용` : '공용 단위'} · 레벨(차수)
              구조를 먼저 정의합니다
            </ModalSubtitle>
          </div>
          <ModalCloseButton type="button" onClick={onClose} aria-label="닫기">
            <FiX />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <p
            style={{
              margin: 0,
              fontSize: 12.5,
              lineHeight: 1.6,
              color: palette.textSecondary,
            }}
          >
            구역 계층의 단위를 미리 정해 두면 등록 시 선택만 하면 됩니다. 예:
            1차 = 주, 2차 = 카운티, 3차 = 시.
          </p>

          {sortedConfigs.length === 0 ? (
            <div
              style={{
                padding: '20px 12px',
                textAlign: 'center',
                fontSize: 13,
                color: palette.textMuted,
                background: palette.bgSecondary,
                border: `1px dashed ${palette.border}`,
                borderRadius: 12,
              }}
            >
              아직 정의된 단위가 없습니다. 아래에서 1차 단위부터 추가하세요.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sortedConfigs.map((config) => {
                const usage = usageByConfig.get(config.id) ?? 0
                const isShared = config.schemeId == null
                const editing = editingId === config.id
                return (
                  <div
                    key={config.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      border: `1px solid ${palette.border}`,
                      borderRadius: 10,
                      background: palette.bgSecondary,
                    }}
                  >
                    {editing ? (
                      <>
                        <input
                          type="number"
                          min={1}
                          aria-label="차수"
                          value={editLevel}
                          onChange={(event) => setEditLevel(event.target.value)}
                          style={fieldStyle(palette, 56)}
                        />
                        <input
                          aria-label="단위 이름"
                          value={editLabel}
                          onChange={(event) => setEditLabel(event.target.value)}
                          autoFocus
                          style={{ ...fieldStyle(palette), flex: 1 }}
                        />
                        <IconBtn
                          palette={palette}
                          label="저장"
                          tone="primary"
                          disabled={submitting}
                          onClick={() => handleSaveEdit(config)}
                        >
                          <FiCheck />
                        </IconBtn>
                        <IconBtn
                          palette={palette}
                          label="취소"
                          onClick={cancelEdit}
                        >
                          <FiX />
                        </IconBtn>
                      </>
                    ) : (
                      <>
                        <span
                          style={{
                            flexShrink: 0,
                            minWidth: 34,
                            padding: '2px 7px',
                            fontSize: 11,
                            fontWeight: 700,
                            textAlign: 'center',
                            color: palette.badgeText,
                            background: palette.badgeBg,
                            border: `1px solid ${palette.badgeBorder}`,
                            borderRadius: 6,
                          }}
                        >
                          {config.divisionLevel}차
                        </span>
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: palette.text,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {config.divisionLabel}
                          {isShared && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 10,
                                fontWeight: 600,
                                color: palette.textMuted,
                              }}
                            >
                              공용
                            </span>
                          )}
                        </span>
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 11,
                            color: palette.textMuted,
                          }}
                        >
                          {usage > 0 ? `${usage}개 구역` : '미사용'}
                        </span>
                        <IconBtn
                          palette={palette}
                          label="수정"
                          onClick={() => startEdit(config)}
                        >
                          <FiEdit2 />
                        </IconBtn>
                        <IconBtn
                          palette={palette}
                          label="삭제"
                          tone="danger"
                          disabled={submitting}
                          onClick={() => handleDelete(config)}
                        >
                          <FiTrash2 />
                        </IconBtn>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* 새 단위 추가 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingTop: 12,
              borderTop: `1px solid ${palette.divider}`,
            }}
          >
            <input
              type="number"
              min={1}
              aria-label="새 단위 차수"
              value={newLevel}
              onChange={(event) => setNewLevel(event.target.value)}
              placeholder={String(nextLevel)}
              style={fieldStyle(palette, 56)}
            />
            <input
              aria-label="새 단위 이름"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleCreate()
                }
              }}
              placeholder={`${nextLevel}차 단위 이름 (예: ${levelExample(nextLevel)})`}
              style={{ ...fieldStyle(palette), flex: 1 }}
            />
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={submitting || !newLabel.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
                padding: '8px 12px',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#ffffff',
                background: palette.primary,
                border: `1px solid ${palette.primary}`,
                borderRadius: 9,
                cursor:
                  submitting || !newLabel.trim() ? 'not-allowed' : 'pointer',
                opacity: submitting || !newLabel.trim() ? 0.5 : 1,
              }}
            >
              <FiPlus size={13} />
              추가
            </button>
          </div>
        </ModalBody>
        <ModalFooter>
          <FooterBtn type="button" onClick={onClose}>
            닫기
          </FooterBtn>
        </ModalFooter>
      </ModalBox>
    </ModalOverlay>
  )
}

function fieldStyle(palette: RegionPalette, width?: number): React.CSSProperties {
  return {
    width,
    padding: '8px 10px',
    fontSize: 13,
    border: `1px solid ${palette.borderMedium}`,
    borderRadius: 9,
    background: palette.bg,
    color: palette.text,
    outline: 'none',
  }
}

interface IconBtnProps {
  palette: RegionPalette
  label: string
  tone?: 'default' | 'primary' | 'danger'
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

function IconBtn({
  palette,
  label,
  tone = 'default',
  disabled,
  onClick,
  children,
}: IconBtnProps) {
  const color =
    tone === 'primary'
      ? palette.primary
      : tone === 'danger'
        ? palette.isDark
          ? '#fca5a5'
          : '#dc2626'
        : palette.textSecondary
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: 28,
        height: 28,
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
        background: palette.bg,
        color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}
