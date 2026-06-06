import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../config/env.js";

const configured = Boolean(env.razorpayKeyId && env.razorpayKeySecret);
const razorpay = configured
  ? new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret })
  : null;

export async function createCheckoutSubscription({ plan, user, coupon }) {
  let amount = plan.priceInr;
  if (coupon) {
    if (coupon.amountOffInr) {
      amount = Math.max(0, amount - coupon.amountOffInr);
    } else if (coupon.percentOff) {
      amount = Math.max(0, Math.round(amount * (1 - coupon.percentOff / 100)));
    }
  }

  if (!configured) {
    return {
      demo: true,
      key: env.razorpayKeyId || "rzp_test_demo",
      subscriptionId: `demo_sub_${Date.now()}`,
      amountInr: amount,
      currency: "INR"
    };
  }

  if (!plan.razorpayPlanId) {
    // If keys are set but no plan ID is defined, create an Order as a fallback so they can test the payment popup.
    const order = await razorpay.orders.create({
      amount: amount * 100, // paise
      currency: "INR",
      receipt: `receipt_${plan.key}_${Date.now()}`,
      notes: {
        userId: user._id.toString(),
        planKey: plan.key,
        couponCode: coupon?.code || ""
      }
    });

    return {
      key: env.razorpayKeyId,
      orderId: order.id,
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

export function verifyPaymentSignature({ subscriptionId, orderId, paymentId, signature }) {
  if (!env.razorpayKeySecret) return true;
  let body = "";
  if (subscriptionId) {
    body = `${paymentId}|${subscriptionId}`;
  } else if (orderId) {
    body = `${orderId}|${paymentId}`;
  } else {
    return true;
  }
  const expected = crypto.createHmac("sha256", env.razorpayKeySecret).update(body).digest("hex");
  return expected === signature;
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpayWebhookSecret) return true;
  const expected = crypto.createHmac("sha256", env.razorpayWebhookSecret).update(rawBody).digest("hex");
  return expected === signature;
}
