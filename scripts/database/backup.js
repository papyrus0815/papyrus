#!/usr/bin/env node

import path from 'path'
import fs from 'fs'
import { execFileSync } from 'child_process'
import zlib from 'zlib'
import dotenv from 'dotenv'
import { success, error, getProjectRoot } from '../utils/common.js'

function parseMysqlDatabaseUrl(raw) {
  const url = new URL(raw.replace(/^mysql:\/\//, 'http://'))
  const user = decodeURIComponent(url.username)
  const password = decodeURIComponent(url.password)
  const database = url.pathname.replace(/^\//, '').split('/')[0]

  return { user, password, database }
}

async function main() {
  const root = getProjectRoot()
  dotenv.config({ path: path.join(root, '.env') })

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    error('DATABASE_URL이 설정되어 있지 않습니다 (.env 확인)')
    process.exit(1)
  }

  let creds
  try {
    creds = parseMysqlDatabaseUrl(databaseUrl)
  } catch (e) {
    error(`DATABASE_URL 파싱 실패: ${e.message}`)
    process.exit(1)
  }

  const backupDir = path.join(root, 'docker', 'mysql', 'backups')
  fs.mkdirSync(backupDir, { recursive: true })

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outFile = path.join(backupDir, `papyrus-manual-${ts}.sql.gz`)

  try {
    const dump = execFileSync(
      'docker',
      [
        'exec',
        'mysql',
        'mysqldump',
        `-u${creds.user}`,
        `-p${creds.password}`,
        '--single-transaction',
        '--quick',
        '--routines',
        '--triggers',
        creds.database,
      ],
      { maxBuffer: 512 * 1024 * 1024 },
    )
    fs.writeFileSync(outFile, zlib.gzipSync(dump))
  } catch (e) {
    try {
      fs.unlinkSync(outFile)
    } catch {
      // ignore
    }
    error(
      e instanceof Error && 'stderr' in e
        ? `백업 실패: ${e.message}`
        : `백업 실패: ${String(e)}`,
    )
    process.exit(1)
  }

  success(`백업 저장: ${outFile}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    error(err.message || String(err))
    process.exit(1)
  })
}

export default main
