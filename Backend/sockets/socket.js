// Socket.IO setup. Connections are authenticated with the same JWT used by
// the REST API, so a socket can never claim to be a different user/captain
// than the one the token actually belongs to.

const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const { env } = require('../config/env')
const userModel = require('../models/user.model')
const captainModel = require('../models/captain.model')

let io = null

function personalRoom(role, id) {
  return `${role}:${id}`
}

function rideRoom(rideId) {
  return `ride:${rideId}`
}

async function authenticateSocket(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization ? socket.handshake.headers.authorization.split(' ')[1] : null)

    if (!token) return next(new Error('Authentication required'))

    const decoded = jwt.verify(token, env.JWT_SECRET)

    if (decoded.role === 'captain') {
      const captain = await captainModel.findById(decoded._id)
      if (!captain) return next(new Error('Captain not found'))
      socket.role = 'captain'
      socket.accountId = String(captain._id)
    } else {
      const user = await userModel.findById(decoded._id)
      if (!user) return next(new Error('User not found'))
      socket.role = 'user'
      socket.accountId = String(user._id)
    }

    next()
  } catch (err) {
    next(new Error('Invalid or expired token'))
  }
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  })

  io.use(authenticateSocket)

  io.on('connection', async (socket) => {
    const { role, accountId } = socket

    // Every connected client automatically gets a personal room so the
    // server can push notifications without knowing the socket id.
    socket.join(personalRoom(role, accountId))

    if (role === 'captain') {
      await captainModel.findByIdAndUpdate(accountId, { socketId: socket.id })
    } else {
      await userModel.findByIdAndUpdate(accountId, { socketId: socket.id })
    }

    socket.on('join-ride', ({ rideId }) => {
      if (!rideId) return
      socket.join(rideRoom(rideId))
    })

    socket.on('leave-ride', ({ rideId }) => {
      if (!rideId) return
      socket.leave(rideRoom(rideId))
    })

    // Captain toggling status over the socket (in addition to the REST endpoint).
    socket.on('captain:status', async ({ status }) => {
      if (role !== 'captain' || !['active', 'inactive'].includes(status)) return
      await captainModel.findByIdAndUpdate(accountId, { status })
    })

    // Captain pushing a live location update while online / on a ride.
    socket.on('captain:location', async ({ lat, lng, rideId }) => {
      if (role !== 'captain' || typeof lat !== 'number' || typeof lng !== 'number') return
      await captainModel.findByIdAndUpdate(accountId, { location: { lat, lng } })

      if (rideId) {
        io.to(rideRoom(rideId)).emit('ride:captain-location', { rideId, lat, lng })
      }
    })

    socket.on('disconnect', async () => {
      try {
        if (role === 'captain') {
          await captainModel.findByIdAndUpdate(accountId, { socketId: null })
        } else {
          await userModel.findByIdAndUpdate(accountId, { socketId: null })
        }
      } catch (err) {
        // best-effort cleanup; connection is already gone
      }
    })
  })

  return io
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized. Call initSocket(server) first.')
  return io
}

// --- Emit helpers used by controllers, kept here so event names live in one place. ---

function notifyNearbyCaptains(captainIds, ride) {
  captainIds.forEach((captainId) => {
    getIO().to(personalRoom('captain', captainId)).emit('ride:new-request', ride)
  })
}

function notifyRideAccepted(userId, ride) {
  getIO().to(personalRoom('user', userId)).emit('ride:accepted', ride)
}

function notifyRideStatusUpdate(ride) {
  const io_ = getIO()
  io_.to(rideRoom(ride._id)).emit('ride:status-update', ride)
  if (ride.user) io_.to(personalRoom('user', ride.user._id || ride.user)).emit('ride:status-update', ride)
  if (ride.captain) io_.to(personalRoom('captain', ride.captain._id || ride.captain)).emit('ride:status-update', ride)
}

function notifyRideCancelled(ride) {
  const io_ = getIO()
  io_.to(rideRoom(ride._id)).emit('ride:cancelled', ride)
  if (ride.user) io_.to(personalRoom('user', ride.user._id || ride.user)).emit('ride:cancelled', ride)
  if (ride.captain) io_.to(personalRoom('captain', ride.captain._id || ride.captain)).emit('ride:cancelled', ride)
}

function notifyRideCompleted(ride) {
  const io_ = getIO()
  io_.to(rideRoom(ride._id)).emit('ride:completed', ride)
  if (ride.user) io_.to(personalRoom('user', ride.user._id || ride.user)).emit('ride:completed', ride)
  if (ride.captain) io_.to(personalRoom('captain', ride.captain._id || ride.captain)).emit('ride:completed', ride)
}

module.exports = {
  initSocket,
  getIO,
  personalRoom,
  rideRoom,
  notifyNearbyCaptains,
  notifyRideAccepted,
  notifyRideStatusUpdate,
  notifyRideCancelled,
  notifyRideCompleted,
}
