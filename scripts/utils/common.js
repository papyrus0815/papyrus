#!/usr/bin/env node

import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 명령어를 실행하는 유틸리티 함수
 * @param {string} command - 실행할 명령어
 * @param {string[]} args - 명령어 인수
 * @param {object} options - 실행 옵션
 * @returns {Promise<number>} - 종료 코드
 */
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: true,
      ...options,
    }

    console.log(`🚀 실행 중: ${command} ${args.join(' ')}`)

    const child = spawn(command, args, defaultOptions)

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ 완료: ${command}`)
        resolve(code)
      } else {
        console.error(`❌ 실패: ${command} (종료 코드: ${code})`)
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    child.on('error', (error) => {
      console.error(`❌ 오류: ${error.message}`)
      reject(error)
    })
  })
}

/**
 * 여러 명령어를 순차적으로 실행
 * @param {Array<{command: string, args: string[], options?: object}>} commands
 */
async function runCommands(commands) {
  for (const { command, args = [], options = {} } of commands) {
    try {
      await runCommand(command, args, options)
    } catch (error) {
      console.error(`❌ 명령어 실행 실패: ${command}`)
      process.exit(1)
    }
  }
}

/**
 * npm 스크립트 실행
 * @param {string} script - npm 스크립트 이름
 * @param {object} options - 실행 옵션
 */
function runNpmScript(script, options = {}) {
  return runCommand('npm', ['run', script], options)
}

/**
 * npx 명령어 실행
 * @param {string} command - npx 명령어
 * @param {string[]} args - 인수
 * @param {object} options - 실행 옵션
 */
function runNpx(command, args = [], options = {}) {
  return runCommand('npx', [command, ...args], options)
}

/**
 * 환경 변수 설정 확인
 * @param {string} name - 환경 변수 이름
 * @param {string} defaultValue - 기본값
 * @returns {string}
 */
function getEnvVar(name, defaultValue = '') {
  const value = process.env[name]
  if (!value && !defaultValue) {
    console.warn(`⚠️  환경 변수 ${name}이 설정되지 않았습니다.`)
  }

  return value || defaultValue
}

/**
 * 프로젝트 루트 경로 반환
 * @returns {string}
 */
function getProjectRoot() {
  return path.resolve(__dirname, '../..')
}

/**
 * 성공 메시지 출력
 * @param {string} message
 */
function success(message) {
  console.log(`✅ ${message}`)
}

/**
 * 에러 메시지 출력
 * @param {string} message
 */
function error(message) {
  console.error(`❌ ${message}`)
}

/**
 * 정보 메시지 출력
 * @param {string} message
 */
function info(message) {
  console.log(`ℹ️  ${message}`)
}

export {
  runCommand,
  runCommands,
  runNpmScript,
  runNpx,
  getEnvVar,
  getProjectRoot,
  success,
  error,
  info,
}
