import express from "express";
import mongoose from "mongoose";
import axios from "axios";
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

function getAiDownloadUrl(result) {
  return result?.url || result?.downloadUrl || result?.fileUrl || result?.docxUrl || "";
}

function getErrorDetails(error) {
  return error?.response?.data?.detail || error?.response?.data || error?.message || "Unknown error";
}

function createGenerationError(error, fallbackMessage) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error?.response?.status === 429) {
    return new ApiError(
      429,
      "AI generation is temporarily rate limited. Please try again in a few minutes.",
      getErrorDetails(error)
    );
  }

  return new ApiError(502, fallbackMessage, getErrorDetails(error));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildDocumentReadyEmailHtml({ userName, documentTitle, documentType, downloadUrl }) {
  const safeUserName = escapeHtml(userName || "User");
  const safeDocumentTitle = escapeHtml(documentTitle || "Generated Document");
  const safeDocumentType = escapeHtml(documentType || "Document");
  const safeDownloadUrl = escapeHtml(downloadUrl || "#");

  return `
<div style="margin:0;padding:0;background-color:#F4F7FB;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#F4F7FB;margin:0;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px 28px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#111827;letter-spacing:0;">
                AI Assessment Maker
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 4px 28px;text-align:center;">
              <h1 style="margin:0;font-size:26px;line-height:34px;font-weight:700;color:#111827;">
                Your Document Is Ready &#127881;
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 0 28px;">
              <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#374151;">
                Hello ${safeUserName},
              </p>
              <p style="margin:0 0 18px 0;font-size:16px;line-height:24px;color:#374151;">
                Your AI-generated <strong style="color:#111827;">${safeDocumentType}</strong> has been successfully created.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <div style="font-size:13px;line-height:18px;font-weight:700;color:#6B7280;text-transform:uppercase;">
                      Document
                    </div>
                    <div style="margin-top:6px;font-size:17px;line-height:24px;font-weight:700;color:#111827;">
                      ${safeDocumentTitle}
                    </div>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto 30px auto;">
                <tr>
                  <td align="center" bgcolor="#2563EB" style="border-radius:8px;background-color:#2563EB;">
                    <a href="${safeDownloadUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;line-height:20px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#2563EB;">
                      Download Your Document
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:23px;color:#4B5563;text-align:center;">
                Need help? Reply to this email and our team will assist you.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px 28px 28px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:15px;line-height:22px;color:#374151;">
                Best Regards,<br>
                <strong style="color:#111827;">AI Assessment Maker Team</strong>
              </p>
            </td>
          </tr>
        </table>
        <div style="max-width:600px;margin:16px auto 0 auto;text-align:center;font-size:12px;line-height:18px;color:#6B7280;">
          Powered by AI Assessment Maker
        </div>
      </td>
    </tr>
  </table>
</div>`.trim();
}

async function triggerZapierDocumentEmail(req, result, documentType, downloadUrl) {
  const body = req.validated?.body || req.body || {};
  const documentTitle = body.document_name || body.topic || "Generated Document";
  const resolvedDownloadUrl = result?.downloadUrl || result?.fileUrl || result?.docxUrl || downloadUrl || null;

  // Zapier is called only after the document has been generated, saved as ready,
  // and a frontend-safe download URL is available. The webhook starts the
  // existing Zapier automation: Catch Hook -> Filter -> Gmail Send Email.
  const payload = {
    userId: req.user?.id || req.user?._id?.toString?.() || null,
    userName: req.user?.name || "User",
    userEmail: req.user?.email || null,
    documentTitle,
    documentType,
    downloadUrl: resolvedDownloadUrl,
    emailSubject: "Your AI-Generated Document Is Ready",
    emailHtml: buildDocumentReadyEmailHtml({
      userName: req.user?.name || "User",
      documentTitle,
      documentType,
      downloadUrl: resolvedDownloadUrl
    }),
    generatedAt: new Date().toISOString()
  };

  // The payload gives Zapier the user identity, document label/type, final
  // download URL, and generation timestamp needed to compose the Gmail message.
  // Missing email or URL means the email automation cannot safely run, so the
  // webhook is skipped without changing the API response.
  if (
    process.env.ZAPIER_WEBHOOK_URL &&
    payload.userEmail &&
    payload.downloadUrl
  ) {
    try {
      await axios.post(
        process.env.ZAPIER_WEBHOOK_URL,
        payload
      );

      console.log(
        "[ZAPIER] Email webhook triggered successfully"
      );
    } catch (error) {
      // Zapier email delivery is a side effect, not part of document generation.
      // Failures are logged only so users still receive the original successful
      // generation response even if Zapier is unavailable or rejects the request.
      console.error(
        "[ZAPIER] Webhook failed:",
        error.message
      );
    }
  }
}

async function safelyTriggerZapierDocumentEmail(req, result, documentType, downloadUrl) {
  try {
    await triggerZapierDocumentEmail(req, result, documentType, downloadUrl);
  } catch (error) {
    // This outer guard is intentionally redundant with the webhook try/catch.
    // It guarantees future edits to the Zapier helper cannot turn a successful
    // document generation into a failed API response.
    console.error(
      "[ZAPIER] Webhook failed:",
      error.message
    );
  }
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
        topic: z.string().trim().min(2),
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
      const aiDownloadUrl = getAiDownloadUrl(result);
      if (typeof aiDownloadUrl !== "string" || !aiDownloadUrl) {
        throw new ApiError(502, "AI service did not return a download URL");
      }

      const directUrl = normalizeAiDownloadUrl(aiDownloadUrl);
      if (!directUrl) {
        throw new ApiError(502, "AI service returned an invalid download URL");
      }

      // Fetch file buffer from AI service
      let fileBuffer = null;
      if (persistenceEnabled) {
        try {
          console.log(`[GENERATOR] Fetching generated DOCX from: ${directUrl}`);
          const fileResponse = await axios.get(directUrl, {
            responseType: "arraybuffer",
            headers: { "x-internal-service-token": env.aiServiceToken }
          });
          fileBuffer = Buffer.from(fileResponse.data);
        } catch (fetchError) {
          console.error(`[GENERATOR] Failed to fetch generated DOCX from AI service: ${fetchError.message}`);
          throw new ApiError(502, "Failed to retrieve generated document from AI service", fetchError.message);
        }
      }

      doc.aiServiceUrl = aiDownloadUrl;
      if (fileBuffer) {
        doc.fileData = fileBuffer;
      }
      doc.status = "ready";
      await doc.save();

      const authHeader = req.headers.authorization || "";
      const jwtToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      const backendDownloadUrl = `${env.apiBaseUrl.replace(/\/+$/, '')}/api/generator/download/${doc._id}${jwtToken ? `?token=${jwtToken}` : ""}`;

      console.log(`[GENERATOR] Assignment ready. Download URL: ${backendDownloadUrl}`);
      await safelyTriggerZapierDocumentEmail(req, result, "Assignment", backendDownloadUrl);
      res.status(201).json({
        success: true,
        document: doc,
        url: backendDownloadUrl,
        downloadUrl: backendDownloadUrl,
        sectionsCount: result.sections_count || 0
      });
    } catch (error) {
      const generationError = createGenerationError(error, "AI document generation failed");
      console.error("[GENERATOR] Assignment generation failed:", generationError.details || generationError.message);
      doc.status = "failed";
      doc.error = `${generationError.message}${generationError.details ? ' Details: ' + JSON.stringify(generationError.details) : ''}`;
      await doc.save();
      throw generationError;
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
    
    if (doc.fileData) {
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      const filename = doc.documentName ? (doc.documentName.endsWith(".docx") ? doc.documentName : `${doc.documentName}.docx`) : "document.docx";
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.send(doc.fileData);
    }

    // Normalize the URL before redirecting, in case it's a relative path to the AI service (fallback for older records)
    const directUrl = normalizeAiDownloadUrl(doc.aiServiceUrl);
    if (!directUrl) {
      throw new ApiError(404, "Download link not found");
    }
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
        topic: z.string().trim().min(2),
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
      const aiDownloadUrl = getAiDownloadUrl(result);
      if (typeof aiDownloadUrl !== "string" || !aiDownloadUrl) {
        throw new ApiError(502, "AI service did not return a download URL");
      }

      const directUrl = normalizeAiDownloadUrl(aiDownloadUrl);
      if (!directUrl) {
        throw new ApiError(502, "AI service returned an invalid download URL");
      }

      // Fetch file buffer from AI service
      let fileBuffer = null;
      if (persistenceEnabled) {
        try {
          console.log(`[GENERATOR] Fetching generated DOCX from: ${directUrl}`);
          const fileResponse = await axios.get(directUrl, {
            responseType: "arraybuffer",
            headers: { "x-internal-service-token": env.aiServiceToken }
          });
          fileBuffer = Buffer.from(fileResponse.data);
        } catch (fetchError) {
          console.error(`[GENERATOR] Failed to fetch generated DOCX from AI service: ${fetchError.message}`);
          throw new ApiError(502, "Failed to retrieve generated document from AI service", fetchError.message);
        }
      }

      doc.aiServiceUrl = aiDownloadUrl;
      if (fileBuffer) {
        doc.fileData = fileBuffer;
      }
      doc.status = "ready";
      await doc.save();

      const authHeader = req.headers.authorization || "";
      const jwtToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      const backendDownloadUrl = `${env.apiBaseUrl.replace(/\/+$/, '')}/api/generator/download/${doc._id}${jwtToken ? `?token=${jwtToken}` : ""}`;

      console.log(`[GENERATOR] Free writing ready. Download URL: ${backendDownloadUrl}`);
      await safelyTriggerZapierDocumentEmail(req, result, "Free Writing", backendDownloadUrl);
      res.status(201).json({
        success: true,
        document: doc,
        url: backendDownloadUrl,
        downloadUrl: backendDownloadUrl,
        sectionsCount: result.sections_count || 0
      });
    } catch (error) {
      const generationError = createGenerationError(error, "AI free writing generation failed");
      console.error("[GENERATOR] Free writing generation failed:", generationError.details || generationError.message);
      doc.status = "failed";
      doc.error = `${generationError.message}${generationError.details ? ' Details: ' + JSON.stringify(generationError.details) : ''}`;
      await doc.save();
      throw generationError;
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
        topic: z.string().trim().min(2),
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
      const aiDownloadUrl = getAiDownloadUrl(result);
      if (typeof aiDownloadUrl !== "string" || !aiDownloadUrl) {
        throw new ApiError(502, "AI service did not return a download URL");
      }

      const directUrl = normalizeAiDownloadUrl(aiDownloadUrl);
      if (!directUrl) {
        throw new ApiError(502, "AI service returned an invalid download URL");
      }

      // Fetch file buffer from AI service
      let fileBuffer = null;
      if (persistenceEnabled) {
        try {
          console.log(`[GENERATOR] Fetching generated DOCX from: ${directUrl}`);
          const fileResponse = await axios.get(directUrl, {
            responseType: "arraybuffer",
            headers: { "x-internal-service-token": env.aiServiceToken }
          });
          fileBuffer = Buffer.from(fileResponse.data);
        } catch (fetchError) {
          console.error(`[GENERATOR] Failed to fetch generated DOCX from AI service: ${fetchError.message}`);
          throw new ApiError(502, "Failed to retrieve generated document from AI service", fetchError.message);
        }
      }

      doc.aiServiceUrl = aiDownloadUrl;
      if (fileBuffer) {
        doc.fileData = fileBuffer;
      }
      doc.status = "ready";
      await doc.save();

      const authHeader = req.headers.authorization || "";
      const jwtToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      const backendDownloadUrl = `${env.apiBaseUrl.replace(/\/+$/, '')}/api/generator/download/${doc._id}${jwtToken ? `?token=${jwtToken}` : ""}`;

      console.log(`[GENERATOR] Literature survey ready. Download URL: ${backendDownloadUrl}`);
      await safelyTriggerZapierDocumentEmail(req, result, "Literature Survey", backendDownloadUrl);
      res.status(201).json({
        success: true,
        document: doc,
        url: backendDownloadUrl,
        downloadUrl: backendDownloadUrl,
        sectionsCount: result.sections_count || 0
      });
    } catch (error) {
      const generationError = createGenerationError(error, "AI literature survey generation failed");
      console.error("[GENERATOR] Literature survey generation failed:", generationError.details || generationError.message);
      doc.status = "failed";
      doc.error = `${generationError.message}${generationError.details ? ' Details: ' + JSON.stringify(generationError.details) : ''}`;
      await doc.save();
      throw generationError;
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
