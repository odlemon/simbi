// @ts-nocheck
import multer from "multer";
import { logger } from "../utils/logger";

// Hardcoded configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

// Use memory storage for Vercel (serverless) - files are forwarded to Ubuntu server
// Files are stored in memory and then uploaded to http://31.220.82.129:3050/upload
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`
      ) as any,
      false
    );
  }
};

// Create multer instance
export const imageUpload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // Allow up to 10 files per request
  },
  fileFilter: fileFilter,
});

// Single image upload middleware
export const uploadSingleImage = imageUpload.single("image");

// Multiple images upload middleware
export const uploadMultipleImages = imageUpload.array("images", 10);

// Fields upload middleware (for multiple named fields)
export const uploadImageFields = imageUpload.fields([
  { name: "images", maxCount: 10 },
  { name: "evidence", maxCount: 10 },
]);

// Get public URL for uploaded file (files are on Ubuntu server)
export const getFileUrl = (filename: string, type: string = "temp"): string => {
  const baseUrl = "http://31.220.82.129";
  return `${baseUrl}/uploads/${type}/${filename}`;
};

