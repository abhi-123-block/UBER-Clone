const express = require('express')
const router = express.Router()
const {body} = require("express-validator")
const captainController = require('../controllers/captain.controller')
const authMiddleware = require('../middlewares/auth.middleware')

router.post('/register', [
    body('email').isEmail().withMessage('Invalid Email'),
    body('fullname.firstname').isLength({min:3}).withMessage('first name must be of 3 characters or long'),
    body('password').isLength({min:8}).withMessage('password must be of 8 characters '),
    body('vehicle.color').isLength({min:3}).withMessage('vehicle color must be of 3 characters or long'),
    body('vehicle.plate').isLength({min:3}).withMessage('vehicle plate must be of 3 characters or long'),
    body('vehicle.capacity').isInt({min:1, max:5}).withMessage('vehicle capacity must be between 1 and 5'),
    body('vehicle.vehicleType').isIn(['car', 'auto', 'bike']).withMessage('vehicle type must be either car, auto or bike')
], 
    captainController.registerCaptain
)

router.post('/login', [
    body('email').isEmail().withMessage('Invalid Email'),
    body('password').isLength({min:8}).withMessage('password must be of 8 characters ')
], 
    captainController.loginCaptain
)

router.get('/profile', authMiddleware.authCaptain, captainController.getCaptainProfile)   

router.get('/logout', authMiddleware.authCaptain, captainController.logoutCaptain)



module.exports = router