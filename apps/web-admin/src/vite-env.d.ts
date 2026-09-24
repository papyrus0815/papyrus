/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** 로그인 화면 등에 노출되는 앱 표시명 (미설정 시 'CIVILIZATION') */
  readonly VITE_APP_TITLE?: string
  /**
   * 이 번들이 어디서 돌 것인가.
   * 'desktop' = Electron 셸(apps/desktop)이 내부 프록시로 API를 같은 오리진에 붙여주는 실행.
   */
  readonly VITE_RUNTIME_TARGET?: 'web' | 'desktop'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.png' {
  const value: string
  export default value
}

declare module '*.jpg' {
  const value: string
  export default value
}

declare module '*.jpeg' {
  const value: string
  export default value
}

declare module '*.gif' {
  const value: string
  export default value
}

declare module '*.svg' {
  const value: string
  export default value
}

declare module '*.webp' {
  const value: string
  export default value
}

declare module '*.mp3' {
  const value: string
  export default value
}
