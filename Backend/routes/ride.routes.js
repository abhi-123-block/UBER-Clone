const express = require('express')
const router = express.Router()
const { body, param } = require('express-validator')
const rideController = require('../controllers/ride.controller')
const authMiddleware = require('../middlewares/auth.middleware')

const coordinatesValidators = (prefix) => [
  body(`${prefix}.lat`).isFloat({ min: -90, max: 90 }).withMessage(`${prefix}.lat must be a valid latitude`),
  body(`${prefix}.lng`).isFloat({ min: -180, max: 180 }).withMessage(`${prefix}.lng must be a valid longitude`),
]

// Fare estimate - passenger checks prices before requesting.
router.post(
  '/fare-estimate',
  authMiddleware.authUser,
  [...coordinatesValidators('pickupCoordinates'), ...coordinatesValidators('destinationCoordinates')],
  rideController.getFareEstimate
)

// Request a new ride.
router.post(
  '/request',
  authMiddleware.authUser,
  [
    body('pickup').isString().notEmpty().withMessage('pickup is required'),
    body('destination').isString().notEmpty().withMessage('destination is required'),
    body('vehicleType').isIn(['car', 'auto', 'bike']).withMessage('vehicleType must be car, auto or bike'),
    ...coordinatesValidators('pickupCoordinates'),
    ...coordinatesValidators('destinationCoordinates'),
  ],
  rideController.requestRide
)

router.get('/history', authMiddleware.authAny, rideController.getMyRideHistory)
router.get('/earnings', authMiddleware.authCaptain, rideController.getCaptainEarnings)

router.get('/:rideId', authMiddleware.authAny, [param('rideId').isMongoId()], rideController.getRide)

router.patch('/:rideId/accept', authMiddleware.authCaptain, [param('rideId').isMongoId()], rideController.acceptRide)
router.patch('/:rideId/arriving', authMiddleware.authCaptain, [param('rideId').isMongoId()], rideController.markArriving)

router.patch(
  '/:rideId/start',
  authMiddleware.authCaptain,
  [param('rideId').isMongoId(), body('otp').isString().isLength({ min: 4, max: 6 })],
  rideController.startRide
)

router.patch('/:rideId/complete', authMiddleware.authCaptain, [param('rideId').isMongoId()], rideController.completeRide)

router.patch('/:rideId/cancel', authMiddleware.authAny, [param('rideId').isMongoId()], rideController.cancelRide)

router.post(
  '/:rideId/rate',
  authMiddleware.authAny,
  [param('rideId').isMongoId(), body('score').isInt({ min: 1, max: 5 })],
  rideController.rateRide
)

module.exports = router
