import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import ReportPage from '../components/ReportPage.jsx'

function FilterBar({ filters, setFilters, children }) {
  return (
    <div className="search-form">
      <label>
        Start date
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
        />
      </label>
      <label>
        End date
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
        />
      </label>
      {children}
      <span style={{ fontSize: 13, color: 'var(--muted)', alignSelf: 'center' }}>
      </span>
    </div>
  )
}

function buildUrl(base, filters) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  const qs = params.toString()
  return qs ? base + '?' + qs : base
}

function money(n) {
  return '$' + Number(n || 0).toFixed(2)
}

function toBars(items, valueKey, labelKey) {
  const max = Math.max(...items.map((r) => Number(r[valueKey]) || 0), 1)
  return items.slice(0, 8).map((r) => ({
    label: r[labelKey],
    pct: Math.round((Number(r[valueKey]) || 0) * 100 / max),
    display: valueKey.toLowerCase().includes('revenue') || valueKey === 'LifetimeSpend'
      ? money(r[valueKey])
      : String(r[valueKey]),
  }))
}


export function ReportsHub() {
  const cards = [
    {
      to: '/reports/revenue',
      title: 'Revenue Overview',
      blurb: 'View ticket revenue, payment methods, and sales totals.',
    },
    {
      to: '/reports/animals',
      title: 'Animal Population',
      blurb: 'Monitor animal counts, health, species, and enclosures.',
    },
    {
      to: '/reports/operations',
      title: 'Zoo Operations',
      blurb: 'Monitor enclosure occupancy, visitor traffic, and zoo closures.',
    },
  ]

  return (
    <div>
      <div className="page-card">
        <h2 style={{ marginTop: 0 }}>Zoo Reports</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
          Select one of the reports below to view the zoo's financial,
          animal population, and operational information.
        </p>
      </div>

      <div className="report-grid">
        {cards.map((card) => (
          <Link key={card.to} to={card.to} className="report-tile">
            <h3>{card.title}</h3>
            <p>{card.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}


export function AnimalPopulationReport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)

  async function generateReport() {
    setLoading(true)
    setError('')
    setHasGenerated(true)

    try {
      const response = await fetch('/api/reports/animal-population')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Could not generate report')
      }

      setData(result)
    } catch (err) {
      setError(err.message || 'Could not connect to the server')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const summary = data?.summary

  return (
    <div>
      <div className="page-card">
        <h2 style={{ marginTop: 0 }}>Animal Population</h2>
        <p style={{ color: 'var(--muted)' }}>
          View the zoo's active animal population, health counts, species,
          and enclosure distribution.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Click Generate to load the latest animal population data.
        </p>
        <button
          type="button"
          className="gold"
          onClick={generateReport}
          disabled={loading}
        >
          {loading ? 'Generating…' : hasGenerated ? 'Regenerate report' : 'Generate report'}
        </button>
      </div>

      {error ? <p className="message error">{error}</p> : null}

      {!hasGenerated && !loading ? (
        <div className="insight">
          Report not generated yet — click Generate when you are ready.
        </div>
      ) : null}

      {data && !loading && !error ? (
        <>
          <div className="kpi-row">
            <div className="stat-box">
              <strong>{summary?.TotalAnimals ?? 0}</strong>
              <span>Total animals</span>
            </div>
            <div className="stat-box">
              <strong>{summary?.HealthyAnimals ?? 0}</strong>
              <span>Healthy animals</span>
            </div>
            <div className="stat-box">
              <strong>{summary?.SickAnimals ?? 0}</strong>
              <span>Sick animals</span>
            </div>
          </div>

          <div className="page-card">
            <h3 style={{ marginTop: 0 }}>Population by species</h3>
            <table>
              <thead>
                <tr>
                  <th>Species</th>
                  <th>Conservation status</th>
                  <th>Animal count</th>
                </tr>
              </thead>
              <tbody>
                {data.bySpecies.map((row, index) => (
                  <tr key={row.CommonName + index}>
                    <td>{row.CommonName}</td>
                    <td>{row.ConservationStatus || '—'}</td>
                    <td>{row.AnimalCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="page-card">
            <h3 style={{ marginTop: 0 }}>Population by enclosure</h3>
            <table>
              <thead>
                <tr>
                  <th>Enclosure</th>
                  <th>Habitat type</th>
                  <th>Animal count</th>
                </tr>
              </thead>
              <tbody>
                {data.byEnclosure.map((row, index) => (
                  <tr key={row.EnclosureName + index}>
                    <td>{row.EnclosureName}</td>
                    <td>{row.HabitatType || '—'}</td>
                    <td>{row.AnimalCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  )
}

export function OccupancyReport() {
  const [filters, setFilters] = useState({ enclosureId: '' })
  const [enclosures, setEnclosures] = useState([])

  useEffect(() => {
    fetch('/api/enclosures')
      .then((res) => res.json())
      .then((data) => setEnclosures(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Could not load enclosures:', err))
  }, [])

  return (
    <ReportPage
      title="Enclosure occupancy"
      description="Live capacity vs animals on exhibit. Use this before adding animals or planning moves."
      url="/api/reports/enclosure-occupancy"
      filters={filters}
      rowKey="EnclosureID"
      columns={[
        { key: 'EnclosureName', label: 'Enclosure' },
        { key: 'Capacity', label: 'Capacity' },
        { key: 'AnimalCount', label: 'Animals' },
        { key: 'RemainingCapacity', label: 'Spots left' },
        { key: 'CapacityPercentage', label: '% full' },
      ]}
      summarize={(rows) => {
        if (!rows.length) return []
        const fullest = [...rows].sort((a, b) => b.CapacityPercentage - a.CapacityPercentage)[0]
        const emptiest = [...rows].sort((a, b) => a.CapacityPercentage - b.CapacityPercentage)[0]
        const avg = rows.reduce((s, r) => s + Number(r.CapacityPercentage), 0) / rows.length
        return [
          { label: 'Avg fill', value: avg.toFixed(0) + '%' },
          { label: 'Tightest', value: fullest.EnclosureName },
          { label: 'Most open', value: emptiest.EnclosureName },
          { insight: `${fullest.EnclosureName} is ${fullest.CapacityPercentage}% full.` },
        ]
      }}
      bar={(rows) => ({
        title: 'Fill rate by enclosure',
        items: [...rows]
          .sort((a, b) => b.CapacityPercentage - a.CapacityPercentage)
          .map((r) => ({
            label: r.EnclosureName,
            pct: Math.min(100, Number(r.CapacityPercentage) || 0),
            display: r.CapacityPercentage + '%',
          })),
      })}
    >
      <div className="page-card">
        <label>
          Enclosure
          <select
            value={filters.enclosureId}
            onChange={(e) => setFilters({ enclosureId: e.target.value })}
          >
            <option value="">All enclosures</option>
            {enclosures.map((enclosure) => (
              <option key={enclosure.EnclosureID} value={enclosure.EnclosureID}>
                {enclosure.Name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </ReportPage>
  )
}



export function ProductSalesReport() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    shopId: '',
    productId: '',
  })
  const [shops, setShops] = useState([])
  const [products, setProducts] = useState([])

  useEffect(() => {
    Promise.all([
      fetch('/api/shops').then((res) => res.json()),
      fetch('/api/products').then((res) => res.json()),
    ])
      .then(([shopData, productData]) => {
        setShops(Array.isArray(shopData) ? shopData : [])
        setProducts(Array.isArray(productData) ? productData : [])
      })
      .catch((err) => console.error('Could not load shop filters:', err))
  }, [])

  const filteredProducts = filters.shopId
    ? products.filter((p) => String(p.ShopID) === filters.shopId)
    : products

  return (
    <ReportPage
      title="Gift shop & food sales"
      description="What visitors buy — restock winners, rethink slow movers."
      url="/api/reports/product-sales"
      filters={filters}
      rowKey="ProductID"
      columns={[
        { key: 'Name', label: 'Product' },
        { key: 'ShopID', label: 'Shop #' },
        { key: 'UnitsSold', label: 'Units sold' },
        { key: 'Revenue', label: 'Revenue', isMoney: true },
      ]}
      summarize={(rows) => {
        const revenue = rows.reduce((s, r) => s + Number(r.Revenue), 0)
        const units = rows.reduce((s, r) => s + Number(r.UnitsSold), 0)
        const top = [...rows].sort((a, b) => Number(b.Revenue) - Number(a.Revenue))[0]
        return [
          { label: 'Product revenue', value: money(revenue) },
          { label: 'Units sold', value: units },
          { label: 'Top earner', value: top ? top.Name : '—' },
          top
            ? { insight: `${top.Name} leads with ${money(top.Revenue)} — keep it stocked to avoid low-stock alerts.` }
            : {},
        ]
      }}
      bar={(rows) => ({
        title: 'Revenue leaders',
        items: toBars(
          [...rows].sort((a, b) => Number(b.Revenue) - Number(a.Revenue)),
          'Revenue',
          'Name'
        ),
      })}
    >
      <div className="page-card">
        <FilterBar filters={filters} setFilters={setFilters}>
          <label>
            Shop
            <select
              value={filters.shopId}
              onChange={(e) => setFilters({
                ...filters,
                shopId: e.target.value,
                productId: '',
              })}
            >
              <option value="">All shops</option>
              {shops.map((shop) => (
                <option key={shop.ShopID} value={shop.ShopID}>
                  {shop.Name} ({shop.ShopType})
                </option>
              ))}
            </select>
          </label>

          <label>
            Product
            <select
              value={filters.productId}
              onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
            >
              <option value="">All products</option>
              {filteredProducts.map((product) => (
                <option key={product.ProductID} value={product.ProductID}>
                  {product.Name}
                </option>
              ))}
            </select>
          </label>
        </FilterBar>
      </div>
    </ReportPage>
  )
}

export function RevenueReport() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    paymentType: '',
    customerId: '',
  })
  const [customers, setCustomers] = useState([])

  useEffect(() => {
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Could not load customers:', err))
  }, [])

  return (
    <div>
      <FilterBar filters={filters} setFilters={setFilters}>
        <label>
          Payment
          <select
            value={filters.paymentType}
            onChange={(e) =>
              setFilters({ ...filters, paymentType: e.target.value })
            }
          >
            <option value="">All</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
          </select>
        </label>

        <label>
          Customer
          <select
            value={filters.customerId}
            onChange={(e) =>
              setFilters({ ...filters, customerId: e.target.value })
            }
          >
            <option value="">All customers</option>
            {customers.map((customer) => (
              <option key={customer.CustomerID} value={customer.CustomerID}>
                {customer.Email}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>

      <ReportPage
        title="Revenue"
        description="Daily income from tickets + products. Filter by date, payment type, and customer."
        url={buildUrl('/api/reports/revenue', filters)}
        rowKey={(row) => row.SaleDate + '-' + row.PaymentType}
        columns={[
          { key: 'SaleDate', label: 'Date', isDate: true },
          { key: 'PaymentType', label: 'Payment' },
          { key: 'SaleCount', label: 'Sales' },
          { key: 'Revenue', label: 'Revenue', isMoney: true },
        ]}
        summarize={(rows) => {
          const total = rows.reduce((s, r) => s + Number(r.Revenue), 0)
          const sales = rows.reduce((s, r) => s + Number(r.SaleCount), 0)
          const card = rows
            .filter((r) => r.PaymentType === 'Card')
            .reduce((s, r) => s + Number(r.Revenue), 0)
          const cash = rows
            .filter((r) => r.PaymentType === 'Cash')
            .reduce((s, r) => s + Number(r.Revenue), 0)

          return [
            { label: 'Total revenue', value: money(total) },
            { label: 'Transactions', value: sales },
            { label: 'Card', value: money(card) },
            { label: 'Cash', value: money(cash) },
            {
              insight: total
                ? `Card is ${Math.round((card / total) * 100) || 0}% of revenue in this window; cash is ${Math.round((cash / total) * 100) || 0}%.`
                : 'No sales in this filter — widen the date range.',
            },
          ]
        }}
        bar={(rows) => {
          const byDate = {}
          rows.forEach((r) => {
            const key = String(r.SaleDate).slice(0, 10)
            byDate[key] = (byDate[key] || 0) + Number(r.Revenue)
          })
          const items = Object.entries(byDate)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([label, value]) => ({ label, value }))
          const max = Math.max(...items.map((i) => i.value), 1)
          return {
            title: 'Revenue by day',
            items: items.map((i) => ({
              label: i.label,
              pct: Math.round((i.value * 100) / max),
              display: money(i.value),
            })),
          }
        }}
      />
    </div>
  )
}

export function ClosuresReport() {
  const [filters, setFilters] = useState({ startDate: '', endDate: '', scope: '' })

  return (
    <div>
      <FilterBar filters={filters} setFilters={setFilters}>
        <label>
          Scope
          <select
            value={filters.scope}
            onChange={(e) => setFilters({ ...filters, scope: e.target.value })}
          >
            <option value="">All</option>
            <option value="FullZoo">Full zoo</option>
            <option value="Enclosure">Enclosure</option>
          </select>
        </label>
      </FilterBar>
      <ReportPage
        title="Closures"
        description="Track weather and maintenance downtime that hurts attendance."
        url={buildUrl('/api/reports/closures', filters)}
        rowKey="ClosureID"
        columns={[
          { key: 'Date', label: 'Date', isDate: true },
          { key: 'Reason', label: 'Reason' },
          { key: 'Scope', label: 'Scope' },
          { key: 'EnclosureName', label: 'Enclosure' },
        ]}
        summarize={(rows) => {
          const full = rows.filter((r) => r.Scope === 'FullZoo').length
          const enc = rows.filter((r) => r.Scope === 'Enclosure').length
          return [
            { label: 'Closures', value: rows.length },
            { label: 'Full zoo', value: full },
            { label: 'Enclosure only', value: enc },
            {
              insight: full
                ? `${full} full-zoo closure(s) in range — biggest attendance risk.`
                : enc
                  ? `${enc} habitat closure(s); rest of park stayed open.`
                  : 'No closures in this filter.',
            },
          ]
        }}
      />
    </div>
  )
}

export function MostVisitedReport() {
  const [filters, setFilters] = useState({ startDate: '', endDate: '' })

  return (
    <div>
      <FilterBar filters={filters} setFilters={setFilters} />
      <ReportPage
        title="Most visited enclosures"
        description="Guest-selected visits at checkout — where the crowd actually goes."
        url={buildUrl('/api/reports/most-visited', filters)}
        rowKey="EnclosureID"
        columns={[
          { key: 'EnclosureName', label: 'Enclosure' },
          { key: 'Location', label: 'Location' },
          { key: 'VisitCount', label: 'Visits' },
        ]}
        summarize={(rows) => {
          const top = [...rows].sort((a, b) => b.VisitCount - a.VisitCount)[0]
          const total = rows.reduce((s, r) => s + Number(r.VisitCount), 0)
          return [
            { label: 'Logged visits', value: total },
            { label: 'Hotspot', value: top ? top.EnclosureName : '—' },
            { label: 'Visits there', value: top ? top.VisitCount : 0 },
            top
              ? { insight: `${top.EnclosureName} leads with ${top.VisitCount} visits — staff talks and gift carts perform best nearby.` }
              : {},
          ]
        }}
        bar={(rows) => ({
          title: 'Visit traffic',
          items: toBars(
            [...rows].sort((a, b) => b.VisitCount - a.VisitCount),
            'VisitCount',
            'EnclosureName'
          ),
        })}
      />
    </div>
  )
}


export function ZooOperationsReport() {
  return (
    <div>
      <div className="page-card">
        <h2 style={{ marginTop: 0 }}>Zoo Operations</h2>
        <p style={{ color: 'var(--muted)' }}>
          Monitor enclosure capacity, visitor traffic, and zoo closures.
          Generate each report separately to view the latest information.
        </p>
      </div>

      <OccupancyReport />
      <MostVisitedReport />
      <ClosuresReport />
    </div>
  )
}


export function RevenueReports() {
  return (
    <ReportCategory
      title="Revenue"
      description="Analyze zoo income, payment methods, and product performance."
      options={[
        {
          value: 'revenue',
          label: 'Revenue Overview',
          component: RevenueReport,
        },
        {
          value: 'sales',
          label: 'Product Performance',
          component: ProductSalesReport,
        },
      ]}
    />
  )
}


export function OperationsReports() {
  return (
    <ReportCategory
      title="Operations Reports"
      description="Monitor animal habitats, visitor traffic, and zoo closures."
      options={[
        {
          value: 'occupancy',
          label: 'Enclosure Occupancy',
          component: OccupancyReport,
        },
        {
          value: 'most-visited',
          label: 'Most Visited Habitats',
          component: MostVisitedReport,
        },
        {
          value: 'closures',
          label: 'Closures Impact',
          component: ClosuresReport,
        },
      ]}
    />
  )
}
