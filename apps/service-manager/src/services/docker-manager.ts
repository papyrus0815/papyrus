/**
 * Docker Manager
 * Docker 컨테이너 (MySQL, Nginx)를 관리하는 서비스
 */

import { exec, spawn, ChildProcess } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface DockerStatus {
  isInstalled: boolean
  isRunning: boolean
  containers: {
    mysql: boolean
    nginx: boolean
  }
}

export class DockerManager {
  private static instance: DockerManager
  private dockerProcess: ChildProcess | null = null

  private constructor() {}

  static getInstance(): DockerManager {
    if (!DockerManager.instance) {
      DockerManager.instance = new DockerManager()
    }
    
return DockerManager.instance
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

  async isContainerRunning(containerName: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `docker ps --filter "name=${containerName}" --filter "status=running" --format "{{.Names}}"`,
      )
      return stdout.trim().includes(containerName)
    } catch (error) {
      return false
    }
  }

  async getStatus(): Promise<DockerStatus> {
    const isInstalled = await this.isDockerInstalled()
    const isRunning = isInstalled ? await this.isDockerRunning() : false

    let mysqlRunning = false
    let nginxRunning = false

    if (isRunning) {
      mysqlRunning = await this.isContainerRunning('mysql')
      nginxRunning = await this.isContainerRunning('evolution-nginx')
    }

    return {
      isInstalled,
      isRunning,
      containers: {
        mysql: mysqlRunning,
        nginx: nginxRunning,
      },
    }
  }

  async startContainers(projectRoot: string): Promise<boolean> {
    try {
      console.log('🐳 Docker 컨테이너 시작 중...')

      const { stdout, stderr } = await execAsync('docker-compose up -d', {
        cwd: projectRoot,
        timeout: 120000,
      })

      console.log('✅ Docker 컨테이너 시작 완료')
      if (
        stderr &&
        !stderr.includes('Creating') &&
        !stderr.includes('Starting')
      ) {
        console.warn('⚠️ Docker 경고:', stderr)
      }

      await this.waitForMySQL(30)
      
return true
    } catch (error: any) {
      console.error('❌ Docker 컨테이너 시작 실패:', error.message)
      
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
          'docker exec mysql mysqladmin ping -h localhost -u root -pevolution',
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
   * Docker Desktop 중지 (주 entry point)
   */
  async stopDocker(): Promise<boolean> {
    try {
      console.log('🛑 Docker Desktop 중지 중...')
      // Docker Desktop은 수동으로 종료하도록 안내
      console.warn('⚠️ Docker Desktop은 수동으로 종료해야 합니다')
      
return true
    } catch (error: any) {
      console.error('❌ Docker Desktop 중지 실패:', error.message)
      
return false
    }
  }
}
