import { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { UserDataContext } from '../context/UserContext'

const UserSignup = () => {
  const navigate = useNavigate()
  const { login } = useContext(UserDataContext)

  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await api.post('/users/register', {
        fullname: { firstname, lastname },
        email,
        password,
      })

      login(response.data.data.token, response.data.data.user)
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
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-gray-500 text-sm mt-1">Sign up to start riding with Uber.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm text-gray-700">First name</label>
              <input
                type="text"
                required
                minLength={3}
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                placeholder="John"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-700">Last name</label>
              <input
                type="text"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                placeholder="Doe"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black"
              />
            </div>
          </div>

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
              placeholder="At least 8 characters"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full bg-black text-white py-3 rounded-lg font-medium disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-black font-medium underline">
            Log in
          </Link>
        </p>
      </div>

      <p className="text-xs text-gray-400 text-center">
        By proceeding, you consent to receive updates about your account.
      </p>
    </div>
  )
}

export default UserSignup
