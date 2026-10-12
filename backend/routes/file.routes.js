const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const authMiddleware = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

// All file routes require authentication
router.use(authMiddleware);

// Upload File
router.post("/upload", upload.single("file"), fileController.uploadFile);

// Get Files (with type, search, sort, limit filters)
router.get("/", fileController.getFiles);

// Get Storage Usage Statistics
router.get("/usage", fileController.getTotalSpaceUsed);

// Rename File
router.patch("/:id/rename", fileController.renameFile);

// Share File (Update shared users)
router.patch("/:id/share", fileController.updateFileUsers);

// Delete File
router.delete("/:id", fileController.deleteFile);

// Download File
router.get("/:id/download", fileController.downloadFile);

module.exports = router;
