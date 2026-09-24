import { existsSync } from 'fs'
import { join, resolve } from 'path'

/**
 * 데스크톱 앱이 읽어야 할 산출물 위치.
 *
 * - 개발 실행: 레포 루트 기준 (화면·API 둘 다 로컬 dist에서)
 * - 패키징 실행: 화면만 앱 안에 들어 있다. API는 이미 떠 있는 프로세스를 쓰거나,
 *   PAPYRUS_REPO_DIR로 레포를 가리켜 주면 그쪽 dist에서 직접 띄운다.
 *   (API를 앱에 통째로 넣으려면 node_modules·prisma 엔진까지 동봉해야 해서 별도 작업이다.)
 */
export interface DesktopPaths {
  /** index.html이 있는 디렉토리 */
  readonly rendererDir: string
  /** API 진입점 main.js. null이면 앱이 API를 직접 띄우지 않는다 */
  readonly apiEntry: string | null
  /** API에 넘길 dotenv 파일 */
  readonly apiEnvFile: string | null
}

const RENDERER_SUBPATH = join('apps', 'web-admin', 'dist')
const API_SUBPATH = join(
  'dist',
  'apps',
  'api',
  'src',
  'apps',
  'api-gateway',
  'src',
  'main.js',
)

function repoArtifacts(repoDir: string) {
  const apiEntry = join(repoDir, API_SUBPATH)
  const envDevelopment = join(repoDir, 'env.development')
  return {
    apiEntry: existsSync(apiEntry) ? apiEntry : null,
    apiEnvFile: existsSync(envDevelopment) ? envDevelopment : null,
  }
}

/**
 * `isPackaged`를 인자로 받는 이유는 electron을 import하지 않고 테스트하기 위함.
 */
export function resolveDesktopPaths(options: {
  isPackaged: boolean
  /** 패키징 시 process.resourcesPath */
  resourcesPath?: string
  /** 이 파일이 컴파일된 위치 (apps/desktop/dist) */
  compiledDir: string
  /** 사용자가 지정한 레포 경로 (PAPYRUS_REPO_DIR) */
  repoDirOverride?: string
}): DesktopPaths {
  // apps/desktop/dist -> 레포 루트
  const devRepoDir = resolve(options.compiledDir, '..', '..', '..')

  if (!options.isPackaged) {
    return {
      rendererDir: join(devRepoDir, RENDERER_SUBPATH),
      ...repoArtifacts(options.repoDirOverride ?? devRepoDir),
    }
  }

  const bundledRoot = join(options.resourcesPath ?? '', 'papyrus')
  return {
    rendererDir: join(bundledRoot, RENDERER_SUBPATH),
    ...(options.repoDirOverride
      ? repoArtifacts(options.repoDirOverride)
      : { apiEntry: null, apiEnvFile: null }),
  }
}
