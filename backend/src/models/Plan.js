import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    interval: { type: String, enum: ["monthly", "quarterly", "half-yearly", "yearly"], required: true },
    durationMonths: { type: Number, required: true },
    priceInr: { type: Number, required: true },
    razorpayPlanId: String,
    popular: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    features: [String],
    limits: {
      documentsPerMonth: { type: Number, default: 20 },
      seats: { type: Number, default: 1 }
    }
  },
  { timestamps: true }
);

export const Plan = mongoose.model("Plan", planSchema);
