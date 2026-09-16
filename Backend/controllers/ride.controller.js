const { validationResult } = require('express-validator')
const rideModel = require('../models/ride.model')
const rideService = require('../services/ride.service')
const { getFareEstimates } = require('../services/fare.service')
const { sendSuccess, asyncHandler, ApiError } = require('../utils/apiResponse')
const {
  notifyNearbyCaptains,
  notifyRideAccepted,
  notifyRideStatusUpdate,
  notifyRideCancelled,
  notifyRideCompleted,
} = require('../sockets/socket')

module.exports.getFareEstimate = asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) throw new ApiError(400, 'Validation failed', errors.array())

  const { pickupCoordinates, destinationCoordinates } = req.body
  const estimate = await getFareEstimates(pickupCoordinates, destinationCoordinates)

  return sendSuccess(res, { message: 'Fare estimate calculated', data: estimate })
})

module.exports.requestRide = asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) throw new ApiError(400, 'Validation failed', errors.array())

  const { pickup, destination, pickupCoordinates, destinationCoordinates, vehicleType } = req.body

  const ride = await rideService.createRide({
    userId: req.user._id,
    pickup,
    destination,
    pickupCoordinates,
    destinationCoordinates,
    vehicleType,
  })

  const nearbyCaptains = await rideService.findNearbyCaptains({
    lat: pickupCoordinates.lat,
    lng: pickupCoordinates.lng,
    vehicleType,
  })

  // The rider needs the OTP (to read it out to the captain at pickup), but
  // captains being broadcast this request must NOT receive it - otherwise
  // OTP verification would be worthless as a proof-of-pickup check.
  const rideForRider = await rideService.getRideById(ride._id, { withOtp: true })
  const rideForBroadcast = rideForRider.toObject ? rideForRider.toObject() : { ...rideForRider }
  delete rideForBroadcast.otp

  notifyNearbyCaptains(
    nearbyCaptains.map((c) => c._id),
    rideForBroadcast
  )

  return sendSuccess(res, {
    statusCode: 201,
    message: nearbyCaptains.length ? 'Ride requested. Searching for a captain.' : 'Ride requested, but no captains are nearby right now.',
    data: { ride: rideForRider, nearbyCaptainCount: nearbyCaptains.length },
  })
})

module.exports.getRide = asyncHandler(async (req, res) => {
  const ride = await rideService.getRideById(req.params.rideId)

  const requesterId = req.authRole === 'captain' ? req.captain._id : req.user._id
  const isParticipant =
    (ride.user && ride.user._id.toString() === requesterId.toString()) ||
    (ride.captain && ride.captain._id.toString() === requesterId.toString())

  if (!isParticipant) throw new ApiError(403, 'You do not have access to this ride')

  return sendSuccess(res, { message: 'Ride fetched', data: { ride } })
})

module.exports.acceptRide = asyncHandler(async (req, res) => {
  const ride = await rideService.acceptRide({ rideId: req.params.rideId, captainId: req.captain._id })
  notifyRideAccepted(ride.user._id, ride)
  notifyRideStatusUpdate(ride)
  return sendSuccess(res, { message: 'Ride accepted', data: { ride } })
})

module.exports.markArriving = asyncHandler(async (req, res) => {
  const ride = await rideService.markArriving({ rideId: req.params.rideId, captainId: req.captain._id })
  notifyRideStatusUpdate(ride)
  return sendSuccess(res, { message: 'Marked as arriving', data: { ride } })
})

module.exports.startRide = asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) throw new ApiError(400, 'Validation failed', errors.array())

  const { otp } = req.body
  const ride = await rideService.startRide({ rideId: req.params.rideId, captainId: req.captain._id, otp })
  notifyRideStatusUpdate(ride)
  return sendSuccess(res, { message: 'Ride started', data: { ride } })
})

module.exports.completeRide = asyncHandler(async (req, res) => {
  const ride = await rideService.completeRide({ rideId: req.params.rideId, captainId: req.captain._id })
  notifyRideCompleted(ride)
  return sendSuccess(res, { message: 'Ride completed', data: { ride } })
})

module.exports.cancelRide = asyncHandler(async (req, res) => {
  const { reason } = req.body
  const actorRole = req.authRole
  const actorId = actorRole === 'captain' ? req.captain._id : req.user._id

  const ride = await rideService.cancelRide({ rideId: req.params.rideId, actorRole, actorId, reason })
  notifyRideCancelled(ride)
  return sendSuccess(res, { message: 'Ride cancelled', data: { ride } })
})

module.exports.rateRide = asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) throw new ApiError(400, 'Validation failed', errors.array())

  const { score, comment } = req.body
  const raterRole = req.authRole
  const raterId = raterRole === 'captain' ? req.captain._id : req.user._id

  const rating = await rideService.rateRide({ rideId: req.params.rideId, raterRole, raterId, score, comment })
  return sendSuccess(res, { statusCode: 201, message: 'Rating submitted', data: { rating } })
})

module.exports.getMyRideHistory = asyncHandler(async (req, res) => {
  const role = req.authRole
  const id = role === 'captain' ? req.captain._id : req.user._id
  const { page = 1, limit = 20 } = req.query

  const result = await rideService.getRideHistory({ role, id, page: Number(page), limit: Number(limit) })
  return sendSuccess(res, { message: 'Ride history fetched', data: result })
})

module.exports.getCaptainEarnings = asyncHandler(async (req, res) => {
  const agg = await rideModel.aggregate([
    { $match: { captain: req.captain._id, status: 'completed' } },
    { $group: { _id: null, totalEarnings: { $sum: '$fare' }, totalRides: { $sum: 1 } } },
  ])

  const summary = agg[0] || { totalEarnings: 0, totalRides: 0 }
  delete summary._id

  return sendSuccess(res, { message: 'Earnings fetched', data: summary })
})
