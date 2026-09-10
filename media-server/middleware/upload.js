import multer from "multer";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = Number(process.env.MAX_FILE_SIZE_MB || 5) * 1024 * 1024;
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes, files: 1 },
  fileFilter: (_request, file, done) => {
    done(null, allowedTypes.has(file.mimetype));
  }
}).single("image");

export function uploadError(error, _request, response, next) {
  if (!error) return next();
  if (error.code === "LIMIT_FILE_SIZE") return response.status(413).json({ error: "Image must be 5 MB or smaller." });
  response.status(400).json({ error: "Upload only a JPG, PNG, or WebP image." });
}
