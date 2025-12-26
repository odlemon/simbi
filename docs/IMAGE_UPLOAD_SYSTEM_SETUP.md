# Image Upload System Setup Guide

Complete guide for setting up a remote image upload system using Ubuntu server for file storage and Vercel/serverless backend for API.

---

## 📋 Overview

This system allows you to:
- Upload images from your backend (Vercel/serverless) to a remote Ubuntu server
- Serve images via HTTP through Nginx
- Organize uploads by type (returns, pre-shipment, products, temp)
- Handle file validation and error handling

**Architecture:**
- **Backend (Vercel)**: Receives uploads, forwards to Ubuntu server
- **Ubuntu Server**: Stores files and serves them via Nginx
- **Upload Service**: Node.js service on Ubuntu that handles file uploads

---

## 🖥️ Part 1: Ubuntu Server Setup

### Step 1: Connect to Server

```bash
ssh root@YOUR_SERVER_IP
# Enter password when prompted
```

### Step 2: Create Upload Directories

```bash
# Create main upload directory
mkdir -p /var/www/simbi/uploads

# Create subdirectories
mkdir -p /var/www/simbi/uploads/returns
mkdir -p /var/www/simbi/uploads/pre-shipment
mkdir -p /var/www/simbi/uploads/products
mkdir -p /var/www/simbi/uploads/temp

# Set permissions
chmod -R 755 /var/www/simbi/uploads
chown -R www-data:www-data /var/www/simbi/uploads
```

### Step 3: Install Node.js (if not installed)

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 4: Create Upload Service Directory

```bash
# Create service directory
mkdir -p /opt/simbi-upload-service
cd /opt/simbi-upload-service

# Initialize npm
npm init -y

# Install dependencies
npm install express multer cors
```

### Step 5: Create Upload Service File

Create `/opt/simbi-upload-service/server.js`:

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('  Body:', JSON.stringify(req.body));
  }
  next();
});

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

// Configure storage - use temp directory first, then move based on type
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Always save to temp first, we'll move it later based on type
    const uploadPath = path.join(UPLOAD_DIR, 'temp');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log(`Created upload directory: ${uploadPath}`);
    }
    
    console.log(`Saving file to temp: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${name}-${uniqueSuffix}${ext}`;
    console.log(`Generated filename: ${filename}`);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      console.log(`File type allowed: ${file.mimetype}`);
      cb(null, true);
    } else {
      console.log(`File type rejected: ${file.mimetype}`);
      cb(new Error(`Invalid file type. Allowed: ${allowed.join(', ')}`));
    }
  }
});

// Upload endpoint
app.post('/upload', upload.array('images', 10), (req, res) => {
  console.log('\n=== UPLOAD REQUEST RECEIVED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Files count:', req.files?.length || 0);
  console.log('Type:', req.body.type || 'temp');
  console.log('Body keys:', Object.keys(req.body));

  if (!req.files || req.files.length === 0) {
    console.log('ERROR: No files in request');
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
    console.log(`Created target directory: ${targetDir}`);
  }

  console.log('\nProcessing files:');
  const files = req.files.map((file, index) => {
    console.log(`  ${index + 1}. ${file.originalname}`);
    console.log(`     Saved as: ${file.filename}`);
    console.log(`     Original path: ${file.path}`);
    
    // Move file from temp to target directory
    const targetPath = path.join(targetDir, file.filename);
    
    try {
      // Move file to correct directory
      fs.renameSync(file.path, targetPath);
      console.log(`     ✅ Moved to: ${targetPath}`);
      
      // Verify file exists in new location
      if (fs.existsSync(targetPath)) {
        const stats = fs.statSync(targetPath);
        console.log(`     ✅ File exists in target directory`);
        console.log(`     Size: ${stats.size} bytes`);
        console.log(`     MIME: ${file.mimetype}`);
      } else {
        console.log(`     ❌ File NOT found in target directory!`);
      }
    } catch (error) {
      console.log(`     ❌ Error moving file: ${error.message}`);
      // If move fails, file is still in temp, use that path
      return {
        url: `http://YOUR_SERVER_IP/uploads/temp/${file.filename}`,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        error: `Failed to move to ${targetType} directory`
      };
    }

    return {
      url: `http://YOUR_SERVER_IP/uploads/${targetType}/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    };
  });

  console.log(`\n✅ Upload successful: ${files.length} file(s) processed`);
  console.log(`📁 Files saved to: ${targetDir}`);
  console.log('=== END UPLOAD REQUEST ===\n');

  res.json({ success: true, files });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('ERROR:', error.message);
  console.error('Stack:', error.stack);
  res.status(500).json({ 
    success: false, 
    message: error.message || 'Internal server error' 
  });
});

const PORT = 3050; // Change this to your desired port
app.listen(PORT, () => {
  console.log(`\n🚀 Upload service running on port ${PORT}`);
  console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📤 Upload endpoint: http://localhost:${PORT}/upload\n`);
});
```

**Important:** Replace `YOUR_SERVER_IP` with your actual server IP address (e.g., `31.220.82.129`).

### Step 6: Install PM2 (Process Manager)

```bash
npm install -g pm2

# Start the upload service
cd /opt/simbi-upload-service
pm2 start server.js --name simbi-upload

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it provides
```

### Step 7: Configure Firewall

```bash
# Allow upload service port (3050)
ufw allow 3050/tcp

# Allow HTTP port (80) for Nginx
ufw allow 80/tcp

# Reload firewall
ufw reload

# Verify
ufw status
```

### Step 8: Install and Configure Nginx

```bash
# Install Nginx
apt update
apt install nginx -y

# Create Nginx configuration
nano /etc/nginx/sites-available/simbi-media
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;  # Replace with your server IP or domain

    # Serve uploaded images
    location /uploads {
        alias /var/www/simbi/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
        
        # Allow CORS if needed
        add_header Access-Control-Allow-Origin *;
    }
}
```

Enable the site:

```bash
# Create symlink
ln -s /etc/nginx/sites-available/simbi-media /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx

# Check status
systemctl status nginx
```

### Step 9: Verify Setup

```bash
# Check upload service is running
pm2 list
pm2 logs simbi-upload --lines 20

# Test health endpoint
curl http://localhost:3050/health

# Check if directories exist
ls -la /var/www/simbi/uploads/

# Test Nginx is serving files
curl http://localhost/uploads/
```

---

## 💻 Part 2: Backend Code Setup (Vercel/Serverless)

### Step 1: Install Dependencies

```bash
npm install multer form-data axios
npm install --save-dev @types/multer
```

### Step 2: Create Image Upload Middleware

Create `src/middleware/imageUpload.ts`:

```typescript
// @ts-nocheck
import multer from "multer";
import { logger } from "../utils/logger";

// Hardcoded configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

// Use memory storage for Vercel (serverless) - files are forwarded to Ubuntu server
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
```

### Step 3: Create Remote Upload Service

Create `src/services/media/RemoteUploadService.ts`:

```typescript
// @ts-nocheck
import axios from "axios";
import FormData from "form-data";
import { logger } from "../../utils/logger";

// Hardcoded Ubuntu server upload endpoint
const UPLOAD_SERVICE_URL = "http://YOUR_SERVER_IP:3050/upload"; // Replace with your server IP
const MEDIA_BASE_URL = "http://YOUR_SERVER_IP/uploads"; // Replace with your server IP

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

      // Create form data
      const formData = new FormData();
      
      for (const file of fileArray) {
        // Use buffer (memory storage) - files are in memory on Vercel
        if (file.buffer) {
          formData.append("images", file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
          });
        } else {
          // Fallback: if file has path, read from disk (shouldn't happen on Vercel)
          const fs = await import("fs");
          if (file.path && fs.existsSync(file.path)) {
            formData.append("images", fs.createReadStream(file.path), {
              filename: file.originalname,
              contentType: file.mimetype,
            });
          } else {
            throw new Error(`File ${file.originalname} has no buffer or valid path`);
          }
        }
      }
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

**Important:** Replace `YOUR_SERVER_IP` with your actual server IP address in both places.

### Step 4: Use in Controllers

Example controller usage:

```typescript
import { uploadMultipleImages } from "../../middleware/imageUpload";
import { remoteUploadService } from "../../services/media/RemoteUploadService";

// In your controller method
async uploadFiles(req: AuthenticatedRequest, res: Response): Promise<void> {
  uploadMultipleImages(req, res, async (err: any) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to upload images",
      });
    }

    try {
      // Upload to Ubuntu server
      const result = await remoteUploadService.uploadFiles(req.files, "returns");

      if (result.success && result.files) {
        res.status(200).json({
          success: true,
          message: `Successfully uploaded ${result.files.length} image(s)`,
          data: { files: result.files },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || "Failed to upload files",
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  });
}
```

---

## 🎨 Part 3: Frontend Integration

### Request Format

**Endpoint:** `POST /api/your-endpoint`

**Content-Type:** `multipart/form-data`

**Form Data:**
```javascript
const formData = new FormData();

// Add your form fields
formData.append('orderId', 'order-uuid');
formData.append('description', 'Description here');

// Add image files (field name must be "images")
formData.append('images', file1); // File object
formData.append('images', file2); // File object

// Send request
fetch('https://your-api.vercel.app/api/your-endpoint', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
    // DON'T set Content-Type - browser sets it automatically
  },
  body: formData
});
```

### React Example

```javascript
const handleUpload = async (files, orderId) => {
  const formData = new FormData();
  
  formData.append('orderId', orderId);
  formData.append('description', 'Return request description');
  
  // Add all files with same field name
  Array.from(files).forEach(file => {
    formData.append('images', file);
  });

  try {
    const response = await fetch('https://your-api.vercel.app/api/returns', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();
    console.log('Upload result:', result);
  } catch (error) {
    console.error('Upload error:', error);
  }
};
```

---

## 🧪 Part 4: Testing

### Test Upload Service

```bash
# From your local machine or server
curl -X POST http://YOUR_SERVER_IP:3050/upload \
  -F "type=returns" \
  -F "images=@/path/to/test-image.jpg"
```

### Test Nginx Serving

```bash
# Check if file exists
ls -la /var/www/simbi/uploads/returns/

# Test accessing via HTTP
curl http://YOUR_SERVER_IP/uploads/returns/test-image.jpg
```

### Test from Frontend

1. Upload an image through your frontend
2. Check server logs: `pm2 logs simbi-upload`
3. Verify file exists: `ls -la /var/www/simbi/uploads/returns/`
4. Access image URL in browser

---

## 🔧 Part 5: Maintenance

### Clean Up Temp Files

Add a cron job to clean old temp files:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * find /var/www/simbi/uploads/temp -type f -mtime +1 -delete
```

### Monitor Disk Space

```bash
# Check disk usage
df -h

# Check upload directory size
du -sh /var/www/simbi/uploads/
```

### View Logs

```bash
# Upload service logs
pm2 logs simbi-upload

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Restart Services

```bash
# Restart upload service
pm2 restart simbi-upload

# Restart Nginx
systemctl restart nginx
```

---

## 🐛 Part 6: Troubleshooting

### Issue: Files not uploading

**Check:**
1. Upload service is running: `pm2 list`
2. Port is open: `netstat -tulpn | grep 3050`
3. Firewall allows port: `ufw status`
4. Service logs: `pm2 logs simbi-upload`

### Issue: Files saved to wrong directory

**Solution:** The code now saves to temp first, then moves to target directory. Check logs to see if move operation succeeded.

### Issue: 404 when accessing images

**Check:**
1. Nginx is running: `systemctl status nginx`
2. Nginx config is correct: `nginx -t`
3. File exists: `ls -la /var/www/simbi/uploads/returns/`
4. Permissions are correct: `chmod -R 755 /var/www/simbi/uploads`

### Issue: CORS errors

**Solution:** Add CORS headers in Nginx config (already included in guide).

### Issue: Upload timeout

**Solution:** Increase timeout in `RemoteUploadService.ts` (currently 30 seconds).

---

## 📝 Configuration Checklist

- [ ] Ubuntu server setup complete
- [ ] Upload directories created with correct permissions
- [ ] Node.js installed
- [ ] Upload service installed and running (PM2)
- [ ] Firewall configured (ports 3050 and 80)
- [ ] Nginx installed and configured
- [ ] Backend code updated with hardcoded server IP
- [ ] Frontend updated to use FormData
- [ ] Tested upload from frontend
- [ ] Verified images accessible via HTTP
- [ ] Cron job set up for temp file cleanup

---

## 🔐 Security Notes

1. **Firewall**: Only open necessary ports (3050, 80)
2. **Permissions**: Use `www-data` user for uploads directory
3. **File Validation**: Server validates file types and sizes
4. **CORS**: Configure CORS appropriately for your domain
5. **HTTPS**: Consider using HTTPS for production (Let's Encrypt)

---

## 📚 Quick Reference

**Server IP:** `YOUR_SERVER_IP` (replace everywhere)

**Upload Service:** `http://YOUR_SERVER_IP:3050/upload`

**Health Check:** `http://YOUR_SERVER_IP:3050/health`

**Image URLs:** `http://YOUR_SERVER_IP/uploads/{type}/{filename}`

**Upload Types:** `returns`, `pre-shipment`, `products`, `temp`

**Max File Size:** 10MB

**Allowed Types:** JPEG, JPG, PNG, WEBP, GIF

---

## ✅ Success Indicators

- ✅ Upload service responds to health check
- ✅ Files appear in correct directories
- ✅ Images accessible via HTTP URLs
- ✅ Frontend can upload and receive URLs
- ✅ Logs show successful uploads

---

**Last Updated:** December 2025










