import { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserDataContext } from '../context/UserContext'
import api from '../utils/api'
import { getSocket, disconnectSocket } from '../utils/socket'

// A few demo destinations with real coordinates so the app is usable without
// a paid maps/geocoding API. In production this would be replaced by a
// places-autocomplete integration; the backend fare/route logic doesn't care
// where the coordinates come from.
const QUICK_DESTINATIONS = [
  { label: 'Park Street, Kolkata', lat: 22.5535, lng: 88.3517 },
  { label: 'Howrah Station', lat: 22.5831, lng: 88.3427 },
  { label: 'Salt Lake Sector V', lat: 22.5761, lng: 88.4315 },
  { label: 'Netaji Subhash Airport', lat: 22.6547, lng: 88.4467 },
]

const VEHICLES = [
  { type: 'bike', label: 'Bike', icon: '🏍️' },
  { type: 'auto', label: 'Auto', icon: '🛺' },
  { type: 'car', label: 'Car', icon: '🚗' },
]

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

const UserHome = () => {
  const navigate = useNavigate()
  const { user, logout } = useContext(UserDataContext)

  const [pickupText, setPickupText] = useState('')
  const [pickupCoords, setPickupCoords] = useState(null)
  const [destination, setDestination] = useState(null) // { label, lat, lng }
  const [estimate, setEstimate] = useState(null)
  const [vehicleType, setVehicleType] = useState('car')
  const [ride, setRide] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [ratingScore, setRatingScore] = useState(5)
  const [ratingComment, setRatingComment] = useState('')
  const [ratingSubmitted, setRatingSubmitted] = useState(false)

  const socketRef = useRef(null)
  const token = localStorage.getItem('userToken')

  // Connect the socket once we have a token, and always listen for ride
  // events regardless of which screen the user is currently on.
  useEffect(() => {
    if (!token) return undefined
    const socket = getSocket(token)
    socketRef.current = socket

    const handleUpdate = (updatedRide) => setRide(updatedRide)
    const handleCancelled = (updatedRide) => setRide(updatedRide)
    const handleCompleted = (updatedRide) => setRide(updatedRide)

    socket.on('ride:accepted', handleUpdate)
    socket.on('ride:status-update', handleUpdate)
    socket.on('ride:cancelled', handleCancelled)
    socket.on('ride:completed', handleCompleted)

    return () => {
      socket.off('ride:accepted', handleUpdate)
      socket.off('ride:status-update', handleUpdate)
      socket.off('ride:cancelled', handleCancelled)
      socket.off('ride:completed', handleCompleted)
    }
  }, [token])

  useEffect(() => {
    if (ride?._id && socketRef.current) {
      socketRef.current.emit('join-ride', { rideId: ride._id })
    }
  }, [ride?._id])

  const useCurrentLocation = () => {
    setError('')
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser. Enter coordinates manually.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickupCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setPickupText('My current location')
      },
      () => setError('Could not get your location. Please allow location access.')
    )
  }

  const getEstimate = async () => {
    setError('')
    if (!pickupCoords || !destination) {
      setError('Set a pickup location and destination first.')
      return
    }
    setIsLoading(true)
    try {
      const res = await api.post(
        '/rides/fare-estimate',
        {
          pickupCoordinates: pickupCoords,
          destinationCoordinates: { lat: destination.lat, lng: destination.lng },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setEstimate(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not calculate fare.')
    } finally {
      setIsLoading(false)
    }
  }

  const requestRide = async () => {
    setError('')
    setIsLoading(true)
    try {
      const res = await api.post(
        '/rides/request',
        {
          pickup: pickupText || 'Current location',
          destination: destination.label,
          pickupCoordinates: pickupCoords,
          destinationCoordinates: { lat: destination.lat, lng: destination.lng },
          vehicleType,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setRide(res.data.data.ride)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not request a ride.')
    } finally {
      setIsLoading(false)
    }
  }

  const cancelRide = async () => {
    if (!ride) return
    setIsLoading(true)
    try {
      const res = await api.patch(
        `/rides/${ride._id}/cancel`,
        { reason: 'Changed my mind' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setRide(res.data.data.ride)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel ride.')
    } finally {
      setIsLoading(false)
    }
  }

  const submitRating = async () => {
    setIsLoading(true)
    try {
      await api.post(
        `/rides/${ride._id}/rate`,
        { score: ratingScore, comment: ratingComment },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setRatingSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit rating.')
    } finally {
      setIsLoading(false)
    }
  }

  const startNewRide = () => {
    setRide(null)
    setEstimate(null)
    setDestination(null)
    setRatingSubmitted(false)
    setRatingScore(5)
    setRatingComment('')
  }

  const handleLogout = async () => {
    disconnectSocket()
    await logout()
    navigate('/login')
  }

  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState(null)

  const loadHistory = async () => {
    setShowHistory(true)
    try {
      const res = await api.get('/rides/history', { headers: { Authorization: `Bearer ${token}` } })
      setHistory(res.data.data.rides)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load ride history.')
    }
  }

  const activeRide = ride && ['searching', 'accepted', 'arriving', 'started'].includes(ride.status)
  const finishedRide = ride && ['completed', 'cancelled'].includes(ride.status)

  return (
    <div className="min-h-screen w-full bg-white px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">Welcome back</p>
          <h1 className="text-2xl font-semibold">{user?.fullname?.firstname}</h1>
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
                  {r.captain?.fullname ? ` · ${r.captain.fullname.firstname}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showHistory && !ride && (
        <div className="mt-8 border border-gray-200 rounded-2xl p-5">
          <p className="text-gray-500 text-sm">Pickup</p>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={pickupText}
              onChange={(e) => setPickupText(e.target.value)}
              placeholder="Pickup address"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
            />
            <button
              onClick={useCurrentLocation}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 font-medium whitespace-nowrap"
            >
              Use current
            </button>
          </div>
          {pickupCoords && (
            <p className="text-xs text-gray-400 mt-1">
              {pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}
            </p>
          )}

          <p className="text-gray-500 text-sm mt-5">Destination</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {QUICK_DESTINATIONS.map((d) => (
              <button
                key={d.label}
                onClick={() => setDestination(d)}
                className={`text-left text-sm border rounded-lg px-3 py-2 ${
                  destination?.label === d.label ? 'border-black bg-black text-white' : 'border-gray-300'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <p className="text-gray-500 text-sm mt-5">Vehicle</p>
          <div className="mt-2 flex gap-2">
            {VEHICLES.map((v) => (
              <button
                key={v.type}
                onClick={() => {
                  setVehicleType(v.type)
                  setEstimate(null)
                }}
                className={`flex-1 border rounded-lg py-3 text-sm font-medium ${
                  vehicleType === v.type ? 'border-black bg-black text-white' : 'border-gray-300'
                }`}
              >
                <div className="text-lg">{v.icon}</div>
                {v.label}
              </button>
            ))}
          </div>

          <button
            onClick={getEstimate}
            disabled={isLoading}
            className="mt-5 w-full border border-gray-300 py-3 rounded-lg font-medium disabled:opacity-60"
          >
            {isLoading ? 'Calculating...' : 'Get fare estimate'}
          </button>

          {estimate && (
            <div className="mt-4 text-sm bg-gray-50 rounded-lg p-4">
              <p className="text-gray-500">
                {estimate.distanceKm} km &middot; {estimate.durationMinutes} min
              </p>
              <p className="mt-1 font-medium capitalize">
                {vehicleType}: ₹{estimate.estimates[vehicleType]}
              </p>
              <button
                onClick={requestRide}
                disabled={isLoading}
                className="mt-3 w-full bg-black text-white py-3 rounded-lg font-medium disabled:opacity-60"
              >
                {isLoading ? 'Requesting...' : 'Request ride'}
              </button>
            </div>
          )}
        </div>
      )}

      {!showHistory && ride && (
        <div className="mt-8 border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="font-medium">{ride.pickup} → {ride.destination}</p>
            <StatusBadge status={ride.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {ride.vehicleType} &middot; ₹{ride.fare} &middot; {ride.distance} km
          </p>

          {ride.status === 'searching' && (
            <p className="text-sm text-gray-500 mt-4">Looking for a nearby captain...</p>
          )}

          {ride.captain && ['accepted', 'arriving', 'started'].includes(ride.status) && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4 text-sm">
              <p className="font-medium">
                {ride.captain.fullname?.firstname} {ride.captain.fullname?.lastname}
              </p>
              <p className="text-gray-500">
                {ride.captain.vehicle?.color} {ride.captain.vehicle?.vehicleType} &middot; {ride.captain.vehicle?.plate}
              </p>
              <p className="text-gray-500">Rating: {ride.captain.rating}⭐</p>
            </div>
          )}

          {['accepted', 'arriving'].includes(ride.status) && ride.otp && (
            <p className="mt-4 text-sm">
              Share this OTP with your captain to start the ride: <span className="font-bold text-lg">{ride.otp}</span>
            </p>
          )}

          {activeRide && (
            <button
              onClick={cancelRide}
              disabled={isLoading}
              className="mt-5 w-full border border-red-300 text-red-600 py-3 rounded-lg font-medium disabled:opacity-60"
            >
              Cancel ride
            </button>
          )}

          {ride.status === 'completed' && !ratingSubmitted && (
            <div className="mt-5">
              <p className="text-sm text-gray-500">Rate your captain</p>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRatingScore(n)}
                    className={`text-2xl ${n <= ratingScore ? 'opacity-100' : 'opacity-30'}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Optional comment"
                className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
              />
              <button
                onClick={submitRating}
                disabled={isLoading}
                className="mt-2 w-full bg-black text-white py-3 rounded-lg font-medium disabled:opacity-60"
              >
                Submit rating
              </button>
            </div>
          )}

          {finishedRide && (
            <button onClick={startNewRide} className="mt-5 w-full border border-gray-300 py-3 rounded-lg font-medium">
              Book another ride
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default UserHome
