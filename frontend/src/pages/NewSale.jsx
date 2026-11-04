import { useEffect, useState } from 'react'
import { TICKETS, isPublicEnclosure } from '../zooInfo.js'

// manager/cashier in-person sale (same checkout API)
function NewSale() {
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [enclosures, setEnclosures] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [ticketQty, setTicketQty] = useState({ Adult: 1, Child: 0, Senior: 0 })
  const [qtyById, setQtyById] = useState({})
  const [selectedEnclosures, setSelectedEnclosures] = useState([])
  const [paymentType, setPaymentType] = useState('Cash')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      const [c, p, e] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/products'),
        fetch('/api/enclosures'),
      ])
      if (c.ok) setCustomers(await c.json())
      if (p.ok) setProducts(await p.json())
      if (e.ok) {
        const all = await e.json()
        setEnclosures(all.filter(isPublicEnclosure))
      }
    }
    load()
  }, [])

  const ticketLines = TICKETS.map((t) => ({
    type: t.type,
    quantity: parseInt(ticketQty[t.type], 10) || 0,
    price: t.price,
  })).filter((t) => t.quantity > 0)

  const selectedProducts = products
    .map((p) => ({
      productId: p.ProductID,
      quantity: parseInt(qtyById[p.ProductID], 10) || 0,
      price: Number(p.Price),
    }))
    .filter((p) => p.quantity > 0)

  const total =
    ticketLines.reduce((s, t) => s + t.price * t.quantity, 0) +
    selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0)

  function toggleEnclosure(id) {
    if (selectedEnclosures.includes(id)) {
      setSelectedEnclosures(selectedEnclosures.filter((e) => e !== id))
    } else {
      setSelectedEnclosures([...selectedEnclosures, id])
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')

    if (!customerId) {
      setMessage('Pick a customer')
      return
    }
    if (ticketLines.length === 0) {
      setMessage('Add at least one ticket')
      return
    }

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: Number(customerId),
          paymentType,
          tickets: ticketLines.map((t) => ({ type: t.type, quantity: t.quantity })),
          products: selectedProducts.map((p) => ({
            productId: p.productId,
            quantity: p.quantity,
          })),
          enclosureIds: selectedEnclosures,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error || 'Sale failed')
        return
      }
      setMessage('Sale recorded. Transaction #' + data.transactionId + ' — $' + total.toFixed(2))
      setTicketQty({ Adult: 1, Child: 0, Senior: 0 })
      setQtyById({})
      setSelectedEnclosures([])
      const refresh = await fetch('/api/products')
      if (refresh.ok) setProducts(await refresh.json())
    } catch (err) {
      setMessage('Could not connect to the server')
    }
  }

  return (
    <div>
      <h2>New Sale</h2>
      <p style={{ color: 'var(--muted)' }}>In-person sale: mix ticket types, optional products, Cash or Card.</p>
      <form className="page-card" onSubmit={handleSubmit}>
        <label>Customer</label>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">-- pick one --</option>
          {customers.map((c) => (
            <option key={c.CustomerID} value={c.CustomerID}>
              {c.Username || c.Email} ({c.Email})
            </option>
          ))}
        </select>

        <h3>Tickets</h3>
        {TICKETS.map((t) => (
          <div key={t.type} className="qty-row">
            <div>
              <strong>{t.type}</strong>
              <div style={{ color: 'var(--muted)' }}>${t.price.toFixed(2)}</div>
            </div>
            <input
              type="number"
              min="0"
              value={ticketQty[t.type] || ''}
              onChange={(e) => setTicketQty({ ...ticketQty, [t.type]: e.target.value })}
              style={{ width: 70 }}
            />
          </div>
        ))}

        <h3>Products</h3>
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
                    value={qtyById[p.ProductID] ?? ''}
                    onChange={(e) => setQtyById({ ...qtyById, [p.ProductID]: e.target.value })}
                    style={{ width: 60 }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Enclosures visited</h3>
        {enclosures.map((enc) => (
          <label key={enc.EnclosureID} style={{ display: 'block', marginBottom: 4 }}>
            <input
              type="checkbox"
              checked={selectedEnclosures.includes(enc.EnclosureID)}
              onChange={() => toggleEnclosure(enc.EnclosureID)}
            />{' '}
            {enc.Name}
          </label>
        ))}

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
        {message ? <p className="message success">{message}</p> : null}
      </form>
    </div>
  )
}

export default NewSale
