const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.log("[MongoDB] No MONGODB_URI configured. In-memory data store active.");
    return false;
  }

  try {
    mongoose.set("bufferCommands", false);
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`[MongoDB] Connection warning (${error.message}). In-memory data store active.`);
    return false;
  }
};

module.exports = connectDB;
