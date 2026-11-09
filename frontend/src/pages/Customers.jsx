import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable.jsx'

// manager page: view customers and deactivate accounts
// customers create their own accounts on the Sign up page, so there's no "add customer" here
// deactivate = soft delete (IsDeleted = 1), so their past purchases stay in reports

const COLUMNS = [
  { key: 'CustomerID', label: 'ID' },
  { key: 'Username', label: 'Username' },
  { key: 'Email', label: 'Email' },
  { key: 'TransactionCount', label: 'Purchases' },
  { key: 'LifetimeSpend', label: 'Lifetime spend', isMoney: true },
]

function Customers() {
  const [rows, setRows] = useState([])
  const [message, setMessage] = useState(null)

  async function load() {
    try {
      const res = await fetch('/api/customers')
      setRows(await res.json())
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not load customers' })
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDeactivate(row) {
    if (!window.confirm('Deactivate ' + row.Email + '? They will no longer be able to log in.')) return
    try {
      const response = await fetch('/api/customers/' + row.CustomerID, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error })
        return
      }
      setMessage({ type: 'success', text: row.Email + ' deactivated' })
      load()
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  return (
    <div>
      <h2>Customers</h2>
      <p style={{ color: 'var(--muted)' }}>
        Customers create their own accounts online. You can view them and deactivate accounts.
      </p>
      {message ? <p className={'message ' + message.type}>{message.text}</p> : null}

      <DataTable
        columns={COLUMNS}
        rows={rows}
        rowKey="CustomerID"
        actions={(row) => (
          <button onClick={() => handleDeactivate(row)}>Deactivate</button>
        )}
      />
    </div>
  )
}

export default Customers
