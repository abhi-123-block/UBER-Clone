const userModel = require('../models/user.model')
const userService = require('../services/user.service')
const { validationResult } = require('express-validator')

module.exports.registerUser = async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { fullname, email, password } = req.body
    

    const existingUser = await userModel.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" })
    }

    const hashedpassword = await userModel.hashPassword(password)

    const user = await userService.createUser({
      firstname: fullname.firstname,
      lastname: fullname.lastname,
      email,
      password: hashedpassword
    })

    const token = user.generateAuthToken()

    res.status(201).json({ token, user })
  } catch (err) {
    next(err)
  }
}

module.exports.loginUser = async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    
    const user = await userModel.findOne({ email }).select('+password')

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const isMatch = await user.comparePassword(password)  

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const token = user.generateAuthToken()

    res.status(200).json({ token, user })
  } catch (err) {
    next(err)
  }
}