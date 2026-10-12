const express = require("express");
const router = express.Router();
const searchController = require("../controllers/search.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Search files (protected)
router.get("/", authMiddleware, searchController.searchFiles);

module.exports = router;
