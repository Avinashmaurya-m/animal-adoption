import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import uploadRoutes from "./routes/uploads.js";
import { uploadError } from "./middleware/upload.js";
import { uploadsDir } from "./utils/paths.js";

const port = Number(process.env.PORT || 5501);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:5500";
await fs.mkdir(uploadsDir, { recursive: true });

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: allowedOrigin, methods: ["GET", "POST", "DELETE"] }));
app.use("/uploads", express.static(uploadsDir, { maxAge: "7d", etag: true }));
app.get("/health", (_request, response) => response.json({ ok: true, service: "petcircle-media" }));
app.use("/api", uploadRoutes);
app.use(uploadError);
app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Image processing failed." });
});
app.listen(port, () => console.log("PetCircle media API listening on port " + port));
