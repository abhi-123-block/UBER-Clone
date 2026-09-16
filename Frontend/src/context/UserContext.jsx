import { createContext, useState, useCallback } from 'react'
import api from '../utils/api'

export const UserDataContext = createContext(null)

const UserContextProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Called once on app load to check for an existing session (token in localStorage).
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('userToken')
    if (!token) {
      setIsLoading(false)
      return
    }
    try {
      const response = await api.get('/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUser(response.data.data.user)
    } catch {
      localStorage.removeItem('userToken')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('userToken', token)
    setUser(userData)
  }

  const logout = async () => {
    const token = localStorage.getItem('userToken')
    try {
      await api.get('/users/logout', {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // Even if the request fails, still clear the local session.
    }
    localStorage.removeItem('userToken')
    setUser(null)
  }

  return (
    <UserDataContext.Provider value={{ user, setUser, isLoading, loadUser, login, logout }}>
      {children}
    </UserDataContext.Provider>
  )
}

export default UserContextProvider
