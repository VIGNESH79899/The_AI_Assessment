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
import PDFDocument from "pdfkit";

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
        razorpay_subscription_id: z.string().optional(),
        razorpay_order_id: z.string().optional(),
        razorpay_payment_id: z.string().optional(),
        razorpay_signature: z.string().optional()
      })
    })
  ),
  asyncHandler(async (req, res) => {
    const { planKey, razorpay_subscription_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.validated.body;
    if (
      razorpay_payment_id &&
      razorpay_signature &&
      !verifyPaymentSignature({
        subscriptionId: razorpay_subscription_id,
        orderId: razorpay_order_id,
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

    const activeId = razorpay_subscription_id || razorpay_order_id || `demo_sub_${Date.now()}`;

    const subscription = await Subscription.create({
      user: req.user._id,
      plan: plan ? plan._id : null,
      planKey,
      status: "active",
      providerSubscriptionId: activeId,
      currentPeriodStart: start,
      currentPeriodEnd: end
    });

    req.user.subscription = {
      status: "active",
      planKey,
      currentPeriodEnd: end,
      autoRenew: true,
      razorpaySubscriptionId: activeId
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

subscriptionRouter.get(
  "/subscriptions/coupons/:code",
  requireAuth,
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findOne({ code: req.params.code.toUpperCase(), active: true });
    if (!coupon) throw new ApiError(404, "Coupon is invalid or expired");
    res.json({ coupon });
  })
);

subscriptionRouter.get(
  "/invoices/:paymentId/download",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({ _id: paymentId, user: req.user._id });
    if (!payment) throw new ApiError(404, "Payment record not found");

    const invoice = await Invoice.findOne({ payment: paymentId });
    if (!invoice) throw new ApiError(404, "Invoice not found");

    const subscription = await Subscription.findOne({ _id: payment.subscription }).populate("plan");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Invoice-${invoice.number}.pdf`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    const primaryColor = "#4F46E5";
    const textColor = "#1F2937";
    const lightGray = "#9CA3AF";
    const accentColor = "#10B981";

    doc
      .fillColor(primaryColor)
      .fontSize(20)
      .text("AI ASSESSMENT MAKER", 50, 50, { bold: true })
      .fontSize(10)
      .fillColor(lightGray)
      .text("Academic Studio Premium Solutions", 50, 75);

    doc
      .fillColor(textColor)
      .fontSize(14)
      .text("INVOICE", 400, 50, { align: "right" })
      .fontSize(10)
      .text(`Invoice No: ${invoice.number}`, 400, 70, { align: "right" })
      .text(`Date: ${new Date(invoice.issuedAt).toLocaleDateString()}`, 400, 85, { align: "right" })
      .text(`Status: Paid`, 400, 100, { align: "right", color: accentColor });

    doc
      .moveTo(50, 120)
      .lineTo(550, 120)
      .strokeColor("#E5E7EB")
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(11)
      .fillColor(primaryColor)
      .text("BILLED TO:", 50, 140, { underline: true })
      .fillColor(textColor)
      .text(`Name: ${req.user.name || "Valued Customer"}`, 50, 160)
      .text(`Email: ${req.user.email}`, 50, 175);

    doc
      .fillColor(primaryColor)
      .text("ISSUED BY:", 350, 140, { underline: true })
      .fillColor(textColor)
      .text("AI Assessment Maker Inc.", 350, 160)
      .text("hello@example.com", 350, 175);

    doc
      .moveTo(50, 210)
      .lineTo(550, 210)
      .strokeColor("#E5E7EB")
      .stroke();

    doc
      .fillColor(primaryColor)
      .fontSize(10)
      .text("PLAN / DESCRIPTION", 50, 230)
      .text("PERIOD", 280, 230)
      .text("TOTAL AMOUNT", 450, 230, { align: "right" });

    doc
      .moveTo(50, 245)
      .lineTo(550, 245)
      .strokeColor("#D1D5DB")
      .stroke();

    const planName = subscription?.planKey ? `${subscription.planKey.replace("-", " ").toUpperCase()} MEMBERSHIP` : "Premium Membership";
    const durationText = subscription?.plan?.durationMonths ? `${subscription.plan.durationMonths} Months` : "Subscription Period";
    const amountStr = `INR ${invoice.amountInr.toFixed(2)}`;

    doc
      .fillColor(textColor)
      .fontSize(11)
      .text(planName, 50, 260)
      .fontSize(10)
      .text(durationText, 280, 260)
      .fontSize(11)
      .text(amountStr, 450, 260, { align: "right" });

    doc
      .fontSize(9)
      .fillColor(lightGray)
      .text(`Payment ID: ${payment.providerPaymentId || "Demo Payment ID"}`, 50, 280);

    doc
      .moveTo(50, 310)
      .lineTo(550, 310)
      .strokeColor("#E5E7EB")
      .stroke();

    doc
      .fillColor(textColor)
      .fontSize(11)
      .text("Subtotal:", 350, 330)
      .text(amountStr, 450, 330, { align: "right" })
      .fontSize(12)
      .fillColor(primaryColor)
      .text("Total Paid:", 350, 350, { bold: true })
      .text(amountStr, 450, 350, { align: "right", bold: true });

    doc
      .moveTo(50, 420)
      .lineTo(550, 420)
      .strokeColor("#E5E7EB")
      .stroke();

    doc
      .fillColor(lightGray)
      .fontSize(9)
      .text("Thank you for your business!", 50, 440, { align: "center" })
      .text("This is an electronically generated document. No signature required.", 50, 455, { align: "center" });

    doc.end();
  })
);
