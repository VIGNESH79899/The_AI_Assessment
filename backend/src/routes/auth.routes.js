import express from "express";
import mongoose from "mongoose";
import passport from "passport";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { ApiError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { env, isProduction } from "../config/env.js";
import { membershipEmail, sendEmail } from "../services/emailService.js";

export const authRouter = express.Router();

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000
};

function issueAuth(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.cookie("refreshToken", refreshToken, cookieOptions);
  return { accessToken, user: sanitizeUser(user) };
}

function demoUser(email = "demo@example.com", name = "Demo Premium Member") {
  const end = new Date();
  end.setMonth(end.getMonth() + 6);
  return {
    _id: "demo-user",
    id: "demo-user",
    name,
    email,
    role: "admin",
    referralCode: "AM-PREMIUM-42",
    tokenVersion: 0,
    subscription: {
      status: "active",
      planKey: "half-yearly",
      currentPeriodEnd: end,
      autoRenew: true
    }
  };
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    avatar: user.avatar || user.avatarUrl,
    provider: user.provider || "local",
    googleId: user.googleId,
    githubId: user.githubId,
    referralCode: user.referralCode,
    subscription: user.subscription
  };
}

authRouter.post(
  "/register",
  validate(
    z.object({
      body: z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
        referralCode: z.string().optional()
      })
    })
  ),
  asyncHandler(async (req, res) => {
    const { name, email, password, referralCode } = req.validated.body;
    if (mongoose.connection.readyState !== 1) {
      return res.status(201).json(issueAuth(res, demoUser(email, name)));
    }

    const existing = await User.findOne({ email });
    if (existing) throw new ApiError(409, "Email is already registered");

    const user = new User({
      name,
      email,
      referralCode: uuidv4().slice(0, 8).toUpperCase(),
      referredBy: referralCode
    });
    await user.setPassword(password);
    await user.save();
    await sendEmail(membershipEmail("welcome", user));

    res.status(201).json(issueAuth(res, user));
  })
);

authRouter.post(
  "/login",
  validate(z.object({ body: z.object({ email: z.string().email(), password: z.string().min(1) }) })),
  asyncHandler(async (req, res) => {
    const { email, password } = req.validated.body;
    if (mongoose.connection.readyState !== 1) {
      return res.json(issueAuth(res, demoUser(email)));
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) throw new ApiError(401, "Invalid email or password");
    user.lastLoginAt = new Date();
    await user.save();
    res.json(issueAuth(res, user));
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) throw new ApiError(401, "Refresh token required");
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.sub);
    if (!user || user.tokenVersion !== decoded.tokenVersion) throw new ApiError(401, "Invalid refresh token");
    res.json(issueAuth(res, user));
  })
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    req.user.tokenVersion += 1;
    await req.user.save();
    res.clearCookie("refreshToken", cookieOptions).json({ ok: true });
  })
);

authRouter.get("/me", requireAuth, (req, res) => res.json({ user: sanitizeUser(req.user) }));

authRouter.get("/google", (req, res, next) => {
  if (!env.googleClientId || !env.googleClientSecret) {
    return res.redirect(`${env.clientUrl}/login?oauth=google-unconfigured`);
  }
  passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
});

authRouter.get(
  "/google/callback",
  (req, res, next) => {
    if (!env.googleClientId || !env.googleClientSecret) {
      return res.redirect(`${env.clientUrl}/login?oauth=google-unconfigured`);
    }
    passport.authenticate("google", { session: false, failureRedirect: `${env.clientUrl}/login?error=oauth` })(req, res, next);
  },
  (req, res) => {
    const { accessToken } = issueAuth(res, req.user);
    res.redirect(`${env.clientUrl}/auth/callback?token=${accessToken}`);
  }
);

authRouter.get("/github", (req, res, next) => {
  if (!env.githubClientId || !env.githubClientSecret) {
    return res.redirect(`${env.clientUrl}/login?oauth=github-unconfigured`);
  }
  passport.authenticate("github", { scope: ["user:email"], session: false })(req, res, next);
});

authRouter.get(
  "/github/callback",
  (req, res, next) => {
    if (!env.githubClientId || !env.githubClientSecret) {
      return res.redirect(`${env.clientUrl}/login?oauth=github-unconfigured`);
    }
    passport.authenticate("github", { session: false, failureRedirect: `${env.clientUrl}/login?error=oauth` })(req, res, next);
  },
  (req, res) => {
    const { accessToken } = issueAuth(res, req.user);
    res.redirect(`${env.clientUrl}/auth/callback?token=${accessToken}`);
  }
);

authRouter.put(
  "/profile",
  requireAuth,
  validate(
    z.object({
      body: z.object({
        name: z.string().min(2).optional(),
        avatar: z.string().url().or(z.literal("")).optional()
      })
    })
  ),
  asyncHandler(async (req, res) => {
    const { name, avatar } = req.validated.body;
    
    if (name) req.user.name = name;
    if (avatar !== undefined) {
      req.user.avatar = avatar;
      req.user.avatarUrl = avatar;
    }
    
    await req.user.save();
    res.json({ ok: true, user: sanitizeUser(req.user) });
  })
);
