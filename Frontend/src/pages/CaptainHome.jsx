import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaptainDataContext } from '../context/CaptainContext'

const CaptainHome = () => {
  const navigate = useNavigate()
  const { captain, logout } = useContext(CaptainDataContext)

  const handleLogout = async () => {
    await logout()
    navigate('/captain-login')
  }

  return (
    <div className="min-h-screen w-full bg-white px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">Welcome back, captain</p>
          <h1 className="text-2xl font-semibold">{captain?.fullname?.firstname}</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm border border-gray-300 rounded-lg px-4 py-2 font-medium"
        >
          Log out
        </button>
      </div>

      <div className="mt-10 border border-gray-200 rounded-2xl p-5">
        <p className="text-gray-500 text-sm">Your vehicle</p>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="font-medium capitalize">{captain?.vehicle?.vehicleType}</p>
            <p className="text-sm text-gray-500">
              {captain?.vehicle?.color} &middot; {captain?.vehicle?.plate}
            </p>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              captain?.status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {captain?.status}
          </span>
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p>Signed in as {captain?.email}</p>
      </div>
    </div>
  )
}

export default CaptainHome
