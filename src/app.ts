// @ts-nocheck
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";

import { errorMiddleware } from "./middleware/error";
import { prisma, checkDatabaseConnection } from "./utils/database";
import { envConfig } from "./utils/env";
import { logger } from "./utils/logger";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3006;

// Response compression (gzip/brotli) — reduces payload 60-80%
app.use(compression());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false  
}));

// CORS configuration
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3006",
    "http://localhost:3008",
    "http://31.220.82.129:5000",
    "http://localhost:3003",
    "172.20.20.10.9:3001",
    "http://31.220.82.129:4173",
    "172.20.20.10.9:3000",
    "http://localhost:3001",
    "http://localhost:3005",
    "http://localhost:5001",
    "http://localhost:5000",
    "http://31.220.82.129:3003",
    "https://simbi-market-fawn.vercel.app",
    "http://172.20.20.10.9:5001",
    "https://simbimarket.com",
    "https://car-parts-hub.vercel.app",
    "https://simbi-market-sigma.vercel.app",
    "https://simbi-admin.vercel.app",
    "https://simbi-seller.vercel.app",
    "https://carspain.vercel.app",
    "https://simbi-buyer.vercel.app",
    "https://simbi-seller-kappa.vercel.app",
    "https://simbi-admin-one.vercel.app"

  ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});

// Database connection error handling middleware
app.use(async (req, res, next) => {
  try {
    // Check database connection before processing request
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      logger.warn("Database connection lost, attempting to reconnect");
      await prisma.$connect();
    }
    next();
  } catch (error: any) {
    logger.error("Database connection error in middleware", { error: error.message });
    res.status(503).json({
      success: false,
      message: "Database temporarily unavailable",
      error: "Service temporarily unavailable"
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: envConfig.get("NODE_ENV"),
  });
});

// Test endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the API",
    timestamp: new Date().toISOString()
  });
});

// Shared routes (works for admin, buyer, seller)
import sharedPaymentRoutes from "./routes/shared/payment.routes";
app.use("/api/orders", sharedPaymentRoutes);

// Admin routes
import adminRoutes from "./routes/admin/index";
app.use("/api/admin", adminRoutes);

// Unified Auth routes (forgot/reset password)
import passwordResetRoutes from "./routes/auth/passwordReset.routes";
app.use("/api/auth", passwordResetRoutes);

// Seller routes
import sellerRoutes from "./routes/seller/index";
app.use("/api/seller", sellerRoutes);

// Staff routes
import staffAuthRoutes from "./routes/staff/auth.routes";
app.use("/api/staff", staffAuthRoutes);

// Webhook routes (public endpoints for external systems)
import logisticsWebhooks from "./routes/webhooks/logisticsWebhooks";
app.use("/api/webhooks/logistics", logisticsWebhooks);

import loanPartnerWebhooks from "./routes/webhooks/loanPartnerWebhooks";
app.use("/api/webhooks/loans", loanPartnerWebhooks);

// Buyer routes
import buyerRoutes from "./routes/buyer/index";
app.use("/api/buyer", buyerRoutes);

// Public product review routes
import productReviewRoutes from "./routes/products/reviews";
app.use("/api/products", productReviewRoutes);

// Guest checkout routes (public)
import guestCheckoutRoutes from "./routes/guest/checkout";
import guestOrderRoutes from "./routes/guest/orders";
app.use("/api/guest", guestCheckoutRoutes);
app.use("/api/guest", guestOrderRoutes);

// Public commerce hints (cart / checkout UI; no auth)
import commerceShippingRoutes from "./routes/commerceShipping.routes";
app.use("/api/commerce", commerceShippingRoutes);

// Media upload routes
import mediaRoutes from "./routes/media";
app.use("/api/media", mediaRoutes);

// Static file serving for uploaded images (not needed on Vercel, files are on Ubuntu server)
// Images are served directly from http://31.220.82.129/uploads

// Load Swagger spec with fallback
let specs: any = {
  openapi: "3.0.0",
  info: { 
    title: "Simbi Market - Complete API", 
    version: "1.0.0",
    description: "Complete API documentation for Simbi Market - Zimbabwe AutoParts Marketplace. Includes Admin, Buyer, and Seller endpoints with full request/response schemas."
  },
  paths: {},
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token"
      }
    }
  },
  tags: [
    { name: "Admin - Authentication", description: "Admin authentication endpoints" },
    { name: "Admin - Dashboard", description: "Admin dashboard and KPI monitoring endpoints" },
    { name: "Admin - Products", description: "Admin product management endpoints" },
    { name: "Admin - Sellers", description: "Admin seller management and SRI endpoints" },
    { name: "Admin - Financial", description: "Admin financial reconciliation and payouts" },
    { name: "Admin - Disputes", description: "Admin dispute management endpoints" },
    { name: "Admin - Logistics", description: "Admin logistics and carrier management" },
    { name: "Admin - Settings", description: "Admin system settings and configuration" },
    { name: "Admin - Compliance", description: "Admin compliance and security monitoring" },
    { name: "Admin - Inventory", description: "Admin inventory management endpoints" },
    { name: "Admin - HR", description: "Admin HR and payroll endpoints" },
    { name: "Buyer - Authentication", description: "Buyer authentication endpoints" },
    { name: "Buyer - Addresses", description: "Buyer address management endpoints" },
    { name: "Buyer - Products", description: "Buyer product browsing and search endpoints" },
    { name: "Buyer - Orders", description: "Buyer order management endpoints" },
    { name: "Buyer - Analytics", description: "Buyer analytics and reporting endpoints" },
    { name: "Buyer - Disputes", description: "Buyer dispute management endpoints" },
    { name: "Buyer - Quotes", description: "Buyer quote request endpoints" },
    { name: "Buyer - Enterprise", description: "Buyer enterprise user management endpoints" },
    { name: "Seller - Authentication", description: "Seller authentication endpoints" },
    { name: "Seller - Inventory", description: "Seller inventory management endpoints" },
    { name: "Seller - Orders", description: "Seller order management endpoints" },
    { name: "Seller - Dashboard", description: "Seller dashboard and analytics endpoints" },
    { name: "Seller - Accounting", description: "Seller accounting and financial endpoints" },
    { name: "Seller - Staff", description: "Seller staff management endpoints" },
    { name: "Seller - Loans", description: "Seller loan management endpoints" }
  ]
};

try {
  const swagger = require("./config/swagger");
  if (swagger?.specs && Object.keys(swagger.specs.paths || {}).length > 0) {
    specs = swagger.specs;
    logger.info(`Swagger spec loaded: ${Object.keys(specs.paths || {}).length} endpoints`);
  } else {
    // Try to load static spec as fallback
    try {
      const staticSpec = require("./swagger/static-spec.json");
      specs = staticSpec;
      logger.info(`Static Swagger spec loaded: ${Object.keys(specs.paths || {}).length} endpoints`);
    } catch (staticError: any) {
      logger.warn("Failed to load static spec, using minimal fallback", { error: staticError.message });
    }
  }
} catch (e: any) {
  logger.warn("Failed to load swagger spec, trying static fallback", { error: e.message });
  // Try to load static spec as fallback
  try {
    const staticSpec = require("./swagger/static-spec.json");
    specs = staticSpec;
    logger.info(`Static Swagger spec loaded: ${Object.keys(specs.paths || {}).length} endpoints`);
  } catch (staticError: any) {
    logger.warn("Failed to load static spec, using minimal fallback", { error: staticError.message });
  }
}

// Swagger UI endpoint (CDN-based, Vercel-compatible)
app.get("/api-docs", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Simbi Market - Admin API Documentation</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      
      <!-- Swagger UI CSS from CDN -->
      <link rel="stylesheet" type="text/css" 
            href="https://unpkg.com/swagger-ui-dist@5.27.1/swagger-ui.css" />
      
      <style>
        /* Custom styling */
        body { margin: 0; padding: 0; }
        
        /* Hide Swagger topbar */
        .swagger-ui .topbar { display: none; }
        
        /* Custom header */
        .custom-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .custom-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .custom-header p {
          margin: 5px 0 0 0;
          opacity: 0.9;
          font-size: 14px;
        }
        
        /* HTTP method colors */
        .swagger-ui .opblock.opblock-post {
          border-color: #49cc90;
          background: rgba(73, 204, 144, 0.1);
        }
        .swagger-ui .opblock.opblock-get {
          border-color: #61affe;
          background: rgba(97, 175, 254, 0.1);
        }
        .swagger-ui .opblock.opblock-put {
          border-color: #fca130;
          background: rgba(252, 161, 48, 0.1);
        }
        .swagger-ui .opblock.opblock-delete {
          border-color: #f93e3e;
          background: rgba(249, 62, 62, 0.1);
        }
        
        /* Improved button styling */
        .swagger-ui .btn.authorize {
          background: #667eea;
          border-color: #667eea;
        }
        .swagger-ui .btn.authorize:hover {
          background: #764ba2;
          border-color: #764ba2;
        }
        
        /* Schema styling */
        .swagger-ui .model-box {
          background: #f7f7f7;
          border-radius: 4px;
        }
        
        /* Response styling */
        .swagger-ui .responses-inner {
          padding: 20px;
          background: #fafafa;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <!-- Custom Header -->
      <div class="custom-header">
        <h1>🚗 Simbi Market - Complete API</h1>
        <p>Admin, Buyer & Seller API Documentation for Zimbabwe AutoParts Marketplace</p>
      </div>
      
      <!-- Swagger UI Container -->
      <div id="swagger-ui"></div>
      
      <!-- Swagger UI JavaScript from CDN -->
      <script src="https://unpkg.com/swagger-ui-dist@5.27.1/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist@5.27.1/swagger-ui-standalone-preset.js"></script>
      
      <script>
        window.onload = function() {
          const ui = SwaggerUIBundle({
            spec: ${JSON.stringify(specs)},
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout",
            persistAuthorization: true,        // Remembers JWT token across refreshes
            displayRequestDuration: true,      // Shows request time
            filter: true,                      // Enable search/filter
            showRequestHeaders: true,          // Show request headers
            docExpansion: 'list',             // Expand operations list
            defaultModelsExpandDepth: 1,
            defaultModelExpandDepth: 1,
            tryItOutEnabled: true,            // Enable "Try it out"
            syntaxHighlight: {
              activated: true,
              theme: 'monokai'
            }
          });
          
          window.ui = ui;
        };
      </script>
    </body>
    </html>
  `);
});

// Swagger JSON endpoint (for debugging and external tools)
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json(specs);
});

// Debug endpoint (development only)
if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "dev") {
  app.get("/api-spec", (req, res) => {
    res.json({
      success: true,
      spec: specs,
      paths: Object.keys(specs.paths || {}),
      totalPaths: Object.keys(specs.paths || {}).length,
      environment: process.env.NODE_ENV,
    });
  });
}

// Error handling middleware (should be last)
app.use(errorMiddleware);

const startServer = async (): Promise<void> => {
  try {
    // Add retry mechanism for database connection
    let retries = 3;
    let connected = false;
    
    while (retries > 0 && !connected) {
      try {
        await prisma.$connect();
        connected = await checkDatabaseConnection();
        
        if (connected) {
          logger.info("✅ Connected to MySQL database successfully");
          break;
        }
      } catch (error: any) {
        retries--;
        logger.warn(`Database connection attempt failed, ${retries} retries left`, { error: error.message });
        
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        }
      }
    }
    
    if (!connected) {
      throw new Error("Failed to connect to database after 3 attempts");
    }

    app.listen(port, () => {
      logger.info(`🚀 Server running on port ${port}`, {
        environment: envConfig.get("NODE_ENV"),
        port: port,
      });
      logger.info(`📚 API Documentation available at http://localhost:${port}/api-docs`);
    });
  } catch (error: any) {
    logger.error("Failed to start server", { error: error.message });
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  try {
    await prisma.$disconnect();
    logger.info("Server shut down successfully");
    process.exit(0);
  } catch (error: any) {
    logger.error("Error during shutdown", { error: error.message });
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start the server only if not in test environment or serverless (Vercel)
// Vercel sets VERCEL=1 environment variable
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  startServer();
}

export default app;
