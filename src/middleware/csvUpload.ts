// @ts-nocheck
import multer from "multer";

// Memory storage (serverless-safe): BulkUploadController supports file.buffer parsing
const storage = multer.memoryStorage();

export const csvUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ok =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" || // common for .csv
      file.originalname.toLowerCase().endsWith(".csv");
    if (!ok) {
      cb(new Error("Invalid file type. Please upload a CSV file.") as any, false);
      return;
    }
    cb(null, true);
  },
});

