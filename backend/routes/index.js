const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const fileRoutes = require("./file.routes");
const searchRoutes = require("./search.routes");

router.use("/auth", authRoutes);
router.use("/files", fileRoutes);
router.use("/search", searchRoutes);

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Cloudy API server is healthy and running",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
