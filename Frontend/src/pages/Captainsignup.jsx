import React, { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { CaptainDataContext } from '../context/CaptainContext'

const Captainsignup = () => {
  const navigate = useNavigate()
  const { login } = useContext(CaptainDataContext)

  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [color, setColor] = useState('')
  const [plate, setPlate] = useState('')
  const [capacity, setCapacity] = useState('')
  const [vehicleType, setVehicleType] = useState('car')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await api.post('/captains/register', {
        fullname: { firstname, lastname },
        email,
        password,
        vehicle: {
          color,
          plate,
          capacity: Number(capacity),
          vehicleType,
        },
      })

      login(response.data.token, response.data.captain)
      navigate('/captain-home')
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
    <div className="min-h-screen w-full bg-white px-6 py-8">
      <h1 className="text-2xl font-semibold">Become a captain</h1>
      <p className="text-gray-500 text-sm mt-1">Sign up to start driving with Uber.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4 pb-8">
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

        <div className="border-t border-gray-200 pt-4 mt-2">
          <p className="text-sm font-medium text-gray-800">Vehicle details</p>

          <div className="flex gap-3 mt-3">
            <div className="flex-1">
              <label className="text-sm text-gray-700">Color</label>
              <input
                type="text"
                required
                minLength={3}
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Black"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-700">Plate number</label>
              <input
                type="text"
                required
                minLength={3}
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="AB12CD3456"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-3">
            <div className="flex-1">
              <label className="text-sm text-gray-700">Capacity</label>
              <input
                type="number"
                required
                min={1}
                max={5}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="4"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-700">Vehicle type</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black bg-white"
              >
                <option value="car">Car</option>
                <option value="auto">Auto</option>
                <option value="bike">Bike</option>
              </select>
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full bg-black text-white py-3 rounded-lg font-medium disabled:opacity-60"
        >
          {isSubmitting ? 'Creating account...' : 'Create captain account'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 -mt-4 mb-4">
        Already a captain?{' '}
        <Link to="/captain-login" className="text-black font-medium underline">
          Log in
        </Link>
      </p>
    </div>
  )
}

export default Captainsignup
