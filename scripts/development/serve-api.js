#!/usr/bin/env node

import { error, runNpx, success } from '../utils/common.js'

async function main() {
  try {
    console.log('🚀 API 서버 시작...')
    await runNpx('nx', ['serve', 'api'])
    success('API 서버 시작 완료')
  } catch (err) {
    error('API 서버 시작 실패')
    process.exit(1)
  }
}

export default main
