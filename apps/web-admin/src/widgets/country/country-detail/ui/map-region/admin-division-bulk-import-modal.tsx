/**
 * 행정구역 일괄 등록 — 평탄(flat) + 트리(tree) 모드 자동 감지.
 *
 * 평탄 (들여쓰기 없음):
 *   도쿄도 | Tokyo | 35.68,139.69
 *   오사카부 | Osaka
 *
 * 트리 (들여쓰기 = 자식, 2-space 또는 1-tab당 한 깊이):
 *   도쿄도 | Tokyo
 *     신주쿠구 | Shinjuku
 *     시부야구
 *   오사카부 | Osaka
 *     오사카시
 *
 * 트리 모드는 깊이별 단위명을 따로 입력받아 자동 처리.
 */
import { useEffect, useMemo, useState } from 'react'

import { useCountry } from '@/entities/country/api'
import {
  type AdminDivisionConfig,
  type DivisionOwner,
  useAdminDivisionConfigs,
  useBulkCreateAdministrativeDivisions,
  useCreateAdminDivisionConfig,
} from '@/entities/country/api.administrative-divisions'
import { type PlaceSearchResult, cityApi } from '@/shared/api/city'
import { Modal, ModalBody, ModalFooter } from '@/shared/ui/modal'
import { notify } from '@/shared/ui/toast'

import {
  ErrorText,
  FieldFull,
  FooterBtn,
  FormGrid,
  HintText,
  Input,
  Label,
  Required,
  Select,
} from './form-fields'
import { useRegionPalette } from './use-region-palette'

interface BulkImportModalProps {
  isOpen: boolean
  /** 소속 — 현대(countryId) 또는 역사(historicalCountryId) 국가 */
  owner: DivisionOwner
  /** 활성 체계 — 지정 시 모든 항목이 이 체계 소속으로 등록됨 */
  schemeId?: string | null
  defaultLevel: number
  defaultParent: { id: string; name: string } | null
  onClose: () => void
}

interface ParsedNode {
  name: string
  localName: string | null
  centerLat: number | null
  centerLng: number | null
  depth: number
  children: ParsedNode[]
}

interface ParseResult {
  roots: ParsedNode[]
  flat: ParsedNode[]
  errors: string[]
  maxDepth: number
}

/** 들여쓰기 = 부모-자식. 2 space 또는 1 tab = 1단계. */
function parseTree(text: string): ParseResult {
  const errors: string[] = []
  const roots: ParsedNode[] = []
  const flat: ParsedNode[] = []
  // depth → 마지막으로 본 그 깊이의 노드
  const stack: ParsedNode[] = []
  let maxDepth = 0
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!
    if (!raw.trim() || raw.trim().startsWith('#')) continue
    // 들여쓰기 폭 — tab 1개 또는 space 2개를 한 깊이로
    let lead = 0
    for (const ch of raw) {
      if (ch === '\t') lead += 2
      else if (ch === ' ') lead += 1
      else break
    }
    const depth = Math.floor(lead / 2)
    maxDepth = Math.max(maxDepth, depth)
    const content = raw.trim()
    const parts = content.split('|').map((s) => s.trim())
    const name = parts[0] ?? ''
    if (!name) {
      errors.push(`${i + 1}행: 이름이 비어있음`)
      continue
    }
    const localName = parts[1] || null
    let centerLat: number | null = null
    let centerLng: number | null = null
    if (parts[2]) {
      const coords = parts[2].split(',').map((s) => s.trim())
      const lat = Number(coords[0])
      const lng = Number(coords[1])
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        errors.push(`${i + 1}행: 좌표 형식 오류 (${parts[2]})`)
      } else {
        centerLat = lat
        centerLng = lng
      }
    }
    const node: ParsedNode = {
      name,
      localName,
      centerLat,
      centerLng,
      depth,
      children: [],
    }
    flat.push(node)
    if (depth === 0) {
      roots.push(node)
      stack.length = 0
      stack.push(node)
    } else {
      // 부모 = stack[depth - 1]
      const parent = stack[depth - 1]
      if (!parent) {
        errors.push(
          `${i + 1}행: 들여쓰기가 부모보다 깊어서 트리 구성 불가 (${name})`,
        )
        continue
      }
      parent.children.push(node)
      stack.length = depth
      stack.push(node)
    }
  }
  return { roots, flat, errors, maxDepth }
}

export function AdminDivisionBulkImportModal({
  isOpen,
  owner,
  schemeId = null,
  defaultLevel,
  defaultParent,
  onClose,
}: BulkImportModalProps) {
  const palette = useRegionPalette()
  const { data: configs = [] } = useAdminDivisionConfigs(owner, schemeId)
  // 역사적 국가 소속이면 countryId가 없어 자동으로 비활성화된다 (enabled: !!id)
  const { data: countryDetail } = useCountry(owner.countryId ?? '')
  const bulkMut = useBulkCreateAdministrativeDivisions(owner)
  const createConfigMut = useCreateAdminDivisionConfig(owner)

  const [text, setText] = useState('')
  /** 깊이별 (= defaultLevel + d) 단위 ID 또는 새 라벨. key = depth(0-based). */
  const [configByDepth, setConfigByDepth] = useState<
    Record<number, { configId: string; newLabel: string }>
  >({})
  const [autoFilling, setAutoFilling] = useState(false)
  const [progress, setProgress] = useState<{
    label: string
    done: number
    total: number
  } | null>(null)

  const parsed = useMemo(() => parseTree(text), [text])
  const isTreeMode = parsed.maxDepth > 0
  const submitting = bulkMut.isPending || autoFilling

  useEffect(() => {
    if (!isOpen) return
    setText('')
    setConfigByDepth({})
    setProgress(null)
  }, [isOpen])

  // 깊이별 단위 정보 — 각 깊이의 (defaultLevel+depth)에 해당하는 기존 config 자동 선택
  const configForDepth = (depth: number): AdminDivisionConfig[] =>
    configs.filter((c) => c.divisionLevel === defaultLevel + depth)

  const getDepthState = (depth: number) => {
    const existing = configForDepth(depth)
    const state = configByDepth[depth]
    if (state) return state
    if (existing.length === 1) {
      return { configId: existing[0]!.id, newLabel: '' }
    }
    return { configId: '', newLabel: '' }
  }

  const setDepthState = (
    depth: number,
    next: { configId?: string; newLabel?: string },
  ) => {
    setConfigByDepth((prev) => ({
      ...prev,
      [depth]: { ...getDepthState(depth), ...next },
    }))
  }

  const depthsToConfigure = isTreeMode
    ? Array.from({ length: parsed.maxDepth + 1 }, (_, i) => i)
    : [0]

  const handleAutofillAll = async () => {
    if (parsed.flat.length === 0) {
      notify.error('먼저 항목을 입력하세요')
      return
    }
    const isoCode = (countryDetail as { isoCode?: string } | undefined)?.isoCode
    setAutoFilling(true)
    setProgress({
      label: '좌표 검색',
      done: 0,
      total: parsed.flat.length,
    })
    let filled = 0
    for (let i = 0; i < parsed.flat.length; i++) {
      const node = parsed.flat[i]!
      if (node.centerLat == null || node.centerLng == null) {
        try {
          const results: PlaceSearchResult[] = await cityApi.searchPlaces(
            node.name,
            isoCode,
          )
          const hit = results[0]
          if (hit) {
            node.centerLat = Number(hit.lat.toFixed(6))
            node.centerLng = Number(hit.lng.toFixed(6))
            filled++
          }
        } catch {
          /* skip on error */
        }
      }
      setProgress({
        label: '좌표 검색',
        done: i + 1,
        total: parsed.flat.length,
      })
      // OSM Nominatim 정책 1초당 1요청
      await new Promise((r) => setTimeout(r, 1100))
    }
    // text 재구성 (들여쓰기 보존)
    const rebuild = (node: ParsedNode): string[] => {
      const indent = '  '.repeat(node.depth)
      const parts = [node.name]
      if (node.localName || node.centerLat != null)
        parts.push(node.localName ?? '')
      if (node.centerLat != null && node.centerLng != null) {
        parts.push(`${node.centerLat},${node.centerLng}`)
      }
      const line = `${indent}${parts.join(' | ')}`
      return [line, ...node.children.flatMap(rebuild)]
    }
    setText(parsed.roots.flatMap(rebuild).join('\n'))
    setProgress(null)
    setAutoFilling(false)
    notify.success(`좌표 자동 채움: ${filled}건 / ${parsed.flat.length}`)
  }

  /** 각 깊이의 단위 ID 결정 — 없으면 새로 생성 */
  const ensureConfigs = async (): Promise<Map<number, string>> => {
    const result = new Map<number, string>()
    for (const depth of depthsToConfigure) {
      const state = getDepthState(depth)
      if (state.configId) {
        result.set(depth, state.configId)
      } else if (state.newLabel.trim()) {
        const created = await createConfigMut.mutateAsync({
          ...owner,
          schemeId: schemeId ?? undefined,
          divisionLevel: defaultLevel + depth,
          divisionLabel: state.newLabel.trim(),
        })
        result.set(depth, created.id)
      } else {
        throw new Error(
          `${defaultLevel + depth}차 단위명을 입력하세요 (들여쓰기 깊이 ${depth})`,
        )
      }
    }
    return result
  }

  const submitTree = async (depthConfigs: Map<number, string>) => {
    let totalCreated = 0
    let totalSkipped = 0

    /** name → 생성된 division.id (현재 부모 레벨에서) */
    interface PendingGroup {
      parentId: string | null
      depth: number
      nodes: ParsedNode[]
    }

    const initialGroup: PendingGroup = {
      parentId: defaultParent?.id ?? null,
      depth: 0,
      nodes: parsed.roots,
    }

    // BFS — 각 단계마다 group들의 모든 노드를 한 번씩 bulkCreate
    const queue: PendingGroup[] = [initialGroup]
    const totalNodes = parsed.flat.length
    setProgress({ label: '등록', done: 0, total: totalNodes })
    let doneSoFar = 0

    while (queue.length > 0) {
      const batch = queue.splice(0, queue.length)
      for (const group of batch) {
        if (group.nodes.length === 0) continue
        const result = await bulkMut.mutateAsync({
          ...owner,
          schemeId: schemeId ?? undefined,
          adminDivisionId: depthConfigs.get(group.depth)!,
          divisionLevel: defaultLevel + group.depth,
          parentId: group.parentId,
          items: group.nodes.map((n) => ({
            name: n.name,
            localName: n.localName,
            centerLat: n.centerLat,
            centerLng: n.centerLng,
          })),
        })
        totalCreated += result.created
        totalSkipped += result.skipped.length
        doneSoFar += group.nodes.length
        setProgress({ label: '등록', done: doneSoFar, total: totalNodes })

        // 자식이 있는 노드 → name으로 매핑해 다음 큐에 enqueue
        const idByName = new Map(result.createdItems.map((c) => [c.name, c.id]))
        for (const node of group.nodes) {
          if (node.children.length === 0) continue
          const parentId = idByName.get(node.name)
          if (!parentId) continue // 등록 실패(중복)면 스킵
          queue.push({
            parentId,
            depth: group.depth + 1,
            nodes: node.children,
          })
        }
      }
    }

    setProgress(null)
    return { totalCreated, totalSkipped }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (parsed.flat.length === 0) {
      notify.error('등록할 항목이 없습니다')
      return
    }
    try {
      const depthConfigs = await ensureConfigs()
      const { totalCreated, totalSkipped } = await submitTree(depthConfigs)
      const note = totalSkipped > 0 ? ` · 스킵 ${totalSkipped}건` : ''
      notify.success(`${totalCreated}건 등록${note}`)
      onClose()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '등록에 실패했습니다')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`행정구역 일괄 등록 ${isTreeMode ? '(트리 모드)' : ''}`}
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
        <ModalBody>
          <FormGrid>
            {defaultParent && (
              <FieldFull>
                <Label>상위 구역</Label>
                <Input value={defaultParent.name} disabled readOnly />
              </FieldFull>
            )}

            {depthsToConfigure.map((depth) => {
              const level = defaultLevel + depth
              const existing = configForDepth(depth)
              const state = getDepthState(depth)
              return (
                <FieldFull key={depth}>
                  <Label htmlFor={`bk-cfg-${depth}`}>
                    {level}차 단위<Required>*</Required>
                  </Label>
                  {existing.length > 0 ? (
                    <Select
                      id={`bk-cfg-${depth}`}
                      value={state.configId}
                      onChange={(e) =>
                        setDepthState(depth, { configId: e.target.value })
                      }
                    >
                      <option value="">단위를 선택하세요</option>
                      {existing.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.divisionLabel}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id={`bk-cfg-${depth}`}
                      value={state.newLabel}
                      onChange={(e) =>
                        setDepthState(depth, { newLabel: e.target.value })
                      }
                      placeholder={`${level}차 단위명 (예: ${
                        level === 1 ? '도, 주' : level === 2 ? '시, 구' : '동'
                      })`}
                    />
                  )}
                </FieldFull>
              )
            })}

            <FieldFull>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <Label as="span">
                  항목<Required>*</Required>
                </Label>
                <button
                  type="button"
                  onClick={handleAutofillAll}
                  disabled={submitting || parsed.flat.length === 0}
                  style={{
                    padding: '5px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    border: `1px solid ${palette.primary}`,
                    color: palette.primary,
                    background: 'transparent',
                    borderRadius: 8,
                    cursor:
                      submitting || parsed.flat.length === 0
                        ? 'not-allowed'
                        : 'pointer',
                    opacity: submitting || parsed.flat.length === 0 ? 0.5 : 1,
                  }}
                >
                  📍 좌표 일괄 자동 채우기
                </button>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                placeholder={`# 평탄(같은 레벨):\n도쿄도 | Tokyo | 35.68,139.69\n오사카부 | Osaka\n\n# 트리(들여쓰기로 자식):\n도쿄도\n  신주쿠구 | Shinjuku\n  시부야구\n오사카부\n  오사카시`}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 13,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  borderRadius: 10,
                  border: `1px solid ${palette.borderMedium}`,
                  background: palette.bg,
                  color: palette.text,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                }}
              >
                <span>
                  유효 항목 <strong>{parsed.flat.length}</strong>
                  {isTreeMode && (
                    <>
                      {' · 깊이 '}
                      <strong>{parsed.maxDepth + 1}</strong>
                    </>
                  )}
                  {parsed.errors.length > 0 && (
                    <>
                      , 오류{' '}
                      <strong style={{ color: '#ef4444' }}>
                        {parsed.errors.length}
                      </strong>
                    </>
                  )}
                </span>
                {progress && (
                  <span>
                    {progress.label} {progress.done} / {progress.total}
                  </span>
                )}
              </div>
              {progress && (
                <div
                  style={{
                    height: 6,
                    background: palette.divider,
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${
                        progress.total > 0
                          ? Math.round((progress.done / progress.total) * 100)
                          : 0
                      }%`,
                      background: palette.primary,
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>
              )}
              {parsed.errors.length > 0 && (
                <ErrorText>{parsed.errors.slice(0, 3).join(' · ')}</ErrorText>
              )}
              <HintText>
                형식: <code>이름 | 현지어 | 위도,경도</code> (현지어·좌표 선택).
                들여쓰기(2-space 또는 tab)로 자식 — 트리 모드 자동 활성화.
              </HintText>
            </FieldFull>
          </FormGrid>
        </ModalBody>
        <ModalFooter>
          <FooterBtn type="button" onClick={onClose} disabled={submitting}>
            취소
          </FooterBtn>
          <FooterBtn
            type="submit"
            $primary
            disabled={submitting || parsed.flat.length === 0}
          >
            {submitting ? '저장 중…' : `${parsed.flat.length}건 등록`}
          </FooterBtn>
        </ModalFooter>
      </form>
    </Modal>
  )
}
