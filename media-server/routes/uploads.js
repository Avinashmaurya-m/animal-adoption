import { Router } from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { upload } from "../middleware/upload.js";
import { safeImageName, uploadsDir } from "../utils/paths.js";

const router = Router();
const publicBase = () => (process.env.PUBLIC_BASE_URL || "http://localhost:5501").replace(/\/$/, "");

router.post("/upload", upload, async (request, response, next) => {
  try {
    if (!request.file) return response.status(400).json({ error: "Choose a JPG, PNG, or WebP image." });
    const filename = crypto.randomUUID() + ".webp";
    await sharp(request.file.buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(uploadsDir, filename));
    response.status(201).json({ filename, url: publicBase() + "/uploads/" + filename });
  } catch (error) {
    next(error);
  }
});

router.delete("/delete/:filename", async (request, response, next) => {
  try {
    const { filename } = request.params;
    if (!safeImageName(filename)) return response.status(400).json({ error: "Invalid image name." });
    await fs.unlink(path.join(uploadsDir, filename));
    response.status(204).end();
  } catch (error) {
    if (error.code === "ENOENT") return response.status(404).json({ error: "Image not found." });
    next(error);
  }
});

export default router;
