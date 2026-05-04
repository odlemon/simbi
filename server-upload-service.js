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
const subdirs = ['returns', 'pre-shipment', 'products', 'temp', 'custom-product-docs', 'seller-documents'];

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

// Single /upload route: product images (products/) + PDFs (custom-product-docs/) via type= in body
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
    ];
    if (allowed.includes(file.mimetype)) {
      console.log(`File type allowed: ${file.mimetype}`);
      cb(null, true);
    } else {
      console.log(`File type rejected: ${file.mimetype}`);
      cb(new Error(`Invalid file type. Allowed: images and application/pdf`));
    }
  }
});

// PDF / documents for custom product requests (OEM spec + supplier docs)
const uploadDocs = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB per PDF
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only application/pdf is allowed for documents.'));
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
        url: `http://31.220.82.129/uploads/temp/${file.filename}`,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        error: `Failed to move to ${targetType} directory`
      };
    }

    return {
      url: `http://31.220.82.129/uploads/${targetType}/${file.filename}`,
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

// PDF uploads — field name "documents" (same response shape as /upload)
app.post('/upload-documents', uploadDocs.array('documents', 15), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No documents uploaded',
    });
  }

  const targetType = (req.body && req.body.type) || 'custom-product-docs';
  const targetDir = path.join(UPLOAD_DIR, targetType);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const files = req.files.map((file) => {
    const targetPath = path.join(targetDir, file.filename);
    try {
      fs.renameSync(file.path, targetPath);
    } catch (error) {
      return {
        url: `http://31.220.82.129/uploads/temp/${file.filename}`,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        error: `Failed to move to ${targetType} directory`,
      };
    }
    return {
      url: `http://31.220.82.129/uploads/${targetType}/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  });

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

const PORT = 3050;
app.listen(PORT, () => {
  console.log(`\n🚀 Upload service running on port ${PORT}`);
  console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📤 Upload endpoint: http://localhost:${PORT}/upload\n`);
});

