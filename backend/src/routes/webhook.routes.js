import express from "express";
import { WebhookEvent } from "../models/WebhookEvent.js";
import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";
import { verifyWebhookSignature } from "../services/razorpayService.js";
import { membershipEmail, sendEmail } from "../services/emailService.js";

export const webhookRouter = express.Router();

webhookRouter.post("/webhooks/razorpay", express.raw({ type: "application/json" }), async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.body.toString("utf8");
    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload.event_id || payload.payload?.payment?.entity?.id || `${payload.event}-${Date.now()}`;
    const existing = await WebhookEvent.findOne({ provider: "razorpay", eventId });
    if (existing) return res.json({ ok: true, duplicate: true });

    await WebhookEvent.create({
      provider: "razorpay",
      eventId,
      eventType: payload.event,
      processedAt: new Date(),
      payload
    });

    const paymentEntity = payload.payload?.payment?.entity;
    if (paymentEntity) {
      await Payment.findOneAndUpdate(
        { providerPaymentId: paymentEntity.id },
        {
          providerPaymentId: paymentEntity.id,
          amountInr: paymentEntity.amount ? paymentEntity.amount / 100 : undefined,
          status: paymentEntity.status === "captured" ? "captured" : "failed",
          rawEvent: payload
        },
        { upsert: true, new: true }
      );
    }

    const userId = payload.payload?.subscription?.entity?.notes?.userId;
    if (userId && payload.event?.includes("charged")) {
      const user = await User.findById(userId);
      if (user) await sendEmail(membershipEmail("payment_success", user));
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
