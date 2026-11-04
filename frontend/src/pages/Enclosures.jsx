import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import DataTable from '../components/DataTable.jsx'

const EMPTY_FORM = {
  Name: '',
  HabitatType: '',
  Capacity: '',
  Location: '',
  Status: 'Open',
}

const COLUMNS = [
  { key: 'EnclosureID', label: 'ID' },
  { key: 'Name', label: 'Name' },
  { key: 'HabitatType', label: 'Habitat' },
  { key: 'Capacity', label: 'Capacity' },
  { key: 'AnimalCount', label: 'Animals' },
  { key: 'Location', label: 'Location' },
  { key: 'Status', label: 'Status' },
]

const ANIMAL_COLUMNS = [
  { key: 'AnimalID', label: 'ID' },
  { key: 'AnimalName', label: 'Name' },
  { key: 'Species', label: 'Species' },
  { key: 'Sex', label: 'Sex' },
  { key: 'SickLabel', label: 'Sick' },
]

function EnclosureDetail({ isManager }) {
  const { id } = useParams()
  const [enclosure, setEnclosure] = useState(null)
  const [animals, setAnimals] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/enclosures/' + id + '/animals')
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Could not load enclosure')
          return
        }
        setEnclosure(data.enclosure)
        setAnimals(
          data.animals.map((a) => ({
            ...a,
            SickLabel: a.IsSick ? 'Yes' : 'No',
          }))
        )
      } catch (err) {
        setError('Could not connect to the server')
      }
    }
    load()
  }, [id])

  if (error) return <p className="error">{error}</p>
  if (!enclosure) return <p>Loading...</p>

  const isQuarantine = enclosure.Name === 'Quarantine Ward'

  return (
    <div>
      <p><Link to="/staff/enclosures">← All enclosures</Link></p>
      <div className="page-card">
        <h1>{enclosure.Name}</h1>
        <p>
          {enclosure.HabitatType} · {enclosure.Location} · {enclosure.Status}
          {' · '}Capacity {enclosure.Capacity}
        </p>
        {isQuarantine ? (
          <div className="insight">
            Sick animals are kept here. To return one to exhibit, clear Sick on Animals and choose a habitat.
          </div>
        ) : null}
        <div className="kpi-row">
          <div className="stat-box">
            <strong>{animals.length}</strong>
            <span>Animals here</span>
          </div>
          <div className="stat-box">
            <strong>{animals.filter((a) => a.IsSick).length}</strong>
            <span>Marked sick</span>
          </div>
        </div>
      </div>

      <div className="page-card">
        <h3>Animals in this enclosure</h3>
        {animals.length === 0 ? (
          <p>No animals assigned here right now.</p>
        ) : (
          <DataTable columns={ANIMAL_COLUMNS} rows={animals} rowKey="AnimalID" />
        )}
        {isManager ? (
          <p style={{ marginTop: 12 }}>
            <Link to="/animals">Manage animals / sick flags →</Link>
          </p>
        ) : (
          <p style={{ marginTop: 12 }}>
            <Link to="/animals">Update sick status on Animals →</Link>
          </p>
        )}
      </div>
    </div>
  )
}

function EnclosureList({ isManager }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState(null)

  async function load() {
    try {
      const res = await fetch('/api/enclosures')
      setRows(await res.json())
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not load enclosures' })
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
    if (!form.Name || !form.HabitatType || !form.Capacity || !form.Location || !form.Status) {
      setMessage({ type: 'error', text: 'Please fill in every field' })
      return
    }

    const url = editingId ? '/api/enclosures/' + editingId : '/api/enclosures'
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
      setMessage({ type: 'success', text: editingId ? 'Enclosure updated' : 'Enclosure added' })
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
      HabitatType: row.HabitatType,
      Capacity: row.Capacity,
      Location: row.Location,
      Status: row.Status,
    })
    setEditingId(row.EnclosureID)
    setMessage(null)
  }

  async function handleDelete(row) {
    if (!window.confirm('Delete ' + row.Name + '?')) return
    try {
      const response = await fetch('/api/enclosures/' + row.EnclosureID, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error })
        return
      }
      setMessage({ type: 'success', text: 'Enclosure deleted' })
      load()
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  async function reopenAll() {
    try {
      const response = await fetch('/api/enclosures/reopen-all', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error })
        return
      }
      setMessage({ type: 'success', text: data.message })
      load()
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  return (
    <div>
      <h2>Enclosures</h2>
      <p style={{ color: 'var(--muted)' }}>
        Open an enclosure to see which animals are inside, including Quarantine Ward.
      </p>
      {message ? <p className={'message ' + message.type}>{message.text}</p> : null}

      {isManager ? (
        <>
          <p><button type="button" onClick={reopenAll}>Reopen all enclosures</button></p>
          <form className="data-form" onSubmit={handleSubmit}>
            <h3>{editingId ? 'Edit enclosure #' + editingId : 'Add enclosure'}</h3>
            <label>Name</label>
            <input name="Name" value={form.Name} onChange={handleChange} />
            <label>Habitat</label>
            <input name="HabitatType" value={form.HabitatType} onChange={handleChange} />
            <label>Capacity</label>
            <input name="Capacity" type="number" value={form.Capacity} onChange={handleChange} />
            <label>Location</label>
            <input name="Location" value={form.Location} onChange={handleChange} />
            <label>Status</label>
            <select name="Status" value={form.Status} onChange={handleChange}>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
            <div className="form-buttons">
              <button type="submit">{editingId ? 'Save changes' : 'Add enclosure'}</button>
              {editingId ? (
                <button type="button" onClick={() => { setForm(EMPTY_FORM); setEditingId(null) }}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </>
      ) : (
        <p style={{ color: 'var(--muted)' }}>View habitats below. Managers can add or edit enclosure records.</p>
      )}

      <DataTable
        columns={COLUMNS}
        rows={rows}
        rowKey="EnclosureID"
        actions={(row) => (
          <>
            <Link to={'/staff/enclosures/' + row.EnclosureID}>View animals</Link>
            {' '}
            {isManager ? (
              <>
                <button onClick={() => handleEdit(row)}>Edit</button>
                <button onClick={() => handleDelete(row)}>Delete</button>
              </>
            ) : null}
          </>
        )}
      />
    </div>
  )
}

function Enclosures() {
  const { id } = useParams()
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const isManager = user?.role === 'Manager'

  if (id) {
    return <EnclosureDetail isManager={isManager} />
  }
  return <EnclosureList isManager={isManager} />
}

export default Enclosures
