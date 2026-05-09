import { type ReactNode } from 'react'
import { Platform, UIManager } from 'react-native'
import type { PersonListItem } from '@/lib/dto'

type Action = 'edit' | 'share' | 'delete'

type Props = {
  person: PersonListItem
  children: ReactNode
  onAction: (action: Action, person: PersonListItem) => void
}

// 네이티브 모듈 가용성 체크 — Expo Go이거나 prebuild 후 재빌드 안 한 상태에서 안전하게 폴백
const HAS_NATIVE_CONTEXT_MENU = (() => {
  if (Platform.OS !== 'ios') return false
  try {
    const config = UIManager.getViewManagerConfig?.('ContextMenu')
    return !!config
  } catch {
    return false
  }
})()

// 네이티브 모듈 있을 때만 require — Expo Go에서 import 자체로 크래시 방지
const ContextMenu: React.ComponentType<{
  actions: Array<{ title: string; systemIcon?: string; destructive?: boolean }>
  onPress: (e: { nativeEvent: { index: number } }) => void
  children: ReactNode
}> | null = HAS_NATIVE_CONTEXT_MENU
  ? (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('react-native-context-menu-view').default
      } catch {
        return null
      }
    })()
  : null

/**
 * iOS: long-press 시 네이티브 컨텍스트 메뉴 (피크/팝, 블러 백드롭).
 * Android 또는 네이티브 모듈 미가용 시: 그냥 children 통과 — 기존 long-press → bottom sheet 흐름이 살아있음.
 *
 * 주: react-native-context-menu-view는 네이티브 코드 포함 — Expo Go에서는 동작하지 않으므로
 * 자동으로 폴백. 정식 동작하려면 `npx expo run:ios` 또는 EAS Build 필요.
 */
export function PersonContextMenu({ person, children, onAction }: Props) {
  if (!ContextMenu) {
    return <>{children}</>
  }
  return (
    <ContextMenu
      actions={[
        { title: '수정', systemIcon: 'pencil' },
        { title: '공유', systemIcon: 'square.and.arrow.up' },
        { title: '삭제', destructive: true, systemIcon: 'trash' },
      ]}
      onPress={(e) => {
        const idx = e.nativeEvent.index
        if (idx === 0) onAction('edit', person)
        else if (idx === 1) onAction('share', person)
        else if (idx === 2) onAction('delete', person)
      }}
    >
      {children}
    </ContextMenu>
  )
}
