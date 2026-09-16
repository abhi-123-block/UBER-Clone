const { FARE_CONFIG, SURGE } = require('../config/fare.config')
const { getDistanceAndDuration } = require('./maps.service')

const VEHICLE_TYPES = Object.keys(FARE_CONFIG)

function calculateFare({ vehicleType, distanceKm, durationMinutes }) {
  const rates = FARE_CONFIG[vehicleType]
  if (!rates) {
    throw new Error(`Unsupported vehicle type: ${vehicleType}`)
  }

  let fare = rates.baseFare + distanceKm * rates.perKmRate + durationMinutes * rates.perMinuteRate

  if (SURGE.enabled) {
    fare *= SURGE.multiplier
  }

  fare = Math.max(fare, rates.minimumFare)

  return Number(fare.toFixed(2))
}

// Returns a fare estimate for every supported vehicle type, plus the
// underlying distance/duration, given raw pickup/destination coordinates.
async function getFareEstimates(pickupCoordinates, destinationCoordinates) {
  const { distanceKm, durationMinutes } = await getDistanceAndDuration(
    pickupCoordinates,
    destinationCoordinates,
    'car'
  )

  const estimates = {}
  for (const vehicleType of VEHICLE_TYPES) {
    estimates[vehicleType] = calculateFare({ vehicleType, distanceKm, durationMinutes })
  }

  return { distanceKm, durationMinutes, estimates }
}

module.exports = { calculateFare, getFareEstimates, VEHICLE_TYPES }
