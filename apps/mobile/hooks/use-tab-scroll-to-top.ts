import { useEffect, type RefObject } from 'react'
import { useNavigation } from 'expo-router'

/**
 * 활성화된 탭을 다시 누르면 리스트를 top으로 스크롤. iOS 표준 동작.
 *
 * 각 탭 스크린에서 ref를 만들어 FlatList/SectionList/ScrollView에 붙이고
 * 이 훅에 ref를 전달.
 *
 * 내부적으로 ref가 가리키는 객체에서 getScrollResponder()를 호출하므로
 * FlatList, SectionList, ScrollView 모두 호환됨.
 */
export function useTabScrollToTop<T>(scrollRef: RefObject<T | null>) {
  const navigation = useNavigation()

  useEffect(() => {
    const unsub = (navigation as unknown as {
      addListener?: (event: 'tabPress', cb: () => void) => () => void
    }).addListener?.('tabPress', () => {
      const node = scrollRef.current
      if (!node) return
      const responder = (node as unknown as {
        getScrollResponder?: () => { scrollTo?: (opts: { y: number; animated?: boolean }) => void } | null
      }).getScrollResponder?.()
      responder?.scrollTo?.({ y: 0, animated: true })
    })
    return unsub
  }, [navigation, scrollRef])
}
