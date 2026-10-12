const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["document", "image", "video", "audio", "other"],
      required: true,
    },
    extension: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    users: {
      type: [String],
      default: [],
    },
    s3Key: {
      type: String,
      required: true,
    },
    bucketFileId: {
      type: String,
      required: true,
    },
    bucket: {
      type: String,
      default: "cloudy-s3-bucket",
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.$id = ret._id.toString();
        ret.$createdAt = ret.createdAt;
        ret.$updatedAt = ret.updatedAt;
        return ret;
      },
    },
  }
);

// Indexes for high performance querying
FileSchema.index({ owner: 1, type: 1 });
FileSchema.index({ users: 1 });
FileSchema.index({ name: "text" });

module.exports = mongoose.model("File", FileSchema);
