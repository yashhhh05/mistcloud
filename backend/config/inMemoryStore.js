const crypto = require("crypto");

const defaultUser = {
  _id: "user_demo_1",
  $id: "user_demo_1",
  accountId: "user_demo_1",
  fullName: "Demo User",
  email: "demo@mistcloud.com",
  avatar: "https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_1280.png",
  password: "$2a$10$wN1Q/8eE8y507oZ0cRKn3eaV32v15tJ9yvJ.k03M.iZ7hG7V9c.qW", // password123
  otpCode: "123456",
  otpExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  createdAt: new Date().toISOString(),
};

const users = new Map([
  [defaultUser._id, defaultUser],
  [defaultUser.email, defaultUser],
]);

const initialFiles = [
  {
    _id: "file_doc_1",
    $id: "file_doc_1",
    name: "Project-Proposal-2026.pdf",
    url: "/assets/icons/file-pdf.svg",
    type: "document",
    extension: "pdf",
    size: 2450000,
    owner: {
      _id: defaultUser._id,
      $id: defaultUser._id,
      fullName: defaultUser.fullName,
      email: defaultUser.email,
      avatar: defaultUser.avatar,
    },
    users: [defaultUser.email],
    s3Key: "sample-proposal.pdf",
    bucketFileId: "bucket_doc_1",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    _id: "file_img_1",
    $id: "file_img_1",
    name: "Dashboard-Mockup.png",
    url: "/Illustration.png",
    type: "image",
    extension: "png",
    size: 5120000,
    owner: {
      _id: defaultUser._id,
      $id: defaultUser._id,
      fullName: defaultUser.fullName,
      email: defaultUser.email,
      avatar: defaultUser.avatar,
    },
    users: [defaultUser.email],
    s3Key: "sample-mockup.png",
    bucketFileId: "bucket_img_1",
    createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
  },
  {
    _id: "file_vid_1",
    $id: "file_vid_1",
    name: "Feature-Walkthrough.mp4",
    url: "/assets/icons/file-video.svg",
    type: "video",
    extension: "mp4",
    size: 19800000,
    owner: {
      _id: defaultUser._id,
      $id: defaultUser._id,
      fullName: defaultUser.fullName,
      email: defaultUser.email,
      avatar: defaultUser.avatar,
    },
    users: [defaultUser.email],
    s3Key: "sample-video.mp4",
    bucketFileId: "bucket_vid_1",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    _id: "file_doc_2",
    $id: "file_doc_2",
    name: "Financial-Quarterly-Report.xlsx",
    url: "/assets/icons/file-document.svg",
    type: "document",
    extension: "xlsx",
    size: 1340000,
    owner: {
      _id: defaultUser._id,
      $id: defaultUser._id,
      fullName: defaultUser.fullName,
      email: defaultUser.email,
      avatar: defaultUser.avatar,
    },
    users: [defaultUser.email],
    s3Key: "sample-report.xlsx",
    bucketFileId: "bucket_doc_2",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    _id: "file_aud_1",
    $id: "file_aud_1",
    name: "Product-Interview-Recording.mp3",
    url: "/assets/icons/file-audio.svg",
    type: "audio",
    extension: "mp3",
    size: 8900000,
    owner: {
      _id: defaultUser._id,
      $id: defaultUser._id,
      fullName: defaultUser.fullName,
      email: defaultUser.email,
      avatar: defaultUser.avatar,
    },
    users: [defaultUser.email],
    s3Key: "sample-audio.mp3",
    bucketFileId: "bucket_aud_1",
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
];

let files = [...initialFiles];

module.exports = {
  findUserByEmail(email) {
    if (!email) return null;
    return users.get(email.toLowerCase().trim()) || null;
  },
  findUserById(id) {
    if (!id) return null;
    return users.get(id) || null;
  },
  createUser(userData) {
    const id = `user_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const user = {
      _id: id,
      $id: id,
      accountId: id,
      fullName: userData.fullName.trim(),
      email: userData.email.toLowerCase().trim(),
      avatar: userData.avatar || defaultUser.avatar,
      password: userData.password,
      otpCode: userData.otpCode || "123456",
      otpExpiresAt: userData.otpExpiresAt || new Date(Date.now() + 10 * 60 * 1000),
      createdAt: new Date().toISOString(),
      toJSON() {
        const copy = { ...this };
        delete copy.password;
        delete copy.otpCode;
        delete copy.otpExpiresAt;
        return copy;
      },
      save: async function () {
        return this;
      },
    };
    users.set(user._id, user);
    users.set(user.email, user);
    return user;
  },
  getFiles(filter = {}) {
    let result = [...files];

    if (filter.ownerId || filter.userEmail) {
      result = result.filter(
        (f) =>
          (typeof f.owner === "object" && f.owner._id === filter.ownerId) ||
          f.owner === filter.ownerId ||
          (f.users && f.users.includes(filter.userEmail))
      );
    }

    if (filter.types && filter.types.length > 0) {
      result = result.filter((f) => filter.types.includes(f.type));
    }

    if (filter.searchText) {
      const q = filter.searchText.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }

    if (filter.sort) {
      const [field, order] = filter.sort.split("-");
      result.sort((a, b) => {
        const valA = a[field] ?? a.createdAt;
        const valB = b[field] ?? b.createdAt;
        if (valA < valB) return order === "asc" ? -1 : 1;
        if (valA > valB) return order === "asc" ? 1 : -1;
        return 0;
      });
    }

    if (filter.limit && filter.limit > 0) {
      result = result.slice(0, filter.limit);
    }

    return result;
  },
  createFile(fileData) {
    const id = `file_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const newFile = {
      _id: id,
      $id: id,
      ...fileData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      toJSON() {
        return { ...this };
      },
    };
    files.unshift(newFile);
    return newFile;
  },
  findFileById(id) {
    return files.find((f) => f._id === id || f.$id === id) || null;
  },
  updateFile(id, updates) {
    const idx = files.findIndex((f) => f._id === id || f.$id === id);
    if (idx !== -1) {
      files[idx] = {
        ...files[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return files[idx];
    }
    return null;
  },
  deleteFile(id) {
    const before = files.length;
    files = files.filter((f) => f._id !== id && f.$id !== id);
    return files.length < before;
  },
  getDefaultUser() {
    return defaultUser;
  },
};
