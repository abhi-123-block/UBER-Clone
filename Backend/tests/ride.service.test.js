// These tests exercise the ride state machine and ownership checks in
// ride.service.js using mocked Mongoose models, so they run instantly with
// no real database connection required.

jest.mock('../models/ride.model')
jest.mock('../models/captain.model')
jest.mock('../models/user.model')
jest.mock('../models/rating.model')

const rideModel = require('../models/ride.model')
const rideService = require('../services/ride.service')

function makeMockRide(overrides = {}) {
  const ride = {
    _id: 'ride1',
    user: 'user1',
    captain: null,
    status: 'searching',
    otp: '1234',
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  }
  return ride
}

describe('ride.service state machine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // getRideById does a populate chain; stub it generically per test via rideModel.findById
  })

  test('acceptRide moves a searching ride to accepted', async () => {
    const ride = makeMockRide()
    rideModel.findById.mockReturnValueOnce(Promise.resolve(ride)) // used inside acceptRide
    // getRideById() call at the end uses a chained query builder
    const chain = { populate: jest.fn().mockReturnThis(), then: undefined }
    chain.populate.mockReturnValueOnce(chain).mockReturnValueOnce(Promise.resolve({ ...ride, status: 'accepted' }))
    rideModel.findById.mockReturnValueOnce(chain)

    const result = await rideService.acceptRide({ rideId: 'ride1', captainId: 'captain1' })

    expect(ride.status).toBe('accepted')
    expect(ride.captain).toBe('captain1')
    expect(ride.save).toHaveBeenCalled()
    expect(result.status).toBe('accepted')
  })

  test('acceptRide rejects a ride that is not in "searching" state', async () => {
    const ride = makeMockRide({ status: 'completed' })
    rideModel.findById.mockReturnValueOnce(Promise.resolve(ride))

    await expect(rideService.acceptRide({ rideId: 'ride1', captainId: 'captain1' })).rejects.toThrow(
      /Cannot accept/
    )
    expect(ride.save).not.toHaveBeenCalled()
  })

  test('startRide rejects a wrong OTP', async () => {
    const ride = makeMockRide({ status: 'accepted', captain: 'captain1', otp: '1234' })
    const selectMock = jest.fn().mockResolvedValue(ride)
    rideModel.findById.mockReturnValueOnce({ select: selectMock })

    await expect(
      rideService.startRide({ rideId: 'ride1', captainId: 'captain1', otp: '0000' })
    ).rejects.toThrow(/Incorrect OTP/)
    expect(ride.save).not.toHaveBeenCalled()
  })

  test('startRide rejects a captain who is not assigned to the ride', async () => {
    const ride = makeMockRide({ status: 'accepted', captain: 'captain1', otp: '1234' })
    const selectMock = jest.fn().mockResolvedValue(ride)
    rideModel.findById.mockReturnValueOnce({ select: selectMock })

    await expect(
      rideService.startRide({ rideId: 'ride1', captainId: 'someone-else', otp: '1234' })
    ).rejects.toThrow(/not the captain/)
  })

  test('cancelRide rejects cancelling an already-completed ride', async () => {
    const ride = makeMockRide({ status: 'completed', user: 'user1' })
    rideModel.findById.mockReturnValueOnce(Promise.resolve(ride))

    await expect(
      rideService.cancelRide({ rideId: 'ride1', actorRole: 'user', actorId: 'user1', reason: 'changed my mind' })
    ).rejects.toThrow(/Cannot cancel/)
  })

  test('cancelRide rejects a user who does not own the ride', async () => {
    const ride = makeMockRide({ status: 'searching', user: 'user1' })
    rideModel.findById.mockReturnValueOnce(Promise.resolve(ride))

    await expect(
      rideService.cancelRide({ rideId: 'ride1', actorRole: 'user', actorId: 'someone-else', reason: 'nope' })
    ).rejects.toThrow(/not the passenger/)
  })

  test('completeRide only allows transition from "started"', async () => {
    const ride = makeMockRide({ status: 'accepted', captain: 'captain1' })
    rideModel.findById.mockReturnValueOnce(Promise.resolve(ride))

    await expect(rideService.completeRide({ rideId: 'ride1', captainId: 'captain1' })).rejects.toThrow(
      /Cannot complete/
    )
  })
})
