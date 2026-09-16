const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const userSchema = new mongoose.Schema(
  {
    fullname: {
      firstname: {
        type: String,
        required: true,
        minlength: [3, 'first name must be at least 3 characters long'],
      },
      lastname: {
        type: String,
        minlength: [3, 'last name must be at least 3 characters long'],
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [5, 'email must be at least 5 characters long'],
      match: [/\S+@\S+\.\S+/, 'Please use a valid email address'],
    },
    password: {
      type: String,
      required: true,
      minlength: [8, 'password must be at least 8 characters long'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    profileImage: {
      type: String,
      default: null,
    },
    rating: {
      type: Number,
      default: 5,
      min: 0,
      max: 5,
    },
    totalRides: {
      type: Number,
      default: 0,
    },
    socketId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
)

userSchema.methods.generateAuthToken = function generateAuthToken() {
  const { env } = require('../config/env')
  return jwt.sign({ _id: this._id, role: 'user' }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN })
}

userSchema.methods.comparePassword = async function comparePassword(password) {
  return bcrypt.compare(password, this.password)
}

userSchema.statics.hashPassword = async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

const userModel = mongoose.model('user', userSchema)

module.exports = userModel
