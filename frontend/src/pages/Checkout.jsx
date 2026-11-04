import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getLoggedInCustomer } from '../customerAuth.js'
import { TICKETS, isPublicEnclosure } from '../zooInfo.js'

const STEPS = ['Tickets', 'Shop', 'Visits', 'Pay']

function Checkout() {
  const customer = getLoggedInCustomer()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [ticketQty, setTicketQty] = useState({ Adult: 1, Child: 0, Senior: 0 })
  const [products, setProducts] = useState([])
  const [qtyById, setQtyById] = useState({})
  const [enclosures, setEnclosures] = useState([])
  const [selectedEnclosures, setSelectedEnclosures] = useState([])
  const [paymentType, setPaymentType] = useState('Card')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [prodRes, encRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/enclosures'),
        ])
        const prodData = await prodRes.json()
        const encData = await encRes.json()
        if (prodRes.ok) setProducts(prodData)
        if (encRes.ok) {
          setEnclosures(
            encData.filter((e) => e.Status !== 'Closed' && isPublicEnclosure(e))
          )
        }
      } catch (err) {
        // leave empty
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
      name: p.Name,
      quantity: parseInt(qtyById[p.ProductID], 10) || 0,
      price: Number(p.Price),
    }))
    .filter((p) => p.quantity > 0)

  const ticketsTotal = ticketLines.reduce((sum, t) => sum + t.price * t.quantity, 0)
  const productsTotal = selectedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0)
  const total = ticketsTotal + productsTotal
  const ticketCount = ticketLines.reduce((sum, t) => sum + t.quantity, 0)

  function bumpTicket(type, delta) {
    const next = Math.max(0, (parseInt(ticketQty[type], 10) || 0) + delta)
    setTicketQty({ ...ticketQty, [type]: next })
  }

  function toggleEnclosure(id) {
    if (selectedEnclosures.includes(id)) {
      setSelectedEnclosures(selectedEnclosures.filter((e) => e !== id))
    } else {
      setSelectedEnclosures([...selectedEnclosures, id])
    }
  }

  function nextStep() {
    setMessage('')
    if (step === 1 && ticketLines.length === 0) {
      setMessage('Add at least one ticket (any mix of Adult, Child, Senior)')
      return
    }
    if (step === 4) return
    setStep(step + 1)
  }

  async function handleBuy(e) {
    e.preventDefault()
    setMessage('')

    if (ticketLines.length === 0) {
      setMessage('Add at least one ticket')
      return
    }
    if (!paymentType) {
      setMessage('Choose Cash or Card')
      return
    }

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.customerId,
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
        setMessage(data.error || 'Could not complete purchase')
        return
      }

      navigate('/my-transactions/' + data.transactionId)
    } catch (err) {
      setMessage('Could not connect to the server')
    }
  }

  return (
    <div>
      <h1>Checkout</h1>
      <p>Mix ticket types, add snacks or gifts, then pay with Cash or Card.</p>

      <div className="wizard-steps">
        {STEPS.map((label, i) => {
          const n = i + 1
          const cls = n === step ? 'active' : n < step ? 'done' : ''
          return (
            <span key={label} className={'wizard-step ' + cls}>
              {n}. {label}
            </span>
          )
        })}
      </div>

      {step === 1 && (
        <div className="page-card">
          <h3>Choose ticket quantities</h3>
          <p>Buy any mix — e.g. 2 Adult + 3 Child in one order.</p>
          {TICKETS.map((t) => (
            <div key={t.type} className="qty-row">
              <div>
                <strong>{t.type}</strong>
                <div style={{ color: 'var(--muted)' }}>${t.price.toFixed(2)} each</div>
              </div>
              <div className="qty-controls">
                <button type="button" className="secondary" onClick={() => bumpTicket(t.type, -1)}>-</button>
                <input
                  type="number"
                  min="0"
                  value={ticketQty[t.type] || 0}
                  onChange={(e) =>
                    setTicketQty({
                      ...ticketQty,
                      [t.type]: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                />
                <button type="button" className="secondary" onClick={() => bumpTicket(t.type, 1)}>+</button>
              </div>
              <strong>
                ${((ticketQty[t.type] || 0) * t.price).toFixed(2)}
              </strong>
            </div>
          ))}
          <p><strong>{ticketCount}</strong> ticket(s) · subtotal ${ticketsTotal.toFixed(2)}</p>
          <button type="button" className="gold" onClick={nextStep}>Continue to shop</button>
        </div>
      )}

      {step === 2 && (
        <div className="page-card">
          <h3>Add products (optional)</h3>
          {products.length === 0 ? (
            <p>No products available.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>In stock</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.ProductID}>
                    <td>{p.Name}</td>
                    <td>${Number(p.Price).toFixed(2)}</td>
                    <td>{p.QuantityInStock}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={qtyById[p.ProductID] ?? ''}
                        onChange={(e) =>
                          setQtyById({ ...qtyById, [p.ProductID]: e.target.value })
                        }
                        style={{ width: 70 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p>Products subtotal: ${productsTotal.toFixed(2)}</p>
          <div className="form-buttons">
            <button type="button" className="secondary" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="gold" onClick={nextStep}>Continue</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="page-card">
          <h3>Which enclosures will you visit?</h3>
          <p>Optional — helps the zoo track popular habitats.</p>
          <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
            {enclosures.map((enc) => (
              <label key={enc.EnclosureID} className="qty-row" style={{ cursor: 'pointer' }}>
                <span>
                  <strong>{enc.Name}</strong>
                  <div style={{ color: 'var(--muted)' }}>{enc.Location} · {enc.HabitatType}</div>
                </span>
                <input
                  type="checkbox"
                  checked={selectedEnclosures.includes(enc.EnclosureID)}
                  onChange={() => toggleEnclosure(enc.EnclosureID)}
                />
              </label>
            ))}
          </div>
          <div className="form-buttons">
            <button type="button" className="secondary" onClick={() => setStep(2)}>Back</button>
            <button type="button" className="gold" onClick={nextStep}>Continue to payment</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <form className="page-card" onSubmit={handleBuy}>
          <h3>Review & payment</h3>
          <ul>
            {ticketLines.map((t) => (
              <li key={t.type}>{t.type} × {t.quantity} — ${(t.price * t.quantity).toFixed(2)}</li>
            ))}
            {selectedProducts.map((p) => (
              <li key={p.productId}>{p.name} × {p.quantity} — ${(p.price * p.quantity).toFixed(2)}</li>
            ))}
          </ul>
          <p><strong>Total due: ${total.toFixed(2)}</strong></p>

          <h4>Payment method</h4>
          <div className="payment-cards">
            <button
              type="button"
              className={'payment-card' + (paymentType === 'Card' ? ' selected' : '')}
              onClick={() => setPaymentType('Card')}
            >
              Card
            </button>
            <button
              type="button"
              className={'payment-card' + (paymentType === 'Cash' ? ' selected' : '')}
              onClick={() => setPaymentType('Cash')}
            >
              Cash
            </button>
          </div>

          <div className="form-buttons">
            <button type="button" className="secondary" onClick={() => setStep(3)}>Back</button>
            <button type="submit" className="gold">Complete purchase</button>
          </div>
        </form>
      )}

      {message ? <p className="message error">{message}</p> : null}
    </div>
  )
}

export default Checkout
