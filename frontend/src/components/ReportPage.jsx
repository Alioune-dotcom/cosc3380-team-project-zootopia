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
      const response = await fetch(url)
      const data = await response.json()
      if (!response.ok) {
        setError(data.error)
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

  const kpis = useMemo(() => (summarize ? summarize(rows) : []), [rows, summarize])
  const bars = useMemo(() => (bar ? bar(rows) : null), [rows, bar])
  const insight = bars?.insight || kpis.find((k) => k.insight)?.insight

  return (
    <div>
      <div className="page-card">
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <p style={{ color: 'var(--muted)' }}>{description}</p>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Set any filters above (optional), then generate. Nothing loads until you click the button.
        </p>
        <button type="button" className="gold" onClick={generateReport} disabled={loading}>
          {loading ? 'Generating…' : hasGenerated ? 'Regenerate report' : 'Generate report'}
        </button>
      </div>

      {error ? <p className="message error">{error}</p> : null}

      {!hasGenerated && !loading ? (
        <div className="insight">Report not generated yet — click Generate when you are ready.</div>
      ) : null}

      {hasGenerated && !loading && !error ? (
        <>
          {insight ? <div className="insight">{insight}</div> : null}

          {kpis.length > 0 ? (
            <div className="kpi-row">
              {kpis.filter((k) => k.label).map((k) => (
                <div key={k.label} className="stat-box">
                  <strong>{k.value}</strong>
                  <span>{k.label}</span>
                </div>
              ))}
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
                      <div className="bar-fill" style={{ width: item.pct + '%' }} />
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
