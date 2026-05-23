import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, uppercase: true, trim: true, unique: true, required: true },
    percentOff: { type: Number, min: 1, max: 100 },
    amountOffInr: Number,
    active: { type: Boolean, default: true },
    maxRedemptions: Number,
    redeemedCount: { type: Number, default: 0 },
    expiresAt: Date
  },
  { timestamps: true }
);

export const Coupon = mongoose.model("Coupon", couponSchema);
