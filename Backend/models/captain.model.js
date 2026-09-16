const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const captainSchema = new mongoose.Schema(
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
    socketId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'inactive',
    },
    vehicle: {
      color: {
        type: String,
        required: true,
        minlength: [3, 'vehicle color must be at least 3 characters long'],
      },
      plate: {
        type: String,
        required: true,
        minlength: [3, 'vehicle plate must be at least 3 characters long'],
      },
      capacity: {
        type: Number,
        required: true,
        min: [1, 'vehicle capacity must be at least 1'],
        max: [10, 'vehicle capacity must be at most 10'],
      },
      vehicleType: {
        type: String,
        required: true,
        enum: ['car', 'auto', 'bike'],
      },
    },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
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
  },
  { timestamps: true }
)

captainSchema.index({ 'location.lat': 1, 'location.lng': 1 })
captainSchema.index({ status: 1, 'vehicle.vehicleType': 1 })

captainSchema.methods.generateAuthToken = function generateAuthToken() {
  const { env } = require('../config/env')
  return jwt.sign({ _id: this._id, role: 'captain' }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN })
}

captainSchema.methods.comparePassword = async function comparePassword(password) {
  return bcrypt.compare(password, this.password)
}

captainSchema.statics.hashPassword = async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

const captainModel = mongoose.model('captain', captainSchema)

module.exports = captainModel
