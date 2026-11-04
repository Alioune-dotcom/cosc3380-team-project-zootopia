// reusable table. give it columns + rows and it draws them
// columns: [{ key: 'AnimalName', label: 'Name' }, { key: 'DateOfBirth', label: 'Born', isDate: true }]
// rowKey: the field that's unique per row (like 'AnimalID')
// actions (optional): function that gets a row and returns buttons for it
function DataTable({ columns, rows, rowKey, actions }) {
  if (rows.length === 0) {
    return <p>No records found.</p>
  }

  // what to show in one cell
  function showValue(value, col) {
    if (value == null) return '—'
    if (col.isDate) return String(value).slice(0, 10) // 2012-11-11T06:00... -> 2012-11-11
    if (col.isMoney) return '$' + Number(value).toFixed(2) // "37.98" -> $37.98
    return String(value)
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.label}</th>
          ))}
          {actions ? <th>Actions</th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={typeof rowKey === 'function' ? rowKey(row) : row[rowKey] ?? index}>
            {columns.map((col) => (
              <td key={col.key}>{showValue(row[col.key], col)}</td>
            ))}
            {actions ? <td>{actions(row)}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default DataTable