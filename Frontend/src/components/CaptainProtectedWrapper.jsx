import React, { useContext, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { CaptainDataContext } from '../context/CaptainContext'

const CaptainProtectedWrapper = ({ children }) => {
  const { captain, isLoading, loadCaptain } = useContext(CaptainDataContext)

  useEffect(() => {
    loadCaptain()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <p className="text-white text-sm tracking-wide">Loading...</p>
      </div>
    )
  }

  if (!captain) {
    return <Navigate to="/captain-login" replace />
  }

  return children
}

export default CaptainProtectedWrapper
