# Ubuntu Server Media Storage Setup Guide

This guide explains how to set up image/media storage on your Ubuntu server for the Simbi Marketplace.

---

## 📋 Overview

The media storage system allows users to:
- Upload images for return requests (evidence)
- Upload pre-shipment evidence (ECC baseline)
- Store product images
- Access uploaded images via HTTP URLs

---

## 🚀 Quick Setup

### 1. Create Upload Directory

```bash
# Create the upload directory
sudo mkdir -p /var/www/simbi/uploads

# Create subdirectories
sudo mkdir -p /var/www/simbi/uploads/returns
sudo mkdir -p /var/www/simbi/uploads/pre-shipment
sudo mkdir -p /var/www/simbi/uploads/products
sudo mkdir -p /var/www/simbi/uploads/temp

# Set proper permissions
sudo chown -R $USER:$USER /var/www/simbi/uploads
sudo chmod -R 755 /var/www/simbi/uploads
```

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Media Storage Configuration
UPLOAD_DIR=/var/www/simbi/uploads
MEDIA_BASE_URL=http://your-server-ip:3000
# Or if using domain:
# MEDIA_BASE_URL=https://api.simbimarket.com
```

### 3. Install Dependencies (Already Installed)

The following packages are already in `package.json`:
- `multer` - File upload handling
- `fs` - File system operations (built-in)

No additional installation needed!

---

## 📁 Directory Structure

```
/var/www/simbi/uploads/
├── returns/          # Return request evidence images
├── pre-shipment/     # Pre-shipment ECC baseline images
├── products/         # Product images
└── temp/             # Temporary uploads (auto-cleaned after 24h)
```

---

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `UPLOAD_DIR` | Base directory for uploads | `./uploads` | `/var/www/simbi/uploads` |
| `MEDIA_BASE_URL` | Base URL for serving images | `http://localhost:3000` | `https://api.simbimarket.com` |

### File Limits

- **Max file size**: 10MB per image
- **Max files per request**: 10 images
- **Allowed types**: JPEG, JPG, PNG, WEBP, GIF

---

## 🌐 Serving Images via HTTP

The Express app automatically serves uploaded images at:

```
http://your-server:3000/uploads/{subdirectory}/{filename}
```

**Example:**
```
http://31.220.82.129:3000/uploads/returns/product_photo-1234567890-987654321.jpg
```

---

## 🔒 Security Considerations

### 1. File Type Validation

Only image files are allowed:
- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/webp`
- `image/gif`

### 2. File Size Limits

- Maximum 10MB per file
- Prevents DoS attacks via large uploads

### 3. Filename Sanitization

Uploaded filenames are sanitized to prevent path traversal:
- Special characters removed
- Unique timestamp + random suffix added
- Original extension preserved

### 4. Directory Permissions

```bash
# Recommended permissions
chmod 755 /var/www/simbi/uploads
chmod 755 /var/www/simbi/uploads/*
```

---

## 📡 API Endpoints

### 1. Upload Multiple Images

**Endpoint:** `POST /api/media/upload`

**Request:**
```bash
curl -X POST http://your-server:3000/api/media/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg"
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully uploaded 2 image(s)",
  "data": {
    "files": [
      {
        "url": "http://your-server:3000/uploads/returns/photo1-1234567890-987654321.jpg",
        "filename": "photo1-1234567890-987654321.jpg",
        "originalname": "photo1.jpg",
        "size": 245678,
        "mimetype": "image/jpeg"
      },
      {
        "url": "http://your-server:3000/uploads/returns/photo2-1234567890-123456789.jpg",
        "filename": "photo2-1234567890-123456789.jpg",
        "originalname": "photo2.jpg",
        "size": 189234,
        "mimetype": "image/jpeg"
      }
    ]
  }
}
```

### 2. Upload Single Image

**Endpoint:** `POST /api/media/upload/single`

**Request:**
```bash
curl -X POST http://your-server:3000/api/media/upload/single \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@photo.jpg"
```

### 3. Return Request with File Upload

**Endpoint:** `POST /api/buyer/returns`

**Request (multipart/form-data):**
```bash
curl -X POST http://your-server:3000/api/buyer/returns \
  -H "Authorization: Bearer BUYER_TOKEN" \
  -F "orderId=order-uuid" \
  -F "requestType=RETURN" \
  -F "returnReason=WRONG_PART" \
  -F "description=Received wrong part number" \
  -F "images=@evidence1.jpg" \
  -F "images=@evidence2.jpg"
```

**OR with JSON + URLs:**
```json
{
  "orderId": "order-uuid",
  "requestType": "RETURN",
  "returnReason": "WRONG_PART",
  "description": "Received wrong part number",
  "evidenceUrls": [
    "http://your-server:3000/uploads/returns/evidence1.jpg",
    "http://your-server:3000/uploads/returns/evidence2.jpg"
  ]
}
```

---

## 🧹 Maintenance

### Clean Up Temporary Files

Temporary files older than 24 hours are automatically cleaned up. You can also manually trigger cleanup:

```typescript
// In your code
await mediaStorageService.cleanupTempFiles();
```

### Manual Cleanup Script

Create a cron job to clean temp files daily:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * find /var/www/simbi/uploads/temp -type f -mtime +1 -delete
```

---

## 🔍 Troubleshooting

### Issue: "Cannot find module '../utils/logger'"

**Solution:** Already fixed! The import paths in `TokenizationService.ts` have been corrected.

### Issue: "ENOENT: no such file or directory"

**Solution:** Ensure upload directory exists:
```bash
sudo mkdir -p /var/www/simbi/uploads/{returns,pre-shipment,products,temp}
sudo chown -R $USER:$USER /var/www/simbi/uploads
```

### Issue: "Permission denied"

**Solution:** Fix permissions:
```bash
sudo chmod -R 755 /var/www/simbi/uploads
sudo chown -R $USER:$USER /var/www/simbi/uploads
```

### Issue: Images not accessible via HTTP

**Solution:** 
1. Check `MEDIA_BASE_URL` in `.env`
2. Ensure Express static middleware is configured (already done in `app.ts`)
3. Check firewall/nginx configuration if using reverse proxy

---

## 🌐 Nginx Configuration (Optional)

If using Nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name api.simbimarket.com;

    # API routes
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static file serving for uploads
    location /uploads {
        alias /var/www/simbi/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## ✅ Verification

### Test Upload

```bash
# Test image upload
curl -X POST http://your-server:3000/api/media/upload \
  -F "images=@test-image.jpg"

# Check if file exists
ls -la /var/www/simbi/uploads/returns/

# Access image via browser
# http://your-server:3000/uploads/returns/test-image-*.jpg
```

---

## 📝 Notes

- **Storage Location**: Files are stored on the server filesystem
- **Backup**: Consider backing up `/var/www/simbi/uploads` regularly
- **Disk Space**: Monitor disk usage, especially for large image uploads
- **CDN**: For production, consider using a CDN (CloudFlare, AWS CloudFront) for faster image delivery

---

## 🎯 Next Steps

1. ✅ Set up upload directory on Ubuntu server
2. ✅ Configure environment variables
3. ✅ Test image upload endpoint
4. ✅ Test return request with file upload
5. ✅ Set up automated cleanup (cron job)
6. ✅ Configure Nginx (if using reverse proxy)

---

## 📚 Related Documentation

- [Buyer Returns User Story](./BUYER_RETURNS_USER_STORY.md)
- [Seller Returns User Story](./SELLER_RETURNS_USER_STORY.md)
- [Admin Returns User Story](./ADMIN_RETURNS_USER_STORY.md)

