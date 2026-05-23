import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Plan } from "../models/Plan.js";
import { Coupon } from "../models/Coupon.js";
import { Subscription } from "../models/Subscription.js";
import { Payment } from "../models/Payment.js";
import { Invoice } from "../models/Invoice.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ApiError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { defaultPlans } from "../services/defaultPlans.js";
import { createCheckoutSubscription, verifyPaymentSignature } from "../services/razorpayService.js";
import { membershipEmail, sendEmail } from "../services/emailService.js";

export const subscriptionRouter = express.Router();

subscriptionRouter.get(
  "/plans",
  asyncHandler(async (_req, res) => {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ plans: defaultPlans, persistence: "disabled" });
    }
    const dbPlans = await Plan.find({ active: true }).sort({ durationMonths: 1 });
    res.json({ plans: dbPlans.length ? dbPlans : defaultPlans });
  })
);

subscriptionRouter.post(
  "/subscriptions/checkout",
  requireAuth,
  validate(z.object({ body: z.object({ planKey: z.string(), couponCode: z.string().optional() }) })),
  asyncHandler(async (req, res) => {
    const { planKey, couponCode } = req.validated.body;
    const plan = (await Plan.findOne({ key: planKey, active: true })) || defaultPlans.find((item) => item.key === planKey);
    if (!plan) throw new ApiError(404, "Plan not found");

    const coupon = couponCode ? await Coupon.findOne({ code: couponCode.toUpperCase(), active: true }) : null;
    if (couponCode && !coupon) throw new ApiError(400, "Coupon is invalid or expired");

    const checkout = await createCheckoutSubscription({ plan, user: req.user, coupon });
    res.json({ checkout, plan });
  })
);

subscriptionRouter.post(
  "/subscriptions/verify",
  requireAuth,
  validate(
    z.object({
      body: z.object({
        planKey: z.string(),
        razorpay_subscription_id: z.string(),
        razorpay_payment_id: z.string().optional(),
        razorpay_signature: z.string().optional()
      })
    })
  ),
  asyncHandler(async (req, res) => {
    const { planKey, razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = req.validated.body;
    if (
      razorpay_payment_id &&
      razorpay_signature &&
      !verifyPaymentSignature({
        subscriptionId: razorpay_subscription_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature
      })
    ) {
      throw new ApiError(400, "Invalid Razorpay signature");
    }

    const plan = (await Plan.findOne({ key: planKey })) || defaultPlans.find((item) => item.key === planKey);
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + plan.durationMonths);

    const subscription = await Subscription.create({
      user: req.user._id,
      plan: plan._id,
      planKey,
      status: "active",
      providerSubscriptionId: razorpay_subscription_id,
      currentPeriodStart: start,
      currentPeriodEnd: end
    });

    req.user.subscription = {
      status: "active",
      planKey,
      currentPeriodEnd: end,
      autoRenew: true,
      razorpaySubscriptionId: razorpay_subscription_id
    };
    await req.user.save();

    const payment = await Payment.create({
      user: req.user._id,
      subscription: subscription._id,
      providerPaymentId: razorpay_payment_id,
      amountInr: plan.priceInr,
      status: "captured"
    });
    await Invoice.create({
      user: req.user._id,
      payment: payment._id,
      number: `INV-${Date.now()}`,
      amountInr: plan.priceInr,
      downloadUrl: `/api/invoices/${payment._id}/download`
    });
    await sendEmail(membershipEmail("payment_success", req.user, { amountInr: plan.priceInr }));

    res.json({ subscription, user: req.user });
  })
);

subscriptionRouter.get("/subscriptions/me", requireAuth, (req, res) => {
  res.json({ subscription: req.user.subscription });
});

subscriptionRouter.post(
  "/subscriptions/change-plan",
  requireAuth,
  validate(z.object({ body: z.object({ planKey: z.string() }) })),
  asyncHandler(async (req, res) => {
    const plan = (await Plan.findOne({ key: req.validated.body.planKey, active: true })) || defaultPlans.find((item) => item.key === req.validated.body.planKey);
    if (!plan) throw new ApiError(404, "Plan not found");
    const end = new Date();
    end.setMonth(end.getMonth() + plan.durationMonths);
    req.user.subscription.planKey = plan.key;
    req.user.subscription.currentPeriodEnd = end;
    req.user.subscription.status = "active";
    await req.user.save();
    res.json({ subscription: req.user.subscription });
  })
);

subscriptionRouter.post(
  "/subscriptions/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    req.user.subscription.autoRenew = false;
    req.user.subscription.status = req.user.subscription.status === "free" ? "free" : "cancelled";
    await req.user.save();
    await sendEmail(membershipEmail("cancellation", req.user));
    res.json({ subscription: req.user.subscription });
  })
);

subscriptionRouter.patch(
  "/subscriptions/auto-renew",
  requireAuth,
  validate(z.object({ body: z.object({ autoRenew: z.boolean() }) })),
  asyncHandler(async (req, res) => {
    req.user.subscription.autoRenew = req.validated.body.autoRenew;
    await req.user.save();
    res.json({ subscription: req.user.subscription });
  })
);

subscriptionRouter.get(
  "/invoices",
  requireAuth,
  asyncHandler(async (req, res) => {
    const invoices = await Invoice.find({ user: req.user._id }).sort({ issuedAt: -1 });
    res.json({ invoices });
  })
);
