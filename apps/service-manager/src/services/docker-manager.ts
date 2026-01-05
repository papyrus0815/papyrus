/**
 * Docker Manager
 * Docker 컨테이너 (MySQL, Nginx)를 관리하는 서비스
 */

import { exec, spawn, ChildProcess } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

export interface DockerStatus {
  isInstalled: boolean
  isRunning: boolean
  containers: {
    mysql: boolean
    nginx: boolean
  }
  images: {
    mysql: boolean
    nginx: boolean
  }
}

export class DockerManager {
  private static instance: DockerManager
  private dockerProcess: ChildProcess | null = null
  private projectRoot: string = ''

  private constructor() {}

  static getInstance(): DockerManager {
    if (!DockerManager.instance) {
      DockerManager.instance = new DockerManager()
    }
    
    return DockerManager.instance
  }

  setProjectRoot(projectRoot: string): void {
    this.projectRoot = projectRoot
  }

  /**
   * .env 파일 로드
   */
  private loadEnvFile(projectRoot: string): Record<string, string> {
    const envPath = path.join(projectRoot, 'env.development')
    const env: Record<string, string> = {}

    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8')
        const lines = content.split('\n')

        for (const line of lines) {
          // 주석과 빈 줄 무시
          if (line.trim().startsWith('#') || !line.trim()) continue

          // KEY=VALUE 형식 파싱
          const match = line.match(/^([^=]+)=(.*)$/)
          if (match) {
            const key = match[1].trim()
            let value = match[2].trim()
            // 따옴표 제거
            value = value.replace(/^["']|["']$/g, '')
            env[key] = value
          }
        }

        console.log('✅ 환경 변수 로드 완료:', envPath)
        console.log(`  NGINX_HTTP_PORT=${env.NGINX_HTTP_PORT || '80'}`)
        console.log(`  NGINX_HTTPS_PORT=${env.NGINX_HTTPS_PORT || '443'}`)
        console.log(`  MYSQL_PORT=${env.MYSQL_PORT || '3307'}`)
      }
    } catch (error: any) {
      console.warn('⚠️ 환경 변수 파일 로드 실패:', error.message)
    }

    return env
  }

  async isDockerInstalled(): Promise<boolean> {
    try {
      await execAsync('docker --version')
      
return true
    } catch (error) {
      console.error('❌ Docker가 설치되지 않았습니다:', error)
      
return false
    }
  }

  async isDockerRunning(): Promise<boolean> {
    try {
      await execAsync('docker info')
      
return true
    } catch (error) {
      return false
    }
  }

  /**
   * 특정 컨테이너가 실행 중인지 확인
   * @param containerName 정확한 컨테이너 이름 (부분 일치 아님)
   */
  async isContainerRunning(containerName: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `docker ps --filter "name=^${containerName}$" --filter "status=running" --format "{{.Names}}"`,
      )
      // 정확한 이름 일치 확인 (부분 일치 방지)
      const runningContainers = stdout.trim().split('\n').filter(n => n)
      return runningContainers.includes(containerName)
    } catch (error) {
      return false
    }
  }

  /**
   * 포트가 사용 중인지 확인
   */
  async isPortInUse(port: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`lsof -i :${port} -sTCP:LISTEN`)
      return stdout.trim().length > 0
    } catch (error) {
      // lsof가 아무것도 찾지 못하면 에러 코드 1을 반환하므로 포트가 비어있다는 의미
      return false
    }
  }

  /**
   * 포트를 사용 중인 프로세스 정보 가져오기
   */
  async getProcessUsingPort(port: number): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `lsof -i :${port} -sTCP:LISTEN | grep LISTEN | awk '{print $1, $2, $9}'`,
      )
      return stdout.trim()
    } catch (error) {
      return ''
    }
  }

  /**
   * 사용 가능한 포트 찾기
   */
  async findAvailablePort(startPort: number, maxAttempts: number = 100): Promise<number> {
    for (let port = startPort; port < startPort + maxAttempts; port++) {
      const inUse = await this.isPortInUse(port)
      if (!inUse) {
        return port
      }
    }
    throw new Error(`사용 가능한 포트를 찾을 수 없습니다 (${startPort} ~ ${startPort + maxAttempts})`)
  }

  /**
   * 환경 변수 파일 업데이트
   */
  private updateEnvFile(
    projectRoot: string,
    updates: Record<string, string>,
  ): boolean {
    const envPath = path.join(projectRoot, 'env.development')

    try {
      if (!fs.existsSync(envPath)) {
        console.error('❌ env.development 파일을 찾을 수 없습니다')
        return false
      }

      let content = fs.readFileSync(envPath, 'utf-8')
      const lines = content.split('\n')
      const updatedLines: string[] = []
      const updatedKeys = new Set<string>()

      for (const line of lines) {
        let updatedLine = line

        // KEY=VALUE 형식 찾기
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          if (updates[key]) {
            updatedLine = `${key}=${updates[key]}`
            updatedKeys.add(key)
            console.log(`  📝 ${key}: ${match[2]} → ${updates[key]}`)
          }
        }

        updatedLines.push(updatedLine)
      }

      // 새로운 키 추가 (파일에 없던 경우)
      for (const [key, value] of Object.entries(updates)) {
        if (!updatedKeys.has(key)) {
          updatedLines.push(`${key}=${value}`)
          console.log(`  ➕ ${key}=${value} 추가`)
        }
      }

      fs.writeFileSync(envPath, updatedLines.join('\n'), 'utf-8')
      console.log('✅ env.development 파일 업데이트 완료')
      return true
    } catch (error: any) {
      console.error('❌ env.development 파일 업데이트 실패:', error.message)
      return false
    }
  }

  /**
   * Docker 이미지가 로컬에 있는지 확인
   */
  async isImageAvailable(imageName: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`docker images -q ${imageName}`)
      return stdout.trim().length > 0
    } catch (error) {
      return false
    }
  }

  /**
   * Docker 이미지 다운로드
   */
  async pullImage(imageName: string): Promise<boolean> {
    try {
      console.log(`📥 Docker 이미지 다운로드 중: ${imageName}`)
      
      // 이미지 pull 실행
      const pullProcess = spawn('docker', ['pull', imageName], {
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      // 실시간 로그 출력
      pullProcess.stdout?.on('data', (data) => {
        const message = data.toString().trim()
        if (message) {
          console.log(`  ${message}`)
        }
      })

      pullProcess.stderr?.on('data', (data) => {
        const message = data.toString().trim()
        if (message && !message.includes('Pulling')) {
          console.warn(`  ⚠️ ${message}`)
        }
      })

      // 프로세스 완료 대기
      return new Promise((resolve) => {
        pullProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ 이미지 다운로드 완료: ${imageName}`)
            resolve(true)
          } else {
            console.error(`❌ 이미지 다운로드 실패: ${imageName} (code: ${code})`)
            resolve(false)
          }
        })
      })
    } catch (error: any) {
      console.error(`❌ 이미지 다운로드 오류: ${imageName}`, error.message)
      return false
    }
  }

  /**
   * 필요한 Docker 이미지 확인 및 설치
   */
  async ensureImagesAvailable(): Promise<boolean> {
    console.log('🔍 필요한 Docker 이미지 확인 중...')
    
    const requiredImages = [
      { name: 'mysql:8.0', displayName: 'MySQL 8.0' },
      { name: 'nginx:alpine', displayName: 'Nginx Alpine' },
    ]

    let allAvailable = true
    const missingImages: string[] = []

    // 모든 이미지 확인
    for (const image of requiredImages) {
      const available = await this.isImageAvailable(image.name)
      if (available) {
        console.log(`✅ ${image.displayName} 이미지 확인됨`)
      } else {
        console.log(`⚠️  ${image.displayName} 이미지 없음`)
        missingImages.push(image.name)
        allAvailable = false
      }
    }

    // 누락된 이미지 다운로드
    if (!allAvailable) {
      console.log(`\n📦 ${missingImages.length}개의 이미지 다운로드 시작...`)
      
      for (const imageName of missingImages) {
        const success = await this.pullImage(imageName)
        if (!success) {
          console.error(`❌ 필수 이미지 다운로드 실패: ${imageName}`)
          return false
        }
      }
      
      console.log('✅ 모든 필수 이미지 다운로드 완료!\n')
    } else {
      console.log('✅ 모든 필수 이미지가 준비되었습니다\n')
    }

    return true
  }

  async getStatus(): Promise<DockerStatus> {
    const isInstalled = await this.isDockerInstalled()
    const isRunning = isInstalled ? await this.isDockerRunning() : false

    let mysqlRunning = false
    let nginxRunning = false
    let mysqlImageAvailable = false
    let nginxImageAvailable = false

    if (isRunning) {
      // 정확한 컨테이너 이름으로 상태 확인
      // docker-compose.yml의 container_name과 일치해야 함
      mysqlRunning = await this.isContainerRunning('mysql')
      nginxRunning = await this.isContainerRunning('papyrus-nginx')
      
      // 이미지 확인
      mysqlImageAvailable = await this.isImageAvailable('mysql:8.0')
      nginxImageAvailable = await this.isImageAvailable('nginx:alpine')
    }

    return {
      isInstalled,
      isRunning,
      containers: {
        mysql: mysqlRunning,
        nginx: nginxRunning,
      },
      images: {
        mysql: mysqlImageAvailable,
        nginx: nginxImageAvailable,
      },
    }
  }

  async startContainers(projectRoot: string): Promise<boolean> {
    try {
      console.log('🐳 Docker 컨테이너 시작 중...')

      // 환경 변수 로드
      const env = this.loadEnvFile(projectRoot)

      // 포트 충돌 확인
      const httpPort = parseInt(env.NGINX_HTTP_PORT || '80')
      const httpsPort = parseInt(env.NGINX_HTTPS_PORT || '443')
      const mysqlPort = parseInt(env.MYSQL_PORT || '3307')

      const portsToCheck = [
        { port: httpPort, name: 'HTTP (Nginx)' },
        { port: httpsPort, name: 'HTTPS (Nginx)' },
        { port: mysqlPort, name: 'MySQL' },
      ]

      console.log('🔍 포트 충돌 확인 중...')
      const conflicts: Array<{ port: number; process: string; name: string }> = []

      for (const { port, name } of portsToCheck) {
        const inUse = await this.isPortInUse(port)
        if (inUse) {
          const process = await this.getProcessUsingPort(port)
          console.warn(`⚠️  포트 ${port} (${name}) 사용 중: ${process || '알 수 없음'}`)
          conflicts.push({ port, process, name })
        } else {
          console.log(`✅ 포트 ${port} (${name}) 사용 가능`)
        }
      }

      if (conflicts.length > 0) {
        console.error('\n❌ 포트 충돌 감지!')
        console.error('다음 포트들이 이미 사용 중입니다:\n')

        for (const conflict of conflicts) {
          console.error(`  • 포트 ${conflict.port} (${conflict.name}): ${conflict.process}`)
          
          // 프로세스별 종료 방법 안내
          const processName = conflict.process.split(' ')[0]
          if (processName === 'nginx') {
            console.error(`    종료: sudo nginx -s stop`)
          } else if (processName === 'java') {
            const pid = conflict.process.split(' ')[1]
            console.error(`    종료: kill ${pid}`)
          } else if (processName === 'mysqld') {
            console.error(`    종료: brew services stop mysql`)
          }
        }

        console.error('\n또는 env.development 파일에서 다른 포트로 변경:')
        console.error(`  NGINX_HTTP_PORT=${httpPort + 1}`)
        console.error(`  NGINX_HTTPS_PORT=${httpsPort + 1}`)
        console.error(`  MYSQL_PORT=${mysqlPort + 1}\n`)

        return false
      }

      // 먼저 필요한 이미지가 있는지 확인하고 없으면 다운로드
      const imagesReady = await this.ensureImagesAvailable()
      if (!imagesReady) {
        console.error('❌ 필수 이미지를 준비할 수 없습니다')
        return false
      }

      // docker-compose 실행 시 환경 변수 전달
      const { stdout, stderr } = await execAsync('docker-compose up -d', {
        cwd: projectRoot,
        timeout: 120000,
        env: {
          ...process.env,
          ...env, // env.development의 환경 변수 추가
        },
      })

      console.log('✅ Docker 컨테이너 시작 완료')
      if (
        stderr &&
        !stderr.includes('Creating') &&
        !stderr.includes('Starting')
      ) {
        console.warn('⚠️ Docker 경고:', stderr)
      }

      // MySQL 준비 대기
      await this.waitForMySQL(30)

      return true
    } catch (error: any) {
      console.error('❌ Docker 컨테이너 시작 실패:', error.message)

      // 포트 충돌 관련 오류인 경우 추가 안내
      if (error.message.includes('address already in use')) {
        console.error('\n💡 포트가 여전히 사용 중입니다.')
        console.error('포트를 사용 중인 프로세스를 종료하거나')
        console.error('env.development에서 다른 포트로 변경하세요.\n')
      }

      return false
    }
  }

  private async waitForMySQL(timeoutSeconds: number): Promise<void> {
    console.log('⏳ MySQL 준비 대기 중...')
    const startTime = Date.now()
    const timeout = timeoutSeconds * 1000

    while (Date.now() - startTime < timeout) {
      try {
        const { stdout } = await execAsync(
          'docker exec mysql mysqladmin ping -h localhost -u root -ppapyrus',
        )

        if (stdout.includes('mysqld is alive')) {
          console.log('✅ MySQL 준비 완료!')
          
return
        }
      } catch (error) {
        // 계속 대기
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    console.warn('⚠️ MySQL 준비 시간 초과')
  }

  async stopContainers(projectRoot: string): Promise<boolean> {
    try {
      console.log('🛑 Docker 컨테이너 중지 중...')
      const { stdout } = await execAsync('docker-compose down', {
        cwd: projectRoot,
      })
      console.log('✅ Docker 컨테이너 중지 완료')
      console.log(stdout)
      
      return true
    } catch (error: any) {
      console.error('❌ Docker 컨테이너 중지 실패:', error.message)
      
      return false
    }
  }

  async startDockerDesktop(): Promise<void> {
    try {
      console.log('🐳 Docker Desktop 실행 중...')

      if (process.platform === 'win32') {
        spawn(
          'cmd',
          [
            '/c',
            'start',
            '',
            'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
          ],
          {
            detached: true,
            stdio: 'ignore',
          },
        )
      } else if (process.platform === 'darwin') {
        spawn('open', ['-a', 'Docker'], { detached: true, stdio: 'ignore' })
      } else {
        spawn('systemctl', ['start', 'docker'], {
          detached: true,
          stdio: 'ignore',
        })
      }

      console.log('⏳ Docker Desktop 시작 대기 중...')
      let attempts = 0
      const maxAttempts = 30

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const isRunning = await this.isDockerRunning()

        if (isRunning) {
          console.log('✅ Docker Desktop 실행 완료!')
          
return
        }

        attempts++
      }

      console.warn('⚠️ Docker Desktop 시작 시간 초과')
    } catch (error: any) {
      console.error('❌ Docker Desktop 실행 실패:', error.message)
    }
  }

  async getContainerLogs(
    containerName: string,
    lines: number = 50,
  ): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `docker logs --tail ${lines} ${containerName}`,
      )
      return stdout
    } catch (error: any) {
      return `로그 가져오기 실패: ${error.message}`
    }
  }

  /**
   * Docker Desktop 시작 (주 entry point)
   * 프로젝트 루트를 제공하면 컨테이너도 자동으로 시작합니다.
   */
  async startDocker(projectRoot?: string): Promise<boolean> {
    try {
      const isRunning = await this.isDockerRunning()
      if (isRunning) {
        console.log('ℹ️ Docker Desktop이 이미 실행 중입니다')
        
        // Docker가 이미 실행 중이면 컨테이너만 확인하고 필요시 시작
        if (projectRoot) {
          const mysqlRunning = await this.isContainerRunning('mysql')
          if (!mysqlRunning) {
            console.log('🐳 Docker 컨테이너 시작 중...')
            await this.startContainers(projectRoot)
          }
        }
        
        return true
      }
      
      // Docker Desktop 시작
      await this.startDockerDesktop()
      const dockerStarted = await this.isDockerRunning()
      
      if (!dockerStarted) {
        return false
      }
      
      // Docker Desktop이 시작되면 컨테이너도 시작
      if (projectRoot) {
        console.log('🐳 Docker 컨테이너 시작 중...')
        await this.startContainers(projectRoot)
      }
      
      return true
    } catch (error: any) {
      console.error('❌ Docker Desktop 시작 실패:', error.message)
      
      return false
    }
  }

  /**
   * Docker 컨테이너 중지 (주 entry point)
   * 
   * 참고: Docker Desktop 자체는 중지하지 않습니다.
   *       다른 프로젝트에서 Docker를 사용할 수 있도록 Desktop은 계속 실행됩니다.
   */
  async stopDocker(): Promise<boolean> {
    try {
      console.log('🛑 Docker 컨테이너 중지 중...')
      
      // Papyrus 프로젝트의 컨테이너만 중지
      if (this.projectRoot) {
        await this.stopContainers(this.projectRoot)
        console.log('✅ Papyrus Docker 컨테이너 중지 완료')
      } else {
        console.warn('⚠️ 프로젝트 루트가 설정되지 않아 컨테이너를 중지할 수 없습니다')
        return false
      }
      
      // Docker Desktop은 수동으로 종료하도록 안내
      console.log('ℹ️  Docker Desktop은 계속 실행됩니다 (다른 프로젝트에서 사용 가능)')
      
      return true
    } catch (error: any) {
      console.error('❌ Docker 컨테이너 중지 실패:', error.message)
      
      return false
    }
  }

  /**
   * Docker 완전 초기화 (컨테이너 + 이미지 + 볼륨 삭제)
   * 
   * ⚠️ 경고: 이 작업은 모든 Docker 데이터를 삭제합니다.
   * - Papyrus 프로젝트의 모든 컨테이너 중지 및 삭제
   * - Papyrus 프로젝트의 모든 이미지 삭제
   * - Papyrus 프로젝트의 모든 볼륨 삭제 (데이터베이스 데이터 포함)
   */
  async resetDocker(): Promise<{ success: boolean; message: string }> {
    if (!this.projectRoot) {
      return {
        success: false,
        message: '프로젝트 루트가 설정되지 않았습니다.'
      }
    }

    try {
      console.log('🗑️  Docker 완전 초기화 시작...')
      let log = '=== Docker 초기화 로그 ===\n\n'

      // 1. 컨테이너 중지 및 삭제
      console.log('1️⃣ 컨테이너 중지 및 삭제...')
      try {
        await execAsync('docker-compose down', { cwd: this.projectRoot })
        log += '✅ 컨테이너 중지 및 삭제 완료\n'
        console.log('✅ 컨테이너 삭제 완료')
      } catch (error: any) {
        log += `⚠️ 컨테이너 삭제 오류: ${error.message}\n`
        console.log('⚠️ 컨테이너 삭제 오류 (무시)')
      }

      // 2. 볼륨 삭제 (데이터베이스 데이터 포함)
      console.log('2️⃣ 볼륨 삭제 중...')
      try {
        const { stdout } = await execAsync('docker volume ls -q', { cwd: this.projectRoot })
        const volumes = stdout.trim().split('\n').filter(v => v.includes('papyrus'))
        
        for (const volume of volumes) {
          try {
            await execAsync(`docker volume rm ${volume}`)
            log += `✅ 볼륨 삭제: ${volume}\n`
            console.log(`  ✅ ${volume}`)
          } catch (error: any) {
            log += `⚠️ 볼륨 삭제 실패: ${volume} - ${error.message}\n`
          }
        }
        
        console.log('✅ 볼륨 삭제 완료')
      } catch (error: any) {
        log += `⚠️ 볼륨 삭제 오류: ${error.message}\n`
        console.log('⚠️ 볼륨 삭제 오류 (무시)')
      }

      // 3. 이미지 삭제
      console.log('3️⃣ 이미지 삭제 중...')
      try {
        // MySQL 이미지 삭제
        try {
          await execAsync('docker rmi mysql:8.0', { cwd: this.projectRoot })
          log += '✅ 이미지 삭제: mysql:8.0\n'
        } catch {}

        // Nginx 이미지 삭제
        try {
          await execAsync('docker rmi nginx:alpine', { cwd: this.projectRoot })
          log += '✅ 이미지 삭제: nginx:alpine\n'
        } catch {}

        console.log('✅ 이미지 삭제 완료')
      } catch (error: any) {
        log += `⚠️ 이미지 삭제 오류: ${error.message}\n`
        console.log('⚠️ 이미지 삭제 오류 (무시)')
      }

      // 4. 네트워크 정리
      console.log('4️⃣ 네트워크 정리 중...')
      try {
        await execAsync('docker network prune -f', { cwd: this.projectRoot })
        log += '✅ 네트워크 정리 완료\n'
        console.log('✅ 네트워크 정리 완료')
      } catch (error: any) {
        log += `⚠️ 네트워크 정리 오류: ${error.message}\n`
      }

      console.log('✅ Docker 완전 초기화 완료!')
      log += '\n✅ Docker 완전 초기화 완료!\n'
      log += '\n💡 다음 단계: Docker 시작 버튼을 눌러 새로운 환경을 구성하세요.'

      return {
        success: true,
        message: log
      }
    } catch (error: any) {
      const errorMsg = `Docker 초기화 실패: ${error.message}`
      console.error('❌', errorMsg)
      return {
        success: false,
        message: errorMsg
      }
    }
  }
}

