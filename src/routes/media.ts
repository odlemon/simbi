// @ts-nocheck
import express from "express";
import { mediaController } from "../controllers/media/MediaController";

const router = express.Router();

// POST /api/media/upload - Upload multiple images
router.post("/upload", mediaController.uploadImages.bind(mediaController));

// POST /api/media/upload/single - Upload single image
router.post("/upload/single", mediaController.uploadSingleImage.bind(mediaController));

export default router;











