/**
 * rich-text-editor 표(table) 관련 순수 DOM 헬퍼.
 * React 상태/props에 의존하지 않으므로 컴포넌트 밖으로 분리해 단위 테스트 가능하게 둔다.
 * (원본: rich-text-editor.tsx 인라인 정의를 동작 변경 없이 추출)
 */

export const TABLE_GRID_MAX = 8

export function getTableCellFromSelection(
  editor: HTMLElement,
): HTMLTableCellElement | null {
  const sel = window.getSelection()
  if (!sel?.rangeCount) return null
  const range = sel.getRangeAt(0)
  let node: Node | null = range.commonAncestorContainer
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
  while (node && node !== editor) {
    const name = node.nodeName
    if (name === 'TD' || name === 'TH') return node as HTMLTableCellElement
    node = node.parentNode
  }
  return null
}

export function focusTableCell(cell: HTMLTableCellElement) {
  if (!cell.textContent?.trim() && cell.childNodes.length === 0) {
    cell.innerHTML = '<br>'
  }
  const range = document.createRange()
  const first = cell.firstChild
  if (first) {
    range.setStart(first, 0)
  } else {
    range.setStart(cell, 0)
  }
  range.collapse(true)
  const sel = window.getSelection()
  if (sel) {
    sel.removeAllRanges()
    sel.addRange(range)
  }
}

export function getOrderedTableCells(
  table: HTMLTableElement,
): HTMLTableCellElement[] {
  const out: HTMLTableCellElement[] = []
  table.querySelectorAll('tr').forEach((tableRow) => {
    Array.from(tableRow.cells).forEach((tableCell) => out.push(tableCell))
  })
  return out
}

export function insertRichTableAtSelection(
  editor: HTMLElement,
  rows: number,
  cols: number,
): void {
  const table = document.createElement('table')
  table.className = 'rich-table'
  const tbody = document.createElement('tbody')
  for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
    const tr = document.createElement('tr')
    for (let colIdx = 0; colIdx < cols; colIdx++) {
      const td = document.createElement('td')
      td.innerHTML = '<br>'
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
  table.appendChild(tbody)
  const paragraph = document.createElement('p')
  paragraph.innerHTML = '<br>'
  const sel = window.getSelection()
  if (!sel?.rangeCount) {
    editor.appendChild(table)
    table.after(paragraph)
    const first = table.querySelector('td')
    if (first) focusTableCell(first as HTMLTableCellElement)
    return
  }
  const range = sel.getRangeAt(0)
  if (!editor.contains(range.commonAncestorContainer)) {
    editor.appendChild(table)
    table.after(paragraph)
    const first = table.querySelector('td')
    if (first) focusTableCell(first as HTMLTableCellElement)
    return
  }
  range.deleteContents()
  range.insertNode(table)
  table.after(paragraph)
  const firstTd = table.querySelector('td')
  if (firstTd) focusTableCell(firstTd as HTMLTableCellElement)
}

export function richTableAddRowAbove(cell: HTMLTableCellElement) {
  const tr = cell.parentElement as HTMLTableRowElement
  const colCount = tr.cells.length
  const newTr = document.createElement('tr')
  for (let colIdx = 0; colIdx < colCount; colIdx++) {
    const td = document.createElement('td')
    td.innerHTML = '<br>'
    newTr.appendChild(td)
  }
  tr.before(newTr)
}

export function richTableAddRowBelow(cell: HTMLTableCellElement) {
  const tr = cell.parentElement as HTMLTableRowElement
  const colCount = tr.cells.length
  const newTr = document.createElement('tr')
  for (let colIdx = 0; colIdx < colCount; colIdx++) {
    const td = document.createElement('td')
    td.innerHTML = '<br>'
    newTr.appendChild(td)
  }
  tr.after(newTr)
}

export function richTableAddColumnLeft(cell: HTMLTableCellElement) {
  const idx = cell.cellIndex
  const table = cell.closest('table')!
  table.querySelectorAll('tr').forEach((tableRow) => {
    const td = document.createElement('td')
    td.innerHTML = '<br>'
    const ref = tableRow.cells[idx]
    if (ref) ref.before(td)
  })
}

export function richTableAddColumnRight(cell: HTMLTableCellElement) {
  const idx = cell.cellIndex
  const table = cell.closest('table')!
  table.querySelectorAll('tr').forEach((tableRow) => {
    const td = document.createElement('td')
    td.innerHTML = '<br>'
    const ref = tableRow.cells[idx]
    if (ref) ref.after(td)
  })
}

export function richTableDeleteRow(cell: HTMLTableCellElement) {
  const tr = cell.parentElement as HTMLTableRowElement
  const tbody = tr.parentElement!
  if (tbody.querySelectorAll('tr').length <= 1) return
  tr.remove()
}

export function richTableDeleteColumn(cell: HTMLTableCellElement) {
  const idx = cell.cellIndex
  const table = cell.closest('table')!
  const firstRow = table.querySelector('tr')
  if (!firstRow || firstRow.cells.length <= 1) return
  table.querySelectorAll('tr').forEach((tableRow) => {
    if (tableRow.cells[idx]) tableRow.deleteCell(idx)
  })
}
