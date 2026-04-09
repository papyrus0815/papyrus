/**
 * Papyrus Server Manager
 * Papyrus 서버 상태를 모니터링하는 서비스
 */
import { ChildProcess, exec, spawn } from 'child_process'
import * as http from 'http'
import * as path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

// ANSI 색상 코드 제거 함수
function stripAnsiCodes(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

// 줄 단위 버퍼 클래스
class LineBuffer {
  private buffer: string = ''

  add(data: string): string[] {
    this.buffer += data
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''

    return lines.filter((line) => line.trim().length > 0)
  }

  flush(): string[] {
    if (this.buffer.trim().length > 0) {
      const result = [this.buffer]
      this.buffer = ''

      return result
    }

    return []
  }
}

export interface PapyrusServerStatus {
  webAdminServer: {
    isRunning: boolean
    port: number
    url: string
  }
  apiServer: {
    isRunning: boolean
    port: number
    healthCheckUrl: string
  }
  allReady: boolean
}

export class PapyrusServerManager {
  private static instance: PapyrusServerManager
  private apiProcess: ChildProcess | null = null
  private webAdminProcess: ChildProcess | null = null
  private readonly webAdminPort: number = 3000
  private readonly apiPort: number = 8000
  private projectRoot: string = '/Users/taeyoung/Desktop/project/papyrus'
  private apiLogBuffer: LineBuffer = new LineBuffer()
  private webAdminLogBuffer: LineBuffer = new LineBuffer()

  private constructor() {}

  static getInstance(): PapyrusServerManager {
    if (!PapyrusServerManager.instance) {
      PapyrusServerManager.instance = new PapyrusServerManager()
    }

    return PapyrusServerManager.instance
  }

  /**
   * 관리자 웹 서버(Vite) 상태 확인
   * 포트 응답 우선, 프로세스는 보조 수단
   */
  async isWebAdminServerRunning(): Promise<boolean> {
    // 1. 먼저 HTTP로 실제 서버 응답 확인 (가장 정확)
    const httpCheck = await new Promise<boolean>((resolve) => {
      const req = http.get(`http://localhost:${this.webAdminPort}`, (res) => {
        resolve(res.statusCode === 200 || res.statusCode === 304)
      })

      req.on('error', () => resolve(false))
      req.setTimeout(2000, () => {
        req.destroy()
        resolve(false)
      })
    })

    // HTTP 응답이 있으면 확실히 실행 중
    if (httpCheck) {
      return true
    }

    // 2. HTTP 응답이 없으면 프로세스 체크 (시작 중일 수 있음)
    // exitCode !== null 이면 종료된 것
    if (this.webAdminProcess && this.webAdminProcess.exitCode === null) {
      return true
    }

    return false
  }

  /**
   * API 서버 상태 확인
   * 포트 응답 우선, 프로세스는 보조 수단
   */
  async isApiServerRunning(): Promise<boolean> {
    // 1. 먼저 HTTP로 실제 서버 응답 확인 (가장 정확)
    // /health 엔드포인트로 변경하여 로그 오염 방지
    const httpCheck = await new Promise<boolean>((resolve) => {
      const req = http.get(`http://localhost:${this.apiPort}/health`, (res) => {
        // 200, 404 등 응답이 오면 서버 실행 중
        resolve(
          res.statusCode !== undefined &&
            res.statusCode >= 200 &&
            res.statusCode < 500,
        )
      })

      req.on('error', (err: any) => {
        // ECONNREFUSED, ETIMEDOUT, ECONNRESET, ENOTFOUND 등은 정상적인 상황 (서버가 꺼져있거나 연결 문제)
        // 예상치 못한 에러만 로그 출력
        const expectedErrors = [
          'ECONNREFUSED',
          'ETIMEDOUT',
          'ENOTFOUND',
          'ECONNRESET',
          'EPIPE',
        ]
        if (!expectedErrors.includes(err.code)) {
          console.log(
            `[Health Check] Unexpected Error: ${err.code} - ${err.message}`,
          )
        }
        resolve(false)
      })
      req.setTimeout(2000, () => {
        req.destroy()
        resolve(false)
      })
    })

    // HTTP 응답이 있으면 확실히 실행 중
    if (httpCheck) {
      return true
    }

    // 2. HTTP 응답이 없으면 프로세스 체크 (시작 중일 수 있음)
    // exitCode !== null 이면 종료된 것
    if (this.apiProcess && this.apiProcess.exitCode === null) {
      return true
    }

    return false
  }

  /**
   * Papyrus 서버 전체 상태 확인
   * HTTP 응답을 우선적으로 확인 (프로세스 객체와 무관하게)
   */
  async getStatus(): Promise<PapyrusServerStatus> {
    // HTTP 응답 여부로 실제 실행 상태 확인
    // (Service Manager 외부에서 시작된 경우에도 올바르게 감지)
    const webAdminRunning = await this.isWebAdminServerRunning()
    const apiRunning = await this.isApiServerRunning()

    return {
      webAdminServer: {
        isRunning: webAdminRunning,
        port: this.webAdminPort,
        url: `http://localhost:${this.webAdminPort}`,
      },
      apiServer: {
        isRunning: apiRunning,
        port: this.apiPort,
        healthCheckUrl: `http://localhost:${this.apiPort}/health`,
      },
      allReady: webAdminRunning && apiRunning,
    }
  }

  /**
   * 프로젝트 루트 설정
   */
  setProjectRoot(root: string): void {
    this.projectRoot = root
  }

  /**
   * API 서버 시작 (오버로드)
   */
  async startApiServer(projectRoot?: string): Promise<boolean> {
    const root = projectRoot || this.projectRoot
    try {
      console.log('🚀 Papyrus API 서버 시작 중...')
      console.log(`   📂 프로젝트 경로: ${root}`)
      console.log(`   🚀 실행 명령: npm run serve:api`)

      if (this.apiProcess) {
        console.log('⚠️ API 프로세스가 이미 존재합니다')
        await this.stopApiServer()
      }

      this.apiProcess = spawn('npm', ['run', 'serve:api'], {
        cwd: root,
        shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env: {
          ...process.env,
          PATH:
            process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
        },
      })

      this.apiProcess.stdout?.on('data', (data) => {
        const lines = this.apiLogBuffer.add(data.toString())
        lines.forEach((line) => {
          const cleanLine = stripAnsiCodes(line)
          if (cleanLine.trim()) {
            console.log(`[API] ${cleanLine}`)
          }
        })
      })

      this.apiProcess.stderr?.on('data', (data) => {
        const lines = this.apiLogBuffer.add(data.toString())
        lines.forEach((line) => {
          const cleanLine = stripAnsiCodes(line)
          if (cleanLine.trim()) {
            console.error(`[API] ${cleanLine}`)
          }
        })
      })

      this.apiProcess.on('error', (error) => {
        console.error(`[Papyrus API Process Error] ${error.message}`)
      })

      this.apiProcess.on('exit', (code, signal) => {
        console.log(
          `🛑 Papyrus API 프로세스 종료됨 (코드: ${code}, 신호: ${signal})`,
        )
        this.apiProcess = null
      })

      console.log(`   ⏳ Papyrus API 서버 PID: ${this.apiProcess.pid}`)
      console.log(`   ⏳ 준비 대기 중... (최대 60초)`)

      // API가 준비될 때까지 대기
      await this.waitForApi(60)

      return true
    } catch (error: any) {
      console.error('❌ Papyrus API 서버 시작 실패:', error.message)
      console.error('   스택:', error.stack)

      return false
    }
  }

  /**
   * 포트를 사용 중인 모든 프로세스 종료 (Windows)
   */
  private async killProcessOnPort(port: number): Promise<void> {
    try {
      if (process.platform === 'win32') {
        // Windows: netstat으로 포트 사용 중인 PID 찾기
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`)
        const lines = stdout.split('\n')
        const pids = new Set<string>()

        for (const line of lines) {
          const match = line.match(/LISTENING\s+(\d+)/)
          if (match) {
            pids.add(match[1])
          }
        }

        // 모든 PID 종료
        for (const pid of pids) {
          try {
            await execAsync(`taskkill /F /PID ${pid}`)
            console.log(`   ✅ 프로세스 종료: PID ${pid}`)
          } catch (e) {
            // 이미 종료된 프로세스는 무시
          }
        }
      } else {
        // Unix-like: lsof로 포트 사용 중인 프로세스 찾기
        try {
          const { stdout } = await execAsync(`lsof -ti:${port}`)
          const pids = stdout.trim().split('\n')
          for (const pid of pids) {
            if (pid) {
              await execAsync(`kill -9 ${pid}`)
              console.log(`   ✅ 프로세스 종료: PID ${pid}`)
            }
          }
        } catch (e) {
          // 포트를 사용하는 프로세스가 없으면 무시
        }
      }
    } catch (error) {
      // 에러 무시 (포트를 사용하는 프로세스가 없을 수 있음)
    }
  }

  /**
   * API 서버 중지
   */
  async stopApiServer(): Promise<boolean> {
    try {
      console.log('🛑 Papyrus API 서버 중지 중...')

      // 1. 먼저 프로세스 객체가 있으면 종료 시도
      if (this.apiProcess) {
        return new Promise((resolve) => {
          if (!this.apiProcess) {
            resolve(true)
            return
          }

          this.apiProcess.kill('SIGTERM')

          const forceKillTimeout = setTimeout(() => {
            if (this.apiProcess) {
              this.apiProcess.kill('SIGKILL')
            }
          }, 3000)

          this.apiProcess.once('exit', async () => {
            clearTimeout(forceKillTimeout)
            this.apiProcess = null

            // 2. 포트를 사용 중인 프로세스도 강제 종료
            await this.killProcessOnPort(this.apiPort)

            console.log('✅ Papyrus API 서버 중지 완료')
            resolve(true)
          })
        })
      } else {
        // 프로세스 객체가 없어도 포트를 사용 중일 수 있음
        await this.killProcessOnPort(this.apiPort)
        console.log('✅ Papyrus API 서버 중지 완료')
        return true
      }
    } catch (error: any) {
      console.error('❌ Papyrus API 서버 중지 실패:', error.message)
      return false
    }
  }

  /**
   * API가 준비될 때까지 대기
   */
  private async waitForApi(timeoutSeconds: number): Promise<void> {
    console.log('⏳ Papyrus API 서버 준비 대기 중...')
    const startTime = Date.now()
    const timeout = timeoutSeconds * 1000

    while (Date.now() - startTime < timeout) {
      const isRunning = await this.isApiServerRunning()

      if (isRunning) {
        console.log('✅ Papyrus API 서버 준비 완료!')

        return
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    console.warn('⚠️ Papyrus API 서버 준비 시간 초과')
  }

  /**
   * 관리자 웹 서버(Vite) 시작 (오버로드)
   */
  async startWebAdminServer(projectRoot?: string): Promise<boolean> {
    const root = projectRoot || this.projectRoot
    try {
      console.log('🌐 관리자 웹 서버 시작 중...')
      console.log(`   📂 프로젝트 경로: ${root}`)
      console.log(`   🚀 실행 명령: npm run serve:web-admin`)

      if (this.webAdminProcess) {
        console.log('⚠️ 관리자 웹 프로세스가 이미 존재합니다')
        await this.stopWebAdminServer()
      }

      this.webAdminProcess = spawn('npm', ['run', 'serve:web-admin'], {
        cwd: root,
        shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PATH:
            process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
          WEB_BIND_HOST: '0.0.0.0',
          WEB_PORT: '3000',
          NODE_ENV: 'development',
        },
      })

      this.webAdminProcess.stdout?.on('data', (data) => {
        const lines = this.webAdminLogBuffer.add(data.toString())
        lines.forEach((line) => {
          const cleanLine = stripAnsiCodes(line)
          if (cleanLine.trim()) {
            console.log(`[WEB-ADMIN] ${cleanLine}`)
          }
        })
      })

      this.webAdminProcess.stderr?.on('data', (data) => {
        const lines = this.webAdminLogBuffer.add(data.toString())
        lines.forEach((line) => {
          const cleanLine = stripAnsiCodes(line)
          // Vite 프록시 에러는 필터링 (API 서버 미실행 시 발생)
          if (
            cleanLine.trim() &&
            !cleanLine.includes('http proxy error') &&
            !cleanLine.includes('ECONNREFUSED')
          ) {
            console.error(`[WEB-ADMIN] ${cleanLine}`)
          }
        })
      })

      this.webAdminProcess.on('error', (error) => {
        console.error(`[관리자 웹 Process Error] ${error.message}`)
      })

      this.webAdminProcess.on('exit', (code, signal) => {
        console.log(
          `🛑 관리자 웹 프로세스 종료됨 (코드: ${code}, 신호: ${signal})`,
        )
        this.webAdminProcess = null
      })

      console.log(`   ⏳ 관리자 웹 서버 PID: ${this.webAdminProcess.pid}`)
      console.log(`   ⏳ 준비 대기 중... (최대 30초)`)

      await this.waitForWebAdmin(30)

      return true
    } catch (error: any) {
      console.error('❌ 관리자 웹 서버 시작 실패:', error.message)
      console.error('   스택:', error.stack)

      return false
    }
  }

  /**
   * 관리자 웹 서버 중지
   */
  async stopWebAdminServer(): Promise<boolean> {
    try {
      console.log('🛑 관리자 웹 서버 중지 중...')

      if (this.webAdminProcess) {
        return new Promise((resolve) => {
          if (!this.webAdminProcess) {
            resolve(true)
            return
          }

          this.webAdminProcess.kill('SIGTERM')

          const forceKillTimeout = setTimeout(() => {
            if (this.webAdminProcess) {
              this.webAdminProcess.kill('SIGKILL')
            }
          }, 3000)

          this.webAdminProcess.once('exit', async () => {
            clearTimeout(forceKillTimeout)
            this.webAdminProcess = null

            // 포트를 사용 중인 프로세스도 강제 종료
            await this.killProcessOnPort(this.webAdminPort)

            console.log('✅ 관리자 웹 서버 중지 완료')
            resolve(true)
          })
        })
      } else {
        await this.killProcessOnPort(this.webAdminPort)
        console.log('✅ 관리자 웹 서버 중지 완료')
        return true
      }
    } catch (error: any) {
      console.error('❌ 관리자 웹 서버 중지 실패:', error.message)
      return false
    }
  }

  /**
   * 관리자 웹 서버가 준비될 때까지 대기
   */
  private async waitForWebAdmin(timeoutSeconds: number): Promise<void> {
    console.log('⏳ 관리자 웹 서버 준비 대기 중...')
    const startTime = Date.now()
    const timeout = timeoutSeconds * 1000

    while (Date.now() - startTime < timeout) {
      const isRunning = await this.isWebAdminServerRunning()

      if (isRunning) {
        console.log('✅ 관리자 웹 서버 준비 완료!')

        return
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    console.warn('⚠️ 관리자 웹 서버 준비 시간 초과')
  }

  /**
   * API 서버 로그 가져오기
   */
  async getApiServerLogs(): Promise<string> {
    if (!this.apiProcess || !this.apiProcess.stdout) {
      return '로그가 없습니다. API 서버가 실행 중이지 않습니다.'
    }
    return 'API 서버 로그는 콘솔에서 확인하세요.'
  }

  /**
   * 관리자 웹 서버 로그 가져오기
   */
  async getWebAdminServerLogs(): Promise<string> {
    if (!this.webAdminProcess || !this.webAdminProcess.stdout) {
      return '로그가 없습니다. 관리자 웹 서버가 실행 중이지 않습니다.'
    }
    return '관리자 웹 서버 로그는 콘솔에서 확인하세요.'
  }

  /**
   * API 서버 빌드
   */
  async buildApi(projectRoot?: string): Promise<boolean> {
    const root = projectRoot || this.projectRoot
    try {
      console.log('🏗️  API 서버 빌드 시작...')
      console.log(`   📂 프로젝트 경로: ${root}`)
      console.log(`   🚀 실행 명령: npm run build:api`)

      const { stdout, stderr } = await execAsync('npm run build:api', {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB
      })

      // 표준 출력 로그
      if (stdout) {
        const lines = stdout.split('\n').filter((line) => line.trim())
        lines.forEach((line) => {
          if (
            line.includes('✅') ||
            line.includes('완료') ||
            line.includes('Successfully') ||
            line.includes('Build')
          ) {
            console.log(`   ${line}`)
          }
        })
      }

      // 표준 에러 로그 (경고/에러)
      if (stderr) {
        const lines = stderr.split('\n').filter((line) => line.trim())
        lines.forEach((line) => {
          if (line.includes('error') || line.includes('Error')) {
            console.error(`   ❌ ${line}`)
          }
        })
      }

      console.log('✅ API 서버 빌드 완료!')

      return true
    } catch (error: any) {
      console.error('❌ API 서버 빌드 실패:', error.message)
      if (error.stdout) {
        console.error('   출력:', error.stdout)
      }
      if (error.stderr) {
        console.error('   에러:', error.stderr)
      }

      return false
    }
  }

  /**
   * Nestia SDK 빌드
   */
  async buildNestiaSdk(projectRoot?: string): Promise<boolean> {
    const root = projectRoot || this.projectRoot
    try {
      console.log('🔨 Nestia SDK 빌드 시작...')
      console.log(`   📂 프로젝트 경로: ${root}`)
      console.log(`   🚀 실행 명령: npm run build:nestia`)

      const { stdout, stderr } = await execAsync('npm run build:nestia', {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB
      })

      // 표준 출력 로그
      if (stdout) {
        const lines = stdout.split('\n').filter((line) => line.trim())
        lines.forEach((line) => {
          if (
            line.includes('✅') ||
            line.includes('완료') ||
            line.includes('Generating')
          ) {
            console.log(`   ${line}`)
          }
        })
      }

      // 표준 에러 로그 (경고/에러)
      if (stderr) {
        const lines = stderr.split('\n').filter((line) => line.trim())
        lines.forEach((line) => {
          if (line.includes('error') || line.includes('Error')) {
            console.error(`   ❌ ${line}`)
          }
        })
      }

      console.log('✅ Nestia SDK 빌드 완료!')

      return true
    } catch (error: any) {
      console.error('❌ Nestia SDK 빌드 실패:', error.message)
      if (error.stdout) {
        console.error('   출력:', error.stdout)
      }
      if (error.stderr) {
        console.error('   에러:', error.stderr)
      }

      return false
    }
  }

  /**
   * Web(관리자 웹) 빌드
   */
  async buildWeb(projectRoot?: string): Promise<boolean> {
    const root = projectRoot || this.projectRoot
    try {
      console.log('🌐 Web 빌드 시작...')
      console.log(`   📂 프로젝트 경로: ${root}`)
      console.log(`   🚀 실행 명령: npm run build:web`)

      const { stdout, stderr } = await execAsync('npm run build:web', {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB
      })

      if (stdout) {
        const lines = stdout.split('\n').filter((line) => line.trim())
        lines.forEach((line) => {
          if (
            line.includes('✅') ||
            line.includes('완료') ||
            line.includes('Successfully') ||
            line.includes('Build')
          ) {
            console.log(`   ${line}`)
          }
        })
      }

      if (stderr) {
        const lines = stderr.split('\n').filter((line) => line.trim())
        lines.forEach((line) => {
          if (line.includes('error') || line.includes('Error')) {
            console.error(`   ❌ ${line}`)
          }
        })
      }

      console.log('✅ Web 빌드 완료!')
      return true
    } catch (error: any) {
      console.error('❌ Web 빌드 실패:', error.message)
      if (error.stdout) console.error('   출력:', error.stdout)
      if (error.stderr) console.error('   에러:', error.stderr)
      return false
    }
  }
}
