import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable.jsx'

const EMPTY_FORM = {
  Name: '',
  Type: 'Talk',
  Schedule: '',
  DurationMinutes: '',
  EnclosureID: '',
  HostEmployeeID: '',
}

const COLUMNS = [
  { key: 'AttractionID', label: 'ID' },
  { key: 'Name', label: 'Name' },
  { key: 'Type', label: 'Type' },
  { key: 'Schedule', label: 'Schedule' },
  { key: 'DurationMinutes', label: 'Minutes' },
  { key: 'EnclosureName', label: 'Enclosure' },
  { key: 'HostName', label: 'Host' },
]

function Attractions() {
  const [rows, setRows] = useState([])
  const [enclosures, setEnclosures] = useState([])
  const [zookeepers, setZookeepers] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState(null)

  async function load() {
    try {
      const [aRes, eRes, empRes] = await Promise.all([
        fetch('/api/attractions'),
        fetch('/api/enclosures'),
        fetch('/api/employees'),
      ])
      const attractions = await aRes.json()
      const encs = await eRes.json()
      const employees = await empRes.json()
      setEnclosures(encs)
      // only zookeepers host talks and shows
      setZookeepers(Array.isArray(employees) ? employees.filter((emp) => emp.Role === 'Zookeeper') : [])
      setRows(
        attractions.map((a) => ({
          ...a,
          Schedule: a.Schedule ? String(a.Schedule).slice(0, 16).replace('T', ' ') : '',
        }))
      )
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not load attractions' })
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
    if (!form.Name || !form.Type || !form.Schedule || !form.EnclosureID) {
      setMessage({ type: 'error', text: 'Please fill in every field' })
      return
    }

    const url = editingId ? '/api/attractions/' + editingId : '/api/attractions'
    const method = editingId ? 'PUT' : 'POST'
    const schedule = form.Schedule.length === 16 ? form.Schedule.replace('T', ' ') + ':00' : form.Schedule

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, Schedule: schedule }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error })
        return
      }
      setMessage({ type: 'success', text: editingId ? 'Attraction updated' : 'Attraction added' })
      setForm(EMPTY_FORM)
      setEditingId(null)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  function handleEdit(row) {
    setForm({
      Name: row.Name,
      Type: row.Type,
      Schedule: String(row.Schedule).slice(0, 16).replace(' ', 'T'),
      DurationMinutes: row.DurationMinutes ?? '',
      EnclosureID: row.EnclosureID,
      HostEmployeeID: row.HostEmployeeID ?? '',
    })
    setEditingId(row.AttractionID)
    setMessage(null)
  }

  async function handleDelete(row) {
    if (!window.confirm('Delete ' + row.Name + '?')) return
    try {
      const response = await fetch('/api/attractions/' + row.AttractionID, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error })
        return
      }
      setMessage({ type: 'success', text: 'Attraction deleted' })
      load()
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  return (
    <div>
      <h2>Attractions</h2>
      {message ? <p className={'message ' + message.type}>{message.text}</p> : null}

      <form className="data-form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'Edit attraction #' + editingId : 'Add attraction'}</h3>
        <label>Name</label>
        <input name="Name" value={form.Name} onChange={handleChange} />
        <label>Type</label>
        <select name="Type" value={form.Type} onChange={handleChange}>
          <option value="Talk">Talk</option>
          <option value="Show">Show</option>
        </select>
        <label>Schedule</label>
        <input type="datetime-local" name="Schedule" value={form.Schedule} onChange={handleChange} />
        <label>Duration (minutes, optional)</label>
        <input type="number" min="1" name="DurationMinutes" value={form.DurationMinutes} onChange={handleChange} />
        <label>Enclosure</label>
        <select name="EnclosureID" value={form.EnclosureID} onChange={handleChange}>
          <option value="">-- pick one --</option>
          {enclosures.map((en) => (
            <option key={en.EnclosureID} value={en.EnclosureID}>{en.Name}</option>
          ))}
        </select>
        <label>Host (optional)</label>
        <select name="HostEmployeeID" value={form.HostEmployeeID} onChange={handleChange}>
          <option value="">-- no host --</option>
          {zookeepers.map((z) => (
            <option key={z.EmployeeID} value={z.EmployeeID}>{z.FirstName} {z.LastName}</option>
          ))}
        </select>
        <div className="form-buttons">
          <button type="submit">{editingId ? 'Save changes' : 'Add attraction'}</button>
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
        rowKey="AttractionID"
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

export default Attractions
