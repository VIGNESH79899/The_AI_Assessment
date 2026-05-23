import mongoose from "mongoose";
import { User } from "../models/User.js";
import { ApiError } from "./errorHandler.js";
import { verifyAccessToken } from "../utils/tokens.js";

function demoUserFromToken(decoded) {
  const end = new Date();
  end.setMonth(end.getMonth() + 6);
  return {
    _id: decoded.sub,
    id: decoded.sub,
    name: "Demo Premium Member",
    email: "demo@example.com",
    role: decoded.role || "admin",
    subscription: {
      status: "active",
      planKey: "half-yearly",
      currentPeriodEnd: end,
      autoRenew: true
    },
    tokenVersion: 0,
    save: async () => undefined
  };
}

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    let token = header.startsWith("Bearer ") ? header.slice(7) : req.cookies?.accessToken;
    if (!token && req.query?.token) token = req.query.token;
    
    if (!token) throw new ApiError(401, "Authentication required");

    const decoded = verifyAccessToken(token);
    if (mongoose.connection.readyState !== 1 && decoded.sub === "demo-user") {
      req.user = demoUserFromToken(decoded);
      return next();
    }

    const user = await User.findById(decoded.sub).select("-passwordHash");
    if (!user) throw new ApiError(401, "User not found");

    req.user = user;
    next();
  } catch (error) {
    next(error.statusCode ? error : new ApiError(401, "Invalid or expired token"));
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new ApiError(403, "Insufficient permissions"));
    }
    next();
  };
}

export function requireActiveMembership(req, _res, next) {
  if (process.env.FREE_MODE === "true") {
    return next();
  }

  const user = req.user;
  const now = new Date();
  const active = user?.subscription?.status === "active" && user.subscription.currentPeriodEnd > now;
  const trial = user?.subscription?.status === "trialing" && user.subscription.trialEndsAt > now;
  if (!active && !trial && user?.role !== "admin") {
    return next(new ApiError(402, "Active membership or trial required"));
  }
  next();
}
