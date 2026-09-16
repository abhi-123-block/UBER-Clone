const { calculateFare, VEHICLE_TYPES } = require('../services/fare.service')
const { haversineDistanceKm } = require('../services/maps.service')

describe('fare.service', () => {
  test('calculates a fare above the minimum for a normal trip', () => {
    const fare = calculateFare({ vehicleType: 'car', distanceKm: 10, durationMinutes: 20 })
    // 50 base + 10*12 + 20*2 = 210
    expect(fare).toBeCloseTo(210, 1)
  })

  test('enforces the minimum fare for very short trips', () => {
    const fare = calculateFare({ vehicleType: 'bike', distanceKm: 0.1, durationMinutes: 1 })
    expect(fare).toBeGreaterThanOrEqual(30) // bike minimumFare
  })

  test('throws for an unsupported vehicle type', () => {
    expect(() => calculateFare({ vehicleType: 'helicopter', distanceKm: 5, durationMinutes: 5 })).toThrow()
  })

  test('supports all three vehicle types', () => {
    expect(VEHICLE_TYPES.sort()).toEqual(['auto', 'bike', 'car'])
  })
})

describe('maps.service haversineDistanceKm', () => {
  test('returns ~0 for identical points', () => {
    const d = haversineDistanceKm({ lat: 12.9716, lng: 77.5946 }, { lat: 12.9716, lng: 77.5946 })
    expect(d).toBeCloseTo(0, 3)
  })

  test('returns a sensible distance between two known points', () => {
    // Bengaluru MG Road to Bengaluru Airport, roughly ~35km straight-line
    const d = haversineDistanceKm({ lat: 12.9756, lng: 77.6068 }, { lat: 13.1986, lng: 77.7066 })
    expect(d).toBeGreaterThan(20)
    expect(d).toBeLessThan(45)
  })
})
