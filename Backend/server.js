const http = require('http')
const app = require('./app')
const { env } = require('./config/env')
const { initSocket } = require('./sockets/socket')

const server = http.createServer(app)

initSocket(server)

server.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on port ${env.PORT}`)
})

module.exports = server
