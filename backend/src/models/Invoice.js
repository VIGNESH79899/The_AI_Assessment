import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    number: { type: String, unique: true, required: true },
    amountInr: Number,
    status: { type: String, enum: ["draft", "paid", "void"], default: "paid" },
    downloadUrl: String,
    issuedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const Invoice = mongoose.model("Invoice", invoiceSchema);
