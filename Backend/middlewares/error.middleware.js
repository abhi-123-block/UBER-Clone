const { ApiError } = require('../utils/apiResponse')

// Centralized error handler. Must be registered last, after all routes.
// Never leaks stack traces, Mongo internals, or JWT secrets to the client.
// eslint-disable-next-line no-unused-vars
module.exports = function errorMiddleware(err, req, res, next) {
  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error(err)
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    })
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({ msg: e.message, path: e.path }))
    return res.status(400).json({ success: false, message: 'Validation failed', errors })
  }

  // Mongoose duplicate key error (e.g. duplicate email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field'
    return res.status(409).json({ success: false, message: `${field} already in use` })
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid identifier' })
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' })
  }

  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500
  const message = statusCode === 500 ? 'Internal server error' : err.message

  return res.status(statusCode).json({ success: false, message })
}
