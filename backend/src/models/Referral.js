import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
  {
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    referee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    code: { type: String, required: true },
    status: { type: String, enum: ["pending", "converted", "rewarded"], default: "pending" },
    rewardType: { type: String, enum: ["coupon", "trial_days"], default: "trial_days" },
    rewardValue: { type: Number, default: 7 }
  },
  { timestamps: true }
);

export const Referral = mongoose.model("Referral", referralSchema);
