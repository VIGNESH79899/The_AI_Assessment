import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { requireActiveMembership, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { GeneratedDocument } from "../models/GeneratedDocument.js";
import { generateAssignment, generateFreeWriting, searchLiterature, generateLiteratureSurvey } from "../services/aiService.js";
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
    if (!doc) throw new ApiError(404, "Generated document not found");
    if (doc.status === "failed") throw new ApiError(400, "This document failed to generate. Please try generating it again.");
    if (doc.status === "processing") throw new ApiError(400, "This document is still generating. Please try again in a few seconds.");
    if (doc.status !== "ready") throw new ApiError(400, "Document is not ready for download.");
    
    // Normalize the URL before redirecting, in case it's a relative path to the AI service
    const directUrl = normalizeAiDownloadUrl(doc.aiServiceUrl);
    res.redirect(directUrl);
  })
);

generatorRouter.post(
  "/generator/free-writing",
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
        academic_domain: z.string().optional(),
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
      documentName: req.validated.body.document_name || "FreeWriting_Document",
      downloadToken: token,
      status: "processing",
      assessmentType: "free_writing"
    }) : {
      _id: `demo_doc_${Date.now()}`,
      user: req.user._id,
      topic: req.validated.body.topic,
      documentName: req.validated.body.document_name || "FreeWriting_Document",
      downloadToken: token,
      status: "processing",
      assessmentType: "free_writing",
      save: async () => undefined
    };

    try {
      const result = await generateFreeWriting(req.validated.body);
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
      throw new ApiError(502, "AI free writing generation failed", error.message);
    }
  })
);
generatorRouter.get(
  "/generator/literature-search",
  requireAuth,
  requireActiveMembership,
  asyncHandler(async (req, res) => {
    const query = req.query.q;
    if (!query || typeof query !== "string" || !query.trim()) {
      throw new ApiError(400, "Search query is required");
    }
    const results = await searchLiterature(query.trim());
    res.json({ results: (results && results.results) ? results.results : (Array.isArray(results) ? results : []) });
  })
);

generatorRouter.post(
  "/generator/literature-survey",
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
        template_path: z.string().optional(),
        selected_papers: z.array(z.any()).min(1, "At least one paper must be selected")
      })
    })
  ),
  asyncHandler(async (req, res) => {
    const token = uuidv4();
    const persistenceEnabled = mongoose.connection.readyState === 1;
    const doc = persistenceEnabled ? await GeneratedDocument.create({
      user: req.user._id,
      topic: req.validated.body.topic,
      documentName: req.validated.body.document_name || "LiteratureSurvey_Document",
      downloadToken: token,
      status: "processing",
      assessmentType: "literature_survey",
      assessmentMetadata: {
        papers_count: req.validated.body.selected_papers.length
      }
    }) : {
      _id: `demo_doc_${Date.now()}`,
      user: req.user._id,
      topic: req.validated.body.topic,
      documentName: req.validated.body.document_name || "LiteratureSurvey_Document",
      downloadToken: token,
      status: "processing",
      assessmentType: "literature_survey",
      save: async () => undefined
    };

    try {
      const result = await generateLiteratureSurvey(req.validated.body);
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
      throw new ApiError(502, "AI literature survey generation failed", error.message);
    }
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
