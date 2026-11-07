import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable.jsx'

const EMPTY_FORM = {
  FirstName: '',
  LastName: '',
  HireDate: '',
  PhoneNumber: '',
  EmailAddress: '',
  Salary: '',
  SupervisorID: '',
  EnclosureID: '',
  Username: '',
  Password: '',
  Role: 'Cashier',
  ShopIDs: [],
}

const COLUMNS = [
  { key: 'EmployeeID', label: 'ID' },
  { key: 'FirstName', label: 'First' },
  { key: 'LastName', label: 'Last' },
  { key: 'Role', label: 'Role' },
  { key: 'EmailAddress', label: 'Email' },
  { key: 'EnclosureName', label: 'Enclosure' },
  { key: 'Salary', label: 'Salary', isMoney: true },
]

function Employees() {
  const [rows, setRows] = useState([])
  const [enclosures, setEnclosures] = useState([])
  const [shops, setShops] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState(null)

  async function load() {
    try {
      const res = await fetch('/api/employees')
      setRows(await res.json())
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not load employees' })
    }
  }

  useEffect(() => {
    async function loadDropdowns() {
      const [e, s] = await Promise.all([
        fetch('/api/enclosures'),
        fetch('/api/shops'),
      ])
      setEnclosures(await e.json())
      setShops(await s.json())
    }
    load()
    loadDropdowns()
  }, [])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function toggleShop(shopId) {
    const id = Number(shopId)
    if (form.ShopIDs.includes(id)) {
      setForm({ ...form, ShopIDs: form.ShopIDs.filter((s) => s !== id) })
    } else {
      setForm({ ...form, ShopIDs: [...form.ShopIDs, id] })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (
      !form.FirstName ||
      !form.LastName ||
      !form.HireDate ||
      !form.PhoneNumber ||
      !form.EmailAddress ||
      !form.Salary ||
      !form.Role
    ) {
      setMessage({ type: 'error', text: 'Please fill in required fields' })
      return
    }

    if (!editingId && (!form.Username || !form.Password)) {
      setMessage({ type: 'error', text: 'Username and password required for new employees' })
      return
    }

    const url = editingId ? '/api/employees/' + editingId : '/api/employees'
    const method = editingId ? 'PUT' : 'POST'
    const body = {
      ...form,
      SupervisorID: form.SupervisorID || null,
      EnclosureID: form.EnclosureID || null,
      ShopIDs: form.ShopIDs,
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

      if (editingId) {
        await fetch('/api/employees/' + editingId + '/shops', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ShopIDs: form.ShopIDs }),
        })
      }

      setMessage({ type: 'success', text: editingId ? 'Employee updated' : 'Employee added' })
      setForm(EMPTY_FORM)
      setEditingId(null)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  async function handleEdit(row) {
    try {
      const [empRes, shopRes] = await Promise.all([
        fetch('/api/employees/' + row.EmployeeID),
        fetch('/api/employees/' + row.EmployeeID + '/shops'),
      ])
      const emp = await empRes.json()
      const assigned = await shopRes.json()
      setForm({
        FirstName: emp.FirstName,
        LastName: emp.LastName,
        HireDate: emp.HireDate ? emp.HireDate.slice(0, 10) : '',
        PhoneNumber: emp.PhoneNumber,
        EmailAddress: emp.EmailAddress,
        Salary: emp.Salary,
        SupervisorID: emp.SupervisorID || '',
        EnclosureID: emp.EnclosureID || '',
        Username: emp.Username || '',
        Password: '',
        Role: emp.Role || 'Cashier',
        ShopIDs: assigned.map((s) => s.ShopID),
      })
      setEditingId(row.EmployeeID)
      setMessage(null)
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not load employee' })
    }
  }

  async function handleDelete(row) {
    if (!window.confirm('Delete ' + row.FirstName + ' ' + row.LastName + '?')) return
    try {
      const response = await fetch('/api/employees/' + row.EmployeeID, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error })
        return
      }
      setMessage({ type: 'success', text: 'Employee deleted' })
      load()
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  return (
    <div>
      <h2>Employees</h2>
      {message ? <p className={'message ' + message.type}>{message.text}</p> : null}

      <form className="data-form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'Edit employee #' + editingId : 'Add employee'}</h3>

        <label>First name</label>
        <input name="FirstName" value={form.FirstName} onChange={handleChange} />
        <label>Last name</label>
        <input name="LastName" value={form.LastName} onChange={handleChange} />
        <label>Hire date</label>
        <input type="date" name="HireDate" value={form.HireDate} onChange={handleChange} />
        <label>Phone</label>
        <input name="PhoneNumber" value={form.PhoneNumber} onChange={handleChange} />
        <label>Email</label>
        <input name="EmailAddress" value={form.EmailAddress} onChange={handleChange} />
        <label>Salary</label>
        <input name="Salary" type="number" step="0.01" value={form.Salary} onChange={handleChange} />
        <label>Role</label>
        <select name="Role" value={form.Role} onChange={handleChange}>
          <option value="Manager">Manager</option>
          <option value="Zookeeper">Zookeeper</option>
          <option value="Cashier">Cashier</option>
        </select>
        <label>Supervisor ID</label>
        <input name="SupervisorID" value={form.SupervisorID} onChange={handleChange} />
        <label>Enclosure</label>
        <select name="EnclosureID" value={form.EnclosureID} onChange={handleChange}>
          <option value="">— none —</option>
          {enclosures.map((en) => (
            <option key={en.EnclosureID} value={en.EnclosureID}>{en.Name}</option>
          ))}
        </select>

        {!editingId ? (
          <>
            <label>Username</label>
            <input name="Username" value={form.Username} onChange={handleChange} />
            <label>Password</label>
            <input name="Password" type="password" value={form.Password} onChange={handleChange} />
          </>
        ) : null}

        <label>Shops</label>
        <div>
          {/* cashiers work at physical shops, not the online store */}
          {shops.filter((s) => s.ShopType !== 'Online').map((s) => (
            <label key={s.ShopID} style={{ display: 'block' }}>
              <input
                type="checkbox"
                checked={form.ShopIDs.includes(s.ShopID)}
                onChange={() => toggleShop(s.ShopID)}
              />{' '}
              {s.Name}
            </label>
          ))}
        </div>

        <div className="form-buttons">
          <button type="submit">{editingId ? 'Save changes' : 'Add employee'}</button>
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
        rowKey="EmployeeID"
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

export default Employees
