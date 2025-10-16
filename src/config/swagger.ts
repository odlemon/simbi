// @ts-nocheck
import swaggerJsdoc from "swagger-jsdoc";
import { envConfig } from "../utils/env";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Simbi Market - Admin API",
      version: "1.0.0",
      description: "Complete Admin API documentation for Simbi Market - Zimbabwe AutoParts Marketplace",
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
        url: "https://api.simbi.market",
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
      { name: "Authentication", description: "Admin authentication endpoints" },
      { name: "Dashboard & KPIs", description: "Dashboard and KPI monitoring endpoints" },
      { name: "Enhanced KPIs", description: "New enhanced KPI endpoints (Section 9 requirements)" },
      { name: "Products", description: "Product management endpoints" },
      { name: "Sellers", description: "Seller management and SRI endpoints" },
      { name: "Financial", description: "Financial reconciliation and payouts" },
      { name: "Disputes", description: "Dispute management endpoints" },
      { name: "Logistics", description: "Logistics and carrier management" },
      { name: "HR & Payroll", description: "HR and payroll endpoints" },
      { name: "Settings", description: "System settings and configuration" },
      { name: "Compliance", description: "Compliance and security monitoring" },
      { name: "Inventory", description: "Inventory management endpoints" },
    ],
  },
  apis: ["./src/routes/**/*.ts", "./src/swagger/*.yaml"], // Path to API docs
};

// Generate Swagger spec with fallback strategy
let specs: any;

try {
  specs = swaggerJsdoc(options);
  
  // Check if specs has paths - if not, use minimal fallback
  if (!specs || !specs.paths || Object.keys(specs.paths).length === 0) {
    console.log('⚠️  Swagger-jsdoc returned empty spec, using fallback');
    specs = options.definition;
    specs.paths = {};
  }
} catch (error) {
  console.error('❌ Error generating Swagger spec:', error);
  // Fallback to definition only
  specs = options.definition;
  specs.paths = {};
}

export { specs };

