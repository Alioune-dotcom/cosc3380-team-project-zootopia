import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import DataTable from '../components/DataTable.jsx'

// today's date as YYYY-MM-DD (local time)
function todayString() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

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

  // cashier dashboard: their shops, low stock in those shops, their sales today
  const [cashier, setCashier] = useState({ shops: [], lowStock: [], saleCount: 0, salesTotal: 0 })

  // zookeeper dashboard: their enclosure's animals, sick animals, today's closures, attractions they host
  const [keeper, setKeeper] = useState({
    enclosureName: null,
    myAnimals: [],
    sickAnimals: [],
    closuresToday: [],
    myAttractions: [],
  })

  async function loadCashier() {
    try {
      const [shopRes, prodRes, salesRes] = await Promise.all([
        fetch('/api/employees/' + user.employeeId + '/shops'),
        fetch('/api/products'),
        fetch('/api/sales/today?employeeId=' + user.employeeId),
      ])
      const shops = shopRes.ok ? await shopRes.json() : []
      const products = prodRes.ok ? await prodRes.json() : []
      const sales = salesRes.ok ? await salesRes.json() : { saleCount: 0, salesTotal: 0 }

      const myShopIds = shops.map((s) => s.ShopID)
      const lowStock = products
        .filter((p) => myShopIds.includes(p.ShopID) && p.QuantityInStock < 5)
        .map((p) => ({
          ...p,
          ShopName: shops.find((s) => s.ShopID === p.ShopID)?.Name,
        }))

      setCashier({ shops, lowStock, saleCount: sales.saleCount, salesTotal: sales.salesTotal })
    } catch (err) {
      // ignore
    }
  }

  async function loadKeeper() {
    try {
      const [empRes, aniRes, encRes, cloRes, attRes] = await Promise.all([
        fetch('/api/employees/' + user.employeeId),
        fetch('/api/animals'),
        fetch('/api/enclosures'),
        fetch('/api/closures'),
        fetch('/api/attractions'),
      ])
      const me = empRes.ok ? await empRes.json() : {}
      const animals = aniRes.ok ? await aniRes.json() : []
      const enclosures = encRes.ok ? await encRes.json() : []
      const closures = cloRes.ok ? await cloRes.json() : []
      const attractions = attRes.ok ? await attRes.json() : []

      const myEnclosureId = me.EnclosureID
      const today = todayString()
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)

      setKeeper({
        enclosureName: enclosures.find((e) => e.EnclosureID === myEnclosureId)?.Name || null,
        myAnimals: animals.filter((a) => a.EnclosureID === myEnclosureId),
        sickAnimals: animals.filter((a) => Number(a.IsSick) === 1),
        // full-zoo closures today, or closures of my enclosure today
        closuresToday: closures.filter(
          (c) =>
            String(c.Date).slice(0, 10) === today &&
            (c.Scope === 'FullZoo' || c.EnclosureID === myEnclosureId)
        ),
        // upcoming attractions I host
        myAttractions: attractions
          .filter((a) => a.HostEmployeeID === Number(user.employeeId) && new Date(a.Schedule) >= startOfToday)
          .map((a) => ({ ...a, When: String(a.Schedule).slice(0, 16).replace('T', ' ') })),
      })
    } catch (err) {
      // ignore
    }
  }

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
    if (isManager) loadStats()
    if (isCashier) loadCashier()
    if (isZookeeper) loadKeeper()
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

      {isManager && (
        <>
          <div className="kpi-row" style={{ marginTop: 20 }}>
            <div className="stat-box">
              <strong>{stats.animals}</strong>
              <span>Animals on exhibit</span>
            </div>
            <div className="stat-box">
              <strong>{stats.enclosures}</strong>
              <span>Enclosures</span>
            </div>
            <div className="stat-box">
              <strong>{stats.products}</strong>
              <span>Products</span>
            </div>
            <div className="stat-box">
              <strong>{stats.sick}</strong>
              <span>Sick animals</span>
            </div>
            <div className="stat-box">
              <strong>{stats.lowStock}</strong>
              <span>Low-stock items</span>
            </div>
          </div>

          <div className="report-grid" style={{ marginTop: 8 }}>
            <Link to="/animals" className="report-tile">
              <h3>Animals</h3>
              <p>Add, edit, or mark animals sick.</p>
            </Link>
            <Link to="/staff/enclosures" className="report-tile">
              <h3>Enclosures</h3>
              <p>View habitats and which animals are inside.</p>
            </Link>
            <Link to="/reports" className="report-tile">
              <h3>Reports</h3>
              <p>Revenue, visits, occupancy, and closures.</p>
            </Link>
            <Link to="/new-sale" className="report-tile">
              <h3>New sale</h3>
              <p>Cover a register: ring up an in-person sale.</p>
            </Link>
          </div>
        </>
      )}

      {isCashier && (
        <>
          <div className="kpi-row" style={{ marginTop: 20 }}>
            <div className="stat-box">
              <strong>{cashier.saleCount}</strong>
              <span>Your sales today</span>
            </div>
            <div className="stat-box">
              <strong>${cashier.salesTotal.toFixed(2)}</strong>
              <span>Your sales total today</span>
            </div>
            <div className="stat-box">
              <strong>{cashier.lowStock.length}</strong>
              <span>Low-stock items in your shops</span>
            </div>
          </div>

          <div className="page-card">
            <h3>Your shops</h3>
            {cashier.shops.length === 0 ? (
              <p>You aren't assigned to any shops yet. Ask a manager.</p>
            ) : (
              <ul>
                {cashier.shops.map((s) => (
                  <li key={s.ShopID}>{s.Name} ({s.ShopType} · {s.Location})</li>
                ))}
              </ul>
            )}
          </div>

          <div className="page-card">
            <h3>Low stock in your shops</h3>
            <DataTable
              columns={[
                { key: 'Name', label: 'Product' },
                { key: 'ShopName', label: 'Shop' },
                { key: 'QuantityInStock', label: 'In stock' },
              ]}
              rows={cashier.lowStock}
              rowKey="ProductID"
            />
          </div>

          <div className="report-grid" style={{ marginTop: 8 }}>
            <Link to="/new-sale" className="report-tile">
              <h3>New sale</h3>
              <p>Ring up a gift shop or food stand sale.</p>
            </Link>
            <Link to="/products" className="report-tile">
              <h3>Products</h3>
              <p>Prices and stock in your shops.</p>
            </Link>
          </div>
        </>
      )}

      {isZookeeper && (
        <>
          <div className="kpi-row" style={{ marginTop: 20 }}>
            <div className="stat-box">
              <strong>{keeper.myAnimals.length}</strong>
              <span>Animals in {keeper.enclosureName || 'your enclosure'}</span>
            </div>
            <div className="stat-box">
              <strong>{keeper.sickAnimals.length}</strong>
              <span>Sick / quarantined animals</span>
            </div>
            <div className="stat-box">
              <strong>{keeper.closuresToday.length}</strong>
              <span>Closures affecting you today</span>
            </div>
            <div className="stat-box">
              <strong>{keeper.myAttractions.length}</strong>
              <span>Upcoming attractions you host</span>
            </div>
          </div>

          {keeper.closuresToday.length > 0 ? (
            <div className="page-card">
              <h3>Closed today</h3>
              <ul>
                {keeper.closuresToday.map((c) => (
                  <li key={c.ClosureID}>
                    {c.Scope === 'FullZoo' ? 'Whole zoo' : keeper.enclosureName}: {c.Reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="page-card">
            <h3>Your enclosure: {keeper.enclosureName || 'not assigned'}</h3>
            <DataTable
              columns={[
                { key: 'AnimalName', label: 'Name' },
                { key: 'Species', label: 'Species' },
                { key: 'Sex', label: 'Sex' },
              ]}
              rows={keeper.myAnimals}
              rowKey="AnimalID"
            />
          </div>

          <div className="page-card">
            <h3>Sick / quarantined animals</h3>
            <DataTable
              columns={[
                { key: 'AnimalName', label: 'Name' },
                { key: 'Species', label: 'Species' },
                { key: 'Enclosure', label: 'Currently in' },
              ]}
              rows={keeper.sickAnimals}
              rowKey="AnimalID"
            />
          </div>

          <div className="page-card">
            <h3>Attractions you host</h3>
            <DataTable
              columns={[
                { key: 'Name', label: 'Attraction' },
                { key: 'When', label: 'When' },
                { key: 'EnclosureName', label: 'Enclosure' },
              ]}
              rows={keeper.myAttractions}
              rowKey="AttractionID"
            />
          </div>

          <div className="report-grid" style={{ marginTop: 8 }}>
            <Link to="/animals" className="report-tile">
              <h3>Animals</h3>
              <p>Add, edit, or mark animals sick.</p>
            </Link>
            <Link to="/staff/enclosures" className="report-tile">
              <h3>Enclosures</h3>
              <p>View habitats and which animals are inside.</p>
            </Link>
          </div>
        </>
      )}
    </main>
  )
}

export default Dashboard
