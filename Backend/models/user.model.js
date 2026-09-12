const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
require('dotenv').config()


const userSchema = new mongoose.Schema({
    fullname: {
        firstname: {
            type: String,
            required: true,
            minlength:[3, 'first name must be of 3 characters or long']
        },
        lastname: {
            type: String,
            minlength:[3, 'last name must be of 3 characters or long']
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        minlength:[5, 'email must be of 3 characters or long']
    },
    password: {
        type: String,
        required: true,
        minlength:[8, 'password must be of 8 characters '],
        select: false
    },
    socketId: {
        type: String
    }
})

userSchema.methods.generateAuthToken = function(){
    const token = jwt.sign({_id: this._id}, process.env.JWT_SECRET)
    return token
}

userSchema.methods.comparePassword = async function (password){
    return await bcrypt.compare(password , this.password)
}


userSchema.statics.hashPassword = async function (password){
    return await bcrypt.hash(password , 10)
}


const userModel = mongoose.model('user', userSchema)


module.exports = userModel