/**
 * 업로드 디렉터리 경로 해석 (서빙·삭제 공용)
 * - cwd가 어디든 후보 경로 목록 생성 및 실제 파일 경로 조회
 */

import { existsSync } from 'fs'
import { join, resolve } from 'path'

const CWD = process.cwd()

/** 업로드 루트 후보 목록 (실제 사용 시 existsSync로 파일 존재 여부 확인) */
export function getUploadDirCandidates(configPath: string): string[] {
  return [
    configPath.startsWith('/') ? configPath : resolve(CWD, configPath),
    resolve(CWD, 'apps/api/uploads'),
    resolve(CWD, 'uploads'),
    join(CWD, '..', 'apps', 'api', 'uploads'),
    join(CWD, '..', 'uploads'),
  ]
}

/** 후보 디렉터리 중 subpath에 해당하는 파일이 있는 절대 경로 반환, 없으면 null */
export function findUploadFilePath(
  candidates: string[],
  subpath: string,
): string | null {
  const normalized = subpath.replace(/\/+/g, '/')
  for (const dir of candidates) {
    const filePath = join(dir, normalized)
    if (existsSync(filePath)) return filePath
  }
  return null
}
