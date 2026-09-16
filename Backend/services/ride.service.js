const rideModel = require('../models/ride.model')
const captainModel = require('../models/captain.model')
const userModel = require('../models/user.model')
const ratingModel = require('../models/rating.model')
const { calculateFare } = require('./fare.service')
const { getDistanceAndDuration, haversineDistanceKm } = require('./maps.service')
const { generateOtp } = require('../utils/otp')
const { ApiError } = require('../utils/apiResponse')

const NEARBY_RADIUS_KM = 5

async function createRide({ userId, pickup, destination, pickupCoordinates, destinationCoordinates, vehicleType }) {
  const { distanceKm, durationMinutes } = await getDistanceAndDuration(pickupCoordinates, destinationCoordinates, vehicleType)
  const fare = calculateFare({ vehicleType, distanceKm, durationMinutes })

  const ride = await rideModel.create({
    user: userId,
    pickup,
    destination,
    pickupCoordinates,
    destinationCoordinates,
    fare,
    distance: distanceKm,
    duration: durationMinutes,
    vehicleType,
    otp: generateOtp(4),
    status: 'searching',
  })

  return ride
}

// Finds active captains of the right vehicle type within NEARBY_RADIUS_KM of a point.
async function findNearbyCaptains({ lat, lng, vehicleType }) {
  const candidates = await captainModel.find({
    status: 'active',
    'vehicle.vehicleType': vehicleType,
    'location.lat': { $ne: null },
    'location.lng': { $ne: null },
  })

  return candidates.filter((captain) => {
    const distance = haversineDistanceKm({ lat, lng }, captain.location)
    return distance <= NEARBY_RADIUS_KM
  })
}

async function getRideById(rideId, { withOtp = false } = {}) {
  const query = rideModel.findById(rideId).populate('user', 'fullname email phone rating').populate(
    'captain',
    'fullname email phone vehicle location rating'
  )
  if (withOtp) query.select('+otp')
  const ride = await query
  if (!ride) throw new ApiError(404, 'Ride not found')
  return ride
}

function assertTransition(current, allowed, actionLabel) {
  if (!allowed.includes(current)) {
    throw new ApiError(409, `Cannot ${actionLabel} a ride that is currently "${current}"`)
  }
}

async function acceptRide({ rideId, captainId }) {
  const ride = await rideModel.findById(rideId)
  if (!ride) throw new ApiError(404, 'Ride not found')
  assertTransition(ride.status, ['searching'], 'accept')

  ride.captain = captainId
  ride.status = 'accepted'
  ride.acceptedAt = new Date()
  await ride.save()
  return getRideById(rideId)
}

async function markArriving({ rideId, captainId }) {
  const ride = await rideModel.findById(rideId)
  if (!ride) throw new ApiError(404, 'Ride not found')
  ensureCaptainOwnsRide(ride, captainId)
  assertTransition(ride.status, ['accepted'], 'mark arriving for')

  ride.status = 'arriving'
  await ride.save()
  return getRideById(rideId)
}

function ensureCaptainOwnsRide(ride, captainId) {
  if (!ride.captain || ride.captain.toString() !== captainId.toString()) {
    throw new ApiError(403, 'You are not the captain assigned to this ride')
  }
}

function ensureUserOwnsRide(ride, userId) {
  if (!ride.user || ride.user.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are not the passenger for this ride')
  }
}

async function startRide({ rideId, captainId, otp }) {
  const ride = await rideModel.findById(rideId).select('+otp')
  if (!ride) throw new ApiError(404, 'Ride not found')
  ensureCaptainOwnsRide(ride, captainId)
  assertTransition(ride.status, ['accepted', 'arriving'], 'start')

  if (ride.otp !== otp) {
    throw new ApiError(400, 'Incorrect OTP')
  }

  ride.status = 'started'
  ride.startedAt = new Date()
  await ride.save()
  return getRideById(rideId)
}

async function completeRide({ rideId, captainId }) {
  const ride = await rideModel.findById(rideId)
  if (!ride) throw new ApiError(404, 'Ride not found')
  ensureCaptainOwnsRide(ride, captainId)
  assertTransition(ride.status, ['started'], 'complete')

  ride.status = 'completed'
  ride.completedAt = new Date()
  await ride.save()

  await Promise.all([
    userModel.findByIdAndUpdate(ride.user, { $inc: { totalRides: 1 } }),
    captainModel.findByIdAndUpdate(ride.captain, { $inc: { totalRides: 1 } }),
  ])

  return getRideById(rideId)
}

const CANCELLABLE_STATUSES = ['searching', 'accepted', 'arriving']

async function cancelRide({ rideId, actorRole, actorId, reason }) {
  const ride = await rideModel.findById(rideId)
  if (!ride) throw new ApiError(404, 'Ride not found')

  if (actorRole === 'user') ensureUserOwnsRide(ride, actorId)
  if (actorRole === 'captain') ensureCaptainOwnsRide(ride, actorId)

  assertTransition(ride.status, CANCELLABLE_STATUSES, 'cancel')

  ride.status = 'cancelled'
  ride.cancelledAt = new Date()
  ride.cancelledBy = actorRole
  ride.cancellationReason = reason || null
  await ride.save()
  return getRideById(rideId)
}

async function rateRide({ rideId, raterRole, raterId, score, comment }) {
  const ride = await rideModel.findById(rideId)
  if (!ride) throw new ApiError(404, 'Ride not found')
  if (ride.status !== 'completed') {
    throw new ApiError(409, 'You can only rate a completed ride')
  }

  if (raterRole === 'user') ensureUserOwnsRide(ride, raterId)
  if (raterRole === 'captain') ensureCaptainOwnsRide(ride, raterId)

  const existing = await ratingModel.findOne({ ride: rideId, ratedBy: raterRole })
  if (existing) throw new ApiError(409, 'You have already rated this ride')

  const rating = await ratingModel.create({
    ride: rideId,
    user: ride.user,
    captain: ride.captain,
    ratedBy: raterRole,
    score,
    comment,
  })

  // Recompute the running average rating for whoever was rated.
  if (raterRole === 'user') {
    // user rated the captain
    const agg = await ratingModel.aggregate([
      { $match: { captain: ride.captain, ratedBy: 'user' } },
      { $group: { _id: '$captain', avg: { $avg: '$score' } } },
    ])
    if (agg[0]) await captainModel.findByIdAndUpdate(ride.captain, { rating: Number(agg[0].avg.toFixed(2)) })
  } else {
    const agg = await ratingModel.aggregate([
      { $match: { user: ride.user, ratedBy: 'captain' } },
      { $group: { _id: '$user', avg: { $avg: '$score' } } },
    ])
    if (agg[0]) await userModel.findByIdAndUpdate(ride.user, { rating: Number(agg[0].avg.toFixed(2)) })
  }

  return rating
}

async function getRideHistory({ role, id, page = 1, limit = 20 }) {
  const filter = role === 'user' ? { user: id } : { captain: id }
  const skip = (page - 1) * limit

  const [rides, total] = await Promise.all([
    rideModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'fullname email phone rating')
      .populate('captain', 'fullname email phone vehicle rating'),
    rideModel.countDocuments(filter),
  ])

  return { rides, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
}

module.exports = {
  createRide,
  findNearbyCaptains,
  getRideById,
  acceptRide,
  markArriving,
  startRide,
  completeRide,
  cancelRide,
  rateRide,
  getRideHistory,
  ensureCaptainOwnsRide,
  ensureUserOwnsRide,
}
