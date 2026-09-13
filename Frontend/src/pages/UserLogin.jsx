import React, { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { UserDataContext } from '../context/UserContext'

const UserLogin = () => {
  const navigate = useNavigate()
  const { login } = useContext(UserDataContext)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await api.post('/users/login', { email, password })
      login(response.data.token, response.data.user)
      navigate('/home')
    } catch (err) {
      const backendErrors = err.response?.data?.errors
      const backendMessage = err.response?.data?.message
      if (backendErrors?.length) {
        setError(backendErrors[0].msg)
      } else if (backendMessage) {
        setError(backendMessage)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-screen w-full flex flex-col justify-between bg-white px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Log in</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="text-sm text-gray-700">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full bg-black text-white py-3 rounded-lg font-medium disabled:opacity-60"
          >
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          New here?{' '}
          <Link to="/signup" className="text-black font-medium underline">
            Create an account
          </Link>
        </p>
      </div>

      <Link
        to="/captain-login"
        className="flex items-center justify-center w-full border border-gray-300 text-black py-3 rounded-lg font-medium"
      >
        Sign in as a captain
      </Link>
    </div>
  )
}

export default UserLogin
