const mongoose = require('mongoose')

const blacklistTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // Mongo TTL index: auto-removed after 24h (matches token expiry)
  },
})

module.exports = mongoose.model('blacklistTokenModel', blacklistTokenSchema)
