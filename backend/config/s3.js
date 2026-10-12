const { S3Client } = require("@aws-sdk/client-s3");
const dotenv = require("dotenv");

dotenv.config();

const isS3Configured = Boolean(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET_NAME
);

let s3Client = null;

if (isS3Configured) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  console.log("[AWS S3] S3 Client initialized successfully.");
} else {
  console.log(
    "[AWS S3] Credentials not fully set in .env. Falling back to local disk storage in /uploads. To use S3 on EC2, set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET_NAME."
  );
}

module.exports = {
  s3Client,
  isS3Configured,
  bucketName: process.env.AWS_S3_BUCKET_NAME || "cloudy-storage-bucket",
  region: process.env.AWS_REGION || "us-east-1",
};
