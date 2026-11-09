import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getLoggedInCustomer } from '../customerAuth.js'
import { TICKETS, isPublicEnclosure } from '../zooInfo.js'

// Online ticket checkout. Merchandise is purchased separately in the Online Shop.
const STEPS = ['Tickets', 'Visits', 'Pay']

function Checkout() {
  const customer = getLoggedInCustomer()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [ticketQty, setTicketQty] = useState({ Adult: 1, Child: 0, Senior: 0 })
  const [enclosures, setEnclosures] = useState([])
  const [selectedEnclosures, setSelectedEnclosures] = useState([])
  const [message, setMessage] = useState('')
  // tickets are for today only, so a full-zoo closure today means no ticket sales
  const [zooClosed, setZooClosed] = useState(null) // null = not closed, else the reason

  useEffect(() => {
    async function load() {
      try {
        const [encRes, closedRes] = await Promise.all([
          fetch('/api/enclosures'),
          fetch('/api/closures/today'),
        ])
        const encData = await encRes.json()
        const closedData = await closedRes.json()
        if (encRes.ok) {
          // only enclosures open today (shared rule from v_enclosure_open_today)
          setEnclosures(
            encData.filter((e) => Number(e.IsOpenToday) === 1 && isPublicEnclosure(e))
          )
        }
        if (closedRes.ok && closedData.fullZooClosed) {
          setZooClosed(closedData.reason || 'Closed')
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

  const ticketsTotal = ticketLines.reduce((sum, t) => sum + t.price * t.quantity, 0)
  const total = ticketsTotal
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
  if (step === STEPS.length) return
  setStep(step + 1)
}

  async function handleBuy(e) {
    e.preventDefault()
    setMessage('')

    if (ticketLines.length === 0) {
      setMessage('Add at least one ticket')
      return
    }
    try {
      const response = await fetch('/api/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: customer.customerId,
    tickets: ticketLines.map((t) => ({
      type: t.type,
      quantity: t.quantity,
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
<h1>Buy Tickets</h1>
<p>
  Choose your tickets, tell us which habitats you plan to visit,
  then pay by card.
</p>

      {zooClosed ? (
        <div className="page-card">
          <h3>The zoo is closed today</h3>
          <p>Reason: {zooClosed}. Tickets can't be bought for today. You can still visit the online shop.</p>
        </div>
      ) : (
      <>
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
          <button type="button" className="gold" onClick={nextStep}>Continue</button>
        </div>
      )}

      {step === 2 && (
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
            <button type="button" className="secondary" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="gold" onClick={nextStep}>Continue to payment</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <form className="page-card" onSubmit={handleBuy}>
          <h3>Review & payment</h3>
          <ul>
            {ticketLines.map((t) => (
              <li key={t.type}>{t.type} × {t.quantity} — ${(t.price * t.quantity).toFixed(2)}</li>
            ))}
          </ul>
          <p><strong>Total due: ${total.toFixed(2)}</strong></p>

          <h4>Payment</h4>
          <p>Online purchases are paid by card.</p>

          <div className="form-buttons">
            <button type="button" className="secondary" onClick={() => setStep(2)}>Back</button>
            <button type="submit" className="gold">Pay with card</button>
          </div>
        </form>
      )}
      </>
      )}

      {message ? <p className="message error">{message}</p> : null}
    </div>
  )
}

export default Checkout
