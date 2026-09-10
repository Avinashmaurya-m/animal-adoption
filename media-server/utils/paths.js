import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const uploadsDir = path.join(root, "uploads");
export const safeImageName = name => /^[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i.test(name);
