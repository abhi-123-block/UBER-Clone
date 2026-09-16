const captainModel = require('../models/captain.model')
const captainService = require('../services/captain.service')
const { validationResult } = require('express-validator')
const blacklistTokenModel = require('../models/blacklistToken.model')
const { sendSuccess, asyncHandler, ApiError } = require('../utils/apiResponse')
const { env } = require('../config/env')

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,
}

module.exports.registerCaptain = asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array())
  }

  const { fullname, email, password, phone, vehicle } = req.body

  const existingCaptain = await captainModel.findOne({ email: email.toLowerCase() })
  if (existingCaptain) {
    throw new ApiError(409, 'A captain with this email already exists')
  }

  const hashedPassword = await captainModel.hashPassword(password)

  const captain = await captainService.createCaptain({
    firstname: fullname.firstname,
    lastname: fullname.lastname,
    email,
    password: hashedPassword,
    phone,
    color: vehicle.color,
    plate: vehicle.plate,
    capacity: vehicle.capacity,
    vehicleType: vehicle.vehicleType,
  })

  const token = captain.generateAuthToken()
  res.cookie('token', token, cookieOptions)

  const captainObj = captain.toObject()
  delete captainObj.password

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Registered successfully',
    data: { token, captain: captainObj },
  })
})

module.exports.loginCaptain = asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array())
  }

  const { email, password } = req.body

  const captain = await captainModel.findOne({ email: email.toLowerCase() }).select('+password')
  if (!captain) throw new ApiError(401, 'Invalid email or password')

  const isMatch = await captain.comparePassword(password)
  if (!isMatch) throw new ApiError(401, 'Invalid email or password')

  const token = captain.generateAuthToken()
  res.cookie('token', token, cookieOptions)

  const captainObj = captain.toObject()
  delete captainObj.password

  return sendSuccess(res, { message: 'Logged in successfully', data: { token, captain: captainObj } })
})

module.exports.getCaptainProfile = asyncHandler(async (req, res) => {
  return sendSuccess(res, { message: 'Profile fetched', data: { captain: req.captain } })
})

module.exports.updateCaptainProfile = asyncHandler(async (req, res) => {
  const allowed = ['phone', 'profileImage']
  const updates = {}
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field]
  })
  if (req.body.fullname?.firstname) updates['fullname.firstname'] = req.body.fullname.firstname
  if (req.body.fullname?.lastname) updates['fullname.lastname'] = req.body.fullname.lastname
  if (req.body.vehicle) {
    ;['color', 'plate', 'capacity', 'vehicleType'].forEach((field) => {
      if (req.body.vehicle[field] !== undefined) updates[`vehicle.${field}`] = req.body.vehicle[field]
    })
  }

  const captain = await captainModel.findByIdAndUpdate(req.captain._id, updates, {
    new: true,
    runValidators: true,
  })
  return sendSuccess(res, { message: 'Profile updated', data: { captain } })
})

// Toggle online/offline. This is the source of truth for whether a captain
// shows up in nearby-captain searches.
module.exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body
  if (!['active', 'inactive'].includes(status)) {
    throw new ApiError(400, 'status must be "active" or "inactive"')
  }

  const captain = await captainModel.findByIdAndUpdate(req.captain._id, { status }, { new: true })
  return sendSuccess(res, { message: `Status set to ${status}`, data: { captain } })
})

// Captain pushes their current location. Also available in real time via
// the "captain:location" socket event, this REST endpoint is a fallback for
// clients that aren't using the socket connection.
module.exports.updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new ApiError(400, 'lat and lng must be numbers')
  }

  const captain = await captainModel.findByIdAndUpdate(req.captain._id, { location: { lat, lng } }, { new: true })
  return sendSuccess(res, { message: 'Location updated', data: { captain } })
})

module.exports.logoutCaptain = asyncHandler(async (req, res) => {
  res.clearCookie('token', cookieOptions)

  if (req.token) {
    await blacklistTokenModel.create({ token: req.token }).catch(() => {})
  }

  return sendSuccess(res, { message: 'Logged out successfully' })
})
