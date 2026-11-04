import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable.jsx'

const EMPTY_FORM = {
  Date: '',
  Reason: '',
  Scope: 'FullZoo',
  EnclosureID: '',
}

const COLUMNS = [
  { key: 'ClosureID', label: 'ID' },
  { key: 'Date', label: 'Date', isDate: true },
  { key: 'Reason', label: 'Reason' },
  { key: 'Scope', label: 'Scope' },
  { key: 'EnclosureName', label: 'Enclosure' },
]

function Closures() {
  const [rows, setRows] = useState([])
  const [enclosures, setEnclosures] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState(null)

  async function load() {
    try {
      const [cRes, eRes] = await Promise.all([
        fetch('/api/closures'),
        fetch('/api/enclosures'),
      ])
      const closures = await cRes.json()
      const encs = await eRes.json()
      setEnclosures(encs)
      setRows(
        closures.map((c) => ({
          ...c,
          EnclosureName:
            c.Scope === 'FullZoo'
              ? '—'
              : encs.find((e) => e.EnclosureID === c.EnclosureID)?.Name || c.EnclosureID,
        }))
      )
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not load closures' })
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
    if (!form.Date || !form.Reason || !form.Scope) {
      setMessage({ type: 'error', text: 'Please fill in required fields' })
      return
    }
    if (form.Scope === 'Enclosure' && !form.EnclosureID) {
      setMessage({ type: 'error', text: 'Pick an enclosure for Enclosure scope' })
      return
    }

    const url = editingId ? '/api/closures/' + editingId : '/api/closures'
    const method = editingId ? 'PUT' : 'POST'
    const body = {
      Date: form.Date,
      Reason: form.Reason,
      Scope: form.Scope,
      EnclosureID: form.Scope === 'Enclosure' ? form.EnclosureID : null,
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error })
        return
      }
      setMessage({ type: 'success', text: editingId ? 'Closure updated' : 'Closure recorded' })
      setForm(EMPTY_FORM)
      setEditingId(null)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  function handleEdit(row) {
    setForm({
      Date: row.Date ? String(row.Date).slice(0, 10) : '',
      Reason: row.Reason,
      Scope: row.Scope,
      EnclosureID: row.EnclosureID || '',
    })
    setEditingId(row.ClosureID)
    setMessage(null)
  }

  async function handleDelete(row) {
    if (!window.confirm('Delete this closure record?')) return
    try {
      const response = await fetch('/api/closures/' + row.ClosureID, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error })
        return
      }
      setMessage({ type: 'success', text: 'Closure deleted' })
      load()
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  return (
    <div>
      <h2>Closures</h2>
      <p style={{ color: 'var(--muted)' }}>
        Data entry for park operations: record or edit a closure here (and reopen habitats from Enclosures).
        The <strong>Closures report</strong> is for filtered analysis / KPIs — generate it when you need numbers,
        not for day-to-day editing.
      </p>
      {message ? <p className={'message ' + message.type}>{message.text}</p> : null}

      <form className="data-form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'Edit closure #' + editingId : 'Record a closure'}</h3>
        <label>Date</label>
        <input type="date" name="Date" value={form.Date} onChange={handleChange} />
        <label>Reason</label>
        <input name="Reason" value={form.Reason} onChange={handleChange} />
        <label>Scope</label>
        <select name="Scope" value={form.Scope} onChange={handleChange}>
          <option value="FullZoo">Full zoo</option>
          <option value="Enclosure">Enclosure</option>
        </select>
        {form.Scope === 'Enclosure' ? (
          <>
            <label>Enclosure</label>
            <select name="EnclosureID" value={form.EnclosureID} onChange={handleChange}>
              <option value="">-- pick one --</option>
              {enclosures.map((en) => (
                <option key={en.EnclosureID} value={en.EnclosureID}>{en.Name}</option>
              ))}
            </select>
          </>
        ) : null}
        <div className="form-buttons">
          <button type="submit">{editingId ? 'Save changes' : 'Add closure'}</button>
          {editingId ? (
            <button type="button" onClick={() => { setForm(EMPTY_FORM); setEditingId(null) }}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <DataTable
        columns={COLUMNS}
        rows={rows}
        rowKey="ClosureID"
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

export default Closures
