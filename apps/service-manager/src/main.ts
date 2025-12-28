/**
 * Papyrus Service Manager - Main Process
 * 독립 실행형 서비스 관리 도구
 */

import {
  app,
  Tray,
  Menu,
  nativeImage,
  dialog,
  BrowserWindow,
  ipcMain,
} from 'electron'
import * as path from 'path'
import { ServiceManager } from './services/service-manager'

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let isQuitting = false
const serviceManager = ServiceManager.getInstance()

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
    title: 'Evolution Service Manager',
    icon: nativeImage.createEmpty(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // HTML 파일 로드
  const htmlPath = path.join(__dirname, 'renderer', 'index.html')
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
  // 16x16 크기의 흰색 원 아이콘
  const canvas = {
    width: 16,
    height: 16,
  }

  // 기본 아이콘 (Windows에서는 시스템 아이콘 사용)
  let icon: Electron.NativeImage

  try {
    // 아이콘 파일이 있으면 로드
    const iconPath = path.join(__dirname, '../resources/icon.png')
    icon = nativeImage.createFromPath(iconPath)

    // 아이콘이 비어있으면 기본 아이콘 생성
    if (icon.isEmpty()) {
      throw new Error('Icon file not found')
    }
  } catch (error) {
    // 아이콘 파일이 없으면 간단한 이미지 생성
    // 🎮 이모지를 이미지로 변환
    const iconData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAE0SURBVDiNpdPNSsNAFIbh502aJhBbqYKgC8GFIrgQXIgL/wGv1L2/N+BG3AiuXHghLlwI/qBCbW1Tk8nMcZGGpE0T8INZzDnPzJkzhv8UY8wC8ALYBuaBKfAJPAIPWuuPnyALWFJKrQMngAJcIADqwB1wq7V+/hUcADfAEnAKOH8AtgD3QAXYAx6Ac631vTEmAJaBE8D+BY6AY+AN2ATugQvgEqgBG8AecDgIeATsgBU4BtxBgD1wDGyAF+AYsIGDQcAu4AKb4BjYB+wDc0AFqAJzQ4FzwB/gGLgGNoENYBd4A84Au+Db3wRsA0+AS2AR+AZ2gCXAAdY0oE6gHWCqtR7r2DZQBhaGAEuAHce5/k2gtV4Zc+sCK1rrUc8BaK3PgJf0N+jWWq/+r18AVNhp1dmOl2oAAAAASUVORK5CYII=',
      'base64',
    )
    icon = nativeImage.createFromBuffer(iconData)
  }

  tray = new Tray(icon)
  tray.setToolTip('Papyrus Service Manager')

  console.log('✅ 트레이 아이콘 생성 완료')

  updateTrayMenu()

  // 3초마다 상태 업데이트
  setInterval(() => {
    updateTrayMenu()
  }, 3000)
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
    const webAdminStatus = status.evolutionServer.webAdminServer.isRunning
      ? '✅'
      : '❌'
    const webUserStatus = status.evolutionServer.webUserServer.isRunning
      ? '✅'
      : '❌'
    const apiStatus = status.evolutionServer.apiServer.isRunning ? '✅' : '❌'

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
          createWindow()
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
          if (status.evolutionServer.webAdminServer.isRunning) {
            require('electron').shell.openExternal('http://localhost:3000')
          }
        },
      },
      {
        label: `  ${webUserStatus} 사용자 웹 (포트: 4200)`,
        type: 'normal',
        click: () => {
          if (status.evolutionServer.webUserServer.isRunning) {
            require('electron').shell.openExternal(
              'https://user.civilization.zone',
            )
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
          status.evolutionServer.apiServer.isRunning ||
          status.evolutionServer.webAdminServer.isRunning ||
          status.evolutionServer.webUserServer.isRunning,
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
          const result = await serviceManager.evolutionServerManager.buildApi()
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
            await serviceManager.evolutionServerManager.buildNestiaSdk()
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

  // Docker 제어
  ipcMain.handle('service:startDocker', async () => {
    const projectRoot =
      serviceManager['projectRoot'] ||
      '/Users/yendoo/dev/papyrus'
    console.log(`🐳 [IPC] Docker 시작 요청 (프로젝트 경로: ${projectRoot})`)
    return await serviceManager.dockerManager.startDocker(projectRoot)
  })

  ipcMain.handle('service:stopDocker', async () => {
    return await serviceManager.dockerManager.stopDocker()
  })

  // API 서버 제어
  ipcMain.handle('service:startApi', async () => {
    const projectRoot =
      serviceManager['projectRoot'] ||
      '/Users/yendoo/dev/papyrus'
    console.log(`🚀 [IPC] API 서버 시작 요청 (프로젝트 경로: ${projectRoot})`)
    return await serviceManager.evolutionServerManager.startApiServer(
      projectRoot,
    )
  })

  ipcMain.handle('service:stopApi', async () => {
    console.log('🛑 [IPC] API 서버 중지 요청')
    return await serviceManager.evolutionServerManager.stopApiServer()
  })

  // 관리자 웹 서버 제어
  ipcMain.handle('service:startWebAdmin', async () => {
    const projectRoot =
      serviceManager['projectRoot'] ||
      '/Users/yendoo/dev/papyrus'
    console.log(
      `🚀 [IPC] 관리자 웹 서버 시작 요청 (프로젝트 경로: ${projectRoot})`,
    )
    return await serviceManager.evolutionServerManager.startWebAdminServer(
      projectRoot,
    )
  })

  ipcMain.handle('service:stopWebAdmin', async () => {
    console.log('🛑 [IPC] 관리자 웹 서버 중지 요청')
    return await serviceManager.evolutionServerManager.stopWebAdminServer()
  })

  // 사용자 웹 서버 제어
  ipcMain.handle('service:startWebUser', async () => {
    const projectRoot =
      serviceManager['projectRoot'] ||
      '/Users/yendoo/dev/papyrus'
    console.log(
      `🚀 [IPC] 사용자 웹 서버 시작 요청 (프로젝트 경로: ${projectRoot})`,
    )
    return await serviceManager.evolutionServerManager.startWebUserServer(
      projectRoot,
    )
  })

  ipcMain.handle('service:stopWebUser', async () => {
    console.log('🛑 [IPC] 사용자 웹 서버 중지 요청')
    return await serviceManager.evolutionServerManager.stopWebUserServer()
  })

  // 로그 조회
  ipcMain.handle(
    'service:getContainerLogs',
    async (_event, containerName: string) => {
      return await serviceManager.dockerManager.getContainerLogs(containerName)
    },
  )

  ipcMain.handle('service:getApiLogs', async () => {
    return await serviceManager.evolutionServerManager.getApiServerLogs()
  })

  ipcMain.handle('service:getWebAdminLogs', async () => {
    return await serviceManager.evolutionServerManager.getWebAdminServerLogs()
  })

  ipcMain.handle('service:getWebUserLogs', async () => {
    return await serviceManager.evolutionServerManager.getWebUserServerLogs()
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
    return await serviceManager.evolutionServerManager.buildApi()
  })

  // SDK 빌드
  ipcMain.handle('service:buildSdk', async () => {
    return await serviceManager.evolutionServerManager.buildNestiaSdk()
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

  // Prisma Studio 열기
  ipcMain.handle('service:openPrismaStudio', async () => {
    return await serviceManager.openPrismaStudio()
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

  // GUI 모드일 때는 자동으로 창 열기
  if (process.env.ELECTRON_SHOW_DOCK) {
    createWindow()
  }

  // 환경 변수에서 프로젝트 경로 읽기
  const projectRoot = process.env.PAPYRUS_PROJECT_ROOT
  if (projectRoot) {
    serviceManager.setProjectRoot(projectRoot)
    console.log(`📁 프로젝트 루트: ${projectRoot}`)
  }

  logBox('시스템 트레이 준비 완료', [
    '✅ 트레이 아이콘 생성됨',
    '',
    '📍 사용 방법:',
    '   1. 작업 표시줄 우측 하단',
    '   2. 숨겨진 아이콘 (▲) 클릭',
    '   3. 아이콘 우클릭 → "GUI 열기"',
    '',
    '💡 GUI에서 모든 서비스를 관리할 수 있습니다',
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
