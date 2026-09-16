// Single source of truth for fare calculation constants.
// Change rates here rather than scattering magic numbers through controllers.

const FARE_CONFIG = {
  car: {
    baseFare: 50,       // currency units, flat charge just for requesting the ride
    perKmRate: 12,
    perMinuteRate: 2,
    minimumFare: 80,
  },
  auto: {
    baseFare: 30,
    perKmRate: 8,
    perMinuteRate: 1.5,
    minimumFare: 50,
  },
  bike: {
    baseFare: 15,
    perKmRate: 5,
    perMinuteRate: 1,
    minimumFare: 30,
  },
}

// Average speeds (km/h) used to estimate duration when no maps provider is configured.
const AVERAGE_SPEED_KMPH = {
  car: 30,
  auto: 25,
  bike: 35,
}

const SURGE = {
  enabled: process.env.SURGE_ENABLED === 'true',
  multiplier: Number(process.env.SURGE_MULTIPLIER) || 1,
}

module.exports = { FARE_CONFIG, AVERAGE_SPEED_KMPH, SURGE }
