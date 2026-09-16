function generateOtp(length = 4) {
  let otp = ''
  for (let i = 0; i < length; i += 1) {
    otp += Math.floor(Math.random() * 10)
  }
  return otp
}

module.exports = { generateOtp }
