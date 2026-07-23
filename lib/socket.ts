import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/socket";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export async function getSocket(): Promise<TypedSocket> {
  if (!socket) {
    const res = await fetch("/api/socket-token", {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Failed to get socket token");
    }

    const { token } = await res.json();

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      withCredentials: true,
      autoConnect: false,
      auth: {
        token,
      },
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}