# File Upload Configuration Guide

Complete guide for implementing the file upload system used in this project.

---

## 📋 Architecture Overview

This project uses a **hybrid upload system**:
- **Backend (Serverless/Vercel)**: Receives files using Multer (memory storage), forwards to Ubuntu server
- **Ubuntu Server**: Dedicated file storage server with Node.js upload service
- **Nginx**: Serves uploaded files via HTTP

**Why this architecture?**
- Serverless environments (Vercel) have limited file system access
- Files are stored in memory and forwarded to a dedicated server
- Ubuntu server handles permanent file storage and serving

---

## 🛠️ Dependencies Required

```json
{
  "dependencies": {
    "multer": "^1.4.5-lts.1",
    "form-data": "^4.0.4",
    "axios": "^1.12.2"
  },
  "devDependencies": {
    "@types/multer": "^1.4.12"
  }
}
```

Install with:
```bash
npm install multer form-data axios
npm install --save-dev @types/multer
```

---

## 📁 File Structure

```
src/
├── middleware/
│   └── imageUpload.ts          # Multer configuration
├── services/
│   └── media/
│       ├── RemoteUploadService.ts  # Forwards files to Ubuntu server
│       └── MediaStorageService.ts  # Local file handling (if needed)
├── controllers/
│   └── media/
│       └── MediaController.ts      # Upload endpoints
└── routes/
    └── media.ts                    # Media routes
```

---

## 🔧 Step 1: Create Image Upload Middleware

**File:** `src/middleware/imageUpload.ts`

```typescript
// @ts-nocheck
import multer from "multer";
import { logger } from "../utils/logger";

// Configuration constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg", 
  "image/jpg", 
  "image/png", 
  "image/webp", 
  "image/gif"
];

// Use memory storage for serverless environments
// Files are stored in memory and forwarded to remote server
const storage = multer.memoryStorage();

// File filter - only allow image types
const fileFilter = (
  req: any, 
  file: Express.Multer.File, 
  cb: multer.FileFilterCallback
) => {
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

// Get public URL for uploaded file
export const getFileUrl = (filename: string, type: string = "temp"): string => {
  const baseUrl = "http://31.220.82.129"; // Your Ubuntu server IP
  return `${baseUrl}/uploads/${type}/${filename}`;
};
```

**Key Points:**
- Uses `memoryStorage()` - files stored in RAM (required for serverless)
- Validates file types (images only)
- Limits file size to 10MB
- Supports single, multiple, and field-based uploads

---

## 🔧 Step 2: Create Remote Upload Service

**File:** `src/services/media/RemoteUploadService.ts`

```typescript
// @ts-nocheck
import axios from "axios";
import FormData from "form-data";
import { logger } from "../../utils/logger";

// Configuration - Replace with your server IP
const UPLOAD_SERVICE_URL = "http://31.220.82.129:3050/upload";
const MEDIA_BASE_URL = "http://31.220.82.129/uploads";

export interface RemoteUploadResult {
  success: boolean;
  files?: Array<{
    url: string;
    filename: string;
    originalname: string;
    size: number;
    mimetype: string;
  }>;
  error?: string;
}

export class RemoteUploadService {
  /**
   * Upload files to Ubuntu server
   * @param files - Multer file(s) from memory storage
   * @param type - Upload type: "returns", "pre-shipment", "products", "temp"
   */
  async uploadFiles(
    files: Express.Multer.File[] | Express.Multer.File,
    type: "returns" | "pre-shipment" | "products" | "temp" = "temp"
  ): Promise<RemoteUploadResult> {
    try {
      const fileArray = Array.isArray(files) ? files : [files];

      if (fileArray.length === 0) {
        return {
          success: false,
          error: "No files to upload",
        };
      }

      // Create FormData for multipart/form-data request
      const formData = new FormData();
      
      // Add all files to form data
      for (const file of fileArray) {
        // Files from memory storage have buffer property
        if (file.buffer) {
          formData.append("images", file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
          });
        } else {
          throw new Error(`File ${file.originalname} has no buffer`);
        }
      }
      
      // Add upload type
      formData.append("type", type);

      // Upload to Ubuntu server
      const response = await axios.post(UPLOAD_SERVICE_URL, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000, // 30 second timeout
      });

      if (response.data.success && response.data.files) {
        logger.info(`Uploaded ${response.data.files.length} file(s) to remote server`);
        return {
          success: true,
          files: response.data.files,
        };
      } else {
        return {
          success: false,
          error: response.data.message || "Upload failed",
        };
      }
    } catch (error: any) {
      logger.error("Error uploading files to remote server:", error);
      return {
        success: false,
        error: error.message || "Failed to upload files to remote server",
      };
    }
  }

  /**
   * Get media base URL
   */
  getMediaBaseUrl(): string {
    return MEDIA_BASE_URL;
  }
}

export const remoteUploadService = new RemoteUploadService();
```

**Key Points:**
- Converts memory buffers to FormData
- Forwards files to Ubuntu server via HTTP POST
- Returns file URLs for database storage
- Handles errors gracefully

---

## 🔧 Step 3: Create Media Controller

**File:** `src/controllers/media/MediaController.ts`

```typescript
// @ts-nocheck
import { Request, Response } from "express";
import { uploadMultipleImages, uploadSingleImage } from "../../middleware/imageUpload";
import { remoteUploadService } from "../../services/media/RemoteUploadService";
import { logger } from "../../utils/logger";

export class MediaController {
  /**
   * Upload multiple images
   * POST /api/media/upload
   */
  async uploadImages(req: Request, res: Response): Promise<void> {
    // Use multer middleware
    uploadMultipleImages(req, res, async (err: any) => {
      if (err) {
        logger.error("Image upload error:", err);
        res.status(400).json({
          success: false,
          message: err.message || "Failed to upload images",
        });
        return;
      }

      try {
        // Determine upload type from request body or path
        let uploadType: "returns" | "pre-shipment" | "products" | "temp" = 
          (req.body.type as any) || "temp";
        
        // Or determine from path
        if (req.path?.includes("return")) {
          uploadType = "returns";
        } else if (req.path?.includes("pre-shipment") || req.path?.includes("evidence")) {
          uploadType = "pre-shipment";
        } else if (req.path?.includes("product")) {
          uploadType = "products";
        }

        // Upload to Ubuntu server
        const result = await remoteUploadService.uploadFiles(
          req.files as Express.Multer.File[], 
          uploadType
        );

        if (result.success && result.files) {
          res.status(200).json({
            success: true,
            message: `Successfully uploaded ${result.files.length} image(s)`,
            data: {
              files: result.files,
            },
          });
        } else {
          res.status(400).json({
            success: false,
            message: result.error || "Failed to upload files",
          });
        }
      } catch (error: any) {
        logger.error("Error processing uploaded images:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });
  }

  /**
   * Upload single image
   * POST /api/media/upload/single
   */
  async uploadSingleImage(req: Request, res: Response): Promise<void> {
    const { uploadSingleImage } = await import("../../middleware/imageUpload");
    
    uploadSingleImage(req, res, async (err: any) => {
      if (err) {
        logger.error("Single image upload error:", err);
        res.status(400).json({
          success: false,
          message: err.message || "Failed to upload image",
        });
        return;
      }

      try {
        // Determine upload type
        let uploadType: "returns" | "pre-shipment" | "products" | "temp" = 
          (req.body.type as any) || "temp";

        // Upload to Ubuntu server
        const result = await remoteUploadService.uploadFiles(
          req.file as Express.Multer.File, 
          uploadType
        );

        if (result.success && result.files && result.files.length > 0) {
          const file = result.files[0];
          res.status(200).json({
            success: true,
            message: "Image uploaded successfully",
            data: file,
          });
        } else {
          res.status(400).json({
            success: false,
            message: result.error || "No file uploaded",
          });
        }
      } catch (error: any) {
        logger.error("Error processing uploaded image:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });
  }
}

export const mediaController = new MediaController();
```

---

## 🔧 Step 4: Create Routes

**File:** `src/routes/media.ts`

```typescript
// @ts-nocheck
import express from "express";
import { mediaController } from "../controllers/media/MediaController";

const router = express.Router();

// POST /api/media/upload - Upload multiple images
router.post("/upload", mediaController.uploadImages.bind(mediaController));

// POST /api/media/upload/single - Upload single image
router.post("/upload/single", mediaController.uploadSingleImage.bind(mediaController));

export default router;
```

**Register in main app:**
```typescript
// In src/app.ts
import mediaRoutes from "./routes/media";
app.use("/api/media", mediaRoutes);
```

---

## 🖥️ Step 5: Ubuntu Server Upload Service

**File:** `server-upload-service.js` (runs on Ubuntu server)

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const UPLOAD_DIR = '/var/www/simbi/uploads';
const subdirs = ['returns', 'pre-shipment', 'products', 'temp'];

// Create directories
subdirs.forEach(subdir => {
  const dir = path.join(UPLOAD_DIR, subdir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Configure storage - disk storage on Ubuntu server
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Always save to temp first, then move based on type
    const uploadPath = path.join(UPLOAD_DIR, 'temp');
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${name}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowed.join(', ')}`));
    }
  }
});

// Upload endpoint
app.post('/upload', upload.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'No files uploaded' 
    });
  }

  const targetType = req.body.type || 'temp';
  const targetDir = path.join(UPLOAD_DIR, targetType);
  
  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const files = req.files.map((file) => {
    // Move file from temp to target directory
    const targetPath = path.join(targetDir, file.filename);
    
    try {
      fs.renameSync(file.path, targetPath);
      
      return {
        url: `http://31.220.82.129/uploads/${targetType}/${file.filename}`,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      };
    } catch (error) {
      return {
        url: `http://31.220.82.129/uploads/temp/${file.filename}`,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        error: `Failed to move to ${targetType} directory`
      };
    }
  });

  res.json({ success: true, files });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('ERROR:', error.message);
  res.status(500).json({ 
    success: false, 
    message: error.message || 'Internal server error' 
  });
});

const PORT = 3050;
app.listen(PORT, () => {
  console.log(`🚀 Upload service running on port ${PORT}`);
  console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
});
```

**Run on Ubuntu server:**
```bash
# Install dependencies
npm install express multer cors

# Run with PM2
pm2 start server-upload-service.js --name simbi-upload
pm2 save
```

---

## 📝 Usage Examples

### Example 1: Upload Multiple Images

**Endpoint:** `POST /api/media/upload`

**Request:**
```javascript
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);
formData.append('type', 'returns'); // Optional: returns, pre-shipment, products, temp

fetch('/api/media/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully uploaded 2 image(s)",
  "data": {
    "files": [
      {
        "url": "http://31.220.82.129/uploads/returns/image-1234567890.jpg",
        "filename": "image-1234567890.jpg",
        "originalname": "photo.jpg",
        "size": 245678,
        "mimetype": "image/jpeg"
      }
    ]
  }
}
```

### Example 2: Upload Single Image

**Endpoint:** `POST /api/media/upload/single`

**Request:**
```javascript
const formData = new FormData();
formData.append('image', file);
formData.append('type', 'products');

fetch('/api/media/upload/single', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "http://31.220.82.129/uploads/products/image-1234567890.jpg",
    "filename": "image-1234567890.jpg",
    "originalname": "product.jpg",
    "size": 245678,
    "mimetype": "image/jpeg"
  }
}
```

### Example 3: Use in Controller with Other Data

```typescript
async createReturn(req: AuthenticatedRequest, res: Response): Promise<void> {
  uploadMultipleImages(req, res, async (err: any) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    try {
      // Upload images to server
      const uploadResult = await remoteUploadService.uploadFiles(
        req.files as Express.Multer.File[],
        "returns"
      );

      if (!uploadResult.success || !uploadResult.files) {
        return res.status(400).json({
          success: false,
          message: "Failed to upload images"
        });
      }

      // Get image URLs
      const imageUrls = uploadResult.files.map(f => f.url);

      // Create return request with image URLs
      const returnRequest = await prisma.returnRequest.create({
        data: {
          orderId: req.body.orderId,
          reason: req.body.reason,
          evidenceUrls: imageUrls, // Store URLs in database
          // ... other fields
        }
      });

      res.status(201).json({
        success: true,
        data: returnRequest
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
}
```

---

## ⚙️ Configuration Constants

Update these values in your code:

```typescript
// In src/middleware/imageUpload.ts
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB - adjust as needed
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

// In src/services/media/RemoteUploadService.ts
const UPLOAD_SERVICE_URL = "http://YOUR_SERVER_IP:3050/upload";
const MEDIA_BASE_URL = "http://YOUR_SERVER_IP/uploads";

// In server-upload-service.js (Ubuntu server)
const UPLOAD_DIR = '/var/www/simbi/uploads';
const PORT = 3050;
```

---

## 🔒 Security Considerations

1. **File Type Validation**: Only allow specific image MIME types
2. **File Size Limits**: Enforce 10MB maximum
3. **Filename Sanitization**: Remove special characters from filenames
4. **Unique Filenames**: Use timestamp + random number to prevent conflicts
5. **Directory Permissions**: Set appropriate file permissions on Ubuntu server
6. **CORS**: Configure CORS on upload service if needed
7. **Authentication**: Protect upload endpoints with authentication middleware

---

## 📊 Upload Types

The system supports organizing uploads by type:

- **`returns`**: Return request evidence images
- **`pre-shipment`**: Pre-shipment inspection photos
- **`products`**: Product images
- **`temp`**: Temporary files (default)

Files are organized in separate directories on the Ubuntu server.

---

## 🐛 Common Issues & Solutions

### Issue: "No files uploaded"
**Solution:** Ensure form field name matches middleware:
- Multiple files: field name must be `images`
- Single file: field name must be `image`

### Issue: "Invalid file type"
**Solution:** Check file MIME type is in allowed list. Some browsers may send incorrect MIME types.

### Issue: "File too large"
**Solution:** Increase `MAX_FILE_SIZE` or reduce file size on client side.

### Issue: Upload timeout
**Solution:** Increase timeout in `RemoteUploadService.ts` (currently 30 seconds).

### Issue: Files not accessible via URL
**Solution:** 
1. Check Nginx is running and configured correctly
2. Verify file exists in correct directory
3. Check file permissions: `chmod 644 /var/www/simbi/uploads/*/*`

---

## ✅ Implementation Checklist

- [ ] Install dependencies (`multer`, `form-data`, `axios`)
- [ ] Create `src/middleware/imageUpload.ts`
- [ ] Create `src/services/media/RemoteUploadService.ts`
- [ ] Create `src/controllers/media/MediaController.ts`
- [ ] Create `src/routes/media.ts`
- [ ] Register routes in main app
- [ ] Set up Ubuntu server upload service
- [ ] Configure Nginx to serve files
- [ ] Update server IP addresses in code
- [ ] Test upload endpoints
- [ ] Verify files are accessible via HTTP URLs

---

## 📚 Quick Reference

**Backend Endpoints:**
- `POST /api/media/upload` - Upload multiple images
- `POST /api/media/upload/single` - Upload single image

**Ubuntu Server Endpoints:**
- `POST http://YOUR_SERVER_IP:3050/upload` - Upload endpoint
- `GET http://YOUR_SERVER_IP:3050/health` - Health check

**File URLs:**
- Format: `http://YOUR_SERVER_IP/uploads/{type}/{filename}`
- Example: `http://31.220.82.129/uploads/returns/image-1234567890.jpg`

**Form Field Names:**
- Multiple: `images` (array)
- Single: `image` (single file)

---

This guide provides everything needed to implement the file upload system used in this project.







