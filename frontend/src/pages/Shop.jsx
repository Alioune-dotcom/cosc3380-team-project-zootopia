import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getLoggedInCustomer } from '../customerAuth.js'

// customer gift shop & food: buy products without a ticket
function Shop() {
  const customer = getLoggedInCustomer()
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [qtyById, setQtyById] = useState({})
  const [paymentType, setPaymentType] = useState('Card')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/products')
        const data = await response.json()
        if (response.ok) setProducts(data)
      } catch (err) {
        setMessage('Could not connect to the server')
      }
    }
    load()
  }, [])

  const selectedProducts = products
    .map((p) => ({
      productId: p.ProductID,
      name: p.Name,
      quantity: parseInt(qtyById[p.ProductID], 10) || 0,
      price: Number(p.Price),
    }))
    .filter((p) => p.quantity > 0)

  const productsTotal = selectedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0)

  async function handleBuy(e) {
    e.preventDefault()
    setMessage('')

    if (selectedProducts.length === 0) {
      setMessage('Add at least one item')
      return
    }

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.customerId,
          paymentType,
          tickets: [],
          products: selectedProducts.map((p) => ({ productId: p.productId, quantity: p.quantity })),
          enclosureIds: [],
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
      <h1>Gift Shop & Food</h1>
      <p>Grab snacks and souvenirs — no ticket needed.</p>

      <form className="page-card" onSubmit={handleBuy}>
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
                      max={p.QuantityInStock}
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

        <p><strong>Total due: ${productsTotal.toFixed(2)}</strong></p>

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
          <button type="submit" className="gold">Buy</button>
        </div>
      </form>

      {message ? <p className="message error">{message}</p> : null}
    </div>
  )
}

export default Shop
