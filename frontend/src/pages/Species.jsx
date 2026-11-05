
import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable.jsx'

// species page: list + add / edit / delete
// uses /api/species

// blank form. Names match what the backend expects
const EMPTY_FORM = {
  CommonName: '',
  ScientificName: '',
  Diet: '',
  ConservationStatus: '',
  AvgLifespan: '',
}

// table columns. key = field name the backend sends back
const COLUMNS = [
  { key: 'SpeciesID', label: 'ID' },
  { key: 'CommonName', label: 'Common Name' },
  { key: 'ScientificName', label: 'Scientific Name' },
  { key: 'Diet', label: 'Diet' },
  { key: 'ConservationStatus', label: 'Conservation Status' },
  { key: 'AvgLifespan', label: 'Avg. Lifespan' },
]

function Species() {
  const [species, setSpecies] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState(null)

  // get the species list from the backend
  async function loadSpecies() {
    try {
      const response = await fetch('/api/species')
      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not load species' })
        return
      }

      setSpecies(data)
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not load species' })
    }
  }

  // runs once when the page opens
  useEffect(() => {
    loadSpecies()
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }

  // add or save changes
  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.CommonName || !form.ScientificName || !form.Diet || !form.ConservationStatus) {
      setMessage({
        type: 'error',
        text: 'Please fill in all required fields',
      })
      return
    }

    if (form.AvgLifespan && Number(form.AvgLifespan) < 0) {
      setMessage({
        type: 'error',
        text: 'Average lifespan cannot be negative',
      })
      return
    }

    // editing -> PUT /api/species/5, adding -> POST /api/species
    const url = editingId ? '/api/species/' + editingId : '/api/species'
    const method = editingId ? 'PUT' : 'POST'

    // convert average lifespan to a number before sending
    const body = {
      ...form,
      AvgLifespan: form.AvgLifespan === '' ? null : Number(form.AvgLifespan),
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      // backend said no
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not save species' })
        return
      }

      setMessage({
        type: 'success',
        text: editingId ? 'Species updated' : 'Species added',
      })

      setForm(EMPTY_FORM)
      setEditingId(null)
      loadSpecies() // refresh the table
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  // fill the form with this species so it can be changed
  async function handleEdit(row) {
    try {
      // get the full species record
      const response = await fetch('/api/species/' + row.SpeciesID)
      const speciesData = await response.json()

      if (!response.ok) {
        setMessage({
          type: 'error',
          text: speciesData.error || 'Could not load that species',
        })
        return
      }

      setForm({
        CommonName: speciesData.CommonName || '',
        ScientificName: speciesData.ScientificName || '',
        Diet: speciesData.Diet || '',
        ConservationStatus: speciesData.ConservationStatus || '',
        AvgLifespan: speciesData.AvgLifespan ?? '',
      })

      setEditingId(row.SpeciesID)
      setMessage(null)
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not load that species' })
    }
  }

  async function handleDelete(row) {
    // ask first so nobody deletes by accident
    if (!window.confirm('Delete ' + row.CommonName + '?')) return

    try {
      const response = await fetch('/api/species/' + row.SpeciesID, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error })
        return
      }

      setMessage({
        type: 'success',
        text: row.CommonName + ' deleted',
      })

      loadSpecies()
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
      <h2>Species</h2>
      <p style={{ color: 'var(--muted)' }}>
        Manage the different species in the zoo. Add new species, update their
        information, or remove species that are no longer in the system.
      </p>

      {message ? (
        <p className={'message ' + message.type}>{message.text}</p>
      ) : null}

      <form className="data-form" onSubmit={handleSubmit}>
        <h3>
          {editingId ? 'Edit species #' + editingId : 'Add a species'}
        </h3>

        <label>Common Name</label>
        <input
          name="CommonName"
          value={form.CommonName}
          onChange={handleChange}
          required
        />

        <label>Scientific Name</label>
        <input
          name="ScientificName"
          value={form.ScientificName}
          onChange={handleChange}
          required
        />

        <label>Diet</label>
        <input
          name="Diet"
          value={form.Diet}
          onChange={handleChange}
          required
        />

        <label>Conservation Status</label>
        <input
          name="ConservationStatus"
          value={form.ConservationStatus}
          onChange={handleChange}
          required
        />

        <label>Average Lifespan (years)</label>
        <input
          type="number"
          name="AvgLifespan"
          min="0"
          step="any"
          value={form.AvgLifespan}
          onChange={handleChange}
        />

        <div className="form-buttons">
          <button type="submit">
            {editingId ? 'Save changes' : 'Add species'}
          </button>

          {editingId ? (
            <button type="button" onClick={handleCancel}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <DataTable
        columns={COLUMNS}
        rows={species}
        rowKey="SpeciesID"
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

export default Species
