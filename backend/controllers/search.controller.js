const File = require("../models/File");

// Search files by query text across filename and metadata
const searchFiles = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.json([]);
    }

    const regex = new RegExp(query.trim(), "i");

    const files = await File.find({
      $and: [
        {
          $or: [
            { owner: req.user._id },
            { users: req.user.email },
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
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchFiles,
};
