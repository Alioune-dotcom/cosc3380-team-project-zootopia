import { NavLink, Outlet, useNavigate, Navigate } from 'react-router'
import { getLoggedInCustomer, logoutCustomer } from '../customerAuth.js'

// frame for customer pages: top bar + sidebar
function CustomerLayout() {
  const navigate = useNavigate()
  const customer = getLoggedInCustomer()

  if (!customer) {
    return <Navigate to="/customer-login" replace />
  }

  function handleLogout() {
    logoutCustomer()
    navigate('/', { replace: true })
  }

  return (
    <div className="layout">
      <header className="topbar">
        <span className="logo">Zoo Customer</span>
        <div className="user">
          <span>{customer.username}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <nav className="sidebar">
        <NavLink to="/enclosures">Enclosures</NavLink>
        <NavLink to="/attractions">Attractions</NavLink>
        <NavLink to="/checkout">Buy Tickets</NavLink>
        <NavLink to="/shop">Gift Shop & Food</NavLink>
        <NavLink to="/my-transactions">My Transactions</NavLink>
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

export default CustomerLayout