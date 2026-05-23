import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { requireActiveMembership, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { GeneratedDocument } from "../models/GeneratedDocument.js";
import { generateAssignment } from "../services/aiService.js";
import { ApiError } from "../middleware/errorHandler.js";
import { env } from "../config/env.js";

export const generatorRouter = express.Router();

function normalizeAiDownloadUrl(url) {
  if (typeof url !== "string" || !url.trim()) {
    return "";
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${env.aiServiceUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

generatorRouter.post(
  "/generator/assignments",
  requireAuth,
  requireActiveMembership,
  validate(
    z.object({
      body: z.object({
        student_name: z.string().optional(),
        academic_year: z.string().optional(),
        registration_number: z.string().optional(),
        year_term: z.string().optional(),
        study_level: z.string().optional(),
        class_section: z.string().optional(),
        course_name: z.string().optional(),
        instructor: z.string().optional(),
        assessment: z.string().optional(),
        date: z.string().optional(),
        topic: z.string().min(3),
        document_name: z.string().optional(),
        template_path: z.string().optional()
      })
    })
  ),
  asyncHandler(async (req, res) => {
    const token = uuidv4();
    const persistenceEnabled = mongoose.connection.readyState === 1;
    const doc = persistenceEnabled ? await GeneratedDocument.create({
      user: req.user._id,
      topic: req.validated.body.topic,
      documentName: req.validated.body.document_name || "Journal_Document",
      downloadToken: token,
      status: "processing"
    }) : {
      _id: `demo_doc_${Date.now()}`,
      user: req.user._id,
      topic: req.validated.body.topic,
      documentName: req.validated.body.document_name || "Journal_Document",
      downloadToken: token,
      status: "processing",
      save: async () => undefined
    };

    try {
      const result = await generateAssignment(req.validated.body);
      if (!result?.url || typeof result.url !== "string") {
        throw new ApiError(502, "AI service did not return a download URL");
      }

      doc.aiServiceUrl = result.url;
      doc.status = "ready";
      await doc.save();
      const directUrl = normalizeAiDownloadUrl(result.url);
      if (!directUrl) {
        throw new ApiError(502, "AI service returned an invalid download URL");
      }

      res.status(201).json({
        document: doc,
        downloadUrl: persistenceEnabled ? `/api/generator/download/${doc._id}` : directUrl
      });
    } catch (error) {
      doc.status = "failed";
      doc.error = error.message;
      await doc.save();
      throw new ApiError(502, "AI document generation failed", error.message);
    }
  })
);

generatorRouter.get(
  "/generator/download/:id",
  requireAuth,
  requireActiveMembership,
  asyncHandler(async (req, res) => {
    const doc = await GeneratedDocument.findOne({ _id: req.params.id, user: req.user._id });
    if (!doc || doc.status !== "ready") throw new ApiError(404, "Generated document not found");
    res.redirect(doc.aiServiceUrl);
  })
);

generatorRouter.get(
  "/generator/history",
  requireAuth,
  asyncHandler(async (req, res) => {
    // If persistent connection is not ready, return empty history
    if (mongoose.connection.readyState !== 1) {
      return res.json({ history: [] });
    }
    const history = await GeneratedDocument.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ history });
  })
);

generatorRouter.delete(
  "/generator/history/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true });
    }
    await GeneratedDocument.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  })
);
