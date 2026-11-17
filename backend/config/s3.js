const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const isS3Configured = Boolean(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET_NAME
);

let s3Client = null;

if (isS3Configured) {
  try {
    const { S3Client } = require("@aws-sdk/client-s3");
    s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    console.log("[AWS S3] S3 Client initialized successfully.");
  } catch (err) {
    console.warn("[AWS S3] @aws-sdk/client-s3 not installed, using local storage fallback.");
  }
} else {
  console.log(
    "[AWS S3] Credentials not fully set in .env. Falling back to local disk storage in /uploads."
  );
}

module.exports = {
  s3Client,
  isS3Configured: Boolean(s3Client),
  bucketName: process.env.AWS_S3_BUCKET_NAME || "cloudy-storage-bucket",
  region: process.env.AWS_REGION || "us-east-1",
};
