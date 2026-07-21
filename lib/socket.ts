import { io, Socket } from "socket.io-client"
import type { ClientToServerEvents, ServerToClientEvents } from "@/types/socket"

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: TypedSocket | null = null

export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket"],
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
