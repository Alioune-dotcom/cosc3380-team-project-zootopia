import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable.jsx'
import { CATEGORIES_BY_SHOP_TYPE } from '../options.js'

// products page
// manager: list + add / edit / delete every product
// cashier: read-only list of products in the shops they're assigned to
// uses /api/products and /api/shops (or /api/employees/:id/shops for cashiers)

// blank form. names match what the backend expects
const EMPTY_FORM = {
  Name: '',
  Price: '',
  Category: '',
  QuantityInStock: '',
  ShopID: '',
}

const COLUMNS = [
  { key: 'ProductID', label: 'ID' },
  { key: 'Name', label: 'Product' },
  { key: 'Category', label: 'Category' },
  { key: 'Price', label: 'Price', isMoney: true },
  { key: 'QuantityInStock', label: 'In Stock' },
  { key: 'ShopName', label: 'Shop' },
]

function Products() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const isManager = user?.role === 'Manager'

  const [products, setProducts] = useState([])
  const [shops, setShops] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null) // null = adding, a number = editing
  const [message, setMessage] = useState(null)     // { type, text }

  async function loadProducts() {
    try {
      const response = await fetch('/api/products')
      setProducts(await response.json())
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not load products' })
    }
  }

  // runs once when the page opens
  useEffect(() => {
    async function loadShops() {
      // cashiers only get the shops they're assigned to
      const url = isManager ? '/api/shops' : '/api/employees/' + user?.employeeId + '/shops'
      const response = await fetch(url)
      const data = await response.json()
      setShops(Array.isArray(data) ? data : [])
    }
    loadProducts()
    loadShops()
  }, [])

  // the product list only has ShopID, so look up the shop's name
  function shopName(shopId) {
    const shop = shops.find((s) => s.ShopID === shopId)
    return shop ? shop.Name : 'Shop #' + shopId
  }

  // same products, plus a ShopName field for the table
  // cashiers only see products from their own shops
  const visibleProducts = isManager
    ? products
    : products.filter((p) => shops.some((s) => s.ShopID === p.ShopID))
  const rows = visibleProducts.map((p) => ({ ...p, ShopName: shopName(p.ShopID) }))

  // category options depend on the picked shop's type (Food vs Gift/Online)
  const pickedShop = shops.find((s) => String(s.ShopID) === String(form.ShopID))
  const categoryOptions = pickedShop ? CATEGORIES_BY_SHOP_TYPE[pickedShop.ShopType] || [] : []

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'ShopID') {
      // clear the category if it doesn't fit the new shop
      const shop = shops.find((s) => String(s.ShopID) === String(value))
      const allowed = shop ? CATEGORIES_BY_SHOP_TYPE[shop.ShopType] || [] : []
      setForm({ ...form, ShopID: value, Category: allowed.includes(form.Category) ? form.Category : '' })
      return
    }
    setForm({ ...form, [name]: value })
  }

  async function handleSubmit(e) {
    e.preventDefault()

    // price and stock can be 0, so check for empty instead of using !
    if (!form.Name || form.Price === '' || !form.Category || form.QuantityInStock === '' || !form.ShopID) {
      setMessage({ type: 'error', text: 'Please fill in every field' })
      return
    }

    const url = editingId ? '/api/products/' + editingId : '/api/products'
    const method = editingId ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error })
        return
      }

      setMessage({ type: 'success', text: editingId ? 'Product updated' : 'Product added' })
      setForm(EMPTY_FORM)
      setEditingId(null)
      loadProducts()
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  // the row already has everything, so just copy it into the form
  function handleEdit(row) {
    setForm({
      Name: row.Name,
      Price: row.Price,
      Category: row.Category,
      QuantityInStock: row.QuantityInStock,
      ShopID: row.ShopID,
    })
    setEditingId(row.ProductID)
    setMessage(null)
  }

  async function handleDelete(row) {
    if (!window.confirm('Delete ' + row.Name + '?')) return

    try {
      const response = await fetch('/api/products/' + row.ProductID, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) {
        // usually means it's been sold, the foreign key blocks the delete
        setMessage({
          type: 'error',
          text: data.error + '. Products that have already been sold can\'t be deleted.',
        })
        return
      }

      setMessage({ type: 'success', text: row.Name + ' deleted' })
      loadProducts()
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
      <h2>Products</h2>

      {message ? <p className={'message ' + message.type}>{message.text}</p> : null}

      {!isManager ? (
        <p style={{ color: 'var(--muted)' }}>Products in the shops you work at. Only managers can change products.</p>
      ) : null}

      {isManager ? (
      <form className="data-form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'Edit product #' + editingId : 'Add a product'}</h3>

        <label>Name</label>
        <input name="Name" value={form.Name} onChange={handleChange} />

        <label>Price</label>
        <input type="number" step="0.01" min="0" name="Price" value={form.Price} onChange={handleChange} />

        <label>Quantity in stock</label>
        <input type="number" min="0" name="QuantityInStock" value={form.QuantityInStock} onChange={handleChange} />

        <label>Shop</label>
        <select name="ShopID" value={form.ShopID} onChange={handleChange}>
          <option value="">-- pick one --</option>
          {shops.map((s) => (
            <option key={s.ShopID} value={s.ShopID}>{s.Name} ({s.ShopType})</option>
          ))}
        </select>

        <label>Category</label>
        <select name="Category" value={form.Category} onChange={handleChange} disabled={!pickedShop}>
          <option value="">{pickedShop ? '-- pick one --' : '-- pick a shop first --'}</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="form-buttons">
          <button type="submit">{editingId ? 'Save changes' : 'Add product'}</button>
          {editingId ? <button type="button" onClick={handleCancel}>Cancel</button> : null}
        </div>
      </form>
      ) : null}

      <DataTable
        columns={COLUMNS}
        rows={rows}
        rowKey="ProductID"
        actions={isManager ? (row) => (
          <>
            <button onClick={() => handleEdit(row)}>Edit</button>
            <button onClick={() => handleDelete(row)}>Delete</button>
          </>
        ) : null}
      />
    </div>
  )
}

export default Products