const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const File = require("../models/File");
const inMemoryStore = require("../config/inMemoryStore");
const { isS3Configured } = require("../config/s3");
const { uploadFileToStorage, deleteFileFromStorage, getDownloadUrlForFile } = require("../services/s3.service");

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

// Helper: Determine file type and extension
const getFileType = (fileName) => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  const documentExtensions = [
    "pdf", "doc", "docx", "txt", "xls", "xlsx", "csv", "rtf", "ods", "ppt", "odp",
    "md", "html", "htm", "epub", "pages", "fig", "psd", "ai", "indd", "xd", "sketch"
  ];
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"];
  const videoExtensions = ["mp4", "avi", "mov", "mkv", "webm", "wmv", "flv", "m4v", "3gp"];
  const audioExtensions = ["mp3", "wav", "ogg", "flac", "aac", "wma", "m4a", "aiff", "alac"];

  if (documentExtensions.includes(extension)) return { type: "document", extension };
  if (imageExtensions.includes(extension)) return { type: "image", extension };
  if (videoExtensions.includes(extension)) return { type: "video", extension };
  if (audioExtensions.includes(extension)) return { type: "audio", extension };

  return { type: "other", extension };
};

// 1. Upload File
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded" });
    }

    const { originalname, buffer, mimetype, size } = req.file;
    const { type, extension } = getFileType(originalname);

    // Upload to AWS S3 (or local fallback)
    const storageResult = await uploadFileToStorage({
      buffer,
      originalname,
      mimetype,
    });

    const user = req.user || inMemoryStore.getDefaultUser();
    const userId = (user._id || user.$id).toString();

    if (isDbConnected()) {
      try {
        const newFile = await File.create({
          name: originalname,
          url: storageResult.url,
          type,
          extension,
          size,
          owner: userId,
          users: [],
          s3Key: storageResult.s3Key,
          bucketFileId: storageResult.bucketFileId,
          bucket: storageResult.bucket,
        });

        const populatedFile = await File.findById(newFile._id).populate("owner", "fullName email avatar");
        const json = populatedFile.toJSON();
        if (isS3Configured && json.s3Key && json.bucket !== "local-storage") {
          try {
            json.url = await getDownloadUrlForFile(json.s3Key, json.name, "inline");
          } catch (err) {}
        }
        return res.status(201).json(json);
      } catch (err) {
        console.warn("[Upload DB Error, saving to memory]:", err.message);
      }
    }

    // In-memory fallback
    const memFile = inMemoryStore.createFile({
      name: originalname,
      url: storageResult.url || `/assets/icons/file-${type}.svg`,
      type,
      extension,
      size,
      owner: {
        _id: userId,
        $id: userId,
        fullName: user.fullName || "Demo User",
        email: user.email || "demo@mistcloud.com",
        avatar: user.avatar,
      },
      users: [user.email || "demo@mistcloud.com"],
      s3Key: storageResult.s3Key,
      bucketFileId: storageResult.bucketFileId,
      bucket: storageResult.bucket,
    });

    return res.status(201).json(memFile);
  } catch (error) {
    next(error);
  }
};

// 2. Get Files
const getFiles = async (req, res, next) => {
  try {
    const { types, searchText, sort = "$createdAt-desc", limit } = req.query;
    const user = req.user || inMemoryStore.getDefaultUser();
    const userId = (user._id || user.$id).toString();

    if (isDbConnected()) {
      try {
        const query = {
          $or: [
            { owner: userId },
            { users: user.email },
          ],
        };

        if (types) {
          const typeList = Array.isArray(types)
            ? types
            : types.split(",").map((t) => t.trim()).filter(Boolean);
          if (typeList.length > 0) {
            query.type = { $in: typeList };
          }
        }

        if (searchText) {
          query.name = { $regex: searchText, $options: "i" };
        }

        let sortOptions = { createdAt: -1 };
        if (sort) {
          const [field, order] = sort.split("-");
          const isAsc = order === "asc" ? 1 : -1;
          if (field === "$createdAt" || field === "createdAt") {
            sortOptions = { createdAt: isAsc };
          } else if (field === "name") {
            sortOptions = { name: isAsc };
          } else if (field === "size") {
            sortOptions = { size: isAsc };
          }
        }

        let filesQuery = File.find(query)
          .sort(sortOptions)
          .populate("owner", "fullName email avatar");

        if (limit && !isNaN(parseInt(limit))) {
          filesQuery = filesQuery.limit(parseInt(limit));
        }

        const files = await filesQuery.exec();

        const documents = await Promise.all(
          files.map(async (f) => {
            const json = f.toJSON();
            if (isS3Configured && json.s3Key && json.bucket !== "local-storage") {
              try {
                json.url = await getDownloadUrlForFile(json.s3Key, json.name, "inline");
              } catch (err) {
                // keep existing url
              }
            }
            return json;
          })
        );

        return res.json({
          total: documents.length,
          documents,
        });
      } catch (err) {
        console.warn("[GetFiles DB Error, using memory]:", err.message);
      }
    }

    // In-memory fallback
    const typeList = types
      ? Array.isArray(types)
        ? types
        : types.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const documents = inMemoryStore.getFiles({
      ownerId: userId,
      userEmail: user.email,
      types: typeList,
      searchText,
      sort,
      limit: limit ? parseInt(limit) : undefined,
    });

    return res.json({
      total: documents.length,
      documents,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Rename File
const renameFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, extension } = req.body;

    if (isDbConnected()) {
      try {
        const file = await File.findById(id);
        if (file) {
          const ext = extension ? extension.replace(/^\./, "") : file.extension;
          const cleanName = name.endsWith(`.${ext}`) ? name : `${name}.${ext}`;
          file.name = cleanName;
          file.extension = ext;
          await file.save();
          const populated = await File.findById(file._id).populate("owner", "fullName email avatar");
          return res.json(populated.toJSON());
        }
      } catch (err) {
        // Fall through
      }
    }

    const file = inMemoryStore.findFileById(id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const ext = extension ? extension.replace(/^\./, "") : file.extension;
    const cleanName = name.endsWith(`.${ext}`) ? name : `${name}.${ext}`;
    const updated = inMemoryStore.updateFile(id, { name: cleanName, extension: ext });
    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

// 4. Update File Users (Share)
const updateFileUsers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { emails } = req.body;
    const validEmails = Array.isArray(emails) ? emails : [];

    if (isDbConnected()) {
      try {
        const file = await File.findById(id);
        if (file) {
          file.users = Array.from(new Set(validEmails));
          await file.save();
          const populated = await File.findById(file._id).populate("owner", "fullName email avatar");
          return res.json(populated.toJSON());
        }
      } catch (err) {
        // Fall through
      }
    }

    const file = inMemoryStore.findFileById(id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const updated = inMemoryStore.updateFile(id, { users: Array.from(new Set(validEmails)) });
    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

// 5. Delete File
const deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      try {
        const file = await File.findById(id);
        if (file) {
          await deleteFileFromStorage(file.s3Key);
          await File.findByIdAndDelete(id);
          return res.json({ status: "success", message: "File deleted successfully" });
        }
      } catch (err) {
        // Fall through
      }
    }

    const file = inMemoryStore.findFileById(id);
    if (file) {
      await deleteFileFromStorage(file.s3Key);
      inMemoryStore.deleteFile(id);
    }

    return res.json({ status: "success", message: "File deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// 6. Get Total Space Used
const getTotalSpaceUsed = async (req, res, next) => {
  try {
    const user = req.user || inMemoryStore.getDefaultUser();
    const userId = (user._id || user.$id).toString();

    let fileList = [];
    if (isDbConnected()) {
      try {
        fileList = await File.find({
          $or: [{ owner: userId }, { users: user.email }],
        });
      } catch (err) {
        fileList = inMemoryStore.getFiles({ ownerId: userId, userEmail: user.email });
      }
    } else {
      fileList = inMemoryStore.getFiles({ ownerId: userId, userEmail: user.email });
    }

    const totalSpace = {
      image: { size: 0, latestDate: "" },
      document: { size: 0, latestDate: "" },
      video: { size: 0, latestDate: "" },
      audio: { size: 0, latestDate: "" },
      other: { size: 0, latestDate: "" },
      used: 0,
      all: 2 * 1024 * 1024 * 1024, // 2GB
    };

    fileList.forEach((file) => {
      const fileType = file.type;
      if (totalSpace[fileType]) {
        totalSpace[fileType].size += file.size || 0;
        totalSpace.used += file.size || 0;

        const fileDate = file.updatedAt || file.createdAt;
        if (
          fileDate &&
          (!totalSpace[fileType].latestDate ||
            new Date(fileDate) > new Date(totalSpace[fileType].latestDate))
        ) {
          totalSpace[fileType].latestDate = typeof fileDate === "string" ? fileDate : fileDate.toISOString();
        }
      }
    });

    return res.json(totalSpace);
  } catch (error) {
    next(error);
  }
};

// 7. Download or Open/View File
const downloadFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isInline = req.query.inline === "true" || req.query.view === "true";
    let file = null;

    if (isDbConnected()) {
      try {
        file = await File.findById(id);
      } catch (err) {
        file = inMemoryStore.findFileById(id);
      }
    } else {
      file = inMemoryStore.findFileById(id);
    }

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (isS3Configured && file.s3Key && file.bucket !== "local-storage") {
      const presignedUrl = await getDownloadUrlForFile(
        file.s3Key,
        file.name,
        isInline ? "inline" : "attachment"
      );
      return res.redirect(presignedUrl);
    }

    if (file.s3Key) {
      const filePath = path.join(__dirname, "..", "uploads", file.s3Key);
      if (fs.existsSync(filePath)) {
        if (isInline) {
          return res.sendFile(filePath);
        }
        return res.download(filePath, file.name);
      }
    }

    if (file.url && file.url.startsWith("http")) {
      return res.redirect(file.url);
    }

    if (file.url) {
      return res.redirect(file.url);
    }

    return res.status(200).json({ status: "ready", name: file.name, url: file.url });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  getFiles,
  renameFile,
  updateFileUsers,
  deleteFile,
  getTotalSpaceUsed,
  downloadFile,
};
