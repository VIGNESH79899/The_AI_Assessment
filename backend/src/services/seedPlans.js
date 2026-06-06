import { Plan } from "../models/Plan.js";
import { Coupon } from "../models/Coupon.js";
import { defaultPlans } from "./defaultPlans.js";

export async function seedDefaultPlans() {
  await Plan.deleteMany({ key: "monthly" });
  for (const plan of defaultPlans) {
    await Plan.findOneAndUpdate({ key: plan.key }, { $set: plan }, { upsert: true, new: true });
  }
}

export async function seedDefaultCoupons() {
  const defaultCoupons = [
    { code: "STUDENT200", amountOffInr: 200, active: true },
    { code: "DISCOUNT200", amountOffInr: 200, active: true },
    { code: "WELCOME200", amountOffInr: 200, active: true }
  ];

  for (const coupon of defaultCoupons) {
    await Coupon.findOneAndUpdate(
      { code: coupon.code },
      { $set: coupon },
      { upsert: true, new: true }
    );
  }
}
