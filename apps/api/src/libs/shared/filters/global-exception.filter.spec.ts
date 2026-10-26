import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common'

import type { AppConfigService } from '../config/config.service'
import { ApiErrorResponse, GlobalExceptionFilter } from './global-exception.filter'

function run(isProduction: boolean, exception: unknown) {
  const filter = new GlobalExceptionFilter({ isProduction } as AppConfigService)
  let body = {} as ApiErrorResponse
  let status = 0
  const response = {
    status: (code: number) => {
      status = code
      return { json: (payload: ApiErrorResponse) => (body = payload) }
    },
  }
  const request = { url: '/treaties', method: 'GET', headers: {}, ip: '127.0.0.1' }
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as unknown as ArgumentsHost
  filter.catch(exception, host)
  return { status, body }
}

describe('GlobalExceptionFilter', () => {
  const internal = new Error('Invalid `this.prisma.treaty.findMany()` invocation in /srv/dist/treaty.controller.js')

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
  })

  it('운영: 의도하지 않은 500은 원문을 숨긴다', () => {
    const { status, body } = run(true, internal)
    expect(status).toBe(500)
    expect(body.error).toEqual({ name: 'InternalServerError', message: 'Internal server error' })
    expect(JSON.stringify(body)).not.toContain('prisma')
  })

  it('운영: 원문은 로그에는 남는다', () => {
    const spy = jest.spyOn(Logger.prototype, 'error')
    spy.mockClear()
    run(true, internal)
    expect(spy.mock.calls[0][0]).toContain('treaty.findMany')
  })

  it('개발: 디버깅을 위해 원문을 보여 준다', () => {
    const { body } = run(false, internal)
    expect(body.error.message).toContain('treaty.findMany')
  })

  it('운영에서도 의도한 HttpException 문구는 그대로', () => {
    const { status, body } = run(true, new BadRequestException('제목은 필수입니다.'))
    expect(status).toBe(400)
    expect(body.error.message).toBe('제목은 필수입니다.')
  })
})
