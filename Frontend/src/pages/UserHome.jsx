import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserDataContext } from '../context/UserContext'

const UserHome = () => {
  const navigate = useNavigate()
  const { user, logout } = useContext(UserDataContext)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen w-full bg-white px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">Welcome back</p>
          <h1 className="text-2xl font-semibold">{user?.fullname?.firstname}</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm border border-gray-300 rounded-lg px-4 py-2 font-medium"
        >
          Log out
        </button>
      </div>

      <div className="mt-10 border border-gray-200 rounded-2xl p-5">
        <p className="text-gray-500 text-sm">Where to?</p>
        <div className="mt-3 border border-gray-300 rounded-lg px-3 py-3 text-gray-400 text-sm">
          Enter your destination
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p>Signed in as {user?.email}</p>
      </div>
    </div>
  )
}

export default UserHome
