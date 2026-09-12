const dotenv = require('dotenv')
dotenv.config()
const express = require('express')
const  cors = require('cors')
const app = express()
const connectToDb = require('./db/db')
const userRoutes = require('./routes/user.routs')

connectToDb()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
  
app.get('/', (req, res)=>{
    res.send('Helloo World')
})

app.use('/users', userRoutes)


module.exports = app