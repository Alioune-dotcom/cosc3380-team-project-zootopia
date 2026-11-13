
import { useMemo, useState } from 'react'
import DataTable from './DataTable.jsx'

// Reports stay blank until Generate — filters are optional.
function ReportPage({
  title,
  description,
  url,
  columns,
  rowKey,
  summarize,
  bar,
  filters,
  children,
  insightAsCard = false,
  filtersInside = false,
  onClearFilters,
  detailsUrl,
  detailColumns,
  detailRowKey,
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)
  const [detailRows, setDetailRows] = useState([])
  const [detailsError, setDetailsError] = useState('')

  async function generateReport() {
    setLoading(true)
    setError('')
    setDetailsError('')
    setDetailRows([])
    setHasGenerated(true)

    try {
      const params = new URLSearchParams()

      Object.entries(filters || {}).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })

      const query = params.toString()
      const reportUrl = query ? `${url}?${query}` : url

      const response = await fetch(reportUrl)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Could not generate report')
        setRows([])
      } else {
        setRows(data)

        // Load detailed records when this report supports them.
        if (detailsUrl) {
          try {
            const detailsResponse = await fetch(
              query ? `${detailsUrl}?${query}` : detailsUrl
            )
            const detailsData = await detailsResponse.json()

            if (!detailsResponse.ok) {
              setDetailsError(
                detailsData.error || 'Could not load detailed records'
              )
            } else {
              setDetailRows(
                Array.isArray(detailsData) ? detailsData : []
              )
            }
          } catch (detailError) {
            setDetailsError('Could not connect to the details endpoint')
          }
        }
      }
    } catch (err) {
      setError('Could not connect to the server')
      setRows([])
    }

    setLoading(false)
  }

  const kpis = useMemo(
    () => (summarize ? summarize(rows) : []),
    [rows, summarize]
  )

  const bars = useMemo(
    () => (bar ? bar(rows) : null),
    [rows, bar]
  )

  const visibleDetailColumns = useMemo(() => {
    return (detailColumns || []).filter((col) => {
      const isCash = filters?.paymentType === 'Cash'
      const hasTicketFilter = Boolean(filters?.ticketType)
      const hasProductFilter = Boolean(
        filters?.productId || filters?.productName
      )
      const isOnlineStore = String(filters?.shopId) === '4'

      // Cash: hide ticket information (tickets are online/card only).
      // Keep Customer: in-person cash sales can carry a receipt email.
      if (isCash && col.key === 'TicketDetails') {
        return false
      }

      // Ticket filter: hide employee and product information.
      if (
        hasTicketFilter &&
        ['EmployeeName', 'ProductDetails'].includes(col.key)
      ) {
        return false
      }

      // Product filter: hide ticket information.
      if (hasProductFilter && col.key === 'TicketDetails') {
        return false
      }


      // Customer selected: hide employee information.
      if (filters?.customerId && col.key === 'EmployeeName') {
        return false
      }

      // A non-online shop selected: hide ticket information.
      // Keep Customer: the cashier may have entered a receipt email.
      if (filters?.shopId && !isOnlineStore && col.key === 'TicketDetails') {
        return false
      }

      return true
    })
  }, [detailColumns, filters])

  const insight = bars?.insight || kpis.find((k) => k.insight)?.insight

  return (
    <div>
      {!filtersInside ? children : null}

      <div className="page-card">
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <p style={{ color: 'var(--muted)' }}>{description}</p>

        {filtersInside ? children : null}

        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Set any filters (optional), then generate.
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            type="button"
            className="gold"
            onClick={generateReport}
            disabled={loading}
          >
            {loading ? 'Generating…' : 'Apply Filters'}
          </button>

          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              disabled={loading}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {error ? <p className="message error">{error}</p> : null}

      {!hasGenerated && !loading ? (
        <div className="insight">
          Report not generated yet — click Generate when you are ready.
        </div>
      ) : null}

      {hasGenerated && !loading && !error ? (
        <>
          {insight && !insightAsCard ? (
            <div className="insight">{insight}</div>
          ) : null}

          {kpis.filter((k) => k.label).length > 0 ||
            insightAsCard && insight ? (
            <div className="kpi-row">
              {kpis.filter((k) => k.label).map((k) => (
                <div key={k.label} className="stat-box">
                  <strong>{k.value}</strong>
                  <span>{k.label}</span>
                </div>
              ))}

              {insightAsCard && insight ? (
                <div className="stat-box insight-stat-box">
                  <span>{insight}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {bars?.items?.length ? (
            <div className="page-card">
              <h3 style={{ marginTop: 0 }}>{bars.title || 'Breakdown'}</h3>
              <div className="bar-list">
                {bars.items.map((item) => (
                  <div key={item.label} className="bar-row">
                    <span>{item.label}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: item.pct + '%' }}
                      />
                    </div>
                    <strong>{item.display}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="page-card">
            <h3 style={{ marginTop: 0 }}>Detail table</h3>
            <DataTable columns={columns} rows={rows} rowKey={rowKey} />
          </div>

          {detailsUrl ? (
            <div className="page-card">
              <h3 style={{ marginTop: 0 }}>Detailed transactions</h3>

              {detailsError ? (
                <p className="message error">{detailsError}</p>
              ) : (
                <DataTable
                  columns={visibleDetailColumns}
                  rows={detailRows}
                  rowKey={detailRowKey}
                />
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )


}

export default ReportPage
