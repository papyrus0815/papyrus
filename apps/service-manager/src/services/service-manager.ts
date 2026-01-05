/**
 * Service Manager
 * 모든 서비스를 통합 관리하는 서비스
 */

import { DockerManager, DockerStatus } from './docker-manager'
import {
  PapyrusServerManager,
  PapyrusServerStatus,
} from './papyrus-server-manager'

export interface ServiceStatus {
  docker: DockerStatus
  papyrusServer: PapyrusServerStatus
  allReady: boolean
}

export class ServiceManager {
  private static instance: ServiceManager
  public readonly dockerManager: DockerManager
  public readonly papyrusServerManager: PapyrusServerManager
  private projectRoot: string

  private constructor() {
    this.dockerManager = DockerManager.getInstance()
    this.papyrusServerManager = PapyrusServerManager.getInstance()

    // 프로젝트 루트 자동 감지
    this.projectRoot =
      process.env.PAPYRUS_PROJECT_ROOT ||
      '/Users/yendoo/dev/papyrus'
    console.log('📁 프로젝트 루트:', this.projectRoot)
  }

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager()
    }

    return ServiceManager.instance
  }

  /**
   * 전체 서비스 상태 확인
   */
  async getStatus(): Promise<ServiceStatus> {
    const [docker, papyrusServer] = await Promise.all([
      this.dockerManager.getStatus(),
      this.papyrusServerManager.getStatus(),
    ])

    const allReady =
      docker.isRunning &&
      docker.containers.mysql &&
      papyrusServer.webAdminServer.isRunning &&
      papyrusServer.webUserServer.isRunning &&
      papyrusServer.apiServer.isRunning

    return {
      docker,
      papyrusServer,
      allReady,
    }
  }

  /**
   * 모든 서비스 시작
   */
  async startAll(): Promise<boolean> {
    try {
      console.log('\n┌─────────────────────────────────────────────────────┐')
      console.log('│  🚀 Papyrus 서비스 시작 중...                      │')
      console.log('└─────────────────────────────────────────────────────┘\n')

      // 1. Docker 확인
      console.log('  [1/5] Docker 설치 확인...')
      const isDockerInstalled = await this.dockerManager.isDockerInstalled()
      if (!isDockerInstalled) {
        throw new Error('Docker가 설치되지 않았습니다')
      }
      console.log('        ✅ Docker 설치됨')

      // 2. Docker Desktop 실행 및 컨테이너 시작
      console.log('\n  [2/5] Docker Desktop 실행 및 컨테이너 시작...')
      const dockerStarted = await this.dockerManager.startDocker(this.projectRoot)
      if (!dockerStarted) {
        throw new Error('Docker Desktop 실행에 실패했습니다')
      }
      console.log('        ✅ Docker Desktop 및 컨테이너 실행 중')

      // 3. API 서버 시작
      console.log('\n  [3/5] Papyrus API 서버 시작...')
      const apiRunning = await this.papyrusServerManager.isApiServerRunning()
      if (!apiRunning) {
        console.log('        🚀 API 서버 시작 중... (최대 60초 소요)')
        const apiStarted = await this.papyrusServerManager.startApiServer(
          this.projectRoot,
        )
        if (!apiStarted) {
          throw new Error('API 서버 시작에 실패했습니다')
        }
      }
      console.log('        ✅ API 서버 실행 중 (포트: 8000)')

      // 4. 관리자 웹 서버 시작
      console.log('\n  [4/5] 관리자 웹 서버 시작...')
      const webAdminRunning = await this.papyrusServerManager.isWebAdminServerRunning()
      if (!webAdminRunning) {
        console.log('        🌐 관리자 웹 서버 시작 중... (최대 30초 소요)')
        const webAdminStarted = await this.papyrusServerManager.startWebAdminServer(
          this.projectRoot,
        )
        if (!webAdminStarted) {
          console.warn('        ⚠️  관리자 웹 서버 시작에 실패했습니다')
        } else {
          console.log('        ✅ 관리자 웹 서버 실행 중 (포트: 3000)')
        }
      } else {
        console.log('        ✅ 관리자 웹 서버 실행 중 (포트: 3000)')
      }

      // 5. 사용자 웹 서버 시작
      console.log('\n  [5/5] 사용자 웹 서버 시작...')
      const webUserRunning = await this.papyrusServerManager.isWebUserServerRunning()
      if (!webUserRunning) {
        console.log('        👥 사용자 웹 서버 시작 중... (최대 30초 소요)')
        const webUserStarted = await this.papyrusServerManager.startWebUserServer(
          this.projectRoot,
        )
        if (!webUserStarted) {
          console.warn('        ⚠️  사용자 웹 서버 시작에 실패했습니다')
        } else {
          console.log('        ✅ 사용자 웹 서버 실행 중 (포트: 4200)')
        }
      } else {
        console.log('        ✅ 사용자 웹 서버 실행 중 (포트: 4200)')
      }

      console.log('\n┌─────────────────────────────────────────────────────┐')
      console.log('│  🎉 모든 서비스가 시작되었습니다!                  │')
      console.log('├─────────────────────────────────────────────────────┤')
      console.log('│  🔧 관리자 웹: http://localhost:3000               │')
      console.log('│  👥 사용자 웹: https://user.civilization.zone      │')
      console.log('│  🎮 API 서버: http://localhost:8000                │')
      console.log('└─────────────────────────────────────────────────────┘\n')

      return true
    } catch (error: any) {
      console.log('\n┌─────────────────────────────────────────────────────┐')
      console.log('│  ❌ 서비스 시작 실패                               │')
      console.log('├─────────────────────────────────────────────────────┤')
      console.log(`│  ${error.message.padEnd(49)} │`)
      console.log('└─────────────────────────────────────────────────────┘\n')

      return false
    }
  }

  /**
   * 모든 서비스 중지
   */
  async stopAll(): Promise<boolean> {
    try {
      console.log('🛑 Papyrus 서비스 중지 중...')

      // API 서버 중지
      await this.papyrusServerManager.stopApiServer()

      // 웹 서버들 중지
      await this.papyrusServerManager.stopWebAdminServer()
      await this.papyrusServerManager.stopWebUserServer()

      // Docker 컨테이너는 유지 (다른 프로젝트에서 사용 가능)
      console.log('ℹ️ Docker 컨테이너는 유지됩니다')

      console.log('✅ 서비스 중지 완료')

      return true
    } catch (error: any) {
      console.error('❌ 서비스 중지 실패:', error.message)

      return false
    }
  }

  /**
   * 서비스 재시작
   */
  async restart(): Promise<boolean> {
    console.log('🔄 서비스 재시작 중...')
    await this.stopAll()
    await new Promise((resolve) => setTimeout(resolve, 3000))

    return await this.startAll()
  }

  /**
   * 프로젝트 루트 경로 설정
   */
  setProjectRoot(rootPath: string): void {
    this.projectRoot = rootPath
    this.dockerManager.setProjectRoot(rootPath)
    this.papyrusServerManager.setProjectRoot(rootPath)
    console.log('📁 프로젝트 루트 업데이트:', this.projectRoot)
  }

  /**
   * 데이터베이스 마이그레이션 실행
   * - 자동으로 타임스탬프 기반 마이그레이션 이름 생성
   * - 사용자 입력 없이 자동 실행
   */
  async runMigration(): Promise<boolean> {
    try {
      console.log('\n┌─────────────────────────────────────────────────────┐')
      console.log('│  🔄 데이터베이스 마이그레이션 시작...              │')
      console.log('└─────────────────────────────────────────────────────┘\n')

      const { spawn } = await import('child_process')

      // 타임스탬프 기반 마이그레이션 이름 생성
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\..+/, '')
        .replace('T', '_')
      const migrationName = `auto_migration_${timestamp}`

      console.log(`📝 마이그레이션 이름: ${migrationName}`)
      console.log('⚙️  스키마 병합 및 마이그레이션 실행 중...\n')

      return new Promise((resolve) => {
        // run-migrate.ts에 마이그레이션 이름을 인자로 전달
        const process = spawn(
          'npx',
          ['ts-node', 'libs/db/prisma/run-migrate.ts', migrationName],
          {
            cwd: this.projectRoot,
            shell: true,
            stdio: 'inherit', // 실시간 출력을 위해 inherit 사용
          },
        )

        process.on('close', (code: number | null) => {
          if (code === 0) {
            console.log(
              '\n┌─────────────────────────────────────────────────────┐',
            )
            console.log(
              '│  ✅ 마이그레이션 완료!                             │',
            )
            console.log(
              '└─────────────────────────────────────────────────────┘\n',
            )
            resolve(true)
          } else {
            console.log(
              '\n┌─────────────────────────────────────────────────────┐',
            )
            console.log(
              '│  ❌ 마이그레이션 실패                              │',
            )
            console.log(
              '└─────────────────────────────────────────────────────┘\n',
            )
            resolve(false)
          }
        })

        process.on('error', (error: any) => {
          console.error('❌ 마이그레이션 프로세스 오류:', error.message)
          resolve(false)
        })
      })
    } catch (error: any) {
      console.error('❌ 마이그레이션 실행 오류:', error.message)

      return false
    }
  }

  /**
   * 데이터베이스 마이그레이션 Deploy 실행
   * - 생성된 마이그레이션을 DB에 적용 (Production용)
   */
  async runDeploy(): Promise<boolean> {
    try {
      console.log('\n┌─────────────────────────────────────────────────────┐')
      console.log('│  🚀 마이그레이션 Deploy 시작...                    │')
      console.log('└─────────────────────────────────────────────────────┘\n')

      const { spawn } = await import('child_process')

      return new Promise((resolve) => {
        const process = spawn(
          'npx',
          [
            'prisma',
            'migrate',
            'deploy',
            '--schema=apps/api/prisma/schema.prisma',
          ],
          {
            cwd: this.projectRoot,
            shell: true,
            stdio: 'inherit',
          },
        )

        process.on('close', (code: number | null) => {
          if (code === 0) {
            console.log(
              '\n┌─────────────────────────────────────────────────────┐',
            )
            console.log(
              '│  ✅ Deploy 완료!                                    │',
            )
            console.log(
              '└─────────────────────────────────────────────────────┘\n',
            )
            resolve(true)
          } else {
            console.log(
              '\n┌─────────────────────────────────────────────────────┐',
            )
            console.log(
              '│  ❌ Deploy 실패                                     │',
            )
            console.log(
              '└─────────────────────────────────────────────────────┘\n',
            )
            resolve(false)
          }
        })

        process.on('error', (error: any) => {
          console.error('❌ Deploy 프로세스 오류:', error.message)
          resolve(false)
        })
      })
    } catch (error: any) {
      console.error('❌ Deploy 실행 오류:', error.message)

      return false
    }
  }

  /**
   * Prisma Client 재생성
   */
  async runGenerate(): Promise<boolean> {
    try {
      console.log('\n┌─────────────────────────────────────────────────────┐')
      console.log('│  ⚡ Prisma Client 재생성 시작...                   │')
      console.log('└─────────────────────────────────────────────────────┘\n')

      const { spawn } = await import('child_process')

      return new Promise((resolve) => {
        const process = spawn(
          'npx',
          ['prisma', 'generate', '--schema=apps/api/prisma/schema.prisma'],
          {
            cwd: this.projectRoot,
            shell: true,
            stdio: 'inherit',
          },
        )

        process.on('close', (code: number | null) => {
          if (code === 0) {
            console.log(
              '\n┌─────────────────────────────────────────────────────┐',
            )
            console.log(
              '│  ✅ Generate 완료!                                  │',
            )
            console.log(
              '└─────────────────────────────────────────────────────┘\n',
            )
            resolve(true)
          } else {
            console.log(
              '\n┌─────────────────────────────────────────────────────┐',
            )
            console.log(
              '│  ❌ Generate 실패                                   │',
            )
            console.log(
              '└─────────────────────────────────────────────────────┘\n',
            )
            resolve(false)
          }
        })

        process.on('error', (error: any) => {
          console.error('❌ Generate 프로세스 오류:', error.message)
          resolve(false)
        })
      })
    } catch (error: any) {
      console.error('❌ Generate 실행 오류:', error.message)

      return false
    }
  }

  /**
   * 데이터베이스 Seed 실행
   */
  async runSeed(): Promise<boolean> {
    try {
      console.log('\n┌─────────────────────────────────────────────────────┐')
      console.log('│  🌱 데이터베이스 Seed 시작...                      │')
      console.log('└─────────────────────────────────────────────────────┘\n')

      const { spawn } = await import('child_process')

      return new Promise((resolve) => {
        const process = spawn(
          'npx',
          ['prisma', 'db', 'seed', '--schema=apps/api/prisma/schema.prisma'],
          {
            cwd: this.projectRoot,
            shell: true,
            stdio: 'pipe',
          },
        )

        let output = ''

        process.stdout?.on('data', (data: Buffer) => {
          const text = data.toString()
          output += text
          console.log(text.trim())
        })

        process.stderr?.on('data', (data: Buffer) => {
          const text = data.toString()
          output += text
          console.error(text.trim())
        })

        process.on('close', (code: number | null) => {
          if (code === 0) {
            console.log(
              '\n┌─────────────────────────────────────────────────────┐',
            )
            console.log(
              '│  ✅ Seed 실행 완료!                                │',
            )
            console.log(
              '└─────────────────────────────────────────────────────┘\n',
            )
            resolve(true)
          } else {
            console.log(
              '\n┌─────────────────────────────────────────────────────┐',
            )
            console.log(
              '│  ❌ Seed 실행 실패                                 │',
            )
            console.log(
              '└─────────────────────────────────────────────────────┘\n',
            )
            resolve(false)
          }
        })
      })
    } catch (error: any) {
      console.error('❌ Seed 실행 오류:', error.message)

      return false
    }
  }

  /**
   * Prisma Studio 열기
   */
  async openPrismaStudio(): Promise<boolean> {
    try {
      console.log('🎨 Prisma Studio 실행 중...')

      const { spawn } = await import('child_process')

      spawn(
        'npx',
        ['prisma', 'studio', '--schema=apps/api/prisma/schema.prisma'],
        {
          cwd: this.projectRoot,
          shell: true,
          detached: true,
          stdio: 'ignore',
        },
      ).unref()

      console.log('✅ Prisma Studio가 백그라운드에서 실행 중입니다')
      console.log('   http://localhost:5555')

      return true
    } catch (error: any) {
      console.error('❌ Prisma Studio 실행 오류:', error.message)

      return false
    }
  }

  /**
   * 로그 파일 목록 조회
   */
  async getLogFiles(): Promise<Array<{ category: string; files: Array<{ name: string; path: string; size: number; mtime: string }> }>> {
    const fs = await import('fs')
    const path = await import('path')
    
    const logsDir = path.join(this.projectRoot, 'logs')
    const categories = ['prisma/build', 'prisma/validate', 'prisma/generate', 'prisma/migrate', 'seed']
    const result: Array<{ category: string; files: Array<{ name: string; path: string; size: number; mtime: string }> }> = []

    for (const category of categories) {
      const categoryPath = path.join(logsDir, category)
      
      if (!fs.existsSync(categoryPath)) {
        continue
      }

      const files = fs.readdirSync(categoryPath)
        .filter(file => file.endsWith('.log'))
        .map(file => {
          const filePath = path.join(categoryPath, file)
          const stats = fs.statSync(filePath)
          return {
            name: file,
            path: filePath,
            size: stats.size,
            mtime: stats.mtime.toISOString(),
          }
        })
        .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime()) // 최신순

      if (files.length > 0) {
        result.push({
          category: category.replace('prisma/', ''),
          files,
        })
      }
    }

    return result
  }

  /**
   * 로그 파일 읽기
   */
  async readLogFile(filePath: string): Promise<string> {
    const fs = await import('fs')
    
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch (error: any) {
      throw new Error(`로그 파일 읽기 실패: ${error.message}`)
    }
  }
}
