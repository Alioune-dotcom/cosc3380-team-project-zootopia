
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
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)

  async function generateReport() {
    setLoading(true)
    setError('')
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
        </>
      ) : null}
    </div>
  )
}

export default ReportPage
