/**
 * Prisma Manager
 * Prisma 스키마 빌드, 마이그레이션, Studio 등 Prisma 관련 작업 관리
 */

import { exec, spawn, ChildProcess } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'

const execAsync = promisify(exec)

export interface PrismaStatus {
  schemaValid: boolean
  migrationsCount: number
  lastMigration: string | null
  studioRunning: boolean
}

export interface MigrationInfo {
  name: string
  appliedAt: string
}

export class PrismaManager {
  private static instance: PrismaManager
  private projectRoot: string = ''
  private studioProcess: ChildProcess | null = null
  private onLogCallback?: (message: string) => void

  private constructor() {}

  public static getInstance(): PrismaManager {
    if (!PrismaManager.instance) {
      PrismaManager.instance = new PrismaManager()
    }
    return PrismaManager.instance
  }

  public setProjectRoot(root: string) {
    this.projectRoot = root
    this.log(`✅ Prisma 프로젝트 루트 설정: ${root}`)
  }

  public setLogCallback(callback: (message: string) => void) {
    this.onLogCallback = callback
  }

  private log(message: string) {
    console.log(message)
    if (this.onLogCallback) {
      this.onLogCallback(message)
    }
  }

  private getSchemaPath(): string {
    return path.join(this.projectRoot, 'apps/api/prisma/schema.prisma')
  }

  private getLibSchemaPath(): string {
    return path.join(this.projectRoot, 'libs/db/prisma')
  }

  private getMigrationsPath(): string {
    return path.join(this.projectRoot, 'apps/api/prisma/migrations')
  }

  /**
   * 로그 파일 저장
   */
  private saveLog(category: string, status: 'success' | 'failed', content: string): string {
    try {
      const logsDir = path.join(this.projectRoot, 'logs', 'prisma', category)
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true })
      }

      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '')
      const logFilePath = path.join(logsDir, `${timestamp}_${status}.log`)

      const logContent = `=== Prisma ${category} 로그 ===
시간: ${new Date().toLocaleString('ko-KR')}
상태: ${status === 'success' ? '✅ 성공' : '❌ 실패'}

${content}
`
      fs.writeFileSync(logFilePath, logContent, 'utf-8')
      this.log(`📁 로그 저장: ${logFilePath}`)
      
      return logFilePath
    } catch (error) {
      this.log(`⚠️ 로그 저장 실패: ${error}`)
      return ''
    }
  }

  /**
   * 스키마 빌드 (libs/db/prisma/*.prisma → apps/api/prisma/schema.prisma)
   */
  public async buildSchema(): Promise<{ success: boolean; message: string }> {
    if (!this.projectRoot) {
      return { success: false, message: '프로젝트 루트가 설정되지 않았습니다.' }
    }

    this.log('📦 Prisma 스키마 빌드 시작...')

    try {
      const buildScriptPath = path.join(
        this.getLibSchemaPath(),
        'build-schema.ts',
      )

      if (!fs.existsSync(buildScriptPath)) {
        throw new Error(`빌드 스크립트를 찾을 수 없습니다: ${buildScriptPath}`)
      }

      const { stdout, stderr } = await execAsync(
        `cd "${this.projectRoot}" && npx ts-node "${buildScriptPath}"`,
      )

      if (stderr && !stderr.includes('ExperimentalWarning')) {
        this.log(`⚠️ ${stderr}`)
      }

      this.log('✅ 스키마 빌드 완료!')
      this.log(stdout)

      // 로그 저장
      let logContent = '스키마 빌드가 완료되었습니다.\n\n'
      logContent += '=== 실행 로그 ===\n'
      logContent += stdout
      const logPath = this.saveLog('build', 'success', logContent)

      return { 
        success: true, 
        message: logContent + (logPath ? `\n\n📁 로그: ${logPath}` : '')
      }
    } catch (error: any) {
      const errorMsg = `스키마 빌드 실패: ${error.message}`
      this.log(`❌ ${errorMsg}`)
      
      // 로그 저장
      let logContent = errorMsg
      if (error.stdout) logContent += '\n\n=== 실행 로그 ===\n' + error.stdout
      if (error.stderr) logContent += '\n\n=== 에러 로그 ===\n' + error.stderr
      const logPath = this.saveLog('build', 'failed', logContent)

      return { 
        success: false, 
        message: logContent + (logPath ? `\n\n📁 로그: ${logPath}` : '')
      }
    }
  }

  /**
   * 스키마 검증
   */
  public async validateSchema(): Promise<{
    success: boolean
    message: string
  }> {
    if (!this.projectRoot) {
      return { success: false, message: '프로젝트 루트가 설정되지 않았습니다.' }
    }

    this.log('🔍 Prisma 스키마 검증 중...')

    try {
      const schemaPath = this.getSchemaPath()

      if (!fs.existsSync(schemaPath)) {
        throw new Error(
          '스키마 파일이 없습니다. 먼저 스키마를 빌드해주세요.',
        )
      }

      const { stdout } = await execAsync(
        `cd "${this.projectRoot}" && npx prisma validate --schema="${schemaPath}"`,
      )

      this.log('✅ 스키마 검증 완료!')
      this.log(stdout)

      // 로그 저장
      let logContent = '스키마가 유효합니다.\n\n'
      logContent += '=== 실행 로그 ===\n'
      logContent += stdout
      const logPath = this.saveLog('validate', 'success', logContent)

      return { 
        success: true, 
        message: logContent + (logPath ? `\n\n📁 로그: ${logPath}` : '')
      }
    } catch (error: any) {
      const errorMsg = `스키마 검증 실패: ${error.message}`
      this.log(`❌ ${errorMsg}`)
      
      // 로그 저장
      let logContent = errorMsg
      if (error.stdout) logContent += '\n\n=== 실행 로그 ===\n' + error.stdout
      if (error.stderr) logContent += '\n\n=== 에러 로그 ===\n' + error.stderr
      const logPath = this.saveLog('validate', 'failed', logContent)

      return { 
        success: false, 
        message: logContent + (logPath ? `\n\n📁 로그: ${logPath}` : '')
      }
    }
  }

  /**
   * Prisma Client 생성
   */
  public async generateClient(): Promise<{
    success: boolean
    message: string
  }> {
    if (!this.projectRoot) {
      return { success: false, message: '프로젝트 루트가 설정되지 않았습니다.' }
    }

    this.log('🔄 Prisma Client 생성 중...')

    try {
      const schemaPath = this.getSchemaPath()

      if (!fs.existsSync(schemaPath)) {
        throw new Error(
          '스키마 파일이 없습니다. 먼저 스키마를 빌드해주세요.',
        )
      }

      const { stdout } = await execAsync(
        `cd "${this.projectRoot}" && npx prisma generate --schema="${schemaPath}"`,
      )

      this.log('✅ Prisma Client 생성 완료!')
      this.log(stdout)

      // 로그 저장
      let logContent = 'Prisma Client가 생성되었습니다.\n\n'
      logContent += '=== 실행 로그 ===\n'
      logContent += stdout
      const logPath = this.saveLog('generate', 'success', logContent)

      return { 
        success: true, 
        message: logContent + (logPath ? `\n\n📁 로그: ${logPath}` : '')
      }
    } catch (error: any) {
      const errorMsg = `Prisma Client 생성 실패: ${error.message}`
      this.log(`❌ ${errorMsg}`)
      
      // 로그 저장
      let logContent = errorMsg
      if (error.stdout) logContent += '\n\n=== 실행 로그 ===\n' + error.stdout
      if (error.stderr) logContent += '\n\n=== 에러 로그 ===\n' + error.stderr
      const logPath = this.saveLog('generate', 'failed', logContent)

      return { 
        success: false, 
        message: logContent + (logPath ? `\n\n📁 로그: ${logPath}` : '')
      }
    }
  }

  /**
   * 마이그레이션 생성 및 적용 (개발 환경)
   */
  public async migrate(
    migrationName: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!this.projectRoot) {
      return { success: false, message: '프로젝트 루트가 설정되지 않았습니다.' }
    }

    if (!migrationName || migrationName.trim() === '') {
      return { success: false, message: '마이그레이션 이름을 입력해주세요.' }
    }

    this.log(`🚀 마이그레이션 생성: ${migrationName}`)

    try {
      // 1. 스키마 빌드
      const buildResult = await this.buildSchema()
      if (!buildResult.success) {
        return buildResult
      }

      // 2. 마이그레이션 생성 및 적용
      const schemaPath = this.getSchemaPath()
      this.log('📝 마이그레이션 생성 및 DB 적용 중...')

      const { stdout, stderr } = await execAsync(
        `cd "${this.projectRoot}" && npx prisma migrate dev --name ${migrationName} --schema="${schemaPath}"`,
      )

      if (stderr && !stderr.includes('ExperimentalWarning')) {
        this.log(`⚠️ ${stderr}`)
      }

      this.log('✅ 마이그레이션 완료!')
      this.log(stdout)

      // 로그 저장
      let logContent = `마이그레이션이 완료되었습니다.\n`
      logContent += `마이그레이션 이름: ${migrationName}\n\n`
      logContent += '=== 실행 로그 ===\n'
      logContent += stdout
      if (stderr && !stderr.includes('ExperimentalWarning')) {
        logContent += '\n\n=== 경고 ===\n' + stderr
      }
      const logPath = this.saveLog('migrate', 'success', logContent)

      return { 
        success: true, 
        message: logContent + (logPath ? `\n\n📁 로그: ${logPath}` : '')
      }
    } catch (error: any) {
      const errorMsg = `마이그레이션 실패: ${error.message}`
      this.log(`❌ ${errorMsg}`)
      
      // 로그 저장
      let logContent = `마이그레이션 이름: ${migrationName}\n\n`
      logContent += errorMsg
      if (error.stdout) logContent += '\n\n=== 실행 로그 ===\n' + error.stdout
      if (error.stderr) logContent += '\n\n=== 에러 로그 ===\n' + error.stderr
      const logPath = this.saveLog('migrate', 'failed', logContent)

      return { 
        success: false, 
        message: logContent + (logPath ? `\n\n📁 로그: ${logPath}` : '')
      }
    }
  }

  /**
   * 마이그레이션 Deploy (프로덕션 환경)
   * 이미 생성된 마이그레이션 파일들을 DB에 적용
   */
  public async deploy(): Promise<{ success: boolean; message: string }> {
    if (!this.projectRoot) {
      return { success: false, message: '프로젝트 루트가 설정되지 않았습니다.' }
    }

    this.log('🚀 마이그레이션 Deploy 시작...')

    try {
      const schemaPath = this.getSchemaPath()

      if (!fs.existsSync(schemaPath)) {
        throw new Error(
          '스키마 파일이 없습니다. 먼저 스키마를 빌드해주세요.',
        )
      }

      // 마이그레이션 폴더 확인
      const migrationsPath = this.getMigrationsPath()
      if (!fs.existsSync(migrationsPath)) {
        throw new Error(
          '마이그레이션 폴더가 없습니다. 먼저 마이그레이션을 생성해주세요.',
        )
      }

      this.log('📝 마이그레이션 Deploy 중...')

      const { stdout, stderr } = await execAsync(
        `cd "${this.projectRoot}" && npx prisma migrate deploy --schema="${schemaPath}"`,
        {
          timeout: 120000, // 2분
        }
      )

      if (stderr && !stderr.includes('ExperimentalWarning')) {
        this.log(`⚠️ ${stderr}`)
      }

      this.log('✅ 마이그레이션 Deploy 완료!')
      this.log(stdout)

      // 로그 저장
      let logContent = `마이그레이션 Deploy가 완료되었습니다.\n\n`
      logContent += '=== 실행 로그 ===\n'
      logContent += stdout
      if (stderr && !stderr.includes('ExperimentalWarning')) {
        logContent += '\n\n=== 경고 ===\n' + stderr
      }
      const logPath = this.saveLog('deploy', 'success', logContent)

      return { 
        success: true, 
        message: logContent + (logPath ? `\n\n📁 로그: ${logPath}` : '')
      }
    } catch (error: any) {
      const errorMsg = `마이그레이션 Deploy 실패: ${error.message}`
      this.log(`❌ ${errorMsg}`)
      
      // 로그 저장
      let logContent = errorMsg
      if (error.stdout) logContent += '\n\n=== 실행 로그 ===\n' + error.stdout
      if (error.stderr) logContent += '\n\n=== 에러 로그 ===\n' + error.stderr
      const logPath = this.saveLog('deploy', 'failed', logContent)

      return { 
        success: false, 
        message: logContent + (logPath ? `\n\n📁 로그: ${logPath}` : '')
      }
    }
  }

  /**
   * 마이그레이션 목록 조회
   */
  public async getMigrations(): Promise<MigrationInfo[]> {
    if (!this.projectRoot) {
      return []
    }

    try {
      const migrationsPath = this.getMigrationsPath()

      if (!fs.existsSync(migrationsPath)) {
        return []
      }

      const migrations = fs
        .readdirSync(migrationsPath)
        .filter((item) => {
          const itemPath = path.join(migrationsPath, item)
          return fs.statSync(itemPath).isDirectory()
        })
        .map((name) => {
          const itemPath = path.join(migrationsPath, name)
          const stats = fs.statSync(itemPath)

          // 폴더 이름에서 타임스탬프 추출 (예: 20231225120000_init → 2023-12-25 12:00:00)
          const match = name.match(/^(\d{14})_(.+)$/)
          let appliedAt = stats.mtime.toISOString()

          if (match) {
            const timestamp = match[1]
            const year = timestamp.substring(0, 4)
            const month = timestamp.substring(4, 6)
            const day = timestamp.substring(6, 8)
            const hour = timestamp.substring(8, 10)
            const minute = timestamp.substring(10, 12)
            const second = timestamp.substring(12, 14)
            appliedAt = `${year}-${month}-${day} ${hour}:${minute}:${second}`
          }

          return {
            name,
            appliedAt,
          }
        })
        .sort((a, b) => b.name.localeCompare(a.name)) // 최신순 정렬

      return migrations
    } catch (error) {
      console.error('마이그레이션 목록 조회 실패:', error)
      return []
    }
  }

  /**
   * 마이그레이션 상태 확인
   */
  public async getMigrationStatus(): Promise<{
    success: boolean
    message: string
  }> {
    if (!this.projectRoot) {
      return { success: false, message: '프로젝트 루트가 설정되지 않았습니다.' }
    }

    this.log('📊 마이그레이션 상태 확인 중...')

    try {
      const schemaPath = this.getSchemaPath()

      if (!fs.existsSync(schemaPath)) {
        throw new Error(
          '스키마 파일이 없습니다. 먼저 스키마를 빌드해주세요.',
        )
      }

      const { stdout } = await execAsync(
        `cd "${this.projectRoot}" && npx prisma migrate status --schema="${schemaPath}"`,
      )

      this.log('✅ 마이그레이션 상태 확인 완료!')
      this.log(stdout)

      return { success: true, message: stdout }
    } catch (error: any) {
      // Prisma migrate status는 pending 마이그레이션이 있으면 exit code 1을 반환
      // 이 경우에도 stdout에 상태 정보가 포함되어 있음
      if (error.stdout) {
        this.log('⚠️ 적용되지 않은 마이그레이션이 있습니다.')
        this.log(error.stdout)
        return { success: false, message: error.stdout }
      }

      const errorMsg = `마이그레이션 상태 확인 실패: ${error.message}`
      this.log(`❌ ${errorMsg}`)
      return { success: false, message: errorMsg }
    }
  }

  /**
   * Prisma Studio 시작
   */
  public async startStudio(): Promise<{ success: boolean; message: string }> {
    if (!this.projectRoot) {
      return { success: false, message: '프로젝트 루트가 설정되지 않았습니다.' }
    }

    if (this.studioProcess) {
      return {
        success: false,
        message: 'Prisma Studio가 이미 실행 중입니다.',
      }
    }

    this.log('🎨 Prisma Studio 시작 중...')

    try {
      const schemaPath = this.getSchemaPath()

      if (!fs.existsSync(schemaPath)) {
        throw new Error(
          '스키마 파일이 없습니다. 먼저 스키마를 빌드해주세요.',
        )
      }

      this.studioProcess = spawn(
        'npx',
        ['prisma', 'studio', `--schema=${schemaPath}`],
        {
          cwd: this.projectRoot,
          shell: true,
        },
      )

      this.studioProcess.stdout?.on('data', (data) => {
        this.log(data.toString())
      })

      this.studioProcess.stderr?.on('data', (data) => {
        this.log(`⚠️ ${data.toString()}`)
      })

      this.studioProcess.on('close', (code) => {
        this.log(`🎨 Prisma Studio 종료 (코드: ${code})`)
        this.studioProcess = null
      })

      this.log('✅ Prisma Studio 시작 완료! (http://localhost:5555)')

      return {
        success: true,
        message: 'Prisma Studio가 시작되었습니다. (http://localhost:5555)',
      }
    } catch (error: any) {
      const errorMsg = `Prisma Studio 시작 실패: ${error.message}`
      this.log(`❌ ${errorMsg}`)
      this.studioProcess = null
      return { success: false, message: errorMsg }
    }
  }

  /**
   * Prisma Studio 중지
   */
  public async stopStudio(): Promise<{ success: boolean; message: string }> {
    if (!this.studioProcess) {
      return { success: false, message: 'Prisma Studio가 실행 중이 아닙니다.' }
    }

    this.log('🛑 Prisma Studio 중지 중...')

    try {
      this.studioProcess.kill()
      this.studioProcess = null
      this.log('✅ Prisma Studio 중지 완료!')

      return { success: true, message: 'Prisma Studio가 중지되었습니다.' }
    } catch (error: any) {
      const errorMsg = `Prisma Studio 중지 실패: ${error.message}`
      this.log(`❌ ${errorMsg}`)
      return { success: false, message: errorMsg }
    }
  }

  /**
   * Seed 데이터 삽입
   */
  public async runSeed(environment: string = 'development'): Promise<{ success: boolean; message: string }> {
    if (!this.projectRoot) {
      return { success: false, message: '프로젝트 루트가 설정되지 않았습니다.' }
    }

    this.log(`🌱 Seed 데이터 삽입 중... (환경: ${environment})`)

    // 로그 디렉토리 생성
    const logsDir = path.join(this.projectRoot, 'logs', 'seed')
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }

    // 타임스탬프 생성
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '')
    let logFilePath = ''

    try {
      // .env 파일 경로
      const envPath = path.join(this.projectRoot, '.env')
      const envDevPath = path.join(this.projectRoot, 'env.development')

      // 환경 변수 준비
      const env = {
        ...process.env,
        NODE_ENV: 'development',
      }

      // env.development 파일이 있으면 로드
      if (fs.existsSync(envDevPath)) {
        const envContent = fs.readFileSync(envDevPath, 'utf-8')
        const envVars = envContent.split('\n')
          .filter(line => line && !line.startsWith('#') && line.includes('='))
          .reduce((acc, line) => {
            const [key, ...valueParts] = line.split('=')
            const value = valueParts.join('=').replace(/^["']|["']$/g, '')
            acc[key.trim()] = value
            return acc
          }, {} as Record<string, string>)
        
        Object.assign(env, envVars)
        this.log('📝 env.development 파일 로드 완료')
      }

      // npm run을 통해 seed 실행 (environment 파라미터 전달)
      const { stdout, stderr } = await execAsync(
        `npx prisma db seed -- --environment ${environment}`,
        {
          cwd: this.projectRoot,
          timeout: 180000,
          env,
        }
      )

      this.log('✅ Seed 데이터 삽입 완료!')
      if (stdout) this.log(stdout)
      if (stderr && !stderr.includes('warning')) this.log(`⚠️ ${stderr}`)

      // 상세 로그 포함
      let resultMessage = '✅ Seed 데이터가 삽입되었습니다.\n\n'
      resultMessage += '=== 실행 로그 ===\n'
      if (stdout) {
        resultMessage += stdout + '\n'
      }
      if (stderr && !stderr.includes('warning') && !stderr.includes('ExperimentalWarning')) {
        resultMessage += '\n⚠️ 경고:\n' + stderr
      }

      // 로그 파일 저장 (성공)
      logFilePath = path.join(logsDir, `${timestamp}_success.log`)
      const logContent = `=== Seed 실행 로그 ===
시간: ${new Date().toLocaleString('ko-KR')}
상태: ✅ 성공

${resultMessage}
`
      fs.writeFileSync(logFilePath, logContent, 'utf-8')
      this.log(`📁 로그 저장됨: ${logFilePath}`)

      return {
        success: true,
        message: resultMessage.trim() + `\n\n📁 로그: ${logFilePath}`,
      }
    } catch (error: any) {
      // 에러 상세 정보 추출
      let errorDetails = error.message || '알 수 없는 에러'
      
      // stdout이 있으면 포함 (부분 실행 정보가 있을 수 있음)
      if (error.stdout) {
        errorDetails += '\n\n=== 실행 로그 ===\n' + error.stdout
      }
      
      // stderr이 있으면 포함
      if (error.stderr) {
        errorDetails += '\n\n=== 에러 로그 ===\n' + error.stderr
      }

      const errorMsg = `Seed 실행 실패\n\n${errorDetails}`
      this.log(`❌ ${errorMsg}`)

      // 로그 파일 저장 (실패)
      logFilePath = path.join(logsDir, `${timestamp}_failed.log`)
      const logContent = `=== Seed 실행 로그 ===
시간: ${new Date().toLocaleString('ko-KR')}
상태: ❌ 실패

${errorMsg}
`
      try {
        fs.writeFileSync(logFilePath, logContent, 'utf-8')
        this.log(`📁 로그 저장됨: ${logFilePath}`)
      } catch (logError) {
        this.log(`⚠️ 로그 파일 저장 실패: ${logError}`)
      }

      return { success: false, message: errorMsg + `\n\n📁 로그: ${logFilePath}` }
    }
  }

  /**
   * Seed 파일 목록 조회
   */
  public async getSeedFiles(): Promise<Array<{ name: string; path: string }>> {
    if (!this.projectRoot) {
      return []
    }

    try {
      const seedsPath = path.join(this.projectRoot, 'apps/api/prisma/seeds')

      if (!fs.existsSync(seedsPath)) {
        return []
      }

      const files = fs
        .readdirSync(seedsPath)
        .filter((file) => file.endsWith('.sql'))
        .sort()
        .map((file) => ({
          name: file,
          path: path.join(seedsPath, file),
        }))

      return files
    } catch (error) {
      console.error('Seed 파일 목록 조회 실패:', error)
      return []
    }
  }

  /**
   * Prisma 상태 조회
   */
  public async getStatus(): Promise<PrismaStatus> {
    const schemaPath = this.getSchemaPath()
    const migrationsPath = this.getMigrationsPath()

    let schemaValid = false
    let migrationsCount = 0
    let lastMigration: string | null = null

    // 스키마 파일 존재 여부
    if (fs.existsSync(schemaPath)) {
      try {
        await execAsync(
          `cd "${this.projectRoot}" && npx prisma validate --schema="${schemaPath}"`,
        )
        schemaValid = true
      } catch {
        schemaValid = false
      }
    }

    // 마이그레이션 개수 및 최신 마이그레이션
    if (fs.existsSync(migrationsPath)) {
      const migrations = fs
        .readdirSync(migrationsPath)
        .filter((item) => {
          const itemPath = path.join(migrationsPath, item)
          return fs.statSync(itemPath).isDirectory()
        })
        .sort()
        .reverse()

      migrationsCount = migrations.length
      lastMigration = migrations[0] || null
    }

    return {
      schemaValid,
      migrationsCount,
      lastMigration,
      studioRunning: this.studioProcess !== null,
    }
  }

  /**
   * 리소스 정리
   */
  public async cleanup() {
    if (this.studioProcess) {
      await this.stopStudio()
    }
  }
}

