import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getLoggedInCustomer } from '../customerAuth.js'

// online merch store: browse the online store's products, add to a cart, pay by card
// the cart only lives on this page; nothing is saved until checkout
function OnlineShop() {
  const customer = getLoggedInCustomer()
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [cart, setCart] = useState({}) // { productId: quantity }
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/products?shopType=Online')
        const data = await response.json()
        if (!response.ok) {
          setMessage(data.error || 'Could not load products')
          return
        }
        setProducts(data)
      } catch (err) {
        setMessage('Could not connect to the server')
      }
    }
    load()
  }, [])

  function addToCart(product) {
    const current = cart[product.ProductID] || 0
    if (current >= product.QuantityInStock) {
      setMessage('Only ' + product.QuantityInStock + ' ' + product.Name + ' in stock')
      return
    }
    setMessage('')
    setCart({ ...cart, [product.ProductID]: current + 1 })
  }

  function changeQty(productId, delta) {
    const next = (cart[productId] || 0) + delta
    const updated = { ...cart }
    if (next <= 0) {
      delete updated[productId]
    } else {
      const product = products.find((p) => p.ProductID === productId)
      if (product && next > product.QuantityInStock) return
      updated[productId] = next
    }
    setCart(updated)
  }

  const cartLines = products
    .filter((p) => cart[p.ProductID])
    .map((p) => ({
      productId: p.ProductID,
      name: p.Name,
      price: Number(p.Price),
      quantity: cart[p.ProductID],
    }))

  const total = cartLines.reduce((sum, line) => sum + line.price * line.quantity, 0)

  async function handleCheckout() {
    setMessage('')
    if (cartLines.length === 0) {
      setMessage('Your cart is empty')
      return
    }

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.customerId,
          products: cartLines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
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
      <h1>Online Shop</h1>
      <p>Zoo gifts and apparel from our online store.</p>

      {message ? <p className="message error">{message}</p> : null}

      <div className="page-card">
        <h3>Products</h3>
        {products.length === 0 ? (
          <p>No products available right now.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>In stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.ProductID}>
                  <td>{p.Name}</td>
                  <td>{p.Category}</td>
                  <td>${Number(p.Price).toFixed(2)}</td>
                  <td>{p.QuantityInStock}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => addToCart(p)}
                      disabled={p.QuantityInStock === 0}
                    >
                      {p.QuantityInStock === 0 ? 'Sold out' : 'Add to cart'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="page-card">
        <h3>Your cart</h3>
        {cartLines.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <>
            {cartLines.map((line) => (
              <div key={line.productId} className="qty-row">
                <div>
                  <strong>{line.name}</strong>
                  <div style={{ color: 'var(--muted)' }}>${line.price.toFixed(2)} each</div>
                </div>
                <div className="qty-controls">
                  <button type="button" className="secondary" onClick={() => changeQty(line.productId, -1)}>-</button>
                  <span style={{ minWidth: 24, textAlign: 'center' }}>{line.quantity}</span>
                  <button type="button" className="secondary" onClick={() => changeQty(line.productId, 1)}>+</button>
                </div>
                <strong>${(line.price * line.quantity).toFixed(2)}</strong>
              </div>
            ))}
            <p><strong>Total: ${total.toFixed(2)}</strong></p>
            <p style={{ color: 'var(--muted)' }}>Online purchases are paid by card.</p>
            <button type="button" className="gold" onClick={handleCheckout}>Pay with card</button>
          </>
        )}
      </div>
    </div>
  )
}

export default OnlineShop
