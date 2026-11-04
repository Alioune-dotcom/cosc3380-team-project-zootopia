import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable.jsx'

// animals page: list + add / edit / delete
// uses /api/animals, /api/species, /api/enclosures

// blank form. names match what the backend expects
const EMPTY_FORM = {
  Name: '',
  SpeciesID: '',
  EnclosureID: '',
  Sex: '',
  DateOfBirth: '',
  AcquisitionDate: '',
  IsSick: false,
}

// table columns. key = field name the backend sends back
const COLUMNS = [
  { key: 'AnimalID', label: 'ID' },
  { key: 'AnimalName', label: 'Name' },
  { key: 'Species', label: 'Species' },
  { key: 'Enclosure', label: 'Enclosure' },
  { key: 'Sex', label: 'Sex' },
  { key: 'SickLabel', label: 'Sick' },
  { key: 'DateOfBirth', label: 'Born', isDate: true },
  { key: 'AcquisitionDate', label: 'Arrived', isDate: true },
]

function Animals() {
  const [animals, setAnimals] = useState([])
  const [species, setSpecies] = useState([])
  const [enclosures, setEnclosures] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null) // null = adding, a number = editing that animal
  const [message, setMessage] = useState(null)     // { type: 'success' or 'error', text: '...' }

  // get the animal list from the backend
  async function loadAnimals() {
    try {
      const response = await fetch('/api/animals')
      const data = await response.json()
      setAnimals(
        data.map((a) => ({
          ...a,
          SickLabel: a.IsSick ? 'Yes' : 'No',
        }))
      )
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not load animals' })
    }
  }

  // runs once when the page opens
  useEffect(() => {
    // options for the species + enclosure dropdowns
    async function loadDropdowns() {
      const speciesRes = await fetch('/api/species')
      setSpecies(await speciesRes.json())
      const enclosureRes = await fetch('/api/enclosures')
      setEnclosures(await enclosureRes.json())
    }

    loadAnimals()
    loadDropdowns()
  }, []) // [] = only run once, not every redraw

  function handleChange(e) {
    const { name, type, checked, value } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  // add or save changes
  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.Name || !form.SpeciesID || !form.EnclosureID || !form.Sex || !form.AcquisitionDate) {
      setMessage({ type: 'error', text: 'Please fill in every field (birth date is optional)' })
      return
    }

    const picked = enclosures.find((e) => String(e.EnclosureID) === String(form.EnclosureID))
    if (!form.IsSick && picked && picked.Name === 'Quarantine Ward') {
      setMessage({
        type: 'error',
        text: 'Pick a normal habitat when the animal is not sick (quarantine is for sick animals only)',
      })
      return
    }

    // editing -> PUT /api/animals/5, adding -> POST /api/animals
    const url = editingId ? '/api/animals/' + editingId : '/api/animals'
    const method = editingId ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()

      // backend said no, like the enclosure capacity trigger
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error })
        return
      }

      setMessage({ type: 'success', text: editingId ? 'Animal updated' : 'Animal added' })
      setForm(EMPTY_FORM)
      setEditingId(null)
      loadAnimals() // refresh the table
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  // fill the form with this animal so it can be changed
  async function handleEdit(row) {
    try {
      // the list doesn't have the species/enclosure IDs, so get the full animal
      const response = await fetch('/api/animals/' + row.AnimalID)
      const animal = await response.json()

      setForm({
        Name: animal.Name,
        SpeciesID: animal.SpeciesID,
        EnclosureID: animal.EnclosureID,
        Sex: animal.Sex,
        DateOfBirth: animal.DateOfBirth ? animal.DateOfBirth.slice(0, 10) : '',
        AcquisitionDate: animal.AcquisitionDate.slice(0, 10),
        IsSick: !!animal.IsSick,
      })
      setEditingId(row.AnimalID)
      setMessage(null)
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not load that animal' })
    }
  }

  async function handleDelete(row) {
    // ask first so nobody deletes by accident
    if (!window.confirm('Delete ' + row.AnimalName + '?')) return

    try {
      const response = await fetch('/api/animals/' + row.AnimalID, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error })
        return
      }

      setMessage({ type: 'success', text: row.AnimalName + ' deleted' })
      loadAnimals()
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  // stop editing, go back to "add" mode
  function handleCancel() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setMessage(null)
  }

  return (
    <div>
      <h2>Animals</h2>
      <p style={{ color: 'var(--muted)' }}>
        Marking an animal sick moves them to Quarantine Ward and notifies managers. To recover,
        clear Sick and choose a habitat — healthy animals cannot stay in quarantine.
      </p>

      {message ? <p className={'message ' + message.type}>{message.text}</p> : null}

      <form className="data-form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'Edit animal #' + editingId : 'Add an animal'}</h3>

        <label>Name</label>
        <input name="Name" value={form.Name} onChange={handleChange} />

        <label>Species</label>
        <select name="SpeciesID" value={form.SpeciesID} onChange={handleChange}>
          <option value="">-- pick one --</option>
          {species.map((s) => (
            <option key={s.SpeciesID} value={s.SpeciesID}>{s.CommonName}</option>
          ))}
        </select>

        <label>Enclosure</label>
        <select name="EnclosureID" value={form.EnclosureID} onChange={handleChange}>
          <option value="">-- pick one --</option>
          {enclosures.map((en) => (
            <option key={en.EnclosureID} value={en.EnclosureID}>{en.Name}</option>
          ))}
        </select>

        <label>Sex</label>
        <select name="Sex" value={form.Sex} onChange={handleChange}>
          <option value="">-- pick one --</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <label>Date of birth (optional)</label>
        <input type="date" name="DateOfBirth" value={form.DateOfBirth} onChange={handleChange} />

        <label>Arrival date</label>
        <input type="date" name="AcquisitionDate" value={form.AcquisitionDate} onChange={handleChange} />

        <label>Sick (→ quarantine)</label>
        <input type="checkbox" name="IsSick" checked={form.IsSick} onChange={handleChange} />
        {!form.IsSick ? (
          <p style={{ gridColumn: '1 / 3', margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            If leaving quarantine, pick their habitat above.
          </p>
        ) : null}

        <div className="form-buttons">
          <button type="submit">{editingId ? 'Save changes' : 'Add animal'}</button>
          {/* type="button" so Cancel doesn't submit the form */}
          {editingId ? <button type="button" onClick={handleCancel}>Cancel</button> : null}
        </div>
      </form>

      <DataTable
        columns={COLUMNS}
        rows={animals}
        rowKey="AnimalID"
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

export default Animals