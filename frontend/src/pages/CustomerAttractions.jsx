import { useEffect, useState } from 'react'

// read-only: free talks / shows included with admission
// ?public=1 hides attractions whose enclosure is closed or that fall on a closure day
function CustomerAttractions() {
  const [attractions, setAttractions] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const attRes = await fetch('/api/attractions?public=1')
        const attData = await attRes.json()

        if (!attRes.ok) {
          setError(attData.error || 'Could not load attractions')
          return
        }

        setAttractions(attData)
      } catch (err) {
        setError('Could not connect to the server')
      }
    }
    load()
  }, [])

  return (
    <div>
      <h1>Attractions</h1>
      <p>Keeper talks, feedings, and shows. All are free with admission.</p>

      {error ? <p className="error">{error}</p> : null}

      {!error && attractions.length === 0 ? (
        <p>No attractions scheduled.</p>
      ) : null}

      {attractions.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>When</th>
              <th>Length</th>
              <th>Enclosure</th>
              <th>Host</th>
            </tr>
          </thead>
          <tbody>
            {attractions.map((a) => (
              <tr key={a.AttractionID}>
                <td>{a.Name}</td>
                <td>{a.Type}</td>
                <td>{String(a.Schedule).replace('T', ' ').slice(0, 16)}</td>
                <td>{a.DurationMinutes ? a.DurationMinutes + ' min' : '—'}</td>
                <td>{a.EnclosureName}</td>
                <td>{a.HostName || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

export default CustomerAttractions
