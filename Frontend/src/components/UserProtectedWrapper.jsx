import { useContext, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { UserDataContext } from '../context/UserContext'

const UserProtectedWrapper = ({ children }) => {
  const { user, isLoading, loadUser } = useContext(UserDataContext)

  useEffect(() => {
    loadUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <p className="text-white text-sm tracking-wide">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default UserProtectedWrapper
