const jwt = require('jsonwebtoken')
const userModel = require('../models/user.model')
const captainModel = require('../models/captain.model')
const blacklistTokenModel = require('../models/blacklistToken.model')
const { env } = require('../config/env')

function extractToken(req) {
  return req.cookies?.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null)
}

async function verifyAndLoad(req, res, next, { role, model, reqKey }) {
  try {
    const token = extractToken(req)
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' })
    }

    const isBlacklisted = await blacklistTokenModel.findOne({ token })
    if (isBlacklisted) {
      return res.status(401).json({ success: false, message: 'Unauthorised access. Please log in again.' })
    }

    const decoded = jwt.verify(token, env.JWT_SECRET)

    if (role && decoded.role && decoded.role !== role) {
      return res.status(403).json({ success: false, message: `This action requires a ${role} account.` })
    }

    const account = await model.findById(decoded._id)
    if (!account) {
      return res.status(401).json({ success: false, message: 'Account no longer exists.' })
    }

    req[reqKey] = account
    req.token = token
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' })
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' })
    }
    next(err)
  }
}

module.exports.authUser = (req, res, next) =>
  verifyAndLoad(req, res, next, { role: 'user', model: userModel, reqKey: 'user' })

module.exports.authCaptain = (req, res, next) =>
  verifyAndLoad(req, res, next, { role: 'captain', model: captainModel, reqKey: 'captain' })

// Accepts either a user or a captain token. Used for shared endpoints like
// ride status/detail lookups where either role may legitimately need access.
module.exports.authAny = async (req, res, next) => {
  const token = extractToken(req)
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' })
  }

  try {
    const isBlacklisted = await blacklistTokenModel.findOne({ token })
    if (isBlacklisted) {
      return res.status(401).json({ success: false, message: 'Unauthorised access. Please log in again.' })
    }

    const decoded = jwt.verify(token, env.JWT_SECRET)

    if (decoded.role === 'captain') {
      const captain = await captainModel.findById(decoded._id)
      if (!captain) return res.status(401).json({ success: false, message: 'Account no longer exists.' })
      req.captain = captain
      req.authRole = 'captain'
    } else {
      const user = await userModel.findById(decoded._id)
      if (!user) return res.status(401).json({ success: false, message: 'Account no longer exists.' })
      req.user = user
      req.authRole = 'user'
    }

    req.token = token
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' })
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' })
    }
    next(err)
  }
}
