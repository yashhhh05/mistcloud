const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

const connectDB = require("./backend/config/db");
const apiRoutes = require("./backend/routes");
const { errorHandler } = require("./backend/middleware/error.middleware");

// Connect to MongoDB (non-fatal, falls back to in-memory store)
connectDB();

const app = express();
const PORT = 3000;
const HOST = "0.0.0.0";

// Enable CORS for API requests
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static local uploads (used when AWS S3 is not active)
const uploadsDir = path.join(__dirname, "backend", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Mount Express Backend API routes
app.use("/api", apiRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Mist Cloud Express API is running",
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  const distDir = path.join(__dirname, "dist");

  // In development, if dist doesn't exist, build or use Vite middleware
  if (!fs.existsSync(distDir)) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        root: path.join(__dirname, "frontend"),
        server: { middlewareMode: true, host: HOST },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[Vite] Live development middleware integrated.");
    } catch (err) {
      console.warn("[Vite] Middleware fallback warning:", err.message);
    }
  } else {
    // Serve production React SPA build
    app.use(express.static(distDir));
    app.use(express.static(path.join(__dirname, "public")));
    app.use(express.static(path.join(__dirname, "frontend", "public")));

    // Fallback all non-API GET requests to React index.html
    app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  // Global Error Handler for API routes
  app.use(errorHandler);

  app.listen(PORT, HOST, () => {
    console.log(`[Server] Mist Cloud (React + Express) running at http://${HOST}:${PORT}`);
  });
}

startServer();
