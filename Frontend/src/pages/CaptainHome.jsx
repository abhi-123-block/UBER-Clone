import { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaptainDataContext } from '../context/CaptainContext'
import api from '../utils/api'
import { getSocket, disconnectSocket } from '../utils/socket'

function StatusBadge({ status }) {
  const styles = {
    searching: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-blue-100 text-blue-800',
    arriving: 'bg-blue-100 text-blue-800',
    started: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${styles[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  )
}

const CaptainHome = () => {
  const navigate = useNavigate()
  const { captain, setCaptain, logout } = useContext(CaptainDataContext)

  const [isOnline, setIsOnline] = useState(captain?.status === 'active')
  const [incomingRequests, setIncomingRequests] = useState([])
  const [activeRide, setActiveRide] = useState(null)
  const [otpInput, setOtpInput] = useState('')
  const [earnings, setEarnings] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const socketRef = useRef(null)
  const watchIdRef = useRef(null)
  const token = localStorage.getItem('captainToken')

  useEffect(() => {
    if (!token) return undefined
    const socket = getSocket(token)
    socketRef.current = socket

    const onNewRequest = (ride) => {
      setIncomingRequests((prev) => (prev.some((r) => r._id === ride._id) ? prev : [ride, ...prev]))
    }
    const onStatusUpdate = (ride) => setActiveRide((prev) => (prev && prev._id === ride._id ? ride : prev))
    const onCancelled = (ride) => {
      setIncomingRequests((prev) => prev.filter((r) => r._id !== ride._id))
      setActiveRide((prev) => (prev && prev._id === ride._id ? ride : prev))
    }

    socket.on('ride:new-request', onNewRequest)
    socket.on('ride:status-update', onStatusUpdate)
    socket.on('ride:cancelled', onCancelled)

    return () => {
      socket.off('ride:new-request', onNewRequest)
      socket.off('ride:status-update', onStatusUpdate)
      socket.off('ride:cancelled', onCancelled)
    }
  }, [token])

  useEffect(() => {
    if (activeRide?._id && socketRef.current) {
      socketRef.current.emit('join-ride', { rideId: activeRide._id })
    }
  }, [activeRide?._id])

  const fetchEarnings = async () => {
    try {
      const res = await api.get('/rides/earnings', { headers: { Authorization: `Bearer ${token}` } })
      setEarnings(res.data.data)
    } catch {
      // non-critical, ignore silently
    }
  }

  useEffect(() => {
    let cancelled = false
    api
      .get('/rides/earnings', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!cancelled) setEarnings(res.data.data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startWatchingLocation = () => {
    if (!navigator.geolocation) return
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        api
          .patch('/captains/location', { lat, lng }, { headers: { Authorization: `Bearer ${token}` } })
          .catch(() => {})
        socketRef.current?.emit('captain:location', { lat, lng, rideId: activeRide?._id })
      },
      () => setError('Could not access your location.'),
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
  }

  const stopWatchingLocation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  const toggleOnline = async () => {
    setError('')
    const nextStatus = isOnline ? 'inactive' : 'active'
    try {
      const res = await api.patch(
        '/captains/status',
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setIsOnline(nextStatus === 'active')
      setCaptain(res.data.data.captain)
      if (nextStatus === 'active') {
        startWatchingLocation()
      } else {
        stopWatchingLocation()
        setIncomingRequests([])
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update status.')
    }
  }

  useEffect(() => () => stopWatchingLocation(), [])

  const acceptRide = async (rideId) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await api.patch(`/rides/${rideId}/accept`, {}, { headers: { Authorization: `Bearer ${token}` } })
      setActiveRide(res.data.data.ride)
      setIncomingRequests([])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not accept ride. It may have been taken.')
      setIncomingRequests((prev) => prev.filter((r) => r._id !== rideId))
    } finally {
      setIsLoading(false)
    }
  }

  const markArriving = async () => {
    setIsLoading(true)
    try {
      const res = await api.patch(
        `/rides/${activeRide._id}/arriving`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setActiveRide(res.data.data.ride)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update ride.')
    } finally {
      setIsLoading(false)
    }
  }

  const startRide = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await api.patch(
        `/rides/${activeRide._id}/start`,
        { otp: otpInput },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setActiveRide(res.data.data.ride)
      setOtpInput('')
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect OTP.')
    } finally {
      setIsLoading(false)
    }
  }

  const completeRide = async () => {
    setIsLoading(true)
    try {
      const res = await api.patch(
        `/rides/${activeRide._id}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setActiveRide(res.data.data.ride)
      fetchEarnings()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not complete ride.')
    } finally {
      setIsLoading(false)
    }
  }

  const cancelRide = async () => {
    setIsLoading(true)
    try {
      const res = await api.patch(
        `/rides/${activeRide._id}/cancel`,
        { reason: 'Unable to complete the trip' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setActiveRide(res.data.data.ride)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel ride.')
    } finally {
      setIsLoading(false)
    }
  }

  const dismissRide = () => setActiveRide(null)

  const loadHistory = async () => {
    setShowHistory(true)
    try {
      const res = await api.get('/rides/history', { headers: { Authorization: `Bearer ${token}` } })
      setHistory(res.data.data.rides)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load ride history.')
    }
  }

  const handleLogout = async () => {
    stopWatchingLocation()
    disconnectSocket()
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
        <div className="flex gap-2">
          <button onClick={loadHistory} className="text-sm border border-gray-300 rounded-lg px-4 py-2 font-medium">
            History
          </button>
          <button onClick={handleLogout} className="text-sm border border-gray-300 rounded-lg px-4 py-2 font-medium">
            Log out
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {showHistory && (
        <div className="mt-6 border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="font-medium">Ride history</p>
            <button onClick={() => setShowHistory(false)} className="text-sm text-gray-500">
              Close
            </button>
          </div>
          {history === null && <p className="text-sm text-gray-400 mt-3">Loading...</p>}
          {history?.length === 0 && <p className="text-sm text-gray-400 mt-3">No rides yet.</p>}
          <div className="mt-3 space-y-3">
            {history?.map((r) => (
              <div key={r._id} className="text-sm border-b border-gray-100 pb-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{r.pickup} → {r.destination}</p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString()} &middot; {r.vehicleType} &middot; ₹{r.fare}
                  {r.user?.fullname ? ` · ${r.user.fullname.firstname}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium capitalize">{captain?.vehicle?.vehicleType}</p>
            <p className="text-sm text-gray-500">
              {captain?.vehicle?.color} &middot; {captain?.vehicle?.plate}
            </p>
          </div>
          <button
            onClick={toggleOnline}
            className={`text-sm px-4 py-2 rounded-full font-medium ${
              isOnline ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {isOnline ? 'Online' : 'Go online'}
          </button>
        </div>

        {earnings && (
          <p className="mt-4 text-sm text-gray-500">
            Lifetime earnings: ₹{earnings.totalEarnings} &middot; {earnings.totalRides} rides
          </p>
        )}
      </div>

      {!showHistory && !activeRide && isOnline && incomingRequests.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-gray-500">Ride requests</p>
          {incomingRequests.map((r) => (
            <div key={r._id} className="border border-gray-200 rounded-2xl p-4">
              <p className="font-medium">{r.pickup} → {r.destination}</p>
              <p className="text-sm text-gray-500">
                {r.distance} km &middot; ₹{r.fare}
              </p>
              <button
                onClick={() => acceptRide(r._id)}
                disabled={isLoading}
                className="mt-3 w-full bg-black text-white py-2.5 rounded-lg font-medium disabled:opacity-60"
              >
                Accept
              </button>
            </div>
          ))}
        </div>
      )}

      {!showHistory && !activeRide && isOnline && incomingRequests.length === 0 && (
        <p className="mt-8 text-sm text-gray-400 text-center">Waiting for ride requests nearby...</p>
      )}

      {!showHistory && !isOnline && !activeRide && (
        <p className="mt-8 text-sm text-gray-400 text-center">Go online to start receiving ride requests.</p>
      )}

      {!showHistory && activeRide && (
        <div className="mt-6 border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="font-medium">{activeRide.pickup} → {activeRide.destination}</p>
            <StatusBadge status={activeRide.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {activeRide.user?.fullname?.firstname} &middot; ₹{activeRide.fare} &middot; {activeRide.distance} km
          </p>

          {activeRide.status === 'accepted' && (
            <button
              onClick={markArriving}
              disabled={isLoading}
              className="mt-4 w-full bg-black text-white py-3 rounded-lg font-medium disabled:opacity-60"
            >
              Mark as arriving
            </button>
          )}

          {['accepted', 'arriving'].includes(activeRide.status) && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Enter passenger OTP to start the trip</p>
              <input
                type="text"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                maxLength={6}
                placeholder="1234"
                className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-black"
              />
              <button
                onClick={startRide}
                disabled={isLoading || otpInput.length < 4}
                className="mt-2 w-full bg-black text-white py-3 rounded-lg font-medium disabled:opacity-60"
              >
                Start ride
              </button>
            </div>
          )}

          {activeRide.status === 'started' && (
            <button
              onClick={completeRide}
              disabled={isLoading}
              className="mt-4 w-full bg-black text-white py-3 rounded-lg font-medium disabled:opacity-60"
            >
              Complete ride
            </button>
          )}

          {['accepted', 'arriving', 'started'].includes(activeRide.status) && (
            <button
              onClick={cancelRide}
              disabled={isLoading}
              className="mt-3 w-full border border-red-300 text-red-600 py-3 rounded-lg font-medium disabled:opacity-60"
            >
              Cancel ride
            </button>
          )}

          {['completed', 'cancelled'].includes(activeRide.status) && (
            <button onClick={dismissRide} className="mt-4 w-full border border-gray-300 py-3 rounded-lg font-medium">
              Done
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default CaptainHome
