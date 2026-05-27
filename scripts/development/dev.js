#!/usr/bin/env node

import { runCommands, success, error } from '../utils/common.js'

async function main(options = {}) {
  try {
    const { nginx = false } = options

    console.log('🔧 개발 환경 시작...')

    const commands = []

    if (nginx) {
      // Docker 컨테이너 시작
      commands.push({
        command: 'docker-compose',
        args: ['up', '-d'],
      })
    }

    // 시작 전 8000 포트를 점유한 잔여 프로세스 정리 (이전 dev 세션 잔재 제거)
    commands.push({
      command: 'sh',
      args: ['-c', 'PIDS=$(lsof -ti tcp:8000); [ -n "$PIDS" ] && kill -9 $PIDS; true'],
    })

    // Nestia 빌드
    commands.push({
      command: 'node',
      args: ['scripts/build/nestia.js'],
    })

    // API와 웹 서버 동시 실행.
    // npx 대신 로컬 concurrently 바이너리를 node로 직접 호출(shell:false)해
    // npm exec 래퍼 프로세스를 줄이고 프로세스 트리를 단순하게 유지한다.
    commands.push({
      command: 'node',
      args: [
        'node_modules/concurrently/dist/bin/concurrently.js',
        '-n',
        'api,web',
        '-c',
        'blue,green',
        'nx serve api',
        nginx ? 'nx serve web' : 'npm run serve:web',
      ],
      options: { shell: false },
    })

    await runCommands(commands)
    success('개발 환경 시작 완료')
  } catch (err) {
    error('개발 환경 시작 실패')
    process.exit(1)
  }
}

// CLI 인수 처리
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const options = {
    nginx: args.includes('--nginx'),
  }
  main(options)
}

export default main
