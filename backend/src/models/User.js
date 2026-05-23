import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const subscriptionSnapshotSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["free", "trialing", "active", "past_due", "cancelled", "expired"], default: "free" },
    planKey: { type: String, default: "free" },
    currentPeriodEnd: Date,
    trialEndsAt: Date,
    autoRenew: { type: Boolean, default: true },
    razorpaySubscriptionId: String
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, unique: true, required: true },
    passwordHash: String,
    avatarUrl: String,
    role: { type: String, enum: ["user", "admin"], default: "user" },
    oauthProviders: [
      {
        provider: { type: String, enum: ["google", "github"] },
        providerId: String
      }
    ],
    subscription: { type: subscriptionSnapshotSchema, default: () => ({}) },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: String,
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: Date
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};

userSchema.methods.comparePassword = function comparePassword(password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model("User", userSchema);
