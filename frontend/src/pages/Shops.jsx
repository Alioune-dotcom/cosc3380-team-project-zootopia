import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable.jsx'
import { LOCATIONS } from '../options.js'

// manager page: add / edit / remove gift shops and food stands
// removing a shop is a soft delete (IsDeleted = 1) so past sales stay in reports
// cashiers are assigned to shops on the Employees page

const EMPTY_FORM = {
  Name: '',
  Location: '',
  ShopType: 'Gift',
}

const COLUMNS = [
  { key: 'ShopID', label: 'ID' },
  { key: 'Name', label: 'Shop' },
  { key: 'ShopType', label: 'Type' },
  { key: 'Location', label: 'Location' },
]

function Shops() {
  const [shops, setShops] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState(null)

  async function loadShops() {
    try {
      const response = await fetch('/api/shops')
      setShops(await response.json())
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not load shops' })
    }
  }

  useEffect(() => {
    loadShops()
  }, [])

  const editingOnline = editingId
    ? shops.find((s) => s.ShopID === editingId)?.ShopType === 'Online'
    : false

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.Name || !form.ShopType || (!form.Location && !editingOnline)) {
      setMessage({ type: 'error', text: 'Please fill in every field' })
      return
    }

    const url = editingId ? '/api/shops/' + editingId : '/api/shops'
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
      setMessage({ type: 'success', text: editingId ? 'Shop updated' : 'Shop added' })
      setForm(EMPTY_FORM)
      setEditingId(null)
      loadShops()
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  function handleEdit(row) {
    setForm({ Name: row.Name, Location: row.Location, ShopType: row.ShopType })
    setEditingId(row.ShopID)
    setMessage(null)
  }

  async function handleDelete(row) {
    if (!window.confirm('Remove ' + row.Name + '? Its products will be hidden too.')) return
    try {
      const response = await fetch('/api/shops/' + row.ShopID, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error })
        return
      }
      setMessage({ type: 'success', text: row.Name + ' removed' })
      loadShops()
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  function handleCancel() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setMessage(null)
  }

  return (
    <div>
      <h2>Shops</h2>
      <p style={{ color: 'var(--muted)' }}>
        Gift shops and food stands. Assign cashiers to shops on the Employees page.
      </p>

      {message ? <p className={'message ' + message.type}>{message.text}</p> : null}

      <form className="data-form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'Edit shop #' + editingId : 'Add a shop'}</h3>

        <label>Name</label>
        <input name="Name" value={form.Name} onChange={handleChange} />

        <label>Location</label>
        {editingOnline ? (
          <p>Online (the online store's location can't be changed)</p>
        ) : (
          <select name="Location" value={form.Location} onChange={handleChange}>
            <option value="">-- pick one --</option>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        )}

        <label>Type</label>
        {editingOnline ? (
          <p>Online (the online store's type can't be changed)</p>
        ) : (
          <select name="ShopType" value={form.ShopType} onChange={handleChange}>
            <option value="Gift">Gift</option>
            <option value="Food">Food</option>
          </select>
        )}

        <div className="form-buttons">
          <button type="submit">{editingId ? 'Save changes' : 'Add shop'}</button>
          {editingId ? <button type="button" onClick={handleCancel}>Cancel</button> : null}
        </div>
      </form>

      <DataTable
        columns={COLUMNS}
        rows={shops}
        rowKey="ShopID"
        actions={(row) => (
          <>
            <button onClick={() => handleEdit(row)}>Edit</button>
            {row.ShopType !== 'Online' ? (
              <button onClick={() => handleDelete(row)}>Remove</button>
            ) : null}
          </>
        )}
      />
    </div>
  )
}

export default Shops
