// 올바르게 export default까지만 잘라내는 스크립트
const fs = require('fs');

const filePath = 'web-admin/src/pages/events/events.page.ui.tsx';

// UTF-8로 읽기
const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
const lines = content.split('\n');

// export default EventsCatalogPage 라인 찾기
let exportIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'export default EventsCatalogPage') {
    exportIndex = i;
    break;
  }
}

if (exportIndex === -1) {
  console.log('❌ export default 라인을 찾을 수 없습니다.');
  process.exit(1);
}

// export default까지만 유지
const cleanedContent = lines.slice(0, exportIndex + 1).join('\n') + '\n';

// UTF-8로 저장
fs.writeFileSync(filePath, cleanedContent, { encoding: 'utf-8' });

console.log('✅ 파일 정리 완료!');
console.log(`📊 원본 줄 수: ${lines.length}`);
console.log(`📊 정리 후 줄 수: ${exportIndex + 1}`);
console.log(`🗑️  삭제된 줄 수: ${lines.length - exportIndex - 1}`);

