import mongoose from "mongoose";

const generatedDocumentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    topic: String,
    documentName: String,
    aiServiceUrl: String,
    downloadToken: String,
    status: { type: String, enum: ["processing", "ready", "failed"], default: "processing" },
    error: String
  },
  { timestamps: true }
);

export const GeneratedDocument = mongoose.model("GeneratedDocument", generatedDocumentSchema);
