import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import './Home.css'
import { TICKETS, isAnimalUnavailable, UNAVAILABLE_MESSAGE } from '../zooInfo.js'

const HOURS = [
  { days: 'Monday – Friday', time: '9am – 5pm' },
  { days: 'Saturday – Sunday', time: '9am – 6pm' },
]

const ANIMAL_PHOTOS = {
  Lion: '/images/lion.jpg',
  Elephant: '/images/elephant.jpg',
  Penguin: '/images/penguin.jpg',
  Giraffe: '/images/giraffe.jpg',
  Zebra: '/images/zebra.png',
}

function Home() {
  const [animals, setAnimals] = useState([])

  useEffect(() => {
    async function loadAnimals() {
      try {
        const response = await fetch('/api/animals')
        const data = await response.json()
        // show every animal; ones on display first, sick/quarantined ones greyed out
        if (response.ok) {
          setAnimals([...data].sort((a, b) => isAnimalUnavailable(a) - isAnimalUnavailable(b)))
        }
      } catch (err) {
        // leave empty if backend is down
      }
    }
    loadAnimals()
  }, [])

  return (
    <div className="home-shell">
      <header className="home-header">
        <span className="home-logo">Zootopia Zoo</span>
        <nav>
          <a href="#hours">Hours</a>
          <a href="#tickets">Tickets</a>
          <a href="#animals">Animals</a>
          <Link className="home-nav-cta" to="/customer-login">Customer Login</Link>
          <Link to="/signup">Sign up</Link>
        </nav>
      </header>

      <section className="home-hero">
        <img
          className="home-hero-img"
          src="/images/hero-zoo.jpg"
          alt="Animals at Zootopia Zoo"
        />
        <div className="home-hero-copy">
          <p className="home-eyebrow">Houston’s wildest day out</p>
          <h1>Zootopia Zoo</h1>
          <p>Buy tickets, wander enclosures, and meet animals from around the world.</p>
          <div className="home-hero-actions">
            <Link className="btn gold" to="/customer-login">Buy tickets</Link>
            <a className="btn secondary" href="#animals">Meet the animals</a>
          </div>
        </div>
      </section>

      <main className="home-main">
        <section id="hours" className="home-section">
          <h2>Hours</h2>
          <div className="hours-grid">
            {HOURS.map((h) => (
              <div key={h.days} className="hours-card">
                <strong>{h.days}</strong>
                <span>{h.time}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="tickets" className="home-section">
          <h2>Tickets</h2>
          <p className="home-lead">Mix Adult, Child, and Senior tickets in one purchase — pick quantities at checkout.</p>
          <div className="ticket-grid">
            {TICKETS.map((t) => (
              <div key={t.type} className="ticket-card">
                <span>{t.type}</span>
                <strong>${t.price.toFixed(2)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section id="animals" className="home-section">
          <h2>Meet Our Animals</h2>
          {animals.length === 0 ? (
            <p>No animals to show right now.</p>
          ) : (
            <div className="animal-grid">
              {animals.map((a) => {
                const away = isAnimalUnavailable(a)
                return (
                  <article key={a.AnimalID} className={'animal-card' + (away ? ' unavailable' : '')}>
                    <img
                      src={ANIMAL_PHOTOS[a.Species] || '/images/hero-zoo.jpg'}
                      alt={a.AnimalName}
                      className="animal-photo"
                    />
                    {away ? <span className="animal-badge">Not on display</span> : null}
                    <div className="animal-meta">
                      <strong>{a.AnimalName}</strong>
                      <span>{a.Species}</span>
                      {away ? <em>{UNAVAILABLE_MESSAGE}</em> : <em>{a.Enclosure}</em>}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="home-footer">
        <p>© 2026 Zootopia Zoo</p>
        <Link className="staff-link" to="/login">Staff login</Link>
      </footer>
    </div>
  )
}

export default Home
