import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { seedDefaultPlans } from "./services/seedPlans.js";
import { verifyAccessToken } from "./utils/tokens.js";

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.clientUrl,
    credentials: true
  }
});

app.set("io", io);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    const decoded = verifyAccessToken(token);
    socket.userId = decoded.sub;
    next();
  } catch {
    next(new Error("Invalid socket token"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.userId}`);
  socket.emit("connected", { ok: true });
});

const connection = await connectDatabase();
if (connection) {
  await seedDefaultPlans();
}

server.listen(env.port, () => {
  console.log(`[api] listening on http://localhost:${env.port}`);
});
