import { createContext, useState, useCallback } from 'react'
import api from '../utils/api'

export const CaptainDataContext = createContext(null)

const CaptainContextProvider = ({ children }) => {
  const [captain, setCaptain] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadCaptain = useCallback(async () => {
    const token = localStorage.getItem('captainToken')
    if (!token) {
      setIsLoading(false)
      return
    }
    try {
      const response = await api.get('/captains/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setCaptain(response.data.data.captain)
    } catch {
      localStorage.removeItem('captainToken')
      setCaptain(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = (token, captainData) => {
    localStorage.setItem('captainToken', token)
    setCaptain(captainData)
  }

  const logout = async () => {
    const token = localStorage.getItem('captainToken')
    try {
      await api.get('/captains/logout', {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // Even if the request fails, still clear the local session.
    }
    localStorage.removeItem('captainToken')
    setCaptain(null)
  }

  return (
    <CaptainDataContext.Provider value={{ captain, setCaptain, isLoading, loadCaptain, login, logout }}>
      {children}
    </CaptainDataContext.Provider>
  )
}

export default CaptainContextProvider
