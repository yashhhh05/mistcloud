const mongoose = require("mongoose");
const File = require("../models/File");
const inMemoryStore = require("../config/inMemoryStore");

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

// Search files by query text across filename and metadata
const searchFiles = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.json([]);
    }

    const user = req.user || inMemoryStore.getDefaultUser();
    const userId = (user._id || user.$id).toString();

    if (isDbConnected()) {
      try {
        const regex = new RegExp(query.trim(), "i");
        const files = await File.find({
          $and: [
            {
              $or: [
                { owner: userId },
                { users: user.email },
              ],
            },
            {
              $or: [
                { name: { $regex: regex } },
                { type: { $regex: regex } },
                { extension: { $regex: regex } },
              ],
            },
          ],
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate("owner", "fullName email avatar");

        return res.json(files.map((f) => f.toJSON()));
      } catch (err) {
        console.warn("[Search DB Error, falling back to memory]:", err.message);
      }
    }

    const matches = inMemoryStore.getFiles({
      ownerId: userId,
      userEmail: user.email,
      searchText: query.trim(),
      limit: 10,
    });

    return res.json(matches);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchFiles,
};
