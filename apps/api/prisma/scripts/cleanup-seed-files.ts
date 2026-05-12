/**
 * 시드 .ts 파일 내 특수문자 치환 (DB와 동일 규칙).
 *   〈 → "
 *   〉 → "
 *   【X】 → X.
 *   ①~⑩ → (1)~(10)
 *
 * Node로 실행 (`npx ts-node ...`).
 */
import * as fs from 'fs'
import * as path from 'path'

const SEEDS_DIR = path.resolve(__dirname, '..', 'seeds')

function clean(s: string): string {
  let out = s
  out = out.replace(/【([^】]+)】\s*/g, '$1. ')
  out = out.replace(/〈/g, '"')
  out = out.replace(/〉/g, '"')
  const circled: Record<string, string> = {
    '①': '(1)',
    '②': '(2)',
    '③': '(3)',
    '④': '(4)',
    '⑤': '(5)',
    '⑥': '(6)',
    '⑦': '(7)',
    '⑧': '(8)',
    '⑨': '(9)',
    '⑩': '(10)',
  }
  for (const [k, v] of Object.entries(circled)) {
    out = out.split(k).join(v)
  }
  return out
}

function main() {
  const files = fs.readdirSync(SEEDS_DIR).filter((f) => f.endsWith('.ts'))
  let changed = 0
  for (const f of files) {
    const full = path.join(SEEDS_DIR, f)
    const orig = fs.readFileSync(full, 'utf8')
    if (!/[〈〉【】①②③④⑤⑥⑦⑧⑨⑩]/.test(orig)) continue
    const next = clean(orig)
    if (next !== orig) {
      fs.writeFileSync(full, next, 'utf8')
      console.log(`  ✅ ${f}`)
      changed++
    }
  }
  console.log(`\n총 ${changed}개 시드 파일 정리`)
}

main()
