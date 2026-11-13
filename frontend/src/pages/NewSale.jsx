import { useEffect, useState } from 'react'

// in-person sale at a gift shop or food stand
// no customer account is linked; the sale stores the shop, the cashier, the items,
// and an optional receipt email the customer gives at the register
// cashiers only see the shops they're assigned to; managers can pick any shop
function NewSale() {
  const user = JSON.parse(localStorage.getItem('user'))
  const isManager = user?.role === 'Manager'

  const [shops, setShops] = useState([])
  const [shopId, setShopId] = useState('')
  const [products, setProducts] = useState([])
  const [qtyById, setQtyById] = useState({})
  const [paymentType, setPaymentType] = useState('Cash')
  const [customerEmail, setCustomerEmail] = useState('')
  const [message, setMessage] = useState(null) // { type, text }

  // load the shops this employee can sell at (never the online store)
  useEffect(() => {
    async function loadShops() {
      try {
        const url = isManager ? '/api/shops' : '/api/employees/' + user.employeeId + '/shops'
        const response = await fetch(url)
        const data = await response.json()
        if (!response.ok) {
          setMessage({ type: 'error', text: data.error || 'Could not load shops' })
          return
        }
        const physical = data.filter((s) => s.ShopType !== 'Online')
        setShops(physical)
        if (physical.length === 1) setShopId(String(physical[0].ShopID))
      } catch (err) {
        setMessage({ type: 'error', text: 'Could not connect to the server' })
      }
    }
    loadShops()
  }, [isManager, user?.employeeId])

  async function loadProducts(id) {
    if (!id) {
      setProducts([])
      return
    }
    const response = await fetch('/api/products?shopId=' + id)
    if (response.ok) setProducts(await response.json())
  }

  // when the shop changes, show only that shop's products
  useEffect(() => {
    setQtyById({})
    loadProducts(shopId)
  }, [shopId])

  const selectedProducts = products
    .map((p) => ({
      productId: p.ProductID,
      quantity: parseInt(qtyById[p.ProductID], 10) || 0,
      price: Number(p.Price),
    }))
    .filter((p) => p.quantity > 0)

  const total = selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0)

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)

    if (!shopId) {
      setMessage({ type: 'error', text: 'Pick a shop' })
      return
    }
    if (selectedProducts.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one product' })
      return
    }

    // optional receipt email: blank is fine, otherwise it must look like an email
    const email = customerEmail.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage({ type: 'error', text: 'Enter a valid email or leave it blank' })
      return
    }

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user.employeeId,
          shopId: Number(shopId),
          paymentType,
          customerEmail: email || undefined,
          products: selectedProducts.map((p) => ({
            productId: p.productId,
            quantity: p.quantity,
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Sale failed' })
        return
      }
      setMessage({
        type: 'success',
        text: 'Sale recorded. Transaction #' + data.transactionId +
          (data.receiptEmail ? ' · receipt email: ' + data.receiptEmail : ''),
      })
      setQtyById({})
      setCustomerEmail('')
      loadProducts(shopId)
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to the server' })
    }
  }

  return (
    <div>
      <h2>New Sale</h2>
      <p style={{ color: 'var(--muted)' }}>
        Ring up an in-person sale at a gift shop or food stand. Cash or Card.
      </p>

      <form className="page-card" onSubmit={handleSubmit}>
        <label>Shop</label>
        {shops.length === 0 ? (
          <p>You aren't assigned to any shops yet. Ask a manager to assign you.</p>
        ) : (
          <select value={shopId} onChange={(e) => setShopId(e.target.value)}>
            <option value="">-- pick one --</option>
            {shops.map((s) => (
              <option key={s.ShopID} value={s.ShopID}>
                {s.Name} ({s.ShopType} · {s.Location})
              </option>
            ))}
          </select>
        )}

        {shopId ? (
          <>
            <h3>Products</h3>
            {products.length === 0 ? (
              <p>This shop has no products.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Stock</th>
                    <th>Price</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.ProductID}>
                      <td>{p.Name}</td>
                      <td>{p.QuantityInStock}</td>
                      <td>${Number(p.Price).toFixed(2)}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={p.QuantityInStock}
                          value={qtyById[p.ProductID] ?? ''}
                          onChange={(e) => setQtyById({ ...qtyById, [p.ProductID]: e.target.value })}
                          style={{ width: 60 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h3>Customer email <span style={{ color: 'var(--muted)', fontWeight: 'normal' }}>(optional)</span></h3>
            <input
              type="email"
              placeholder="customer@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              maxLength={100}
              autoComplete="off"
            />

            <h3>Payment</h3>
            <div className="payment-cards">
              <button
                type="button"
                className={'payment-card' + (paymentType === 'Cash' ? ' selected' : '')}
                onClick={() => setPaymentType('Cash')}
              >
                Cash
              </button>
              <button
                type="button"
                className={'payment-card' + (paymentType === 'Card' ? ' selected' : '')}
                onClick={() => setPaymentType('Card')}
              >
                Card
              </button>
            </div>

            <p><strong>Total: ${total.toFixed(2)}</strong></p>
            <button type="submit" className="gold">Record sale</button>
          </>
        ) : null}

        {message ? <p className={'message ' + message.type}>{message.text}</p> : null}
      </form>
    </div>
  )
}

export default NewSale
