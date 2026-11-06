import { useEffect, useState } from 'react'
import { isPublicEnclosure, isAnimalUnavailable, UNAVAILABLE_MESSAGE } from '../zooInfo.js'

const ANIMAL_PHOTOS = {
  Lion: '/images/lion.jpg',
  Elephant: '/images/elephant.jpg',
  Penguin: '/images/penguin.jpg',
  Giraffe: '/images/giraffe.jpg',
  Zebra: '/images/zebra.png',
}

function CustomerEnclosures() {
  const [enclosures, setEnclosures] = useState([])
  const [animals, setAnimals] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [encRes, aniRes] = await Promise.all([
          fetch('/api/enclosures'),
          fetch('/api/animals'),
        ])
        const encData = await encRes.json()
        const aniData = await aniRes.json()

        if (!encRes.ok) {
          setError(encData.error || 'Could not load enclosures')
          return
        }
        if (!aniRes.ok) {
          setError(aniData.error || 'Could not load animals')
          return
        }

        setEnclosures(encData)
        setAnimals(aniData)
      } catch (err) {
        setError('Could not connect to the server')
      }
    }
    load()
  }, [])

  // sick / quarantined animals are listed in their own panel, not on habitat cards
  const away = animals.filter(isAnimalUnavailable)

  function animalsInEnclosure(enclosureName) {
    return animals.filter((a) => a.Enclosure === enclosureName && !isAnimalUnavailable(a))
  }

  function restingFrom(enclosureId) {
    return animals.filter((a) => isAnimalUnavailable(a) && a.HomeEnclosureID === enclosureId)
  }

  return (
    <div>
      {away.length > 0 && (
        <div className="page-card" style={{ borderLeft: '4px solid #b45309', marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Not on display today</h3>
          <p>{UNAVAILABLE_MESSAGE}</p>
          <ul>
            {away.map((a) => (
              <li key={a.AnimalID}>{a.AnimalName} ({a.Species})</li>
            ))}
          </ul>
        </div>
      )}
      <h1>Enclosures</h1>
      <p style={{ color: 'var(--muted)' }}>Wander the park — tap a habitat to see who’s home.</p>

      {error ? <p className="error">{error}</p> : null}

      {!error && enclosures.length === 0 ? <p>No enclosures to show.</p> : null}

      <div className="report-grid">
        {enclosures.filter(isPublicEnclosure).map((enc) => {
          const residents = animalsInEnclosure(enc.Name)
          const resting = restingFrom(enc.EnclosureID)
          const coverSpecies = residents[0]?.Species
          return (
            <article key={enc.EnclosureID} className="report-tile" style={{ padding: 0, overflow: 'hidden' }}>
              <img
                src={ANIMAL_PHOTOS[coverSpecies] || '/images/hero-zoo.jpg'}
                alt={enc.Name}
                style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: 16 }}>
                <h3 style={{ margin: '0 0 6px' }}>{enc.Name}</h3>
                <p style={{ margin: '0 0 10px' }}>
                  {enc.HabitatType} · {enc.Location} · {enc.Status}
                </p>
                {residents.length === 0 ? (
                  <p style={{ margin: 0 }}>No animals listed right now.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {residents.map((a) => (
                      <li key={a.AnimalID}>
                        {a.AnimalName} <span style={{ color: 'var(--muted)' }}>({a.Species})</span>
                      </li>
                    ))}
                  </ul>
                )}
                {resting.length > 0 && (
                  <p style={{ margin: '10px 0 0', color: '#b45309' }}>
                    {resting.map((a) => a.AnimalName).join(', ')} not on display today. Come back and visit again soon!
                  </p>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default CustomerEnclosures
