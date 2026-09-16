// Isolates map-provider specific logic behind a single interface.
// If MAPS_PROVIDER=google and MAPS_API_KEY is set, real distances/geocoding could be
// wired in here. Otherwise we fall back to a Haversine straight-line estimate,
// scaled slightly to approximate real road distance, so the app is fully
// runnable without any external API key.

const { env } = require('../config/env')

function toRad(value) {
  return (value * Math.PI) / 180
}

// Returns straight-line distance in kilometers between two lat/lng points.
function haversineDistanceKm(coord1, coord2) {
  const R = 6371 // Earth radius in km
  const dLat = toRad(coord2.lat - coord1.lat)
  const dLng = toRad(coord2.lng - coord1.lng)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Road-distance fudge factor: straight-line distance underestimates actual
// road distance, so we scale it up a bit for a more realistic fare estimate.
const ROAD_DISTANCE_FACTOR = 1.3

async function getDistanceAndDuration(pickupCoordinates, destinationCoordinates, vehicleType = 'car') {
  if (
    !pickupCoordinates ||
    !destinationCoordinates ||
    typeof pickupCoordinates.lat !== 'number' ||
    typeof pickupCoordinates.lng !== 'number' ||
    typeof destinationCoordinates.lat !== 'number' ||
    typeof destinationCoordinates.lng !== 'number'
  ) {
    throw new Error('Valid pickup and destination coordinates are required')
  }

  if (env.MAPS_PROVIDER === 'google' && env.MAPS_API_KEY) {
    // Real provider integration point. Kept isolated here so swapping providers
    // never touches controllers/services elsewhere in the app.
    // eslint-disable-next-line no-console
    console.warn('MAPS_PROVIDER=google configured but no request implementation wired in; falling back to Haversine.')
  }

  const straightLineKm = haversineDistanceKm(pickupCoordinates, destinationCoordinates)
  const distanceKm = Math.max(straightLineKm * ROAD_DISTANCE_FACTOR, 0.1)

  const { AVERAGE_SPEED_KMPH } = require('../config/fare.config')
  const speed = AVERAGE_SPEED_KMPH[vehicleType] || AVERAGE_SPEED_KMPH.car
  const durationMinutes = (distanceKm / speed) * 60

  return {
    distanceKm: Number(distanceKm.toFixed(2)),
    durationMinutes: Number(durationMinutes.toFixed(1)),
  }
}

module.exports = { haversineDistanceKm, getDistanceAndDuration }
