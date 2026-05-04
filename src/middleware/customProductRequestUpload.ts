// @ts-nocheck
import multer from "multer";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_BYTES = 15 * 1024 * 1024;
const ALLOWED_IMAGES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.fieldname === "images") {
    if (!ALLOWED_IMAGES.includes(file.mimetype)) {
      return cb(
        new Error(`Field "images" must be image/jpeg, image/png, image/webp, or image/gif. Got: ${file.mimetype}`) as any,
        false
      );
    }
    return cb(null, true);
  }
  if (file.fieldname === "specSheet" || file.fieldname === "supplierDocs") {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error(`Fields "specSheet" and "supplierDocs" must be application/pdf. Got: ${file.mimetype}`) as any, false);
    }
    return cb(null, true);
  }
  return cb(new Error(`Unexpected file field: ${file.fieldname}`) as any, false);
};

const limits = { fileSize: Math.max(MAX_IMAGE_BYTES, MAX_PDF_BYTES) };

export const customProductRequestUpload = multer({
  storage,
  limits,
  fileFilter,
});

/**
 * images: 3–10, specSheet: 1, supplierDocs: 1–10 (PDFs for counterfeit check)
 */
export const uploadCustomProductRequestFiles = customProductRequestUpload.fields([
  { name: "images", maxCount: 10 },
  { name: "specSheet", maxCount: 1 },
  { name: "supplierDocs", maxCount: 10 },
]);
