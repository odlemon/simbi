// @ts-nocheck
import swaggerJsdoc from "swagger-jsdoc";
import { envConfig } from "../utils/env";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Simbi Market - Complete API",
      version: "1.0.0",
      description: "Complete API documentation for Simbi Market - Zimbabwe AutoParts Marketplace. Includes Admin, Buyer, and Seller endpoints with full request/response schemas.",
      contact: {
        name: "Simbi Market Support",
        email: "support@simbi.market",
      },
    },
    servers: [
      {
        url: `http://localhost:${envConfig.get("PORT") || 3000}`,
        description: "Development server",
      },
      {
        url: "https://simbi-three.vercel.app",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your admin JWT token",
        },
      },
      schemas: {
        // Common schemas
        ApiResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            data: { type: "object" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        PaginatedResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array", items: { type: "object" } },
            pagination: {
              type: "object",
              properties: {
                total: { type: "number" },
                page: { type: "number" },
                limit: { type: "number" },
                totalPages: { type: "number" },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        // Admin schemas
        AdminLogin: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "admin@simbi.market" },
            password: { type: "string", format: "password", example: "SecurePass123!" },
          },
        },
        AdminRegister: {
          type: "object",
          required: ["email", "password", "firstName", "lastName", "role"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            role: {
              type: "string",
              enum: ["SUPER_ADMIN", "FINOPS_ANALYST", "COMPLIANCE_MANAGER", "LOGISTICS_COORDINATOR", "TECH_SUPPORT"],
            },
          },
        },
        // KPI schemas
        SRIViolationsKPI: {
          type: "object",
          properties: {
            belowThreshold70: { type: "number" },
            belowThreshold50: { type: "number" },
            percentageViolated: { type: "number" },
            totalSellers: { type: "number" },
            violatedSellers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  businessName: { type: "string" },
                  sriScore: { type: "number" },
                  status: { type: "string" },
                },
              },
            },
          },
        },
        DocumentExpiryKPI: {
          type: "object",
          properties: {
            expiring30Days: { type: "number" },
            expiring60Days: { type: "number" },
            expiring90Days: { type: "number" },
            alreadyExpired: { type: "number" },
            expiringDocuments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  sellerId: { type: "string" },
                  sellerName: { type: "string" },
                  documentType: { type: "string" },
                  expiryDate: { type: "string", format: "date-time" },
                  daysUntilExpiry: { type: "number" },
                },
              },
            },
          },
        },
        TransactionFailuresKPI: {
          type: "object",
          properties: {
            failureCount: { type: "number" },
            totalTransactions: { type: "number" },
            failureRate: { type: "number" },
            last24Hours: {
              type: "object",
              properties: {
                failures: { type: "number" },
                total: { type: "number" },
                rate: { type: "number" },
              },
            },
            failureTypes: {
              type: "object",
              properties: {
                gatewayError: { type: "number" },
                declined: { type: "number" },
                timeout: { type: "number" },
                other: { type: "number" },
              },
            },
          },
        },
        DisputeMetricsKPI: {
          type: "object",
          properties: {
            avgResolutionTimeHours: { type: "number" },
            sloComplianceRate: { type: "number" },
            pendingOverSevenDays: { type: "number" },
            totalDisputes: { type: "number" },
            resolutionDistribution: {
              type: "object",
              properties: {
                under24h: { type: "number" },
                under72h: { type: "number" },
                under7days: { type: "number" },
                over7days: { type: "number" },
              },
            },
            activeDisputes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  orderId: { type: "string" },
                  status: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                  hoursOpen: { type: "number" },
                },
              },
            },
          },
        },
        MFAStatus: {
          type: "object",
          properties: {
            admins: {
              type: "object",
              properties: {
                withMFA: { type: "number" },
                total: { type: "number" },
                percentage: { type: "number" },
              },
            },
            sellers: {
              type: "object",
              properties: {
                withMFA: { type: "number" },
                total: { type: "number" },
                percentage: { type: "number" },
              },
            },
            overall: {
              type: "object",
              properties: {
                withMFA: { type: "number" },
                total: { type: "number" },
                percentage: { type: "number" },
              },
            },
            usersWithoutMFA: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  email: { type: "string" },
                  userType: { type: "string" },
                  accountAge: { type: "number" },
                },
              },
            },
          },
        },
        PasswordCompliance: {
          type: "object",
          properties: {
            accountsOlderThan90Days: { type: "number" },
            accountsOlderThan180Days: { type: "number" },
            accountsOlderThan365Days: { type: "number" },
            oldAccounts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  email: { type: "string" },
                  userType: { type: "string" },
                  accountAgeDays: { type: "number" },
                },
              },
            },
            recommendation: { type: "string" },
          },
        },
      },
    },
    tags: [
      // Admin tags
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
      
      // Buyer tags
      { name: "Buyer - Authentication", description: "Buyer authentication endpoints" },
      { name: "Buyer - Addresses", description: "Buyer address management endpoints" },
      { name: "Buyer - Products", description: "Buyer product browsing and search endpoints" },
      { name: "Buyer - Orders", description: "Buyer order management endpoints" },
      { name: "Buyer - Analytics", description: "Buyer analytics and reporting endpoints" },
      { name: "Buyer - Disputes", description: "Buyer dispute management endpoints" },
      { name: "Buyer - Quotes", description: "Buyer quote request endpoints" },
      { name: "Buyer - Enterprise", description: "Buyer enterprise user management endpoints" },
      
      // Seller tags
      { name: "Seller - Authentication", description: "Seller authentication endpoints" },
      { name: "Seller - Inventory", description: "Seller inventory management endpoints" },
      { name: "Seller - Orders", description: "Seller order management endpoints" },
      { name: "Seller - Dashboard", description: "Seller dashboard and analytics endpoints" },
      { name: "Seller - Accounting", description: "Seller accounting and financial endpoints" },
      { name: "Seller - Staff", description: "Seller staff management endpoints" },
      { name: "Seller - Loans", description: "Seller loan management endpoints" },
    ],
  },
  apis: [
    "./src/routes/**/*.ts", 
    "./src/swagger/*.yaml",
    "./src/swagger/comprehensive-api.yaml"
  ], // Path to API docs
};

// Generate Swagger spec with fallback strategy
let specs: any;

try {
  specs = swaggerJsdoc(options);
  
  // Check if specs has paths - if not, try to load static spec
  if (!specs || !specs.paths || Object.keys(specs.paths).length === 0) {
    console.log('⚠️  Swagger-jsdoc returned empty spec, trying static fallback');
    try {
      const staticSpec = require("../swagger/static-spec.json");
      specs = staticSpec;
      console.log('✅ Static Swagger spec loaded successfully');
    } catch (staticError) {
      console.log('⚠️  Static spec failed, using minimal fallback');
      specs = options.definition;
      specs.paths = {};
    }
  } else {
    console.log(`✅ Swagger spec generated with ${Object.keys(specs.paths).length} endpoints`);
  }
} catch (error) {
  console.error('❌ Error generating Swagger spec:', error);
  // Try static spec as fallback
  try {
    const staticSpec = require("../swagger/static-spec.json");
    specs = staticSpec;
    console.log('✅ Static Swagger spec loaded as fallback');
  } catch (staticError) {
    console.log('⚠️  Static spec failed, using minimal fallback');
    specs = options.definition;
    specs.paths = {};
  }
}

export { specs };

