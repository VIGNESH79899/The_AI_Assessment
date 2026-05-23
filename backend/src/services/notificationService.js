import { Notification } from "../models/Notification.js";

export async function notify(io, userId, payload) {
  const notification = await Notification.create({ user: userId, ...payload });
  io?.to(`user:${userId}`).emit("notification", notification);
  return notification;
}
