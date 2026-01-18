/**
 * NX Manager - NX 프로젝트 및 설정 파일 관리
 */
import { exec } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

export class NxManager {
  private static instance: NxManager
  private workspaceRoot: string

  private constructor() {
    // 빌드된 경로: dist/services/nx-manager.js
    // 워크스페이스 루트 찾기: dist -> service-manager -> apps -> root
    let currentPath = __dirname
    
    // dist 폴더에서 실행 중인 경우 (프로덕션)
    if (currentPath.includes('/dist/')) {
      // dist/services -> dist -> service-manager -> apps -> root
      this.workspaceRoot = path.resolve(__dirname, '../../../..')
    } else {
      // src/services에서 실행 중인 경우 (개발)
      this.workspaceRoot = path.resolve(__dirname, '../../..')
    }
    
    console.log(`📂 NX Workspace Root: ${this.workspaceRoot}`)
    console.log(`📂 Current __dirname: ${__dirname}`)
  }

  public static getInstance(): NxManager {
    if (!NxManager.instance) {
      NxManager.instance = new NxManager()
    }
    return NxManager.instance
  }

  /**
   * NX 프로젝트 목록 가져오기
   */
  public async getProjects(): Promise<
    Array<{
      name: string
      root: string
      type: 'application' | 'library'
      hasProjectJson: boolean
      hasNestiaConfig: boolean
    }>
  > {
    try {
      console.log('🔍 NX 프로젝트 스캔 시작...')
      console.log(`📂 워크스페이스 경로: ${this.workspaceRoot}`)

      const projects: Array<{
        name: string
        root: string
        type: 'application' | 'library'
        hasProjectJson: boolean
        hasNestiaConfig: boolean
      }> = []

      // apps 폴더 스캔
      const appsDir = path.join(this.workspaceRoot, 'apps')
      console.log(`📁 Apps 폴더 확인: ${appsDir}`)
      console.log(`📁 Apps 폴더 존재: ${fs.existsSync(appsDir)}`)

      if (fs.existsSync(appsDir)) {
        const appFolders = fs.readdirSync(appsDir)
        console.log(`📁 발견된 앱 폴더: ${appFolders.join(', ')}`)

        for (const folder of appFolders) {
          const projectRoot = path.join('apps', folder)
          const projectJsonPath = path.join(
            this.workspaceRoot,
            projectRoot,
            'project.json',
          )
          const nestiaConfigPath = path.join(
            this.workspaceRoot,
            projectRoot,
            'nestia.config.ts',
          )

          console.log(`  🔍 ${folder}: project.json ${fs.existsSync(projectJsonPath) ? '✅' : '❌'}`)

          if (fs.existsSync(projectJsonPath)) {
            projects.push({
              name: folder,
              root: projectRoot,
              type: 'application',
              hasProjectJson: true,
              hasNestiaConfig: fs.existsSync(nestiaConfigPath),
            })
          }
        }
      }

      // libs 폴더 스캔
      const libsDir = path.join(this.workspaceRoot, 'libs')
      console.log(`📁 Libs 폴더 확인: ${libsDir}`)
      console.log(`📁 Libs 폴더 존재: ${fs.existsSync(libsDir)}`)

      if (fs.existsSync(libsDir)) {
        const libFolders = fs.readdirSync(libsDir)
        console.log(`📁 발견된 라이브러리 폴더: ${libFolders.join(', ')}`)

        for (const folder of libFolders) {
          const projectRoot = path.join('libs', folder)
          const projectJsonPath = path.join(
            this.workspaceRoot,
            projectRoot,
            'project.json',
          )

          console.log(`  🔍 ${folder}: project.json ${fs.existsSync(projectJsonPath) ? '✅' : '❌'}`)

          if (fs.existsSync(projectJsonPath)) {
            projects.push({
              name: folder,
              root: projectRoot,
              type: 'library',
              hasProjectJson: true,
              hasNestiaConfig: false,
            })
          }
        }
      }

      console.log(`✅ 발견된 프로젝트: ${projects.length}개`)
      console.log(`📋 프로젝트 목록:`, projects.map(p => p.name).join(', '))
      return projects
    } catch (error: any) {
      console.error('❌ NX 프로젝트 목록 조회 실패:', error)
      console.error('❌ 에러 상세:', error.stack)
      throw error
    }
  }

  /**
   * project.json 읽기
   */
  public async readProjectJson(projectRoot: string): Promise<any> {
    try {
      const filePath = path.join(this.workspaceRoot, projectRoot, 'project.json')
      const content = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(content)
    } catch (error: any) {
      console.error(`❌ project.json 읽기 실패 (${projectRoot}):`, error)
      throw error
    }
  }

  /**
   * project.json 저장
   */
  public async saveProjectJson(
    projectName: string,
    content: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 프로젝트 찾기
      const projects = await this.getProjects()
      const project = projects.find((p) => p.name === projectName)
      if (!project) {
        throw new Error(`프로젝트를 찾을 수 없습니다: ${projectName}`)
      }

      const filePath = path.join(this.workspaceRoot, project.root, 'project.json')

      // 백업 생성
      const backupPath = `${filePath}.backup`
      fs.copyFileSync(filePath, backupPath)
      console.log(`📦 백업 생성: ${backupPath}`)

      // 파일 저장
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8')
      console.log(`✅ project.json 저장 완료: ${filePath}`)

      return {
        success: true,
        message: `project.json이 저장되었습니다.\n백업: ${backupPath}`,
      }
    } catch (error: any) {
      console.error(`❌ project.json 저장 실패:`, error)
      return {
        success: false,
        message: error.message,
      }
    }
  }

  /**
   * project.json 백업 복원
   */
  public async restoreProjectJsonBackup(
    projectName: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const projects = await this.getProjects()
      const project = projects.find((p) => p.name === projectName)
      if (!project) {
        throw new Error(`프로젝트를 찾을 수 없습니다: ${projectName}`)
      }

      const filePath = path.join(this.workspaceRoot, project.root, 'project.json')
      const backupPath = `${filePath}.backup`

      if (!fs.existsSync(backupPath)) {
        throw new Error('백업 파일이 존재하지 않습니다.')
      }

      fs.copyFileSync(backupPath, filePath)
      console.log(`✅ project.json 백업 복원 완료: ${filePath}`)

      return {
        success: true,
        message: 'project.json이 백업 파일로 복원되었습니다.',
      }
    } catch (error: any) {
      console.error(`❌ project.json 백업 복원 실패:`, error)
      return {
        success: false,
        message: error.message,
      }
    }
  }

  /**
   * nestia.config.ts 읽기
   */
  public async readNestiaConfig(projectRoot: string): Promise<string> {
    try {
      const filePath = path.join(
        this.workspaceRoot,
        projectRoot,
        'nestia.config.ts',
      )
      return fs.readFileSync(filePath, 'utf-8')
    } catch (error: any) {
      console.error(`❌ nestia.config.ts 읽기 실패 (${projectRoot}):`, error)
      throw error
    }
  }

  /**
   * nestia.config.ts 저장
   */
  public async saveNestiaConfig(
    projectName: string,
    content: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const projects = await this.getProjects()
      const project = projects.find((p) => p.name === projectName)
      if (!project) {
        throw new Error(`프로젝트를 찾을 수 없습니다: ${projectName}`)
      }

      const filePath = path.join(
        this.workspaceRoot,
        project.root,
        'nestia.config.ts',
      )

      // 백업 생성
      const backupPath = `${filePath}.backup`
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupPath)
        console.log(`📦 백업 생성: ${backupPath}`)
      }

      // 파일 저장
      fs.writeFileSync(filePath, content, 'utf-8')
      console.log(`✅ nestia.config.ts 저장 완료: ${filePath}`)

      return {
        success: true,
        message: `nestia.config.ts가 저장되었습니다.\n백업: ${backupPath}`,
      }
    } catch (error: any) {
      console.error(`❌ nestia.config.ts 저장 실패:`, error)
      return {
        success: false,
        message: error.message,
      }
    }
  }

  /**
   * nestia.config.ts 백업 복원
   */
  public async restoreNestiaConfigBackup(
    projectName: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const projects = await this.getProjects()
      const project = projects.find((p) => p.name === projectName)
      if (!project) {
        throw new Error(`프로젝트를 찾을 수 없습니다: ${projectName}`)
      }

      const filePath = path.join(
        this.workspaceRoot,
        project.root,
        'nestia.config.ts',
      )
      const backupPath = `${filePath}.backup`

      if (!fs.existsSync(backupPath)) {
        throw new Error('백업 파일이 존재하지 않습니다.')
      }

      fs.copyFileSync(backupPath, filePath)
      console.log(`✅ nestia.config.ts 백업 복원 완료: ${filePath}`)

      return {
        success: true,
        message: 'nestia.config.ts가 백업 파일로 복원되었습니다.',
      }
    } catch (error: any) {
      console.error(`❌ nestia.config.ts 백업 복원 실패:`, error)
      return {
        success: false,
        message: error.message,
      }
    }
  }

  /**
   * nx.json 읽기
   */
  public async readNxJson(): Promise<any> {
    try {
      const filePath = path.join(this.workspaceRoot, 'nx.json')
      const content = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(content)
    } catch (error: any) {
      console.error('❌ nx.json 읽기 실패:', error)
      throw error
    }
  }

  /**
   * nx.json 저장
   */
  public async saveNxJson(
    content: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const filePath = path.join(this.workspaceRoot, 'nx.json')

      // 백업 생성
      const backupPath = `${filePath}.backup`
      fs.copyFileSync(filePath, backupPath)
      console.log(`📦 백업 생성: ${backupPath}`)

      // 파일 저장
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8')
      console.log(`✅ nx.json 저장 완료: ${filePath}`)

      return {
        success: true,
        message: `nx.json이 저장되었습니다.\n백업: ${backupPath}`,
      }
    } catch (error: any) {
      console.error('❌ nx.json 저장 실패:', error)
      return {
        success: false,
        message: error.message,
      }
    }
  }

  /**
   * nx.json 백업 복원
   */
  public async restoreNxJsonBackup(): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const filePath = path.join(this.workspaceRoot, 'nx.json')
      const backupPath = `${filePath}.backup`

      if (!fs.existsSync(backupPath)) {
        throw new Error('백업 파일이 존재하지 않습니다.')
      }

      fs.copyFileSync(backupPath, filePath)
      console.log(`✅ nx.json 백업 복원 완료: ${filePath}`)

      return {
        success: true,
        message: 'nx.json이 백업 파일로 복원되었습니다.',
      }
    } catch (error: any) {
      console.error('❌ nx.json 백업 복원 실패:', error)
      return {
        success: false,
        message: error.message,
      }
    }
  }
}
