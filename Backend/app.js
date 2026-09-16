const { validateEnv, env } = require('./config/env')
validateEnv()

const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const connectToDb = require('./db/db')
const userRoutes = require('./routes/user.routs')
const captainRoutes = require('./routes/captain.routes')
const rideRoutes = require('./routes/ride.routes')
const errorMiddleware = require('./middlewares/error.middleware')

const app = express()

connectToDb()

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Uber-clone API is running' })
})

app.use('/users', userRoutes)
app.use('/captains', captainRoutes)
app.use('/rides', rideRoutes)

// 404 handler for unmatched routes.
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` })
})

// Centralized error handler - must be registered last.
app.use(errorMiddleware)

module.exports = app
