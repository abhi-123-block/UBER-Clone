const express = require('express')
const router = express.Router()
const { body } = require('express-validator')
const captainController = require('../controllers/captain.controller')
const authMiddleware = require('../middlewares/auth.middleware')

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('fullname.firstname').isLength({ min: 3 }).withMessage('first name must be at least 3 characters long'),
    body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters long'),
    body('vehicle.color').isLength({ min: 3 }).withMessage('vehicle color must be at least 3 characters long'),
    body('vehicle.plate').isLength({ min: 3 }).withMessage('vehicle plate must be at least 3 characters long'),
    body('vehicle.capacity').isInt({ min: 1, max: 10 }).withMessage('vehicle capacity must be between 1 and 10'),
    body('vehicle.vehicleType').isIn(['car', 'auto', 'bike']).withMessage('vehicle type must be car, auto or bike'),
  ],
  captainController.registerCaptain
)

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters long'),
  ],
  captainController.loginCaptain
)

router.get('/profile', authMiddleware.authCaptain, captainController.getCaptainProfile)
router.patch('/profile', authMiddleware.authCaptain, captainController.updateCaptainProfile)
router.patch(
  '/status',
  authMiddleware.authCaptain,
  [body('status').isIn(['active', 'inactive'])],
  captainController.updateStatus
)
router.patch(
  '/location',
  authMiddleware.authCaptain,
  [body('lat').isFloat(), body('lng').isFloat()],
  captainController.updateLocation
)
router.get('/logout', authMiddleware.authCaptain, captainController.logoutCaptain)

module.exports = router
