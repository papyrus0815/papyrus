import { resolve } from 'path'
import { defineConfig } from 'vite'

import react from '@vitejs/plugin-react'

// 환경변수 가져오기 (기본값 포함)
function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    if (defaultValue !== undefined) {
      return defaultValue
    }
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

// 필수 환경변수 (기본값 없음)
function getRequiredEnvVar(name: string): string {
  return getEnvVar(name)
}

export default defineConfig(({ mode }) => {
  // 앱 표시명 (브라우저 탭 타이틀 / 로그인 화면) — 미설정 시 'PAPYRUS'
  const appTitle = getEnvVar('VITE_APP_TITLE', 'PAPYRUS')

  return {
    // 환경 변수 정의
    define: {
      'import.meta.env.VITE_API_BASE_URL':
        mode === 'production'
          ? JSON.stringify('http://localhost:8000')
          : JSON.stringify(process.env.VITE_API_BASE_URL || ''),
      'import.meta.env.VITE_APP_TITLE': JSON.stringify(appTitle),
    },
    plugins: [
      react(),
      {
        // index.html의 %VITE_APP_TITLE% 플레이스홀더를 실제 표시명으로 치환
        name: 'html-app-title',
        transformIndexHtml(html: string) {
          return html.replace(/%VITE_APP_TITLE%/g, appTitle)
        },
      },
    ],
    root: __dirname,
    publicDir: 'public',
    // 모든 경로를 index.html로 포워딩하도록 SPA 모드 명시
    appType: 'spa',
    optimizeDeps: {
      force: true,
      include: ['@xyflow/react'],
    },
    resolve: {
      dedupe: ['react', 'react-dom', 'styled-components'],
      alias: [
        {
          find: '@',
          replacement: resolve(__dirname, './src'),
        },
        {
          find: /^@api\/(.*)$/,
          replacement: resolve(__dirname, '../../apps/api/src/api/$1'),
        },
        {
          find: '@api',
          replacement: resolve(__dirname, '../../apps/api/src/api/index.ts'),
        },
        {
          find: '@papyrus/api-sdk',
          replacement: resolve(__dirname, '../../libs/api-sdk/src/index.ts'),
        },
      ],
    },
    server: {
      // 포트 설정 (기본값: 3000)
      port: Number(process.env.WEB_PORT || '3000'),
      // 호스트 설정
      // Windows에서는 localhost를 기본값으로 사용 (권한 문제 방지)
      // 다른 기기에서 접근이 필요한 경우 WEB_BIND_HOST=0.0.0.0 설정
      host: process.env.WEB_BIND_HOST || 'localhost',
      // 파일 시스템 접근 허용 (Vite allow list)
      fs: {
        allow: [
          // 프로젝트 루트
          resolve(__dirname, '../..'),
          // apps/web 디렉토리
          __dirname,
          // node_modules
          resolve(__dirname, '../node_modules'),
        ],
      },
      // 허용된 호스트들 (개발용으로 모든 호스트 허용)
      allowedHosts: [
        'app.civilization.zone',
        'app.civilization.local',
        'localhost',
        '127.0.0.1',
        'all', // 모든 호스트 허용
      ],
      proxy: {
        // 🔧 FIX: /uploads 경로를 백엔드로 프록시 (정적 파일)
        '/uploads': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        // 모든 API 요청을 자동으로 백엔드로 프록시 (정적 파일 제외)
        // 정적 파일(.js, .css, .html 등)이나 Vite 내부 요청(/@...)이 아니면 모두 API로 프록시
        '/': {
          target: getEnvVar('API_ORIGIN', 'http://localhost:8000'),
          changeOrigin: true,
          secure: false,
          // bypass: 정적 파일과 프론트엔드 라우트는 프록시하지 않음
          bypass: (req, res, options) => {
            const pathname = req.url || ''
            const acceptHeader = req.headers.accept || ''

            // Vite 내부 요청 (HMR, client 등)
            if (
              pathname.startsWith('/@') ||
              pathname.startsWith('/node_modules')
            ) {
              return pathname
            }

            // 정적 파일 확장자
            const staticExtensions = [
              '.js',
              '.css',
              '.html',
              '.png',
              '.jpg',
              '.jpeg',
              '.gif',
              '.svg',
              '.ico',
              '.woff',
              '.woff2',
              '.ttf',
              '.eot',
            ]
            if (staticExtensions.some((ext) => pathname.endsWith(ext))) {
              return pathname
            }

            // src/ 디렉토리 요청 (개발 중 소스 파일)
            if (pathname.startsWith('/src/')) {
              return pathname
            }

            // 브라우저가 HTML을 요청하는 경우 = 프론트엔드 SPA 라우트
            // 브라우저 주소창에 입력하거나, 링크 클릭 시 Accept: text/html
            if (acceptHeader.includes('text/html')) {
              return '/index.html'
            }

            // 그 외 모든 요청 (Accept: application/json 등) = API로 프록시
            return undefined
          },
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes, req) => {
              const cookies = proxyRes.headers['set-cookie'] as
                | string[]
                | undefined
              if (!cookies) return
              proxyRes.headers['set-cookie'] = cookies.map((cookieValue) =>
                cookieValue
                  .replace(/;\s*Domain=[^;]*/i, '')
                  .replace(/;\s*Path=[^;]*/i, '; Path=/'),
              )
            })
          },
        },
      },
    },
  }
})
