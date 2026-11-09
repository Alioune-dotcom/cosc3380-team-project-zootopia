import { useEffect, useState } from 'react'
import { Link } from 'react-router'

function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const isManager = user?.role === 'Manager'
  const isZookeeper = user?.role === 'Zookeeper'
  const isCashier = user?.role === 'Cashier'

  const [alerts, setAlerts] = useState([])
  const [unread, setUnread] = useState(0)
  const [showAlerts, setShowAlerts] = useState(false)
  const [stats, setStats] = useState({
    animals: 0,
    products: 0,
    enclosures: 0,
    sick: 0,
    lowStock: 0,
    revenueHint: 0,
  })

  async function loadAlerts() {
    if (!isManager) return
    try {
      const [listRes, countRes] = await Promise.all([
        fetch('/api/alerts'),
        fetch('/api/alerts/unread-count'),
      ])
      const list = await listRes.json()
      const count = await countRes.json()
      if (listRes.ok) setAlerts(list)
      if (countRes.ok) setUnread(count.unreadCount)
    } catch (err) {
      // ignore
    }
  }

  async function loadStats() {
    try {
      const [a, p, e, rev] = await Promise.all([
        fetch('/api/animals'),
        fetch('/api/products'),
        fetch('/api/enclosures'),
        isManager ? fetch('/api/reports/revenue') : Promise.resolve(null),
      ])
      const animals = a.ok ? await a.json() : []
      const products = p.ok ? await p.json() : []
      const enclosures = e.ok ? await e.json() : []
      let revenueHint = 0
      if (rev && rev.ok) {
        const rows = await rev.json()
        revenueHint = rows.reduce((s, r) => s + Number(r.Revenue || 0), 0)
      }
      setStats({
        animals: animals.length,
        products: products.length,
        enclosures: enclosures.length,
        sick: animals.filter((x) => x.IsSick).length,
        lowStock: products.filter((x) => x.QuantityInStock < 5).length,
        revenueHint,
      })
    } catch (err) {
      // ignore
    }
  }

  useEffect(() => {
    loadStats()
    loadAlerts()
  }, [])

  async function markRead(alertId) {
    await fetch('/api/alerts/' + alertId + '/read', { method: 'PUT' })
    loadAlerts()
  }

  async function markAllRead() {
    await fetch('/api/alerts/read-all', { method: 'PUT' })
    loadAlerts()
  }
  async function deleteAlert(alertId) {
    await fetch('/api/alerts/' + alertId, { method: 'DELETE' })
    loadAlerts()
  }

  async function clearReadAlerts() {
    if (!window.confirm('Delete all read alerts? This cannot be undone.')) return
    await fetch('/api/alerts/clear-read', { method: 'DELETE' })
    loadAlerts()
  }

  return (
    <main className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Zoo operations</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            Welcome, {user?.username} ({user?.role})
          </p>
        </div>
        {isManager ? (
          <div className="alert-bell">
            <button type="button" onClick={() => setShowAlerts(!showAlerts)}>
              Alerts
              {unread > 0 ? <span className="alert-badge">{unread}</span> : null}
            </button>
            {showAlerts ? (
              <div className="alert-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong>Alerts</strong>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="secondary" onClick={markAllRead}>Mark all read</button>
                    {alerts.some((a) => a.IsRead) ? (
                      <button type="button" className="secondary" onClick={clearReadAlerts}>Clear read</button>
                    ) : null}
                  </div>
                </div>
                {alerts.length === 0 ? (
                  <p>No alerts.</p>
                ) : (
                  alerts.map((a) => (
                    <div
                      key={a.AlertID}
                      style={{
                        padding: '8px 0',
                        borderBottom: '1px solid #eee',
                        opacity: a.IsRead ? 0.55 : 1,
                      }}
                    >
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {a.AlertType} · {String(a.CreatedAt).slice(0, 16).replace('T', ' ')}
                      </div>
                      <div>{a.Message}</div>
                      {!a.IsRead ? (
                        <button type="button" className="secondary" onClick={() => markRead(a.AlertID)}>Mark read</button>
                      ) : (
                        <button type="button" className="secondary" onClick={() => deleteAlert(a.AlertID)}>Delete</button>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="kpi-row" style={{ marginTop: 20 }}>
        {(isManager || isZookeeper) && (
          <>
            <div className="stat-box">
              <strong>{stats.animals}</strong>
              <span>Animals</span>
            </div>
            <div className="stat-box">
              <strong>{stats.enclosures}</strong>
              <span>Enclosures</span>
            </div>
          </>
        )}

        {(isManager || isCashier) && (
          <div className="stat-box">
            <strong>{stats.products}</strong>
            <span>Products</span>
          </div>
        )}

        {(isManager || isZookeeper) && (
          <div className="stat-box">
            <strong>{stats.sick}</strong>
            <span>Sick animals</span>
          </div>
        )}

        {(isManager || isCashier) && (
          <div className="stat-box">
            <strong>{stats.lowStock}</strong>
            <span>Low-stock items</span>
          </div>
        )}
      </div>

      <div className="report-grid" style={{ marginTop: 8 }}>
        {(isZookeeper || isManager) && (
          <Link to="/animals" className="report-tile">
            <h3>Animals</h3>
            <p>Add, edit, or mark animals sick.</p>
          </Link>
        )}
        {(isManager || isZookeeper) && (
          <Link to="/staff/enclosures" className="report-tile">
            <h3>Enclosures</h3>
            <p>View habitats and which animals are inside.</p>
          </Link>
        )}
        {(isCashier || isManager) && (
          <Link to="/new-sale" className="report-tile">
            <h3>New sale</h3>
            <p>Record tickets and products for a guest.</p>
          </Link>
        )}
        {(isCashier || isManager) && (
          <Link to="/products" className="report-tile">
            <h3>Products</h3>
            <p>View and manage zoo products.</p>
          </Link>
        )}
        {isManager && (
          <Link to="/reports" className="report-tile">
            <h3>Reports</h3>
            <p>Revenue, animals, and visits.</p>
          </Link>
        )}
      </div>
    </main>
  )
}

export default Dashboard
