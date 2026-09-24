import { ChildProcess, spawn } from 'child_process'
import { readFileSync } from 'fs'
import * as http from 'http'
import { URL } from 'url'

/**
 * API(NestJS)를 데스크톱 앱 수명에 묶어 관리한다.
 *
 * 이미 떠 있으면 그대로 쓰고(개발 중 `npm run serve:api`로 띄운 경우),
 * 없으면 자식 프로세스로 띄운 뒤 /health가 응답할 때까지 기다린다.
 */

export type ApiStatus =
  | { kind: 'external' }
  | { kind: 'spawned'; pid: number }
  | { kind: 'unavailable'; reason: string }

export interface ApiProcessOptions {
  apiOrigin: string
  /** dist/apps/.../main.js 경로. null이면 기동 시도를 하지 않는다. */
  apiEntry: string | null
  /** API에 넘길 dotenv 파일 */
  apiEnvFile: string | null
  /** 기동 후 health를 기다릴 최대 시간(ms) */
  readyTimeoutMs?: number
  onLog?: (line: string) => void
}

let child: ChildProcess | null = null

/** `KEY=VALUE` 한 줄짜리 dotenv만 다루는 최소 파서 (의존성 없이). */
export function parseEnvFile(contents: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator <= 0) continue
    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

export function probeHealth(apiOrigin: string, timeoutMs = 1500) {
  return new Promise<boolean>((resolveProbe) => {
    const target = new URL('/health', apiOrigin)
    const request = http.get(
      {
        hostname: target.hostname,
        port: target.port || 80,
        path: target.pathname,
        timeout: timeoutMs,
      },
      (res) => {
        res.resume()
        resolveProbe((res.statusCode ?? 500) < 500)
      },
    )
    request.on('timeout', () => {
      request.destroy()
      resolveProbe(false)
    })
    request.on('error', () => resolveProbe(false))
  })
}

async function waitForHealth(
  apiOrigin: string,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await probeHealth(apiOrigin)) return true
    await new Promise((sleep) => setTimeout(sleep, 700))
  }
  return false
}

export async function ensureApi(
  options: ApiProcessOptions,
): Promise<ApiStatus> {
  const { apiOrigin, apiEntry, apiEnvFile, onLog } = options
  const readyTimeoutMs = options.readyTimeoutMs ?? 60_000

  if (await probeHealth(apiOrigin)) {
    onLog?.('[api] 이미 떠 있는 API를 사용합니다')
    return { kind: 'external' }
  }

  if (!apiEntry) {
    return {
      kind: 'unavailable',
      reason:
        `${apiOrigin} 에 떠 있는 API가 없고, 앱이 직접 띄울 API 빌드 산출물도 찾지 못했습니다.\n` +
        '레포에서 실행 중이라면 `npm run build:api`를, 설치본이라면 API를 먼저 실행하거나 ' +
        'PAPYRUS_REPO_DIR로 레포 경로를 지정하세요.',
    }
  }

  const fileEnv = apiEnvFile
    ? parseEnvFile(readFileSync(apiEnvFile, 'utf8'))
    : {}

  onLog?.(`[api] 기동: node ${apiEntry}`)
  child = spawn(process.execPath, [apiEntry], {
    // Electron 바이너리를 순수 Node로 쓰기 위한 스위치
    env: {
      ...process.env,
      ...fileEnv,
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout?.on('data', (chunk) => onLog?.(`[api] ${chunk}`.trimEnd()))
  child.stderr?.on('data', (chunk) => onLog?.(`[api:err] ${chunk}`.trimEnd()))
  child.on('exit', (code) => {
    onLog?.(`[api] 종료 (code=${code})`)
    child = null
  })

  const healthy = await waitForHealth(apiOrigin, readyTimeoutMs)
  if (!healthy) {
    return {
      kind: 'unavailable',
      reason: `API가 ${readyTimeoutMs / 1000}초 안에 응답하지 않았습니다. DB(도커/MySQL)가 떠 있는지 확인하세요.`,
    }
  }

  return { kind: 'spawned', pid: child?.pid ?? -1 }
}

export function stopApi() {
  if (!child) return
  child.kill('SIGTERM')
  child = null
}
