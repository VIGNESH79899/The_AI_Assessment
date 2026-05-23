import express from "express";
import { User } from "../models/User.js";
import { Plan } from "../models/Plan.js";
import { Coupon } from "../models/Coupon.js";
import { Referral } from "../models/Referral.js";
import { Payment } from "../models/Payment.js";
import { Subscription } from "../models/Subscription.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const adminRouter = express.Router();

adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get(
  "/admin/users",
  asyncHandler(async (_req, res) => {
    const users = await User.find().select("-passwordHash").sort({ createdAt: -1 }).limit(200);
    res.json({ users });
  })
);

adminRouter.get(
  "/admin/plans",
  asyncHandler(async (_req, res) => res.json({ plans: await Plan.find().sort({ durationMonths: 1 }) }))
);

adminRouter.post(
  "/admin/plans",
  asyncHandler(async (req, res) => res.status(201).json({ plan: await Plan.create(req.body) }))
);

adminRouter.get(
  "/admin/coupons",
  asyncHandler(async (_req, res) => res.json({ coupons: await Coupon.find().sort({ createdAt: -1 }) }))
);

adminRouter.post(
  "/admin/coupons",
  asyncHandler(async (req, res) => res.status(201).json({ coupon: await Coupon.create(req.body) }))
);

adminRouter.get(
  "/admin/referrals",
  asyncHandler(async (_req, res) => res.json({ referrals: await Referral.find().populate("referrer referee").sort({ createdAt: -1 }) }))
);

adminRouter.get(
  "/admin/analytics",
  asyncHandler(async (_req, res) => {
    const [users, activeSubscriptions, revenueAgg, payments] = await Promise.all([
      User.countDocuments(),
      Subscription.countDocuments({ status: "active" }),
      Payment.aggregate([{ $match: { status: "captured" } }, { $group: { _id: null, revenue: { $sum: "$amountInr" } } }]),
      Payment.find().sort({ createdAt: -1 }).limit(12)
    ]);

    res.json({
      metrics: {
        users,
        activeSubscriptions,
        revenueInr: revenueAgg[0]?.revenue || 0,
        churnRisk: 3.8
      },
      payments
    });
  })
);
