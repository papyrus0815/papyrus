/**
 * biography·deathNote·notes 등 텍스트 필드의 특수문자 자동 치환.
 *
 *   〈X〉 → "X"        (인용·제목 표시)
 *   【X】 X… → X. X…  (소제목 → 한 문장)
 *   ① ② ③ … → (1) (2) (3) …
 *
 * 대상 필드:
 *   - Person.biography
 *   - Person.deathNote
 *   - Person.deathCause
 *   - PersonStats.notes
 *   - SovereignReign.notes
 *   - SovereignReign.endReasonDetail
 *   - Dynasty.description
 *   - HistoricalCountry.description
 *   - HistoricalCountry.history
 *   - PersonSpouse.note
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

function cleanText(s: string | null | undefined): string | null {
  if (s == null) return null
  let out = s
  // 1. 【소제목】 → 소제목.
  out = out.replace(/【([^】]+)】\s*/g, '$1. ')
  // 2. 〈X〉 → "X"
  out = out.replace(/〈/g, '"')
  out = out.replace(/〉/g, '"')
  // 3. 원문자 ①~⑩ → (1)~(10)
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
  // 4. 중복 공백 정리 (개행은 보존)
  out = out.replace(/[ \t]{2,}/g, ' ')
  return out
}

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    let touched = 0

    // ── Person ──────────────────────────────────────────────────────────
    const persons = await prisma.person.findMany({
      select: { id: true, biography: true, deathNote: true, deathCause: true },
    })
    for (const p of persons) {
      const data: any = {}
      const newBio = cleanText(p.biography)
      const newNote = cleanText(p.deathNote)
      const newCause = cleanText(p.deathCause)
      if (newBio !== p.biography) data.biography = newBio
      if (newNote !== p.deathNote) data.deathNote = newNote
      if (newCause !== p.deathCause) data.deathCause = newCause
      if (Object.keys(data).length > 0) {
        await prisma.person.update({ where: { id: p.id }, data })
        touched++
      }
    }
    console.log(`Person 텍스트 정리: ${touched}건 업데이트`)

    // ── PersonStats ─────────────────────────────────────────────────────
    let cnt = 0
    const stats = await prisma.personStats.findMany({
      select: { id: true, notes: true },
    })
    for (const s of stats) {
      const newNotes = cleanText(s.notes)
      if (newNotes !== s.notes) {
        await prisma.personStats.update({ where: { id: s.id }, data: { notes: newNotes } })
        cnt++
      }
    }
    console.log(`PersonStats notes 정리: ${cnt}건`)

    // ── SovereignReign ──────────────────────────────────────────────────
    cnt = 0
    const reigns = await prisma.sovereignReign.findMany({
      select: { id: true, notes: true, endReasonDetail: true },
    })
    for (const r of reigns) {
      const data: any = {}
      const newNotes = cleanText(r.notes)
      const newEnd = cleanText(r.endReasonDetail)
      if (newNotes !== r.notes) data.notes = newNotes
      if (newEnd !== r.endReasonDetail) data.endReasonDetail = newEnd
      if (Object.keys(data).length > 0) {
        await prisma.sovereignReign.update({ where: { id: r.id }, data })
        cnt++
      }
    }
    console.log(`SovereignReign notes·endReasonDetail 정리: ${cnt}건`)

    // ── Dynasty ────────────────────────────────────────────────────────
    cnt = 0
    const dynasties = await prisma.dynasty.findMany({
      select: { id: true, description: true },
    })
    for (const d of dynasties) {
      const newDesc = cleanText(d.description)
      if (newDesc !== d.description) {
        await prisma.dynasty.update({ where: { id: d.id }, data: { description: newDesc } })
        cnt++
      }
    }
    console.log(`Dynasty description 정리: ${cnt}건`)

    // ── HistoricalCountry ───────────────────────────────────────────────
    cnt = 0
    const hcs = await prisma.historicalCountry.findMany({
      select: { id: true, description: true, history: true },
    })
    for (const hc of hcs) {
      const data: any = {}
      const newDesc = cleanText(hc.description)
      const newHist = cleanText(hc.history)
      if (newDesc !== hc.description) data.description = newDesc
      if (newHist !== hc.history) data.history = newHist
      if (Object.keys(data).length > 0) {
        await prisma.historicalCountry.update({ where: { id: hc.id }, data })
        cnt++
      }
    }
    console.log(`HistoricalCountry description·history 정리: ${cnt}건`)

    // ── PersonSpouse ────────────────────────────────────────────────────
    cnt = 0
    const spouses = await prisma.personSpouse.findMany({
      select: { id: true, note: true },
    })
    for (const s of spouses) {
      const newNote = cleanText(s.note)
      if (newNote !== s.note) {
        await prisma.personSpouse.update({ where: { id: s.id }, data: { note: newNote } })
        cnt++
      }
    }
    console.log(`PersonSpouse note 정리: ${cnt}건`)

    console.log(`\n✅ 특수문자 치환 완료`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
