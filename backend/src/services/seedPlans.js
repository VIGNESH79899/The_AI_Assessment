import { Plan } from "../models/Plan.js";
import { defaultPlans } from "./defaultPlans.js";

export async function seedDefaultPlans() {
  for (const plan of defaultPlans) {
    await Plan.findOneAndUpdate({ key: plan.key }, { $setOnInsert: plan }, { upsert: true, new: true });
  }
}
