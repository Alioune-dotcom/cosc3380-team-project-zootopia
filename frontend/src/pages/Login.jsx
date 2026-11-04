import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()

    const cleanUsername = username.trim()
    if (!cleanUsername || !password) {
      setError('Please fill in both fields')
      return
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        return
      }

      if (data.role === 'Customer') {
        setError('Use Customer Login for guest accounts')
        return
      }

      setError('')
      localStorage.setItem('user', JSON.stringify({
        username: data.username,
        role: data.role,
        employeeId: data.employeeId,
      }))
      navigate('/dashboard')
    } catch (err) {
      setError('Could not connect to the server')
    }
  }

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={handleSubmit}>
        <h2>Staff Login</h2>

        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error ? <p className="error">{error}</p> : null}

        <button type="submit">Log in</button>

        <p><Link to="/">← Back to Zootopia Zoo</Link></p>
      </form>
    </div>
  )
}

export default Login
