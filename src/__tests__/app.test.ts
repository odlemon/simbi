// @ts-nocheck
import request from "supertest";
import app from "../app";
import { dbConnection } from "../utils/database";

// Close database connection after all tests
afterAll(async () => {
  await dbConnection.disconnect();
  // Give time for cleanup
  await new Promise(resolve => setTimeout(resolve, 500));
});

describe("API Health Checks", () => {
  describe("GET /health", () => {
    it("should return 200 OK with health status", async () => {
      const response = await request(app).get("/health");
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "OK");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("environment");
    });
  });

  describe("GET /", () => {
    it("should return welcome message", async () => {
      const response = await request(app).get("/");
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Welcome to the API");
      expect(response.body).toHaveProperty("timestamp");
    });
  });
});
