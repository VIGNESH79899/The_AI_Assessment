import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id?.toString() || user.id, role: user.role }, env.jwtAccessSecret, {
    expiresIn: "15m"
  });
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user._id?.toString() || user.id, tokenVersion: user.tokenVersion || 0 }, env.jwtRefreshSecret, {
    expiresIn: "30d"
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}
