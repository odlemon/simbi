// @ts-nocheck
import multer from "multer";

const storage = multer.memoryStorage();

export const pdfUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Invalid file type. Only application/pdf is allowed.") as any, false);
      return;
    }
    cb(null, true);
  },
});

