// @ts-nocheck
import multer from "multer";
import path from "path";
import fs from "fs";

// Check if we're in a serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production';

// Configure multer storage based on environment
const storage = isServerless 
  ? multer.memoryStorage() // Use memory storage for serverless
  : (() => {
      // Create uploads directory if it doesn't exist (only for non-serverless)
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      return multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, uploadsDir);
        },
        filename: (req, file, cb) => {
          // Generate unique filename: timestamp-originalname
          const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          const nameWithoutExt = path.basename(file.originalname, ext);
          cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
        },
      });
    })();

// File filter - only allow CSV files
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype === "text/csv" || file.originalname.toLowerCase().endsWith(".csv")) {
    cb(null, true);
  } else {
    cb(new Error("Only CSV files are allowed"), false);
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});



