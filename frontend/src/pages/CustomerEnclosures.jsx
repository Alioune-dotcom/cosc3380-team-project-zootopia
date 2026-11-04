import { useEffect, useState } from 'react'
import { isPublicEnclosure } from '../zooInfo.js'

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

  function animalsInEnclosure(enclosureName) {
    // guests only see healthy animals on exhibit (sick are quarantined)
    return animals.filter((a) => a.Enclosure === enclosureName && !a.IsSick)
  }

  return (
    <div>
      <h1>Enclosures</h1>
      <p style={{ color: 'var(--muted)' }}>Wander the park — tap a habitat to see who’s home.</p>

      {error ? <p className="error">{error}</p> : null}

      {!error && enclosures.length === 0 ? <p>No enclosures to show.</p> : null}

      <div className="report-grid">
        {enclosures.filter(isPublicEnclosure).map((enc) => {
          const residents = animalsInEnclosure(enc.Name)
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
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default CustomerEnclosures
