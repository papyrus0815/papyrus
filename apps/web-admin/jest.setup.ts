/**
 * jsdom 환경에는 TextEncoder/TextDecoder가 없는데 react-router는 모듈 로드 시점에 이를
 * 건드린다 — import만으로 스위트가 터진다. 기존 스펙들은 `jest.mock('react-router-dom')`으로
 * 우회했지만, 라우트 매칭·loader를 실제로 태우는 스펙은 진짜 모듈이 필요하다.
 */
import { TextDecoder, TextEncoder } from 'node:util'

const globals = globalThis as unknown as {
  TextEncoder?: unknown
  TextDecoder?: unknown
}

if (typeof globals.TextEncoder === 'undefined') {
  globals.TextEncoder = TextEncoder
}
if (typeof globals.TextDecoder === 'undefined') {
  globals.TextDecoder = TextDecoder
}

/**
 * jsdom은 fetch API(Request/Response/Headers)도 구현하지 않는다. react-router의
 * `redirect()`가 Response를 만들기 때문에 loader를 직접 호출하는 스펙에 필요하다.
 */
if (typeof (globals as { Response?: unknown }).Response === 'undefined') {
  const record = globals as Record<string, unknown>
  // undici가 로드 시점에 요구하는 웹 스트림부터 채운다(jsdom 미구현).
  const streamWeb = require('node:stream/web') as Record<string, unknown>
  for (const name of ['ReadableStream', 'WritableStream', 'TransformStream']) {
    if (typeof record[name] === 'undefined') record[name] = streamWeb[name]
  }
  const workerThreads = require('node:worker_threads') as Record<string, unknown>
  for (const name of ['MessagePort', 'MessageChannel', 'BroadcastChannel']) {
    if (typeof record[name] === 'undefined') record[name] = workerThreads[name]
  }
  const undici = require('undici') as Record<string, unknown>
  for (const name of ['Request', 'Response', 'Headers', 'FormData']) {
    if (typeof record[name] === 'undefined') record[name] = undici[name]
  }
}
