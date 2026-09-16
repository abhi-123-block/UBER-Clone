const mongoose = require('mongoose')

const ratingSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ride',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'captain',
      required: true,
    },
    // Who submitted this rating: the passenger rating the captain, or vice versa.
    ratedBy: {
      type: String,
      enum: ['user', 'captain'],
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true }
)

// A given ride can only be rated once per direction (user->captain, captain->user).
ratingSchema.index({ ride: 1, ratedBy: 1 }, { unique: true })
ratingSchema.index({ captain: 1 })
ratingSchema.index({ user: 1 })

const ratingModel = mongoose.model('rating', ratingSchema)

module.exports = ratingModel
