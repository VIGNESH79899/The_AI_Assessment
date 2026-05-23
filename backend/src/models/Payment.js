import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
    provider: { type: String, enum: ["razorpay"], default: "razorpay" },
    providerPaymentId: String,
    providerOrderId: String,
    providerSignature: String,
    amountInr: Number,
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["created", "authorized", "captured", "failed", "refunded"], default: "created" },
    rawEvent: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
