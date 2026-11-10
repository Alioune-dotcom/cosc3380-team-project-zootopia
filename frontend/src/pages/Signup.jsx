import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { loginCustomer } from '../customerAuth.js'

// customer sign up. creates the account on the backend (/api/signup)
function Signup() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // one handler for every box, uses the input's name
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
  
    const cleanUsername = form.username.trim()
    const cleanEmail = form.email.trim()
  
    if (!cleanUsername || !cleanEmail || !form.password) {
      setError('Please fill in every field')
      return
    }
  
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
  
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          email: cleanEmail,
          password: form.password,
        }),
      })
      const data = await response.json()

      // backend checks if the email is already taken
      if (!response.ok) {
        setError(data.error)
        return
      }

      // signed up -> log them in right away
      setError('')
      loginCustomer(data)
      navigate('/checkout')
    } catch (err) {
      setError('Could not connect to the server')
    }
  }

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={handleSubmit}>
        <h2>Create an Account</h2>

        <label>Username</label>
        <input name="username" value={form.username} onChange={handleChange} />

        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={handleChange} />

        <label>Password</label>
        <input name="password" type="password" value={form.password} onChange={handleChange} />

        <label>Confirm password</label>
        <input name="confirm" type="password" value={form.confirm} onChange={handleChange} />

        {error ? <p className="error">{error}</p> : null}

        <button type="submit">Sign up</button>

        <p>Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  )
}

export default Signup