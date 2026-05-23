import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
    planKey: String,
    status: { type: String, enum: ["trialing", "active", "past_due", "cancelled", "expired"], default: "trialing" },
    provider: { type: String, enum: ["razorpay"], default: "razorpay" },
    providerSubscriptionId: String,
    providerCustomerId: String,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    trialEndsAt: Date,
    autoRenew: { type: Boolean, default: true },
    cancelledAt: Date,
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
