/**
 * 명령형 confirm() — window.confirm 대체.
 *
 *   if (await confirm({ title: '삭제', message: '정말 삭제할까요?', danger: true })) { ... }
 *
 * 전역에 한 번 마운트한 <ConfirmHost />가 큐의 맨 앞 항목을 ConfirmDialog로 렌더한다.
 * 테마 연동·접근성은 ConfirmDialog가 담당한다.
 */
import React from 'react'

import { create } from 'zustand'

import { ConfirmDialog } from './confirm-dialog'

export interface ConfirmOptions {
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** 확인 버튼을 경고(삭제 등) 스타일로 */
  danger?: boolean
}

interface QueueItem extends ConfirmOptions {
  id: number
  resolve: (ok: boolean) => void
}

interface ConfirmStore {
  queue: QueueItem[]
  enqueue: (item: QueueItem) => void
  resolveHead: (ok: boolean) => void
}

// 동시 호출은 큐로 직렬화 — Date.now/Math.random 없이 단조 증가 카운터로 id 부여
let nextId = 1

const useConfirmStore = create<ConfirmStore>((set, get) => ({
  queue: [],
  enqueue: (item) => set((state) => ({ queue: [...state.queue, item] })),
  resolveHead: (ok) => {
    const [head, ...rest] = get().queue
    if (head) head.resolve(ok)
    set({ queue: rest })
  },
}))

/** Promise<boolean>를 반환하는 명령형 확인 다이얼로그. 확인=true, 취소/바깥클릭=false. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState().enqueue({ ...options, id: nextId++, resolve })
  })
}

/** 앱 루트에 한 번만 마운트한다 (app.tsx). */
export function ConfirmHost() {
  const current = useConfirmStore((state) => state.queue[0] ?? null)
  const resolveHead = useConfirmStore((state) => state.resolveHead)

  return (
    <ConfirmDialog
      isOpen={current != null}
      title={current?.title ?? ''}
      message={current?.message ?? ''}
      confirmLabel={current?.confirmLabel}
      cancelLabel={current?.cancelLabel}
      danger={current?.danger}
      onConfirm={() => resolveHead(true)}
      onCancel={() => resolveHead(false)}
    />
  )
}
