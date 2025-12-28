#!/usr/bin/env node

/**
 * Package Update Script
 * package.json의 모든 의존성을 최신 버전으로 업데이트합니다.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(process.cwd(), 'package.json');

console.log('📦 Package Update Script\n');
console.log('========================================\n');

// Step 1: 백업 생성
console.log('1️⃣  백업 생성 중...');
const backupPath = path.join(process.cwd(), 'package.json.backup');
fs.copyFileSync(packageJsonPath, backupPath);
console.log('✅ package.json → package.json.backup\n');

// Step 2: npm-check-updates 설치 확인
console.log('2️⃣  npm-check-updates 확인 중...');
try {
  execSync('npx -v', { stdio: 'ignore' });
  console.log('✅ npx 사용 가능\n');
} catch (error) {
  console.error('❌ npx를 찾을 수 없습니다. Node.js를 다시 설치하세요.');
  process.exit(1);
}

// Step 3: 현재 outdated 패키지 확인
console.log('3️⃣  업데이트 가능한 패키지 확인 중...\n');
try {
  console.log('--- Outdated Packages ---');
  execSync('npm outdated || true', { stdio: 'inherit' });
  console.log('\n');
} catch (error) {
  // npm outdated는 업데이트가 있을 때 non-zero exit code를 반환하므로 무시
}

// Step 4: npm-check-updates로 업데이트
console.log('4️⃣  package.json 업데이트 중...');
try {
  execSync('npx npm-check-updates -u', { stdio: 'inherit' });
  console.log('✅ package.json 업데이트 완료\n');
} catch (error) {
  console.error('❌ 업데이트 실패:', error.message);
  console.log('⚠️  백업에서 복원 중...');
  fs.copyFileSync(backupPath, packageJsonPath);
  process.exit(1);
}

// Step 5: 설치 옵션 확인
console.log('========================================\n');
console.log('📌 다음 단계:\n');
console.log('  의존성을 설치하려면:');
console.log('    npm install\n');
console.log('  백업을 복원하려면:');
console.log('    mv package.json.backup package.json\n');
console.log('  변경사항을 확인하려면:');
console.log('    git diff package.json\n');

// 사용자에게 확인 요청
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('지금 npm install을 실행하시겠습니까? (y/N): ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    console.log('\n5️⃣  의존성 설치 중...');
    try {
      execSync('npm install', { stdio: 'inherit' });
      console.log('\n✅ 모든 패키지가 최신 버전으로 업데이트되었습니다!');
      
      // 백업 파일 삭제
      fs.unlinkSync(backupPath);
      console.log('🗑️  백업 파일 삭제됨\n');
    } catch (error) {
      console.error('\n❌ 설치 실패:', error.message);
      console.log('⚠️  package.json.backup에서 복원할 수 있습니다.');
    }
  } else {
    console.log('\n⏭️  나중에 npm install을 실행하세요.');
    console.log('💾 백업 파일: package.json.backup\n');
  }
  rl.close();
});

