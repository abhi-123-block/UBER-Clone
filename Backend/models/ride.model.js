const mongoose = require('mongoose')

const RIDE_STATUSES = ['searching', 'accepted', 'arriving', 'started', 'completed', 'cancelled']

const rideSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'captain',
      default: null,
    },
    pickup: {
      type: String,
      required: true,
    },
    destination: {
      type: String,
      required: true,
    },
    pickupCoordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    destinationCoordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    fare: {
      type: Number,
      required: true,
    },
    distance: {
      type: Number, // km
      required: true,
    },
    duration: {
      type: Number, // minutes
      required: true,
    },
    vehicleType: {
      type: String,
      enum: ['car', 'auto', 'bike'],
      required: true,
    },
    status: {
      type: String,
      enum: RIDE_STATUSES,
      default: 'searching',
    },
    otp: {
      type: String,
      required: true,
      select: false,
    },
    requestedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: {
      type: String,
      enum: ['user', 'captain', null],
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
)

rideSchema.index({ status: 1 })
rideSchema.index({ user: 1 })
rideSchema.index({ captain: 1 })

const rideModel = mongoose.model('ride', rideSchema)

module.exports = rideModel
module.exports.RIDE_STATUSES = RIDE_STATUSES
