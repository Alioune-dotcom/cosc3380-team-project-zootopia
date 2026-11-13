import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getLoggedInCustomer } from '../customerAuth.js'

function formatTransactionDate(value) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatTransactionDateTime(value) {
  if (!value) return '—'

  return new Date(value).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TransactionDetail({ customerId, transactionId }) {
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(
          '/api/my/transactions/' + transactionId + '?customerId=' + customerId
        )
        const data = await response.json()
        if (!response.ok) {
          setError(data.error || 'Could not load transaction')
          return
        }
        setOrder(data)
      } catch (err) {
        setError('Could not connect to the server')
      }
    }
    load()
  }, [customerId, transactionId])

  if (error) return <p className="error">{error}</p>
  if (!order) return <p>Loading...</p>

  const ticketTotalQty = order.tickets.reduce((s, t) => s + t.Quantity, 0)
  const itemTotalQty = order.products.reduce((s, p) => s + p.Quantity, 0)

  return (
    <div>
      <p><Link to="/my-transactions">← All transactions</Link></p>
      <div className="page-card">
        <h1>Order #{order.transactionId}</h1>
        <p>
          {formatTransactionDateTime(order.date)} · Paid with{' '}
          <strong>{order.paymentType}</strong>
        </p>
        <div className="kpi-row">
          <div className="stat-box">
            <strong>{ticketTotalQty}</strong>
            <span>Tickets purchased</span>
          </div>
          <div className="stat-box">
            <strong>{itemTotalQty}</strong>
            <span>Shop items</span>
          </div>
          <div className="stat-box">
            <strong>${Number(order.totalAmount).toFixed(2)}</strong>
            <span>Order total</span>
          </div>
        </div>
      </div>

      {order.tickets.length > 0 ? (
        <div className="page-card">
          <h3>Your tickets</h3>
          <p>Each line is a ticket type on this order — quantity shows how many you bought.</p>
          {order.tickets.map((t) => (
            <div key={t.TicketID} className="ticket-pass">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>{t.Type} ticket</strong>
                  <div>Ticket ID #{t.TicketID}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>× {t.Quantity}</div>
                  <div>${(Number(t.UnitPrice) * t.Quantity).toFixed(2)}</div>
                </div>
              </div>
              <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 14 }}>
                ${Number(t.UnitPrice).toFixed(2)} each
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {order.products.length > 0 ? (
        <div className="page-card">
          <h3>Shop items</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.products.map((p) => (
                <tr key={p.ProductID}>
                  <td>{p.ProductName}</td>
                  <td>{p.Quantity}</td>
                  <td>${Number(p.UnitPrice).toFixed(2)}</td>
                  <td>${(Number(p.UnitPrice) * p.Quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {order.enclosures.length > 0 ? (
        <div className="page-card">
          <h3>Enclosures visited</h3>
          <ul>
            {order.enclosures.map((e) => (
              <li key={e.EnclosureID}>{e.EnclosureName}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function TransactionList({ customer }) {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch(
          '/api/my/transactions?customerId=' + customer.customerId
        )
        const data = await response.json()
        if (!response.ok) {
          setError(data.error || 'Could not load transactions')
          return
        }
        setOrders(data)
      } catch (err) {
        setError('Could not connect to the server')
      }
    }
    loadOrders()
  }, [customer.customerId])

  return (
    <div>
      <h1>My Transactions</h1>
      <p>Signed in as {customer.username}{customer.email ? ` · ${customer.email}` : ''}</p>
      {error ? <p className="error">{error}</p> : null}

      {orders.length === 0 && !error ? (
        <div className="page-card">
          <p>No purchases yet.</p>
          <div className="form-buttons">
            <Link className="btn gold" to="/checkout">Buy tickets</Link>
            <Link className="btn secondary" to="/shop">Visit the online shop</Link>
          </div>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Tickets</th>
              <th>Shop items</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.transactionId}>
                <td>{formatTransactionDate(order.date)}</td>
                <td><strong>{order.ticketCount}</strong></td>
                <td><strong>{order.productCount}</strong></td>
                <td>{order.paymentType}</td>
                <td>${Number(order.totalAmount).toFixed(2)}</td>
                <td>
                  <Link to={'/my-transactions/' + order.transactionId}>
                    View receipt
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function MyTransactions() {
  const customer = getLoggedInCustomer()
  const { id } = useParams()
  if (id) {
    return <TransactionDetail customerId={customer.customerId} transactionId={id} />
  }
  return <TransactionList customer={customer} />
}

export default MyTransactions
