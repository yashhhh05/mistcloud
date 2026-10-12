const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const apiRoutes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static local uploads (used when AWS S3 is not active)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount API routes
app.use("/api", apiRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Cloudy Express Backend API is running.");
});

// 404 Not Found Middleware
app.use(notFoundHandler);

// Global Error Handler Middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[Server] Cloudy Backend API is running on http://localhost:${PORT}`);
});
