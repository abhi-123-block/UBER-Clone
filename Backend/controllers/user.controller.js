const userModel = require('../models/user.model')
const userService = require('../services/user.service')
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

module.exports.registerUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array())
  }

  const { fullname, email, password, phone } = req.body

  const existingUser = await userModel.findOne({ email: email.toLowerCase() })
  if (existingUser) {
    throw new ApiError(409, 'A user with this email already exists')
  }

  const hashedPassword = await userModel.hashPassword(password)

  const user = await userService.createUser({
    firstname: fullname.firstname,
    lastname: fullname.lastname,
    email,
    password: hashedPassword,
    phone,
  })

  const token = user.generateAuthToken()
  res.cookie('token', token, cookieOptions)

  const userObj = user.toObject()
  delete userObj.password

  return sendSuccess(res, { statusCode: 201, message: 'Registered successfully', data: { token, user: userObj } })
})

module.exports.loginUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array())
  }

  const { email, password } = req.body

  const user = await userModel.findOne({ email: email.toLowerCase() }).select('+password')
  if (!user) throw new ApiError(401, 'Invalid email or password')

  const isMatch = await user.comparePassword(password)
  if (!isMatch) throw new ApiError(401, 'Invalid email or password')

  const token = user.generateAuthToken()
  res.cookie('token', token, cookieOptions)

  const userObj = user.toObject()
  delete userObj.password

  return sendSuccess(res, { message: 'Logged in successfully', data: { token, user: userObj } })
})

module.exports.getUserProfile = asyncHandler(async (req, res) => {
  return sendSuccess(res, { message: 'Profile fetched', data: { user: req.user } })
})

module.exports.updateUserProfile = asyncHandler(async (req, res) => {
  const allowed = ['phone', 'profileImage']
  const updates = {}
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field]
  })
  if (req.body.fullname?.firstname) updates['fullname.firstname'] = req.body.fullname.firstname
  if (req.body.fullname?.lastname) updates['fullname.lastname'] = req.body.fullname.lastname

  const user = await userModel.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true })
  return sendSuccess(res, { message: 'Profile updated', data: { user } })
})

module.exports.logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie('token', cookieOptions)

  if (req.token) {
    await blacklistTokenModel.create({ token: req.token }).catch(() => {})
  }

  return sendSuccess(res, { message: 'Logged out successfully' })
})
