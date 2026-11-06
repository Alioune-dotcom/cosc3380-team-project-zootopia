import { useState } from 'react'
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
        Filters are optional — click Generate report below when ready.
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
      title: 'Revenue Reports',
      blurb: 'View ticket revenue, payment methods, and gift shop and food sales.',
    },
    {
      to: '/reports/customers',
      title: 'Customer Reports',
      blurb: 'Analyze customer spending and purchasing activity.',
    },
    {
      to: '/reports/operations',
      title: 'Operations Reports',
      blurb: 'Monitor enclosure occupancy, visitor traffic, and zoo closures.',
    },
  ]

  return (
    <div>
      <div className="page-card">
        <h2 style={{ marginTop: 0 }}>Zoo Reports</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
          Select a report category to view financial, customer, and
          operational information.
        </p>
      </div>

      <div className="report-grid">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="report-tile">
            <h3>{c.title}</h3>
            <p>{c.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function ReportCategory({ title, description, options }) {
  const [selectedReport, setSelectedReport] = useState(options[0].value)

  const SelectedComponent = options.find(
    (option) => option.value === selectedReport
  ).component

  return (
    <div>
      <div className="page-card">
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <p style={{ color: 'var(--muted)' }}>{description}</p>

        <label>
          Select report
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <SelectedComponent />
    </div>
  )
}

export function OccupancyReport() {
  return (
    <ReportPage
      title="Enclosure occupancy"
      description="Live capacity vs animals on exhibit. Use this before adding animals or planning moves."
      url="/api/reports/enclosure-occupancy"
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
          {
            insight: `${fullest.EnclosureName} is ${fullest.CapacityPercentage}% full.`,
          },
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
    />
  )
}

export function ProductSalesReport() {
  return (
    <ReportPage
      title="Gift shop & food sales"
      description="What visitors buy — restock winners, rethink slow movers."
      url="/api/reports/product-sales"
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
    />
  )
}

export function CustomerSpendingReport() {
  return (
    <ReportPage
      title="Guest spending"
      description="Lifetime spend and visit frequency — useful for memberships and promos."
      url="/api/reports/customer-spending"
      rowKey="CustomerID"
      columns={[
        { key: 'Email', label: 'Customer' },
        { key: 'TransactionCount', label: 'Purchases' },
        { key: 'LifetimeSpend', label: 'Total spent', isMoney: true },
      ]}
      summarize={(rows) => {
        const active = rows.filter((r) => Number(r.TransactionCount) > 0)
        const spend = active.reduce((s, r) => s + Number(r.LifetimeSpend), 0)
        const top = [...active].sort((a, b) => Number(b.LifetimeSpend) - Number(a.LifetimeSpend))[0]
        return [
          { label: 'Paying guests', value: active.length },
          { label: 'Total spend', value: money(spend) },
          { label: 'Top guest', value: top ? top.Email : '—' },
          top
            ? { insight: `${top.Email} has spent ${money(top.LifetimeSpend)} across ${top.TransactionCount} visits.` }
            : {},
        ]
      }}
      bar={(rows) => ({
        title: 'Highest lifetime spend',
        items: toBars(
          [...rows].sort((a, b) => Number(b.LifetimeSpend) - Number(a.LifetimeSpend)).slice(0, 8),
          'LifetimeSpend',
          'Email'
        ),
      })}
    />
  )
}

export function RevenueReport() {
  const [filters, setFilters] = useState({ startDate: '', endDate: '', paymentType: '' })

  return (
    <div>
      <FilterBar filters={filters} setFilters={setFilters}>
        <label>
          Payment
          <select
            value={filters.paymentType}
            onChange={(e) => setFilters({ ...filters, paymentType: e.target.value })}
          >
            <option value="">All</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
          </select>
        </label>
      </FilterBar>
      <ReportPage
        title="Revenue"
        description="Daily income from tickets + products. Filter by date and Cash vs Card."
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
          const card = rows.filter((r) => r.PaymentType === 'Card').reduce((s, r) => s + Number(r.Revenue), 0)
          const cash = rows.filter((r) => r.PaymentType === 'Cash').reduce((s, r) => s + Number(r.Revenue), 0)
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

export function RevenueReports() {
  return (
    <ReportCategory
      title="Revenue Reports"
      description="Review ticket income, payment methods, and product sales."
      options={[
        {
          value: 'revenue',
          label: 'Revenue',
          component: RevenueReport,
        },
        {
          value: 'sales',
          label: 'Gift Shop & Food Sales',
          component: ProductSalesReport,
        },
      ]}
    />
  )
}

export function CustomerReports() {
  return (
    <ReportCategory
      title="Customer Reports"
      description="Review customer spending and purchasing activity."
      options={[
        {
          value: 'spending',
          label: 'Guest Spending',
          component: CustomerSpendingReport,
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
