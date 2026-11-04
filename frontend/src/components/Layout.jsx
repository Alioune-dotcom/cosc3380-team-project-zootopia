import { NavLink, Outlet, useNavigate, Navigate } from 'react-router'

function Layout() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user'))

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const role = user.role
  const isManager = role === 'Manager'
  const isZookeeper = role === 'Zookeeper'
  const isCashier = role === 'Cashier'

  const headerLabel =
    role === 'Manager'
      ? 'Manager'
      : role === 'Zookeeper'
        ? 'Zookeeper'
        : role === 'Cashier'
          ? 'Cashier'
          : 'Staff'

  function handleLogout() {
    localStorage.removeItem('user')
    navigate('/', { replace: true })
  }

  return (
    <div className="layout">
      <header className="topbar">
        <span className="logo">{headerLabel}</span>
        <div className="user">
          <span>{user.username} ({user.role})</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <nav className="sidebar">
        <NavLink to="/dashboard">Dashboard</NavLink>

        {isZookeeper && (
          <>
            <NavLink to="/animals">Animals</NavLink>
            <NavLink to="/staff/enclosures">Enclosures</NavLink>
          </>
        )}

        {isManager && (
          <>
            <NavLink to="/animals">Animals</NavLink>
            <NavLink to="/staff/enclosures">Enclosures</NavLink>
            <NavLink to="/staff/attractions">Attractions</NavLink>
            <NavLink to="/employees">Employees</NavLink>
            <NavLink to="/customers">Customers</NavLink>
            <NavLink to="/closures">Closures</NavLink>
          </>
        )}

        {(isCashier || isManager) && (
          <>
            <NavLink to="/products">Products</NavLink>
            <NavLink to="/new-sale">New Sale</NavLink>
          </>
        )}

        {isManager && (
          <>
            <p className="nav-label">Reports</p>
            <NavLink to="/reports">Reports hub</NavLink>
            <NavLink to="/reports/revenue">Revenue</NavLink>
            <NavLink to="/reports/closures">Closures report</NavLink>
            <NavLink to="/reports/occupancy">Occupancy</NavLink>
            <NavLink to="/reports/most-visited">Most visited</NavLink>
          </>
        )}
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
