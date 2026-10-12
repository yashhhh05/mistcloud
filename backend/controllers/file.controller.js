const fs = require("fs");
const path = require("path");
const File = require("../models/File");
const { uploadFileToStorage, deleteFileFromStorage } = require("../services/s3.service");

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

    // Create MongoDB File Document
    const newFile = await File.create({
      name: originalname,
      url: storageResult.url,
      type,
      extension,
      size,
      owner: req.user._id,
      users: [],
      s3Key: storageResult.s3Key,
      bucketFileId: storageResult.bucketFileId,
      bucket: storageResult.bucket,
    });

    const populatedFile = await File.findById(newFile._id).populate("owner", "fullName email avatar");

    return res.status(201).json(populatedFile.toJSON());
  } catch (error) {
    next(error);
  }
};

// 2. Get Files
const getFiles = async (req, res, next) => {
  try {
    const { types, searchText, sort = "$createdAt-desc", limit } = req.query;

    const query = {
      $or: [
        { owner: req.user._id },
        { users: req.user.email },
      ],
    };

    // Filter by type(s)
    if (types) {
      const typeList = Array.isArray(types)
        ? types
        : types.split(",").map((t) => t.trim()).filter(Boolean);
      if (typeList.length > 0) {
        query.type = { $in: typeList };
      }
    }

    // Search by filename
    if (searchText) {
      query.name = { $regex: searchText, $options: "i" };
    }

    // Determine sort order
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

    return res.json({
      total: files.length,
      documents: files.map((f) => f.toJSON()),
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

    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized: Only the owner can rename this file" });
    }

    const ext = extension ? extension.replace(/^\./, "") : file.extension;
    const cleanName = name.endsWith(`.${ext}`) ? name : `${name}.${ext}`;

    file.name = cleanName;
    file.extension = ext;
    await file.save();

    const populated = await File.findById(file._id).populate("owner", "fullName email avatar");
    return res.json(populated.toJSON());
  } catch (error) {
    next(error);
  }
};

// 4. Update File Users (Share)
const updateFileUsers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { emails } = req.body;

    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized: Only the owner can manage file sharing" });
    }

    // Keep unique list of emails, ensuring owner is not duplicated
    const validEmails = Array.isArray(emails) ? emails : [];
    file.users = Array.from(new Set(validEmails));
    await file.save();

    const populated = await File.findById(file._id).populate("owner", "fullName email avatar");
    return res.json(populated.toJSON());
  } catch (error) {
    next(error);
  }
};

// 5. Delete File
const deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const isOwner = file.owner.toString() === req.user._id.toString();
    const isShared = file.users.includes(req.user.email);

    if (!isOwner && !isShared) {
      return res.status(403).json({ error: "Unauthorized to delete this file" });
    }

    if (isOwner) {
      // Remove from S3 or local storage
      await deleteFileFromStorage(file.s3Key);
      await File.findByIdAndDelete(id);
    } else {
      // Remove current user from shared list
      file.users = file.users.filter((e) => e !== req.user.email);
      await file.save();
    }

    return res.json({ status: "success", message: "File processed successfully" });
  } catch (error) {
    next(error);
  }
};

// 6. Get Total Space Used
const getTotalSpaceUsed = async (req, res, next) => {
  try {
    const files = await File.find({
      $or: [
        { owner: req.user._id },
        { users: req.user.email },
      ],
    });

    const totalSpace = {
      image: { size: 0, latestDate: "" },
      document: { size: 0, latestDate: "" },
      video: { size: 0, latestDate: "" },
      audio: { size: 0, latestDate: "" },
      other: { size: 0, latestDate: "" },
      used: 0,
      all: 2 * 1024 * 1024 * 1024, // 2GB storage quota
    };

    files.forEach((file) => {
      const fileType = file.type;
      if (totalSpace[fileType]) {
        totalSpace[fileType].size += file.size;
        totalSpace.used += file.size;

        const fileDate = file.updatedAt || file.createdAt;
        if (
          !totalSpace[fileType].latestDate ||
          new Date(fileDate) > new Date(totalSpace[fileType].latestDate)
        ) {
          totalSpace[fileType].latestDate = fileDate.toISOString();
        }
      }
    });

    return res.json(totalSpace);
  } catch (error) {
    next(error);
  }
};

// 7. Download File
const downloadFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const isOwner = file.owner.toString() === req.user._id.toString();
    const isShared = file.users.includes(req.user.email);

    if (!isOwner && !isShared) {
      return res.status(403).json({ error: "Unauthorized to access this file" });
    }

    if (file.bucket === "local-storage" || !file.url.startsWith("http")) {
      const filePath = path.join(__dirname, "..", "uploads", file.s3Key);
      if (fs.existsSync(filePath)) {
        return res.download(filePath, file.name);
      }
    }

    return res.redirect(file.url);
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
