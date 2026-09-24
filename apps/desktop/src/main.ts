import {
  BrowserWindow,
  Menu,
  app,
  dialog,
  ipcMain,
  shell,
} from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

import { resolveDesktopPaths } from './paths'
import { ApiStatus, ensureApi, stopApi } from './server/api-process'
import { LocalServer, startLocalServer } from './server/local-server'

const DEFAULT_API_ORIGIN = 'http://127.0.0.1:8000'
const DEFAULT_PORT = 3100

/** 이 PC에 API가 없을 때(예: 윈도우 클라이언트) 다른 기기의 API를 가리키기 위한 설정 */
interface DesktopConfig {
  apiOrigin?: string
  port?: number
}

let apiOrigin = DEFAULT_API_ORIGIN
let preferredPort = DEFAULT_PORT
let mainWindow: BrowserWindow | null = null
let localServer: LocalServer | null = null
let apiStatus: ApiStatus = { kind: 'unavailable', reason: '시작 전' }
const logLines: string[] = []

function log(line: string) {
  logLines.push(line)
  if (logLines.length > 500) logLines.shift()
  console.log(line)
  mainWindow?.webContents.send('papyrus:log', line)
}

/* ------------------------------------------------------------------ */
/* 설정                                                                 */
/* ------------------------------------------------------------------ */

function configFile(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'config.json')
}

function readConfig(): DesktopConfig {
  try {
    const parsed = JSON.parse(readFileSync(configFile(), 'utf8'))
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    // 파일이 없는 게 정상 — 기본값(이 PC의 8000번)으로 간다
    return {}
  }
}

function argValue(flag: string): string | undefined {
  const prefix = `${flag}=`
  const hit = process.argv.find((arg) => arg.startsWith(prefix))
  return hit?.slice(prefix.length)
}

/** 우선순위: CLI 인자 > 환경 변수 > config.json > 기본값 */
function loadSettings() {
  const config = readConfig()
  apiOrigin =
    argValue('--api') ??
    process.env.PAPYRUS_API_ORIGIN ??
    config.apiOrigin ??
    DEFAULT_API_ORIGIN
  preferredPort = Number(
    argValue('--port') ??
      process.env.PAPYRUS_DESKTOP_PORT ??
      config.port ??
      DEFAULT_PORT,
  )
  if (!Number.isFinite(preferredPort)) preferredPort = DEFAULT_PORT
}

/* ------------------------------------------------------------------ */
/* 창 크기 기억                                                         */
/* ------------------------------------------------------------------ */

interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  maximized?: boolean
}

const DEFAULT_WINDOW_STATE: WindowState = { width: 1600, height: 1000 }

function windowStateFile(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'window-state.json')
}

function readWindowState(): WindowState {
  try {
    const parsed = JSON.parse(readFileSync(windowStateFile(), 'utf8'))
    if (typeof parsed?.width === 'number' && typeof parsed?.height === 'number')
      return parsed
  } catch {
    // 첫 실행이거나 파일이 깨진 경우 — 기본값으로
  }
  return DEFAULT_WINDOW_STATE
}

function saveWindowState(win: BrowserWindow) {
  try {
    const bounds = win.getNormalBounds()
    const state: WindowState = { ...bounds, maximized: win.isMaximized() }
    writeFileSync(windowStateFile(), JSON.stringify(state), 'utf8')
  } catch {
    // 저장 실패는 조용히 넘긴다 — 창 위치는 치명적이지 않다
  }
}

/* ------------------------------------------------------------------ */
/* 창                                                                   */
/* ------------------------------------------------------------------ */

function createWindow(): BrowserWindow {
  const state = readWindowState()
  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#111111',
    // 기본 타이틀바를 쓴다. macOS에서 hidden/hiddenInset을 쓰면 상단 약 28px 띠가
    // 콘텐츠 위에 남아 클릭을 창 드래그로 가로챈다 — 이 앱은 --header-height가 0px라
    // 좌측 레일·사이드바가 y=0부터 시작하므로 그 띠에 걸린 요소가 통째로 안 눌린다.
    titleBarStyle: 'default',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (state.maximized) win.maximize()
  win.once('ready-to-show', () => win.show())
  win.on('close', () => saveWindowState(win))
  win.on('closed', () => {
    mainWindow = null
  })

  // 내부 주소는 앱의 새 창으로, 외부 링크만 기본 브라우저로.
  // (인물 타임라인 등에서 window.open(..., '_blank')으로 내부 지면을 여는 곳이 있다)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (localServer && url.startsWith(localServer.origin)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1280,
          height: 900,
          backgroundColor: '#111111',
          webPreferences: {
            preload: join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
          },
        },
      }
    }
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (localServer && url.startsWith(localServer.origin)) return
    event.preventDefault()
    void shell.openExternal(url)
  })

  return win
}

function buildMenu() {
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{ role: 'appMenu' as const }]
      : []),
    {
      label: '파일',
      submenu: [isMac ? { role: 'close' as const } : { role: 'quit' as const }],
    },
    { role: 'editMenu' },
    {
      label: '보기',
      submenu: [
        { role: 'reload', label: '새로고침' },
        { role: 'forceReload', label: '강제 새로고침' },
        { role: 'toggleDevTools', label: '개발자 도구' },
        { type: 'separator' },
        { role: 'resetZoom', label: '기본 배율' },
        { role: 'zoomIn', label: '확대' },
        { role: 'zoomOut', label: '축소' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '전체 화면' },
      ],
    },
    { role: 'windowMenu' },
    {
      label: '도움말',
      submenu: [
        {
          label: '서버 상태',
          click: () => {
            void dialog.showMessageBox({
              type: 'info',
              title: '서버 상태',
              message: describeStatus(),
              detail: logLines.slice(-15).join('\n'),
            })
          },
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function describeStatus(): string {
  const server = localServer ? `화면: ${localServer.origin}` : '화면: 미기동'
  const api =
    apiStatus.kind === 'external'
      ? `API: 외부 프로세스 사용 (${apiOrigin})`
      : apiStatus.kind === 'spawned'
        ? `API: 앱이 기동 (pid ${apiStatus.pid})`
        : `API: 사용 불가 — ${apiStatus.reason}`
  return `${server}\n${api}`
}

/* ------------------------------------------------------------------ */
/* 부팅                                                                 */
/* ------------------------------------------------------------------ */

async function boot() {
  const paths = resolveDesktopPaths({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    compiledDir: __dirname,
    repoDirOverride: process.env.PAPYRUS_REPO_DIR,
  })

  mainWindow = createWindow()
  await mainWindow.loadFile(join(__dirname, '..', 'resources', 'loading.html'))

  try {
    localServer = await startLocalServer({
      rendererDir: paths.rendererDir,
      apiOrigin,
      preferredPort,
    })
    log(`[web] ${localServer.origin} 에서 서빙`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log(`[web:err] ${message}`)
    await dialog.showMessageBox({
      type: 'error',
      title: '화면을 띄우지 못했습니다',
      message,
    })
    app.quit()
    return
  }

  log('[api] 준비 중…')
  apiStatus = await ensureApi({
    apiOrigin,
    apiEntry: paths.apiEntry,
    apiEnvFile: paths.apiEnvFile,
    onLog: log,
  })
  log(describeStatus())

  if (apiStatus.kind === 'unavailable') {
    const choice = await dialog.showMessageBox({
      type: 'warning',
      title: 'API에 연결하지 못했습니다',
      message: apiStatus.reason,
      detail:
        '화면은 그대로 열리지만 데이터 조회는 실패합니다.\n\n' +
        '다른 기기의 API를 쓰려면 아래 파일에 주소를 적고 다시 실행하세요.\n' +
        `${configFile()}\n` +
        '{ "apiOrigin": "http://192.168.0.10:8000" }',
      buttons: ['그래도 열기', '설정 파일 위치 열기', '종료'],
      defaultId: 0,
      cancelId: 2,
    })
    if (choice.response === 1) {
      // 설정 파일이 아직 없으면 뼈대를 만들어 두고 그 폴더를 연다
      if (!existsSync(configFile())) {
        writeFileSync(
          configFile(),
          JSON.stringify({ apiOrigin: DEFAULT_API_ORIGIN }, null, 2),
          'utf8',
        )
      }
      shell.showItemInFolder(configFile())
    }
    if (choice.response === 2) {
      app.quit()
      return
    }
  }

  await mainWindow?.loadURL(localServer.origin)
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    loadSettings()
    buildMenu()
    ipcMain.handle('papyrus:status', () => ({
      status: describeStatus(),
      origin: localServer?.origin ?? null,
      apiOrigin,
      logs: logLines.slice(-100),
    }))
    void boot()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length > 0) return
      // 이미 부팅을 마쳤으면 창만 다시 연다 (서버·API를 두 번 띄우지 않도록)
      if (localServer) {
        mainWindow = createWindow()
        void mainWindow.loadURL(localServer.origin)
        return
      }
      void boot()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopApi()
  void localServer?.close()
})
