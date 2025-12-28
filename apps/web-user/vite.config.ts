import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

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

export default defineConfig(({ mode }) => ({
  // 환경 변수 정의
  define: {
    'import.meta.env.VITE_API_BASE_URL':
      mode === 'production'
        ? JSON.stringify('http://localhost:8000')
        : JSON.stringify(process.env.VITE_API_BASE_URL || ''),
  },
  plugins: [react()],
  root: __dirname,
  publicDir: 'public',
  // 모든 경로를 index.html로 포워딩하도록 SPA 모드 명시
  appType: 'spa',
  optimizeDeps: {
    force: true,
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: resolve(__dirname, './src'),
      },
      {
        find: /^@api\/(.*)$/,
        replacement: resolve(__dirname, '../api/src/api/$1'),
      },
      {
        find: '@api',
        replacement: resolve(__dirname, '../api/src/api/index.ts'),
      },
    ],
  },
  server: {
    // 사용자 앱 포트 (관리자 앱과 다르게 4200)
    port: Number(process.env.WEB_USER_PORT || '4200'),
    host: process.env.WEB_BIND_HOST || '0.0.0.0',
    fs: {
      allow: [
        resolve(__dirname, '../..'),
        __dirname,
        resolve(__dirname, '../../node_modules'),
      ],
    },
      allowedHosts: [
        'user.civilization.zone',
        'user.civilization.local',
        'app.civilization.zone',
        'app.civilization.local',
        'localhost',
        '127.0.0.1',
        'all',
      ],
    proxy: {
      '/': {
        target: getEnvVar('API_ORIGIN', 'http://localhost:8000'),
        changeOrigin: true,
        secure: false,
        bypass: (req, res, options) => {
          const pathname = req.url || ''
          const acceptHeader = req.headers.accept || ''

          if (
            pathname.startsWith('/@') ||
            pathname.startsWith('/node_modules')
          ) {
            return pathname
          }

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

          if (pathname.startsWith('/src/')) {
            return pathname
          }

          if (acceptHeader.includes('text/html')) {
            return '/index.html'
          }

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
}))
