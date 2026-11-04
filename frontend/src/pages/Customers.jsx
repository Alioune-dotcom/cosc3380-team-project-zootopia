import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable.jsx'

const EMPTY_FORM = {
  Email: '',
  Username: '',
  Password: '',
}

const COLUMNS = [
  { key: 'CustomerID', label: 'ID' },
  { key: 'Username', label: 'Username' },
  { key: 'Email', label: 'Email' },
  { key: 'TransactionCount', label: 'Purchases' },
  { key: 'LifetimeSpend', label: 'Lifetime spend', isMoney: true },
]

function Customers() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
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

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.Email) {
      setMessage({ type: 'error', text: 'Email is required' })
      return
    }

    if (!editingId && (!form.Username || !form.Password)) {
      setMessage({ type: 'error', text: 'Username and password required for new customers' })
      return
    }

    const url = editingId ? '/api/customers/' + editingId : '/api/customers'
    const method = editingId ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error })
        return
      }
      setMessage({ type: 'success', text: editingId ? 'Customer updated' : 'Customer added' })
      setForm(EMPTY_FORM)
      setEditingId(null)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  function handleEdit(row) {
    setForm({ Email: row.Email, Username: row.Username || '', Password: '' })
    setEditingId(row.CustomerID)
    setMessage(null)
  }

  async function handleDelete(row) {
    if (!window.confirm('Delete customer ' + row.Email + '?')) return
    try {
      const response = await fetch('/api/customers/' + row.CustomerID, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error })
        return
      }
      setMessage({ type: 'success', text: 'Customer deleted' })
      load()
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  return (
    <div>
      <h2>Customers</h2>
      {message ? <p className={'message ' + message.type}>{message.text}</p> : null}

      <form className="data-form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'Edit customer #' + editingId : 'Add customer'}</h3>
        <label>Email</label>
        <input name="Email" value={form.Email} onChange={handleChange} />
        {!editingId ? (
          <>
            <label>Username</label>
            <input name="Username" value={form.Username} onChange={handleChange} />
            <label>Password</label>
            <input name="Password" type="password" value={form.Password} onChange={handleChange} />
          </>
        ) : null}
        <div className="form-buttons">
          <button type="submit">{editingId ? 'Save changes' : 'Add customer'}</button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY_FORM)
                setEditingId(null)
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <DataTable
        columns={COLUMNS}
        rows={rows}
        rowKey="CustomerID"
        actions={(row) => (
          <>
            <button onClick={() => handleEdit(row)}>Edit</button>
            <button onClick={() => handleDelete(row)}>Delete</button>
          </>
        )}
      />
    </div>
  )
}

export default Customers
