#!/usr/bin/env node

/**
 * Renderer 폴더 복사 스크립트
 * src/renderer/ 폴더의 모든 파일을 dist/renderer/로 복사합니다.
 */

const fs = require('fs')
const path = require('path')

/**
 * 디렉토리와 파일을 재귀적으로 복사
 */
function copyRecursive(src, dest) {
  const stat = fs.statSync(src)

  if (stat.isDirectory()) {
    // 디렉토리인 경우
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }

    // 하위 파일/폴더를 모두 복사
    fs.readdirSync(src).forEach((file) => {
      copyRecursive(path.join(src, file), path.join(dest, file))
    })
  } else {
    // 파일인 경우 직접 복사
    fs.copyFileSync(src, dest)
  }
}

// 경로 설정
const projectRoot = path.join(__dirname, '..')
const srcDir = path.join(projectRoot, 'src', 'renderer')
const destDir = path.join(projectRoot, 'dist', 'renderer')
const compiledTsDir = path.join(projectRoot, 'dist', 'renderer', 'ts')

// 1. TypeScript로 컴파일된 파일들을 js 폴더로 복사
if (fs.existsSync(compiledTsDir)) {
  const jsDir = path.join(destDir, 'js')
  if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir, { recursive: true })
  }
  
  // ts 폴더의 .js 파일들과 하위 폴더를 js 폴더로 재귀적으로 복사
  // ES 모듈 import 경로에 .js 확장자 추가
  if (fs.existsSync(compiledTsDir)) {
    function copyJsFiles(src, dest) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true })
      }
      
      fs.readdirSync(src).forEach((item) => {
        const srcPath = path.join(src, item)
        const destPath = path.join(dest, item)
        const stat = fs.statSync(srcPath)
        
        if (stat.isDirectory()) {
          copyJsFiles(srcPath, destPath)
        } else if (item.endsWith('.js')) {
          let content = fs.readFileSync(srcPath, 'utf-8')
          
          // ES 모듈 import 경로에 .js 확장자 추가
          // './module' -> './module.js'
          // './utils/constants' -> './utils/constants.js'
          content = content.replace(
            /from\s+['"]\.\/([^'"]+)['"]/g,
            (match, modulePath) => {
              // 이미 .js 확장자가 있으면 그대로 유지
              if (modulePath.endsWith('.js')) {
                return match
              }
              return `from './${modulePath}.js'`
            }
          )
          
          // import './module' -> import './module.js'
          content = content.replace(
            /import\s+['"]\.\/([^'"]+)['"]/g,
            (match, modulePath) => {
              // 이미 .js 확장자가 있으면 그대로 유지
              if (modulePath.endsWith('.js')) {
                return match
              }
              return `import './${modulePath}.js'`
            }
          )
          
          fs.writeFileSync(destPath, content, 'utf-8')
        }
      })
    }
    
    copyJsFiles(compiledTsDir, jsDir)
    console.log('✅ TypeScript 컴파일된 파일을 js 폴더로 복사 및 ES 모듈 경로 수정 완료')
  }
}

// 2. 정적 파일들 (HTML, CSS 등) 복사
const staticFiles = ['index.html', 'css']
staticFiles.forEach((item) => {
  const srcPath = path.join(srcDir, item)
  const destPath = path.join(destDir, item)
  
  if (fs.existsSync(srcPath)) {
    if (fs.statSync(srcPath).isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true })
      }
      copyRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
})

console.log('✅ Renderer 폴더 복사 완료')
console.log(`   소스: ${srcDir}`)
console.log(`   대상: ${destDir}`)
