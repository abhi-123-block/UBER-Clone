const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')



const captainSchema = new mongoose.Schema({
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
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'Please use a valid email address'],
    },
    password: {
        type: String,
        required: true,
        minlength:[8, 'password must be of 8 characters '],
        select: false
    },
    socketId: {
        type: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'inactive'
    },
    vehicle: {
        color: {
            type: String,
            required: true,
            minlength:[3, 'vehicle color must be of 3 characters or long']
        },
        plate: {
            type: String,
            required: true,
            minlength:[3, 'vehicle plate must be of 3 characters or long']
        },
        capacity:{
            type: Number,
            required: true,
            min: [1, 'vehicle capacity must be at least 1'],
            max: [5, 'vehicle capacity must be at most 5']
        },
        vehicleType: {
            type: String,
            required: true,
            enum: ['car', 'auto', 'bike']
        },
        location: {
            lat: {
                type: Number
            },
            lng: {
                type: Number
            }
        }

    }
})


captainSchema.methods.generateAuthToken = function(){
    const token = jwt.sign({_id: this._id}, process.env.JWT_SECRET, { expiresIn: '24h' })
    return token
}

captainSchema.methods.comparePassword = async function (password){
    return await bcrypt.compare(password , this.password)
}


captainSchema.statics.hashPassword = async function (password){
    return await bcrypt.hash(password , 10)
}


const captainModel = mongoose.model('captain', captainSchema)

module.exports = captainModel