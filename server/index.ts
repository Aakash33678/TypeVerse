import { createServer } from "http";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types/socket";
import "dotenv/config";
import { registerHandlers } from "./socket-handlers";
import jwt from "jsonwebtoken";

console.log("Better_AUTH_SECRET loaded:", !!process.env.BETTER_AUTH_SECRET);
const httpServer = createServer((req, res) => {
  const url = req.url || "/";

  if (url === "/health" || url === "/healthz" || url === "/ready") {
    res.writeHead(200, { "Content-Type": "application/json" });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    res.end("TypeVerse Socket Server");
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});
const corsOrigins = (process.env.SOCKET_CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: {
    origin: corsOrigins,
    credentials: true,
  },
});

// Auth middleware
io.use((socket, next) => {
  console.log("Handshake auth:", socket.handshake.auth);

  const token = socket.handshake.auth?.token;
  console.log("Received token:", token);

  try {
    const payload = jwt.verify(
      token,
      process.env.SOCKET_JWT_SECRET!
    );

    console.log("Verified payload:", payload);

    socket.data.userId = (payload as any).userId;
    socket.data.userName = (payload as any).name;
    socket.data.userImage = (payload as any).image;

    next();
  } catch (err) {
    console.error("JWT verify error:", err);
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log(`[Socket] ${socket.data.userName} connected (${socket.id})`);
  registerHandlers(io, socket);
});

const PORT = parseInt(
  process.env.PORT || process.env.SOCKET_PORT || "8080",
  10,
);

httpServer.listen(PORT, () => {
  console.log(`[Socket.IO] Server running on port ${PORT}`);
});
