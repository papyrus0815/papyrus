import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView, type WebViewNavigation } from 'react-native-webview'

import { resolveWebUrl } from '@/lib/web-url'

const WEB_URL = resolveWebUrl()

export default function WebShell() {
  const webRef = useRef<WebView>(null)
  const canGoBack = useRef(false)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)
  // reloadKey를 바꿔 WebView를 통째로 재마운트 → 재시도
  const [reloadKey, setReloadKey] = useState(0)

  // Android 하드웨어 back: WebView 히스토리가 있으면 뒤로, 없으면 OS 기본(앱 종료)
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack.current) {
          webRef.current?.goBack()
          return true
        }
        return false
      })
      return () => sub.remove()
    }, []),
  )

  const onNavStateChange = useCallback((nav: WebViewNavigation) => {
    canGoBack.current = nav.canGoBack
  }, [])

  // 외부 도메인 링크(메일/전화/외부 사이트)는 시스템 브라우저로
  const onShouldStartLoad = useCallback((req: WebViewNavigation) => {
    const url = req.url
    if (/^(mailto:|tel:|https?:\/\/)/.test(url) && !isInternal(url)) {
      // http(s)지만 web-admin 도메인이 아니면 외부로 — 단, 최초 로드 URL은 통과
      if (!url.startsWith('http')) {
        void Linking.openURL(url)
        return false
      }
    }
    return true
  }, [])

  const retry = useCallback(() => {
    setErrored(false)
    setLoading(true)
    setReloadKey((k) => k + 1)
  }, [])

  if (!WEB_URL) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <Text style={styles.title}>web-admin URL이 설정되지 않았습니다</Text>
        <Text style={styles.body}>
          dev: Expo dev 서버 호스트 자동 감지(:3000){'\n'}
          prod: EXPO_PUBLIC_WEB_URL 환경변수를 지정하세요
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top']}>
      {errored ? (
        <View style={styles.center}>
          <Text style={styles.title}>페이지를 불러오지 못했습니다</Text>
          <Text style={styles.body}>{WEB_URL}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retry} accessibilityRole="button">
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <WebView
            key={reloadKey}
            ref={webRef}
            source={{ uri: WEB_URL }}
            style={styles.fill}
            onNavigationStateChange={onNavStateChange}
            onShouldStartLoadWithRequest={onShouldStartLoad}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false)
              setErrored(true)
            }}
            // 파일 업로드(이미지 등) + http dev 서버 허용
            allowsInlineMediaPlayback
            allowFileAccess
            originWhitelist={['*']}
            mixedContentMode="always"
            domStorageEnabled
            javaScriptEnabled
            pullToRefreshEnabled
            // 당겨서 새로고침 (iOS)
            bounces
          />
          {loading && (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  )
}

// 최초 web-admin 도메인 판별은 단순화: http로 시작하면 내부 취급(SPA 라우팅 포함)
function isInternal(url: string): boolean {
  return url.startsWith('http')
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#ffffff' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  body: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
})
