const multer = require("multer");

// Use memory storage so we can stream/upload the buffer directly to AWS S3 or disk
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB maximum file size
  },
});

module.exports = upload;
