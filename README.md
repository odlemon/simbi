# Express TypeScript API Starter

A clean, minimal Express TypeScript API starter template with a well-organized folder structure.

## Features

- 🚀 Express.js with TypeScript
- 🔒 Security headers with Helmet
- 🌐 CORS configured
- 📝 Request logging
- 🗄️ Prisma ORM ready
- 🎯 Environment configuration
- ✅ Health check endpoint
- 🧪 Jest testing setup
- 📦 ESLint & Prettier configured

## Project Structure

```
src/
├── app.ts              # Main application file
├── config/             # Configuration files
├── controllers/        # Route controllers
├── middleware/         # Custom middleware
│   └── error.ts       # Error handling middleware
├── routes/            # API routes
├── services/          # Business logic
└── utils/             # Utility functions
    ├── database.ts    # Database connection
    ├── env.ts         # Environment configuration
    └── logger.ts      # Logging utility
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Database (MySQL/PostgreSQL)

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd simbi
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up Prisma (if using database)
```bash
# Initialize Prisma
npx prisma init

# Create your schema in prisma/schema.prisma
# Then run migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate
```

### Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
```

## API Endpoints

### Health Check
```
GET /health
```
Returns the health status of the API.

### Root
```
GET /
```
Welcome endpoint.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment (development/production/test) | development |
| PORT | Server port | 3000 |
| DATABASE_URL | Database connection string | - |

## Adding New Features

1. **Create a route file** in `src/routes/`
2. **Create a controller** in `src/controllers/`
3. **Create a service** (optional) in `src/services/`
4. **Import and use** in `src/app.ts`

Example:
```typescript
// src/routes/exampleRoutes.ts
import { Router } from "express";
import { ExampleController } from "../controllers/ExampleController";

const router = Router();
const controller = new ExampleController();

router.get("/", controller.getAll);
router.post("/", controller.create);

export default router;

// src/app.ts
import exampleRoutes from "./routes/exampleRoutes";
app.use("/api/example", exampleRoutes);
```

## Testing

Tests are located in `src/tests/` and use Jest. To create a new test:

```typescript
import request from "supertest";
import app from "../app";

describe("GET /health", () => {
  it("should return 200 OK", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("OK");
  });
});
```

## License

ISC

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request



