import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import ReportPage from '../components/ReportPage.jsx'
import DataTable from '../components/DataTable.jsx'

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
      blurb: 'Monitor animal counts, health, species, and individual animals.',
    },
    {
      to: '/reports/visitors',
      title: 'Visitor Activity',
      blurb: 'Analyze ticket popularity, customer activity, and planned enclosure visits.',
    },
  ]

  return (
    <div>
      <div className="page-card">
        <h2 style={{ marginTop: 0 }}>Zoo Reports</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
          Explore the zoo's financial performance, animal population, and visitor activity.
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
  const emptyFilters = {
    speciesId: '',
    enclosureId: '',
    sex: '',
    healthStatus: '',
  }

  const [filters, setFilters] = useState(emptyFilters)
  const [data, setData] = useState(null)
  const [species, setSpecies] = useState([])
  const [enclosures, setEnclosures] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/species').then((res) => res.json()),
      fetch('/api/enclosures').then((res) => res.json()),
    ])
      .then(([speciesData, enclosureData]) => {
        setSpecies(Array.isArray(speciesData) ? speciesData : [])
        setEnclosures(Array.isArray(enclosureData) ? enclosureData : [])
      })
      .catch((err) => {
        console.error('Could not load animal population filters:', err)
      })
  }, [])

  async function generateReport(selectedFilters = filters) {
    setLoading(true)
    setError('')
    setHasGenerated(true)

    try {
      const params = new URLSearchParams()

      Object.entries(selectedFilters).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })

      const query = params.toString()
      const url = query
        ? `/api/reports/animal-population?${query}`
        : '/api/reports/animal-population'

      const response = await fetch(url)
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

  function clearFilters() {
    setFilters(emptyFilters)
  }

  const summary = data?.summary
  const sexCounts = data?.bySex || []

  const animalDetailColumns = [
    { key: 'AnimalID', label: 'Animal ID' },
    { key: 'Name', label: 'Animal Name' },
    { key: 'CommonName', label: 'Species' },
    { key: 'EnclosureName', label: 'Enclosure' },
    { key: 'Sex', label: 'Sex' },
    { key: 'HealthStatus', label: 'Health Status' },
  ]

  const maleCount =
    sexCounts.find((row) => row.Sex === 'Male')?.AnimalCount ?? 0

  const femaleCount =
    sexCounts.find((row) => row.Sex === 'Female')?.AnimalCount ?? 0

  return (
    <div>
      <div className="page-card">
        <h2 style={{ marginTop: 0 }}>Animal Population</h2>
        <p style={{ color: 'var(--muted)' }}>
          View the zoo's active animal population, health counts, species,
          and enclosure distribution.
        </p>

        <div className="search-form">
          <label>
            Species
            <select
              value={filters.speciesId}
              onChange={(e) =>
                setFilters({ ...filters, speciesId: e.target.value })
              }
            >
              <option value="">All species</option>
              {species.map((item) => (
                <option key={item.SpeciesID} value={item.SpeciesID}>
                  {item.CommonName}
                </option>
              ))}
            </select>
          </label>

          <label>
            Enclosure
            <select
              value={filters.enclosureId}
              onChange={(e) =>
                setFilters({ ...filters, enclosureId: e.target.value })
              }
            >
              <option value="">All enclosures</option>
              {enclosures.map((item) => (
                <option key={item.EnclosureID} value={item.EnclosureID}>
                  {item.Name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sex
            <select
              value={filters.sex}
              onChange={(e) =>
                setFilters({ ...filters, sex: e.target.value })
              }
            >
              <option value="">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </label>

          <label>
            Health status
            <select
              value={filters.healthStatus}
              onChange={(e) =>
                setFilters({ ...filters, healthStatus: e.target.value })
              }
            >
              <option value="">All statuses</option>
              <option value="healthy">Healthy</option>
              <option value="sick">Sick</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            type="button"
            className="gold"
            onClick={() => generateReport(filters)}
            disabled={loading}
          >
            {loading ? 'Generating…' : 'Apply Filters'}
          </button>

          <button
            type="button"
            onClick={clearFilters}
            disabled={loading}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {error ? <p className="message error">{error}</p> : null}

      {!hasGenerated && !loading ? (
        <div className="insight">
          Report not generated yet — select your filters and click Apply Filters.
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
            <div className="stat-box">
              <strong>{maleCount}</strong>
              <span>Male animals</span>
            </div>
            <div className="stat-box">
              <strong>{femaleCount}</strong>
              <span>Female animals</span>
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
            <h3 style={{ marginTop: 0 }}>Detailed animal records</h3>

            {data.details?.length > 0 ? (
              <DataTable
                columns={animalDetailColumns}
                rows={data.details}
                rowKey="AnimalID"
              />
            ) : (
              <p>No animals found for these filters.</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}



export function VisitorActivityReport() {
  const emptyFilters = {
    startDate: '',
    endDate: '',
    ticketType: '',
    enclosureId: '',
    habitatType: '',
  }

  const [filters, setFilters] = useState(emptyFilters)
  const [enclosures, setEnclosures] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)
  const [reportView, setReportView] = useState('both')

  useEffect(() => {
    fetch('/api/enclosures')
      .then((res) => res.json())
      .then((result) => {
        setEnclosures(Array.isArray(result) ? result : [])
      })
      .catch((err) => {
        console.error('Could not load enclosures:', err)
      })
  }, [])

  const habitatTypes = [
    ...new Set(enclosures.map((item) => item.HabitatType).filter(Boolean)),
  ].sort()

  async function generateReport(selectedFilters = filters) {
    setLoading(true)
    setError('')
    setHasGenerated(true)

    try {
      const url = buildUrl(
        '/api/reports/visitor-activity',
        selectedFilters
      )

      const response = await fetch(url)
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

  function clearFilters() {
    setFilters(emptyFilters)
  }

  const summary = data?.summary
  const ticketRows = data?.ticketPopularity || []
  const visitRows = data?.plannedVisits || []
  const ticketDetailRows = data?.ticketDetails || []
  const visitDetailRows = data?.plannedVisitDetails || []
  const showTickets = reportView === 'both' || reportView === 'tickets'
  const showVisits = reportView === 'both' || reportView === 'visits'

  return (
    <div>
      <div className="page-card">
        <h2 style={{ marginTop: 0 }}>Visitor Activity</h2>
        <p style={{ color: 'var(--muted)' }}>
          Analyze ticket preferences, customer activity, and the enclosures
          customers plan to visit.
        </p>


        <div className="visitor-filter-form">

          {/* Report View */}
          <div className="visitor-filter-group visitor-view-group">
            <h3>Report View</h3>
            <p>Choose which visitor activity information to display.</p>

            <label>
              Select report
              <select
                value={reportView}
                onChange={(e) => setReportView(e.target.value)}
              >
                <option value="both">Both reports</option>
                <option value="tickets">Ticket purchases</option>
                <option value="visits">Planned visits</option>
              </select>
            </label>
          </div>

          {/* Shared Date Filters */}
          <div className="visitor-filter-group">
            <h3>Date Range</h3>
            <p>Applies to the selected report or reports.</p>

            <label>
              Start date
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
            </label>

            <label>
              End date
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
              />
            </label>
          </div>

          {/* Ticket Filters */}
          {showTickets && (
            <div className="visitor-filter-group">
              <h3>Ticket Purchase Filters</h3>
              <p>Filter ticket sales and customer purchases.</p>

              <label>
                Ticket type
                <select
                  value={filters.ticketType}
                  onChange={(e) =>
                    setFilters({ ...filters, ticketType: e.target.value })
                  }
                >
                  <option value="">All ticket types</option>
                  <option value="Adult">Adult</option>
                  <option value="Child">Child</option>
                  <option value="Senior">Senior</option>
                </select>
              </label>
            </div>
          )}

          {/* Planned Visit Filters */}
          {showVisits && (
            <div className="visitor-filter-group">
              <h3>Planned Visit Filters</h3>
              <p>Filter customer interest in enclosures and habitats.</p>

              <label>
                Enclosure
                <select
                  value={filters.enclosureId}
                  onChange={(e) =>
                    setFilters({ ...filters, enclosureId: e.target.value })
                  }
                >
                  <option value="">All enclosures</option>
                  {enclosures.map((item) => (
                    <option key={item.EnclosureID} value={item.EnclosureID}>
                      {item.Name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Habitat type
                <select
                  value={filters.habitatType}
                  onChange={(e) =>
                    setFilters({ ...filters, habitatType: e.target.value })
                  }
                >
                  <option value="">All habitat types</option>
                  {habitatTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

        </div>


        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            type="button"
            className="gold"
            onClick={() => generateReport(filters)}
            disabled={loading}
          >
            {loading ? 'Generating…' : 'Apply Filters'}
          </button>

          <button
            type="button"
            onClick={clearFilters}
            disabled={loading}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {error ? <p className="message error">{error}</p> : null}

      {!hasGenerated && !loading ? (
        <div className="insight">
          Report not generated yet — select your filters and click Apply Filters.
        </div>
      ) : null}

      {loading ? <p>Generating report…</p> : null}

      {data && !loading && !error ? (
        <>
          <div className="kpi-row">
            {showTickets && (
              <>
                <div className="stat-box">
                  <strong>{Number(summary?.TotalTicketsSold || 0)}</strong>
                  <span>Tickets sold</span>
                </div>

                <div className="stat-box">
                  <strong>{summary?.MostPopularTicketType || '—'}</strong>
                  <span>Most popular ticket</span>
                </div>

                <div className="stat-box">
                  <strong>{Number(summary?.UniqueCustomers || 0)}</strong>
                  <span>Unique customers</span>
                </div>
              </>
            )}

            {showVisits && (
              <>
                <div className="stat-box">
                  <strong>{Number(summary?.TotalPlannedVisits || 0)}</strong>
                  <span>Planned enclosure visits</span>
                </div>

                <div className="stat-box">
                  <strong>{summary?.MostPopularEnclosure || '—'}</strong>
                  <span>Most popular enclosure</span>
                </div>
              </>
            )}
          </div>

          {showTickets && (
            <>
              <div className="page-card">
                <h3 style={{ marginTop: 0 }}>Ticket popularity</h3>

                {ticketRows.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Ticket type</th>
                        <th>Tickets sold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticketRows.map((row) => (
                        <tr key={row.TicketType}>
                          <td>{row.TicketType}</td>
                          <td>{Number(row.TicketsSold)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No ticket sales found for these filters.</p>
                )}
              </div>

              <div className="page-card">
                <h3 style={{ marginTop: 0 }}>Ticket purchase details</h3>
                <p style={{ color: 'var(--muted)' }}>
                  Individual ticket purchases made by customers.
                </p>

                {ticketDetailRows.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Purchase Date</th>
                        <th>Customer Email</th>
                        <th>Ticket Type</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticketDetailRows.map((row) => (
                        <tr key={row.TicketID}>
                          <td>{row.TransactionID}</td>
                          <td>{new Date(row.PurchaseDate).toLocaleDateString()}</td>
                          <td>{row.CustomerEmail}</td>
                          <td>{row.TicketType}</td>
                          <td>{Number(row.Quantity)}</td>
                          <td>${Number(row.UnitPrice).toFixed(2)}</td>
                          <td>${Number(row.TotalPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No ticket purchase details found for these filters.</p>
                )}
              </div>

            </>
          )}

          {showVisits && (
            <>
              <div className="page-card">
                <h3 style={{ marginTop: 0 }}>Planned enclosure visits</h3>
                <p style={{ color: 'var(--muted)' }}>
                  Shows the enclosures customers selected during checkout.
                </p>

                {visitRows.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Enclosure</th>
                        <th>Location</th>
                        <th>Habitat type</th>
                        <th>Planned visits</th>
                        <th>Unique customers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitRows.map((row) => (
                        <tr key={row.EnclosureID}>
                          <td>{row.EnclosureName}</td>
                          <td>{row.Location || '—'}</td>
                          <td>{row.HabitatType || '—'}</td>
                          <td>{Number(row.VisitCount)}</td>
                          <td>{Number(row.UniqueCustomers)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No planned enclosure visits found for these filters.</p>
                )}
              </div>


              <div className="page-card">
                <h3 style={{ marginTop: 0 }}>Planned visit details</h3>
                <p style={{ color: 'var(--muted)' }}>
                  Individual enclosure selections made during customer checkout.
                </p>

                {visitDetailRows.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Date</th>
                        <th>Customer Email</th>
                        <th>Enclosure</th>
                        <th>Location</th>
                        <th>Habitat Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitDetailRows.map((row) => (
                        <tr key={row.VisitDetailID}>
                          <td>{row.TransactionID}</td>
                          <td>{new Date(row.VisitDate).toLocaleDateString()}</td>
                          <td>{row.CustomerEmail}</td>
                          <td>{row.EnclosureName}</td>
                          <td>{row.Location || '—'}</td>
                          <td>{row.HabitatType || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No planned visit details found for these filters.</p>
                )}
              </div>

            </>
          )}

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
      title="Zoo Capacity"
      description="Evaluate habitat utilization, available spaces, and enclosures approaching their capacity."
      url="/api/reports/enclosure-occupancy"
      filters={filters}

      rowKey="EnclosureID"
      columns={[
        { key: 'EnclosureName', label: 'Enclosure' },
        { key: 'Capacity', label: 'Total Capacity' },
        { key: 'AnimalCount', label: 'Animals Housed' },
        { key: 'RemainingCapacity', label: 'Available Spaces' },
        { key: 'CapacityPercentage', label: '% Full' },
      ]}
      summarize={(rows) => {
        if (!rows.length) return []

        const totalCapacity = rows.reduce(
          (sum, row) => sum + Number(row.Capacity || 0),
          0
        )

        const animalsHoused = rows.reduce(
          (sum, row) => sum + Number(row.AnimalCount || 0),
          0
        )

        const availableSpaces = rows.reduce(
          (sum, row) => sum + Math.max(0, Number(row.RemainingCapacity || 0)),
          0
        )

        const occupiedEnclosures = rows.filter(
          (row) => Number(row.AnimalCount) > 0
        ).length

        const nearCapacity = rows.filter((row) => {
          const percentage = Number(row.CapacityPercentage || 0)
          return percentage >= 80 && percentage < 100
        }).length

        const atCapacity = rows.filter(
          (row) => Number(row.CapacityPercentage || 0) >= 100
        ).length

        const avgFill = totalCapacity > 0
          ? (animalsHoused / totalCapacity) * 100
          : 0

        return [
          { label: 'Animals housed', value: animalsHoused },
          { label: 'Total habitat capacity', value: totalCapacity },
          { label: 'Available spaces', value: availableSpaces },
          { label: 'Occupied enclosures', value: `${occupiedEnclosures} / ${rows.length}` },
          { label: 'Near capacity (80%+)', value: nearCapacity },
          { label: 'At/over capacity', value: atCapacity },
          { insight: `Overall habitat utilization is ${avgFill.toFixed(1)}%.` },
        ]
      }}
      bar={(rows) => ({
        title: 'Capacity utilization by enclosure',
        items: [...rows]
          .sort((a, b) => Number(b.CapacityPercentage) - Number(a.CapacityPercentage))
          .map((row) => ({
            label: row.EnclosureName,
            pct: Math.min(100, Number(row.CapacityPercentage) || 0),
            display: `${row.CapacityPercentage}%`,
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
    shopId: '',
    productName: '',
    ticketType: '',
  })

  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [shops, setShops] = useState([])

  useEffect(() => {
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Could not load customers:', err))

    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Could not load products:', err))

    fetch('/api/shops')
      .then((res) => res.json())
      .then((data) => setShops(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Could not load shops:', err))
  }, [])

  const productNames = [
    ...new Set(products.map((product) => product.Name)),
  ].sort((a, b) => a.localeCompare(b))

  const emptyFilters = {
    startDate: '',
    endDate: '',
    paymentType: '',
    customerId: '',
    shopId: '',
    productName: '',
    ticketType: '',
  }

  function clearFilters() {
    setFilters({ ...emptyFilters })
  }

  return (
    <ReportPage
      title="Revenue"
      description="Analyze zoo revenue by date, payment method, customer, shop, product, and ticket type."
      insightAsCard
      filtersInside
      filters={filters}
      onClearFilters={clearFilters}
      url="/api/reports/revenue"
      detailsUrl="/api/reports/revenue/details"
      detailRowKey="TransactionID"
      detailColumns={[
        { key: 'TransactionID', label: 'Transaction ID' },
        { key: 'SaleDate', label: 'Date', isDateTime: true },
        { key: 'CustomerEmail', label: 'Customer' },
        {
          key: 'EmployeeName',
          label: 'Employee',
          format: (value, row) =>
            String(row.ShopName || '').toLowerCase().includes('online')
              ? 'Online Order'
              : value || '—',
        },
        { key: 'ShopName', label: 'Shop' },
        { key: 'PaymentType', label: 'Payment' },
        { key: 'TicketDetails', label: 'Tickets' },
        { key: 'ProductDetails', label: 'Products' },
        { key: 'TotalAmount', label: 'Total', isMoney: true },
      ]}
      rowKey={(row) => row.SaleDate + '-' + row.PaymentType}
      columns={[
        { key: 'SaleDate', label: 'Date', isDateTime: true },
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
          const key = new Date(r.SaleDate).toLocaleDateString('en-CA', {
            timeZone: 'America/Chicago',
          })

          byDate[key] = (byDate[key] || 0) + Number(r.Revenue)
        })

        const items = Object.entries(byDate)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([date, value]) => {
            const [year, month, day] = date.split('-')

            return {
              label: `${month}/${day}/${year}`,
              value,
            }
          })

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
    >
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

        <label>
          Shop
          <select
            value={filters.shopId}
            onChange={(e) =>
              setFilters({ ...filters, shopId: e.target.value })
            }
          >
            <option value="">All shops</option>
            {shops.map((shop) => (
              <option key={shop.ShopID} value={shop.ShopID}>
                {shop.Name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Product
          <select
            value={filters.productName}
            onChange={(e) =>
              setFilters({ ...filters, productName: e.target.value })
            }
          >
            <option value="">All products</option>
            {productNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ticket Type
          <select
            value={filters.ticketType}
            onChange={(e) =>
              setFilters({ ...filters, ticketType: e.target.value })
            }
          >
            <option value="">All ticket types</option>
            <option value="Adult">Adult</option>
            <option value="Child">Child</option>
            <option value="Senior">Senior</option>
          </select>
        </label>
      </FilterBar>
    </ReportPage>
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
