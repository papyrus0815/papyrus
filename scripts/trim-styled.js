// 1584줄까지만 유지하는 스크립트
const fs = require('fs');

const filePath = 'web-admin/src/pages/events/events.page.ui.tsx';

// UTF-8로 읽기
const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
const lines = content.split('\n');

// 1584줄까지만 유지
const cleanedContent = lines.slice(0, 1584).join('\n') + '\n';

// UTF-8로 저장
fs.writeFileSync(filePath, cleanedContent, { encoding: 'utf-8' });

console.log('✅ 파일 정리 완료!');
console.log(`📊 원본 줄 수: ${lines.length}`);
console.log(`📊 정리 후 줄 수: 1584`);
console.log(`🗑️  삭제된 줄 수: ${lines.length - 1584}`);

