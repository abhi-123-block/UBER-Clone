// Centralized environment variable loading + validation.
// Fails fast at startup if required variables are missing, instead of
// surfacing confusing errors later (e.g. "jwt secret undefined").

const dotenv = require('dotenv')
dotenv.config()

const REQUIRED_VARS = ['DB_CONNECT', 'JWT_SECRET']

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key] || process.env[key].trim() === '')

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`Missing required environment variable(s): ${missing.join(', ')}`)
    console.error('Copy .env.example to .env and fill in the values before starting the server.')
    process.exit(1)
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 16) {
    // eslint-disable-next-line no-console
    console.warn('Warning: JWT_SECRET is short. Use a long, random value in production.')
  }
}

const env = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_CONNECT: process.env.DB_CONNECT,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  MAPS_PROVIDER: process.env.MAPS_PROVIDER || 'none', // 'none' | 'google'
  MAPS_API_KEY: process.env.MAPS_API_KEY || '',
}

module.exports = { validateEnv, env }
