import { io } from 'socket.io-client'

// A single shared socket per browser tab. We connect lazily (only once the
// user or captain has a token) and reconnect automatically if the token
// changes (e.g. after login).
let socket = null

export function getSocket(token) {
  const base = import.meta.env.VITE_BASE_URL

  if (socket && socket.auth?.token === token && socket.connected) {
    return socket
  }

  if (socket) {
    socket.disconnect()
  }

  socket = io(base, {
    auth: { token },
    withCredentials: true,
    autoConnect: true,
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
