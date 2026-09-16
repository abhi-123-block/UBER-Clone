// Small helpers to keep every response in the same
// { success, message, data } shape across the whole API.

function sendSuccess(res, { statusCode = 200, message = 'Success', data = null } = {}) {
  return res.status(statusCode).json({ success: true, message, data })
}

function sendError(res, { statusCode = 500, message = 'Something went wrong', errors = null } = {}) {
  const body = { success: false, message }
  if (errors) body.errors = errors
  return res.status(statusCode).json(body)
}

// Wraps an async express handler so thrown/rejected errors are forwarded to
// next(err) automatically, instead of needing try/catch in every controller.
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

class ApiError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message)
    this.statusCode = statusCode
    this.errors = errors
  }
}

module.exports = { sendSuccess, sendError, asyncHandler, ApiError }
