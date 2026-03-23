/**
 * Papyrus Service Manager - Main Process
 * 독립 실행형 서비스 관리 도구
 */
import {
  BrowserWindow,
  Menu,
  Tray,
  app,
  dialog,
  ipcMain,
  nativeImage,
} from 'electron'
import * as fs from 'fs'
import * as path from 'path'

import { NxManager } from './services/nx-manager'
import { PrismaManager } from './services/prisma-manager'
import { ServiceManager } from './services/service-manager'

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let isQuitting = false
const serviceManager = ServiceManager.getInstance()
const prismaManager = PrismaManager.getInstance()
const nxManager = NxManager.getInstance()

// 원본 console.log 저장
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

// console.log를 가로채서 GUI로 전송
console.log = function (...args: any[]) {
  const message = args.map((arg) => String(arg)).join(' ')
  originalConsoleLog.apply(console, args)

  // GUI 창이 있고 준비되었을 때만 전송
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    try {
      mainWindow.webContents.send('console:log', message)
    } catch (err) {
      // 전송 실패는 무시 (창이 아직 준비되지 않았을 수 있음)
    }
  }
}

console.error = function (...args: any[]) {
  const message = args.map((arg) => String(arg)).join(' ')
  originalConsoleError.apply(console, args)

  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    try {
      mainWindow.webContents.send('console:log', `❌ ${message}`)
    } catch (err) {
      // 전송 실패는 무시
    }
  }
}

console.warn = function (...args: any[]) {
  const message = args.map((arg) => String(arg)).join(' ')
  originalConsoleWarn.apply(console, args)

  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    try {
      mainWindow.webContents.send('console:log', `⚠️ ${message}`)
    } catch (err) {
      // 전송 실패는 무시
    }
  }
}

// GUI 창 생성
function createWindow() {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()

    return
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    minWidth: 1200,
    minHeight: 700,
    title: 'Papyrus Service Manager',
    icon: nativeImage.createEmpty(),
    show: true, // 창을 즉시 표시
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // HTML 파일 로드
  // TypeScript로 변환되었으므로 개발/프로덕션 모두 dist/renderer/index.html 사용
  // (개발 모드에서도 TypeScript 컴파일이 필요함)
  const htmlPath = path.join(__dirname, 'renderer', 'index.html')

  // dist/renderer/index.html이 없으면 빌드 필요
  if (!fs.existsSync(htmlPath)) {
    console.error(
      '❌ dist/renderer/index.html이 없습니다. 빌드를 실행하세요: npm run build',
    )
    console.error('   또는 개발 모드: npm run dev (자동으로 빌드 후 실행)')
  }

  console.log(`📄 Loading HTML from: ${htmlPath}`)
  mainWindow.loadFile(htmlPath)

  // 개발 모드에서는 DevTools 자동 열기
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  // 창 닫기 이벤트 (트레이로 숨김)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 시스템 트레이 생성
function createTray() {
  // 간단한 텍스트 기반 아이콘 생성
  let icon: Electron.NativeImage | null = null

  try {
    // 여러 경로에서 아이콘 찾기 (실행 환경에 따라 경로가 다름)
    const possiblePaths = [
      path.join(__dirname, 'resources', 'icon.png'), // dist/resources/icon.png
      path.join(__dirname, '..', 'assets', 'icon.png'), // assets/icon.png (dist 상위)
      path.join(process.cwd(), 'assets', 'icon.png'), // cwd/assets/icon.png
      path.join(process.cwd(), 'dist', 'resources', 'icon.png'), // cwd/dist/resources/icon.png
    ]

    let loadedPath: string | null = null
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const testIcon = nativeImage.createFromPath(p)
        if (!testIcon.isEmpty()) {
          icon = testIcon
          loadedPath = p
          break
        }
      }
    }

    if (loadedPath) {
      console.log(`📁 아이콘 로드 성공: ${loadedPath}`)
    } else {
      throw new Error('아이콘 파일을 찾을 수 없음')
    }
  } catch (error) {
    console.log(`⚠️  PNG 아이콘 로드 실패, 텍스트 기반 아이콘 사용: ${error}`)
  }

  if (!icon || icon.isEmpty()) {
    // 최후의 수단: 간단한 텍스트 기반 아이콘
    // macOS 메뉴바용 16x16 템플릿 이미지 (흑백 원)
    const size = 22
    const canvas = {
      width: size,
      height: size,
      data: Buffer.alloc(size * size * 4),
    }

    // 중앙에 작은 원 그리기
    const centerX = size / 2
    const centerY = size / 2
    const radius = 4

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX
        const dy = y - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)

        const idx = (y * size + x) * 4
        if (distance <= radius) {
          // 원 안쪽 - 흰색
          canvas.data[idx] = 0
          canvas.data[idx + 1] = 0
          canvas.data[idx + 2] = 0
          canvas.data[idx + 3] = 255
        } else {
          // 원 바깥 - 투명
          canvas.data[idx] = 0
          canvas.data[idx + 1] = 0
          canvas.data[idx + 2] = 0
          canvas.data[idx + 3] = 0
        }
      }
    }

    icon = nativeImage.createFromBuffer(canvas.data, {
      width: size,
      height: size,
    })
  }

  tray = new Tray(icon)
  tray.setToolTip('Papyrus Service Manager')

  // macOS 메뉴바에 잘 보이도록 템플릿 이미지로 설정
  if (icon && !icon.isEmpty()) {
    icon.setTemplateImage(true)
  }

  // 트레이 아이콘 클릭 시 창 열기
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })

  console.log('✅ 트레이 아이콘 생성 완료')

  updateTrayMenu()

  // 1.5초마다 상태 업데이트 (더 빠른 반응)
  setInterval(() => {
    updateTrayMenu()
  }, 1500)
}

// 트레이 메뉴 업데이트
async function updateTrayMenu() {
  if (!tray) return

  try {
    const status = await serviceManager.getStatus()

    const allReady = status.allReady ? '✅' : '⚠️'
    const dockerStatus = status.docker.isRunning ? '✅' : '❌'
    const mysqlStatus = status.docker.containers.mysql ? '✅' : '❌'
    const nginxStatus = status.docker.containers.nginx ? '✅' : '❌'
    const webAdminStatus = status.papyrusServer.webAdminServer.isRunning
      ? '✅'
      : '❌'
    const apiStatus = status.papyrusServer.apiServer.isRunning ? '✅' : '❌'

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Papyrus Service Manager ${allReady}`,
        type: 'normal',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: '📊 GUI 열기',
        type: 'normal',
        click: () => {
          if (mainWindow) {
            mainWindow.show()
            mainWindow.focus()
          } else {
            createWindow()
          }
        },
      },
      { type: 'separator' },
      {
        label: '🐳 기본 서비스',
        type: 'normal',
        enabled: false,
      },
      {
        label: `  ${dockerStatus} Docker Desktop`,
        type: 'normal',
        enabled: false,
      },
      {
        label: `  ${mysqlStatus} MySQL Database`,
        type: 'normal',
        enabled: false,
      },
      {
        label: `  ${nginxStatus} Nginx Server`,
        type: 'normal',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: '🎮 Papyrus (Civilization)',
        type: 'normal',
        enabled: false,
      },
      {
        label: `  ${webAdminStatus} 관리자 웹 (포트: 3000)`,
        type: 'normal',
        click: () => {
          if (status.papyrusServer.webAdminServer.isRunning) {
            require('electron').shell.openExternal('http://localhost:3000')
          }
        },
      },
      {
        label: `  ${apiStatus} API 서버 (포트: 8000)`,
        type: 'normal',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: '🚀 모두 시작',
        type: 'normal',
        enabled: !status.allReady,
        click: async () => {
          const result = await serviceManager.startAll()
          if (result) {
            dialog.showMessageBox({
              type: 'info',
              title: 'Papyrus Service Manager',
              message: '모든 서비스가 시작되었습니다!',
              buttons: ['확인'],
            })
          } else {
            dialog.showMessageBox({
              type: 'error',
              title: 'Papyrus Service Manager',
              message: '서비스 시작에 실패했습니다',
              buttons: ['확인'],
            })
          }
          updateTrayMenu()
        },
      },
      {
        label: '🛑 모두 중지',
        type: 'normal',
        enabled:
          status.papyrusServer.apiServer.isRunning ||
          status.papyrusServer.webAdminServer.isRunning,
        click: async () => {
          await serviceManager.stopAll()
          updateTrayMenu()
        },
      },
      {
        label: '🔄 모두 재시작',
        type: 'normal',
        enabled: status.allReady,
        click: async () => {
          await serviceManager.restart()
          updateTrayMenu()
        },
      },
      { type: 'separator' },
      {
        label: '🗄️ 데이터베이스',
        type: 'submenu',
        submenu: [
          {
            label: '🔄 마이그레이션 실행',
            click: async () => {
              console.log('🔄 데이터베이스 마이그레이션 시작...')
              const result = await serviceManager.runMigration()
              if (result) {
                dialog.showMessageBox({
                  type: 'info',
                  title: '마이그레이션 완료',
                  message: '데이터베이스 마이그레이션이 완료되었습니다!',
                  detail: '스키마 변경사항이 데이터베이스에 적용되었습니다.',
                  buttons: ['확인'],
                })
              } else {
                dialog.showMessageBox({
                  type: 'error',
                  title: '마이그레이션 실패',
                  message: '마이그레이션에 실패했습니다',
                  detail: '콘솔 로그를 확인하세요.',
                  buttons: ['확인'],
                })
              }
            },
          },
          {
            label: '🌱 Seed 데이터 실행',
            click: async () => {
              console.log('🌱 Seed 데이터 실행 시작...')
              const result = await serviceManager.runSeed()
              if (result) {
                dialog.showMessageBox({
                  type: 'info',
                  title: 'Seed 완료',
                  message: 'Seed 데이터가 성공적으로 생성되었습니다!',
                  detail: '기본 히어로 및 관리자 계정이 생성되었습니다.',
                  buttons: ['확인'],
                })
              } else {
                dialog.showMessageBox({
                  type: 'error',
                  title: 'Seed 실패',
                  message: 'Seed 실행에 실패했습니다',
                  detail: '콘솔 로그를 확인하세요.',
                  buttons: ['확인'],
                })
              }
            },
          },
          {
            label: '🎨 Prisma Studio 열기',
            click: async () => {
              await serviceManager.openPrismaStudio()
              dialog.showMessageBox({
                type: 'info',
                title: 'Prisma Studio',
                message: 'Prisma Studio가 실행되었습니다!',
                detail:
                  '브라우저에서 http://localhost:5555로 접속하세요.\n\n데이터베이스를 GUI로 관리할 수 있습니다.',
                buttons: ['확인'],
              })
            },
          },
        ],
      },
      { type: 'separator' },
      {
        label: '🏗️ API 빌드',
        type: 'normal',
        click: async () => {
          console.log('🏗️ API 서버 빌드 시작...')
          const result = await serviceManager.papyrusServerManager.buildApi()
          if (result) {
            dialog.showMessageBox({
              type: 'info',
              title: 'API 빌드 완료',
              message: 'API 서버가 성공적으로 빌드되었습니다!',
              detail:
                'dist/apps/api 폴더에서 빌드된 파일을 확인하세요.\n이제 API 서버를 재시작하면 새로운 코드가 적용됩니다.',
              buttons: ['확인'],
            })
          } else {
            dialog.showMessageBox({
              type: 'error',
              title: 'API 빌드 실패',
              message: 'API 빌드에 실패했습니다',
              detail: '콘솔 로그를 확인하세요.',
              buttons: ['확인'],
            })
          }
        },
      },
      {
        label: '🔨 SDK 빌드',
        type: 'normal',
        click: async () => {
          console.log('🔨 Nestia SDK 빌드 시작...')
          const result =
            await serviceManager.papyrusServerManager.buildNestiaSdk()
          if (result) {
            dialog.showMessageBox({
              type: 'info',
              title: 'SDK 빌드 완료',
              message: 'Nestia SDK가 성공적으로 빌드되었습니다!',
              detail:
                'apps/api/src/api/functional 폴더에서 생성된 SDK를 확인하세요.',
              buttons: ['확인'],
            })
          } else {
            dialog.showMessageBox({
              type: 'error',
              title: 'SDK 빌드 실패',
              message: 'SDK 빌드에 실패했습니다',
              detail: '콘솔 로그를 확인하세요.',
              buttons: ['확인'],
            })
          }
        },
      },
      { type: 'separator' },
      {
        label: '⚙️ 설정',
        type: 'submenu',
        submenu: [
          {
            label: '프로젝트 경로 설정',
            click: async () => {
              const result = await dialog.showOpenDialog({
                properties: ['openDirectory'],
                title: 'Papyrus 프로젝트 폴더 선택',
                defaultPath: '/Users/yendoo/dev/papyrus',
              })

              if (!result.canceled && result.filePaths.length > 0) {
                serviceManager.setProjectRoot(result.filePaths[0])
                dialog.showMessageBox({
                  type: 'info',
                  title: '설정 완료',
                  message: `프로젝트 경로가 설정되었습니다:\n${result.filePaths[0]}`,
                  buttons: ['확인'],
                })
              }
            },
          },
          {
            label: '시작 프로그램에 등록',
            click: () => {
              app.setLoginItemSettings({
                openAtLogin: true,
              })
              dialog.showMessageBox({
                type: 'info',
                title: '설정 완료',
                message: '시작 프로그램에 등록되었습니다',
                buttons: ['확인'],
              })
            },
          },
        ],
      },
      {
        label: 'ℹ️ 정보',
        type: 'normal',
        click: () => {
          dialog.showMessageBox({
            type: 'info',
            title: 'Papyrus Service Manager',
            message: 'Papyrus Service Manager v1.1.0',
            detail:
              'Papyrus (Civilization) 게임 서버를 관리하는 독립 도구\n\n' +
              '✨ v1.1.0 업데이트:\n' +
              '- 🗄️ 데이터베이스 마이그레이션 & Seed 기능 추가\n' +
              '- 🎨 Prisma Studio 통합 (GUI DB 관리)\n' +
              '- 🎨 더욱 심플하고 트렌디한 UI 디자인\n\n' +
              'v1.0.1 특징:\n' +
              '- 트렌디한 UI 디자인\n' +
              '- 키보드 단축키 지원 (Ctrl+R, Ctrl+L, Ctrl+1~5)\n' +
              '- 향상된 사용자 경험\n\n' +
              '주요 기능:\n' +
              '- Docker 컨테이너 관리\n' +
              '- API & 웹 서버 관리\n' +
              '- 실시간 로그 분류\n' +
              '- 데이터베이스 관리 (마이그레이션, Seed, Studio)\n\n' +
              '개발: Papyrus Team',
            buttons: ['확인'],
          })
        },
      },
      { type: 'separator' },
      {
        label: '❌ 종료',
        type: 'normal',
        click: () => {
          app.quit()
        },
      },
    ])

    tray.setContextMenu(contextMenu)

    // 툴팁 업데이트
    const tooltip = status.allReady
      ? 'Papyrus - 모든 서비스 정상'
      : 'Papyrus - 일부 서비스 중지됨'
    tray.setToolTip(tooltip)
  } catch (error) {
    console.error('❌ 트레이 메뉴 업데이트 실패:', error)
  }
}

// IPC 핸들러 등록
function registerIpcHandlers() {
  // 상태 조회
  ipcMain.handle('service:getStatus', async () => {
    return await serviceManager.getStatus()
  })

  // 전체 제어
  ipcMain.handle('service:startAll', async () => {
    return await serviceManager.startAll()
  })

  ipcMain.handle('service:stopAll', async () => {
    return await serviceManager.stopAll()
  })

  ipcMain.handle('service:restart', async () => {
    return await serviceManager.restart()
  })

  // Docker 제어
  ipcMain.handle('service:startDocker', async () => {
    const projectRoot =
      serviceManager['projectRoot'] || '/Users/yendoo/dev/papyrus'
    console.log(`🐳 [IPC] Docker 시작 요청 (프로젝트 경로: ${projectRoot})`)
    const result = await serviceManager.dockerManager.startDocker(projectRoot)
    // Docker 시작 후 상태 업데이트
    setTimeout(() => {
      updateTrayMenu()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('service:status-update')
      }
    }, 2000)
    return result
  })

  ipcMain.handle('service:stopDocker', async () => {
    const result = await serviceManager.dockerManager.stopDocker()
    // Docker 중지 후 상태 즉시 업데이트
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('status:update')
      }
    }, 1000)

    return result
  })

  // Docker 초기화 (컨테이너 + 이미지 + 볼륨)
  ipcMain.handle('service:resetDocker', async () => {
    console.log('🗑️ [IPC] Docker 초기화 요청')
    const result = await serviceManager.dockerManager.resetDocker()

    // 초기화 후 상태 업데이트
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('status:update')
      }
    }, 1000)

    return result
  })

  // API 서버 제어
  ipcMain.handle('service:startApi', async () => {
    const projectRoot =
      serviceManager['projectRoot'] || '/Users/yendoo/dev/papyrus'
    console.log(`🚀 [IPC] API 서버 시작 요청 (프로젝트 경로: ${projectRoot})`)
    return await serviceManager.papyrusServerManager.startApiServer(projectRoot)
  })

  ipcMain.handle('service:stopApi', async () => {
    console.log('🛑 [IPC] API 서버 중지 요청')
    return await serviceManager.papyrusServerManager.stopApiServer()
  })

  // 관리자 웹 서버 제어
  ipcMain.handle('service:startWebAdmin', async () => {
    const projectRoot =
      serviceManager['projectRoot'] || '/Users/yendoo/dev/papyrus'
    console.log(
      `🚀 [IPC] 관리자 웹 서버 시작 요청 (프로젝트 경로: ${projectRoot})`,
    )
    return await serviceManager.papyrusServerManager.startWebAdminServer(
      projectRoot,
    )
  })

  ipcMain.handle('service:stopWebAdmin', async () => {
    console.log('🛑 [IPC] 관리자 웹 서버 중지 요청')
    return await serviceManager.papyrusServerManager.stopWebAdminServer()
  })

  // 웹 열기
  ipcMain.handle('service:openWeb', async () => {
    const { shell } = require('electron')
    await shell.openExternal('http://localhost:3000')
  })

  ipcMain.handle('service:openExternal', async (_event, url: string) => {
    const { shell } = require('electron')
    await shell.openExternal(url)
  })

  // 개발자 도구 열기
  ipcMain.handle('service:openDevTools', async () => {
    console.log('🔧 개발자 도구 열기')
    if (mainWindow) {
      mainWindow.webContents.openDevTools()
    }
  })

  // 패키지 업데이트 확인
  ipcMain.handle('service:checkPackageUpdates', async () => {
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)

    try {
      const projectRoot =
        serviceManager['projectRoot'] || path.resolve(__dirname, '../../')
      console.log('📦 패키지 업데이트 확인 중...')

      let stdout = ''

      try {
        // npm outdated를 사용하여 업데이트 가능한 패키지 확인
        // 참고: npm outdated는 업데이트가 있으면 exit code 1을 반환하므로 catch로 처리
        const result = await execAsync('npm outdated --json', {
          cwd: projectRoot,
          timeout: 30000,
        })
        stdout = result.stdout
      } catch (execError: any) {
        // exit code 1은 업데이트 가능한 패키지가 있다는 의미
        if (execError.stdout) {
          stdout = execError.stdout
        } else {
          throw execError
        }
      }

      if (!stdout || stdout.trim() === '') {
        console.log('✅ 모든 패키지가 최신 버전입니다')
        return []
      }

      const outdated = JSON.parse(stdout)
      const updates: Array<{
        name: string
        current: string
        latest: string
        updateType: string
      }> = []

      for (const [name, info] of Object.entries(outdated)) {
        const pkg = info as any
        const current = pkg.current || '알 수 없음'
        const latest = pkg.latest || pkg.wanted || '알 수 없음'

        // 버전 비교하여 업데이트 타입 결정
        let updateType = 'patch'
        if (current && latest && current !== latest) {
          const currentParts = current.split('.').map(Number)
          const latestParts = latest.split('.').map(Number)

          if (latestParts[0] > currentParts[0]) {
            updateType = 'major'
          } else if (latestParts[1] > currentParts[1]) {
            updateType = 'minor'
          }
        }

        updates.push({
          name,
          current,
          latest,
          updateType,
        })
      }

      console.log(`📦 업데이트 가능한 패키지: ${updates.length}개`)
      return updates
    } catch (error: any) {
      console.error('❌ 패키지 업데이트 확인 실패:', error.message)
      return []
    }
  })

  // 패키지 업데이트 실행
  ipcMain.handle(
    'service:updatePackages',
    async (_event, packages: string[]) => {
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)

      try {
        const projectRoot =
          serviceManager['projectRoot'] || path.resolve(__dirname, '../../')

        if (!packages || packages.length === 0) {
          return {
            success: false,
            message: '업데이트할 패키지를 선택해주세요.',
          }
        }

        console.log(`📦 패키지 업데이트 시작: ${packages.join(', ')}`)

        // npm install <package>@<version>을 사용하여 정확한 버전으로 업데이트
        // packages는 이미 "package@version" 형태로 전달됨
        const packageList = packages.join(' ')
        const { stdout, stderr } = await execAsync(
          `npm install ${packageList}`,
          {
            cwd: projectRoot,
            timeout: 120000, // 2분
          },
        )

        console.log('✅ 패키지 업데이트 완료')
        return {
          success: true,
          message: `${packages.length}개 패키지 업데이트 완료`,
          output: stdout || stderr,
        }
      } catch (error: any) {
        console.error('❌ 패키지 업데이트 실패:', error.message)
        return {
          success: false,
          message: error.message,
          output: error.stdout || error.stderr,
        }
      }
    },
  )

  // 전체 패키지 업데이트
  ipcMain.handle('service:updateAllPackages', async () => {
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)

    try {
      const projectRoot =
        serviceManager['projectRoot'] || path.resolve(__dirname, '../../')

      console.log('📦 전체 패키지 업데이트 시작...')

      const { stdout, stderr } = await execAsync('npm update', {
        cwd: projectRoot,
        timeout: 300000, // 5분
      })

      console.log('✅ 전체 패키지 업데이트 완료')
      return {
        success: true,
        message: '전체 패키지 업데이트 완료',
        output: stdout || stderr,
      }
    } catch (error: any) {
      console.error('❌ 전체 패키지 업데이트 실패:', error.message)
      return {
        success: false,
        message: error.message,
        output: error.stdout || error.stderr,
      }
    }
  })

  // 설치된 패키지 목록 가져오기
  ipcMain.handle('service:getInstalledPackages', async () => {
    const fs = require('fs')

    try {
      const projectRoot =
        serviceManager['projectRoot'] || path.resolve(__dirname, '../../')
      const packageJsonPath = path.join(projectRoot, 'package.json')

      console.log('📚 package.json 읽기:', packageJsonPath)

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      const dependencies = packageJson.dependencies || {}
      const devDependencies = packageJson.devDependencies || {}

      const packages: Array<{
        name: string
        version: string
        type: string
      }> = []

      // 프로덕션 의존성
      for (const [name, version] of Object.entries(dependencies)) {
        packages.push({
          name,
          version: String(version),
          type: 'prod',
        })
      }

      // 개발 의존성
      for (const [name, version] of Object.entries(devDependencies)) {
        packages.push({
          name,
          version: String(version),
          type: 'dev',
        })
      }

      // 이름순 정렬
      packages.sort((a, b) => a.name.localeCompare(b.name))

      console.log(
        `📚 전체 패키지: ${packages.length}개 (Prod: ${Object.keys(dependencies).length}, Dev: ${Object.keys(devDependencies).length})`,
      )
      return packages
    } catch (error: any) {
      console.error('❌ 패키지 목록 로딩 실패:', error.message)
      return []
    }
  })

  // 패키지 상세 정보 가져오기
  ipcMain.handle(
    'service:getPackageInfo',
    async (_event, packageName: string) => {
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)

      try {
        console.log(`📦 패키지 정보 가져오기: ${packageName}`)

        // npm view 명령어로 패키지 정보 가져오기
        const { stdout } = await execAsync(
          `npm view ${packageName} description version author license homepage repository keywords --json`,
          {
            timeout: 10000,
          },
        )

        const info = JSON.parse(stdout)

        // repository URL 정리
        let repositoryUrl = ''
        if (info.repository) {
          if (typeof info.repository === 'string') {
            repositoryUrl = info.repository
          } else if (info.repository.url) {
            repositoryUrl = info.repository.url
              .replace(/^git\+/, '')
              .replace(/\.git$/, '')
          }
        }

        // author 정리
        let authorName = ''
        if (info.author) {
          if (typeof info.author === 'string') {
            authorName = info.author
          } else if (info.author.name) {
            authorName = info.author.name
          }
        }

        const packageInfo = {
          name: packageName,
          description: info.description || '',
          latestVersion: info.version || '',
          author: authorName,
          license: info.license || '',
          homepage: info.homepage || '',
          repository: repositoryUrl,
          keywords: Array.isArray(info.keywords)
            ? info.keywords.slice(0, 10)
            : [],
        }

        console.log(`✅ 패키지 정보 가져오기 성공: ${packageName}`)
        return packageInfo
      } catch (error: any) {
        console.error(
          `❌ 패키지 정보 가져오기 실패 (${packageName}):`,
          error.message,
        )
        return null
      }
    },
  )

  // 포트 체크
  ipcMain.handle('service:checkPort', async (_event, port: number) => {
    const http = require('http')
    return new Promise<boolean>((resolve) => {
      const request = http.get(`http://localhost:${port}`, (res: any) => {
        resolve(true)
      })
      request.on('error', () => {
        resolve(false)
      })
      request.setTimeout(1000, () => {
        request.destroy()
        resolve(false)
      })
    })
  })

  // API 빌드
  ipcMain.handle('service:buildApi', async () => {
    return await serviceManager.papyrusServerManager.buildApi()
  })

  // SDK 빌드
  ipcMain.handle('service:buildSdk', async () => {
    return await serviceManager.papyrusServerManager.buildNestiaSdk()
  })

  // Web 빌드
  ipcMain.handle('service:buildWeb', async () => {
    return await serviceManager.papyrusServerManager.buildWeb()
  })

  // 데이터베이스 마이그레이션
  ipcMain.handle('service:runMigration', async () => {
    return await serviceManager.runMigration()
  })

  // 데이터베이스 Deploy
  ipcMain.handle('service:runDeploy', async () => {
    return await serviceManager.runDeploy()
  })

  // Prisma Client 재생성
  ipcMain.handle('service:runGenerate', async () => {
    return await serviceManager.runGenerate()
  })

  // 데이터베이스 Seed
  ipcMain.handle('service:runSeed', async () => {
    return await serviceManager.runSeed()
  })

  // ========================================
  // Prisma Manager IPC Handlers
  // ========================================

  // Prisma 스키마 빌드
  ipcMain.handle('prisma:buildSchema', async () => {
    console.log('🔧 [IPC] Prisma 스키마 빌드 요청')
    return await prismaManager.buildSchema()
  })

  // Prisma 스키마 검증
  ipcMain.handle('prisma:validateSchema', async () => {
    console.log('🔍 [IPC] Prisma 스키마 검증 요청')
    return await prismaManager.validateSchema()
  })

  // Prisma Client 생성
  ipcMain.handle('prisma:generateClient', async () => {
    console.log('🔄 [IPC] Prisma Client 생성 요청')
    return await prismaManager.generateClient()
  })

  // Prisma 마이그레이션 실행
  ipcMain.handle('prisma:migrate', async (_event, migrationName: string) => {
    console.log(`🚀 [IPC] Prisma 마이그레이션 요청: ${migrationName}`)
    return await prismaManager.migrate(migrationName)
  })

  // Prisma 마이그레이션 Deploy
  ipcMain.handle('prisma:deploy', async () => {
    console.log('🚀 [IPC] Prisma 마이그레이션 Deploy 요청')
    return await prismaManager.deploy()
  })

  // Prisma 마이그레이션 목록 조회
  ipcMain.handle('prisma:getMigrations', async () => {
    console.log('📋 [IPC] Prisma 마이그레이션 목록 조회 요청')
    return await prismaManager.getMigrations()
  })

  // Prisma 마이그레이션 상태 확인
  ipcMain.handle('prisma:getMigrationStatus', async () => {
    console.log('📊 [IPC] Prisma 마이그레이션 상태 확인 요청')
    return await prismaManager.getMigrationStatus()
  })

  // Prisma Studio 시작
  ipcMain.handle('prisma:startStudio', async () => {
    console.log('🎨 [IPC] Prisma Studio 시작 요청')
    return await prismaManager.startStudio()
  })

  // Prisma Studio 중지
  ipcMain.handle('prisma:stopStudio', async () => {
    console.log('🛑 [IPC] Prisma Studio 중지 요청')
    return await prismaManager.stopStudio()
  })

  // Prisma Seed 실행
  ipcMain.handle('prisma:runSeed', async () => {
    console.log('🌱 [IPC] Prisma Seed 실행 요청')
    return await prismaManager.runSeed()
  })

  // Prisma Seed 파일 목록 조회
  ipcMain.handle('prisma:getSeedFiles', async () => {
    console.log('📋 [IPC] Seed 파일 목록 조회 요청')
    return await prismaManager.getSeedFiles()
  })

  // Prisma 상태 조회
  ipcMain.handle('prisma:getStatus', async () => {
    return await prismaManager.getStatus()
  })

  // Prisma Studio 열기
  ipcMain.handle('service:openPrismaStudio', async () => {
    return await serviceManager.openPrismaStudio()
  })

  // 로그 파일 목록 조회
  ipcMain.handle('service:getLogFiles', async () => {
    console.log('📋 [IPC] 로그 파일 목록 조회 요청')
    return await serviceManager.getLogFiles()
  })

  // 로그 파일 읽기
  ipcMain.handle('service:readLogFile', async (_event, filePath: string) => {
    console.log('📄 [IPC] 로그 파일 읽기 요청:', filePath)
    return await serviceManager.readLogFile(filePath)
  })

  // ========================================
  // Environment Variables IPC Handlers
  // ========================================

  // 환경 변수 파일 목록 조회
  ipcMain.handle('env:getFiles', async () => {
    console.log('📋 [IPC] 환경 변수 파일 목록 조회 요청')
    try {
      const projectRoot =
        serviceManager['projectRoot'] || '/Users/yendoo/dev/papyrus'
      const envFiles: string[] = []

      const files = ['env.development', 'env.production', 'env.test']
      for (const file of files) {
        const filePath = path.join(projectRoot, file)
        if (fs.existsSync(filePath)) {
          envFiles.push(file)
        }
      }

      return envFiles
    } catch (error: any) {
      console.error('❌ 환경 변수 파일 목록 조회 실패:', error.message)
      return []
    }
  })

  // 환경 변수 읽기
  ipcMain.handle('env:read', async (_event, fileName: string) => {
    console.log(`📖 [IPC] 환경 변수 읽기 요청: ${fileName}`)
    try {
      const projectRoot =
        serviceManager['projectRoot'] || '/Users/yendoo/dev/papyrus'
      const filePath = path.join(projectRoot, fileName)

      if (!fs.existsSync(filePath)) {
        throw new Error(`파일을 찾을 수 없습니다: ${fileName}`)
      }

      const content = fs.readFileSync(filePath, 'utf-8')

      // 환경 변수 파싱 (key=value 형식)
      const variables: Record<string, string> = {}
      const lines = content.split('\n')

      for (const line of lines) {
        const trimmed = line.trim()

        // 빈 줄이나 주석 건너뛰기
        if (!trimmed || trimmed.startsWith('#')) {
          continue
        }

        // key=value 파싱
        const equalIndex = trimmed.indexOf('=')
        if (equalIndex === -1) {
          continue
        }

        const key = trimmed.substring(0, equalIndex).trim()
        let value = trimmed.substring(equalIndex + 1).trim()

        // 따옴표 제거
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }

        variables[key] = value
      }

      return {
        success: true,
        variables,
        raw: content,
      }
    } catch (error: any) {
      console.error('❌ 환경 변수 읽기 실패:', error.message)
      return {
        success: false,
        message: error.message,
        variables: {},
        raw: '',
      }
    }
  })

  // 환경 변수 쓰기
  ipcMain.handle(
    'env:write',
    async (_event, fileName: string, variables: Record<string, string>) => {
      console.log(`✏️ [IPC] 환경 변수 쓰기 요청: ${fileName}`)
      try {
        const projectRoot =
          serviceManager['projectRoot'] || '/Users/yendoo/dev/papyrus'
        const filePath = path.join(projectRoot, fileName)

        // 기존 파일 읽기 (주석 및 섹션 구조 유지)
        let originalContent = ''
        if (fs.existsSync(filePath)) {
          originalContent = fs.readFileSync(filePath, 'utf-8')
        }

        // 백업 생성
        if (fs.existsSync(filePath)) {
          const backupPath = `${filePath}.backup.${Date.now()}`
          fs.copyFileSync(filePath, backupPath)
          console.log(`📦 백업 생성: ${backupPath}`)
        }

        // 환경 변수를 key=value 형식으로 변환
        let newContent = ''
        const lines = originalContent.split('\n')
        const updatedKeys = new Set<string>()

        for (const line of lines) {
          const trimmed = line.trim()

          // 빈 줄이나 주석은 그대로 유지
          if (!trimmed || trimmed.startsWith('#')) {
            newContent += line + '\n'
            continue
          }

          // key=value 파싱
          const equalIndex = trimmed.indexOf('=')
          if (equalIndex === -1) {
            newContent += line + '\n'
            continue
          }

          const key = trimmed.substring(0, equalIndex).trim()

          // 변수가 업데이트 목록에 있으면 새 값으로 교체
          if (key in variables) {
            const value = variables[key]
            newContent += `${key}=${value}\n`
            updatedKeys.add(key)
          } else {
            newContent += line + '\n'
          }
        }

        // 새로 추가된 변수 처리
        for (const [key, value] of Object.entries(variables)) {
          if (!updatedKeys.has(key)) {
            newContent += `${key}=${value}\n`
          }
        }

        // 파일 쓰기
        fs.writeFileSync(filePath, newContent, 'utf-8')
        console.log(`✅ 환경 변수 저장 완료: ${filePath}`)

        return {
          success: true,
          message: '환경 변수가 성공적으로 저장되었습니다.',
        }
      } catch (error: any) {
        console.error('❌ 환경 변수 쓰기 실패:', error.message)
        return {
          success: false,
          message: error.message,
        }
      }
    },
  )

  // 환경 변수 삭제
  ipcMain.handle(
    'env:delete',
    async (_event, fileName: string, key: string) => {
      console.log(`🗑️ [IPC] 환경 변수 삭제 요청: ${fileName} - ${key}`)
      try {
        const projectRoot =
          serviceManager['projectRoot'] || '/Users/yendoo/dev/papyrus'
        const filePath = path.join(projectRoot, fileName)

        if (!fs.existsSync(filePath)) {
          throw new Error(`파일을 찾을 수 없습니다: ${fileName}`)
        }

        // 백업 생성
        const backupPath = `${filePath}.backup.${Date.now()}`
        fs.copyFileSync(filePath, backupPath)
        console.log(`📦 백업 생성: ${backupPath}`)

        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n')
        const newLines: string[] = []

        for (const line of lines) {
          const trimmed = line.trim()

          // key=value 파싱
          const equalIndex = trimmed.indexOf('=')
          if (equalIndex !== -1) {
            const lineKey = trimmed.substring(0, equalIndex).trim()

            // 삭제할 키가 아니면 유지
            if (lineKey !== key) {
              newLines.push(line)
            }
          } else {
            // 주석이나 빈 줄은 유지
            newLines.push(line)
          }
        }

        fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8')
        console.log(`✅ 환경 변수 삭제 완료: ${key}`)

        return {
          success: true,
          message: `환경 변수 '${key}'가 삭제되었습니다.`,
        }
      } catch (error: any) {
        console.error('❌ 환경 변수 삭제 실패:', error.message)
        return {
          success: false,
          message: error.message,
        }
      }
    },
  )

  // ========================================
  // Nestia SDK IPC Handlers
  // ========================================

  // Nestia SDK 빌드
  ipcMain.handle('nestia:build', async () => {
    console.log('🔨 [IPC] Nestia SDK 빌드 요청')
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)
    const fs = require('fs')

    const projectRoot =
      serviceManager['projectRoot'] || '/Users/yendoo/dev/papyrus'
    const apiPath = path.join(projectRoot, 'apps/api')
    const startTime = new Date()
    let isSuccess = false
    let output = ''

    try {
      console.log(`📂 API 경로: ${apiPath}`)
      console.log('🔨 Nestia SDK 빌드 시작...')

      const result = await execAsync('npx nestia sdk', {
        cwd: apiPath,
        timeout: 60000, // 1분
      })

      output = result.stdout || result.stderr || ''
      isSuccess = true
    } catch (error: any) {
      // exit code가 0이 아니어도 stderr에 출력이 있을 수 있음
      // SDK 파일이 생성되었는지 확인
      output = error.stdout || error.stderr || error.message

      const sdkPath = path.join(projectRoot, 'apps/api/src/api/functional')
      if (fs.existsSync(sdkPath)) {
        const files = fs.readdirSync(sdkPath)
        if (files.length > 0) {
          isSuccess = true
          console.log('✅ SDK 파일이 생성되었으므로 성공으로 간주')
        }
      }
    }

    const endTime = new Date()
    const duration = endTime.getTime() - startTime.getTime()

    // 로그 저장
    const logDir = path.join(projectRoot, 'logs/nestia/build')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    const timestamp = startTime.toISOString().replace(/:/g, '-').split('.')[0]
    const status = isSuccess ? 'success' : 'failed'
    const logFile = path.join(logDir, `${timestamp}_${status}.log`)
    const logContent = [
      `========================================`,
      `Nestia SDK Build Log`,
      `========================================`,
      `Start Time: ${startTime.toISOString()}`,
      `End Time: ${endTime.toISOString()}`,
      `Duration: ${duration}ms`,
      `Status: ${isSuccess ? 'SUCCESS' : 'FAILED'}`,
      ``,
      `========================================`,
      `Output:`,
      `========================================`,
      output,
    ].join('\n')

    fs.writeFileSync(logFile, logContent, 'utf-8')
    console.log(`📝 로그 저장: ${logFile}`)

    if (isSuccess) {
      console.log('✅ Nestia SDK 빌드 완료')
      return {
        success: true,
        message: `✅ Nestia SDK 빌드 완료\n\n소요 시간: ${duration}ms\n\n${output}`,
      }
    } else {
      console.error('❌ Nestia SDK 빌드 실패')
      return {
        success: false,
        message: `❌ Nestia SDK 빌드 실패\n\n${output}`,
      }
    }
  })

  // Nestia SDK 검증
  ipcMain.handle('nestia:validate', async () => {
    console.log('✅ [IPC] Nestia SDK 검증 요청')
    const fs = require('fs')

    try {
      const projectRoot =
        serviceManager['projectRoot'] || '/Users/yendoo/dev/papyrus'
      const sdkPath = path.join(projectRoot, 'apps/api/src/api')
      const swaggerPath = path.join(projectRoot, 'apps/api/swagger.json')

      console.log(`📂 SDK 경로: ${sdkPath}`)
      console.log(`📂 Swagger 경로: ${swaggerPath}`)

      const startTime = new Date()

      // SDK 폴더 확인
      if (!fs.existsSync(sdkPath)) {
        throw new Error('SDK 폴더가 없습니다. SDK를 먼저 빌드해주세요.')
      }

      // Swagger 파일 확인
      if (!fs.existsSync(swaggerPath)) {
        throw new Error('Swagger 파일이 없습니다. SDK를 먼저 빌드해주세요.')
      }

      // SDK 파일 목록 확인
      const functionalPath = path.join(sdkPath, 'functional')
      if (!fs.existsSync(functionalPath)) {
        throw new Error(
          'SDK functional 폴더가 없습니다. SDK를 먼저 빌드해주세요.',
        )
      }

      const files = fs.readdirSync(functionalPath)
      const tsFiles = files.filter((f: string) => f.endsWith('.ts'))

      console.log(`✅ SDK 검증 완료: ${tsFiles.length}개 파일`)

      const message =
        `✅ SDK 검증 완료\n\n` +
        `📁 SDK 경로: apps/api/src/api/\n` +
        `📄 생성된 파일: ${tsFiles.length}개\n` +
        `📄 Swagger: swagger.json\n\n` +
        `주요 파일:\n${tsFiles
          .slice(0, 10)
          .map((f: string) => `  • ${f}`)
          .join('\n')}` +
        (tsFiles.length > 10 ? `\n  ... 외 ${tsFiles.length - 10}개` : '')

      // 로그 저장
      const logDir = path.join(projectRoot, 'logs/nestia/validate')
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }

      const timestamp = startTime.toISOString().replace(/:/g, '-').split('.')[0]
      const logFile = path.join(logDir, `${timestamp}_success.log`)
      const logContent = [
        `========================================`,
        `Nestia SDK Validation Log`,
        `========================================`,
        `Time: ${startTime.toISOString()}`,
        `Status: SUCCESS`,
        ``,
        `========================================`,
        `Results:`,
        `========================================`,
        `SDK Path: ${sdkPath}`,
        `Swagger Path: ${swaggerPath}`,
        `Total Files: ${tsFiles.length}`,
        ``,
        `Files:`,
        tsFiles.map((f: string) => `  - ${f}`).join('\n'),
      ].join('\n')

      fs.writeFileSync(logFile, logContent, 'utf-8')
      console.log(`📝 로그 저장: ${logFile}`)

      return {
        success: true,
        message,
      }
    } catch (error: any) {
      console.error('❌ Nestia SDK 검증 실패:', error.message)

      // 실패 로그 저장
      const projectRoot =
        serviceManager['projectRoot'] || '/Users/yendoo/dev/papyrus'
      const logDir = path.join(projectRoot, 'logs/nestia/validate')
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }

      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, '-')
        .split('.')[0]
      const logFile = path.join(logDir, `${timestamp}_failed.log`)
      const logContent = [
        `========================================`,
        `Nestia SDK Validation Log`,
        `========================================`,
        `Time: ${new Date().toISOString()}`,
        `Status: FAILED`,
        ``,
        `========================================`,
        `Error:`,
        `========================================`,
        error.message,
      ].join('\n')

      fs.writeFileSync(logFile, logContent, 'utf-8')
      console.log(`📝 로그 저장: ${logFile}`)

      return {
        success: false,
        message: `❌ SDK 검증 실패\n\n${error.message}`,
      }
    }
  })

  // ========================================
  // NX Configuration IPC Handlers
  // ========================================

  // NX 프로젝트 목록 가져오기
  ipcMain.handle('nx:getProjects', async () => {
    console.log('📂 [IPC] NX 프로젝트 목록 요청')
    try {
      return await nxManager.getProjects()
    } catch (error: any) {
      console.error('❌ NX 프로젝트 목록 조회 실패:', error)
      return []
    }
  })

  // project.json 읽기
  ipcMain.handle('nx:readProjectJson', async (_event, projectRoot: string) => {
    console.log(`📖 [IPC] project.json 읽기: ${projectRoot}`)
    try {
      return await nxManager.readProjectJson(projectRoot)
    } catch (error: any) {
      console.error('❌ project.json 읽기 실패:', error)
      throw error
    }
  })

  // project.json 저장
  ipcMain.handle(
    'nx:saveProjectJson',
    async (_event, projectName: string, content: any) => {
      console.log(`💾 [IPC] project.json 저장: ${projectName}`)
      return await nxManager.saveProjectJson(projectName, content)
    },
  )

  // project.json 백업 복원
  ipcMain.handle(
    'nx:restoreProjectJsonBackup',
    async (_event, projectName: string) => {
      console.log(`🔄 [IPC] project.json 백업 복원: ${projectName}`)
      return await nxManager.restoreProjectJsonBackup(projectName)
    },
  )

  // nestia.config.ts 읽기
  ipcMain.handle('nx:readNestiaConfig', async (_event, projectRoot: string) => {
    console.log(`📖 [IPC] nestia.config.ts 읽기: ${projectRoot}`)
    try {
      return await nxManager.readNestiaConfig(projectRoot)
    } catch (error: any) {
      console.error('❌ nestia.config.ts 읽기 실패:', error)
      throw error
    }
  })

  // nestia.config.ts 저장
  ipcMain.handle(
    'nx:saveNestiaConfig',
    async (_event, projectName: string, content: string) => {
      console.log(`💾 [IPC] nestia.config.ts 저장: ${projectName}`)
      return await nxManager.saveNestiaConfig(projectName, content)
    },
  )

  // nestia.config.ts 백업 복원
  ipcMain.handle(
    'nx:restoreNestiaConfigBackup',
    async (_event, projectName: string) => {
      console.log(`🔄 [IPC] nestia.config.ts 백업 복원: ${projectName}`)
      return await nxManager.restoreNestiaConfigBackup(projectName)
    },
  )

  // nx.json 읽기
  ipcMain.handle('nx:readNxJson', async () => {
    console.log('📖 [IPC] nx.json 읽기')
    try {
      return await nxManager.readNxJson()
    } catch (error: any) {
      console.error('❌ nx.json 읽기 실패:', error)
      throw error
    }
  })

  // nx.json 저장
  ipcMain.handle('nx:saveNxJson', async (_event, content: any) => {
    console.log('💾 [IPC] nx.json 저장')
    return await nxManager.saveNxJson(content)
  })

  // nx.json 백업 복원
  ipcMain.handle('nx:restoreNxJsonBackup', async () => {
    console.log('🔄 [IPC] nx.json 백업 복원')
    return await nxManager.restoreNxJsonBackup()
  })
}

// 로그 헬퍼
function logBox(title: string, lines: string[]) {
  const width = 60
  const border = '═'.repeat(width)

  console.log(`\n╔${border}╗`)
  console.log(`║ ${title.padEnd(width - 2)} ║`)
  console.log(`╠${border}╣`)

  lines.forEach((line) => {
    console.log(`║ ${line.padEnd(width - 2)} ║`)
  })

  console.log(`╚${border}╝\n`)
}

// 앱 준비 완료
app.whenReady().then(async () => {
  // 콘솔 인코딩 설정 (Windows)
  if (process.platform === 'win32') {
    process.stdout.setDefaultEncoding('utf8')
  }

  logBox('Papyrus Service Manager', [
    '버전: v1.1.0',
    '상태: 시작 중...',
    '',
    '독립 실행형 서비스 관리 도구',
    '✨ DB 관리 & 트렌디한 UI 디자인',
  ])

  // 백그라운드 앱 (Dock/작업표시줄에 표시 안 함)
  // GUI 모드일 때는 Dock을 표시
  if (app.dock && !process.env.ELECTRON_SHOW_DOCK) {
    app.dock.hide()
  }

  // IPC 핸들러 등록
  registerIpcHandlers()

  createTray()

  // macOS에서는 항상 GUI 창을 열기 (트레이 아이콘이 잘 안 보임)
  createWindow()

  // 프로젝트 루트 설정 (환경 변수 또는 기본값)
  const projectRoot =
    process.env.PAPYRUS_PROJECT_ROOT || '/Users/yendoo/dev/papyrus'
  serviceManager.setProjectRoot(projectRoot)
  prismaManager.setProjectRoot(projectRoot)
  console.log(`📁 프로젝트 루트: ${projectRoot}`)

  logBox('시스템 트레이 준비 완료', [
    '✅ 트레이 아이콘 생성됨',
    '✅ GUI 창이 열렸습니다',
    '',
    '📍 사용 방법:',
    '   • GUI 창에서 모든 서비스 관리',
    '   • 창을 닫으면 트레이로 이동',
    '   • 상단 메뉴바 아이콘 클릭하여 다시 열기',
  ])
})

// 모든 창이 닫혀도 종료하지 않음 (트레이 앱)
app.on('window-all-closed', () => {
  // 트레이 앱이므로 종료하지 않음
})

// 앱 종료 전 정리
app.on('before-quit', async () => {
  isQuitting = true
  console.log('🛑 Papyrus Service Manager 종료 중...')
  await serviceManager.stopAll()
  await prismaManager.cleanup()
})

// 중복 실행 방지
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  console.log('⚠️ 이미 실행 중입니다')
  app.quit()
} else {
  app.on('second-instance', () => {
    dialog.showMessageBox({
      type: 'warning',
      title: 'Papyrus Service Manager',
      message: 'Papyrus Service Manager가 이미 실행 중입니다',
      detail: '시스템 트레이를 확인하세요',
      buttons: ['확인'],
    })
  })
}
