import { createReadStream, existsSync, statSync } from 'fs'
import * as http from 'http'
import { extname, join, normalize, sep } from 'path'
import { URL } from 'url'

/**
 * 렌더러를 file://이 아니라 로컬 http로 띄우기 위한 내부 서버.
 *
 * 두 가지를 동시에 한다.
 *  1) web-admin 빌드 산출물을 정적으로 서빙 (SPA 폴백 포함)
 *  2) 나머지 요청을 API(기본 localhost:8000)로 프록시
 *
 * 2)가 핵심이다. 같은 오리진에서 API를 부르게 되므로 CORS·쿠키 문제가 사라지고,
 * 브라우저에서 vite dev 프록시로 돌 때와 동작이 같아진다.
 * (프록시 판별 규칙은 apps/web-admin/vite.config.ts의 bypass 규칙을 따라간다.)
 */

const MIME_BY_EXTENSION: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8',
}

export interface LocalServerOptions {
  /** index.html이 들어 있는 디렉토리 */
  rendererDir: string
  /** 프록시 대상 API 오리진 (예: http://127.0.0.1:8000) */
  apiOrigin: string
  /** 처음 시도할 포트. 사용 중이면 1씩 올려가며 재시도 */
  preferredPort: number
  /** 포트 재시도 횟수 */
  portAttempts?: number
}

export interface LocalServer {
  readonly origin: string
  readonly port: number
  close(): Promise<void>
}

/** 경로 탈출(`../`)을 막으면서 렌더러 디렉토리 안의 실제 파일 경로를 구한다. */
function resolveStaticFile(
  rendererDir: string,
  pathname: string,
): string | null {
  const decoded = safeDecode(pathname)
  if (decoded === null) return null

  const candidate = normalize(join(rendererDir, decoded))
  if (candidate !== rendererDir && !candidate.startsWith(rendererDir + sep)) {
    return null
  }
  if (!existsSync(candidate)) return null
  return statSync(candidate).isFile() ? candidate : null
}

function safeDecode(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return null
  }
}

function sendFile(res: http.ServerResponse, filePath: string, noStore = false) {
  const mime = MIME_BY_EXTENSION[extname(filePath).toLowerCase()]
  res.writeHead(200, {
    'Content-Type': mime ?? 'application/octet-stream',
    // index.html은 갱신이 반영돼야 하므로 캐시 금지, 해시 붙은 에셋은 캐시 허용
    'Cache-Control': noStore
      ? 'no-store'
      : 'public, max-age=31536000, immutable',
  })
  createReadStream(filePath).pipe(res)
}

/**
 * API로 그대로 흘려보낸다. set-cookie의 Domain/Path는 vite 프록시와 같은 방식으로 정리.
 */
function proxyToApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  apiOrigin: string,
) {
  const target = new URL(apiOrigin)
  const proxyReq = http.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: target.host },
    },
    (proxyRes) => {
      const headers = { ...proxyRes.headers }
      const cookies = headers['set-cookie']
      if (Array.isArray(cookies)) {
        headers['set-cookie'] = cookies.map((cookieValue) =>
          cookieValue
            .replace(/;\s*Domain=[^;]*/i, '')
            .replace(/;\s*Path=[^;]*/i, '; Path=/'),
        )
      }
      res.writeHead(proxyRes.statusCode ?? 502, headers)
      proxyRes.pipe(res)
    },
  )

  proxyReq.on('error', (err) => {
    if (res.headersSent) {
      res.destroy()
      return
    }
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(
      JSON.stringify({
        statusCode: 502,
        message: `API 서버에 연결하지 못했습니다 (${apiOrigin})`,
        detail: err.message,
      }),
    )
  })

  req.pipe(proxyReq)
}

function proxyUpgrade(
  req: http.IncomingMessage,
  socket: NodeJS.WritableStream & { destroy(): void },
  head: Buffer,
  apiOrigin: string,
) {
  const target = new URL(apiOrigin)
  const proxyReq = http.request({
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port || 80,
    method: req.method,
    path: req.url,
    headers: { ...req.headers, host: target.host },
  })

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    const statusLine = Object.entries(proxyRes.headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\r\n')
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${statusLine}\r\n\r\n`)
    if (proxyHead?.length) proxySocket.unshift(proxyHead)
    proxySocket.pipe(socket as NodeJS.WritableStream)
    ;(socket as unknown as NodeJS.ReadableStream).pipe(proxySocket)
  })
  proxyReq.on('error', () => socket.destroy())
  if (head?.length) proxyReq.write(head)
  proxyReq.end()
}

/** 정적 파일로 처리할지, API로 넘길지 판정한다. */
function shouldFallbackToIndex(req: http.IncomingMessage): boolean {
  const accept = req.headers.accept ?? ''
  return accept.includes('text/html')
}

export async function startLocalServer(
  options: LocalServerOptions,
): Promise<LocalServer> {
  const { rendererDir, apiOrigin, preferredPort } = options
  const attempts = options.portAttempts ?? 20
  const indexHtml = join(rendererDir, 'index.html')

  if (!existsSync(indexHtml)) {
    throw new Error(
      `web-admin 빌드 산출물을 찾지 못했습니다: ${indexHtml}\n` +
        `먼저 \`npm run desktop:build:renderer\`를 실행하세요.`,
    )
  }

  const server = http.createServer((req, res) => {
    const pathname = (req.url ?? '/').split('?')[0]

    // 업로드된 파일은 언제나 API 쪽 정적 경로
    if (pathname.startsWith('/uploads')) {
      proxyToApi(req, res, apiOrigin)
      return
    }

    const staticFile = resolveStaticFile(rendererDir, pathname)
    if (staticFile) {
      sendFile(res, staticFile, pathname === '/' || pathname === '/index.html')
      return
    }

    // 파일이 없는데 HTML을 원한다 = SPA 라우트
    if (shouldFallbackToIndex(req)) {
      sendFile(res, indexHtml, true)
      return
    }

    proxyToApi(req, res, apiOrigin)
  })

  server.on('upgrade', (req, socket, head) => {
    proxyUpgrade(req, socket as never, head, apiOrigin)
  })

  const port = await listenWithRetry(server, preferredPort, attempts)

  return {
    origin: `http://127.0.0.1:${port}`,
    port,
    close: () =>
      new Promise<void>((resolveClose) => {
        server.close(() => resolveClose())
      }),
  }
}

function listenWithRetry(
  server: http.Server,
  startPort: number,
  attempts: number,
): Promise<number> {
  return new Promise((resolvePort, rejectPort) => {
    let port = startPort
    let remaining = attempts

    const onError = (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && remaining > 0) {
        remaining -= 1
        port += 1
        server.listen(port, '127.0.0.1')
        return
      }
      server.off('error', onError)
      rejectPort(err)
    }

    server.on('error', onError)
    server.once('listening', () => {
      server.off('error', onError)
      resolvePort(port)
    })
    server.listen(port, '127.0.0.1')
  })
}
