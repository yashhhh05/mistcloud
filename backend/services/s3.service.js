let PutObjectCommand, DeleteObjectCommand, GetObjectCommand, getSignedUrl;
try {
  const s3 = require("@aws-sdk/client-s3");
  PutObjectCommand = s3.PutObjectCommand;
  DeleteObjectCommand = s3.DeleteObjectCommand;
  GetObjectCommand = s3.GetObjectCommand;
  getSignedUrl = require("@aws-sdk/s3-request-presigner").getSignedUrl;
} catch (e) {
  // S3 SDK fallback active
}

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { s3Client, isS3Configured, bucketName, region } = require("../config/s3");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// Ensure local uploads directory exists for fallback
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Uploads a file buffer to AWS S3 (or local disk fallback)
 */
const uploadFileToStorage = async ({ buffer, originalname, mimetype }) => {
  const fileExtension = path.extname(originalname);
  const uniqueKey = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${fileExtension}`;

  if (isS3Configured && s3Client && PutObjectCommand) {
    const uploadParams = {
      Bucket: bucketName,
      Key: uniqueKey,
      Body: buffer,
      ContentType: mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${uniqueKey}`;

    return {
      s3Key: uniqueKey,
      bucketFileId: uniqueKey,
      url: s3Url,
      bucket: bucketName,
    };
  } else {
    // Local fallback: save to uploads/
    const filePath = path.join(UPLOADS_DIR, uniqueKey);
    await fs.promises.writeFile(filePath, buffer);

    const localUrl = `/uploads/${uniqueKey}`;

    return {
      s3Key: uniqueKey,
      bucketFileId: uniqueKey,
      url: localUrl,
      bucket: "local-storage",
    };
  }
};

/**
 * Generates a presigned download URL for private AWS S3 objects
 */
const getDownloadUrlForFile = async (s3Key, fileName, disposition = "attachment") => {
  if (isS3Configured && s3Client && GetObjectCommand && getSignedUrl) {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        ResponseContentDisposition: `${disposition}; filename="${encodeURIComponent(fileName)}"`,
      });
      return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (err) {
      console.error("[AWS S3 Presigned URL Error]", err.message);
      return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
    }
  }
  return `/uploads/${s3Key}`;
};

/**
 * Deletes a file from AWS S3 (or local disk fallback)
 */
const deleteFileFromStorage = async (s3Key) => {
  if (isS3Configured && s3Client && DeleteObjectCommand) {
    try {
      const deleteParams = {
        Bucket: bucketName,
        Key: s3Key,
      };
      await s3Client.send(new DeleteObjectCommand(deleteParams));
      return true;
    } catch (err) {
      console.error("[AWS S3 Delete Error]", err.message);
      return false;
    }
  } else {
    try {
      const filePath = path.join(UPLOADS_DIR, s3Key);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      return true;
    } catch (err) {
      console.error("[Local Storage Delete Error]", err.message);
      return false;
    }
  }
};

module.exports = {
  uploadFileToStorage,
  getDownloadUrlForFile,
  deleteFileFromStorage,
};
