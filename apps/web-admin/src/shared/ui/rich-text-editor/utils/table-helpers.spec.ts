import {
  getOrderedTableCells,
  insertRichTableAtSelection,
  richTableAddColumnLeft,
  richTableAddColumnRight,
  richTableAddRowAbove,
  richTableAddRowBelow,
  richTableDeleteColumn,
  richTableDeleteRow,
} from './table-helpers'

/** rows×cols 표를 만들어 각 셀에 (행,열) 좌표 텍스트를 채워 반환. */
function makeTable(rows: number, cols: number): HTMLTableElement {
  const table = document.createElement('table')
  const tbody = document.createElement('tbody')
  for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
    const tr = document.createElement('tr')
    for (let colIdx = 0; colIdx < cols; colIdx++) {
      const td = document.createElement('td')
      td.textContent = `${rowIdx},${colIdx}`
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
  table.appendChild(tbody)
  document.body.appendChild(table)
  return table
}

function cellAt(table: HTMLTableElement, row: number, col: number) {
  return table.querySelectorAll('tr')[row].cells[col]
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('getOrderedTableCells', () => {
  it('행 우선 순서로 모든 셀을 반환한다', () => {
    const table = makeTable(2, 2)
    const texts = getOrderedTableCells(table).map((cell) => cell.textContent)
    expect(texts).toEqual(['0,0', '0,1', '1,0', '1,1'])
  })
})

describe('행 추가', () => {
  it('richTableAddRowBelow는 같은 열 수의 행을 아래에 추가한다', () => {
    const table = makeTable(2, 3)
    richTableAddRowBelow(cellAt(table, 0, 0))
    const rows = table.querySelectorAll('tr')
    expect(rows.length).toBe(3)
    expect(rows[1].cells.length).toBe(3)
  })

  it('richTableAddRowAbove는 위에 행을 추가한다', () => {
    const table = makeTable(2, 2)
    richTableAddRowAbove(cellAt(table, 1, 0))
    const rows = table.querySelectorAll('tr')
    expect(rows.length).toBe(3)
    // 새 행은 원래 1행 위에 삽입되므로 인덱스 1
    expect(rows[1].cells[0].textContent).toBe('')
  })
})

describe('열 추가', () => {
  it('richTableAddColumnRight는 모든 행의 같은 위치 오른쪽에 셀을 추가한다', () => {
    const table = makeTable(2, 2)
    richTableAddColumnRight(cellAt(table, 0, 0))
    table.querySelectorAll('tr').forEach((row) => {
      expect(row.cells.length).toBe(3)
    })
  })

  it('richTableAddColumnLeft는 왼쪽에 셀을 추가한다', () => {
    const table = makeTable(1, 2)
    richTableAddColumnLeft(cellAt(table, 0, 1))
    const row = table.querySelectorAll('tr')[0]
    expect(row.cells.length).toBe(3)
    expect(row.cells[1].textContent).toBe('') // 새 셀이 인덱스 1에 들어감
  })
})

describe('행/열 삭제 + 마지막 1개 가드', () => {
  it('richTableDeleteRow는 행을 삭제하되 마지막 행은 남긴다', () => {
    const table = makeTable(2, 2)
    richTableDeleteRow(cellAt(table, 0, 0))
    expect(table.querySelectorAll('tr').length).toBe(1)
    // 마지막 행 가드
    richTableDeleteRow(cellAt(table, 0, 0))
    expect(table.querySelectorAll('tr').length).toBe(1)
  })

  it('richTableDeleteColumn은 열을 삭제하되 마지막 열은 남긴다', () => {
    const table = makeTable(2, 2)
    richTableDeleteColumn(cellAt(table, 0, 0))
    table.querySelectorAll('tr').forEach((row) => {
      expect(row.cells.length).toBe(1)
    })
    // 마지막 열 가드
    richTableDeleteColumn(cellAt(table, 0, 0))
    expect(table.querySelectorAll('tr')[0].cells.length).toBe(1)
  })
})

describe('insertRichTableAtSelection', () => {
  it('선택이 없으면 에디터 끝에 표와 후행 <p>를 추가한다', () => {
    const editor = document.createElement('div')
    document.body.appendChild(editor)
    const sel = window.getSelection()
    sel?.removeAllRanges()

    insertRichTableAtSelection(editor, 2, 3)

    const table = editor.querySelector('table.rich-table')
    expect(table).not.toBeNull()
    expect(table!.querySelectorAll('tr').length).toBe(2)
    expect(table!.querySelectorAll('tr')[0].cells.length).toBe(3)
    // 표 바로 뒤에 빈 단락이 따라온다
    expect(table!.nextElementSibling?.tagName).toBe('P')
  })
})
