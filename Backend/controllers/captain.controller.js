const captainModel = require('../models/captain.model')
const captainService = require('../services/captain.service')
const { validationResult } = require('express-validator')
const blacklistTokenModel = require('../models/blacklistToken.model')  

module.exports.registerCaptain = async (req, res) => {
    try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { fullname, email, password , vehicle } = req.body
    

    const existingCaptain = await captainModel.findOne({ email })
    if (existingCaptain) {
      return res.status(400).json({ message: "Captain already exists" })
    }

    const hashedpassword = await captainModel.hashPassword(password)

    const captain = await captainService.createCaptain({
      firstname: fullname.firstname,
      lastname: fullname.lastname,
      email,
      password: hashedpassword,
      color: vehicle.color,
      plate: vehicle.plate,
      capacity: vehicle.capacity,
      vehicleType: vehicle.vehicleType
    })

    const token = captain.generateAuthToken()

    res.status(201).json({ token, captain })
  } catch (err) {
    next(err)
  }
}