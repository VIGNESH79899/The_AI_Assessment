import express from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

export const uploadRouter = express.Router();

uploadRouter.post("/uploads", requireAuth, upload.single("file"), (req, res) => {
  res.status(201).json({
    file: {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    }
  });
});
