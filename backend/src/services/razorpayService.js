import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../config/env.js";

const configured = Boolean(env.razorpayKeyId && env.razorpayKeySecret);
const razorpay = configured
  ? new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret })
  : null;

export async function createCheckoutSubscription({ plan, user, coupon }) {
  const amount = Math.max(0, plan.priceInr - (coupon?.amountOffInr || 0));

  if (!configured || !plan.razorpayPlanId) {
    return {
      demo: true,
      key: env.razorpayKeyId || "rzp_test_demo",
      subscriptionId: `demo_sub_${Date.now()}`,
      amountInr: amount,
      currency: "INR"
    };
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: plan.razorpayPlanId,
    customer_notify: 1,
    total_count: 12,
    notes: {
      userId: user._id.toString(),
      planKey: plan.key,
      couponCode: coupon?.code || ""
    }
  });

  return {
    key: env.razorpayKeyId,
    subscriptionId: subscription.id,
    amountInr: amount,
    currency: "INR"
  };
}

export function verifyPaymentSignature({ subscriptionId, paymentId, signature }) {
  if (!env.razorpayKeySecret) return true;
  const body = `${paymentId}|${subscriptionId}`;
  const expected = crypto.createHmac("sha256", env.razorpayKeySecret).update(body).digest("hex");
  return expected === signature;
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpayWebhookSecret) return true;
  const expected = crypto.createHmac("sha256", env.razorpayWebhookSecret).update(rawBody).digest("hex");
  return expected === signature;
}
